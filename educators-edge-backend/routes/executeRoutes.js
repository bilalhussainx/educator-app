// =================================================================
// FILE: routes/executeRoutes.js
// =================================================================
// DESCRIPTION: Enhanced code execution routes with Docker support

const express = require('express');
const router = express.Router();
const executeController = require('../controllers/executeController');
const terminalController = require('../controllers/terminalController');
const { verifyToken } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(verifyToken);

// Legacy code execution (QuickJS + external API)
router.post('/legacy', executeController.runCode);

// New Docker-based execution routes
router.post('/', terminalController.quickExecute);
router.post('/sandbox', terminalController.executeCode);

module.exports = router;