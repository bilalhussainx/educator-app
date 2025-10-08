/**
 * Comprehensive AI Writing Coach Routes
 */

const express = require('express');
const router = express.Router();
const comprehensiveAICoachController = require('../controllers/comprehensiveAICoachController');

// Perform comprehensive document analysis
router.post('/comprehensive-analysis', comprehensiveAICoachController.comprehensiveAnalysis);

// Get analysis history for a session
router.get('/history/:sessionId', comprehensiveAICoachController.getAnalysisHistory);

// Get AI coach capabilities
router.get('/capabilities', comprehensiveAICoachController.getCapabilities);

module.exports = router;
