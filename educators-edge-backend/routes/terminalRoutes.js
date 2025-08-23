// -----------------------------------------------------------------
// FILE: routes/terminalRoutes.js (NEW FILE)
// -----------------------------------------------------------------
const express = require('express');
const router = express.Router();
// We will create the controller in the next step.
// const terminalController = require('../controllers/terminalController');
const { verifyToken } = require('../middleware/authMiddleware');

// This is a placeholder for now. In a real app, you might have routes
// to create or manage terminal sessions via HTTP, but we will handle
// creation directly via the WebSocket connection for simplicity.
router.get('/', verifyToken, (req, res) => {
    res.send('Terminal service is active.');
});

module.exports = router;