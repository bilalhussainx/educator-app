const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware'); // Correctly import your middleware
const db = require('../db'); 
const { getActiveSessions } = require('../services/sessionStore');
const sessionController = require('../controllers/sessionController');


// @route   GET api/sessions/active
// @desc    Get active sessions for courses a student is enrolled in
// @access  Private (Protected by verifyToken)

router.get('/active', verifyToken, async (req, res) => {
    // Because of the verifyToken middleware, we are guaranteed to have req.user here.
    if (req.user.role !== 'student') {
        // Only students need to see active session notifications.
        // Return an empty array for teachers or other roles.
        return res.json([]); 
    }

    try {
        const allActiveSessions = getActiveSessions();
        if (allActiveSessions.length === 0) {
            return res.json([]);
        }

        // Get the list of course IDs the student is enrolled in from the database
        const studentCoursesResult = await db.query(
            'SELECT course_id FROM enrollments WHERE student_id = $1',
            [req.user.id]
        );
        const enrolledCourseIds = new Set(studentCoursesResult.rows.map(row => row.course_id));
        
        // Also allow students to see general sessions that might not be tied to a specific course
        enrolledCourseIds.add('default_course');

        // Filter the globally active sessions to find ones relevant to this student
        const relevantSessions = allActiveSessions.filter(session =>
            enrolledCourseIds.has(session.courseId)
        );

        res.json(relevantSessions);

    } catch (err) {
        console.error("Error fetching active sessions:", err.message);
        res.status(500).send('Server Error');
    }
});

router.get('/:sessionId/generate-token', verifyToken, sessionController.generateAgoraToken);


module.exports = router;