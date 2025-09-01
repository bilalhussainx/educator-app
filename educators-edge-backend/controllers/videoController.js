// educators-edge-backend/src/controllers/videoController.js
const db = require('../db');

const getCourseRecordings = async (req, res) => {
    const { courseId } = req.params;
    try {
        const recordings = await db.query(
            "SELECT id, title, recorded_at FROM recorded_sessions WHERE course_id = $1 AND processing_status = 'completed' ORDER BY recorded_at DESC",
            [courseId]
        );
        res.status(200).json(recordings.rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch course recordings.' });
    }
};

const getVideoDetails = async (req, res) => {
    const { videoId } = req.params;
    try {
        const result = await db.query(
            "SELECT id, title, description, video_url, recorded_at FROM recorded_sessions WHERE id = $1 AND processing_status = 'completed'",
            [videoId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Video not found or is still processing.' });
        }
        res.status(200).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch video details.' });
    }
};

module.exports = { getCourseRecordings, getVideoDetails };