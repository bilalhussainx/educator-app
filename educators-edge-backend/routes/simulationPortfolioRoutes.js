/**
 * Simulation Portfolio Routes
 * 
 * API routes for historical trading simulation and portfolio management
 */

const express = require('express');
const router = express.Router();
const simulationPortfolioController = require('../controllers/simulationPortfolioController');

// Session management routes
router.post('/session', simulationPortfolioController.getOrCreateSession);
router.get('/sessions', simulationPortfolioController.getUserSessions);
router.delete('/session/:sessionId', simulationPortfolioController.closeSession);

// Portfolio routes
router.get('/portfolio/:sessionId', simulationPortfolioController.getPortfolioSummary);
router.put('/progress/:sessionId', simulationPortfolioController.updateProgress);

// Trading routes
router.post('/trade', simulationPortfolioController.executeTrade);

module.exports = router;