const { Liveblocks } = require("@liveblocks/node");
const liveblocks = new Liveblocks({ secret: process.env.LIVEBLOCKS_SECRET_KEY });

const authorizeLiveblocks = async (req, res) => {
    const user = req.user;
    if (!user || !user.id) return res.status(403).json({ error: "Not authenticated." });

    // Get the room from the request body
    const { room } = req.body;

    // Debug logging
    console.log('🔄 Liveblocks Auth Request:', {
        userId: user.id,
        username: user.username,
        userRole: user.role || 'student',
        requestedRoom: room,
        timestamp: new Date().toISOString()
    });

    // Determine user role and permissions
    const userRole = user.role || 'student';
    const permissions = {
        canEdit: true, // Both teachers and students can edit in collaborative sessions
        canComment: true, // Everyone can comment
    };

    const userInfo = {
        name: user.username,
        picture: user.avatarUrl,
        role: userRole,
        permissions
    };

    try {
        // Grant access to the specific room for collaborative sessions
        const session = liveblocks.prepareSession(user.id.toString(), {
            userInfo
        });

        // Grant access based on user role
        if (userRole === 'teacher') {
            session.allow(room || '*', session.FULL_ACCESS);
        } else {
            // Students also get full access in live sessions
            session.allow(room || '*', session.FULL_ACCESS);
        }

        console.log('🔄 Liveblocks prepareSession Request:', {
            userId: user.id.toString(),
            userRole,
            room,
            userInfo
        });

        const { status, body } = await session.authorize();

        console.log('✅ Liveblocks prepareSession Response:', {
            status,
            bodyType: typeof body,
            bodyKeys: Object.keys(body || {}),
            body: body
        });

        return res.status(status).send(body);
    } catch (error) {
        console.error("❌ Liveblocks auth error:", error);
        console.error("❌ Error details:", {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
        return res.status(500).json({ error: "Collaboration service auth failed." });
    }
};
module.exports = { authorizeLiveblocks };