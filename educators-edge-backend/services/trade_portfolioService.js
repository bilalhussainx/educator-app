
const { pool } = require('../db')

class TradePortfolioService {
  async getOrCreateUserWallet(userId) {
    try {
      let result = await pool.query(
        'SELECT * FROM user_wallets WHERE user_id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        result = await pool.query(`
          INSERT INTO user_wallets (user_id, spark_balance, trading_cash_balance)
          VALUES ($1, 100, 10000.00)
          RETURNING *
        `, [userId]);
      }

      return result.rows[0];
    } catch (error) {
      console.error('Error in getOrCreateUserWallet:', error);
      if (error.code === '42P01') {
        return {
          id: 'mock-wallet-id',
          user_id: userId,
          spark_balance: 100,
          trading_cash_balance: '10000.00',
          created_at: new Date(),
          updated_at: new Date()
        };
      }
      throw error;
    }
  }

  async getOrCreateUserPortfolio(userId) {
    try {
      let result = await pool.query(
        'SELECT * FROM portfolios WHERE user_id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        result = await pool.query(`
          INSERT INTO portfolios (user_id, p_score)
          VALUES ($1, 0.0)
          RETURNING *
        `, [userId]);
      }

      return result.rows[0];
    } catch (error) {
      console.error('Error in getOrCreateUserPortfolio:', error);
      if (error.code === '42P01') {
        return {
          id: 'mock-portfolio-id',
          user_id: userId,
          p_score: 0.0,
          created_at: new Date()
        };
      }
      throw error;
    }
  }

  async getUserTradingState(userId) {
    try {
      const wallet = await this.getOrCreateUserWallet(userId);
      const portfolio = await this.getOrCreateUserPortfolio(userId);
      
      let assetsResult = { rows: [] };
      let tradesResult = { rows: [] };

      try {
        assetsResult = await pool.query(`
          SELECT asset_symbol, quantity, average_cost_basis
          FROM portfolio_assets
          WHERE portfolio_id = $1
          AND quantity > 0
        `, [portfolio.id]);

        tradesResult = await pool.query(`
          SELECT * FROM trades
          WHERE portfolio_id = $1
          ORDER BY executed_at DESC
          LIMIT 50
        `, [portfolio.id]);
      } catch (dbError) {
        if (dbError.code === '42P01') {
          console.log('Zenith Trade tables not yet created - using mock data');
          assetsResult = { rows: [] };
          tradesResult = { rows: [] };
        } else {
          throw dbError;
        }
      }

      return {
        wallet: {
          spark_balance: wallet.spark_balance,
          trading_cash_balance: parseFloat(wallet.trading_cash_balance)
        },
        portfolio: {
          id: portfolio.id,
          p_score: portfolio.p_score,
          assets: assetsResult.rows.map(asset => ({
            symbol: asset.asset_symbol,
            quantity: parseFloat(asset.quantity),
            averageCostBasis: parseFloat(asset.average_cost_basis)
          })),
          totalValue: 0,
          unrealizedPnL: 0,
          unrealizedPnLPercent: 0
        },
        recentTrades: tradesResult.rows.map(trade => ({
          id: trade.id,
          symbol: trade.asset_symbol,
          type: trade.trade_type,
          quantity: parseFloat(trade.quantity),
          fillPrice: parseFloat(trade.fill_price),
          executedAt: trade.executed_at
        }))
      };
    } catch (error) {
      console.error('Error in getUserTradingState:', error);
      throw error;
    }
  }

  async getLeaderboard(limit = 10) {
    try {
      const result = await pool.query(`
        SELECT 
          p.p_score,
          u.username,
          u.first_name,
          u.last_name
        FROM portfolios p
        JOIN users u ON p.user_id = u.id
        WHERE p.p_score > 0
        ORDER BY p.p_score DESC
        LIMIT $1
      `, [limit]);

      return result.rows.map((row, index) => ({
        rank: index + 1,
        username: row.username,
        firstName: row.first_name,
        lastName: row.last_name,
        pScore: row.p_score
      }));
    } catch (error) {
      console.error('Error in getLeaderboard:', error);
      throw error;
    }
  }

  async updatePScore(portfolioId, newPScore) {
    try {
      await pool.query(
        'UPDATE portfolios SET p_score = $1 WHERE id = $2',
        [newPScore, portfolioId]
      );
    } catch (error) {
      console.error('Error in updatePScore:', error);
      throw error;
    }
  }

  async calculatePortfolioValue(portfolioId, marketPrices = {}) {
    try {
      const assetsResult = await pool.query(`
        SELECT asset_symbol, quantity, average_cost_basis
        FROM portfolio_assets
        WHERE portfolio_id = $1
        AND quantity > 0
      `, [portfolioId]);

      let totalValue = 0;
      let totalCost = 0;

      for (const asset of assetsResult.rows) {
        const quantity = parseFloat(asset.quantity);
        const costBasis = parseFloat(asset.average_cost_basis);
        const currentPrice = marketPrices[asset.asset_symbol] || costBasis;
        
        totalValue += quantity * currentPrice;
        totalCost += quantity * costBasis;
      }

      return {
        totalValue,
        totalCost,
        unrealizedPnL: totalValue - totalCost,
        unrealizedPnLPercent: totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0
      };
    } catch (error) {
      console.error('Error in calculatePortfolioValue:', error);
      throw error;
    }
  }
}

module.exports = new TradePortfolioService();

