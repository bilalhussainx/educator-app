// src/routes/conceptRoutes.js
const express = require('express');
const router = express.Router();
const conceptController = require('../controllers/conceptController');
const { verifyToken } = require('../middleware/authMiddleware');

// @route   GET /api/concepts/search
// @desc    Search for concepts
// @access  Private (Teacher)
router.get('/search', verifyToken, conceptController.searchConcepts);

// @route   POST /api/concepts
// @desc    Create a new concept
// @access  Private (Teacher)
router.post('/', verifyToken, conceptController.createConcept);

module.exports = router;