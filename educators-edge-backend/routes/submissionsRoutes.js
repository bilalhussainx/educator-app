// =================================================================
// ELITE SUBMISSIONS & ECOSYSTEM TRACKING ROUTES
// =================================================================

const express = require('express');
const router = express.Router();
const SubmissionsController = require('../controllers/submissionsController');
const { verifyToken } = require('../middleware/authMiddleware');

// Apply authentication middleware to all routes
router.use(verifyToken);

// === CORE SUBMISSION ROUTES ===
router.post('/submit', SubmissionsController.submitSolution);
router.get('/history/:courseId/:moduleIndex/:lessonIndex', SubmissionsController.getSubmissionHistory);
router.get('/solved', SubmissionsController.getSolvedProblems);

// === PROGRESS & ANALYTICS ===
router.get('/progress', SubmissionsController.getUserProgress);
router.get('/ecosystem-profile', SubmissionsController.getEcosystemProfile);
router.get('/dashboard', SubmissionsController.getDashboard);

// === NAVIGATION & COURSE FLOW ===
router.get('/next-lesson/:courseId/:currentModuleIndex/:currentLessonIndex', SubmissionsController.getNextLesson);
router.get('/course-progress/:courseId', SubmissionsController.getCourseProgress);

// === SPARKS & ACHIEVEMENTS ===
router.get('/sparks', SubmissionsController.getSparksHistory);
router.get('/achievements', SubmissionsController.getUserAchievements);
router.post('/achievements/check', SubmissionsController.checkAndAwardAchievements);

// === SESSION MANAGEMENT ===
router.post('/sessions/book', SubmissionsController.bookSession);
router.get('/sessions/upcoming', SubmissionsController.getUpcomingSessions);
router.get('/sessions/history', SubmissionsController.getSessionHistory);
router.post('/sessions/:sessionId/rate', SubmissionsController.rateSession);
router.post('/sessions/:sessionId/complete', SubmissionsController.completeSession);

// === TEACHER FUNCTIONALITY ===
router.get('/teacher-stats', SubmissionsController.getTeacherStats);
router.get('/teacher-ratings', SubmissionsController.getTeacherRatings);
router.get('/students', SubmissionsController.getStudents);

// === LEADERBOARDS & RANKINGS ===
router.get('/leaderboards', SubmissionsController.getLeaderboards);
router.get('/leaderboards/:category', SubmissionsController.getCategoryLeaderboard);
router.post('/leaderboards/update', SubmissionsController.updateRankings);

// === TRADING INTEGRATION ===
router.post('/trading/update-score', SubmissionsController.updateTradingScore);
router.get('/trading/stats', SubmissionsController.getTradingStats);

module.exports = router;