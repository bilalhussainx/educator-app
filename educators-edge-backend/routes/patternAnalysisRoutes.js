const express = require('express');
const { analyzePatterns } = require('../controllers/patternAnalysisController');

const router = express.Router();

/**
 * Pattern Analysis Routes
 * AI-powered candlestick pattern recognition
 */

// POST /api/trade/analysis/patterns/:symbol
// Analyzes OHLC data for candlestick patterns using Gemini AI
router.post('/patterns/:symbol', analyzePatterns);

module.exports = router;