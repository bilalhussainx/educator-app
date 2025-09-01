// educators-edge-backend/src/controllers/webhookController.js
const axios = require('axios');
const db = require('../db');
const { uploadToCloudinary } = require('../services/agoraService');

/**
 * @desc    Handles notifications from Agora when a recording is ready.
 * @route   POST /api/webhooks/recording-ready
 * @access  Public (Called by Agora)
 */
const handleAgoraRecordingReady = async (req, res) => {
    const { sid, fileList } = req.body;
    console.log(`[WEBHOOK] Received notification for Agora SID: ${sid}`);

    // Agora's webhooks can be noisy; we only care about the final MP4 file.
    // The file name format is usually SID_channelName.mp4 or just SID.mp4
    const videoFile = fileList.find(f => f.fileName.endsWith('.mp4'));

    if (!videoFile) {
        console.log(`[WEBHOOK] No MP4 file found for SID: ${sid}. Ignoring.`);
        return res.status(200).send('OK (No MP4)');
    }

    // Acknowledge Agora immediately to prevent retries.
    res.status(200).send('OK (Processing Started)');
    
    // --- Start asynchronous processing ---
    try {
        console.log(`[WEBHOOK] Downloading video from Agora: ${videoFile.fileName}`);
        
        // 1. Download the video file into a buffer.
        const downloadResponse = await axios.get(videoFile.sliceStartTime, {
            responseType: 'arraybuffer' // This is crucial for handling binary data.
        });
        const videoBuffer = Buffer.from(downloadResponse.data);

        console.log(`[WEBHOOK] Download complete. Uploading to Cloudinary...`);
        
        // 2. Upload the buffer to Cloudinary.
        const publicId = `recordings/${sid}/${videoFile.fileName}`;
        const cloudinaryResult = await uploadToCloudinary(videoBuffer, publicId);
        
        console.log(`[WEBHOOK] Upload complete. Cloudinary URL: ${cloudinaryResult.secure_url}`);

        // 3. Update our database with the permanent URL and set status to 'completed'.
        await db.query(
            "UPDATE recorded_sessions SET video_url = $1, processing_status = 'completed' WHERE agora_sid = $2",
            [cloudinaryResult.secure_url, sid]
        );
        
        console.log(`[WEBHOOK] Successfully processed and stored recording for SID: ${sid}`);

    } catch (error) {
        console.error(`[WEBHOOK] CRITICAL ERROR processing SID ${sid}:`, error);
        // If anything fails, update the status in our DB to 'failed'.
        await db.query(
            "UPDATE recorded_sessions SET processing_status = 'failed' WHERE agora_sid = $1",
            [sid]
        );
    }
};

module.exports = {
    handleAgoraRecordingReady
};