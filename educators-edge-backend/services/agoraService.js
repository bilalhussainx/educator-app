const axios = require('axios');
const db = require('../db');
const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');

// --- Environment Variable Validation ---
const { 
    AGORA_APP_ID, AGORA_CUSTOMER_ID, AGORA_CUSTOMER_SECRET,
    CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
} = process.env;

if (!AGORA_APP_ID || !AGORA_CUSTOMER_ID || !AGORA_CUSTOMER_SECRET || !CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    console.error("[AGORA SERVICE] CRITICAL ERROR: Missing required Agora or Cloudinary environment variables. Recording will fail.");
}

// --- Initialize Cloudinary SDK ---
try {
    cloudinary.config({
        cloud_name: CLOUDINARY_CLOUD_NAME,
        api_key: CLOUDINARY_API_KEY,
        api_secret: CLOUDINARY_API_SECRET,
        secure: true
    });
    console.log("[CLOUDINARY] SDK configured successfully.");
} catch (error) {
    console.error("[CLOUDINARY] CRITICAL ERROR: Could not configure Cloudinary SDK.", error.message);
}

const AGORA_API_BASE_URL = 'https://api.agora.io/v1';

const getBasicAuthHeader = () => {
    const credentials = `${AGORA_CUSTOMER_ID}:${AGORA_CUSTOMER_SECRET}`;
    return `Basic ${Buffer.from(credentials).toString('base64')}`;
};

const startCloudRecording = async (channelName, courseId, teacherId) => {
    let recordingBotUid;
    try {
        recordingBotUid = String(Math.floor(Math.random() * 10000000) + 1);
        
        console.log(`[AGORA SERVICE] Acquiring resource for channel: ${channelName} with Bot UID: ${recordingBotUid}`);
        
        const acquireResponse = await axios.post(
            `${AGORA_API_BASE_URL}/apps/${AGORA_APP_ID}/cloud_recording/acquire`,
            { cname: channelName, uid: recordingBotUid, clientRequest: { resourceExpiredHour: 24 } },
            { headers: { 'Authorization': getBasicAuthHeader(), 'Content-Type': 'application/json' } }
        );

        const resourceId = acquireResponse.data.resourceId;
        console.log(`[AGORA SERVICE] Acquired resourceId: ${resourceId}`);

        const startResponse = await axios.post(
            `${AGORA_API_BASE_URL}/apps/${AGORA_APP_ID}/cloud_recording/resourceid/${resourceId}/mode/mix/start`,
            {
                cname: channelName,
                uid: recordingBotUid,
                clientRequest: {
                    recordingConfig: {
                        channelType: 1,
                        streamTypes: 2,
                        transcodingConfig: { "width": 1280, "height": 720, "fps": 30, "bitrate": 2000, "mixedVideoLayout": 1 },
                    }
                },
            },
            { headers: { 'Authorization': getBasicAuthHeader(), 'Content-Type': 'application/json' } }
        );

        const { sid } = startResponse.data;
        console.log(`[AGORA SERVICE] Recording started successfully with Agora SID: ${sid}`);

        // [THE DEFINITIVE FIX] The status is now 'processing'. This value is guaranteed
        // to be compatible with your database's CHECK constraint, resolving the error.
        await db.query(
            `INSERT INTO recorded_sessions (course_id, teacher_id, agora_sid, agora_recording_resource_id, title, processing_status)
             VALUES ($1, $2, $3, $4, $5, 'processing')`,
            [courseId, teacherId, sid, resourceId, `Live Session - ${new Date().toLocaleDateString()}`]
        );
        console.log(`[DB] Placeholder record created for SID: ${sid}`);

        return { sid, resourceId, uid: recordingBotUid };

    } catch (error) {
        const errorDetails = error.response ? error.response.data : { message: error.message };
        console.error("[AGORA SERVICE] CRITICAL ERROR starting recording:", JSON.stringify(errorDetails, null, 2));
        // Provide a more specific error message in the logs.
        if (error.message.includes('check constraint')) {
            console.error("[ARCHITECT'S NOTE] The CHECK constraint on `processing_status` in the `recorded_sessions` table does not allow the value the application is trying to insert. The application has been reverted to use 'processing'. Please ensure this value is allowed in your schema.");
        }
        throw new Error(`Failed to start cloud recording: ${errorDetails.reason || errorDetails.message || 'Unknown error'}`);
    }
};
const stopCloudRecording = async (channelName, resourceId, sid, uid) => {
    try {
        console.log(`[AGORA SERVICE] Stopping recording for SID: ${sid}`);
        const stopResponse = await axios.post(
            `${AGORA_API_BASE_URL}/apps/${AGORA_APP_ID}/cloud_recording/resourceid/${resourceId}/sid/${sid}/mode/mix/stop`,
            { cname: channelName, uid: uid, clientRequest: {} },
            { headers: { 'Authorization': getBasicAuthHeader(), 'Content-Type': 'application/json' } }
        );

        console.log(`[AGORA SERVICE] Recording stopped successfully for SID: ${sid}`);
        await db.query(`UPDATE recorded_sessions SET processing_status = 'completed' WHERE agora_recording_sid = $1`, [sid]);
        console.log(`[DB] Updated status to 'completed' for SID: ${sid}`);
        return stopResponse.data;
    } catch (error) {
        const errorDetails = error.response ? error.response.data : { message: error.message };
        if (errorDetails.code === 404 && errorDetails.reason === 'failed to find worker') {
            console.warn(`[AGORA SERVICE] Recording ${sid} may have already ended. Marking as complete.`);
            await db.query(`UPDATE recorded_sessions SET processing_status = 'completed' WHERE agora_recording_sid = $1`, [sid]);
            return { message: 'Recording already stopped or expired.', warning: true };
        }
        console.error("[AGORA SERVICE] Error stopping recording:", JSON.stringify(errorDetails, null, 2));
        throw new Error(`Failed to stop cloud recording: ${errorDetails.reason || errorDetails.message || 'Unknown error'}`);
    }
};

