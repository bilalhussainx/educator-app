// -----------------------------------------------------------------
// FILE: routes/aiRoutes.js (NEW FILE)
// -----------------------------------------------------------------
const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { verifyToken } = require('../middleware/authMiddleware');

// POST /api/ai/get-hint - Get a hint for a piece of code
router.post('/get-hint', verifyToken, aiController.getHint);
router.post('/get-conceptual-feedback', verifyToken, aiController.getConceptualFeedback);
module.exports = router;



