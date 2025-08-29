
// // The PATCH route for a specific submission has been moved to submissionRoutes.js

// module.exports = router;
// =================================================================
// FILE: routes/lessonRoutes.js (FIXED)
// =================================================================
// DESCRIPTION: This version fixes the routing issue by making the
// URL parameter consistent across all routes.

const express = require('express');
const router = express.Router();
const lessonController = require('../controllers/lessonController');
const courseController = require('../controllers/courseController');
const { verifyToken } = require('../middleware/authMiddleware');
const { isTeacher } = require('../middleware/roleMiddleware');

// --- Lesson Routes ---
router.get('/', verifyToken, lessonController.getAllLessons);
router.post('/', verifyToken, isTeacher, lessonController.createLesson);
router.get('/:id', verifyToken, lessonController.getLessonById);


// NEW: Get the initial state for a student (saved progress, submission, or template)
router.get('/:lessonId/student-state', verifyToken, lessonController.getStudentLessonState);

// POST to save a student's progress on a lesson
router.post('/:lessonId/save-progress', verifyToken, lessonController.saveStudentProgress);


// --- Submission & Testing Routes ---
router.post('/:id/submit', verifyToken, lessonController.createSubmission);
router.get('/:id/submissions', verifyToken, isTeacher, lessonController.getLessonSubmissions);
router.get('/:id/mysubmission', verifyToken, lessonController.getStudentSubmissionForLesson);
router.get('/teacher/list', verifyToken, isTeacher, lessonController.getTeacherLessons);
router.get('/:lessonId/ascent-ide', verifyToken, lessonController.getAscentIdeData);
router.get('/:lessonId/solution', verifyToken, lessonController.getLessonSolution);
router.post('/add-to-course/:courseId', verifyToken, isTeacher, lessonController.addLessonToCourse);

// router.post('/:courseId/sort-with-ai', verifyToken, isTeacher, courseController.sortCourseLessonsWithAI);

// ...
router.post('/chapter', verifyToken, isTeacher, lessonController.createChapter);


// THIS IS THE FIX: The parameter is now ':id' to be consistent.
router.post('/:id/run-tests', verifyToken, lessonController.runLessonTests);

// --- Grading Route ---
router.patch('/submissions/:submissionId', verifyToken, isTeacher, lessonController.updateSubmission);
router.delete('/:id', verifyToken, isTeacher, lessonController.removeLessonFromCourse);


module.exports = router;


// /**
//  * @file lessonRoutes.js
//  * @description This version is cleaned up to only handle routes directly
//  * related to lessons. Submission-specific routes have been moved.
//  */
// const express = require('express');
// const router = express.Router();
// const lessonController = require('../controllers/lessonController');
// const { verifyToken } = require('../middleware/authMiddleware');
// const { isTeacher } = require('../middleware/roleMiddleware');

// // --- Lesson Routes ---
// router.get('/', verifyToken, lessonController.getAllLessons);
// // router.post('/', verifyToken, isTeacher, lessonController.createLesson);
// router.get('/:id', verifyToken, lessonController.getLessonById);

// // --- Submission & Testing Routes (related to a specific lesson) ---
// router.post('/:id/submit', verifyToken, lessonController.createSubmission);
// router.get('/:id/submissions', verifyToken, isTeacher, lessonController.getLessonSubmissions);
// router.get('/:id/mysubmission', verifyToken, lessonController.getStudentSubmissionForLesson);
// router.post('/:id/run-tests', verifyToken, lessonController.runLessonTests);

// // =================================================================
// // FILE: routes/lessonRoutes.js (CORRECTED)
// // =================================================================
// const express = require('express');
// const router = express.Router();
// const lessonController = require('../controllers/lessonController');
// const { verifyToken } = require('../middleware/authMiddleware');
// const { isTeacher } = require('../middleware/roleMiddleware');

// // --- Lesson Routes ---
// router.get('/', verifyToken, lessonController.getAllLessons);
// // router.post('/', verifyToken, isTeacher, lessonController.createLesson);
// router.get('/:id', verifyToken, lessonController.getLessonById);

