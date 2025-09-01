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
    if (!process.env.AGORA_CUSTOMER_ID || !process.env.AGORA_CUSTOMER_SECRET) {
        console.error('[AGORA SERVICE] Missing authentication credentials:', {
            AGORA_CUSTOMER_ID: process.env.AGORA_CUSTOMER_ID ? 'SET' : 'MISSING',
            AGORA_CUSTOMER_SECRET: process.env.AGORA_CUSTOMER_SECRET ? 'SET' : 'MISSING'
        });
        throw new Error('Agora authentication credentials are missing');
    }
    
    const credentials = `${process.env.AGORA_CUSTOMER_ID}:${process.env.AGORA_CUSTOMER_SECRET}`;
    const authHeader = `Basic ${Buffer.from(credentials).toString('base64')}`;
    console.log('[AGORA SERVICE] Auth header generated successfully');
    return authHeader;
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
                    },
                    storageConfig: {
                        vendor: 1,
                        region: 1,
                        bucket: "agora-cloud-recording",
                        accessKey: "temp",
                        secretKey: "temp",
                        fileNamePrefix: ["recordings"]
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
            `INSERT INTO recorded_sessions (course_id, teacher_id, agora_recording_sid, title, processing_status)
             VALUES ($1, $2, $3, $4, 'processing')`,
            [courseId, teacherId, sid, `Live Session - ${new Date().toLocaleDateString()}`]
        );
        console.log(`[DB] Placeholder record created for SID: ${sid}`);

        return startResponse.data;

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
 * Stops a cloud recording with proper Agora API integration
 * @param {string} resourceId - The Agora resource ID from starting the recording
 * @param {string} sid - The Agora session ID from starting the recording
 * @param {string} channelName - The channel name used for recording
 * @returns {Promise<object>} The response data from the Agora API
 */
const stopCloudRecording = async (resourceId, sid, channelName) => {
    try {
        console.log(`[AGORA SERVICE] Stopping recording for channel: ${channelName}, SID: ${sid}, ResourceID: ${resourceId}`);
        console.log(`[AGORA SERVICE] Stop URL: ${AGORA_API_BASE_URL}/apps/${process.env.AGORA_APP_ID}/cloud_recording/resourceid/${resourceId}/sid/${sid}/mode/mix/stop`);
        
        const requestBody = {
            cname: channelName,
            uid: "0", // Use string UID
            clientRequest: {}
        };
        
        console.log(`[AGORA SERVICE] Stop request body:`, JSON.stringify(requestBody, null, 2));
        
        const stopResponse = await axios.post(
            `${AGORA_API_BASE_URL}/apps/${process.env.AGORA_APP_ID}/cloud_recording/resourceid/${resourceId}/sid/${sid}/mode/mix/stop`,
            requestBody,
            {
                headers: {
                    'Authorization': getBasicAuthHeader(),
                    'Content-Type': 'application/json',
                },
            }
        );

        console.log(`[AGORA SERVICE] Recording stopped successfully for SID: ${sid}`, JSON.stringify(stopResponse.data, null, 2));
        return stopResponse.data;

    } catch (error) {
        const errorDetails = error.response ? error.response.data : { message: error.message };
        console.error("[AGORA SERVICE] CRITICAL ERROR stopping recording:", {
            message: error.message,
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: errorDetails,
            config: {
                url: error.config?.url,
                method: error.config?.method,
                data: error.config?.data
            }
        });
        throw new Error(`Failed to stop cloud recording via Agora API: ${error.message}`);
    }
};

module.exports = {
    startCloudRecording,
    stopCloudRecording,
    uploadToCloudinary,
};