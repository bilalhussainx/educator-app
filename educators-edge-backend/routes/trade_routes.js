const express = require('express');
const router = express.Router();
const tradeController = require('../controllers/trade_portfolioController');
const tradeExecutionController = require('../controllers/tradeExecutionController');
const { verifyToken } = require('../middleware/authMiddleware');

router.get('/portfolio', verifyToken, tradeController.getPortfolio);

router.post('/orders/execute', verifyToken, tradeController.executeOrder);

// THE DEFINITIVE TRADE EXECUTION ENDPOINT
router.post('/execute', verifyToken, tradeExecutionController.executeTrade);

router.get('/market-data/:symbol', verifyToken, tradeController.getMarketData);

router.get('/market-data/by-date/:dateString', verifyToken, tradeController.getMarketDataByDate);

router.get('/simulation/status', verifyToken, tradeController.getSimulationStatus);

router.get('/market-data/historical/:symbol', verifyToken, tradeController.getHistoricalMarketData);

router.get('/leaderboard', verifyToken, tradeController.getLeaderboard);

router.get('/history', verifyToken, tradeController.getTradeHistory);

module.exports = router;