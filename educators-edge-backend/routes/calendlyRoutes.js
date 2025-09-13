const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const calendlyService = require('../services/calendlyService');
const db = require('../db');

// @route   POST /api/calendly/webhook
// @desc    Handle Calendly webhooks for real-time updates
// @access  Public (but verified via signature)
router.post('/webhook', async (req, res) => {
    try {
        const signature = req.headers['calendly-webhook-signature'];
        const payload = req.body;

        console.log('Received Calendly webhook:', payload.event);

        const result = await calendlyService.processWebhook(payload, signature);
        
        if (result.success) {
            res.status(200).json({ message: 'Webhook processed successfully' });
        } else {
            res.status(400).json({ error: result.error });
        }
    } catch (error) {
        console.error('Calendly webhook error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// @route   GET /api/calendly/user-info
// @desc    Get authenticated user's Calendly information
// @access  Private
router.get('/user-info', verifyToken, async (req, res) => {
    try {
        const { calendly_access_token } = req.user;
        
        if (!calendly_access_token) {
            return res.status(400).json({
                success: false,
                message: 'User not connected to Calendly'
            });
        }

        const result = await calendlyService.getUserInfo(calendly_access_token);
        res.json(result);
    } catch (error) {
        console.error('Get Calendly user info error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get user info'
        });
    }
});

// @route   GET /api/calendly/event-types/:userId
// @desc    Get user's available Calendly event types
// @access  Private
router.get('/event-types/:userId', verifyToken, async (req, res) => {
    try {
        const { userId } = req.params;
        
        // Get user's Calendly access token
        const userResult = await db.query(
            `SELECT calendly_access_token, calendly_user_uri FROM users WHERE id = $1`,
            [userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const { calendly_access_token, calendly_user_uri } = userResult.rows[0];
        
        if (!calendly_access_token || !calendly_user_uri) {
            return res.status(400).json({
                success: false,
                message: 'User not connected to Calendly'
            });
        }

        const result = await calendlyService.getEventTypes(calendly_access_token, calendly_user_uri);
        res.json(result);
    } catch (error) {
        console.error('Get event types error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get event types'
        });
    }
});

// @route   GET /api/calendly/availability/:userId
// @desc    Get user's availability from Calendly
// @access  Private
router.get('/availability/:userId', verifyToken, async (req, res) => {
    try {
        const { userId } = req.params;
        const { startDate, endDate } = req.query;
        
        // Get user's Calendly access token
        const userResult = await db.query(
            `SELECT calendly_access_token, calendly_user_uri FROM users WHERE id = $1`,
            [userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const { calendly_access_token, calendly_user_uri } = userResult.rows[0];
        
        if (!calendly_access_token || !calendly_user_uri) {
            return res.status(400).json({
                success: false,
                message: 'User not connected to Calendly'
            });
        }

        const result = await calendlyService.getUserAvailability(
            calendly_access_token, 
            calendly_user_uri, 
            startDate, 
            endDate
        );
        
        res.json(result);
    } catch (error) {
        console.error('Get availability error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get availability'
        });
    }
});

// @route   GET /api/calendly/events/:userId
// @desc    Get user's scheduled Calendly events
// @access  Private
router.get('/events/:userId', verifyToken, async (req, res) => {
    try {
        const { userId } = req.params;
        const { startDate, endDate, count = 50 } = req.query;
        
        // Get user's Calendly access token
        const userResult = await db.query(
            `SELECT calendly_access_token, calendly_user_uri FROM users WHERE id = $1`,
            [userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const { calendly_access_token, calendly_user_uri } = userResult.rows[0];
        
        if (!calendly_access_token || !calendly_user_uri) {
            return res.status(400).json({
                success: false,
                message: 'User not connected to Calendly'
            });
        }

        const options = { count: parseInt(count) };
        if (startDate) options.min_start_time = startDate;
        if (endDate) options.max_start_time = endDate;

        const result = await calendlyService.getScheduledEvents(
            calendly_access_token, 
            calendly_user_uri, 
            options
        );
        
        res.json(result);
    } catch (error) {
        console.error('Get events error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get events'
        });
    }
});

// @route   POST /api/calendly/cancel-event/:eventId
// @desc    Cancel a Calendly event
// @access  Private
router.post('/cancel-event/:eventId', verifyToken, async (req, res) => {
    try {
        const { eventId } = req.params;
        const { reason } = req.body;
        const { calendly_access_token } = req.user;
        
        if (!calendly_access_token) {
            return res.status(400).json({
                success: false,
                message: 'User not connected to Calendly'
            });
        }

        const result = await calendlyService.cancelEvent(calendly_access_token, eventId, reason);
        res.json(result);
    } catch (error) {
        console.error('Cancel event error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to cancel event'
        });
    }
});

// @route   POST /api/calendly/connect
// @desc    Connect user's Calendly account (OAuth flow would handle this)
// @access  Private
router.post('/connect', verifyToken, async (req, res) => {
    try {
        const { calendly_url, access_token, user_uri } = req.body;
        const userId = req.user.id;

        // Update user profile with Calendly information
        await db.query(
            `UPDATE users 
             SET calendly_access_token = $1, calendly_user_uri = $2 
             WHERE id = $3`,
            [access_token, user_uri, userId]
        );

        // Update user profile with Calendly URL
        await db.query(
            `UPDATE user_profiles 
             SET calendly_url = $1 
             WHERE user_id = $2`,
            [calendly_url, userId]
        );

        res.json({
            success: true,
            message: 'Calendly account connected successfully'
        });
    } catch (error) {
        console.error('Connect Calendly error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to connect Calendly account'
        });
    }
});

// @route   GET /api/calendly/generate-url/:userId
// @desc    Generate dynamic Calendly URL with prefilled data
// @access  Private
router.get('/generate-url/:userId', verifyToken, async (req, res) => {
    try {
        const { userId } = req.params;
        const { sessionType, studentName, studentEmail } = req.query;
        
        // Get user's Calendly URL
        const userResult = await db.query(
            `SELECT up.calendly_url, u.username, up.display_name 
             FROM user_profiles up 
             JOIN users u ON up.user_id = u.id 
             WHERE u.id = $1`,
            [userId]
        );

        if (userResult.rows.length === 0 || !userResult.rows[0].calendly_url) {
            return res.status(404).json({
                success: false,
                message: 'User Calendly URL not found'
            });
        }

        const { calendly_url } = userResult.rows[0];
        
        // Generate dynamic URL with prefilled data
        const dynamicUrl = calendlyService.generateCalendlyURL(calendly_url, {
            utm: {
                source: 'trustgraph-educators-edge',
                medium: 'platform',
                campaign: 'session-booking'
            },
            prefill: {
                name: studentName,
                email: studentEmail,
                custom_1: sessionType
            },
            embed: {
                domain: req.get('host'),
                type: 'Inline'
            }
        });

        res.json({
            success: true,
            url: dynamicUrl
        });
    } catch (error) {
        console.error('Generate URL error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate Calendly URL'
        });
    }
});

// @route   GET /api/calendly/user/:userId
// @desc    Get user's Calendly URL (for teachers/mentors)  
// @access  Private
router.get('/user/:userId', verifyToken, async (req, res) => {
    try {
        const { userId } = req.params;
        
        // Get user's Calendly URL from profile
        const result = await db.query(`
            SELECT calendly_url, is_mentor, is_teacher
            FROM user_profiles 
            WHERE user_id = $1
        `, [userId]);
        
        const profile = result.rows[0];
        
        if (!profile) {
            return res.status(404).json({
                success: false,
                error: 'User profile not found'
            });
        }
        
        // Check if user is a teacher/mentor (they're the ones who need Calendly)
        const isEducator = profile.is_mentor || profile.is_teacher;
        
        res.json({
            success: true,
            calendlyUrl: profile.calendly_url || null,
            isEducator: isEducator,
            needsSetup: isEducator && !profile.calendly_url,
            message: isEducator 
                ? (profile.calendly_url 
                    ? 'Calendly URL configured' 
                    : 'Please set up your Calendly URL to receive bookings'
                )
                : 'Students don\'t need Calendly URLs - you book through teachers\' calendars'
        });
    } catch (error) {
        console.error('Get Calendly URL error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get Calendly URL'
        });
    }
});

// @route   PUT /api/calendly/user/:userId  
// @desc    Update user's Calendly URL (teachers/mentors only)
// @access  Private
router.put('/user/:userId', verifyToken, async (req, res) => {
    try {
        const { userId } = req.params;
        const { calendlyUrl } = req.body;
        
        // Only allow user to update their own Calendly URL
        if (req.user.id !== userId) {
            return res.status(403).json({
                success: false,
                error: 'Can only update your own Calendly URL'
            });
        }
        
        // Get user role to check if they should have Calendly
        const userResult = await db.query(`
            SELECT is_mentor, is_teacher 
            FROM user_profiles 
            WHERE user_id = $1
        `, [userId]);
        
        const profile = userResult.rows[0];
        if (!profile) {
            return res.status(404).json({
                success: false,
                error: 'User profile not found'
            });
        }
        
        const isEducator = profile.is_mentor || profile.is_teacher;
        if (!isEducator) {
            return res.status(400).json({
                success: false,
                error: 'Only teachers and mentors can set Calendly URLs. Students book through teachers\' calendars.',
                tip: 'If you want to become a teacher, please update your profile role first.'
            });
        }
        
        // Validate Calendly URL format if provided
        if (calendlyUrl) {
            if (!calendlyUrl.includes('calendly.com')) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid Calendly URL format. Must be from calendly.com',
                    example: 'https://calendly.com/your-username/30min'
                });
            }
            
            // Basic URL validation
            try {
                new URL(calendlyUrl);
            } catch {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid URL format'
                });
            }
        }
        
        // Update user's profile with Calendly URL
        await db.query(`
            UPDATE user_profiles 
            SET calendly_url = $2, updated_at = NOW()
            WHERE user_id = $1
        `, [userId, calendlyUrl]);
        
        res.json({
            success: true,
            message: calendlyUrl 
                ? 'Calendly URL updated successfully! Students can now book sessions with you.'
                : 'Calendly URL removed. Students will need to send manual booking requests.',
            calendlyUrl: calendlyUrl
        });
    } catch (error) {
        console.error('Update Calendly URL error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update Calendly URL'
        });
    }
});

module.exports = router;