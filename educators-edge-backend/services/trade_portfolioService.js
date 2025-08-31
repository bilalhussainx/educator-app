
const db = require('../db');

/**
 * Ensures a portfolio exists for a given user. If it doesn't, one is created.
 * This is a critical "get or create" function.
 * @param {string} userId - The UUID of the user.
 * @returns {Promise<object>} The user's portfolio from the database.
 */
exports.getOrCreatePortfolio = async (userId) => {
    // First, try to find an existing portfolio.
    const existingPortfolio = await db.query('SELECT * FROM portfolios WHERE user_id = $1', [userId]);
    
    if (existingPortfolio.rows.length > 0) {
        return existingPortfolio.rows[0];
    }
    
    // If no portfolio exists, create one with the default starting capital.
    const newPortfolio = await db.query(
        'INSERT INTO portfolios (user_id, cash_balance) VALUES ($1, $2) RETURNING *',
        [userId, 10000.00]
    );
    
    return newPortfolio.rows[0];
};

/**
 * Fetches the complete portfolio details for a user, including their cash balance and all owned assets.
 * @param {string} userId - The UUID of the user.
 * @returns {Promise<object>} A combined object with portfolio details and an array of assets.
 */
exports.getPortfolioWithAssets = async (userId) => {
    const portfolio = await getOrCreatePortfolio(userId);
    
    const assets = await db.query(
        'SELECT asset_symbol, quantity, average_cost_basis FROM portfolio_assets WHERE portfolio_id = $1',
        [portfolio.id]
    );
    
    return {
        ...portfolio,
        assets: assets.rows
    };
};

