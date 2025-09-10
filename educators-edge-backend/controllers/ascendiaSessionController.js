// =================================================================
// ASCENDIA PLATFORM: Session Controller
// =================================================================
// Handles all mentorship marketplace session operations

const ascendiaSessionService = require('../services/ascendia_sessionService');
const paymentService = require('../services/paymentService');
const ascendiaScoringService = require('../services/ascendiaScoringService');

/**
 * Book a new mentoring session
 */
const bookSession = async (req, res) => {
    try {
        const {
            mentorId,
            sessionType,
            scheduledAt,
            durationMinutes = 60,
            timezone = 'UTC',
            sessionNotes,
            paymentMethod,
            amountUSD,
            amountSparks
        } = req.body;

        const menteeId = req.user.id;

        // Validation
        if (!mentorId || !sessionType || !scheduledAt) {
            return res.status(400).json({
                error: 'Missing required fields: mentorId, sessionType, scheduledAt'
            });
        }

        if (!paymentMethod || !['usd', 'sparks', 'free'].includes(paymentMethod)) {
            return res.status(400).json({
                error: 'Invalid payment method. Must be: usd, sparks, or free'
            });
        }

        // Prevent self-booking
        if (mentorId === menteeId) {
            return res.status(400).json({
                error: 'Cannot book session with yourself'
            });
        }

        const sessionData = {
            mentorId,
            menteeId,
            sessionType,
            scheduledAt,
            durationMinutes,
            timezone,
            sessionNotes,
            paymentMethod,
            amountUSD: paymentMethod === 'usd' ? amountUSD : 0,
            amountSparks: paymentMethod === 'sparks' ? amountSparks : 0
        };

        const result = await ascendiaSessionService.bookSession(sessionData);

        res.status(201).json(result);

    } catch (error) {
        console.error('Error in bookSession controller:', error);
        res.status(500).json({
            error: 'Failed to book session',
            details: error.message
        });
    }
};

/**
 * Confirm session by mentor
 */
const confirmSession = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const mentorId = req.user.id;
        const {
            meetingUrl,
            meetingPassword,
            mentorPrepNotes
        } = req.body;

        const confirmationData = {
            meetingUrl,
            meetingPassword,
            mentorPrepNotes
        };

        const result = await ascendiaSessionService.confirmSession(sessionId, mentorId, confirmationData);

        res.json(result);

    } catch (error) {
        console.error('Error in confirmSession controller:', error);
        res.status(500).json({
            error: 'Failed to confirm session',
            details: error.message
        });
    }
};

/**
 * Start session (marks as in-progress)
 */
const startSession = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const userId = req.user.id;

        const result = await ascendiaSessionService.startSession(sessionId, userId);

        res.json(result);

    } catch (error) {
        console.error('Error in startSession controller:', error);
        res.status(500).json({
            error: 'Failed to start session',
            details: error.message
        });
    }
};

/**
 * Complete session and release payment
 */
const completeSession = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const userId = req.user.id;
        const {
            mentorSummary,
            menteeFeedback,
            followUpRecommended = false,
            completedBy // 'mentor' or 'mentee'
        } = req.body;

        // Get session to determine user roles
        const sessionDetails = await ascendiaSessionService.getSessionDetails(sessionId, userId);
        const session = sessionDetails.session;

        let completionData;
        if (completedBy === 'mentor' && userId === session.mentor_id) {
            completionData = {
                mentorId: userId,
                menteeId: session.mentee_id,
                mentorSummary,
                menteeFeedback: session.mentee_feedback || '', // Keep existing feedback
                followUpRecommended
            };
        } else if (completedBy === 'mentee' && userId === session.mentee_id) {
            completionData = {
                mentorId: session.mentor_id,
                menteeId: userId,
                mentorSummary: session.mentor_summary || '', // Keep existing summary
                menteeFeedback,
                followUpRecommended
            };
        } else {
            return res.status(403).json({
                error: 'Unauthorized to complete this session'
            });
        }

        const result = await ascendiaSessionService.completeSession(sessionId, completionData);

        res.json(result);

    } catch (error) {
        console.error('Error in completeSession controller:', error);
        res.status(500).json({
            error: 'Failed to complete session',
            details: error.message
        });
    }
};

/**
 * Cancel session with refund handling
 */
const cancelSession = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const cancelledBy = req.user.id;
        const { reason } = req.body;

        if (!reason || reason.trim().length < 10) {
            return res.status(400).json({
                error: 'Cancellation reason is required (minimum 10 characters)'
            });
        }

        const result = await ascendiaSessionService.cancelSession(sessionId, cancelledBy, reason);

        res.json(result);

    } catch (error) {
        console.error('Error in cancelSession controller:', error);
        res.status(500).json({
            error: 'Failed to cancel session',
            details: error.message
        });
    }
};

/**
 * Get session details
 */
const getSessionDetails = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const userId = req.user.id;

        const result = await ascendiaSessionService.getSessionDetails(sessionId, userId);

        res.json(result);

    } catch (error) {
        console.error('Error in getSessionDetails controller:', error);
        res.status(500).json({
            error: 'Failed to get session details',
            details: error.message
        });
    }
};

