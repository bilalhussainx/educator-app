const { Liveblocks } = require("@liveblocks/node");
const liveblocks = new Liveblocks({ secret: process.env.LIVEBLOCKS_SECRET_KEY });

const authorizeLiveblocks = async (req, res) => {
    const user = req.user;
    if (!user || !user.id) return res.status(403).json({ error: "Not authenticated." });
    const userInfo = { name: user.username, picture: user.avatarUrl };
    try {
        const { status, body } = await liveblocks.identifyUser(
            { userId: user.id, groupIds: [user.role] }, { userInfo }
        );
        return res.status(status).send(body);
    } catch (error) {
        console.error("Liveblocks auth error:", error);
        return res.status(500).json({ error: "Collaboration service auth failed." });
    }
};
module.exports = { authorizeLiveblocks };