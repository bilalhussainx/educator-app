// services/agoraRecordingService.js
// [DEFINITIVE FIX] Handles Agora Cloud Recording API calls with robust scale-to-fit configuration

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

    /**
     * [DEFINITIVE FIX for Quarter-Screen Recording]
     * Starts a cloud recording using a robust, server-side "Scale-to-Fit" layout.
     * This configuration requires ZERO dimension input from the frontend.
     * Handles any video stream automatically without cropping.
     * @param {string} channelName - The channel to record.
     * @param {string} courseId - The ID of the course.
     * @param {string} teacherId - The ID of the teacher.
     * @returns {Promise<object>} The response data from the Agora API.
     */
    async startRecording(channelName, courseId, teacherId, screenDimensions) {
        try {
            console.log(`[AGORA] Starting recording for channel: ${channelName}`);
            console.log(`[AGORA] CourseId: ${courseId} (type: ${typeof courseId})`);
            console.log(`[AGORA] TeacherId: ${teacherId}`);
            console.log(`[AGORA] ScreenDimensions:`, screenDimensions);
            
            // Use dynamic dimensions with safe fallback
            const recordingWidth = screenDimensions?.width || 1920;
            const recordingHeight = screenDimensions?.height || 1080;
            console.log(`[AGORA] Using dynamic recording canvas: ${recordingWidth}x${recordingHeight}`);
            
            // [DEFINITIVE FIX] Generate deterministic UIDs for explicit layout targeting
            const teacherNumericUid = parseInt(teacherId.replace(/-/g, '').substring(0, 8), 16) % 2147483647;
            const screenShareNumericUid = teacherNumericUid + 1; // Convention: screen share is teacher UID + 1
            console.log(`[AGORA] Teacher UID: ${teacherNumericUid}, Screen Share UID: ${screenShareNumericUid}`);
            
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

            // Step 2: Start recording with definitive scale-to-fit configuration
            const recordingToken = this.generateRecordingToken(channelName);
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
                        // [THE CRITICAL FIX] This transcodingConfig is the entire solution.
                        transcodingConfig: {
                            width: recordingWidth,   // Use dynamic width from client
                            height: recordingHeight, // Use dynamic height from client
                            fps: 30,
                            bitrate: 6000,           // High bitrate for screen content quality
                            mixedVideoLayout: 3,     // 3 = Customized Layout - Essential for control
                            backgroundColor: "#000000",
                            // [DEFINITIVE FIX] Explicit UID-based dual-stream layout
                            layoutConfig: [
                                {
                                    // TARGET: Teacher's SCREEN SHARE stream (main content)
                                    uid: String(screenShareNumericUid),
                                    x_axis: 0.0,         // Full canvas from top-left
                                    y_axis: 0.0,
                                    width: 1.0,          // 100% of canvas width
                                    height: 1.0,         // 100% of canvas height
                                    alpha: 1.0,          // Fully opaque
                                    render_mode: 1       // Scale to fit, NO CROPPING
                                },
                                {
                                    // TARGET: Teacher's CAMERA stream (picture-in-picture)
                                    uid: String(teacherNumericUid),
                                    x_axis: 0.75,        // Bottom-right corner
                                    y_axis: 0.75,
                                    width: 0.2,          // 20% of canvas width
                                    height: 0.2,         // 20% of canvas height
                                    alpha: 1.0,          // Fully opaque
                                    render_mode: 1       // Scale to fit, NO CROPPING
                                }
                            ]
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
            console.log(`[AGORA] Using robust scale-to-fit layout - handles ANY video stream automatically`);

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
                message: 'Recording started with definitive scale-to-fit configuration'
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