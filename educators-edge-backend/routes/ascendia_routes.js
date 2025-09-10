// =================================================================
// ASCENDIA PLATFORM: Complete Enhanced Routes
// =================================================================
// Combines existing communication routes with new marketplace functionality

const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const { isAscendant, isContributor, addTierInfo } = require('../middleware/tierMiddleware');

// Import all controllers and services
const communicationController = require('../controllers/ascendia_communicationController');
const ascendiaSessionController = require('../controllers/ascendiaSessionController');
const paymentService = require('../services/paymentService');
const ascendiaScoringService = require('../services/ascendiaScoringService');

// All routes require authentication
router.use(verifyToken);
router.use(addTierInfo);

// =================================================================
// EXISTING COMMUNICATION ROUTES (PRESERVED)
// =================================================================

// Tier-locked communication routes
router.post('/messages/send', isAscendant, communicationController.sendDirectMessage);
router.post('/sessions/request-free', isAscendant, communicationController.requestFreeSession);
router.post('/sessions/request-paid', communicationController.requestPaidSession);
router.get('/messages', isContributor, communicationController.getDirectMessages);
router.get('/tier', communicationController.getUserTierInfo);

// Session management (existing)
router.patch('/sessions/:sessionId/respond', async (req, res) => {
    const { sessionId } = req.params;
    const { status, scheduledAt } = req.body;
    const userId = req.user.id;

    if (!['accepted', 'declined'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status. Must be "accepted" or "declined".' });
    }

    try {
        const db = require('../db');
        
        const sessionQuery = await db.query(
            'SELECT * FROM session_requests WHERE id = $1 AND mentor_id = $2',
            [sessionId, userId]
        );

        if (sessionQuery.rows.length === 0) {
            return res.status(404).json({ error: 'Session request not found or unauthorized.' });
        }

        const updateQuery = await db.query(
            `UPDATE session_requests 
             SET status = $1, scheduled_at = $2, updated_at = NOW()
             WHERE id = $3
             RETURNING *`,
            [status, scheduledAt || null, sessionId]
        );

        res.json({
            success: true,
            message: `Session ${status} successfully`,
            session: updateQuery.rows[0]
        });

    } catch (error) {
        console.error('Error responding to session request:', error);
        res.status(500).json({ error: 'Failed to respond to session request.' });
    }
});

router.get('/sessions/requested', async (req, res) => {
    const userId = req.user.id;
    const { status, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    try {
        const db = require('../db');
        let query = `
            SELECT sr.*, 
                   mentor.username as mentor_username,
                   mentor.role as mentor_role
            FROM session_requests sr
            JOIN users mentor ON sr.mentor_id = mentor.id
            WHERE sr.requester_id = $1
        `;
        const queryParams = [userId];

        if (status) {
            query += ` AND sr.status = $${queryParams.length + 1}`;
            queryParams.push(status);
        }

        query += ` ORDER BY sr.created_at DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
        queryParams.push(limit, offset);

        const sessionsQuery = await db.query(query, queryParams);

        res.json({
            sessions: sessionsQuery.rows,
            page: parseInt(page),
            hasMore: sessionsQuery.rows.length === parseInt(limit)
        });

    } catch (error) {
        console.error('Error fetching session requests:', error);
        res.status(500).json({ error: 'Failed to fetch session requests.' });
    }
});

router.get('/sessions/received', async (req, res) => {
    const userId = req.user.id;
    const { status, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    try {
        const db = require('../db');
        let query = `
            SELECT sr.*, 
                   requester.username as requester_username,
                   COALESCE(uw.spark_balance, 0) as requester_balance
            FROM session_requests sr
            JOIN users requester ON sr.requester_id = requester.id
            LEFT JOIN user_wallets uw ON requester.id = uw.user_id
            WHERE sr.mentor_id = $1
        `;
        const queryParams = [userId];

        if (status) {
            query += ` AND sr.status = $${queryParams.length + 1}`;
            queryParams.push(status);
        }

        query += ` ORDER BY sr.created_at DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
        queryParams.push(limit, offset);

        const sessionsQuery = await db.query(query, queryParams);

        res.json({
            sessions: sessionsQuery.rows,
            page: parseInt(page),
            hasMore: sessionsQuery.rows.length === parseInt(limit)
        });

    } catch (error) {
        console.error('Error fetching received session requests:', error);
        res.status(500).json({ error: 'Failed to fetch received session requests.' });
    }
});

// Spark management (existing)
router.get('/sparks/transactions', async (req, res) => {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    try {
        const db = require('../db');
        
        const transactionsQuery = await db.query(
            `SELECT * FROM transactions 
             WHERE user_id = $1 
             ORDER BY created_at DESC 
             LIMIT $2 OFFSET $3`,
            [userId, limit, offset]
        );

        res.json({
            transactions: transactionsQuery.rows,
            page: parseInt(page),
            hasMore: transactionsQuery.rows.length === parseInt(limit)
        });

    } catch (error) {
        console.error('Error fetching Spark transactions:', error);
        res.status(500).json({ error: 'Failed to fetch transaction history.' });
    }
});

router.post('/sparks/award', async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required.' });
    }

    const { userId, amount, description, activity } = req.body;

    if (!userId || !amount || amount <= 0) {
        return res.status(400).json({ error: 'Valid userId and positive amount are required.' });
    }

    try {
        const db = require('../db');

        const userQuery = await db.query('SELECT username FROM users WHERE id = $1', [userId]);
        if (userQuery.rows.length === 0) {
            return res.status(404).json({ error: 'User not found.' });
        }

        await db.query(
            `INSERT INTO user_wallets (user_id, spark_balance, total_earned_sparks) 
             VALUES ($1, $2, $2)
             ON CONFLICT (user_id) 
             DO UPDATE SET 
                spark_balance = user_wallets.spark_balance + $2,
                total_earned_sparks = user_wallets.total_earned_sparks + $2,
                updated_at = CURRENT_TIMESTAMP`,
            [userId, amount]
        );

        await db.query(
            `INSERT INTO transactions (user_id, amount_sparks, transaction_type, description, reference_type)
             VALUES ($1, $2, 'earn', $3, 'admin_award')`,
            [userId, amount, description || `Admin awarded ${amount} Sparks`]
        );

        res.json({
            success: true,
            message: `Successfully awarded ${amount} Sparks to ${userQuery.rows[0].username}`,
            amount: amount
        });

    } catch (error) {
        console.error('Error awarding Sparks:', error);
        res.status(500).json({ error: 'Failed to award Sparks.' });
    }
});

