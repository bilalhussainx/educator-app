/**
 * Gemini-Style Writing Assistant Routes
 */

const express = require('express');
const router = express.Router();
const geminiAssistantController = require('../controllers/geminiAssistantController');

// Handle quick actions (rewrite, shorten, elaborate, etc.)
router.post('/quick-action', geminiAssistantController.handleQuickAction);

// Generate smart suggestions
router.post('/smart-suggestions', geminiAssistantController.generateSmartSuggestions);

module.exports = router;
