/**
 * Essay Routes
 *
 * API endpoints for college essay generation
 */

const express = require('express');
const router = express.Router();
const essayController = require('../controllers/essay.controller');
const { verifyToken } = require('../middleware/authMiddleware');

/**
 * GET /api/essays/universities
 * Get list of supported universities (PUBLIC - no auth required)
 */
router.get('/universities', essayController.getUniversities);

// All other routes require authentication
router.use(verifyToken);

/**
 * POST /api/essays/generate
 * Generate a new college essay
 * Body: { prompt, university, studentProfile, wordCount }
 */
router.post('/generate', essayController.generate);

/**
 * GET /api/essays/stats
 * Get essay statistics for current user
 */
router.get('/stats', essayController.getStats);

/**
 * GET /api/essays/test-connection
 * Test Python bridge connection (for debugging)
 */
router.get('/test-connection', essayController.testConnection);

/**
 * GET /api/essays/:id
 * Get a specific essay by ID
 */
router.get('/:id', essayController.getEssay);

/**
 * GET /api/essays
 * Get all essays for current user
 */
router.get('/', essayController.getUserEssays);

/**
 * DELETE /api/essays/:id
 * Delete an essay
 */
router.delete('/:id', essayController.deleteEssay);

module.exports = router;
