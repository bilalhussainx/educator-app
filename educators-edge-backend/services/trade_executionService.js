const { pool } = require('../db');
const tradePortfolioService = require('./trade_portfolioService');

class TradeExecutionService {

  /**
   * Execute a trade (BUY or SELL) - THE DEFINITIVE IMPLEMENTATION
   * @param {string} userId - The user's ID
   * @param {string} symbol - The stock symbol (e.g. 'AAPL')
   * @param {number} quantity - Number of shares
   * @param {string} tradeType - 'BUY' or 'SELL'
   * @param {string} simulationDate - The current simulation date (ISO string)
   * @returns {Object} { success: boolean, message?: string, data?: Object }
   */
  async executeTrade(userId, symbol, quantity, tradeType, simulationDate) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // 1. Get current market price for the symbol on the simulation date
      const priceQuery = `
        SELECT close_price, open_price, high_price, low_price, volume
        FROM market_data 
        WHERE symbol = $1 AND DATE(timestamp) = $2 AND timeframe = 'daily'
      `;
      
      const priceResult = await client.query(priceQuery, [symbol, simulationDate.split('T')[0]]);
      
      if (priceResult.rows.length === 0) {
        await client.query('ROLLBACK');
        console.log(`[TradeExecutionService] No market data for ${symbol} on ${simulationDate.split('T')[0]}`);
        return {
          success: false,
          message: `No market data available for ${symbol} on ${simulationDate.split('T')[0]}`
        };
      }

      const marketPrice = parseFloat(priceResult.rows[0].close_price);
      const tradeValue = marketPrice * quantity;

      // 2. Get user's current wallet balance
      const walletQuery = `
        SELECT trading_cash_balance
        FROM user_wallets 
        WHERE user_id = $1
      `;
      
      const walletResult = await client.query(walletQuery, [userId]);
      
      if (walletResult.rows.length === 0) {
        // Initialize wallet if it doesn't exist
        await client.query(`
          INSERT INTO user_wallets (user_id, trading_cash_balance)
          VALUES ($1, $2)
        `, [userId, 10000]); // Default starting balance
        
        var currentCash = 10000;
      } else {
        var currentCash = parseFloat(walletResult.rows[0].trading_cash_balance);
      }

      // 3. Get user's portfolio and current holdings for this symbol
      const portfolio = await tradePortfolioService.getOrCreateUserPortfolio(userId);
      
      const holdingsQuery = `
        SELECT quantity
        FROM portfolio_assets 
        WHERE portfolio_id = $1 AND asset_symbol = $2
      `;
      
      const holdingsResult = await client.query(holdingsQuery, [portfolio.id, symbol]);
      const currentHoldings = holdingsResult.rows.length > 0 ? parseInt(holdingsResult.rows[0].quantity) : 0;

      // 4. Perform validation based on trade type
      if (tradeType === 'BUY') {
        if (currentCash < tradeValue) {
          await client.query('ROLLBACK');
          return {
            success: false,
            message: `Insufficient cash. Need $${tradeValue.toFixed(2)}, have $${currentCash.toFixed(2)}`
          };
        }
      } else if (tradeType === 'SELL') {
        if (currentHoldings < quantity) {
          await client.query('ROLLBACK');
          return {
            success: false,
            message: `Insufficient shares. Need ${quantity}, have ${currentHoldings}`
          };
        }
      } else {
        await client.query('ROLLBACK');
        return {
          success: false,
          message: `Invalid trade type: ${tradeType}. Must be 'BUY' or 'SELL'`
        };
      }

      // 5. Update user's cash balance
      const newCashBalance = tradeType === 'BUY' ? 
        currentCash - tradeValue : 
        currentCash + tradeValue;

      await client.query(`
        UPDATE user_wallets 
        SET trading_cash_balance = $1
        WHERE user_id = $2
      `, [newCashBalance, userId]);

      // 6. Update portfolio assets
      const newHoldings = tradeType === 'BUY' ? 
        currentHoldings + quantity : 
        currentHoldings - quantity;

      if (newHoldings > 0) {
        // Update or insert the asset
        await client.query(`
          INSERT INTO portfolio_assets (portfolio_id, asset_symbol, quantity, average_cost_basis)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (portfolio_id, asset_symbol) 
          DO UPDATE SET 
            quantity = $3,
            average_cost_basis = (portfolio_assets.average_cost_basis * portfolio_assets.quantity + $4 * $3) / ($3 + portfolio_assets.quantity)
        `, [portfolio.id, symbol, newHoldings, marketPrice]);
      } else if (newHoldings === 0) {
        // Remove the asset if quantity becomes zero
        await client.query(`
          DELETE FROM portfolio_assets 
          WHERE portfolio_id = $1 AND asset_symbol = $2
        `, [portfolio.id, symbol]);
      }

