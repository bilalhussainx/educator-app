const tradePortfolioService = require('../services/trade_portfolioService');
const tradeExecutionService = require('../services/trade_executionService');
const tradeSimulationService = require('../services/trade_simulationService');

class TradePortfolioController {
  async getPortfolio(req, res) {
    try {
      const userId = req.user.id;
      const tradingState = await tradePortfolioService.getUserTradingState(userId);
      
      const marketPrices = {};
      for (const asset of tradingState.portfolio.assets) {
        const marketData = await tradeExecutionService.getMarketData(asset.symbol);
        marketPrices[asset.symbol] = marketData.price;
      }
      
      const portfolioValue = await tradePortfolioService.calculatePortfolioValue(
        tradingState.portfolio.id, 
        marketPrices
      );
      
      const pScore = await tradeExecutionService.calculatePScore(
        tradingState.portfolio.id, 
        marketPrices
      );
      
      res.json({
        success: true,
        data: {
          ...tradingState,
          portfolio: {
            ...tradingState.portfolio,
            totalValue: portfolioValue.totalValue,
            unrealizedPnL: portfolioValue.unrealizedPnL,
            unrealizedPnLPercent: portfolioValue.unrealizedPnLPercent,
            p_score: pScore
          },
          marketPrices
        }
      });
    } catch (error) {
      console.error('Error in getPortfolio:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch portfolio data',
        error: error.message
      });
    }
  }
  
  async executeOrder(req, res) {
    try {
      const userId = req.user.id;
      const { assetSymbol, orderType, quantity, orderPrice } = req.body;
      
      if (!assetSymbol || !orderType || !quantity) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: assetSymbol, orderType, quantity'
        });
      }
      
      if (!['BUY', 'SELL'].includes(orderType.toUpperCase())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid order type. Must be BUY or SELL'
        });
      }
      
      if (quantity <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Quantity must be greater than 0'
        });
      }
      
      let fillPrice = orderPrice;
      if (!fillPrice) {
        const marketData = await tradeExecutionService.getMarketData(assetSymbol);
        fillPrice = marketData.price;
      }
      
      let result;
      if (orderType.toUpperCase() === 'BUY') {
        result = await tradeExecutionService.executeBuyOrder(userId, assetSymbol, quantity, fillPrice);
      } else {
        result = await tradeExecutionService.executeSellOrder(userId, assetSymbol, quantity, fillPrice);
      }
      
      res.json({
        success: true,
        data: result
      });
      
    } catch (error) {
      console.error('Error in executeOrder:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to execute order'
      });
    }
  }
  
  async getMarketData(req, res) {
    try {
      const { symbol } = req.params;
      
      if (!symbol) {
        return res.status(400).json({
          success: false,
          message: 'Symbol parameter is required'
        });
      }
      
      const marketData = await tradeExecutionService.getMarketData(symbol.toUpperCase());
      
      res.json({
        success: true,
        data: marketData
      });
    } catch (error) {
      console.error('Error in getMarketData:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch market data',
        error: error.message
      });
    }
  }

  async getMarketDataByDate(req, res) {
    try {
      const { dateString } = req.params;
      
      if (!dateString) {
        return res.status(400).json({
          success: false,
          message: 'Date parameter is required'
        });
      }

      // Validate date format
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date format. Use YYYY-MM-DD'
        });
      }

      const marketData = await tradeExecutionService.getMarketDataByDate(dateString);
      
      res.json({
        success: true,
        data: marketData
      });
    } catch (error) {
      console.error('Error in getMarketDataByDate:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch market data for date',
        error: error.message
      });
    }
  }
  
  async getLeaderboard(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 10;
      const leaderboard = await tradePortfolioService.getLeaderboard(limit);
      
      res.json({
        success: true,
        data: leaderboard
      });
    } catch (error) {
      console.error('Error in getLeaderboard:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch leaderboard',
        error: error.message
      });
    }
  }
  
  async getTradeHistory(req, res) {
    try {
      const userId = req.user.id;
      const portfolio = await tradePortfolioService.getOrCreateUserPortfolio(userId);
      
      const { pool } = require('../database/db');
      const result = await pool.query(`
        SELECT * FROM trades
        WHERE portfolio_id = $1
        ORDER BY executed_at DESC
        LIMIT 100
      `, [portfolio.id]);
      
      const trades = result.rows.map(trade => ({
        id: trade.id,
        symbol: trade.asset_symbol,
        type: trade.trade_type,
        quantity: parseFloat(trade.quantity),
        fillPrice: parseFloat(trade.fill_price),
        executedAt: trade.executed_at
      }));
      
      res.json({
        success: true,
        data: trades
      });
    } catch (error) {
      console.error('Error in getTradeHistory:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch trade history',
        error: error.message
      });
    }
  }

  async getSimulationStatus(req, res) {
    try {
      const status = tradeSimulationService.getState();
      
      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      console.error('Error in getSimulationStatus:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get simulation status',
        error: error.message
      });
    }
  }

  async getHistoricalMarketData(req, res) {
    try {
      const { symbol } = req.params;
      const { from, to, timeframe = 'daily' } = req.query;
      
      if (!symbol) {
        return res.status(400).json({
          success: false,
          message: 'Symbol parameter is required'
        });
      }

      // Set default date range if not provided
      const endDate = to || new Date().toISOString().split('T')[0];
      const startDate = from || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      console.log(`[HistoricalData] Fetching ${symbol} data from ${startDate} to ${endDate}`);

      const { pool } = require('../db');
      const result = await pool.query(`
        SELECT 
          symbol,
          DATE(timestamp) as date,
          open_price,
          high_price,
          low_price,
          close_price,
          volume,
          timestamp
        FROM market_data 
        WHERE symbol = $1 
        AND timeframe = $2
        AND DATE(timestamp) >= $3 
        AND DATE(timestamp) <= $4
        ORDER BY timestamp ASC
      `, [symbol.toUpperCase(), timeframe, startDate, endDate]);

      if (result.rows.length === 0) {
        return res.json({
          success: true,
          data: [],
          message: `No historical data found for ${symbol} between ${startDate} and ${endDate}`
        });
      }

      // Format data for charting libraries
      const formattedData = result.rows.map(row => ({
        date: row.date,
        timestamp: row.timestamp,
        open: parseFloat(row.open_price),
        high: parseFloat(row.high_price),
        low: parseFloat(row.low_price),
        close: parseFloat(row.close_price),
        volume: parseInt(row.volume)
      }));

      console.log(`[HistoricalData] Retrieved ${formattedData.length} records for ${symbol}`);

      res.json({
        success: true,
        data: {
          symbol: symbol.toUpperCase(),
          timeframe,
          startDate,
          endDate,
          dataPoints: formattedData.length,
          data: formattedData
        }
      });
    } catch (error) {
      console.error('Error in getHistoricalMarketData:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch historical market data',
        error: error.message
      });
    }
  }
}

module.exports = new TradePortfolioController();