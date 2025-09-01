// educators-edge-backend/src/routes/webhook_routes.js
// educators-edge-backend/src/routes/webhookRoutes.js
const express = require('express');
const router = express.Router();
const { handleAgoraRecordingReady } = require('../controllers/webhookController');

// This endpoint must be publicly accessible to receive notifications from Agora.
router.post('/recording-ready', handleAgoraRecordingReady);

module.exports = router;