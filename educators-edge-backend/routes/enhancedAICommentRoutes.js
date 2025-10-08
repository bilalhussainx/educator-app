/**
 * Routes for Enhanced AI Comment System
 */

const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const enhancedAICommentController = require('../controllers/enhancedAICommentController');

// Generate AI comments for a document
router.post('/generate', verifyToken, enhancedAICommentController.generateComments);

// Generate more comments (progressive generation)
router.post('/generate-more', verifyToken, enhancedAICommentController.generateMoreComments);

// Get available coaching prompts
router.get('/coaching-prompts', verifyToken, enhancedAICommentController.getCoachingPrompts);

// Record user feedback on a comment
router.post('/feedback', verifyToken, enhancedAICommentController.recordFeedback);

// Get user's learning patterns
router.get('/learning-patterns', verifyToken, enhancedAICommentController.getLearningPatterns);

// Get previous comments for a document
router.get('/previous-comments', verifyToken, enhancedAICommentController.getPreviousComments);

module.exports = router;