// // --- Submission Routes ---
// router.post('/:id/submit', verifyToken, lessonController.createSubmission);
// router.get('/:id/submissions', verifyToken, isTeacher, lessonController.getLessonSubmissions);
// router.patch('/submissions/:submissionId', verifyToken, isTeacher, lessonController.updateSubmission);
// router.get('/:id/mysubmission', verifyToken, lessonController.getStudentSubmissionForLesson);

// router.post('/:lessonId/run-tests', verifyToken, lessonController.runLessonTests);

// module.exports = router;


// const express = require('express');
// const router = express.Router();
// const lessonController = require('../controllers/lessonController');
// const { verifyToken } = require('../middleware/authMiddleware');
// const { isTeacher } = require('../middleware/roleMiddleware');

// // --- Lesson Routes ---
// router.get('/', verifyToken, lessonController.getAllLessons);
// // router.post('/', verifyToken, isTeacher, lessonController.createLesson);
// router.get('/:id', verifyToken, lessonController.getLessonById);

// // --- Submission Routes ---
// router.post('/:id/submit', verifyToken, lessonController.createSubmission);
// router.get('/:id/submissions', verifyToken, isTeacher, lessonController.getLessonSubmissions);
// router.patch('/submissions/:submissionId', verifyToken, isTeacher, lessonController.updateSubmission);

// // NEW: Route for a student to get their own submission for a lesson.
// router.get('/:id/mysubmission', verifyToken, lessonController.getStudentSubmissionForLesson);


// module.exports = router;

// const express = require('express');
// const router = express.Router();
// const lessonController = require('../controllers/lessonController');
// const { verifyToken } = require('../middleware/authMiddleware');
// const { isTeacher } = require('../middleware/roleMiddleware');

// // --- Lesson Routes ---
// router.get('/', verifyToken, lessonController.getAllLessons);
// // router.post('/', verifyToken, isTeacher, lessonController.createLesson);
// router.get('/:id', verifyToken, lessonController.getLessonById);

// // --- Submission Routes ---
// router.post('/:id/submit', verifyToken, lessonController.createSubmission);
// router.get('/:id/submissions', verifyToken, isTeacher, lessonController.getLessonSubmissions);

// // NEW: Route for updating a submission with feedback/grade
// // We use a PATCH request because we are partially updating the submission resource.
// // The :submissionId allows us to target a specific submission.
// router.patch('/submissions/:submissionId', verifyToken, isTeacher, lessonController.updateSubmission);


// module.exports = router;

// // -----------------------------------------------------------------
// // FILE: routes/lessonRoutes.js (UPDATED)
// // -----------------------------------------------------------------
// const express = require('express');
// const router = express.Router();
// const lessonController = require('../controllers/lessonController');
// const { verifyToken } = require('../middleware/authMiddleware');
// // NEW: Import the new role-checking middleware.
// const { isTeacher } = require('../middleware/roleMiddleware');

// // GET all lessons is available to all authenticated users.
// router.get('/', verifyToken, lessonController.getAllLessons);

// // POST to create a new lesson now runs two middleware functions.
// // 1. `verifyToken` checks if the user is logged in.
// // 2. `isTeacher` checks if the logged-in user has the 'teacher' role.
// // The request will only proceed to `createLesson` if both checks pass.
// // router.post('/', verifyToken, isTeacher, lessonController.createLesson);

// router.get('/:id', verifyToken, lessonController.getLessonById);
// router.post('/:id/submit', verifyToken, lessonController.createSubmission);
// router.get('/:id/submissions', verifyToken, isTeacher, lessonController.getLessonSubmissions);

// module.exports = router;
// // const express = require('express');
// // const router = express.Router();
// // const lessonController = require('../controllers/lessonController');
// // const { verifyToken } = require('../middleware/authMiddleware');

// // // --- Lesson Routes ---
// // router.get('/', verifyToken, lessonController.getAllLessons);
// // router.post('/', verifyToken, lessonController.createLesson);
// // router.get('/:id', verifyToken, lessonController.getLessonById);

// // // --- Submission Routes ---
// // router.post('/:id/submit', verifyToken, lessonController.createSubmission);
// // router.get('/:id/submissions', verifyToken, lessonController.getLessonSubmissions);

// // module.exports = router;