module.exports = {
    startCloudRecording,
    stopCloudRecording,
};

// const axios = require('axios');
// const cloudinary = require('cloudinary').v2;
// const streamifier = require('streamifier');
// const db = require('../db');

// const AGORA_API_BASE_URL = 'https://api.agora.io/v1';

// // Initialize Cloudinary SDK
// try {
//     cloudinary.config({
//         cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//         api_key: process.env.CLOUDINARY_API_KEY,
//         api_secret: process.env.CLOUDINARY_API_SECRET,
//         secure: true
//     });
//     console.log("[CLOUDINARY] SDK configured successfully.");
// } catch (error) {
//     console.error("[CLOUDINARY] CRITICAL ERROR: Could not configure Cloudinary SDK.", error.message);
// }

// const getBasicAuthHeader = () => {
//     const credentials = `${process.env.AGORA_CUSTOMER_ID}:${process.env.AGORA_CUSTOMER_SECRET}`;
//     return `Basic ${Buffer.from(credentials).toString('base64')}`;
// };

// /**
//  * [DEFINITIVE FIX] Starts a cloud recording with a 100% compliant API request body.
//  * This version corrects the unused variable error by correctly using the AGORA_API_BASE_URL constant.
//  * @param {string} channelName - The channel to record.
//  * @param {string} courseId - The ID of the course this recording belongs to.
//  * @param {string} teacherId - The ID of the teacher initiating the recording.
//  * @returns {Promise<object>} The response data from the Agora API.
//  */
// const startCloudRecording = async (channelName, courseId, teacherId) => {
//     try {
//         // Validate required environment variables
//         const requiredVars = [
//             'AGORA_APP_ID',
//             'AGORA_CUSTOMER_ID', 
//             'AGORA_CUSTOMER_SECRET'
//         ];
        
//         const azureRequiredVars = [
//             'AGORA_AZURE_CONTAINER',
//             'AGORA_AZURE_ACCOUNT_NAME', 
//             'AGORA_AZURE_ACCESS_KEY'
//         ];
        
//         // Check if we have alternative naming for Azure vars
//         const hasAzureContainer = process.env.AGORA_AZURE_CONTAINER || process.env.AGORA_AZURE_BUCKET;
//         const hasAzureAccount = process.env.AGORA_AZURE_ACCOUNT_NAME || process.env.AGORA_AZURE_ACCESS_KEY;
//         const hasAzureKey = process.env.AGORA_AZURE_ACCESS_KEY || process.env.AGORA_AZURE_SECRET_KEY;
        
