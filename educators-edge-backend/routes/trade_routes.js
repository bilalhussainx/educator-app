const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const { getMyPortfolio } = require('../controllers/trade_portfolioController');

// All routes in this file are protected and will have access to req.user
router.use(verifyToken);

// Route to get the logged-in user's portfolio
router.get('/portfolio', getMyPortfolio);

// We will add routes for executing trades (e.g., POST /trades/execute) here in the future.

module.exports = router;