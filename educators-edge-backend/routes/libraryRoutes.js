// routes/libraryRoutes.js
const express = require('express');
const router = express.Router();
const libraryController = require('../controllers/libraryController');
const { verifyToken } = require('../middleware/authMiddleware');
const { isTeacher } = require('../middleware/roleMiddleware');

// Route for searching the ingested_lessons library
router.get('/search', verifyToken, isTeacher, libraryController.searchIngestedLessons);
router.post('/add-to-course/:courseId', verifyToken, isTeacher, lessonController.addLessonToCourse);

// AI Sorter for the course structure for teachers to make courses
router.post('/:id/sort-with-ai', verifyToken, isTeacher, courseController.sortCourseLessonsWithAI);

module.exports = router;