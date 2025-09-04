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

        console.log(`[SCREEN RECORDING] Starting MIX mode recording for screen share prioritization:`);
        console.log(`[SCREEN RECORDING] - Mode: mix (combines all streams into single video)`);
        console.log(`[SCREEN RECORDING] - Container: ${azureContainer}`);
        console.log(`[SCREEN RECORDING] - Account: ${azureAccountName}`);
        console.log(`[SCREEN RECORDING] - Session/Channel: ${sessionId}`);
        console.log(`[SCREEN RECORDING] - Recording Bot UID: ${recordingBotUid}`);
        console.log(`[SCREEN RECORDING] Mix mode will record screen share with priority layout and generate MP4 files`);
        
        // Generate recording token (required for proper authentication)
        const { RtcTokenBuilder, RtcRole } = require('agora-token');
        const appCertificate = process.env.AGORA_APP_CERTIFICATE;
        const expirationTimeInSeconds = 3600;
        const currentTimestamp = Math.floor(Date.now() / 1000);
        const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;
        
        const recordingToken = RtcTokenBuilder.buildTokenWithUid(
            AGORA_APP_ID,
            appCertificate,
            sessionId,
            parseInt(recordingBotUid),
            RtcRole.PUBLISHER,
            privilegeExpiredTs
        );
        
        console.log(`[SCREEN RECORDING] Generated recording token for UID: ${recordingBotUid}`);

        const startResponse = await axios.post(
            `${AGORA_API_BASE_URL}/apps/${AGORA_APP_ID}/cloud_recording/resourceid/${resourceId}/mode/mix/start`,
            {
                cname: sessionId,
                uid: recordingBotUid,
                clientRequest: {
                    token: recordingToken, // Use generated token like working agoraService
                    storageConfig: {
                        vendor: 3, // Microsoft Azure Blob Storage (correct vendor code)
                        region: 16, // NA_Ashburn region for better performance
                        bucket: azureContainer,
                        accessKey: azureAccountName, // Storage account name
                        secretKey: azureAccessKey // Access key
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
                            mixedVideoLayout: 1, // Best fit layout (template mode)
                            backgroundColor: "#000000"
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
        console.log(`[SCREEN RECORDING] Recording started successfully with Agora SID: ${sid}`);
        
        // Debug: Log what the recording configuration was sent to Agora
        console.log(`[SCREEN RECORDING DEBUG] Recording will capture:`);
        console.log(`[SCREEN RECORDING DEBUG] - Channel: ${sessionId}`);
        console.log(`[SCREEN RECORDING DEBUG] - Video UIDs: ${JSON.stringify(["#allstream#"])}`);
        console.log(`[SCREEN RECORDING DEBUG] - Audio UIDs: ${JSON.stringify(["#allstream#"])}`);
        console.log(`[SCREEN RECORDING DEBUG] - Recording Bot UID: ${recordingBotUid}`);
        console.log(`[SCREEN RECORDING DEBUG] - Expected to find active streams in channel when recording starts`);

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
        
        // Wait for file processing before querying (MP4 generation takes time) - SAME AS WORKING VERSION
        console.log(`[SCREEN RECORDING] Waiting 30 seconds for file processing...`);
        await new Promise(resolve => setTimeout(resolve, 30000));
        
        // Query the recording to get the file list - SAME AS WORKING VERSION
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
            
            // Prioritize MP4 files for better compatibility - SAME AS WORKING VERSION
            const mp4File = fileList.find(file => file.fileName.endsWith('.mp4'));
            const m3u8File = fileList.find(file => file.fileName.endsWith('.m3u8'));
            
            // If no MP4 but M3U8 exists, try polling for MP4 for up to 2 minutes - SAME AS WORKING VERSION
            let targetFile = mp4File;
            if (!mp4File && m3u8File) {
                console.log(`[SCREEN RECORDING] No MP4 found initially, polling for MP4 generation...`);
                const maxPolls = 4; // Poll 4 times with 30-second intervals
                
                for (let poll = 1; poll <= maxPolls && !targetFile; poll++) {
                    console.log(`[SCREEN RECORDING] MP4 Poll attempt ${poll}/${maxPolls}...`);
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
                                console.log(`[SCREEN RECORDING] ✅ MP4 file found on poll ${poll}: ${pollMp4.fileName}`);
                                targetFile = pollMp4;
                                // Update the main fileList for logging
                                fileList.length = 0;
                                fileList.push(...pollFileList);
                                break;
                            }
                        }
                    } catch (pollError) {
                        console.warn(`[SCREEN RECORDING] Poll ${poll} failed:`, pollError.message);
                    }
                }
            }
            
            // Fall back to M3U8 or first file if MP4 still not found - SAME AS WORKING VERSION
            if (!targetFile) {
                targetFile = m3u8File || fileList[0];
                if (!mp4File && m3u8File) {
                    console.warn(`[SCREEN RECORDING] ⚠️  MP4 not generated after polling, using M3U8`);
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
                console.error(`[SCREEN RECORDING] No valid file found in fileList`);
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