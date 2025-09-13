/**
 * =================================================================
 * FOLDER: routes/
 * FILE:   claudeCourseRoutes.js
 * =================================================================
 * DESCRIPTION: Routes for Claude API-powered course generation
 */

const express = require('express');
const router = express.Router();
const claudeCourseController = require('../controllers/claudeCourseController');
const { verifyToken } = require('../middleware/verifyTokenMiddleware');

// Generate specialized course using Claude API
router.post('/generate', verifyToken, claudeCourseController.generateSpecializedCourse);

// Enhance existing course with additional content
router.post('/enhance/:courseId', verifyToken, claudeCourseController.enhanceExistingCourse);

// Generate content for courses missing modules/lessons
router.post('/generate-missing-content', verifyToken, claudeCourseController.generateMissingContent);

// Get course generation statistics
router.get('/stats', claudeCourseController.getCourseGenerationStats);

module.exports = router;