// =================================================================
// NEW MENTORSHIP MARKETPLACE ROUTES
// =================================================================

// Session Management (New marketplace system)
router.post('/marketplace/sessions/book', ascendiaSessionController.bookSession);
router.put('/marketplace/sessions/:sessionId/confirm', ascendiaSessionController.confirmSession);
router.put('/marketplace/sessions/:sessionId/start', ascendiaSessionController.startSession);
router.put('/marketplace/sessions/:sessionId/complete', ascendiaSessionController.completeSession);
router.put('/marketplace/sessions/:sessionId/cancel', ascendiaSessionController.cancelSession);
router.get('/marketplace/sessions/:sessionId', ascendiaSessionController.getSessionDetails);
router.get('/marketplace/sessions', ascendiaSessionController.getUserSessions);

// Session Reviews
router.post('/marketplace/sessions/:sessionId/review', ascendiaSessionController.submitSessionReview);

// Mentor Availability
router.get('/marketplace/mentors/:mentorId/availability', ascendiaSessionController.getMentorAvailability);

// Session Analytics
router.get('/marketplace/analytics/sessions', ascendiaSessionController.getSessionAnalytics);

// =================================================================
// PAYMENT & STRIPE ROUTES
// =================================================================

// Stripe Connect Onboarding
router.post('/payments/connect/create', async (req, res) => {
    try {
        const userId = req.user.id;
        const accountInfo = req.body;
        const result = await paymentService.createConnectAccount(userId, accountInfo);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/payments/connect/status', async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await paymentService.checkOnboardingStatus(userId);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Payment Processing
router.post('/payments/checkout', async (req, res) => {
    try {
        const sessionData = req.body;
        const result = await paymentService.createCheckoutSession(sessionData);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Earnings Dashboard
router.get('/payments/earnings', async (req, res) => {
    try {
        const mentorId = req.user.id;
        const result = await paymentService.getMentorEarnings(mentorId);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// =================================================================
// FOUR PILLARS SCORING ROUTES
// =================================================================

// Add points to specific pillar
router.post('/scoring/pillars/:pillarName/points', async (req, res) => {
    try {
        const { pillarName } = req.params;
        const { points, description } = req.body;
        const userId = req.user.id;

        const result = await ascendiaScoringService.addPillarPoints(userId, pillarName, points, description);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Award points for specific activity
router.post('/scoring/activities/:activityType', async (req, res) => {
    try {
        const { activityType } = req.params;
        const activityData = req.body;
        const userId = req.user.id;

        const result = await ascendiaScoringService.awardActivityPoints(userId, activityType, activityData);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get user's complete scoring profile
router.get('/scoring/profile', async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await ascendiaScoringService.getUserScoringProfile(userId);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get scoring leaderboard
router.get('/scoring/leaderboard', async (req, res) => {
    try {
        const filters = req.query;
        const result = await ascendiaScoringService.getScoringLeaderboard(filters);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get tier statistics
router.get('/scoring/tiers/stats', async (req, res) => {
    try {
        const result = await ascendiaScoringService.getTierStatistics();
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// =================================================================
// MENTOR PROFILE ROUTES
// =================================================================

// Get mentor profile for marketplace
router.get('/mentors/:mentorId/profile', async (req, res) => {
    try {
        const { mentorId } = req.params;
        const db = require('../db');

        const result = await db.query(`
            SELECT 
                u.id, u.username,
                up.display_name, up.bio,
                mp.specialties, mp.session_rate_usd, mp.session_rate_sparks,
                mp.bio_extended, mp.availability_schedule,
                mp.session_duration_minutes, mp.max_sessions_per_day,
                mp.cancellation_policy, mp.instant_booking_enabled,
                mp.verified_mentor, mp.total_earnings_usd, mp.total_earnings_sparks,
                up.average_rating, up.total_reviews, up.user_tier,
                up.ascendia_score_total
            FROM users u
            JOIN user_profiles up ON u.id = up.user_id
            JOIN mentor_profiles mp ON u.id = mp.user_id
            WHERE u.id = $1
        `, [mentorId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Mentor not found' });
        }

        res.json({ success: true, mentor: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update mentor profile
router.put('/mentors/profile', async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            specialties,
            sessionRateUSD,
            sessionRateSparks,
            bioExtended,
            availabilitySchedule,
            sessionDurationMinutes,
            maxSessionsPerDay,
            cancellationPolicy,
            instantBookingEnabled
        } = req.body;

        const db = require('../db');

        await db.query(`
            UPDATE mentor_profiles 
            SET specialties = $1,
                session_rate_usd = $2,
                session_rate_sparks = $3,
                bio_extended = $4,
                availability_schedule = $5,
                session_duration_minutes = $6,
                max_sessions_per_day = $7,
                cancellation_policy = $8,
                instant_booking_enabled = $9,
                updated_at = CURRENT_TIMESTAMP
            WHERE user_id = $10
        `, [
            specialties, sessionRateUSD, sessionRateSparks,
            bioExtended, availabilitySchedule, sessionDurationMinutes,
            maxSessionsPerDay, cancellationPolicy, instantBookingEnabled,
            userId
        ]);

        res.json({ success: true, message: 'Mentor profile updated' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// =================================================================
// TRUST GRAPH ROUTES
// =================================================================

// Send connection request
router.post('/connections/request', async (req, res) => {
    try {
        const requesterId = req.user.id;
        const { recipientId, connectionType = 'professional', message } = req.body;

        if (requesterId === recipientId) {
            return res.status(400).json({ error: 'Cannot connect to yourself' });
        }

        const db = require('../db');

        const result = await db.query(`
            INSERT INTO connections (requester_id, recipient_id, connection_type, message)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `, [requesterId, recipientId, connectionType, message]);

        res.status(201).json({ success: true, connection: result.rows[0] });
    } catch (error) {
        if (error.code === '23505') {
            return res.status(400).json({ error: 'Connection request already exists' });
        }
        res.status(500).json({ error: error.message });
    }
});

// Respond to connection request
router.put('/connections/:connectionId/respond', async (req, res) => {
    try {
        const { connectionId } = req.params;
        const { status } = req.body; // 'accepted' or 'declined'
        const userId = req.user.id;

        if (!['accepted', 'declined'].includes(status)) {
            return res.status(400).json({ error: 'Status must be accepted or declined' });
        }

        const db = require('../db');

        const result = await db.query(`
            UPDATE connections 
            SET status = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2 AND recipient_id = $3 AND status = 'pending'
            RETURNING *
        `, [status, connectionId, userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Connection request not found or already responded' });
        }

        res.json({ success: true, connection: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get user's connections
router.get('/connections', async (req, res) => {
    try {
        const userId = req.user.id;
        const { status = 'accepted' } = req.query;

        const db = require('../db');

        const result = await db.query(`
            SELECT 
                c.*,
                CASE 
                    WHEN c.requester_id = $1 THEN recipient_profile.display_name
                    ELSE requester_profile.display_name
                END as connection_name,
                CASE 
                    WHEN c.requester_id = $1 THEN c.recipient_id
                    ELSE c.requester_id
                END as connection_user_id
            FROM connections c
            LEFT JOIN user_profiles requester_profile ON c.requester_id = requester_profile.user_id
            LEFT JOIN user_profiles recipient_profile ON c.recipient_id = recipient_profile.user_id
            WHERE (c.requester_id = $1 OR c.recipient_id = $1) 
            AND c.status = $2
            ORDER BY c.updated_at DESC
        `, [userId, status]);

        res.json({ success: true, connections: result.rows });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Follow/unfollow user
router.post('/follow/:userId', async (req, res) => {
    try {
        const followerId = req.user.id;
        const { userId: followingId } = req.params;

        if (followerId === followingId) {
            return res.status(400).json({ error: 'Cannot follow yourself' });
        }

        const db = require('../db');

        const result = await db.query(`
            INSERT INTO followers (follower_id, following_id)
            VALUES ($1, $2)
            ON CONFLICT (follower_id, following_id) DO NOTHING
            RETURNING *
        `, [followerId, followingId]);

        res.json({ 
            success: true, 
            following: result.rows.length > 0,
            message: result.rows.length > 0 ? 'Now following user' : 'Already following user'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.delete('/follow/:userId', async (req, res) => {
    try {
        const followerId = req.user.id;
        const { userId: followingId } = req.params;

        const db = require('../db');

        const result = await db.query(`
            DELETE FROM followers 
            WHERE follower_id = $1 AND following_id = $2
            RETURNING *
        `, [followerId, followingId]);

        res.json({ 
            success: true, 
            unfollowed: result.rows.length > 0,
            message: result.rows.length > 0 ? 'Unfollowed user' : 'Was not following user'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// =================================================================
// WEBHOOK ENDPOINT (No auth required)
// =================================================================

// Stripe webhook endpoint
router.post('/payments/webhook/stripe', 
    express.raw({ type: 'application/json' }), 
    ascendiaSessionController.handleStripeWebhook
);

module.exports = router;