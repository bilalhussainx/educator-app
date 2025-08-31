const portfolioService = require('../services/trade_portfolioService');

/**
 * @desc    Get the current user's complete trading portfolio.
 * @route   GET /api/trade/portfolio
 * @access  Private
 */
exports.getMyPortfolio = async (req, res) => {
    try {
        const userId = req.user.id; // From the authMiddleware
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated.' });
        }
        
        const fullPortfolio = await portfolioService.getPortfolioWithAssets(userId);
        
        res.status(200).json(fullPortfolio);
    } catch (error) {
        console.error('Error in getMyPortfolio:', error);
        res.status(500).json({ error: 'Server error while fetching portfolio.' });
    }
};

=