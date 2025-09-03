const axios = require('axios');
const db = require('../db');

// --- Environment Variable Validation ---
const { 
    AGORA_APP_ID, AGORA_CUSTOMER_ID, AGORA_CUSTOMER_SECRET
} = process.env;

const AGORA_API_BASE_URL = 'https://api.agora.io/v1';

const getBasicAuthHeader = () => {
    const credentials = `${AGORA_CUSTOMER_ID}:${AGORA_CUSTOMER_SECRET}`;
    return `Basic ${Buffer.from(credentials).toString('base64')}`;
};

const startScreenShareRecording = async (sessionId, courseId, teacherId) => {
    let recordingBotUid;
    try {
        // Validate Azure storage configuration
        const azureContainer = process.env.AGORA_AZURE_BUCKET;
        const azureAccountName = process.env.AGORA_AZURE_ACCESS_KEY;
        const azureAccessKey = process.env.AGORA_AZURE_SECRET_KEY;

        console.log(`[SCREEN RECORDING DEBUG] Configuration check:`);
        console.log(`[SCREEN RECORDING DEBUG] - Container: ${azureContainer ? '✓ SET' : '✗ MISSING'}`);
        console.log(`[SCREEN RECORDING DEBUG] - Account Name: ${azureAccountName ? '✓ SET' : '✗ MISSING'}`);
        console.log(`[SCREEN RECORDING DEBUG] - Access Key: ${azureAccessKey ? '✓ SET' : '✗ MISSING'}`);

        if (!azureContainer || !azureAccountName || !azureAccessKey) {
            const error = `Missing Azure storage configuration. Required: AGORA_AZURE_BUCKET, AGORA_AZURE_ACCESS_KEY (storage account name), AGORA_AZURE_SECRET_KEY (access key)`;
            console.error(`[SCREEN RECORDING ERROR] ${error}`);
            throw new Error(error);
        }

        recordingBotUid = String(Math.floor(Math.random() * 10000000) + 1);
        
        console.log(`[SCREEN RECORDING] Acquiring resource for session: ${sessionId} with Bot UID: ${recordingBotUid}`);
        
        const acquireResponse = await axios.post(
            `${AGORA_API_BASE_URL}/apps/${AGORA_APP_ID}/cloud_recording/acquire`,
            { cname: sessionId, uid: recordingBotUid, clientRequest: { resourceExpiredHour: 24 } },
            { headers: { 'Authorization': getBasicAuthHeader(), 'Content-Type': 'application/json' } }
        );

        const resourceId = acquireResponse.data.resourceId;
        console.log(`[SCREEN RECORDING] Acquired resourceId: ${resourceId}`);

        console.log(`[SCREEN RECORDING] Starting screen share prioritized recording with Azure storage config:`);
        console.log(`[SCREEN RECORDING] - Vendor: 5 (Azure Blob Storage)`);
        console.log(`[SCREEN RECORDING] - Container: ${azureContainer}`);
        console.log(`[SCREEN RECORDING] - Account: ${azureAccountName}`);
        console.log(`[SCREEN RECORDING] This will prioritize screen sharing content over webcam feeds`);
        
        const startResponse = await axios.post(
            `${AGORA_API_BASE_URL}/apps/${AGORA_APP_ID}/cloud_recording/resourceid/${resourceId}/mode/mix/start`,
            {
                cname: sessionId,
                uid: recordingBotUid,
                clientRequest: {
                    token: "", // No token needed for screen recording
                    storageConfig: {
                        vendor: 5, // Microsoft Azure Blob Storage
                        region: 0,
                        bucket: azureContainer,
                        accessKey: azureAccountName,
                        secretKey: azureAccessKey
                    },
                    recordingConfig: {
                        channelType: 0,
                        streamTypes: 2, // Record both audio and video
                        audioProfile: 1,
                        videoStreamType: 1, // High stream (screen sharing priority)
                        maxRecordingHour: 12,
                        subscribeVideoUids: ["#allstream#"], // Subscribe to all video streams
                        subscribeAudioUids: ["#allstream#"], // Subscribe to all audio streams
                        subscribeUidGroup: 0, // Subscribe to all users
                        transcodingConfig: {
                            width: 1920, // Full HD for screen content
                            height: 1080,
                            fps: 30, // Higher FPS for smooth screen recording
                            bitrate: 4000, // Higher bitrate for screen content
                            mixedVideoLayout: 0, // Floating layout - prioritizes larger streams (screen shares)
                            backgroundColor: "#000000",
                            defaultUserBackgroundImage: "https://via.placeholder.com/1x1/000000/000000.png" // Minimal placeholder image
                            // Note: layoutConfig is not allowed when using template mode (mixedVideoLayout: 0)
                        }
                    },
                    recordingFileConfig: {
                        avFileType: ["hls", "mp4"] // Generate both formats
                    }
                },
            },
            { headers: { 'Authorization': getBasicAuthHeader(), 'Content-Type': 'application/json' } }
        );

        const { sid } = startResponse.data;
        console.log(`[SCREEN RECORDING] Recording started successfully with Agora SID: ${sid}`);

        // Create database record for screen share recording
        await db.query(
            `INSERT INTO recorded_sessions (course_id, teacher_id, agora_recording_sid, agora_recording_resource_id, title, processing_status, recording_type)
             VALUES ($1, $2, $3, $4, $5, 'processing', 'screen_share')`,
            [courseId, teacherId, sid, resourceId, `Screen Share Recording - ${new Date().toLocaleDateString()}`]
        );
        console.log(`[SCREEN RECORDING DB] Placeholder record created for SID: ${sid}`);

        return { sid, resourceId, uid: recordingBotUid, recordingType: 'screen_share' };

    } catch (error) {
        const errorDetails = error.response ? error.response.data : { message: error.message };
        console.error("[SCREEN RECORDING] CRITICAL ERROR starting recording:");
        console.error("[SCREEN RECORDING] Error details:", JSON.stringify(errorDetails, null, 2));
        console.error("[SCREEN RECORDING] Session ID:", sessionId);
        console.error("[SCREEN RECORDING] Course ID:", courseId);
        console.error("[SCREEN RECORDING] Teacher ID:", teacherId);
        
        if (error.config) {
            console.error("[SCREEN RECORDING] Request URL:", error.config.url);
            console.error("[SCREEN RECORDING] Request data:", JSON.stringify(error.config.data, null, 2));
        }
        
        throw new Error(`Failed to start screen share recording: ${errorDetails.reason || errorDetails.message || 'Unknown error'}`);
    }
};

