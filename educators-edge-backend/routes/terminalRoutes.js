// =================================================================
// FILE: routes/terminalRoutes.js
// =================================================================
// DESCRIPTION: REST API routes for Docker-based terminal functionality

const express = require('express');
const router = express.Router();
const terminalController = require('../controllers/terminalController');
const { verifyToken } = require('../middleware/authMiddleware');

// All terminal routes require authentication
router.use(verifyToken);

// Session management routes
router.post('/session', terminalController.createSession);
router.get('/session/:sessionId/status', terminalController.getSessionStatus);
router.get('/sessions', terminalController.listSessions);
router.delete('/session/:sessionId', terminalController.terminateSession);

// Code execution routes
router.post('/execute', terminalController.executeCode);
router.post('/input', terminalController.sendInput);
router.post('/quick-execute', terminalController.quickExecute);
router.post('/leetcode-tests', terminalController.executeLeetCodeTests);
router.post('/execute-code-direct', terminalController.executeCodeDirect);

// Health check
router.get('/health', terminalController.healthCheck);

module.exports = router;