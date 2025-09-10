/**
 * Simulation Portfolio Service
 * 
 * This service connects user wallets with historical trading simulation,
 * enabling users to practice trading with virtual money while tracking performance.
 */

const db = require('../db');
const tradePortfolioService = require('./trade_portfolioService');

class SimulationPortfolioService {
  constructor() {
    console.log('[SimulationPortfolio] Service initialized');
  }

  /**
   * Get or create a simulation session for a user
   */
  async getOrCreateSimulationSession(userId, historicalPeriod) {
    try {
      console.log(`[SimulationPortfolio] Getting session for user ${userId}, period: ${historicalPeriod}`);

      // First check if user has an active session for this period
      let result = await db.query(`
        SELECT * FROM simulation_sessions 
        WHERE user_id = $1 AND historical_period = $2 AND is_active = true
        ORDER BY created_at DESC LIMIT 1
      `, [userId, historicalPeriod]);

      if (result.rows.length > 0) {
        console.log(`[SimulationPortfolio] Found existing session: ${result.rows[0].id}`);
        return result.rows[0];
      }

      // Create new simulation session
      const periodInfo = this.getHistoricalPeriodInfo(historicalPeriod);
      if (!periodInfo) {
        throw new Error(`Unknown historical period: ${historicalPeriod}`);
      }

      // Get user's wallet to determine starting balance
      const wallet = await tradePortfolioService.getOrCreateUserWallet(userId);
      const startingBalance = parseFloat(wallet.trading_cash_balance || 10000);

      result = await db.query(`
        INSERT INTO simulation_sessions (
          user_id, session_name, historical_period, start_date, current_date, end_date,
          portfolio_value, cash_balance, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
        RETURNING *
      `, [
        userId,
        `${periodInfo.name} Simulation`,
        historicalPeriod,
        periodInfo.startDate,
        periodInfo.defaultStart,
        periodInfo.endDate,
        startingBalance,
        startingBalance
      ]);

      console.log(`[SimulationPortfolio] Created new session: ${result.rows[0].id}`);
      return result.rows[0];

    } catch (error) {
      console.error('[SimulationPortfolio] Error in getOrCreateSimulationSession:', error);
      throw error;
    }
  }

  /**
   * Update simulation session progress
   */
  async updateSimulationProgress(sessionId, currentDate, portfolioValue, cashBalance) {
    try {
      const result = await db.query(`
        UPDATE simulation_sessions 
        SET current_date = $1, portfolio_value = $2, cash_balance = $3, updated_at = CURRENT_TIMESTAMP
        WHERE id = $4
        RETURNING *
      `, [currentDate, portfolioValue, cashBalance, sessionId]);

      return result.rows[0];
    } catch (error) {
      console.error('[SimulationPortfolio] Error updating simulation progress:', error);
      throw error;
    }
  }

  /**
   * Execute a simulated trade
   */
  async executeTrade(sessionId, symbol, type, quantity, price, simulationDate) {
    try {
      console.log(`[SimulationPortfolio] Executing ${type} trade: ${quantity} ${symbol} @ $${price}`);

      const session = await this.getSimulationSession(sessionId);
      if (!session) {
        throw new Error('Simulation session not found');
      }

      const totalAmount = quantity * price;
      const commission = Math.max(0.99, totalAmount * 0.001); // $0.99 min or 0.1%

      // Start transaction
      await db.query('BEGIN');

      try {
        if (type === 'BUY') {
          // Check if user has enough cash
          if (session.cash_balance < totalAmount + commission) {
            throw new Error('Insufficient cash balance');
          }

          // Update cash balance
          await db.query(`
            UPDATE simulation_sessions 
            SET cash_balance = cash_balance - $1
            WHERE id = $2
          `, [totalAmount + commission, sessionId]);

          // Add or update holding
          await this.addOrUpdateHolding(sessionId, symbol, quantity, price);

        } else if (type === 'SELL') {
          // Check if user has enough shares
          const holding = await this.getHolding(sessionId, symbol);
          if (!holding || holding.quantity < quantity) {
            throw new Error('Insufficient shares to sell');
          }

          // Update cash balance
          await db.query(`
            UPDATE simulation_sessions 
            SET cash_balance = cash_balance + $1
            WHERE id = $2
          `, [totalAmount - commission, sessionId]);

          // Reduce or remove holding
          await this.reduceHolding(sessionId, symbol, quantity);
        }

        // Record transaction
        await db.query(`
          INSERT INTO simulation_transactions (
            session_id, symbol, transaction_type, quantity, price, total_amount, commission,
            transaction_date, simulation_date
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, $8)
        `, [sessionId, symbol, type, quantity, price, totalAmount, commission, simulationDate]);

        await db.query('COMMIT');

        // Update portfolio value
        await this.updatePortfolioValue(sessionId);

        console.log(`[SimulationPortfolio] Trade executed successfully`);
        return { success: true, message: `${type} order executed: ${quantity} ${symbol} @ $${price}` };

      } catch (error) {
        await db.query('ROLLBACK');
        throw error;
      }

    } catch (error) {
      console.error('[SimulationPortfolio] Error executing trade:', error);
      throw error;
    }
  }

