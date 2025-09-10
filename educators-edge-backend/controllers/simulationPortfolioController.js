/**
 * Simulation Portfolio Controller
 * 
 * Handles API endpoints for historical trading simulation and portfolio management
 */

const simulationPortfolioService = require('../services/simulationPortfolioService');
const jwt = require('jsonwebtoken');

/**
 * Get or create simulation session for user
 */
const getOrCreateSession = async (req, res) => {
  try {
    const { historicalPeriod } = req.body;
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization token required' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    if (!historicalPeriod) {
      return res.status(400).json({ error: 'Historical period required' });
    }

    const session = await simulationPortfolioService.getOrCreateSimulationSession(userId, historicalPeriod);
    
    res.status(200).json({
      success: true,
      session
    });

  } catch (error) {
    console.error('[SimulationPortfolioController] Error in getOrCreateSession:', error);
    res.status(500).json({ 
      error: 'Failed to get simulation session',
      message: error.message 
    });
  }
};

/**
 * Get portfolio summary for simulation session
 */
const getPortfolioSummary = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization token required' });
    }

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID required' });
    }

    const portfolio = await simulationPortfolioService.getPortfolioSummary(sessionId);
    
    res.status(200).json({
      success: true,
      portfolio
    });

  } catch (error) {
    console.error('[SimulationPortfolioController] Error in getPortfolioSummary:', error);
    res.status(500).json({ 
      error: 'Failed to get portfolio summary',
      message: error.message 
    });
  }
};

/**
 * Execute simulated trade
 */
const executeTrade = async (req, res) => {
  try {
    const { sessionId, symbol, type, quantity, price, simulationDate } = req.body;
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization token required' });
    }

    if (!sessionId || !symbol || !type || !quantity || !price) {
      return res.status(400).json({ 
        error: 'Missing required fields: sessionId, symbol, type, quantity, price' 
      });
    }

    if (!['BUY', 'SELL'].includes(type)) {
      return res.status(400).json({ error: 'Trade type must be BUY or SELL' });
    }

    if (quantity <= 0 || price <= 0) {
      return res.status(400).json({ error: 'Quantity and price must be positive' });
    }

    const result = await simulationPortfolioService.executeTrade(
      sessionId, 
      symbol.toUpperCase(), 
      type, 
      quantity, 
      price, 
      simulationDate || new Date()
    );
    
    res.status(200).json({
      success: true,
      result
    });

  } catch (error) {
    console.error('[SimulationPortfolioController] Error in executeTrade:', error);
    
    // Handle specific error cases
    if (error.message.includes('Insufficient')) {
      return res.status(400).json({ 
        error: error.message 
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to execute trade',
      message: error.message 
    });
  }
};

/**
 * Get user's simulation sessions
 */
const getUserSessions = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization token required' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    const sessions = await simulationPortfolioService.getUserSimulationSessions(userId);
    
    res.status(200).json({
      success: true,
      sessions
    });

  } catch (error) {
    console.error('[SimulationPortfolioController] Error in getUserSessions:', error);
    res.status(500).json({ 
      error: 'Failed to get user sessions',
      message: error.message 
    });
  }
};

/**
 * Update simulation session progress
 */
const updateProgress = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { currentDate, portfolioValue, cashBalance } = req.body;
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization token required' });
    }

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID required' });
    }

    const session = await simulationPortfolioService.updateSimulationProgress(
      sessionId, 
      currentDate, 
      portfolioValue, 
      cashBalance
    );
    
    res.status(200).json({
      success: true,
      session
    });

  } catch (error) {
    console.error('[SimulationPortfolioController] Error in updateProgress:', error);
    res.status(500).json({ 
      error: 'Failed to update progress',
      message: error.message 
    });
  }
};

/**
 * Close simulation session
 */
const closeSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization token required' });
    }

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID required' });
    }

    await simulationPortfolioService.closeSimulationSession(sessionId);
    
    res.status(200).json({
      success: true,
      message: 'Session closed successfully'
    });

  } catch (error) {
    console.error('[SimulationPortfolioController] Error in closeSession:', error);
    res.status(500).json({ 
      error: 'Failed to close session',
      message: error.message 
    });
  }
};

module.exports = {
  getOrCreateSession,
  getPortfolioSummary,
  executeTrade,
  getUserSessions,
  updateProgress,
  closeSession
};