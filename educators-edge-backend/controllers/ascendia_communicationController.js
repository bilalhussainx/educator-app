// educators-edge-backend/controllers/ascendia_communicationController.js
const db = require('../db');

/**
 * Send a direct message between users (Tier-locked feature)
 * Only Ascendant tier users can send free direct messages
 */
const sendDirectMessage = async (req, res) => {
    const senderId = req.user.id;
    const { recipientId, message, subject } = req.body;

    if (!recipientId || !message) {
        return res.status(400).json({ error: 'Recipient ID and message are required.' });
    }

    try {
        // Check if recipient exists and get their tier info
        const recipientQuery = await db.query(
            `SELECT u.id, u.username, 
                    COALESCE(uw.spark_balance, 0) as balance
             FROM users u 
             LEFT JOIN user_wallets uw ON u.id = uw.user_id 
             WHERE u.id = $1`,
            [recipientId]
        );

        if (recipientQuery.rows.length === 0) {
            return res.status(404).json({ error: 'Recipient not found.' });
        }

        const recipient = recipientQuery.rows[0];

        // Insert the message into a direct_messages table
        const messageResult = await db.query(
            `INSERT INTO direct_messages (sender_id, recipient_id, subject, message, sent_at)
             VALUES ($1, $2, $3, $4, NOW())
             RETURNING *`,
            [senderId, recipientId, subject || 'Direct Message', message]
        );

        // Log this as a Spark activity (could earn credits for community engagement)
        await db.query(
            `INSERT INTO spark_transactions (user_id, amount, transaction_type, description, related_activity)
             VALUES ($1, 1.00, 'earned', 'Sent direct message to community member', 'community_engagement')`,
            [senderId]
        );

        // Update sender's Spark balance
        await db.query(
            `UPDATE user_wallets 
             SET spark_balance = spark_balance + 1.00,
                 total_earned = total_earned + 1.00,
                 updated_at = NOW()
             WHERE user_id = $1`,
            [senderId]
        );

        res.status(201).json({
            success: true,
            message: 'Message sent successfully',
            messageId: messageResult.rows[0].id,
            creditsEarned: 1.00
        });

    } catch (error) {
        console.error('Error sending direct message:', error);
        res.status(500).json({ error: 'Failed to send message.' });
    }
};

/**
 * Request a free networking/mentoring session (Tier-locked feature)
 * Only Ascendant tier users can request free sessions with other Ascendants
 */
const requestFreeSession = async (req, res) => {
    const requesterId = req.user.id;
    const { mentorId, sessionType, duration, preferredTime, description } = req.body;

    if (!mentorId || !sessionType) {
        return res.status(400).json({ error: 'Mentor ID and session type are required.' });
    }

    try {
        // Verify mentor exists and is also Ascendant tier
        const mentorQuery = await db.query(
            `SELECT u.id, u.username, u.role,
                    COALESCE(uw.spark_balance, 0) as balance
             FROM users u 
             LEFT JOIN user_wallets uw ON u.id = uw.user_id 
             WHERE u.id = $1`,
            [mentorId]
        );

        if (mentorQuery.rows.length === 0) {
            return res.status(404).json({ error: 'Mentor not found.' });
        }

        const mentor = mentorQuery.rows[0];
        const mentorBalance = parseFloat(mentor.balance);

        // Check if mentor is also Ascendant tier (≥20000 Sparks)
        if (mentorBalance < 20000) {
            return res.status(403).json({ 
                error: 'Free sessions are only available between Ascendant tier members.',
                mentorTier: mentorBalance >= 5000 ? 'contributor' : 'standard'
            });
        }

        // Insert session request
        const sessionResult = await db.query(
            `INSERT INTO session_requests (
                requester_id, mentor_id, session_type, duration, 
                preferred_time, description, status, is_free, created_at
             ) VALUES ($1, $2, $3, $4, $5, $6, 'pending', true, NOW())
             RETURNING *`,
            [
                requesterId, 
                mentorId, 
                sessionType, 
                duration || 30, 
                preferredTime, 
                description
            ]
        );

        // Log this activity for both users
        await db.query(
            `INSERT INTO spark_transactions (user_id, amount, transaction_type, description, related_activity)
             VALUES ($1, 5.00, 'earned', 'Requested networking session with Ascendant member', 'networking')`,
            [requesterId]
        );

        await db.query(
            `INSERT INTO spark_transactions (user_id, amount, transaction_type, description, related_activity)
             VALUES ($1, 5.00, 'earned', 'Received session request from Ascendant member', 'mentoring')`,
            [mentorId]
        );

        // Update both users' Spark balances
        await db.query(
            `UPDATE user_wallets 
             SET spark_balance = spark_balance + 5.00,
                 total_earned = total_earned + 5.00,
                 updated_at = NOW()
             WHERE user_id IN ($1, $2)`,
            [requesterId, mentorId]
        );

        res.status(201).json({
            success: true,
            message: 'Free session request sent successfully',
            sessionId: sessionResult.rows[0].id,
            creditsEarned: 5.00
        });

    } catch (error) {
        console.error('Error requesting free session:', error);
        res.status(500).json({ error: 'Failed to request session.' });
    }
};

