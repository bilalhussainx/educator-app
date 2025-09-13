const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const db = require('../db');

// @route   POST /api/messages
// @desc    Send a message between teacher and student
// @access  Private
router.post('/', verifyToken, async (req, res) => {
    try {
        const { to_user_id, message, session_id } = req.body;
        const from_user_id = req.user.id;

        // Validate required fields
        if (!to_user_id || !message || !message.trim()) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: to_user_id and message are required'
            });
        }

        // Prevent sending messages to yourself
        if (from_user_id === to_user_id) {
            return res.status(400).json({
                success: false,
                error: 'Cannot send message to yourself'
            });
        }

        // Check if users exist and validate relationship
        const usersQuery = await db.query(`
            SELECT 
                u1.id as from_id, u1.username as from_username, up1.display_name as from_display_name,
                u2.id as to_id, u2.username as to_username, up2.display_name as to_display_name
            FROM users u1
            CROSS JOIN users u2
            LEFT JOIN user_profiles up1 ON u1.id = up1.user_id
            LEFT JOIN user_profiles up2 ON u2.id = up2.user_id
            WHERE u1.id = $1 AND u2.id = $2
        `, [from_user_id, to_user_id]);

        if (usersQuery.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'One or both users not found'
            });
        }

        // If session_id provided, validate user has access to this session
        if (session_id) {
            const sessionQuery = await db.query(`
                SELECT * FROM sessions 
                WHERE id = $1 AND (student_id = $2 OR mentor_id = $2)
            `, [session_id, from_user_id]);

            if (sessionQuery.rows.length === 0) {
                return res.status(403).json({
                    success: false,
                    error: 'You do not have access to this session'
                });
            }
        }

        // Create the message
        const messageResult = await db.query(`
            INSERT INTO messages (
                from_user_id, 
                to_user_id, 
                message, 
                session_id, 
                created_at
            ) VALUES ($1, $2, $3, $4, NOW())
            RETURNING *
        `, [from_user_id, to_user_id, message.trim(), session_id]);

        res.json({
            success: true,
            message: 'Message sent successfully',
            messageData: {
                id: messageResult.rows[0].id,
                message: messageResult.rows[0].message,
                created_at: messageResult.rows[0].created_at
            }
        });

    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to send message'
        });
    }
});

// @route   GET /api/messages
// @desc    Get messages for the authenticated user
// @access  Private
router.get('/', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { session_id, with_user_id } = req.query;

        let query = `
            SELECT m.*, 
                   from_user.username as from_username,
                   from_profile.display_name as from_display_name,
                   to_user.username as to_username,
                   to_profile.display_name as to_display_name,
                   s.session_type, s.description as session_description
            FROM messages m
            JOIN users from_user ON m.from_user_id = from_user.id
            LEFT JOIN user_profiles from_profile ON from_user.id = from_profile.user_id
            JOIN users to_user ON m.to_user_id = to_user.id
            LEFT JOIN user_profiles to_profile ON to_user.id = to_profile.user_id
            LEFT JOIN sessions s ON m.session_id = s.id
            WHERE (m.from_user_id = $1 OR m.to_user_id = $1)
        `;
        
        let params = [userId];
        let paramCount = 1;

        // Filter by session if provided
        if (session_id) {
            paramCount++;
            query += ` AND m.session_id = $${paramCount}`;
            params.push(session_id);
        }

        // Filter by conversation partner if provided
        if (with_user_id) {
            paramCount++;
            query += ` AND ((m.from_user_id = $${paramCount} AND m.to_user_id = $1) OR (m.from_user_id = $1 AND m.to_user_id = $${paramCount}))`;
            params.push(with_user_id);
        }

        query += ` ORDER BY m.created_at DESC`;

        const result = await db.query(query, params);

        res.json({
            success: true,
            messages: result.rows
        });

    } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get messages'
        });
    }
});

// @route   GET /api/messages/conversations
// @desc    Get conversation threads for the authenticated user
// @access  Private
router.get('/conversations', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;

        const query = `
            SELECT DISTINCT
                CASE 
                    WHEN m.from_user_id = $1 THEN m.to_user_id
                    ELSE m.from_user_id 
                END as other_user_id,
                CASE 
                    WHEN m.from_user_id = $1 THEN to_user.username
                    ELSE from_user.username 
                END as other_username,
                CASE 
                    WHEN m.from_user_id = $1 THEN to_profile.display_name
                    ELSE from_profile.display_name 
                END as other_display_name,
                MAX(m.created_at) as last_message_time,
                COUNT(*) as message_count,
                (
                    SELECT message 
                    FROM messages m2 
                    WHERE ((m2.from_user_id = $1 AND m2.to_user_id = (CASE WHEN m.from_user_id = $1 THEN m.to_user_id ELSE m.from_user_id END))
                           OR (m2.to_user_id = $1 AND m2.from_user_id = (CASE WHEN m.from_user_id = $1 THEN m.to_user_id ELSE m.from_user_id END)))
                    ORDER BY m2.created_at DESC 
                    LIMIT 1
                ) as last_message
            FROM messages m
            JOIN users from_user ON m.from_user_id = from_user.id
            LEFT JOIN user_profiles from_profile ON from_user.id = from_profile.user_id
            JOIN users to_user ON m.to_user_id = to_user.id
            LEFT JOIN user_profiles to_profile ON to_user.id = to_profile.user_id
            WHERE (m.from_user_id = $1 OR m.to_user_id = $1)
            GROUP BY 
                CASE WHEN m.from_user_id = $1 THEN m.to_user_id ELSE m.from_user_id END,
                CASE WHEN m.from_user_id = $1 THEN to_user.username ELSE from_user.username END,
                CASE WHEN m.from_user_id = $1 THEN to_profile.display_name ELSE from_profile.display_name END
            ORDER BY last_message_time DESC
        `;

        const result = await db.query(query, [userId]);

        res.json({
            success: true,
            conversations: result.rows
        });

    } catch (error) {
        console.error('Get conversations error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get conversations'
        });
    }
});

// @route   PUT /api/messages/:messageId/read
// @desc    Mark message as read
// @access  Private
router.put('/:messageId/read', verifyToken, async (req, res) => {
    try {
        const { messageId } = req.params;
        const userId = req.user.id;

        // Only the recipient can mark a message as read
        const result = await db.query(`
            UPDATE messages 
            SET read_at = NOW() 
            WHERE id = $1 AND to_user_id = $2 AND read_at IS NULL
            RETURNING *
        `, [messageId, userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Message not found or already read'
            });
        }

        res.json({
            success: true,
            message: 'Message marked as read'
        });

    } catch (error) {
        console.error('Mark message as read error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to mark message as read'
        });
    }
});

module.exports = router;