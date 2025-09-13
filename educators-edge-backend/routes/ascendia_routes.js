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

// Get user's connections (expanded for Trust Graph)
router.get('/connections/my-connections', async (req, res) => {
    try {
        const userId = req.user.id;
        const db = require('../db');

        const result = await db.query(`
            SELECT 
                c.id,
                c.requester_id as user1_id,
                c.recipient_id as user2_id,
                c.status,
                c.created_at,
                CASE 
                    WHEN c.requester_id = $1 THEN recipient_profile.*
                    ELSE requester_profile.*
                END as connected_user
            FROM connections c
            LEFT JOIN (
                SELECT 
                    u.id, u.username, u.role,
                    up.display_name, up.bio, up.user_tier, up.ascendia_score_total as ascendia_score,
                    up.score_academic as pillar_academic, up.score_community as pillar_community, 
                    up.score_mentorship as pillar_mentorship, up.score_analytical as pillar_analytical,
                    up.location, up.is_mentor, up.verified_mentor, up.is_searchable_teacher, up.total_sessions, up.average_rating, up.calendly_url
                FROM users u
                LEFT JOIN user_profiles up ON u.id = up.user_id
            ) requester_profile ON c.requester_id = requester_profile.id
            LEFT JOIN (
                SELECT 
                    u.id, u.username, u.role,
                    up.display_name, up.bio, up.user_tier, up.ascendia_score_total as ascendia_score,
                    up.score_academic as pillar_academic, up.score_community as pillar_community, 
                    up.score_mentorship as pillar_mentorship, up.score_analytical as pillar_analytical,
                    up.location, up.is_mentor, up.verified_mentor, up.is_searchable_teacher, up.total_sessions, up.average_rating, up.calendly_url
                FROM users u
                LEFT JOIN user_profiles up ON u.id = up.user_id
            ) recipient_profile ON c.recipient_id = recipient_profile.id
            WHERE (c.requester_id = $1 OR c.recipient_id = $1)
            ORDER BY c.created_at DESC
        `, [userId]);

        // Get specializations for connected users
        const connectedUserIds = result.rows
            .map(row => row.connected_user.id)
            .filter(id => id);

        let specializationsByUser = {};
        if (connectedUserIds.length > 0) {
            try {
                const specializationsQuery = await db.query(`
                    SELECT us.user_id, s.name
                    FROM user_specializations us
                    JOIN specializations s ON us.specialization_id = s.id
                    WHERE us.user_id = ANY($1)
                `, [connectedUserIds]);

                specializationsByUser = specializationsQuery.rows.reduce((acc, spec) => {
                    if (!acc[spec.user_id]) acc[spec.user_id] = [];
                    acc[spec.user_id].push(spec.name);
                    return acc;
                }, {});
            } catch (error) {
                console.log('Specializations table not found:', error.message);
            }
        }

        // Get achievements for connected users
        let achievementsByUser = {};
        if (connectedUserIds.length > 0) {
            try {
                const achievementsQuery = await db.query(`
                    SELECT ua.user_id, ua.title, ua.description, ua.achievement_type, 
                           ua.issuer, ua.issued_date, ua.is_verified
                    FROM user_achievements ua
                    WHERE ua.user_id = ANY($1) AND ua.is_verified = true
                    ORDER BY ua.issued_date DESC
                    LIMIT 100
                `, [connectedUserIds]);

                achievementsByUser = achievementsQuery.rows.reduce((acc, achievement) => {
                    if (!acc[achievement.user_id]) acc[achievement.user_id] = [];
                    acc[achievement.user_id].push({
                        title: achievement.title,
                        description: achievement.description,
                        type: achievement.achievement_type,
                        issuer: achievement.issuer,
                        date: achievement.issued_date
                    });
                    return acc;
                }, {});
            } catch (error) {
                console.log('Achievements table not found:', error.message);
            }
        }

        // Add specializations, achievements, and P scores to connected users
        result.rows.forEach(connection => {
            if (connection.connected_user) {
                connection.connected_user.specializations = specializationsByUser[connection.connected_user.id] || [];
                connection.connected_user.achievements = achievementsByUser[connection.connected_user.id] || [];
                
                // Format P scores for frontend
                connection.connected_user.p_scores = {
                    academic: connection.connected_user.pillar_academic || 0,
                    community: connection.connected_user.pillar_community || 0,
                    mentorship: connection.connected_user.pillar_mentorship || 0,
                    analytical: connection.connected_user.pillar_analytical || 0,
                    total: connection.connected_user.ascendia_score || 0
                };
            }
        });

        res.json({ success: true, connections: result.rows });
    } catch (error) {
        console.error('Error fetching connections:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get user's followers
router.get('/followers/my-followers', async (req, res) => {
    try {
        const userId = req.user.id;
        const db = require('../db');

        const result = await db.query(`
            SELECT 
                f.id,
                f.follower_id,
                f.following_id as followed_id,
                f.followed_at as created_at,
                u.id as user_id,
                u.username, u.role,
                up.display_name, up.bio, up.user_tier, up.ascendia_score_total as ascendia_score,
                up.location, up.is_mentor, up.verified_mentor, up.is_searchable_teacher
            FROM followers f
            JOIN users u ON f.follower_id = u.id
            LEFT JOIN user_profiles up ON u.id = up.user_id
            WHERE f.following_id = $1
            ORDER BY f.followed_at DESC
        `, [userId]);

        const followers = result.rows.map(row => ({
            id: row.id,
            follower_id: row.follower_id,
            followed_id: row.followed_id,
            created_at: row.created_at,
            user: {
                id: row.user_id,
                username: row.username,
                display_name: row.display_name,
                bio: row.bio,
                user_tier: row.user_tier,
                ascendia_score: row.ascendia_score,
                location: row.location,
                specializations: [], // Will be populated below
                is_mentor: row.is_mentor,
                verified_mentor: row.verified_mentor
            }
        }));

        res.json({ success: true, followers });
    } catch (error) {
        console.error('Error fetching followers:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get users that current user is following
router.get('/followers/my-following', async (req, res) => {
    try {
        const userId = req.user.id;
        const db = require('../db');

        const result = await db.query(`
            SELECT 
                f.id,
                f.follower_id,
                f.following_id as followed_id,
                f.followed_at as created_at,
                u.id as user_id,
                u.username, u.role,
                up.display_name, up.bio, up.user_tier, up.ascendia_score_total as ascendia_score,
                up.location, up.is_mentor, up.verified_mentor, up.is_searchable_teacher
            FROM followers f
            JOIN users u ON f.following_id = u.id
            LEFT JOIN user_profiles up ON u.id = up.user_id
            WHERE f.follower_id = $1
            ORDER BY f.followed_at DESC
        `, [userId]);

        const following = result.rows.map(row => ({
            id: row.id,
            follower_id: row.follower_id,
            followed_id: row.followed_id,
            created_at: row.created_at,
            user: {
                id: row.user_id,
                username: row.username,
                display_name: row.display_name,
                bio: row.bio,
                user_tier: row.user_tier,
                ascendia_score: row.ascendia_score,
                location: row.location,
                specializations: [], // Will be populated below
                is_mentor: row.is_mentor,
                verified_mentor: row.verified_mentor
            }
        }));

        res.json({ success: true, following });
    } catch (error) {
        console.error('Error fetching following:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get network statistics
router.get('/network/stats', async (req, res) => {
    try {
        const userId = req.user.id;
        const db = require('../db');

        // Get various network counts
        const statsQuery = await db.query(`
            SELECT 
                (SELECT COUNT(*) FROM connections WHERE (requester_id = $1 OR recipient_id = $1) AND status = 'accepted') as connections_count,
                (SELECT COUNT(*) FROM followers WHERE following_id = $1) as followers_count,
                (SELECT COUNT(*) FROM followers WHERE follower_id = $1) as following_count
        `, [userId]);

        const stats = statsQuery.rows[0];

        // Calculate some network metrics
        const networkStats = {
            connections_count: parseInt(stats.connections_count) || 0,
            followers_count: parseInt(stats.followers_count) || 0,
            following_count: parseInt(stats.following_count) || 0,
            influence_score: Math.floor((parseInt(stats.followers_count) || 0) * 1.5 + (parseInt(stats.connections_count) || 0) * 2),
            network_reach: (parseInt(stats.connections_count) || 0) + (parseInt(stats.followers_count) || 0) + (parseInt(stats.following_count) || 0),
            trust_rating: 0.85, // Mock trust rating
            weekly_growth: Math.floor(Math.random() * 5) + 1 // Mock weekly growth
        };

        res.json({ success: true, stats: networkStats });
    } catch (error) {
        console.error('Error fetching network stats:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get network activity
router.get('/network/activity', async (req, res) => {
    try {
        const userId = req.user.id;
        const db = require('../db');

        // Mock activity data for now - in real implementation, this would come from an activity log
        const mockActivity = [
            {
                id: '1',
                type: 'connection',
                user: { id: '1', display_name: 'John Doe', user_tier: 'explorer' },
                description: 'connected with you',
                created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
            },
            {
                id: '2',
                type: 'follow',
                user: { id: '2', display_name: 'Sarah Chen', user_tier: 'navigator' },
                description: 'started following you',
                created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
            }
        ];

        res.json({ success: true, activity: mockActivity });
    } catch (error) {
        console.error('Error fetching network activity:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get network insights
router.get('/network/insights', async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Mock insights for now
        const mockInsights = [
            {
                id: '1',
                type: 'recommendation',
                title: 'Expand Your Network',
                description: 'Connect with 3 more mentors in your specialization area',
                actionText: 'Find Mentors',
                priority: 'medium'
            },
            {
                id: '2',
                type: 'opportunity',
                title: 'Growing Influence',
                description: 'Your followers increased by 20% this week!',
                actionText: 'View Analytics',
                priority: 'low'
            }
        ];

        res.json({ success: true, insights: mockInsights });
    } catch (error) {
        console.error('Error fetching network insights:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get network suggestions
router.get('/network/suggestions', async (req, res) => {
    try {
        const userId = req.user.id;
        const db = require('../db');

        // Get suggested connections (users not already connected to)
        const result = await db.query(`
            SELECT 
                u.id, u.username, u.role,
                up.display_name, up.bio, up.user_tier, up.ascendia_score_total as ascendia_score,
                up.location, up.is_mentor, up.verified_mentor, up.is_searchable_teacher, up.total_sessions, up.average_rating, up.calendly_url
            FROM users u
            LEFT JOIN user_profiles up ON u.id = up.user_id
            WHERE u.id != $1
            AND u.id NOT IN (
                SELECT CASE WHEN requester_id = $1 THEN recipient_id ELSE requester_id END 
                FROM connections 
                WHERE (requester_id = $1 OR recipient_id = $1) AND status = 'accepted'
            )
            AND u.id NOT IN (
                SELECT following_id FROM followers WHERE follower_id = $1
            )
            AND (u.role = 'teacher' OR up.is_mentor = true OR up.is_searchable_teacher = true)
            ORDER BY up.ascendia_score_total DESC, up.average_rating DESC
            LIMIT 6
        `, [userId]);

        // Add specializations to suggestions
        const userIds = result.rows.map(user => user.id);
        let specializationsByUser = {};
        
        if (userIds.length > 0) {
            try {
                const specializationsQuery = await db.query(`
                    SELECT us.user_id, s.name
                    FROM user_specializations us
                    JOIN specializations s ON us.specialization_id = s.id
                    WHERE us.user_id = ANY($1)
                `, [userIds]);

                specializationsByUser = specializationsQuery.rows.reduce((acc, spec) => {
                    if (!acc[spec.user_id]) acc[spec.user_id] = [];
                    acc[spec.user_id].push(spec.name);
                    return acc;
                }, {});
            } catch (error) {
                console.log('Specializations table not found:', error.message);
            }
        }

        result.rows.forEach(user => {
            user.specializations = specializationsByUser[user.id] || [];
        });

        res.json({ success: true, suggestions: result.rows });
    } catch (error) {
        console.error('Error fetching network suggestions:', error);
        res.status(500).json({ error: error.message });
    }
});

// Network search
router.get('/network/search', async (req, res) => {
    try {
        const { q, role } = req.query;
        const userId = req.user.id;
        const db = require('../db');

        // Allow empty query for browsing all users of a specific role
        const searchTerm = q ? `%${q.trim()}%` : '%';

        // Build the query with role filtering - ONLY show teachers and mentors
        let query = `
            SELECT 
                u.id, u.username, u.role,
                up.display_name, up.bio, up.user_tier, up.ascendia_score_total as ascendia_score,
                up.score_academic, up.score_community, up.score_mentorship, up.score_analytical,
                up.location, up.is_mentor, up.verified_mentor, up.is_searchable_teacher, 
                up.total_sessions, up.average_rating, up.calendly_url
            FROM users u
            LEFT JOIN user_profiles up ON u.id = up.user_id
            WHERE u.id != $1 
            AND (u.role = 'teacher' OR up.is_mentor = true OR up.is_searchable_teacher = true)`;
        
        const params = [userId];
        let paramIndex = 2;

        // Add role filtering
        if (role) {
            if (role === 'teacher') {
                query += ` AND (u.role = 'teacher' OR up.is_searchable_teacher = true)`;
            } else if (role === 'mentor') {
                query += ` AND up.is_mentor = true`;
            }
        }

        // Add search term filtering
        query += ` AND (`;
        params.push(searchTerm);
        const searchParam = `$${paramIndex++}`;
        
        query += `up.display_name ILIKE ${searchParam} 
                 OR u.username ILIKE ${searchParam} 
                 OR up.bio ILIKE ${searchParam}
                 OR up.location ILIKE ${searchParam}
            )
            ORDER BY up.ascendia_score_total DESC, up.average_rating DESC
            LIMIT 50`;
        
        const result = await db.query(query, params);

        // Add specializations to search results
        const userIds = result.rows.map(user => user.id);
        let specializationsByUser = {};
        
        if (userIds.length > 0) {
            try {
                const specializationsQuery = await db.query(`
                    SELECT us.user_id, s.name
                    FROM user_specializations us
                    JOIN specializations s ON us.specialization_id = s.id
                    WHERE us.user_id = ANY($1)
                `, [userIds]);

                specializationsByUser = specializationsQuery.rows.reduce((acc, spec) => {
                    if (!acc[spec.user_id]) acc[spec.user_id] = [];
                    acc[spec.user_id].push(spec.name);
                    return acc;
                }, {});
            } catch (error) {
                console.log('Specializations table not found:', error.message);
            }
        }

        // Add achievements to search results
        let achievementsByUser = {};
        
        if (userIds.length > 0) {
            try {
                const achievementsQuery = await db.query(`
                    SELECT ua.user_id, ua.title, ua.description, ua.achievement_type, 
                           ua.issuer, ua.issued_date, ua.is_verified
                    FROM user_achievements ua
                    WHERE ua.user_id = ANY($1) AND ua.is_verified = true
                    ORDER BY ua.issued_date DESC
                    LIMIT 100
                `, [userIds]);

                achievementsByUser = achievementsQuery.rows.reduce((acc, achievement) => {
                    if (!acc[achievement.user_id]) acc[achievement.user_id] = [];
                    acc[achievement.user_id].push({
                        title: achievement.title,
                        description: achievement.description,
                        type: achievement.achievement_type,
                        issuer: achievement.issuer,
                        date: achievement.issued_date
                    });
                    return acc;
                }, {});
            } catch (error) {
                console.log('Achievements table not found:', error.message);
            }
        }

        result.rows.forEach(user => {
            user.specializations = specializationsByUser[user.id] || [];
            user.achievements = achievementsByUser[user.id] || [];
            
            // Calculate P Score object for easier frontend consumption
            user.p_scores = {
                academic: user.score_academic || 0,
                community: user.score_community || 0,
                mentorship: user.score_mentorship || 0,
                analytical: user.score_analytical || 0,
                total: user.ascendia_score || 0
            };
        });

        res.json({ success: true, results: result.rows });
    } catch (error) {
        console.error('Error searching network:', error);
        res.status(500).json({ error: error.message });
    }
});

// Send connection request (fixed to match frontend expectations)
router.post('/connections/send-request', async (req, res) => {
    try {
        const requesterId = req.user.id;
        const { targetUserId, connectionType = 'professional', message } = req.body;

        if (requesterId === targetUserId) {
            return res.status(400).json({ error: 'Cannot connect to yourself' });
        }

        const db = require('../db');

        // Check if connection already exists
        const existingConnection = await db.query(`
            SELECT * FROM connections 
            WHERE (requester_id = $1 AND recipient_id = $2) OR (requester_id = $2 AND recipient_id = $1)
        `, [requesterId, targetUserId]);

        if (existingConnection.rows.length > 0) {
            return res.status(400).json({ error: 'Connection request already exists' });
        }

        const result = await db.query(`
            INSERT INTO connections (requester_id, recipient_id, status, connection_type, message, created_at)
            VALUES ($1, $2, 'pending', $3, $4, NOW())
            RETURNING *
        `, [requesterId, targetUserId, connectionType, message]);

        res.status(201).json({ success: true, connection: result.rows[0] });
    } catch (error) {
        console.error('Error sending connection request:', error);
        res.status(500).json({ error: error.message });
    }
});

// Accept connection request
router.post('/connections/:connectionId/accept', async (req, res) => {
    try {
        const { connectionId } = req.params;
        const userId = req.user.id;
        const db = require('../db');

        const result = await db.query(`
            UPDATE connections 
            SET status = 'accepted', updated_at = NOW()
            WHERE id = $1 AND (requester_id = $2 OR recipient_id = $2) AND status = 'pending'
            RETURNING *
        `, [connectionId, userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Connection request not found or already responded' });
        }

        res.json({ success: true, connection: result.rows[0] });
    } catch (error) {
        console.error('Error accepting connection:', error);
        res.status(500).json({ error: error.message });
    }
});

// Decline connection request
router.post('/connections/:connectionId/decline', async (req, res) => {
    try {
        const { connectionId } = req.params;
        const userId = req.user.id;
        const db = require('../db');

        const result = await db.query(`
            UPDATE connections 
            SET status = 'declined', updated_at = NOW()
            WHERE id = $1 AND (requester_id = $2 OR recipient_id = $2) AND status = 'pending'
            RETURNING *
        `, [connectionId, userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Connection request not found or already responded' });
        }

        res.json({ success: true, connection: result.rows[0] });
    } catch (error) {
        console.error('Error declining connection:', error);
        res.status(500).json({ error: error.message });
    }
});

// Follow user (fixed endpoint)
router.post('/followers/follow/:userId', async (req, res) => {
    try {
        const followerId = req.user.id;
        const { userId: followingId } = req.params;

        if (followerId === followingId) {
            return res.status(400).json({ error: 'Cannot follow yourself' });
        }

        const db = require('../db');

        const result = await db.query(`
            INSERT INTO followers (follower_id, following_id, followed_at)
            VALUES ($1, $2, NOW())
            ON CONFLICT (follower_id, following_id) DO NOTHING
            RETURNING *
        `, [followerId, followingId]);

        res.json({ 
            success: true, 
            following: result.rows.length > 0,
            message: result.rows.length > 0 ? 'Now following user' : 'Already following user'
        });
    } catch (error) {
        console.error('Error following user:', error);
        res.status(500).json({ error: error.message });
    }
});

// Unfollow user
router.post('/followers/unfollow/:userId', async (req, res) => {
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
        console.error('Error unfollowing user:', error);
        res.status(500).json({ error: error.message });
    }
});

// Legacy connection request endpoint (keeping for compatibility)
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