/**
 * Get user's sessions (as mentor or mentee)
 */
const getUserSessions = async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            status,
            role, // 'mentor' or 'mentee' 
            limit = 20,
            offset = 0
        } = req.query;

        const filters = {
            status,
            role,
            limit: parseInt(limit),
            offset: parseInt(offset)
        };

        const result = await ascendiaSessionService.getUserSessions(userId, filters);

        res.json(result);

    } catch (error) {
        console.error('Error in getUserSessions controller:', error);
        res.status(500).json({
            error: 'Failed to get user sessions',
            details: error.message
        });
    }
};

/**
 * Submit session review
 */
const submitSessionReview = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const reviewerId = req.user.id;
        const {
            rating,
            reviewTitle,
            reviewText,
            communicationRating,
            expertiseRating,
            helpfulnessRating
        } = req.body;

        // Validation
        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({
                error: 'Rating is required and must be between 1 and 5'
            });
        }

        // Get session details to determine reviewed user
        const sessionDetails = await ascendiaSessionService.getSessionDetails(sessionId, reviewerId);
        const session = sessionDetails.session;

        // Determine who is being reviewed
        let reviewedUserId;
        if (reviewerId === session.mentor_id) {
            reviewedUserId = session.mentee_id;
        } else if (reviewerId === session.mentee_id) {
            reviewedUserId = session.mentor_id;
        } else {
            return res.status(403).json({
                error: 'You can only review sessions you participated in'
            });
        }

        // Check if session is completed
        if (session.status !== 'completed') {
            return res.status(400).json({
                error: 'Can only review completed sessions'
            });
        }

        // Create review
        const db = require('../db');
        const reviewResult = await db.query(`
            INSERT INTO reviews (
                session_id, reviewer_id, reviewed_user_id,
                rating, review_title, review_text,
                communication_rating, expertise_rating, helpfulness_rating,
                is_verified
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
            RETURNING *
        `, [
            sessionId, reviewerId, reviewedUserId,
            rating, reviewTitle, reviewText,
            communicationRating, expertiseRating, helpfulnessRating
        ]);

        const review = reviewResult.rows[0];

        // Update reviewed user's profile ratings
        await db.query(`
            UPDATE user_profiles 
            SET 
                average_rating = (
                    SELECT ROUND(AVG(rating)::numeric, 2)
                    FROM reviews 
                    WHERE reviewed_user_id = $1 AND is_public = true
                ),
                total_reviews = (
                    SELECT COUNT(*) 
                    FROM reviews 
                    WHERE reviewed_user_id = $1 AND is_public = true
                ),
                updated_at = CURRENT_TIMESTAMP
            WHERE user_id = $1
        `, [reviewedUserId]);

        // Award points for positive review (if mentor received good rating)
        if (reviewedUserId === session.mentor_id && rating >= 4) {
            await ascendiaScoringService.awardActivityPoints(reviewedUserId, 'positive_mentor_review', {
                rating,
                sessionId
            });
        }

        res.status(201).json({
            success: true,
            review,
            message: 'Review submitted successfully'
        });

    } catch (error) {
        if (error.code === '23505') { // Unique constraint violation
            return res.status(400).json({
                error: 'You have already reviewed this session'
            });
        }

        console.error('Error in submitSessionReview controller:', error);
        res.status(500).json({
            error: 'Failed to submit review',
            details: error.message
        });
    }
};

/**
 * Get mentor's availability and booking slots
 */
const getMentorAvailability = async (req, res) => {
    try {
        const { mentorId } = req.params;
        const { date, timezone = 'UTC' } = req.query;

        const db = require('../db');

        // Get mentor profile and availability settings
        const mentorResult = await db.query(`
            SELECT 
                mp.*,
                up.availability_status,
                up.user_tier,
                up.display_name
            FROM mentor_profiles mp
            JOIN user_profiles up ON mp.user_id = up.user_id
            WHERE mp.user_id = $1 AND up.availability_status IN ('available', 'busy')
        `, [mentorId]);

        if (mentorResult.rows.length === 0) {
            return res.status(404).json({
                error: 'Mentor not found or unavailable'
            });
        }

        const mentor = mentorResult.rows[0];

        // Get existing sessions for the date (if provided)
        let existingSessions = [];
        if (date) {
            const sessionResult = await db.query(`
                SELECT scheduled_at, duration_minutes
                FROM sessions
                WHERE mentor_id = $1 
                AND DATE(scheduled_at AT TIME ZONE $2) = DATE($3::timestamp AT TIME ZONE $2)
                AND status IN ('pending', 'confirmed', 'in_progress')
            `, [mentorId, timezone, date]);

            existingSessions = sessionResult.rows;
        }

        // Generate available time slots (simple implementation)
        const availableSlots = this.generateAvailableSlots(
            mentor.availability_schedule,
            existingSessions,
            date,
            timezone
        );

        res.json({
            success: true,
            mentor: {
                id: mentorId,
                name: mentor.display_name,
                specialties: mentor.specialties,
                sessionRates: {
                    sparks: mentor.session_rate_sparks,
                    usd: mentor.session_rate_usd
                },
                availableDurations: mentor.session_duration_minutes,
                maxSessionsPerDay: mentor.max_sessions_per_day,
                advanceBookingDays: mentor.advance_booking_days,
                cancellationPolicy: mentor.cancellation_policy,
                instantBookingEnabled: mentor.instant_booking_enabled
            },
            availability: {
                status: mentor.availability_status,
                availableSlots,
                timezone,
                date
            }
        });

    } catch (error) {
        console.error('Error in getMentorAvailability controller:', error);
        res.status(500).json({
            error: 'Failed to get mentor availability',
            details: error.message
        });
    }
};