const stopScreenShareRecording = async (sessionId, resourceId, sid, uid) => {
    try {
        console.log(`[SCREEN RECORDING] Stopping recording for SID: ${sid}`);
        
        const stopResponse = await axios.post(
            `${AGORA_API_BASE_URL}/apps/${AGORA_APP_ID}/cloud_recording/resourceid/${resourceId}/sid/${sid}/mode/mix/stop`,
            { 
                cname: sessionId, 
                uid: uid, 
                clientRequest: {} 
            },
            { headers: { 'Authorization': getBasicAuthHeader(), 'Content-Type': 'application/json' } }
        );

        console.log(`[SCREEN RECORDING] Recording stopped successfully for SID: ${sid}`);
        
        // Wait for file processing
        console.log(`[SCREEN RECORDING] Waiting 30 seconds for file processing...`);
        await new Promise(resolve => setTimeout(resolve, 30000));
        
        // Query for files with MP4 polling
        console.log(`[SCREEN RECORDING] Querying recording files for SID: ${sid}`);
        const queryResponse = await axios.get(
            `${AGORA_API_BASE_URL}/apps/${AGORA_APP_ID}/cloud_recording/resourceid/${resourceId}/sid/${sid}/mode/mix/query`,
            { headers: { 'Authorization': getBasicAuthHeader(), 'Content-Type': 'application/json' } }
        );

        let videoUrl = null;
        const fileList = queryResponse.data?.serverResponse?.fileList;
        console.log(`[SCREEN RECORDING] Query response:`, JSON.stringify(queryResponse.data, null, 2));
        
        if (fileList && fileList.length > 0) {
            console.log(`[SCREEN RECORDING] Found ${fileList.length} files:`, fileList.map(f => `${f.fileName} (${f.fileSize || 'unknown size'})`));
            
            // Prioritize MP4 files with polling
            let mp4File = fileList.find(file => file.fileName.endsWith('.mp4'));
            
            // Poll for MP4 if not found initially
            if (!mp4File) {
                console.log(`[SCREEN RECORDING] No MP4 found initially, polling for MP4 generation...`);
                for (let poll = 1; poll <= 4; poll++) {
                    console.log(`[SCREEN RECORDING] MP4 Poll attempt ${poll}/4...`);
                    await new Promise(resolve => setTimeout(resolve, 30000));
                    
                    try {
                        const pollQuery = await axios.get(
                            `${AGORA_API_BASE_URL}/apps/${AGORA_APP_ID}/cloud_recording/resourceid/${resourceId}/sid/${sid}/mode/mix/query`,
                            { headers: { 'Authorization': getBasicAuthHeader(), 'Content-Type': 'application/json' } }
                        );
                        
                        const pollFileList = pollQuery.data?.serverResponse?.fileList;
                        if (pollFileList) {
                            const pollMp4 = pollFileList.find(file => file.fileName.endsWith('.mp4'));
                            if (pollMp4) {
                                console.log(`[SCREEN RECORDING] ✅ MP4 file found on poll ${poll}: ${pollMp4.fileName}`);
                                mp4File = pollMp4;
                                break;
                            }
                        }
                    } catch (pollError) {
                        console.warn(`[SCREEN RECORDING] Poll ${poll} failed:`, pollError.message);
                    }
                }
            }
            
            const targetFile = mp4File || fileList[0];
            
            if (targetFile && targetFile.fileName) {
                const azureAccountName = process.env.AGORA_AZURE_ACCESS_KEY;
                const azureContainer = process.env.AGORA_AZURE_BUCKET;
                const fileName = targetFile.fileName;
                
                videoUrl = `https://${azureAccountName}.blob.core.windows.net/${azureContainer}/${fileName}`;
                console.log(`[SCREEN RECORDING] Constructed video URL: ${videoUrl}`);
                
                if (!mp4File) {
                    console.warn(`[SCREEN RECORDING] ⚠️ Using non-MP4 file: ${fileName}`);
                }
            }
        }

        // Update database with screen recording URL
        const updateResult = await db.query(
            `UPDATE recorded_sessions SET video_url = $1, processing_status = 'completed', updated_at = NOW() WHERE agora_recording_sid = $2`,
            [videoUrl, sid]
        );
        
        console.log(`[SCREEN RECORDING DB] Update result: ${updateResult.rowCount} row(s) affected`);
        
        return { ...stopResponse.data, videoUrl, recordingType: 'screen_share' };
        
    } catch (error) {
        const errorDetails = error.response ? error.response.data : { message: error.message };
        
        // Handle the common "failed to find worker" error gracefully
        if (errorDetails.code === 404 && errorDetails.reason === 'failed to find worker') {
            console.log(`[SCREEN RECORDING] Recording ${sid} worker not found - recording may have already ended or expired`);
            
            // Try to get the file list even if stop failed
            let videoUrl = null;
            try {
                console.log(`[SCREEN RECORDING] Attempting recovery query for files...`);
                const queryResponse = await axios.get(
                    `${AGORA_API_BASE_URL}/apps/${AGORA_APP_ID}/cloud_recording/resourceid/${resourceId}/sid/${sid}/mode/mix/query`,
                    { headers: { 'Authorization': getBasicAuthHeader(), 'Content-Type': 'application/json' } }
                );

                const fileList = queryResponse.data?.serverResponse?.fileList;
                console.log(`[SCREEN RECORDING] Recovery query - found files:`, fileList?.map(f => f.fileName) || 'none');
                
                if (fileList && fileList.length > 0) {
                    const mp4File = fileList.find(file => file.fileName.endsWith('.mp4'));
                    const targetFile = mp4File || fileList[0];
                    
                    if (targetFile && targetFile.fileName) {
                        const azureAccountName = process.env.AGORA_AZURE_ACCESS_KEY;
                        const azureContainer = process.env.AGORA_AZURE_BUCKET;
                        videoUrl = `https://${azureAccountName}.blob.core.windows.net/${azureContainer}/${targetFile.fileName}`;
                        console.log(`[SCREEN RECORDING] Recovery - constructed video URL: ${videoUrl}`);
                    }
                } else {
                    console.warn(`[SCREEN RECORDING] No files found in recovery query for SID: ${sid}`);
                }
            } catch (queryError) {
                console.warn(`[SCREEN RECORDING] Could not query files for stopped recording ${sid}:`, queryError.message);
            }
            
            // Update database with recovered video URL
            console.log(`[SCREEN RECORDING] Recovery database update for SID: ${sid}, URL: ${videoUrl || 'NULL'}`);
            const recoveryResult = await db.query(
                `UPDATE recorded_sessions SET video_url = $1, processing_status = 'completed', updated_at = NOW() WHERE agora_recording_sid = $2`,
                [videoUrl, sid]
            );
            
            console.log(`[SCREEN RECORDING] Recovery update result: ${recoveryResult.rowCount} row(s) affected`);
            
            return { 
                message: 'Recording already stopped or expired - recovered successfully', 
                warning: true, 
                videoUrl,
                recordingType: 'screen_share'
            };
        }
        
        console.error("[SCREEN RECORDING] Error stopping recording:", JSON.stringify(errorDetails, null, 2));
        throw new Error(`Failed to stop screen share recording: ${errorDetails.reason || errorDetails.message || 'Unknown error'}`);
    }
};

module.exports = {
    startScreenShareRecording,
    stopScreenShareRecording,
};