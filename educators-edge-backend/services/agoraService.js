const axios = require('axios');
const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');
const db = require('../db');

const AGORA_API_BASE_URL = 'https://api.agora.io/v1';

// Initialize Cloudinary SDK
try {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
        secure: true
    });
    console.log("[CLOUDINARY] SDK configured successfully.");
} catch (error) {
    console.error("[CLOUDINARY] CRITICAL ERROR: Could not configure Cloudinary SDK.", error.message);
}

const getBasicAuthHeader = () => {
    const credentials = `${process.env.AGORA_CUSTOMER_ID}:${process.env.AGORA_CUSTOMER_SECRET}`;
    return `Basic ${Buffer.from(credentials).toString('base64')}`;
};

/**
 * [DEFINITIVE FIX] Starts a cloud recording with a 100% compliant API request body.
 * This version corrects the unused variable error by correctly using the AGORA_API_BASE_URL constant.
 * @param {string} channelName - The channel to record.
 * @param {string} courseId - The ID of the course this recording belongs to.
 * @param {string} teacherId - The ID of the teacher initiating the recording.
 * @returns {Promise<object>} The response data from the Agora API.
 */
const startCloudRecording = async (channelName, courseId, teacherId) => {
    try {
        const recordingBotUid = String(Math.floor(Math.random() * 10000000) + 1);
        
        console.log(`[AGORA SERVICE] Acquiring resource for channel: ${channelName} with Bot UID: ${recordingBotUid}`);
        
        // [THE FIX] Correctly using the `AGORA_API_BASE_URL` constant.
        const acquireResponse = await axios.post(
            `${AGORA_API_BASE_URL}/apps/${process.env.AGORA_APP_ID}/cloud_recording/acquire`,
            {
                cname: channelName,
                uid: recordingBotUid,
                clientRequest: { resourceExpiredHour: 24 },
            },
            {
                headers: {
                    'Authorization': getBasicAuthHeader(),
                    'Content-Type': 'application/json',
                },
            }
        );

        const resourceId = acquireResponse.data.resourceId;
        console.log(`[AGORA SERVICE] Acquired resourceId: ${resourceId}`);

        // [THE FIX] Correctly using the `AGORA_API_BASE_URL` constant.
        const startResponse = await axios.post(
            `${AGORA_API_BASE_URL}/apps/${process.env.AGORA_APP_ID}/cloud_recording/resourceid/${resourceId}/mode/mix/start`,
            {
                cname: channelName,
                uid: recordingBotUid,
                clientRequest: {
                    token: "",
                    recordingConfig: {
                        channelType: 1,
                        streamTypes: 2,
                        audioProfile: 1,
                        videoStreamType: 0,
                        maxRecordingHour: 12,
                        transcodingConfig: {
                            width: 1280,
                            height: 720,
                            fps: 30,
                            bitrate: 2000,
                            mixedVideoLayout: 1,
                            backgroundColor: "#000000"
                        }
                    }
                }
            },
            {
                headers: { 'Authorization': getBasicAuthHeader(), 'Content-Type': 'application/json' },
            }
        );

        const { sid } = startResponse.data;
        console.log(`[AGORA SERVICE] Recording started successfully with Agora SID: ${sid}`);

        await db.query(
            `INSERT INTO recorded_sessions (course_id, teacher_id, agora_recording_resource_id, agora_recording_sid, title, processing_status)
             VALUES ($1, $2, $3, $4, $5, 'processing')`,
            [courseId, teacherId, resourceId, sid, `Live Session - ${new Date().toLocaleDateString()}`]
        );
        console.log(`[DB] Placeholder record created for SID: ${sid}`);

        return {
            ...startResponse.data,
            uid: recordingBotUid  // Include the UID so we can use it for stopping
        };

    } catch (error) {
        const errorDetails = error.response ? error.response.data : { message: error.message };
        console.error("[AGORA SERVICE] CRITICAL ERROR starting recording:", JSON.stringify(errorDetails, null, 2));
        throw new Error('Failed to start cloud recording via Agora API.');
    }
};

const uploadToCloudinary = (fileBuffer, publicId) => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                resource_type: "video",
                public_id: publicId,
                overwrite: true
            },
            (error, result) => {
                if (error) {
                    console.error("[CLOUDINARY] Upload failed:", error);
                    return reject(new Error("Failed to upload video to Cloudinary."));
                }
                if (result) {
                    resolve({
                        secure_url: result.secure_url,
                        duration: result.duration,
                        format: result.format,
                        public_id: result.public_id
                    });
                }
            }
        );
        streamifier.createReadStream(fileBuffer).pipe(uploadStream);
    });
};

/**
 * Downloads recording files from Agora and uploads them to Cloudinary
 */
