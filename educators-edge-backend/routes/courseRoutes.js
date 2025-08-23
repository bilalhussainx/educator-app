// =================================================================
// FILE: routes/courseRoutes.js (UPDATED)
// =================================================================
const express = require('express');
const router = express.Router();
const courseController = require('../controllers/courseController');
const { verifyToken } = require('../middleware/authMiddleware');
const { isTeacher } = require('../middleware/roleMiddleware');

// Public / student-facing routes
router.get('/discover', verifyToken, courseController.getDiscoverableCourses);
router.get('/public/:courseId', verifyToken, courseController.getPublicCourseById);
// --- NEW: Route for a student to enroll in a course ---
router.post('/:courseId/enroll', verifyToken, courseController.enrollInCourse);


// Teacher-only routes
router.get('/', verifyToken, isTeacher, courseController.getAllCourses);
router.post('/', verifyToken, isTeacher, courseController.createCourse);
router.get('/:id', verifyToken, isTeacher, courseController.getCourseById);
router.patch('/:id/publish', verifyToken, isTeacher, courseController.updateCoursePublicationStatus);

module.exports = router;

// // =================================================================
// // FILE: routes/courseRoutes.js (UPDATED)
// // =================================================================
// const express = require('express');
// const router = express.Router();
// const courseController = require('../controllers/courseController');
// const { verifyToken } = require('../middleware/authMiddleware');
// const { isTeacher } = require('../middleware/roleMiddleware');

// // Route for students to discover public courses
// router.get('/discover', verifyToken, courseController.getDiscoverableCourses);

// // --- NEW: Route for students to view a public course landing page ---
// // This route is placed before the more generic '/:id' to ensure it's matched correctly.
// router.get('/public/:courseId', verifyToken, courseController.getPublicCourseById);

// // Fetches all courses for the logged-in teacher
// router.get('/', verifyToken, isTeacher, courseController.getAllCourses);

// // Creates a new course for the logged-in teacher
// router.post('/', verifyToken, isTeacher, courseController.createCourse);

// // Route to get a single course by its ID (for the teacher)
// router.get('/:id', verifyToken, isTeacher, courseController.getCourseById);

// // Route to update a course's publication status
// router.patch('/:id/publish', verifyToken, isTeacher, courseController.updateCoursePublicationStatus);

// module.exports = router;

// // =================================================================
// // FILE: routes/courseRoutes.js (UPDATED)
// // =================================================================
// const express = require('express');
// const router = express.Router();
// const courseController = require('../controllers/courseController');
// const { verifyToken } = require('../middleware/authMiddleware');
// const { isTeacher } = require('../middleware/roleMiddleware');

// // Route for students to discover public courses
// router.get('/discover', verifyToken, courseController.getDiscoverableCourses);

// // Fetches all courses for the logged-in teacher
// router.get('/', verifyToken, isTeacher, courseController.getAllCourses);

// // Creates a new course for the logged-in teacher
// router.post('/', verifyToken, isTeacher, courseController.createCourse);

// // Route to get a single course by its ID
// router.get('/:id', verifyToken, isTeacher, courseController.getCourseById);

// // --- NEW: Route to update a course's publication status ---
// router.patch('/:id/publish', verifyToken, isTeacher, courseController.updateCoursePublicationStatus);

// module.exports = router;


// // =================================================================
// // FILE: routes/courseRoutes.js (UPDATED)
// // =================================================================
// const express = require('express');
// const router = express.Router();
// const courseController = require('../controllers/courseController');
// const { verifyToken } = require('../middleware/authMiddleware');
// const { isTeacher } = require('../middleware/roleMiddleware');

// // GET /api/courses - Fetches all courses for the logged-in teacher
// router.get('/', verifyToken, isTeacher, courseController.getAllCourses);

// // POST /api/courses - Creates a new course for the logged-in teacher
// router.post('/', verifyToken, isTeacher, courseController.createCourse);

// // --- NEW: Route to get a single course by its ID ---
// router.get('/:id', verifyToken, isTeacher, courseController.getCourseById);

// module.exports = router;
// const express = require('express');
// const router = express.Router();
// const courseController = require('../controllers/courseController');
// const { verifyToken } = require('../middleware/authMiddleware');
// const { isTeacher } = require('../middleware/roleMiddleware');

// // GET /api/courses - Fetches all courses for the logged-in teacher
// router.get('/', verifyToken, isTeacher, courseController.getAllCourses);

// // POST /api/courses - Creates a new course for the logged-in teacher
// router.post('/', verifyToken, isTeacher, courseController.createCourse);

// module.exports = router;
