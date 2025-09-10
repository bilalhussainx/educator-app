const express = require('express');
const router = express.Router();
const marketDataController = require('../controllers/marketDataController');

// Discovery endpoints
router.get('/most-active', marketDataController.getMostActive);
router.get('/top-gainers', marketDataController.getTopGainers);
router.get('/top-losers', marketDataController.getTopLosers);

// Quote endpoints
router.get('/quote/:symbol', marketDataController.getDetailedQuote);
router.get('/historical-candles/:symbol', marketDataController.getHistoricalCandles);

// Search endpoint
router.get('/search', marketDataController.searchSymbols);

module.exports = router;