/**
 * Request a paid mentoring session (Available to all tiers)
 * Users can spend Sparks or real money for mentor sessions
 */
const requestPaidSession = async (req, res) => {
    const requesterId = req.user.id;
    const { mentorId, sessionType, duration, preferredTime, description, paymentMethod, sparksToSpend } = req.body;

    if (!mentorId || !sessionType || !paymentMethod) {
        return res.status(400).json({ error: 'Mentor ID, session type, and payment method are required.' });
    }

    try {
        // Verify mentor exists
        const mentorQuery = await db.query('SELECT id, username, role FROM users WHERE id = $1', [mentorId]);
        if (mentorQuery.rows.length === 0) {
            return res.status(404).json({ error: 'Mentor not found.' });
        }

        let cost = 0;
        let sparksUsed = 0;

        if (paymentMethod === 'sparks') {
            // Check if user has enough Sparks
            const walletQuery = await db.query(
                'SELECT spark_balance FROM user_wallets WHERE user_id = $1',
                [requesterId]
            );
            
            if (walletQuery.rows.length === 0) {
                return res.status(400).json({ error: 'Wallet not found.' });
            }

            const balance = parseFloat(walletQuery.rows[0].spark_balance);
            const sessionCost = parseFloat(sparksToSpend) || (duration || 30) * 10; // 10 Sparks per minute

            if (balance < sessionCost) {
                return res.status(400).json({ 
                    error: 'Insufficient Sparks.',
                    required: sessionCost,
                    available: balance
                });
            }

            sparksUsed = sessionCost;
        }

        // Insert session request
        const sessionResult = await db.query(
            `INSERT INTO session_requests (
                requester_id, mentor_id, session_type, duration, 
                preferred_time, description, status, is_free, 
                payment_method, sparks_cost, created_at
             ) VALUES ($1, $2, $3, $4, $5, $6, 'pending', false, $7, $8, NOW())
             RETURNING *`,
            [
                requesterId, mentorId, sessionType, duration || 30,
                preferredTime, description, paymentMethod, sparksUsed
            ]
        );

        // If paying with Sparks, deduct them now
        if (paymentMethod === 'sparks' && sparksUsed > 0) {
            await db.query(
                `UPDATE user_wallets 
                 SET spark_balance = spark_balance - $1,
                     total_spent = total_spent + $1,
                     updated_at = NOW()
                 WHERE user_id = $2`,
                [sparksUsed, requesterId]
            );

            // Log the transaction
            await db.query(
                `INSERT INTO spark_transactions (user_id, amount, transaction_type, description, related_activity)
                 VALUES ($1, $2, 'spent', 'Paid for mentor session', 'mentor_session')`,
                [requesterId, -sparksUsed]
            );
        }

        res.status(201).json({
            success: true,
            message: 'Paid session request sent successfully',
            sessionId: sessionResult.rows[0].id,
            sparksSpent: sparksUsed
        });

    } catch (error) {
        console.error('Error requesting paid session:', error);
        res.status(500).json({ error: 'Failed to request session.' });
    }
};

/**
 * Get user's direct messages
 */
const getDirectMessages = async (req, res) => {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    try {
        const messagesQuery = await db.query(
            `SELECT dm.*, 
                    sender.username as sender_username,
                    recipient.username as recipient_username
             FROM direct_messages dm
             JOIN users sender ON dm.sender_id = sender.id
             JOIN users recipient ON dm.recipient_id = recipient.id
             WHERE dm.sender_id = $1 OR dm.recipient_id = $1
             ORDER BY dm.sent_at DESC
             LIMIT $2 OFFSET $3`,
            [userId, limit, offset]
        );

        res.json({
            messages: messagesQuery.rows,
            page: parseInt(page),
            hasMore: messagesQuery.rows.length === parseInt(limit)
        });

    } catch (error) {
        console.error('Error fetching direct messages:', error);
        res.status(500).json({ error: 'Failed to fetch messages.' });
    }
};

/**
 * Get user's tier information
 */
const getUserTierInfo = async (req, res) => {
    const userId = req.user.id;

    try {
        const { getUserTierInfo } = require('../middleware/tierMiddleware');
        const tierInfo = await getUserTierInfo(userId);
        
        res.json(tierInfo);

    } catch (error) {
        console.error('Error fetching tier info:', error);
        res.status(500).json({ error: 'Failed to fetch tier information.' });
    }
};

module.exports = {
    sendDirectMessage,
    requestFreeSession,
    requestPaidSession,
    getDirectMessages,
    getUserTierInfo
};