/**
 * Handle Stripe webhook events
 */
const handleStripeWebhook = async (req, res) => {
    try {
        const signature = req.headers['stripe-signature'];
        
        // Verify webhook signature
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
        let event;

        try {
            event = stripe.webhooks.constructEvent(
                req.body,
                signature,
                process.env.STRIPE_WEBHOOK_SECRET
            );
        } catch (err) {
            console.error('Webhook signature verification failed:', err);
            return res.status(400).json({ error: 'Invalid signature' });
        }

        // Handle the event
        const result = await paymentService.handleStripeWebhook(event);

        res.json({ success: true, result });

    } catch (error) {
        console.error('Error handling Stripe webhook:', error);
        res.status(500).json({
            error: 'Webhook handling failed',
            details: error.message
        });
    }
};

/**
 * Get session analytics for mentors
 */
const getSessionAnalytics = async (req, res) => {
    try {
        const mentorId = req.user.id;
        const { timeframe = '30' } = req.query; // days

        const db = require('../db');

        // Get session statistics
        const statsResult = await db.query(`
            SELECT 
                COUNT(*) as total_sessions,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_sessions,
                COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_sessions,
                COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '${timeframe} days' THEN 1 END) as recent_sessions,
                AVG(CASE WHEN status = 'completed' THEN duration_minutes END) as avg_session_duration,
                SUM(CASE WHEN status = 'completed' AND payment_method = 'usd' THEN amount_usd ELSE 0 END) as total_earnings_usd,
                SUM(CASE WHEN status = 'completed' AND payment_method = 'sparks' THEN amount_sparks ELSE 0 END) as total_earnings_sparks
            FROM sessions
            WHERE mentor_id = $1
        `, [mentorId]);

        // Get review statistics
        const reviewStatsResult = await db.query(`
            SELECT 
                COUNT(*) as total_reviews,
                AVG(rating) as average_rating,
                AVG(communication_rating) as avg_communication,
                AVG(expertise_rating) as avg_expertise,
                AVG(helpfulness_rating) as avg_helpfulness
            FROM reviews
            WHERE reviewed_user_id = $1 AND session_id IS NOT NULL
        `, [mentorId]);

        // Get popular session types
        const sessionTypesResult = await db.query(`
            SELECT 
                session_type,
                COUNT(*) as count,
                AVG(
                    CASE WHEN r.rating IS NOT NULL THEN r.rating ELSE 0 END
                ) as avg_rating
            FROM sessions s
            LEFT JOIN reviews r ON s.id = r.session_id AND r.reviewed_user_id = $1
            WHERE s.mentor_id = $1 AND s.status = 'completed'
            GROUP BY session_type
            ORDER BY count DESC
        `, [mentorId]);

        res.json({
            success: true,
            analytics: {
                overview: statsResult.rows[0],
                reviews: reviewStatsResult.rows[0],
                sessionTypes: sessionTypesResult.rows,
                timeframe: `${timeframe} days`
            },
            generatedAt: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error in getSessionAnalytics controller:', error);
        res.status(500).json({
            error: 'Failed to get session analytics',
            details: error.message
        });
    }
};

/**
 * Generate available time slots (helper function)
 * @private
 */
function generateAvailableSlots(availabilitySchedule, existingSessions, date, timezone) {
    // Simplified implementation - in production, this would be more sophisticated
    // with proper timezone handling, recurring schedules, etc.
    
    if (!date) {
        return [];
    }

    // Generate hourly slots from 9 AM to 6 PM as example
    const slots = [];
    for (let hour = 9; hour <= 18; hour++) {
        const slotTime = `${date}T${hour.toString().padStart(2, '0')}:00:00`;
        
        // Check if slot conflicts with existing session
        const hasConflict = existingSessions.some(session => {
            const sessionStart = new Date(session.scheduled_at);
            const sessionEnd = new Date(sessionStart.getTime() + session.duration_minutes * 60000);
            const slotStart = new Date(slotTime);
            const slotEnd = new Date(slotStart.getTime() + 60 * 60000); // 1 hour slot
            
            return (slotStart < sessionEnd && slotEnd > sessionStart);
        });

        if (!hasConflict) {
            slots.push({
                time: slotTime,
                available: true,
                duration: 60 // minutes
            });
        }
    }

    return slots;
}

module.exports = {
    bookSession,
    confirmSession,
    startSession,
    completeSession,
    cancelSession,
    getSessionDetails,
    getUserSessions,
    submitSessionReview,
    getMentorAvailability,
    handleStripeWebhook,
    getSessionAnalytics
};