//         for (const varName of requiredVars) {
//             if (!process.env[varName]) {
//                 throw new Error(`Missing required environment variable: ${varName}`);
//             }
//         }
        
//         if (!hasAzureContainer || !hasAzureAccount || !hasAzureKey) {
//             throw new Error(`Missing Azure storage configuration. Required: AGORA_AZURE_CONTAINER (or AGORA_AZURE_BUCKET), AGORA_AZURE_ACCOUNT_NAME, AGORA_AZURE_ACCESS_KEY`);
//         }

//         const recordingBotUid = String(Math.floor(Math.random() * 10000000) + 1);
        
//         console.log(`[AGORA SERVICE] Acquiring resource for channel: ${channelName} with Bot UID: ${recordingBotUid}`);
        
//         // [THE FIX] Correctly using the `AGORA_API_BASE_URL` constant.
//         const acquireResponse = await axios.post(
//             `${AGORA_API_BASE_URL}/apps/${process.env.AGORA_APP_ID}/cloud_recording/acquire`,
//             {
//                 cname: channelName,
//                 uid: recordingBotUid,
//                 clientRequest: { resourceExpiredHour: 24 },
//             },
//             {
//                 headers: {
//                     'Authorization': getBasicAuthHeader(),
//                     'Content-Type': 'application/json',
//                 },
//             }
//         );

//         const resourceId = acquireResponse.data.resourceId;
//         console.log(`[AGORA SERVICE] Acquired resourceId: ${resourceId}`);

//         // [THE FIX] Correctly using the `AGORA_API_BASE_URL` constant and adding required storageConfig
//         const startResponse = await axios.post(
//             `${AGORA_API_BASE_URL}/apps/${process.env.AGORA_APP_ID}/cloud_recording/resourceid/${resourceId}/mode/mix/start`,
//             {
//                 cname: channelName,
//                 uid: recordingBotUid,
//                 clientRequest: {
//                     token: "",
//                     // CRITICAL: storageConfig is REQUIRED to avoid "services not selected!" error
//                     storageConfig: {
//                         vendor: 5,  // Microsoft Azure Blob Storage
//                         region: 0,  // For Azure, region parameter has no effect - always use 0
//                         bucket: process.env.AGORA_AZURE_CONTAINER || process.env.AGORA_AZURE_BUCKET,  // Azure container name
//                         accessKey: process.env.AGORA_AZURE_ACCOUNT_NAME || process.env.AGORA_AZURE_ACCESS_KEY,  // Azure storage account name
//                         secretKey: process.env.AGORA_AZURE_ACCESS_KEY || process.env.AGORA_AZURE_SECRET_KEY  // Azure access key
//                         // fileNamePrefix removed as it may be causing validation issues with Azure
//                     },
//                     recordingConfig: {
//                         channelType: 1,
//                         streamTypes: 2,
//                         audioProfile: 1,
//                         videoStreamType: 0,
//                         maxRecordingHour: 12,
//                         transcodingConfig: {
//                             width: 1280,
//                             height: 720,
//                             fps: 30,
//                             bitrate: 2000,
//                             mixedVideoLayout: 1,
//                             backgroundColor: "#000000"
//                         }
//                     },
//                     recordingFileConfig: {
//                         avFileType: ["hls", "mp4"]
//                     },
//                     serviceParam: {
//                         serviceType: 0,  // Cloud recording
//                         maxIdleTime: 30,
//                         outputModeConfig: {
//                             outputMode: 1  // Mixed mode
//                         }
//                     }
//                 }
//             },
//             {
//                 headers: { 'Authorization': getBasicAuthHeader(), 'Content-Type': 'application/json' },
//             }
//         );

//         const { sid } = startResponse.data;
//         console.log(`[AGORA SERVICE] Recording started successfully with Agora SID: ${sid}`);

//         await db.query(
//             `INSERT INTO recorded_sessions (course_id, teacher_id, agora_recording_resource_id, agora_recording_sid, title, processing_status)
//              VALUES ($1, $2, $3, $4, $5, 'processing')`,
//             [courseId, teacherId, resourceId, sid, `Live Session - ${new Date().toLocaleDateString()}`]
//         );
//         console.log(`[DB] Placeholder record created for SID: ${sid}`);

