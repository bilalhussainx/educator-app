// =================================================================
// FILE: routes/enhancedCourseRoutes.js
// =================================================================
// Routes for AI-enhanced courses
const express = require('express');
const router = express.Router();
const enhancedCourseController = require('../controllers/enhancedCourseController');
const newEnhancedCourseController = require('../controllers/newEnhancedCourseController');
const { verifyToken } = require('../middleware/authMiddleware');
const { isTeacher } = require('../middleware/roleMiddleware');

// Public / student-facing routes
router.get('/discover', verifyToken, newEnhancedCourseController.getDiscoverableEnhancedCourses);
router.get('/public/:courseId', verifyToken, newEnhancedCourseController.getEnhancedCourseDetails);
router.post('/:courseId/enroll', verifyToken, newEnhancedCourseController.enrollInEnhancedCourse);
router.get('/:courseId/lessons', verifyToken, newEnhancedCourseController.getEnhancedCourseLessons);
router.post('/:courseId/run-tests', verifyToken, newEnhancedCourseController.runEnhancedCourseTests);
router.post('/:courseId/submit', verifyToken, newEnhancedCourseController.submitEnhancedCourseSolution);
router.get('/:courseId/solution', verifyToken, newEnhancedCourseController.getEnhancedCourseLessonSolution);
router.get('/:courseId/enrollment-status', verifyToken, enhancedCourseController.checkEnhancedCourseEnrollment);

// Teacher-only routes
router.get('/', verifyToken, isTeacher, enhancedCourseController.getTeacherEnhancedCourses);
router.post('/generate', verifyToken, isTeacher, enhancedCourseController.createEnhancedCourse);
router.patch('/:id/publish', verifyToken, isTeacher, enhancedCourseController.updateEnhancedCoursePublicationStatus);

// LeetCode courses route (accessible to all authenticated users)
router.get('/leetcode', verifyToken, async (req, res) => {
    try {
        const pool = require('../db');
        
        const query = `
            SELECT id, title, description, difficulty_level, estimated_duration, 
                   created_at, course_type, is_published
            FROM enhanced_courses 
            WHERE course_type = 'leetcode_patterns' 
            ORDER BY created_at DESC
        `;
        
        const result = await pool.query(query);
        res.json(result.rows);
        
    } catch (error) {
        console.error('Error fetching LeetCode courses:', error);
        res.status(500).json({ error: 'Failed to fetch LeetCode courses' });
    }
});

module.exports = router;