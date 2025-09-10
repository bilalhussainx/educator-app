// educators-edge-backend/middleware/tierMiddleware.js
const db = require('../db');

// Define our tiers. These can be tuned later from a central config.
const TIERS = {
    ASCENDANT: 20000,
    CONTRIBUTOR: 5000,
};

/**
 * Get user's tier based on Spark balance
 * @param {number} balance - User's Spark balance
 * @returns {string} - User's tier: 'ascendant', 'contributor', or 'standard'
 */
const getTierFromBalance = (balance) => {
    if (balance >= TIERS.ASCENDANT) {
        return 'ascendant';
    } else if (balance >= TIERS.CONTRIBUTOR) {
        return 'contributor';
    } else {
        return 'standard';
    }
};

/**
 * Get user's Spark balance and tier information
 * @param {string} userId - User ID
 * @returns {Object} - { balance, tier, tierName }
 */
const getUserTierInfo = async (userId) => {
    try {
        // First check if user_wallets table exists, if not, use default values
        let balance = 0;
        try {
            const walletResult = await db.query(
                'SELECT z_credit_balance FROM user_wallets WHERE user_id = $1', 
                [userId]
            );
            
            if (walletResult.rows.length > 0) {
                balance = parseFloat(walletResult.rows[0].z_credit_balance);
            }
        } catch (walletError) {
            // If table doesn't exist or column doesn't exist, use default balance
            console.log('User wallets table not found or misconfigured, using default balance:', walletError.message);
            balance = 0;
        }
        
        const tier = getTierFromBalance(balance);
        const tierNames = {
            'ascendant': 'Ascendant',
            'contributor': 'Contributor',
            'standard': 'Standard User'
        };
        
        return {
            balance,
            tier,
            tierName: tierNames[tier],
            thresholds: TIERS
        };
    } catch (error) {
        console.error("Error getting user tier info:", error);
        throw error;
    }
};

/**
 * Middleware factory to check if user meets required tier
 * @param {number} requiredTier - Minimum Spark balance required
 * @returns {Function} - Express middleware function
 */
const checkTier = (requiredTier) => {
    return async (req, res, next) => {
        const userId = req.user.id;

        try {
            const tierInfo = await getUserTierInfo(userId);
            
            if (tierInfo.balance >= requiredTier) {
                // Add tier info to request for use in controllers
                req.userTier = tierInfo;
                next();
            } else {
                const requiredTierName = getTierFromBalance(requiredTier);
                return res.status(403).json({ 
                    error: `Access denied. You need to be ${requiredTierName.charAt(0).toUpperCase() + requiredTierName.slice(1)} tier to use this feature.`,
                    currentBalance: tierInfo.balance,
                    requiredBalance: requiredTier,
                    currentTier: tierInfo.tier,
                    requiredTier: requiredTierName
                });
            }
        } catch (error) {
            console.error("Error in checkTier middleware:", error);
            return res.status(500).json({ error: "Server error during privilege check." });
        }
    };
};

/**
 * Middleware to add user's tier information to all requests
 */
const addTierInfo = async (req, res, next) => {
    if (req.user && req.user.id) {
        try {
            req.userTier = await getUserTierInfo(req.user.id);
        } catch (error) {
            console.error("Error adding tier info:", error);
            // Don't block the request, just log the error
            req.userTier = { balance: 0, tier: 'standard', tierName: 'Standard User' };
        }
    }
    next();
};

module.exports = {
    isAscendant: checkTier(TIERS.ASCENDANT),
    isContributor: checkTier(TIERS.CONTRIBUTOR),
    checkTier,
    addTierInfo,
    getUserTierInfo,
    getTierFromBalance,
    TIERS
};