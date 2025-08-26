// controllers/sessionController.js
const { RtcTokenBuilder, RtcRole } = require('agora-token');

exports.generateAgoraToken = (req, res) => {
    const { sessionId } = req.params;
    const userId = req.user.id; // Get the user's ID from your verifyToken middleware

    if (!sessionId) {
        return res.status(400).json({ error: 'Session ID is required.' });
    }

    const APP_ID = process.env.AGORA_APP_ID;
    const APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE;

    if (!APP_ID || !APP_CERTIFICATE) {
        console.error("Agora credentials are not set in environment variables.");
        return res.status(500).json({ error: 'Video service is not configured.' });
    }

    // A token is valid for 1 hour
    const expirationTimeInSeconds = 3600;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    // The 'channelName' is your session ID. The 'uid' is your user's ID.
    const token = RtcTokenBuilder.buildTokenWithUid(
        APP_ID,
        APP_CERTIFICATE,
        sessionId,
        userId,
        RtcRole.PUBLISHER, // Allows the user to publish their video/audio
        privilegeExpiredTs
    );

    res.json({ token, uid: userId, appId: APP_ID });
};