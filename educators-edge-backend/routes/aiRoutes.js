// -----------------------------------------------------------------
// FILE: routes/aiRoutes.js (ENHANCED WITH TEACHER SEARCH)
// -----------------------------------------------------------------
const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const aiSearchController = require('../controllers/aiSearchController');
const { verifyToken } = require('../middleware/authMiddleware');

// Original AI features
router.post('/get-hint', verifyToken, aiController.getHint);
router.post('/get-conceptual-feedback', verifyToken, aiController.getConceptualFeedback);

// Specialized AI agents for writing assistance
router.post('/agent/edit-suggestions', verifyToken, aiController.getEditSuggestions);
router.post('/agent/writing-feedback', verifyToken, aiController.getWritingFeedback);
router.post('/agent/contextual-comments', verifyToken, aiController.getContextualComments);

// AI-powered lesson search endpoints
router.post('/search/lessons', verifyToken, aiSearchController.intelligentLessonSearch);
router.post('/optimize/course-structure', verifyToken, aiSearchController.optimizeCourseStructure);
router.post('/discover/lessons', verifyToken, aiSearchController.semanticLessonDiscovery);
router.post('/suggest/chapters', verifyToken, aiSearchController.suggestChapters);
router.get('/analytics/search', verifyToken, aiSearchController.getSearchAnalytics);
router.post('/recommend/lessons', verifyToken, aiSearchController.getSmartRecommendations);
router.post('/create/optimized-course', verifyToken, aiSearchController.createOptimizedCourse);

// AI-powered teacher search endpoints
router.post('/search/teachers', verifyToken, aiSearchController.intelligentTeacherSearch);
router.post('/recommend/teachers', verifyToken, aiSearchController.getPersonalizedTeacherRecommendations);
router.get('/browse/teachers', verifyToken, aiSearchController.browseTeachersByTier);
router.get('/teacher/:teacherId', verifyToken, aiSearchController.getTeacherProfile);
router.get('/teacher/:teacherId/availability', verifyToken, aiSearchController.getTeacherAvailability);

// TALENT CRUCIBLE: Advanced AI-powered mentor discovery and optimization
router.post('/talent-crucible/discover', verifyToken, aiSearchController.talentCrucibleMentorDiscovery);
router.post('/talent-crucible/optimize-pathway', verifyToken, aiSearchController.optimizeLearningPathway);
router.post('/talent-crucible/predictive-matching', verifyToken, aiSearchController.predictiveSuccessMatching);
router.get('/talent-crucible/market-insights', verifyToken, aiSearchController.getMentorMarketInsights);
router.get('/analytics/advanced', verifyToken, aiSearchController.getAdvancedSearchAnalytics);

module.exports = router;



