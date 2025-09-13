// FILE: controllers/sessionController.js

const { RtcTokenBuilder, RtcRole } = require('agora-token');

/**
 * Generates a temporary, secure Agora token for an authenticated user to join a specific channel.
 */
exports.generateAgoraToken = async (req, res) => {
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

        // 8. Get session details from database
        const db = require('../db');
        let sessionDetails = null;
        
        try {
            const sessionQuery = await db.query(`
                SELECT sr.*, 
                       requester.username as student_username,
                       requester_profile.display_name as student_display_name,
                       mentor.username as mentor_username,
                       mentor_profile.display_name as mentor_display_name
                FROM session_requests sr
                LEFT JOIN users requester ON sr.requester_id = requester.id
                LEFT JOIN user_profiles requester_profile ON requester.id = requester_profile.user_id
                LEFT JOIN users mentor ON sr.mentor_id = mentor.id
                LEFT JOIN user_profiles mentor_profile ON mentor.id = mentor_profile.user_id
                WHERE sr.id = $1
            `, [channelName]);
            
            if (sessionQuery.rows.length > 0) {
                sessionDetails = sessionQuery.rows[0];
            }
        } catch (dbError) {
            console.error('Error fetching session details:', dbError);
        }

        // 9. Send the token and session info back to the frontend.
        res.json({ 
            success: true,
            token: token,
            uid: uid,
            appId: appId,
            channelName: channelName,
            session: sessionDetails
        });

    } catch (error) {
        console.error("Error generating Agora token:", error);
        res.status(500).json({ error: 'Could not generate video session token.' });
    }
};