const processRecordingFiles = async (resourceId, sid) => {
    try {
        console.log(`[AGORA SERVICE] Processing recording files for SID: ${sid}`);
        
        // Query recording to get file list
        const queryResponse = await axios.get(
            `${AGORA_API_BASE_URL}/apps/${process.env.AGORA_APP_ID}/cloud_recording/resourceid/${resourceId}/sid/${sid}/mode/mix/query`,
            {
                headers: {
                    'Authorization': getBasicAuthHeader(),
                    'Content-Type': 'application/json',
                },
            }
        );
        
        console.log(`[AGORA SERVICE] Query response:`, JSON.stringify(queryResponse.data, null, 2));
        
        const fileList = queryResponse.data?.serverResponse?.fileList;
        if (!fileList || fileList.length === 0) {
            console.log(`[AGORA SERVICE] No files found for recording ${sid}`);
            return null;
        }
        
        // Find the MP4 video file
        const videoFile = fileList.find(file => file.fileName.endsWith('.mp4'));
        if (!videoFile) {
            console.log(`[AGORA SERVICE] No MP4 file found for recording ${sid}`);
            return null;
        }
        
        console.log(`[AGORA SERVICE] Found video file: ${videoFile.fileName}`);
        
        // Download the file from Agora's CDN
        const downloadResponse = await axios.get(videoFile.fileName, {
            responseType: 'arraybuffer'
        });
        
        const fileBuffer = Buffer.from(downloadResponse.data);
        console.log(`[AGORA SERVICE] Downloaded file, size: ${fileBuffer.length} bytes`);
        
        // Upload to Cloudinary
        const publicId = `recordings/${sid}`;
        const cloudinaryResult = await uploadToCloudinary(fileBuffer, publicId);
        
        console.log(`[AGORA SERVICE] Uploaded to Cloudinary: ${cloudinaryResult.secure_url}`);
        
        return {
            videoUrl: cloudinaryResult.secure_url,
            duration: cloudinaryResult.duration,
            format: cloudinaryResult.format,
            publicId: cloudinaryResult.public_id
        };
        
    } catch (error) {
        console.error(`[AGORA SERVICE] Error processing recording files:`, error.message);
        throw error;
    }
};

/**
 * Stops a cloud recording using the same pattern as startCloudRecording
 */
const stopCloudRecording = async (resourceId, sid, channelName, uid) => {
    try {
        console.log(`[AGORA SERVICE] Stopping recording for SID: ${sid}, UID: ${uid}, Channel: ${channelName}`);
        
        // First query the recording status to see if it's still active
        try {
            const queryResponse = await axios.get(
                `${AGORA_API_BASE_URL}/apps/${process.env.AGORA_APP_ID}/cloud_recording/resourceid/${resourceId}/sid/${sid}/mode/mix/query`,
                {
                    headers: {
                        'Authorization': getBasicAuthHeader(),
                        'Content-Type': 'application/json',
                    },
                }
            );
            
            console.log(`[AGORA SERVICE] Recording status query result:`, JSON.stringify(queryResponse.data, null, 2));
            
            // If recording is not in a recordable state, consider it already stopped
            const recordingStatus = queryResponse.data?.serverResponse?.status;
            if (recordingStatus === 0) {
                console.log(`[AGORA SERVICE] Recording ${sid} is not active (status: ${recordingStatus}). Considering it already stopped.`);
                return { message: 'Recording already stopped or completed' };
            }
            
        } catch (queryError) {
            const queryErrorDetails = queryError.response ? queryError.response.data : { message: queryError.message };
            console.log(`[AGORA SERVICE] Query failed, attempting direct stop:`, JSON.stringify(queryErrorDetails, null, 2));
        }
        
        const stopResponse = await axios.post(
            `${AGORA_API_BASE_URL}/apps/${process.env.AGORA_APP_ID}/cloud_recording/resourceid/${resourceId}/sid/${sid}/mode/mix/stop`,
            {
                cname: channelName,
                uid: uid || "0",  // Use the provided UID or fallback to "0"
                clientRequest: {}
            },
            {
                headers: {
                    'Authorization': getBasicAuthHeader(),
                    'Content-Type': 'application/json',
                },
            }
        );

        console.log(`[AGORA SERVICE] Recording stopped successfully for SID: ${sid}`);
        return stopResponse.data;

    } catch (error) {
        const errorDetails = error.response ? error.response.data : { message: error.message };
        
        // Handle specific error cases more gracefully
        if (errorDetails.code === 404 && errorDetails.reason === 'failed to find worker') {
            console.log(`[AGORA SERVICE] Recording ${sid} worker not found - recording may have already ended or expired`);
            return { message: 'Recording already stopped or expired', warning: true };
        }
        
        console.error("[AGORA SERVICE] Error stopping recording:", JSON.stringify(errorDetails, null, 2));
        throw new Error(`Failed to stop cloud recording: ${errorDetails.reason || errorDetails.message || 'Unknown error'}`);
    }
};

module.exports = {
    startCloudRecording,
    stopCloudRecording,
    uploadToCloudinary,
    processRecordingFiles,
};