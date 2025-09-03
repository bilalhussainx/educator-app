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
        // Validate Azure storage configuration using user's variable names
        const azureContainer = process.env.AGORA_AZURE_BUCKET;
        const azureAccountName = process.env.AGORA_AZURE_ACCESS_KEY; // This should be the storage account name
        const azureAccessKey = process.env.AGORA_AZURE_SECRET_KEY; // This should be the access key

        console.log(`[AZURE DEBUG] Configuration check:`);
        console.log(`[AZURE DEBUG] - Container: ${azureContainer ? '✓ SET' : '✗ MISSING'}`);
        console.log(`[AZURE DEBUG] - Account Name: ${azureAccountName ? '✓ SET' : '✗ MISSING'}`);
        console.log(`[AZURE DEBUG] - Access Key: ${azureAccessKey ? '✓ SET' : '✗ MISSING'}`);

        if (!azureContainer || !azureAccountName || !azureAccessKey) {
            const error = `Missing Azure storage configuration. Required: AGORA_AZURE_BUCKET, AGORA_AZURE_ACCESS_KEY (storage account name), AGORA_AZURE_SECRET_KEY (access key)`;
            console.error(`[AZURE ERROR] ${error}`);
            throw new Error(error);
        }

        recordingBotUid = String(Math.floor(Math.random() * 10000000) + 1);
        
        console.log(`[AGORA SERVICE] Acquiring resource for channel: ${channelName} with Bot UID: ${recordingBotUid}`);
        
        const acquireResponse = await axios.post(
            `${AGORA_API_BASE_URL}/apps/${AGORA_APP_ID}/cloud_recording/acquire`,
            { cname: channelName, uid: recordingBotUid, clientRequest: { resourceExpiredHour: 24 } },
            { headers: { 'Authorization': getBasicAuthHeader(), 'Content-Type': 'application/json' } }
        );

        const resourceId = acquireResponse.data.resourceId;
        console.log(`[AGORA SERVICE] Acquired resourceId: ${resourceId}`);

        console.log(`[AGORA SERVICE] Starting recording with Azure storage config:`);
        console.log(`[AGORA SERVICE] - Vendor: 5 (Azure Blob Storage)`);
        console.log(`[AGORA SERVICE] - Container: ${azureContainer}`);
        console.log(`[AGORA SERVICE] - Account: ${azureAccountName}`);
        
        // Generate a temporary token for recording (using existing token generation logic)
        const { RtcTokenBuilder, RtcRole } = require('agora-token');
        const appCertificate = process.env.AGORA_APP_CERTIFICATE;
        const expirationTimeInSeconds = 3600;
        const currentTimestamp = Math.floor(Date.now() / 1000);
        const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;
        
        const recordingToken = RtcTokenBuilder.buildTokenWithUid(
            AGORA_APP_ID,
            appCertificate,
            channelName,
            parseInt(recordingBotUid),
            RtcRole.PUBLISHER,
            privilegeExpiredTs
        );
        
        console.log(`[AGORA SERVICE] Generated recording token for UID: ${recordingBotUid}`);
        
        // Use composite recording mode (mix) as per Agora documentation
        const startResponse = await axios.post(
            `${AGORA_API_BASE_URL}/apps/${AGORA_APP_ID}/cloud_recording/resourceid/${resourceId}/mode/mix/start`,
            {
                cname: channelName,
                uid: recordingBotUid,
                clientRequest: {
                    token: recordingToken, // Required token as per documentation
                    storageConfig: {
                        vendor: 5, // Microsoft Azure Blob Storage (correct value)
                        region: 0,
                        bucket: azureContainer,
                        accessKey: azureAccountName,
                        secretKey: azureAccessKey
                    },
                    recordingConfig: {
                        channelType: 0,
                        streamTypes: 2, // Record both audio and video
                        audioProfile: 1, // Required for audio recording  
                        videoStreamType: 0, // High-quality stream (includes screen sharing)
                        maxRecordingHour: 12,
                        subscribeVideoUids: ["#allstream#"], // Subscribe to all video streams including screen sharing
                        subscribeAudioUids: ["#allstream#"], // Subscribe to all audio streams
                        subscribeUidGroup: 0, // Subscribe to all streams
                        transcodingConfig: {
                            width: 1920, // Increased for better screen recording
                            height: 1080, // Increased for better screen recording
                            fps: 30,
                            bitrate: 4000, // Increased for better quality screen content
                            mixedVideoLayout: 1, // Best fit layout - allows custom layoutConfig
                            backgroundColor: "#000000",
                            layoutConfig: [
                                {
                                    "uid": "1", // Screen sharing stream priority
                                    "x_axis": 0.0,
                                    "y_axis": 0.0, 
                                    "width": 1.0,
                                    "height": 1.0,
                                    "alpha": 1.0,
                                    "render_mode": 1 // Fit mode for screen content
                                }
                            ]
                        }
                    },
                    recordingFileConfig: {
                        avFileType: ["hls", "mp4"] // Generate both HLS and MP4 files
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
            `INSERT INTO recorded_sessions (course_id, teacher_id, agora_recording_sid, agora_recording_resource_id, title, processing_status)
             VALUES ($1, $2, $3, $4, $5, 'processing')`,
            [courseId, teacherId, sid, resourceId, `Live Session - ${new Date().toLocaleDateString()}`]
        );
        console.log(`[DB] Placeholder record created for SID: ${sid}`);

        return { sid, resourceId, uid: recordingBotUid };

    } catch (error) {
        const errorDetails = error.response ? error.response.data : { message: error.message };
        console.error("[AGORA SERVICE] CRITICAL ERROR starting recording:");
        console.error("[AGORA SERVICE] Error details:", JSON.stringify(errorDetails, null, 2));
        console.error("[AGORA SERVICE] Channel:", channelName);
        console.error("[AGORA SERVICE] Course ID:", courseId);
        console.error("[AGORA SERVICE] Teacher ID:", teacherId);
        
        if (error.config) {
            console.error("[AGORA SERVICE] Request URL:", error.config.url);
            console.error("[AGORA SERVICE] Request data:", JSON.stringify(error.config.data, null, 2));
        }
        
        // Azure-specific error handling
        if (errorDetails.code === 2 && errorDetails.reason === "services not selected!") {
            console.error("[AZURE ERROR] Storage configuration issue - services not selected");
            throw new Error('Azure storage configuration error: Recording service not properly configured. Check AGORA_AZURE_* environment variables.');
        }
        
        if (errorDetails.code === 7 && errorDetails.reason?.includes('streamTypes')) {
            console.error("[AGORA ERROR] Invalid streamTypes configuration");
            throw new Error('Recording configuration error: streamTypes must be set correctly for audio/video recording.');
        }
        
        if (errorDetails.code === 8) {
            console.error("[AGORA ERROR] Invalid recording configuration");
            throw new Error('Recording configuration error: Check audioProfile, videoStreamType, and transcodingConfig settings.');
        }
        
        if (error.message.includes('check constraint')) {
            console.error("[DB ERROR] Database constraint violation in recorded_sessions table");
        }
        
        throw new Error(`Failed to start cloud recording: ${errorDetails.reason || errorDetails.message || 'Unknown error'}`);
    }
};
const stopCloudRecording = async (channelName, resourceId, sid, uid) => {
    try {
        console.log(`[AGORA SERVICE] Stopping recording for SID: ${sid}`);
        const stopResponse = await axios.post(
            `${AGORA_API_BASE_URL}/apps/${AGORA_APP_ID}/cloud_recording/resourceid/${resourceId}/sid/${sid}/mode/mix/stop`,
            { 
                cname: channelName, 
                uid: uid, 
                clientRequest: {} 
            },
            { headers: { 'Authorization': getBasicAuthHeader(), 'Content-Type': 'application/json' } }
        );

        console.log(`[AGORA SERVICE] Recording stopped successfully for SID: ${sid}`);
        
        // Wait for file processing before querying (MP4 generation takes time)
        console.log(`[AGORA SERVICE] Waiting 30 seconds for file processing...`);
        await new Promise(resolve => setTimeout(resolve, 30000));
        
        // Query the recording to get the file list
        console.log(`[AGORA SERVICE] Querying recording files for SID: ${sid}`);
        const queryResponse = await axios.get(
            `${AGORA_API_BASE_URL}/apps/${AGORA_APP_ID}/cloud_recording/resourceid/${resourceId}/sid/${sid}/mode/mix/query`,
            { headers: { 'Authorization': getBasicAuthHeader(), 'Content-Type': 'application/json' } }
        );

        let videoUrl = null;
        const fileList = queryResponse.data?.serverResponse?.fileList;
        console.log(`[AGORA SERVICE] Query response:`, JSON.stringify(queryResponse.data, null, 2));
        
        if (fileList && fileList.length > 0) {
            console.log(`[AGORA SERVICE] Found ${fileList.length} files:`, fileList.map(f => `${f.fileName} (${f.fileSize || 'unknown size'})`));
            
            // Prioritize MP4 files for better compatibility
            const mp4File = fileList.find(file => file.fileName.endsWith('.mp4'));
            const m3u8File = fileList.find(file => file.fileName.endsWith('.m3u8'));
            
            // If no MP4 but M3U8 exists, try polling for MP4 for up to 2 minutes
            let targetFile = mp4File;
            if (!mp4File && m3u8File) {
                console.log(`[AGORA SERVICE] No MP4 found initially, polling for MP4 generation...`);
                const maxPolls = 4; // Poll 4 times with 30-second intervals
                
                for (let poll = 1; poll <= maxPolls && !targetFile; poll++) {
                    console.log(`[AGORA SERVICE] MP4 Poll attempt ${poll}/${maxPolls}...`);
                    await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30 seconds
                    
                    try {
                        const pollQuery = await axios.get(
                            `${AGORA_API_BASE_URL}/apps/${AGORA_APP_ID}/cloud_recording/resourceid/${resourceId}/sid/${sid}/mode/mix/query`,
                            { headers: { 'Authorization': getBasicAuthHeader(), 'Content-Type': 'application/json' } }
                        );
                        
                        const pollFileList = pollQuery.data?.serverResponse?.fileList;
                        if (pollFileList) {
                            const pollMp4 = pollFileList.find(file => file.fileName.endsWith('.mp4'));
                            if (pollMp4) {
                                console.log(`[AGORA SERVICE] ✅ MP4 file found on poll ${poll}: ${pollMp4.fileName}`);
                                targetFile = pollMp4;
                                // Update the main fileList for logging
                                fileList.length = 0;
                                fileList.push(...pollFileList);
                                break;
                            }
                        }
                    } catch (pollError) {
                        console.warn(`[AGORA SERVICE] Poll ${poll} failed:`, pollError.message);
                    }
                }
            }
            
            // Fall back to M3U8 or first file if MP4 still not found
            if (!targetFile) {
                targetFile = m3u8File || fileList[0];
                if (!mp4File && m3u8File) {
                    console.warn(`[AGORA SERVICE] ⚠️  MP4 not generated after polling, using M3U8`);
                }
            }
            
            if (targetFile && targetFile.fileName) {
                const azureAccountName = process.env.AGORA_AZURE_ACCESS_KEY;
                const azureContainer = process.env.AGORA_AZURE_BUCKET;
                const fileName = targetFile.fileName;
                const fileType = fileName.split('.').pop().toLowerCase();
                
                console.log(`[AZURE URL] Building URL with:`);
                console.log(`[AZURE URL] - Account: ${azureAccountName}`);
                console.log(`[AZURE URL] - Container: ${azureContainer}`);
                console.log(`[AZURE URL] - File: ${fileName}`);
                console.log(`[AZURE URL] - File Type: ${fileType} ${mp4File ? '(MP4 preferred)' : '(using available format)'}`);
                
                videoUrl = `https://${azureAccountName}.blob.core.windows.net/${azureContainer}/${fileName}`;
                console.log(`[AZURE URL] Constructed video URL: ${videoUrl}`);
                
                // Log file info for troubleshooting
                if (targetFile.fileSize) {
                    console.log(`[AZURE URL] File size: ${targetFile.fileSize} bytes`);
                }
                
                if (fileType === 'm3u8') {
                    console.warn(`[AZURE URL] Warning: M3U8 file detected. This is a playlist file, not a direct video.`);
                    console.warn(`[AZURE URL] You may need to download the M3U8 and associated TS segments for playback.`);
                    console.warn(`[AZURE URL] Consider checking if MP4 generation is enabled in your Agora configuration.`);
                }
            } else {
                console.error(`[AGORA SERVICE] No valid file found in fileList`);
            }
        } else {
            console.error(`[AGORA SERVICE] No files found in recording query response`);
        }

        // Update database with video URL and set status to completed
        console.log(`[DB] Updating recording status for SID: ${sid}`);
        console.log(`[DB] Video URL to save: ${videoUrl || 'NULL'}`);
        
        const updateResult = await db.query(
            `UPDATE recorded_sessions SET video_url = $1, processing_status = 'completed', updated_at = NOW() WHERE agora_recording_sid = $2`,
            [videoUrl, sid]
        );
        
        console.log(`[DB] Update result: ${updateResult.rowCount} row(s) affected`);
        if (updateResult.rowCount === 0) {
            console.warn(`[DB] Warning: No rows updated for SID: ${sid}. Recording may not exist in database.`);
        } else {
            console.log(`[DB] Successfully updated status to 'completed' and video URL for SID: ${sid}`);
        }
        
        return { ...stopResponse.data, videoUrl };
    } catch (error) {
        const errorDetails = error.response ? error.response.data : { message: error.message };
        if (errorDetails.code === 404 && errorDetails.reason === 'failed to find worker') {
            console.warn(`[AGORA SERVICE] Recording ${sid} may have already ended. Attempting to get file list.`);
            
            // Try to get the file list even if stop failed
            let videoUrl = null;
            try {
                const queryResponse = await axios.get(
                    `${AGORA_API_BASE_URL}/apps/${AGORA_APP_ID}/cloud_recording/resourceid/${resourceId}/sid/${sid}/mode/mix/query`,
                    { headers: { 'Authorization': getBasicAuthHeader(), 'Content-Type': 'application/json' } }
                );

                const fileList = queryResponse.data?.serverResponse?.fileList;
                console.log(`[AGORA SERVICE] Recovery query - found files:`, fileList?.map(f => f.fileName) || 'none');
                
                if (fileList && fileList.length > 0) {
                    const mp4File = fileList.find(file => file.fileName.endsWith('.mp4'));
                    const targetFile = mp4File || fileList[0];
                    
                    if (targetFile && targetFile.fileName) {
                        const azureAccountName = process.env.AGORA_AZURE_ACCESS_KEY;
                        const azureContainer = process.env.AGORA_AZURE_BUCKET;
                        videoUrl = `https://${azureAccountName}.blob.core.windows.net/${azureContainer}/${targetFile.fileName}`;
                        console.log(`[AGORA SERVICE] Recovery - constructed video URL: ${videoUrl}`);
                        
                        // Log recovered URL without verification to avoid 409 errors
                        console.log(`[AZURE URL] Recovery URL constructed: ${videoUrl}`);
                        const fileType = targetFile.fileName.split('.').pop().toLowerCase();
                        if (fileType === 'm3u8') {
                            console.warn(`[AZURE URL] Recovery: M3U8 playlist file detected`);
                        }
                    }
                } else {
                    console.warn(`[AGORA SERVICE] No files found in recovery query for SID: ${sid}`);
                }
            } catch (queryError) {
                console.warn(`[AGORA SERVICE] Could not query files for stopped recording ${sid}:`, queryError.message);
            }
            
            console.log(`[DB] Recovery update for SID: ${sid}, URL: ${videoUrl || 'NULL'}`);
            const recoveryResult = await db.query(
                `UPDATE recorded_sessions SET video_url = $1, processing_status = 'completed', updated_at = NOW() WHERE agora_recording_sid = $2`,
                [videoUrl, sid]
            );
            
            console.log(`[DB] Recovery update result: ${recoveryResult.rowCount} row(s) affected`);
            return { message: 'Recording already stopped or expired.', warning: true, videoUrl };
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