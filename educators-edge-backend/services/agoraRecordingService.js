// services/agoraRecordingService.js
// Handles Agora Cloud Recording API calls

const axios = require('axios');
const { RtcTokenBuilder, RtcRole } = require('agora-token');
const db = require('../db');

class AgoraRecordingService {
    constructor() {
        this.appId = process.env.AGORA_APP_ID;
        this.appCertificate = process.env.AGORA_APP_CERTIFICATE;
        this.customerId = process.env.AGORA_CUSTOMER_ID;
        this.customerSecret = process.env.AGORA_CUSTOMER_SECRET;
        
        // Cloud Recording API base URL
        this.baseUrl = 'https://api.agora.io/v1/apps';
        
        // Validate required environment variables
        if (!this.appId || !this.appCertificate || !this.customerId || !this.customerSecret) {
            console.error('Missing required Agora environment variables');
        }
    }

    // Generate a token for cloud recording (server-side only)
    generateRecordingToken(channelName, uid = 0) {
        try {
            const expireTime = Math.floor(Date.now() / 1000) + (24 * 3600); // 24 hours
            const token = RtcTokenBuilder.buildTokenWithUid(
                this.appId,
                this.appCertificate,
                channelName,
                uid,
                RtcRole.PUBLISHER, // Recording service needs PUBLISHER role
                expireTime
            );
            return token;
        } catch (error) {
            console.error('Error generating recording token:', error);
            throw error;
        }
    }

    // Get authorization header for Cloud Recording API
    getAuthHeader() {
        const credentials = Buffer.from(`${this.customerId}:${this.customerSecret}`).toString('base64');
        return {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/json'
        };
    }

    // Start Cloud Recording
    async startRecording(channelName, courseId, teacherId) {
        try {
            console.log(`[AGORA] Starting recording for channel: ${channelName}`);
            console.log(`[AGORA] CourseId: ${courseId} (type: ${typeof courseId})`);
            console.log(`[AGORA] TeacherId: ${teacherId}`);
            
            // Step 1: Acquire recording resource
            const resourceResponse = await axios.post(
                `${this.baseUrl}/${this.appId}/cloud_recording/acquire`,
                {
                    cname: channelName,
                    uid: '0', // Use string UID for cloud recording
                    clientRequest: {
                        resourceExpiredHour: 24,
                        scene: 0 // Real-time communication
                    }
                },
                { headers: this.getAuthHeader() }
            );

            const resourceId = resourceResponse.data.resourceId;
            console.log(`[AGORA] Acquired resource ID: ${resourceId}`);

            // Step 2: Start recording
            const recordingToken = this.generateRecordingToken(channelName);
            // fileNamePrefix must be an array of strings without special characters
            const fileNamePrefix = [`course${courseId}`, `session${Date.now()}`];
            console.log(`[AGORA] Generated fileNamePrefix: ${JSON.stringify(fileNamePrefix)}`);
            
            const startResponse = await axios.post(
                `${this.baseUrl}/${this.appId}/cloud_recording/resourceid/${resourceId}/mode/mix/start`,
                {
                    cname: channelName,
                    uid: '0',
                    clientRequest: {
                        token: recordingToken,
                        recordingConfig: {
                            maxIdleTime: 30,
                            streamTypes: 2, // Audio and video
                            channelType: 0, // Communication profile
                            videoStreamType: 0, // High-quality video
                            subscribeVideoUids: ["#allstream#"], // Record all streams
                            subscribeAudioUids: ["#allstream#"], // Record all audio
                            subscribeUidGroup: 0
                        },
                        transcoding: {
                            width: 1920, // Full HD width for screen capture
                            height: 1080, // Full HD height for screen capture
                            fps: 30,
                            bitrate: 4000, // Higher bitrate for screen content
                            maxResolutionUid: "1", // Ensure highest resolution
                            mixedVideoLayout: 0, // Floating layout - main screen takes full canvas
                            backgroundColor: "#000000"
                        },
                        recordingFileConfig: {
                            avFileType: ["hls", "mp4"] // Generate both HLS and MP4
                        },
                        storageConfig: {
                            vendor: 5, // Microsoft Azure Blob Storage
                            region: 0, // Region parameter has no effect for Azure
                            bucket: process.env.AGORA_AZURE_BUCKET || 'virtualvidoes',
                            accessKey: process.env.AGORA_AZURE_ACCESS_KEY || 'virtualclassroom',
                            secretKey: process.env.AGORA_AZURE_SECRET_KEY,
                            fileNamePrefix: fileNamePrefix
                        }
                    }
                },
                { headers: this.getAuthHeader() }
            );

            const sid = startResponse.data.sid;
            console.log(`[AGORA] Recording started with SID: ${sid}`);

            // Step 3: Store recording info in database
            const recordingData = await db.query(`
                INSERT INTO recorded_sessions 
                (course_id, teacher_id, agora_channel_name, agora_recording_resource_id, agora_recording_sid, processing_status)
                VALUES ($1, $2, $3, $4, $5, 'processing')
                RETURNING *
            `, [courseId, teacherId, channelName, resourceId, sid]);

            return {
                success: true,
                recordingId: recordingData.rows[0].id,
                resourceId,
                sid,
                message: 'Recording started successfully'
            };

        } catch (error) {
            console.error('[AGORA] Error starting recording:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data || error.message
            };
        }
    }

    // Stop Cloud Recording
    async stopRecording(recordingId) {
        try {
            console.log(`[AGORA] Stopping recording: ${recordingId}`);
            
            // Get recording info from database
            const recordingData = await db.query(
                'SELECT * FROM recorded_sessions WHERE id = $1',
                [recordingId]
            );

            if (recordingData.rows.length === 0) {
                throw new Error('Recording not found');
            }

            const recording = recordingData.rows[0];
            const { agora_recording_resource_id: resourceId, agora_recording_sid: sid, agora_channel_name: channelName } = recording;

            // Stop the recording
            const stopResponse = await axios.post(
                `${this.baseUrl}/${this.appId}/cloud_recording/resourceid/${resourceId}/sid/${sid}/mode/mix/stop`,
                {
                    cname: channelName,
                    uid: '0',
                    clientRequest: {}
                },
                { headers: this.getAuthHeader() }
            );

            console.log(`[AGORA] Recording stopped:`, stopResponse.data);

            // Update database status
            await db.query(
                'UPDATE recorded_sessions SET processing_status = $1, updated_at = NOW() WHERE id = $2',
                ['transcribing', recordingId]
            );

            return {
                success: true,
                recordingId,
                fileList: stopResponse.data.serverResponse?.fileList || [],
                message: 'Recording stopped successfully'
            };

        } catch (error) {
            console.error('[AGORA] Error stopping recording:', error.response?.data || error.message);
            
            // Mark as failed in database
            await db.query(
                'UPDATE recorded_sessions SET processing_status = $1, updated_at = NOW() WHERE id = $2',
                ['failed', recordingId]
            );

            return {
                success: false,
                error: error.response?.data || error.message
            };
        }
    }

    // Query recording status
    async queryRecording(resourceId, sid) {
        try {
            const response = await axios.get(
                `${this.baseUrl}/${this.appId}/cloud_recording/resourceid/${resourceId}/sid/${sid}/mode/mix/query`,
                { headers: this.getAuthHeader() }
            );

            return {
                success: true,
                status: response.data
            };

        } catch (error) {
            console.error('[AGORA] Error querying recording:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data || error.message
            };
        }
    }
}

module.exports = new AgoraRecordingService();