      // 7. Create trade record
      await client.query(`
        INSERT INTO trades (portfolio_id, asset_symbol, quantity, fill_price, trade_type, executed_at)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [portfolio.id, symbol, quantity, marketPrice, tradeType, simulationDate]);

      await client.query('COMMIT');

      return {
        success: true,
        message: `${tradeType} order executed: ${quantity} shares of ${symbol} at $${marketPrice.toFixed(2)}`,
        data: {
          symbol,
          quantity,
          price: marketPrice,
          tradeType,
          tradeValue,
          newCashBalance,
          newHoldings,
          executionDate: simulationDate
        }
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('[TradeExecutionService] Error executing trade:', error);
      
      return {
        success: false,
        message: 'Trade execution failed due to system error'
      };
    } finally {
      client.release();
    }
  }

  /**
   * Get current simulation date from the trade simulation service
   */
  getCurrentSimulationDate() {
    const simulationService = require('./trade_simulationService');
    const currentDate = simulationService.currentDate.toISOString();
    console.log(`[TradeExecutionService] Current simulation date: ${currentDate}`);
    return currentDate;
  }
  async executeBuyOrder(userId, assetSymbol, quantity, fillPriceOverride = null) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const wallet = await tradePortfolioService.getOrCreateUserWallet(userId);
      const portfolio = await tradePortfolioService.getOrCreateUserPortfolio(userId);
      
      // Get market data for the symbol - use simulation price
      let fillPrice = fillPriceOverride;
      if (!fillPrice) {
        const marketData = await this.getMarketData(assetSymbol);
        fillPrice = marketData.price;
      }
      
      const totalCost = quantity * fillPrice;
      
      console.log(`[ExecuteBuyOrder] ${assetSymbol}: ${quantity} shares at $${fillPrice} = $${totalCost.toFixed(2)}`);
      
      if (wallet.trading_cash_balance < totalCost) {
        throw new Error(`Insufficient cash balance. Need $${totalCost.toFixed(2)}, have $${wallet.trading_cash_balance.toFixed(2)}`);
      }
      
      // Update cash balance
      await client.query(
        'UPDATE user_wallets SET trading_cash_balance = trading_cash_balance - $1 WHERE user_id = $2',
        [totalCost, userId]
      );
      
      // Record the trade
      const tradeResult = await client.query(`
        INSERT INTO trades (portfolio_id, asset_symbol, trade_type, quantity, fill_price)
        VALUES ($1, $2, 'BUY', $3, $4)
        RETURNING id, executed_at
      `, [portfolio.id, assetSymbol, quantity, fillPrice]);
      
      const tradeId = tradeResult.rows[0].id;
      const executedAt = tradeResult.rows[0].executed_at;
      
      // Update portfolio assets
      const existingAsset = await client.query(
        'SELECT * FROM portfolio_assets WHERE portfolio_id = $1 AND asset_symbol = $2',
        [portfolio.id, assetSymbol]
      );
      
      if (existingAsset.rows.length > 0) {
        const currentQuantity = parseFloat(existingAsset.rows[0].quantity);
        const currentCostBasis = parseFloat(existingAsset.rows[0].average_cost_basis);
        
        const newQuantity = currentQuantity + quantity;
        const newCostBasis = ((currentQuantity * currentCostBasis) + (quantity * fillPrice)) / newQuantity;
        
        await client.query(`
          UPDATE portfolio_assets 
          SET quantity = $1, average_cost_basis = $2, updated_at = CURRENT_TIMESTAMP
          WHERE portfolio_id = $3 AND asset_symbol = $4
        `, [newQuantity, newCostBasis, portfolio.id, assetSymbol]);
        
        console.log(`[ExecuteBuyOrder] Updated ${assetSymbol}: ${newQuantity} shares, avg cost $${newCostBasis.toFixed(2)}`);
      } else {
        await client.query(`
          INSERT INTO portfolio_assets (portfolio_id, asset_symbol, quantity, average_cost_basis)
          VALUES ($1, $2, $3, $4)
        `, [portfolio.id, assetSymbol, quantity, fillPrice]);
        
        console.log(`[ExecuteBuyOrder] New position ${assetSymbol}: ${quantity} shares at $${fillPrice}`);
      }
      
      await client.query('COMMIT');
      
      // Get updated wallet balance
      const updatedWallet = await pool.query(
        'SELECT trading_cash_balance FROM user_wallets WHERE user_id = $1',
        [userId]
      );
      
      return {
        success: true,
        tradeId: tradeId,
        executedAt: executedAt,
        symbol: assetSymbol,
        quantity: quantity,
        fillPrice: fillPrice,
        totalCost: totalCost,
        remainingCash: parseFloat(updatedWallet.rows[0].trading_cash_balance),
        message: `Successfully bought ${quantity} shares of ${assetSymbol} at $${fillPrice.toFixed(2)} per share`
      };
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error in executeBuyOrder:', error);
      throw error;
    } finally {
      client.release();
    }
  }
  
  async executeSellOrder(userId, assetSymbol, quantity, fillPrice) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const portfolio = await tradePortfolioService.getOrCreateUserPortfolio(userId);
      
      const existingAsset = await client.query(
        'SELECT * FROM portfolio_assets WHERE portfolio_id = $1 AND asset_symbol = $2',
        [portfolio.id, assetSymbol]
      );
      
      if (existingAsset.rows.length === 0) {
        throw new Error('Asset not found in portfolio');
      }
      
      const currentQuantity = parseFloat(existingAsset.rows[0].quantity);
      
      if (currentQuantity < quantity) {
        throw new Error('Insufficient shares to sell');
      }
      
      const totalProceeds = quantity * fillPrice;
      
      await client.query(
        'UPDATE user_wallets SET trading_cash_balance = trading_cash_balance + $1 WHERE user_id = $2',
        [totalProceeds, userId]
      );
      
      await client.query(`
        INSERT INTO trades (portfolio_id, asset_symbol, trade_type, quantity, fill_price)
        VALUES ($1, $2, 'SELL', $3, $4)
      `, [portfolio.id, assetSymbol, quantity, fillPrice]);
      
      const newQuantity = currentQuantity - quantity;
      
      if (newQuantity > 0) {
        await client.query(`
          UPDATE portfolio_assets 
          SET quantity = $1
          WHERE portfolio_id = $2 AND asset_symbol = $3
        `, [newQuantity, portfolio.id, assetSymbol]);
      } else {
        await client.query(
          'DELETE FROM portfolio_assets WHERE portfolio_id = $1 AND asset_symbol = $2',
          [portfolio.id, assetSymbol]
        );
      }
      
      await client.query('COMMIT');
      
      return {
        success: true,
        tradeId: 'generated-trade-id',
        message: `Successfully sold ${quantity} shares of ${assetSymbol} at $${fillPrice} per share`
      };
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error in executeSellOrder:', error);
      throw error;
    } finally {
      client.release();
    }
  }
  
  async getMarketData(symbol) {
    try {
      // Use seeded AlphaVantage data from database
      const result = await pool.query(`
        SELECT symbol, close_price, timestamp, volume
        FROM market_data 
        WHERE symbol = $1 AND timeframe = 'daily'
        ORDER BY timestamp DESC 
        LIMIT 2
      `, [symbol.toUpperCase()]);

      if (result.rows.length === 0) {
        console.log(`[TradeExecution] No market data found for ${symbol}, using fallback`);
        return {
          symbol: symbol.toUpperCase(),
          price: 150 + Math.random() * 50,
          change: (Math.random() - 0.5) * 10,
          changePercent: (Math.random() - 0.5) * 5,
          volume: Math.floor(Math.random() * 10000000) + 1000000,
          timestamp: new Date().toISOString()
        };
      }

      const currentData = result.rows[0];
      const previousData = result.rows[1];
      
      const currentPrice = parseFloat(currentData.close_price);
      const previousPrice = previousData ? parseFloat(previousData.close_price) : currentPrice;
      const change = currentPrice - previousPrice;
      const changePercent = previousPrice > 0 ? ((change / previousPrice) * 100) : 0;

      console.log(`[TradeExecution] Retrieved market data for ${symbol}: $${currentPrice} (${changePercent.toFixed(2)}%)`);

      return {
        symbol: symbol.toUpperCase(),
        price: currentPrice,
        change: parseFloat(change.toFixed(2)),
        changePercent: parseFloat(changePercent.toFixed(2)),
        volume: parseInt(currentData.volume) || 0,
        timestamp: currentData.timestamp
      };
    } catch (error) {
      console.error(`[TradeExecution] Error fetching market data for ${symbol}:`, error);
      // Fallback to simulated data
      return {
        symbol: symbol.toUpperCase(),
        price: 150 + Math.random() * 50,
        change: (Math.random() - 0.5) * 10,
        changePercent: (Math.random() - 0.5) * 5,
        volume: Math.floor(Math.random() * 10000000) + 1000000,
        timestamp: new Date().toISOString()
      };
    }
  }

  async getMarketDataByDate(dateString) {
    try {
      // Default symbols to track
      const DEFAULT_SYMBOLS = ['AAPL', 'GOOGL', 'MSFT', 'NVDA', 'TSLA', 'AMZN', 'META', 'NFLX'];
      
      console.log(`[TradeExecution] Fetching market data for date: ${dateString}`);
      
      const result = await pool.query(`
        SELECT 
          symbol, 
          close_price as price, 
          high_price - low_price as daily_range,
          volume,
          timestamp
        FROM market_data 
        WHERE DATE(timestamp) = $1 AND timeframe = 'daily'
        AND symbol = ANY($2)
        ORDER BY symbol
      `, [dateString, DEFAULT_SYMBOLS]);

      if (result.rows.length === 0) {
        console.log(`[TradeExecution] No market data found for ${dateString}, using fallback`);
        // Return fallback data for all symbols
        return DEFAULT_SYMBOLS.reduce((acc, symbol) => {
          acc[symbol] = {
            symbol,
            price: 150 + Math.random() * 50,
            change: (Math.random() - 0.5) * 10,
            changePercent: (Math.random() - 0.5) * 5,
            volume: Math.floor(Math.random() * 10000000) + 1000000,
            timestamp: `${dateString}T16:00:00.000Z`
          };
          return acc;
        }, {});
      }

      // Get previous day data for change calculation
      const previousDayResult = await pool.query(`
        SELECT symbol, close_price 
        FROM market_data 
        WHERE DATE(timestamp) < $1 AND timeframe = 'daily'
        AND symbol = ANY($2)
        AND timestamp = (
          SELECT MAX(timestamp) 
          FROM market_data m2 
          WHERE m2.symbol = market_data.symbol 
          AND DATE(m2.timestamp) < $1
          AND timeframe = 'daily'
        )
      `, [dateString, DEFAULT_SYMBOLS]);

      const previousPrices = {};
      previousDayResult.rows.forEach(row => {
        previousPrices[row.symbol] = parseFloat(row.close_price);
      });

      // Format data for frontend
      const marketData = {};
      result.rows.forEach(row => {
        const currentPrice = parseFloat(row.price);
        const previousPrice = previousPrices[row.symbol] || currentPrice;
        const change = currentPrice - previousPrice;
        const changePercent = previousPrice > 0 ? ((change / previousPrice) * 100) : 0;

        marketData[row.symbol] = {
          symbol: row.symbol,
          price: currentPrice,
          change: parseFloat(change.toFixed(2)),
          changePercent: parseFloat(changePercent.toFixed(2)),
          volume: parseInt(row.volume) || 0,
          timestamp: row.timestamp
        };
      });

      console.log(`[TradeExecution] Retrieved market data for ${result.rows.length} symbols on ${dateString}`);
      return marketData;

    } catch (error) {
      console.error(`[TradeExecution] Error fetching market data for ${dateString}:`, error);
      throw error;
    }
  }
  
  async calculatePScore(portfolioId, marketPrices = {}) {
    try {
      const portfolioValue = await tradePortfolioService.calculatePortfolioValue(portfolioId, marketPrices);
      const startingCapital = 10000;
      
      const totalReturn = portfolioValue.totalValue - startingCapital;
      const returnPercent = (totalReturn / startingCapital) * 100;
      
      const tradesResult = await pool.query(
        'SELECT COUNT(*) as trade_count FROM trades WHERE portfolio_id = $1',
        [portfolioId]
      );
      
      const tradeCount = parseInt(tradesResult.rows[0].trade_count);
      
      let riskAdjustment = 1;
      if (tradeCount > 100) riskAdjustment = 0.9;
      else if (tradeCount > 50) riskAdjustment = 0.95;
      else if (tradeCount < 5) riskAdjustment = 0.8;
      
      const pScore = Math.max(0, returnPercent * riskAdjustment);
      
      await tradePortfolioService.updatePScore(portfolioId, pScore);
      
      return pScore;
    } catch (error) {
      console.error('Error calculating P-Score:', error);
      throw error;
    }
  }
}

module.exports = new TradeExecutionService();