  /**
   * Get current portfolio summary
   */
  async getPortfolioSummary(sessionId) {
    try {
      const session = await this.getSimulationSession(sessionId);
      if (!session) {
        throw new Error('Simulation session not found');
      }

      // Get all holdings
      const holdingsResult = await db.query(`
        SELECT * FROM simulation_holdings 
        WHERE session_id = $1 AND quantity > 0
        ORDER BY symbol
      `, [sessionId]);

      // Get recent transactions
      const transactionsResult = await db.query(`
        SELECT * FROM simulation_transactions 
        WHERE session_id = $1 
        ORDER BY created_at DESC 
        LIMIT 10
      `, [sessionId]);

      // Calculate performance metrics
      const totalInvestment = session.portfolio_value - session.cash_balance;
      const initialBalance = 10000; // Default starting balance
      const totalReturn = session.portfolio_value - initialBalance;
      const totalReturnPercent = (totalReturn / initialBalance) * 100;

      return {
        session: {
          id: session.id,
          period: session.historical_period,
          currentDate: session.current_date,
          startDate: session.start_date,
          endDate: session.end_date
        },
        balance: {
          cash: parseFloat(session.cash_balance),
          totalValue: parseFloat(session.portfolio_value),
          invested: totalInvestment,
          totalReturn,
          totalReturnPercent
        },
        holdings: holdingsResult.rows.map(h => ({
          symbol: h.symbol,
          quantity: parseInt(h.quantity),
          avgCost: parseFloat(h.average_cost),
          currentPrice: parseFloat(h.current_price || h.average_cost),
          marketValue: parseFloat(h.market_value || 0),
          unrealizedPnL: parseFloat(h.unrealized_pnl || 0)
        })),
        recentTransactions: transactionsResult.rows
      };

    } catch (error) {
      console.error('[SimulationPortfolio] Error getting portfolio summary:', error);
      throw error;
    }
  }

  /**
   * Helper methods
   */
  
  async getSimulationSession(sessionId) {
    const result = await db.query('SELECT * FROM simulation_sessions WHERE id = $1', [sessionId]);
    return result.rows[0];
  }

  async addOrUpdateHolding(sessionId, symbol, quantity, price) {
    const result = await db.query(`
      INSERT INTO simulation_holdings (session_id, symbol, quantity, average_cost, current_price, market_value)
      VALUES ($1, $2, $3, $4, $4, $5)
      ON CONFLICT (session_id, symbol) DO UPDATE SET
        quantity = simulation_holdings.quantity + EXCLUDED.quantity,
        average_cost = ((simulation_holdings.quantity * simulation_holdings.average_cost) + 
                       (EXCLUDED.quantity * EXCLUDED.average_cost)) / 
                      (simulation_holdings.quantity + EXCLUDED.quantity),
        market_value = (simulation_holdings.quantity + EXCLUDED.quantity) * EXCLUDED.current_price,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [sessionId, symbol, quantity, price, quantity * price]);
    
    return result.rows[0];
  }

  async reduceHolding(sessionId, symbol, quantity) {
    await db.query(`
      UPDATE simulation_holdings 
      SET quantity = quantity - $3,
          market_value = (quantity - $3) * current_price,
          updated_at = CURRENT_TIMESTAMP
      WHERE session_id = $1 AND symbol = $2
    `, [sessionId, symbol, quantity]);

    // Remove holding if quantity is 0
    await db.query(`
      DELETE FROM simulation_holdings 
      WHERE session_id = $1 AND symbol = $2 AND quantity <= 0
    `, [sessionId, symbol]);
  }

  async getHolding(sessionId, symbol) {
    const result = await db.query(`
      SELECT * FROM simulation_holdings 
      WHERE session_id = $1 AND symbol = $2
    `, [sessionId, symbol]);
    return result.rows[0];
  }

  async updatePortfolioValue(sessionId) {
    const result = await db.query(`
      UPDATE simulation_sessions 
      SET portfolio_value = (
        SELECT cash_balance + COALESCE(SUM(market_value), 0)
        FROM simulation_sessions s
        LEFT JOIN simulation_holdings h ON h.session_id = s.id
        WHERE s.id = $1
        GROUP BY s.cash_balance
      )
      WHERE id = $1
      RETURNING portfolio_value
    `, [sessionId]);

    return result.rows[0]?.portfolio_value;
  }

  /**
   * Get historical period information
   */
  getHistoricalPeriodInfo(periodId) {
    const periods = {
      'great-depression': {
        name: 'Great Depression',
        startDate: '1929-01-01',
        endDate: '1933-12-31',
        defaultStart: '1929-09-01'
      },
      '2008-crisis': {
        name: '2008 Financial Crisis',
        startDate: '2007-01-01',
        endDate: '2009-12-31',
        defaultStart: '2007-06-01'
      },
      'dot-com-bubble': {
        name: 'Dot-Com Bubble',
        startDate: '1995-01-01',
        endDate: '2002-12-31',
        defaultStart: '1999-01-01'
      },
      'covid-crash': {
        name: 'COVID-19 Market Crash',
        startDate: '2020-01-01',
        endDate: '2021-12-31',
        defaultStart: '2020-01-01'
      },
      'black-monday': {
        name: 'Black Monday 1987',
        startDate: '1987-01-01',
        endDate: '1988-12-31',
        defaultStart: '1987-08-01'
      },
      'modern-bull': {
        name: 'Modern Bull Market',
        startDate: '2009-03-09',
        endDate: '2020-02-19',
        defaultStart: '2009-03-09'
      }
    };

    return periods[periodId];
  }

  /**
   * Get user's simulation sessions
   */
  async getUserSimulationSessions(userId) {
    const result = await db.query(`
      SELECT * FROM simulation_sessions 
      WHERE user_id = $1 
      ORDER BY updated_at DESC
    `, [userId]);

    return result.rows;
  }

  /**
   * Close simulation session
   */
  async closeSimulationSession(sessionId) {
    await db.query(`
      UPDATE simulation_sessions 
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [sessionId]);

    console.log(`[SimulationPortfolio] Session ${sessionId} closed`);
  }
}

// Create singleton instance
const simulationPortfolioService = new SimulationPortfolioService();

module.exports = simulationPortfolioService;