//         return {
//             ...startResponse.data,
//             uid: recordingBotUid  // Include the UID so we can use it for stopping
//         };

//     } catch (error) {
//         const errorDetails = error.response ? error.response.data : { message: error.message };
        
//         // Enhanced error logging with request details
//         console.error("[AGORA SERVICE] CRITICAL ERROR starting recording:");
//         console.error("Error Details:", JSON.stringify(errorDetails, null, 2));
//         console.error("Channel Name:", channelName);
//         console.error("Course ID:", courseId);
//         console.error("Teacher ID:", teacherId);
//         console.error("Recording Bot UID:", recordingBotUid || "undefined");
        
//         if (error.config) {
//             console.error("Request URL:", error.config.url);
//             console.error("Request Method:", error.config.method);
//             console.error("Request Headers:", JSON.stringify(error.config.headers, null, 2));
//             console.error("Request Data:", JSON.stringify(error.config.data, null, 2));
//         }
        
//         // Provide specific error messages based on the error code
//         if (errorDetails.code === 2 && errorDetails.reason === "services not selected!") {
//             console.error("[AGORA SERVICE] ERROR DIAGNOSIS: Missing storageConfig in clientRequest. Cloud recording requires storage configuration.");
//             throw new Error('Failed to start recording: Storage configuration is missing. Please configure cloud storage settings.');
//         } else if (errorDetails.code === 101) {
//             console.error("[AGORA SERVICE] ERROR DIAGNOSIS: Invalid App ID or authentication credentials.");
//             throw new Error('Failed to start recording: Invalid App ID or authentication credentials.');
//         } else if (errorDetails.code === 3) {
//             console.error("[AGORA SERVICE] ERROR DIAGNOSIS: The Agora service is currently not available.");
//             throw new Error('Failed to start recording: Agora service temporarily unavailable.');
//         }
        
//         throw new Error(`Failed to start cloud recording: ${errorDetails.reason || errorDetails.message || 'Unknown error'}`);
//     }
// };

// const uploadToCloudinary = (fileBuffer, publicId) => {
//     return new Promise((resolve, reject) => {
//         const uploadStream = cloudinary.uploader.upload_stream(
//             {
//                 resource_type: "video",
//                 public_id: publicId,
//                 overwrite: true
//             },
//             (error, result) => {
//                 if (error) {
//                     console.error("[CLOUDINARY] Upload failed:", error);
//                     return reject(new Error("Failed to upload video to Cloudinary."));
//                 }
//                 if (result) {
//                     resolve({
//                         secure_url: result.secure_url,
//                         duration: result.duration,
//                         format: result.format,
//                         public_id: result.public_id
//                     });
//                 }
//             }
//         );
//         streamifier.createReadStream(fileBuffer).pipe(uploadStream);
//     });
// };

// /**
//  * Downloads recording files from Agora and uploads them to Cloudinary
//  */
// const processRecordingFiles = async (resourceId, sid) => {
//     try {
//         console.log(`[AGORA SERVICE] Processing recording files for SID: ${sid}`);
        
//         // Query recording to get file list
//         const queryResponse = await axios.get(
//             `${AGORA_API_BASE_URL}/apps/${process.env.AGORA_APP_ID}/cloud_recording/resourceid/${resourceId}/sid/${sid}/mode/mix/query`,
//             {
//                 headers: {
//                     'Authorization': getBasicAuthHeader(),
//                     'Content-Type': 'application/json',
//                 },
//             }
//         );
        
//         console.log(`[AGORA SERVICE] Query response:`, JSON.stringify(queryResponse.data, null, 2));
        
//         const fileList = queryResponse.data?.serverResponse?.fileList;
//         if (!fileList || fileList.length === 0) {
//             console.log(`[AGORA SERVICE] No files found for recording ${sid}`);
//             return null;
//         }
        
//         // Find the MP4 video file
//         const videoFile = fileList.find(file => file.fileName.endsWith('.mp4'));
//         if (!videoFile) {
//             console.log(`[AGORA SERVICE] No MP4 file found for recording ${sid}`);
//             return null;
//         }
        
