// =================================================================
// FILE: routes/studentRoutes.js (UPDATED)
// =================================================================
const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { verifyToken } = require('../middleware/authMiddleware');

// GET /api/students/my-courses - Fetches all courses for the logged-in student
router.get('/my-courses', verifyToken, studentController.getEnrolledCourses);

// --- NEW: Route to get a single enrolled course by its ID ---
router.get('/my-courses/:courseId', verifyToken, studentController.getEnrolledCourseById);

module.exports = router;
