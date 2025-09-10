/**
 * Trade Execution Controller
 * Handles the POST /api/trade/execute endpoint
 */

const tradeExecutionService = require('../services/trade_executionService');
const jwt = require('jsonwebtoken');

/**
 * Execute a trade (BUY or SELL)
 * POST /api/trade/execute
 */
const executeTrade = async (req, res) => {
  try {
    const userId = req.user.id; // From verifyToken middleware
    const { symbol, quantity, tradeType } = req.body;

    // Validation
    if (!symbol || !quantity || !tradeType) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: symbol, quantity, tradeType'
      });
    }

    if (!['BUY', 'SELL'].includes(tradeType.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: 'tradeType must be either BUY or SELL'
      });
    }

    if (quantity <= 0 || !Number.isInteger(quantity)) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be a positive integer'
      });
    }

    // Get current simulation date for accurate historical pricing
    const simulationDate = tradeExecutionService.getCurrentSimulationDate();

    console.log(`[TradeExecutionController] Executing ${tradeType} order: ${quantity} ${symbol} at simulation date ${simulationDate}`);

    // Execute the trade
    const result = await tradeExecutionService.executeTrade(
      userId,
      symbol.toUpperCase(),
      quantity,
      tradeType.toUpperCase(),
      simulationDate
    );

    if (result.success) {
      return res.status(201).json(result);
    } else {
      return res.status(400).json(result);
    }

  } catch (error) {
    console.error('[TradeExecutionController] Error executing trade:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during trade execution'
    });
  }
};

module.exports = {
  executeTrade
};