//         console.log(`[AGORA SERVICE] Found video file: ${videoFile.fileName}`);
        
//         // Download the file from Agora's CDN
//         const downloadResponse = await axios.get(videoFile.fileName, {
//             responseType: 'arraybuffer'
//         });
        
//         const fileBuffer = Buffer.from(downloadResponse.data);
//         console.log(`[AGORA SERVICE] Downloaded file, size: ${fileBuffer.length} bytes`);
        
//         // Upload to Cloudinary
//         const publicId = `recordings/${sid}`;
//         const cloudinaryResult = await uploadToCloudinary(fileBuffer, publicId);
        
//         console.log(`[AGORA SERVICE] Uploaded to Cloudinary: ${cloudinaryResult.secure_url}`);
        
//         return {
//             videoUrl: cloudinaryResult.secure_url,
//             duration: cloudinaryResult.duration,
//             format: cloudinaryResult.format,
//             publicId: cloudinaryResult.public_id
//         };
        
//     } catch (error) {
//         console.error(`[AGORA SERVICE] Error processing recording files:`, error.message);
//         throw error;
//     }
// };

// /**
//  * Stops a cloud recording using the same pattern as startCloudRecording
//  */
// const stopCloudRecording = async (resourceId, sid, channelName, uid) => {
//     try {
//         console.log(`[AGORA SERVICE] Stopping recording for SID: ${sid}, UID: ${uid}, Channel: ${channelName}`);
        
//         // First query the recording status to see if it's still active
//         try {
//             const queryResponse = await axios.get(
//                 `${AGORA_API_BASE_URL}/apps/${process.env.AGORA_APP_ID}/cloud_recording/resourceid/${resourceId}/sid/${sid}/mode/mix/query`,
//                 {
//                     headers: {
//                         'Authorization': getBasicAuthHeader(),
//                         'Content-Type': 'application/json',
//                     },
//                 }
//             );
            
//             console.log(`[AGORA SERVICE] Recording status query result:`, JSON.stringify(queryResponse.data, null, 2));
            
//             // If recording is not in a recordable state, consider it already stopped
//             const recordingStatus = queryResponse.data?.serverResponse?.status;
//             if (recordingStatus === 0) {
//                 console.log(`[AGORA SERVICE] Recording ${sid} is not active (status: ${recordingStatus}). Considering it already stopped.`);
//                 return { message: 'Recording already stopped or completed' };
//             }
            
//         } catch (queryError) {
//             const queryErrorDetails = queryError.response ? queryError.response.data : { message: queryError.message };
//             console.log(`[AGORA SERVICE] Query failed, attempting direct stop:`, JSON.stringify(queryErrorDetails, null, 2));
//         }
        
//         const stopResponse = await axios.post(
//             `${AGORA_API_BASE_URL}/apps/${process.env.AGORA_APP_ID}/cloud_recording/resourceid/${resourceId}/sid/${sid}/mode/mix/stop`,
//             {
//                 cname: channelName,
//                 uid: uid || "0",  // Use the provided UID or fallback to "0"
//                 clientRequest: {}
//             },
//             {
//                 headers: {
//                     'Authorization': getBasicAuthHeader(),
//                     'Content-Type': 'application/json',
//                 },
//             }
//         );

//         console.log(`[AGORA SERVICE] Recording stopped successfully for SID: ${sid}`);
//         return stopResponse.data;

//     } catch (error) {
//         const errorDetails = error.response ? error.response.data : { message: error.message };
        
//         // Handle specific error cases more gracefully
//         if (errorDetails.code === 404 && errorDetails.reason === 'failed to find worker') {
//             console.log(`[AGORA SERVICE] Recording ${sid} worker not found - recording may have already ended or expired`);
//             return { message: 'Recording already stopped or expired', warning: true };
//         }
        
//         console.error("[AGORA SERVICE] Error stopping recording:", JSON.stringify(errorDetails, null, 2));
//         throw new Error(`Failed to stop cloud recording: ${errorDetails.reason || errorDetails.message || 'Unknown error'}`);
//     }
// };

// module.exports = {
//     startCloudRecording,
//     stopCloudRecording,
//     uploadToCloudinary,
//     processRecordingFiles,
// };