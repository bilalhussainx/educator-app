// AI Bot Routes
const express = require('express');
const router = express.Router();
const aiBotController = require('../controllers/aiBotController');
const urgentSessionController = require('../controllers/urgentSessionController');
const { verifyToken } = require('../middleware/authMiddleware');

// Get all available AI bots for discovery
router.get('/', aiBotController.getAvailableBots);

// Start a new session with an AI bot
router.post('/session/start', verifyToken, aiBotController.startSession);

// Send message to AI bot
router.post('/session/message', verifyToken, aiBotController.sendMessage);

// Get conversation history
router.get('/session/:sessionId/history', verifyToken, aiBotController.getConversationHistory);

// Handle IDE assistance request
router.post('/ide/assist', verifyToken, aiBotController.handleIDEAssistance);

// Auto-accept mentor request (AI bot behavior)
router.post('/mentor/accept/:requestId', aiBotController.autoAcceptMentorRequest);

// End AI bot session
router.put('/session/:sessionId/end', verifyToken, aiBotController.endSession);

// Issue course completion certificate
router.post('/certificate/issue/:courseId', verifyToken, aiBotController.issueCertificate);

// Complete lesson and award points
router.post('/lesson/complete', verifyToken, aiBotController.completeLessonWithBot);

// Award points for session activities
router.post('/points/award', verifyToken, aiBotController.awardSessionPoints);

// Get AI bot analytics (admin only)
router.get('/:botId/analytics', verifyToken, aiBotController.getBotAnalytics);

// === URGENT SESSION ROUTES ===
// Test endpoint for debugging urgent session issues
router.get('/urgent-request/test', verifyToken, (req, res) => {
    res.json({
        success: true,
        message: 'Urgent request endpoint is working',
        user: req.user ? { id: req.user.id, username: req.user.username } : null,
        timestamp: new Date().toISOString()
    });
});

// Debug endpoint to check active sessions
router.get('/urgent-request/debug-active', verifyToken, urgentSessionController.getActiveUrgentSessions);

// Debug endpoint to cleanup stuck sessions
router.post('/urgent-request/cleanup', verifyToken, urgentSessionController.cleanupStuckSessions);

// Create urgent session request (auto-accepted by AI bot within 10 minutes)
router.post('/urgent-request', verifyToken, urgentSessionController.createUrgentRequest);

// Get active urgent sessions for current user
router.get('/urgent-sessions/active', verifyToken, urgentSessionController.getActiveUrgentSessions);

// Get scheduled session details
router.get('/urgent-sessions/:requestId', verifyToken, urgentSessionController.getScheduledSession);

// Join live session
router.get('/urgent-sessions/:sessionId/join', verifyToken, urgentSessionController.joinLiveSession);

// End urgent session
router.put('/urgent-sessions/:requestId/end', verifyToken, urgentSessionController.endUrgentSession);

// Get urgent session analytics (admin only)
router.get('/urgent-sessions/analytics', verifyToken, urgentSessionController.getUrgentSessionAnalytics);

module.exports = router;