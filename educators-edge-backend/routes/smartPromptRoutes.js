/**
 * Routes for Smart Prompt AI Comments
 */

const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const smartPromptController = require('../controllers/smartPromptController');

// Generate inline comments from a smart writing prompt
router.post('/', verifyToken, smartPromptController.generateCommentsFromPrompt);

module.exports = router;
