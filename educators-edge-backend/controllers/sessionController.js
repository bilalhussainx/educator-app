// FILE: controllers/sessionController.js

const { RtcTokenBuilder, RtcRole } = require('agora-token');

/**
 * Generates a temporary, secure Agora token for an authenticated user to join a specific channel.
 */
exports.generateAgoraToken = (req, res) => {
    try {
        // 1. Get the channel name from the URL parameter. This is your unique session ID.
        const channelName = req.params.sessionId;
        
        // 2. Get the user's ID from the JWT token. This is handled by your `verifyToken` middleware.
        // We use the user's database ID as their unique identifier (uid) in the video session.
        const uid = req.user.id; 
        
        // 3. Define the user's role in the channel. PUBLISHER allows them to send video and audio.
        const role = RtcRole.PUBLISHER;

        // 4. Get your secret Agora credentials from the server's environment variables.
        // These should be set in your .env file locally and in the Render dashboard for production.
        const appId = process.env.AGORA_APP_ID;
        const appCertificate = process.env.AGORA_APP_CERTIFICATE;

        // 5. Add a crucial check to ensure the server is configured correctly.
        if (!appId || !appCertificate) {
            console.error("CRITICAL: Agora App ID or Certificate is not configured in environment variables.");
            return res.status(500).json({ error: 'Video service is not configured on the server.' });
        }

        // 6. Set an expiration time for the token (e.g., 1 hour = 3600 seconds).
        const expirationTimeInSeconds = 3600;
        const currentTimestamp = Math.floor(Date.now() / 1000);
        const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

        console.log(`[Agora Token] Generating token for user ${uid} in channel ${channelName}`);

        // 7. Use the Agora library to build the secure token.
        const token = RtcTokenBuilder.buildTokenWithUid(
            appId,
            appCertificate,
            channelName,
            uid, // Use the user's database ID as the Agora UID
            role,
            privilegeExpiredTs
        );

        // 8. Send the token and other necessary info back to the frontend.
        // The Agora frontend SDK needs all three of these pieces to connect successfully.
        res.json({ 
            token: token,
            uid: uid,
            appId: appId 
        });

    } catch (error) {
        console.error("Error generating Agora token:", error);
        res.status(500).json({ error: 'Could not generate video session token.' });
    }
};