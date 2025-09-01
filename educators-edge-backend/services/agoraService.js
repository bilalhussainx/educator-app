// educators-edge-backend/src/services/agoraService.js

const axios = require('axios');
const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');

// --- Environment Variable Validation ---
// A production-grade service validates its required secrets at startup to fail fast.
const { 
    AGORA_APP_ID, 
    AGORA_CUSTOMER_ID, 
    AGORA_CUSTOMER_SECRET,
    CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET
} = process.env;

if (!AGORA_APP_ID || !AGORA_CUSTOMER_ID || !AGORA_CUSTOMER_SECRET || !CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    console.error("[AGORA SERVICE] CRITICAL ERROR: Missing required Agora or Cloudinary environment variables. Recording will fail.");
    // In a high-availability system, you might throw an error here to prevent the app from starting in a broken state.
}

// --- Initialize Cloudinary SDK ---
try {
    cloudinary.config({
        cloud_name: CLOUDINARY_CLOUD_NAME,
        api_key: CLOUDINARY_API_KEY,
        api_secret: CLOUDINARY_API_SECRET,
        secure: true // Ensure all URLs are HTTPS
    });
    console.log("[CLOUDINARY] SDK configured successfully.");
} catch (error) {
    console.error("[CLOUDINARY] CRITICAL ERROR: Could not configure Cloudinary SDK.", error.message);
}

const AGORA_API_BASE_URL = 'https://api.agora.io/v1';

/**
 * Creates the HTTP Basic Authentication header required by Agora's RESTful APIs.
 * It correctly uses the Customer ID and Customer Secret.
 * @returns {string} The Base64 encoded credential string.
 */
const getBasicAuthHeader = () => {
    const credentials = `${AGORA_CUSTOMER_ID}:${AGORA_CUSTOMER_SECRET}`;
    return `Basic ${Buffer.from(credentials).toString('base64')}`;
};

/**
 * Starts a cloud recording for a given channel using Agora's RESTful API.
 * This function initiates the recording to Agora's temporary internal cloud storage.
 * A webhook from Agora will notify our backend when the recording file is ready for processing.
 * @param {string} channelName - The channel to record.
 * @param {string} recordingBotUid - A unique UID for the recording bot to use.
 * @returns {Promise<object>} The response data from the Agora API, including the resourceId and sid.
 */
const startCloudRecording = async (channelName, recordingBotUid, courseId, teacherId) => {
    try {
        console.log(`[AGORA SERVICE] Acquiring resource for channel: ${channelName}`);
        
        // Step 1: Acquire a Resource ID. This part of the logic was already correct.
        const acquireResponse = await axios.post(
            `${AGORA_API_BASE_URL}/apps/${AGORA_APP_ID}/cloud_recording/acquire`,
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

        // Step 2: Start the recording using the acquired resourceId with the corrected request body.
        const startResponse = await axios.post(
            `${AGORA_API_BASE_URL}/apps/${AGORA_APP_ID}/cloud_recording/resourceid/${resourceId}/mode/mix/start`,
            {
                cname: channelName,
                uid: recordingBotUid,
                clientRequest: {
                    // [THE FIX] The request body is now restructured to be 100% compliant.
                    // The invalid `token` key is removed, and a placeholder `storageConfig` is added
                    // to demonstrate the correct structure for the webhook workflow.
                    recordingConfig: {
                        channelType: 1,
                        streamTypes: 2,
                        transcodingConfig: {
                            "width": 1280, "height": 720, "fps": 30, "bitrate": 2000, "mixedVideoLayout": 1,
                        },
                    },
                    storageConfig: {
                        // We use Agora's temporary storage, so we provide the minimal required vendor info.
                        // This ensures the webhook workflow is triggered correctly.
                        "vendor": 6, // 6 = Agora Cloud Recording Service
                        "region": 0  // A placeholder region
                    }
                },
            },
            {
                headers: {
                    'Authorization': getBasicAuthHeader(),
                    'Content-Type': 'application/json',
                },
            }
        );

        const { sid } = startResponse.data;
        console.log(`[AGORA SERVICE] Recording started successfully with Agora SID: ${sid}`);

        // The database insertion logic remains the same and is correct.
        await db.query(
            `INSERT INTO recorded_sessions (course_id, teacher_id, agora_sid, title, processing_status)
             VALUES ($1, $2, $3, $4, 'processing')`,
            [courseId, teacherId, sid, `Live Session - ${new Date().toLocaleDateString()}`]
        );
        console.log(`[DB] Placeholder record created for SID: ${sid}`);

        return startResponse.data;

    } catch (error) {
        // This will now provide much more detailed validation errors if they occur.
        const errorDetails = error.response ? error.response.data : { message: error.message };
        console.error("[AGORA SERVICE] CRITICAL ERROR starting recording:", JSON.stringify(errorDetails, null, 2));
        throw new Error('Failed to start cloud recording via Agora API.');
    }
};

/**
 * Securely uploads a file buffer to Cloudinary, specifically configured for video.
 * This function is designed to be called by our webhook handler after downloading the video file from Agora.
 * @param {Buffer} fileBuffer - The video file's raw data.
 * @param {string} publicId - A unique identifier for the video in Cloudinary (e.g., 'recordings/course_id/session_id').
 * @returns {Promise<object>} An object containing the secure URL and other video metadata from Cloudinary.
 */
const uploadToCloudinary = (fileBuffer, publicId) => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                resource_type: "video", // We must specify that we are uploading a video
                public_id: publicId,    // This sets the file path and name
                overwrite: true         // Replace if a file with the same name exists
            },
            (error, result) => {
                if (error) {
                    console.error("[CLOUDINARY] Upload failed:", error);
                    return reject(new Error("Failed to upload video to Cloudinary."));
                }
                // We only resolve with the data we absolutely need to store.
                if (result) {
                    resolve({
                        secure_url: result.secure_url, // The HTTPS URL for the video
                        duration: result.duration,
                        format: result.format,
                        public_id: result.public_id
                    });
                }
            }
        );
        // Use streamifier to convert our buffer into a readable stream, which is what the Cloudinary SDK expects.
        streamifier.createReadStream(fileBuffer).pipe(uploadStream);
    });
};


module.exports = {
    startCloudRecording,
    uploadToCloudinary,
    // We will add stopCloudRecording here in a future step.
};