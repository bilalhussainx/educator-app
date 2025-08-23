// -----------------------------------------------------------------
// FILE: routes/executeRoutes.js (VERIFY THIS FILE EXISTS)
// -----------------------------------------------------------------
const express = require('express');
const router = express.Router();
const executeController = require('../controllers/executeController');
const { verifyToken } = require('../middleware/authMiddleware');

// POST /api/execute - Run code in a secure sandbox
router.post('/', verifyToken, executeController.runCode);

module.exports = router;