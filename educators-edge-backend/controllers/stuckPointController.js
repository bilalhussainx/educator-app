// =================================================================
// FILE: controllers/stuckPointController.js (UPDATED)
// =================================================================
// DESCRIPTION: This version adds a new function to handle dismissing
// a "stuck point" alert by deleting the relevant failed test runs.

const db = require('../db');
const { findStuckPoints } = require('../services/stuckPointService');

/**
 * Gets a list of students who are currently stuck.
 */
exports.getStuckPoints = async (req, res) => {
    try {
        const teacherId = req.user.id;
        if (!teacherId) {
            return res.status(403).json({ error: 'User not authorized or token is missing user ID.' });
        }

        const stuckPoints = await findStuckPoints(teacherId);
        res.json(stuckPoints);

    } catch (err) {
        console.error('Server error in getStuckPoints:', err.message);
        res.status(500).json({ error: 'An internal server error occurred.' }); 
    }
};

/**
 * --- NEW: Dismisses a stuck point notification ---
 * This function deletes the failed test runs for a specific student
 * and lesson, effectively clearing the alert.
 */
exports.dismissStuckPoint = async (req, res) => {
    const { studentId, lessonId } = req.body;
    const teacherId = req.user.id; // Get the teacher from the auth token

    if (!studentId || !lessonId) {
        return res.status(400).json({ error: 'studentId and lessonId are required.' });
    }

    try {
        const query = `
            INSERT INTO stuck_point_dismissals (teacher_id, student_id, lesson_id)
            VALUES ($1, $2, $3)
            ON CONFLICT (teacher_id, student_id, lesson_id) 
            DO UPDATE SET dismissed_at = CURRENT_TIMESTAMP;
        `;

        await db.query(query, [teacherId, studentId, lessonId]);

        console.log(`Dismissal logged for student ${studentId} on lesson ${lessonId} by teacher ${teacherId}`);
        res.status(204).send();

    } catch (err) {
        console.error('Error dismissing stuck point:', err.message);
        res.status(500).json({ error: 'Failed to dismiss stuck point.' });
    }
};

// exports.dismissStuckPoint = async (req, res) => {
//     const { studentId, lessonId } = req.body;

//     // Basic validation
//     if (!studentId || !lessonId) {
//         return res.status(400).json({ error: 'studentId and lessonId are required.' });
//     }

//     try {
//         // This query removes the records that caused the notification.
//         const query = `
//             DELETE FROM test_runs
//             WHERE student_id::TEXT = $1
//             AND lesson_id::TEXT = $2
//             AND success = FALSE;
//         `;

//         await db.query(query, [studentId, lessonId]);

//         console.log(`Dismissed stuck point for student ${studentId} on lesson ${lessonId}`);
//         // Send a success response with no content.
//         res.status(204).send();

//     } catch (err) {
//         console.error('Error dismissing stuck point:', err.message);
//         res.status(500).json({ error: 'Failed to dismiss stuck point.' });
//     }
// };

// // =================================================================
// // FILE: controllers/stuckPointController.js (NEW)
// // =================================================================
// // DESCRIPTION: This controller handles API requests related to
// // finding and displaying student "stuck points" to teachers.

// const { findStuckPoints } = require('../services/stuckPointService');


// exports.getStuckPoints = async (req, res) => {
//     try {
//         const teacherId = req.user.id;
//         if (!teacherId) {
//             return res.status(403).json({ error: 'User not authorized or token is missing user ID.' });
//         }

//         const stuckPoints = await findStuckPoints(teacherId);
//         res.json(stuckPoints);

//     } catch (err) {
//         console.error('Server error in getStuckPoints:', err.message);
//         // CORRECTED LINE
//         res.status(500).json({ error: 'An internal server error occurred.' }); 
//     }
// };