// =================================================================
// FILE: routes/stuckPointRoutes.js (UPDATED)
// =================================================================
// DESCRIPTION: This version adds a new POST route to handle the
// dismissal of stuck point notifications.

const express = require('express');
const router = express.Router();
const stuckPointController = require('../controllers/stuckPointController');
const { verifyToken } = require('../middleware/authMiddleware');
const { isTeacher } = require('../middleware/roleMiddleware');

// GET /api/stuck-points
// Returns an array of students who have been flagged as "stuck".
router.get('/', verifyToken, isTeacher, stuckPointController.getStuckPoints);

// --- NEW: POST /api/stuck-points/dismiss ---
// Marks a stuck point alert as acknowledged/dismissed.
router.post('/dismiss', verifyToken, isTeacher, stuckPointController.dismissStuckPoint);


module.exports = router;

// // =================================================================
// // FILE: routes/stuckPointRoutes.js (NEW)
// // =================================================================
// // DESCRIPTION: Defines the API endpoint for teachers to access
// // the "Stuck Point" detector data.
// // FILE: routes/stuckPointRoutes.js

// const express = require('express');
// const router = express.Router();
// const stuckPointController = require('../controllers/stuckPointController');
// const { verifyToken } = require('../middleware/authMiddleware');
// const { isTeacher } = require('../middleware/roleMiddleware');

// // Defines the GET route for /api/stuck-points/
// router.get('/', verifyToken, isTeacher, stuckPointController.getStuckPoints);

// // Make sure you are exporting the router directly
// module.exports = router; 