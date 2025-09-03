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

const startWebPageRecording = async (sessionId, courseId, teacherId) => {
    let recordingBotUid;
    try {
        // Validate Azure storage configuration
        const azureContainer = process.env.AGORA_AZURE_BUCKET;
        const azureAccountName = process.env.AGORA_AZURE_ACCESS_KEY;
        const azureAccessKey = process.env.AGORA_AZURE_SECRET_KEY;

        console.log(`[WEB RECORDING DEBUG] Configuration check:`);
        console.log(`[WEB RECORDING DEBUG] - Container: ${azureContainer ? '✓ SET' : '✗ MISSING'}`);
        console.log(`[WEB RECORDING DEBUG] - Account Name: ${azureAccountName ? '✓ SET' : '✗ MISSING'}`);
        console.log(`[WEB RECORDING DEBUG] - Access Key: ${azureAccessKey ? '✓ SET' : '✗ MISSING'}`);

        if (!azureContainer || !azureAccountName || !azureAccessKey) {
            const error = `Missing Azure storage configuration. Required: AGORA_AZURE_BUCKET, AGORA_AZURE_ACCESS_KEY (storage account name), AGORA_AZURE_SECRET_KEY (access key)`;
            console.error(`[WEB RECORDING ERROR] ${error}`);
            throw new Error(error);
        }

        recordingBotUid = String(Math.floor(Math.random() * 10000000) + 1);
        
        console.log(`[WEB RECORDING] Acquiring WEB resource for session: ${sessionId} with Bot UID: ${recordingBotUid}`);
        
        const acquireResponse = await axios.post(
            `${AGORA_API_BASE_URL}/apps/${AGORA_APP_ID}/cloud_recording/acquire`,
            { 
                cname: sessionId, 
                uid: recordingBotUid, 
                clientRequest: { 
                    resourceExpiredHour: 24,
                    scene: 2 // Web page recording scene
                } 
            },
            { headers: { 'Authorization': getBasicAuthHeader(), 'Content-Type': 'application/json' } }
        );

        const resourceId = acquireResponse.data.resourceId;
        console.log(`[WEB RECORDING] Acquired resourceId: ${resourceId}`);

        // Construct the web page URL to record
        const webPageUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/session/${sessionId}`;
        console.log(`[WEB RECORDING] Recording web page: ${webPageUrl}`);
        
        // Check if URL is localhost - Agora cannot access localhost URLs
        if (webPageUrl.includes('localhost') || webPageUrl.includes('127.0.0.1')) {
            throw new Error('Web recording cannot access localhost URLs. Set FRONTEND_URL to a publicly accessible URL or use screen share recording instead.');
        }
        
        console.log(`[WEB RECORDING] Starting web page recording with Azure storage config:`);
        console.log(`[WEB RECORDING] - Vendor: 5 (Azure Blob Storage)`);
        console.log(`[WEB RECORDING] - Container: ${azureContainer}`);
        console.log(`[WEB RECORDING] - Account: ${azureAccountName}`);
        
        const startResponse = await axios.post(
            `${AGORA_API_BASE_URL}/apps/${AGORA_APP_ID}/cloud_recording/resourceid/${resourceId}/mode/web/start`,
            {
                cname: sessionId,
                uid: recordingBotUid,
                clientRequest: {
                    token: "", // Web recording doesn't require token
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
                        videoStreamType: 0,
                        maxRecordingHour: 12
                    },
                    recordingFileConfig: {
                        avFileType: ["hls", "mp4"] // Generate both formats
                    },
                    extensionServiceConfig: {
                        extensionServices: [
                            {
                                serviceName: "web_recorder_service",
                                errorHandlePolicy: "error_abort", // Abort on errors
                                serviceParam: {
                                    url: webPageUrl,
                                    videoWidth: 1920, // Required parameter for web recording
                                    videoHeight: 1080, // Required parameter for web recording
                                    videoBitrate: 3000,
                                    videoFps: 15,
                                    mobile: false, // Desktop view
                                    maxRecordingHour: 12,
                                    readyTimeout: 20, // Wait 20 seconds for page to load
                                    onhold: false, // Start recording immediately
                                    audioProfile: 1
                                }
                            }
                        ],
                        apiVersion: "v1"
                    }
                },
            },
            { headers: { 'Authorization': getBasicAuthHeader(), 'Content-Type': 'application/json' } }
        );

        const { sid } = startResponse.data;
        console.log(`[WEB RECORDING] Recording started successfully with Agora SID: ${sid}`);

        // Create database record for web page recording
        await db.query(
            `INSERT INTO recorded_sessions (course_id, teacher_id, agora_recording_sid, agora_recording_resource_id, title, processing_status, recording_type)
             VALUES ($1, $2, $3, $4, $5, 'processing', 'web_page')`,
            [courseId, teacherId, sid, resourceId, `Web Page Recording - ${new Date().toLocaleDateString()}`]
        );
        console.log(`[WEB RECORDING DB] Placeholder record created for SID: ${sid}`);

        return { sid, resourceId, uid: recordingBotUid, recordingType: 'web_page' };

    } catch (error) {
        const errorDetails = error.response ? error.response.data : { message: error.message };
        console.error("[WEB RECORDING] CRITICAL ERROR starting recording:");
        console.error("[WEB RECORDING] Error details:", JSON.stringify(errorDetails, null, 2));
        console.error("[WEB RECORDING] Session ID:", sessionId);
        console.error("[WEB RECORDING] Course ID:", courseId);
        console.error("[WEB RECORDING] Teacher ID:", teacherId);
        
        if (error.config) {
            console.error("[WEB RECORDING] Request URL:", error.config.url);
            console.error("[WEB RECORDING] Request data:", JSON.stringify(error.config.data, null, 2));
        }
        
        // Web recording specific error handling
        if (errorDetails.code === 2 && errorDetails.reason === "services not selected!") {
            console.error("[WEB RECORDING ERROR] Storage configuration issue - services not selected");
            throw new Error('Azure storage configuration error: Recording service not properly configured. Check AGORA_AZURE_* environment variables.');
        }
        
        if (errorDetails.code === 53) {
            console.error("[WEB RECORDING ERROR] Web recording not enabled for this project");
            throw new Error('Web recording not enabled: Please enable web recording in your Agora Console project.');
        }
        
        throw new Error(`Failed to start web page recording: ${errorDetails.reason || errorDetails.message || 'Unknown error'}`);
    }
};

const stopWebPageRecording = async (sessionId, resourceId, sid, uid) => {
    try {
        console.log(`[WEB RECORDING] Stopping recording for SID: ${sid}`);
        
        const stopResponse = await axios.post(
            `${AGORA_API_BASE_URL}/apps/${AGORA_APP_ID}/cloud_recording/resourceid/${resourceId}/sid/${sid}/mode/web/stop`,
            { 
                cname: sessionId, 
                uid: uid, 
                clientRequest: {} 
            },
            { headers: { 'Authorization': getBasicAuthHeader(), 'Content-Type': 'application/json' } }
        );

        console.log(`[WEB RECORDING] Recording stopped successfully for SID: ${sid}`);
        
        // Wait for file processing
        console.log(`[WEB RECORDING] Waiting 45 seconds for web page file processing...`);
        await new Promise(resolve => setTimeout(resolve, 45000));
        
        // Query for files
        console.log(`[WEB RECORDING] Querying recording files for SID: ${sid}`);
        const queryResponse = await axios.get(
            `${AGORA_API_BASE_URL}/apps/${AGORA_APP_ID}/cloud_recording/resourceid/${resourceId}/sid/${sid}/mode/web/query`,
            { headers: { 'Authorization': getBasicAuthHeader(), 'Content-Type': 'application/json' } }
        );

        let videoUrl = null;
        const fileList = queryResponse.data?.serverResponse?.fileList;
        console.log(`[WEB RECORDING] Query response:`, JSON.stringify(queryResponse.data, null, 2));
        
        if (fileList && fileList.length > 0) {
            console.log(`[WEB RECORDING] Found ${fileList.length} files:`, fileList.map(f => `${f.fileName} (${f.fileSize || 'unknown size'})`));
            
            // Prioritize MP4 files
            const mp4File = fileList.find(file => file.fileName.endsWith('.mp4'));
            const targetFile = mp4File || fileList[0];
            
            if (targetFile && targetFile.fileName) {
                const azureAccountName = process.env.AGORA_AZURE_ACCESS_KEY;
                const azureContainer = process.env.AGORA_AZURE_BUCKET;
                const fileName = targetFile.fileName;
                
                videoUrl = `https://${azureAccountName}.blob.core.windows.net/${azureContainer}/${fileName}`;
                console.log(`[WEB RECORDING] Constructed video URL: ${videoUrl}`);
            }
        }

        // Update database with web recording URL
        const updateResult = await db.query(
            `UPDATE recorded_sessions SET video_url = $1, processing_status = 'completed', updated_at = NOW() WHERE agora_recording_sid = $2`,
            [videoUrl, sid]
        );
        
        console.log(`[WEB RECORDING DB] Update result: ${updateResult.rowCount} row(s) affected`);
        
        return { ...stopResponse.data, videoUrl, recordingType: 'web_page' };
        
    } catch (error) {
        const errorDetails = error.response ? error.response.data : { message: error.message };
        console.error("[WEB RECORDING] Error stopping recording:", JSON.stringify(errorDetails, null, 2));
        throw new Error(`Failed to stop web page recording: ${errorDetails.reason || errorDetails.message || 'Unknown error'}`);
    }
};

module.exports = {
    startWebPageRecording,
    stopWebPageRecording,
};