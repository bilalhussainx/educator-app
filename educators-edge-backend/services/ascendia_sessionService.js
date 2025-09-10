// =================================================================
// ASCENDIA PLATFORM: Session Service with Booking & Escrow
// =================================================================
// Implements the complete "Session Workflow" for the mentorship marketplace

const db = require('../db');
const paymentService = require('./paymentService');

class AscendiaSessionService {

    /**
     * Book a new mentoring session
     * @param {object} sessionData - Session booking information
     * @returns {object} - Created session details
     */
    async bookSession(sessionData) {
        const {
            mentorId,
            menteeId,
            sessionType,
            scheduledAt,
            durationMinutes,
            timezone,
            sessionNotes,
            paymentMethod,
            amountUSD,
            amountSparks
        } = sessionData;

        try {
            await db.query('BEGIN');

            // Validate mentor availability
            const mentorCheck = await db.query(`
                SELECT mp.*, up.availability_status, up.user_tier
                FROM mentor_profiles mp
                JOIN user_profiles up ON mp.user_id = up.user_id
                WHERE mp.user_id = $1 AND up.availability_status IN ('available', 'busy')
            `, [mentorId]);

            if (mentorCheck.rows.length === 0) {
                throw new Error('Mentor not available for booking');
            }

            const mentor = mentorCheck.rows[0];

            // Check for scheduling conflicts
            const conflictCheck = await db.query(`
                SELECT id FROM sessions
                WHERE mentor_id = $1 
                AND status IN ('pending', 'confirmed', 'in_progress')
                AND ABS(EXTRACT(EPOCH FROM (scheduled_at - $2::timestamp))) < $3 * 60
            `, [mentorId, scheduledAt, durationMinutes]);

            if (conflictCheck.rows.length > 0) {
                throw new Error('Mentor has a scheduling conflict at this time');
            }

            // Validate session rate matches mentor's rates
            const expectedRateUSD = mentor.session_rate_usd || 0;
            const expectedRateSparks = mentor.session_rate_sparks || 0;

            if (paymentMethod === 'usd' && amountUSD !== expectedRateUSD) {
                throw new Error(`Invalid USD amount. Expected: $${expectedRateUSD}`);
            }

            if (paymentMethod === 'sparks' && amountSparks !== expectedRateSparks) {
                throw new Error(`Invalid Sparks amount. Expected: ${expectedRateSparks} Sparks`);
            }

            // Create session record
            const sessionResult = await db.query(`
                INSERT INTO sessions (
                    mentor_id, mentee_id, session_type, scheduled_at, 
                    duration_minutes, timezone, session_notes, 
                    payment_method, amount_usd, amount_sparks,
                    status, payment_status
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending', 'pending')
                RETURNING *
            `, [
                mentorId, menteeId, sessionType, scheduledAt,
                durationMinutes, timezone, sessionNotes,
                paymentMethod, amountUSD || 0, amountSparks || 0
            ]);

            const session = sessionResult.rows[0];

            // Process payment based on method
            let paymentResult;
            if (paymentMethod === 'usd' && amountUSD > 0) {
                // Create Stripe checkout session
                paymentResult = await paymentService.createCheckoutSession({
                    sessionId: session.id,
                    mentorId,
                    menteeId,
                    amountUSD,
                    amountSparks: 0,
                    paymentMethod: 'usd'
                });
            } else if (paymentMethod === 'sparks' && amountSparks > 0) {
                // Process Sparks payment immediately
                paymentResult = await this.processSparksPayment(session.id, menteeId, amountSparks);
            } else {
                // Free session
                paymentResult = { success: true, message: 'Free session booked' };
                await db.query(`
                    UPDATE sessions SET payment_status = 'completed' WHERE id = $1
                `, [session.id]);
            }

            await db.query('COMMIT');

            // Send notifications
            await this.sendSessionNotifications(session.id, 'booked');

            return {
                success: true,
                session: {
                    ...session,
                    payment: paymentResult
                },
                message: 'Session booked successfully'
            };

        } catch (error) {
            await db.query('ROLLBACK');
            console.error('Error booking session:', error);
            throw new Error(`Failed to book session: ${error.message}`);
        }
    }

    /**
     * Process Sparks payment for session
     * @private
     */
    async processSparksPayment(sessionId, menteeId, amountSparks) {
        try {
            // Check mentee's Spark balance
            const walletResult = await db.query(`
                SELECT spark_balance FROM user_wallets WHERE user_id = $1
            `, [menteeId]);

            if (walletResult.rows.length === 0) {
                throw new Error('Wallet not found');
            }

            const currentBalance = walletResult.rows[0].spark_balance;
            if (currentBalance < amountSparks) {
                throw new Error(`Insufficient Sparks. Balance: ${currentBalance}, Required: ${amountSparks}`);
            }

            // Move Sparks to escrow
            await db.query(`
                UPDATE user_wallets 
                SET spark_balance = spark_balance - $1,
                    escrow_balance_sparks = escrow_balance_sparks + $1,
                    total_spent_sparks = total_spent_sparks + $1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = $2
            `, [amountSparks, menteeId]);

            // Record transaction
            await db.query(`
                INSERT INTO transactions (
                    user_id, transaction_type, amount_sparks, currency_type,
                    description, reference_id, reference_type, status,
                    balance_after_sparks
                ) VALUES ($1, 'spend', $2, 'sparks', $3, $4, 'session', 'completed',
                    (SELECT spark_balance FROM user_wallets WHERE user_id = $1))
            `, [
                menteeId, amountSparks, 
                `Payment for mentoring session`,
                sessionId
            ]);

            // Update session payment status
            await db.query(`
                UPDATE sessions SET payment_status = 'escrowed' WHERE id = $1
            `, [sessionId]);

            return {
                success: true,
                message: 'Sparks payment processed and escrowed',
                amountSparks,
                newBalance: currentBalance - amountSparks
            };

        } catch (error) {
            console.error('Error processing Sparks payment:', error);
            throw error;
        }
    }

    /**
     * Confirm session by mentor
     * @param {string} sessionId - Session ID
     * @param {string} mentorId - Mentor user ID
     * @param {object} confirmationData - Meeting details
     * @returns {object} - Confirmation result
     */
    async confirmSession(sessionId, mentorId, confirmationData = {}) {
        try {
            const { meetingUrl, meetingPassword, mentorPrepNotes } = confirmationData;

            // Verify session belongs to mentor and is in pending status
            const sessionResult = await db.query(`
                SELECT * FROM sessions
                WHERE id = $1 AND mentor_id = $2 AND status = 'pending'
            `, [sessionId, mentorId]);

            if (sessionResult.rows.length === 0) {
                throw new Error('Session not found or already confirmed');
            }

            // Update session status
            const updatedSession = await db.query(`
                UPDATE sessions 
                SET status = 'confirmed',
                    meeting_url = $1,
                    meeting_password = $2,
                    mentor_prep_notes = $3,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $4
                RETURNING *
            `, [meetingUrl, meetingPassword, mentorPrepNotes, sessionId]);

            // Send confirmation notifications
            await this.sendSessionNotifications(sessionId, 'confirmed');

            return {
                success: true,
                session: updatedSession.rows[0],
                message: 'Session confirmed successfully'
            };

        } catch (error) {
            console.error('Error confirming session:', error);
            throw new Error(`Failed to confirm session: ${error.message}`);
        }
    }

    /**
     * Start session (marks as in-progress)
     * @param {string} sessionId - Session ID
     * @param {string} userId - User ID (mentor or mentee)
     * @returns {object} - Session start result
     */
    async startSession(sessionId, userId) {
        try {
            // Verify user is participant in session
            const sessionResult = await db.query(`
                SELECT * FROM sessions
                WHERE id = $1 AND (mentor_id = $2 OR mentee_id = $2) 
                AND status = 'confirmed'
            `, [sessionId, userId]);

            if (sessionResult.rows.length === 0) {
                throw new Error('Session not found or not ready to start');
            }

            const session = sessionResult.rows[0];

            // Check if session time is appropriate (within 15 minutes of scheduled time)
            const now = new Date();
            const scheduledTime = new Date(session.scheduled_at);
            const timeDifference = Math.abs(now - scheduledTime) / (1000 * 60); // minutes

            if (timeDifference > 15) {
                throw new Error('Session can only be started within 15 minutes of scheduled time');
            }

            // Update session status
            await db.query(`
                UPDATE sessions 
                SET status = 'in_progress',
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
            `, [sessionId]);

            return {
                success: true,
                message: 'Session started successfully',
                sessionId,
                meetingUrl: session.meeting_url
            };

        } catch (error) {
            console.error('Error starting session:', error);
            throw new Error(`Failed to start session: ${error.message}`);
        }
    }

    /**
     * Complete session and release payment
     * @param {string} sessionId - Session ID
     * @param {object} completionData - Session completion details
     * @returns {object} - Completion result
     */
    async completeSession(sessionId, completionData) {
        const { 
            mentorId, 
            menteeId, 
            mentorSummary, 
            menteeFeedback, 
            followUpRecommended 
        } = completionData;

        try {
            await db.query('BEGIN');

            // Verify session exists and is in progress
            const sessionResult = await db.query(`
                SELECT * FROM sessions
                WHERE id = $1 AND status = 'in_progress'
                AND mentor_id = $2 AND mentee_id = $3
            `, [sessionId, mentorId, menteeId]);

            if (sessionResult.rows.length === 0) {
                throw new Error('Session not found or not in progress');
            }

            const session = sessionResult.rows[0];

            // Update session with completion data
            await db.query(`
                UPDATE sessions 
                SET status = 'completed',
                    completion_confirmed_by_mentor = true,
                    completion_confirmed_by_mentee = true,
                    mentor_summary = $1,
                    mentee_feedback = $2,
                    follow_up_recommended = $3,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $4
            `, [mentorSummary, menteeFeedback, followUpRecommended, sessionId]);

            // Release payment based on method
            let paymentResult;
            if (session.payment_method === 'usd' && session.amount_usd > 0) {
                paymentResult = await paymentService.releaseEscrowPayment(sessionId, mentorId);
            } else if (session.payment_method === 'sparks' && session.amount_sparks > 0) {
                paymentResult = await this.releaseSparksPayment(sessionId, mentorId, session.amount_sparks);
            } else {
                paymentResult = { success: true, message: 'Free session completed' };
            }

            // Add Ascendia pillar points for completion
            await this.awardSessionCompletionPoints(mentorId, menteeId, session);

            await db.query('COMMIT');

            // Send completion notifications
            await this.sendSessionNotifications(sessionId, 'completed');

            return {
                success: true,
                message: 'Session completed successfully',
                sessionId,
                payment: paymentResult
            };

        } catch (error) {
            await db.query('ROLLBACK');
            console.error('Error completing session:', error);
            throw new Error(`Failed to complete session: ${error.message}`);
        }
    }

    /**
     * Release Sparks payment from escrow to mentor
     * @private
     */
    async releaseSparksPayment(sessionId, mentorId, amountSparks) {
        try {
            // Get session mentee info
            const sessionResult = await db.query(`
                SELECT mentee_id FROM sessions WHERE id = $1
            `, [sessionId]);

            const menteeId = sessionResult.rows[0].mentee_id;

            // Release Sparks from escrow to mentor
            await db.query(`
                UPDATE user_wallets 
                SET escrow_balance_sparks = escrow_balance_sparks - $1
                WHERE user_id = $2
            `, [amountSparks, menteeId]);

            // Add Sparks to mentor wallet
            await db.query(`
                INSERT INTO user_wallets (user_id, spark_balance, total_earned_sparks)
                VALUES ($1, $2, $2)
                ON CONFLICT (user_id) DO UPDATE SET
                    spark_balance = user_wallets.spark_balance + $2,
                    total_earned_sparks = user_wallets.total_earned_sparks + $2,
                    updated_at = CURRENT_TIMESTAMP
            `, [mentorId, amountSparks]);

            // Record earning transaction for mentor
            await db.query(`
                INSERT INTO transactions (
                    user_id, transaction_type, amount_sparks, currency_type,
                    description, reference_id, reference_type, status,
                    balance_after_sparks
                ) VALUES ($1, 'earn', $2, 'sparks', $3, $4, 'session', 'completed',
                    (SELECT spark_balance FROM user_wallets WHERE user_id = $1))
            `, [
                mentorId, amountSparks,
                'Earnings from completed mentoring session',
                sessionId
            ]);

            // Update mentor profile earnings
            await db.query(`
                UPDATE mentor_profiles 
                SET total_earnings_sparks = total_earnings_sparks + $1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = $2
            `, [amountSparks, mentorId]);

            return {
                success: true,
                message: 'Sparks payment released to mentor',
                amountSparks,
                mentorId
            };

        } catch (error) {
            console.error('Error releasing Sparks payment:', error);
            throw error;
        }
    }

    /**
     * Award Four Pillars points for session completion
     * @private
     */
    async awardSessionCompletionPoints(mentorId, menteeId, session) {
        try {
            // Import scoring service
            const scoringService = require('./ascendiaScoringService');

            // Award mentorship points to mentor
            await scoringService.addPillarPoints(mentorId, 'mentorship', 75, 'Completed mentoring session');

            // Award academic points to mentee based on session type
            let menteePoints = 50;
            let menteePillar = 'academic';

            switch (session.session_type) {
                case 'counseling':
                    menteePillar = 'community';
                    menteePoints = 40;
                    break;
                case 'career_guidance':
                    menteePillar = 'analytical';
                    menteePoints = 45;
                    break;
                case 'skill_coaching':
                    menteePillar = 'academic';
                    menteePoints = 55;
                    break;
                default:
                    menteePillar = 'academic';
                    menteePoints = 50;
            }

            await scoringService.addPillarPoints(menteeId, menteePillar, menteePoints, `Attended ${session.session_type} session`);

            return {
                mentor: { pillar: 'mentorship', points: 75 },
                mentee: { pillar: menteePillar, points: menteePoints }
            };

        } catch (error) {
            console.error('Error awarding session points:', error);
            // Don't throw error - points are bonus, shouldn't fail session completion
        }
    }

    /**
     * Cancel session with appropriate refund handling
     * @param {string} sessionId - Session ID
     * @param {string} cancelledBy - User ID who cancelled
     * @param {string} reason - Cancellation reason
     * @returns {object} - Cancellation result
     */
    async cancelSession(sessionId, cancelledBy, reason) {
        try {
            await db.query('BEGIN');

            // Get session details
            const sessionResult = await db.query(`
                SELECT * FROM sessions
                WHERE id = $1 AND status IN ('pending', 'confirmed')
            `, [sessionId]);

            if (sessionResult.rows.length === 0) {
                throw new Error('Session not found or cannot be cancelled');
            }

            const session = sessionResult.rows[0];

            // Check cancellation policy (24 hours for full refund)
            const now = new Date();
            const scheduledTime = new Date(session.scheduled_at);
            const hoursUntilSession = (scheduledTime - now) / (1000 * 60 * 60);

            const isFullRefund = hoursUntilSession >= 24;
            const refundPercentage = isFullRefund ? 1.0 : 0.5; // 50% refund for < 24hr notice

            // Update session status
            await db.query(`
                UPDATE sessions 
                SET status = 'cancelled',
                    cancellation_reason = $1,
                    cancelled_by = $2,
                    cancelled_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $3
            `, [reason, cancelledBy, sessionId]);

            // Process refund based on payment method
            let refundResult;
            if (session.payment_method === 'usd' && session.amount_usd > 0) {
                // Process Stripe refund
                refundResult = await paymentService.processRefund(sessionId, reason);
            } else if (session.payment_method === 'sparks' && session.amount_sparks > 0) {
                // Refund Sparks from escrow
                const refundAmount = Math.floor(session.amount_sparks * refundPercentage);
                refundResult = await this.refundSparks(sessionId, session.mentee_id, refundAmount, session.amount_sparks);
            }

            await db.query('COMMIT');

            // Send cancellation notifications
            await this.sendSessionNotifications(sessionId, 'cancelled');

            return {
                success: true,
                message: 'Session cancelled successfully',
                sessionId,
                refund: refundResult,
                refundPercentage
            };

        } catch (error) {
            await db.query('ROLLBACK');
            console.error('Error cancelling session:', error);
            throw new Error(`Failed to cancel session: ${error.message}`);
        }
    }

    /**
     * Refund Sparks for cancelled session
     * @private
     */
    async refundSparks(sessionId, menteeId, refundAmount, originalAmount) {
        try {
            const penalty = originalAmount - refundAmount;

            // Return refund amount to mentee balance
            await db.query(`
                UPDATE user_wallets 
                SET spark_balance = spark_balance + $1,
                    escrow_balance_sparks = escrow_balance_sparks - $2,
                    total_spent_sparks = total_spent_sparks - $1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = $3
            `, [refundAmount, originalAmount, menteeId]);

            // Record refund transaction
            await db.query(`
                INSERT INTO transactions (
                    user_id, transaction_type, amount_sparks, currency_type,
                    description, reference_id, reference_type, status,
                    balance_after_sparks
                ) VALUES ($1, 'refund', $2, 'sparks', $3, $4, 'session', 'completed',
                    (SELECT spark_balance FROM user_wallets WHERE user_id = $1))
            `, [
                menteeId, refundAmount,
                `Refund for cancelled session${penalty > 0 ? ` (${penalty} Sparks cancellation fee)` : ''}`,
                sessionId
            ]);

            return {
                success: true,
                refundAmount,
                penalty,
                message: `Refunded ${refundAmount} Sparks${penalty > 0 ? ` (${penalty} Sparks cancellation fee applied)` : ''}`
            };

        } catch (error) {
            console.error('Error refunding Sparks:', error);
            throw error;
        }
    }

    /**
     * Get session details with all related information
     * @param {string} sessionId - Session ID
     * @param {string} userId - Requesting user ID
     * @returns {object} - Detailed session information
     */
    async getSessionDetails(sessionId, userId) {
        try {
            // Get session with mentor and mentee details
            const sessionResult = await db.query(`
                SELECT 
                    s.*,
                    mentor.username as mentor_username,
                    mentor_profile.display_name as mentor_name,
                    mentee.username as mentee_username,
                    mentee_profile.display_name as mentee_name,
                    mp.specialties as mentor_specialties
                FROM sessions s
                JOIN users mentor ON s.mentor_id = mentor.id
                JOIN users mentee ON s.mentee_id = mentee.id
                LEFT JOIN user_profiles mentor_profile ON mentor.id = mentor_profile.user_id
                LEFT JOIN user_profiles mentee_profile ON mentee.id = mentee_profile.user_id
                LEFT JOIN mentor_profiles mp ON mentor.id = mp.user_id
                WHERE s.id = $1 AND (s.mentor_id = $2 OR s.mentee_id = $2)
            `, [sessionId, userId]);

            if (sessionResult.rows.length === 0) {
                throw new Error('Session not found or access denied');
            }

            const session = sessionResult.rows[0];

            // Get any existing reviews
            const reviewsResult = await db.query(`
                SELECT r.*, reviewer.username as reviewer_name
                FROM reviews r
                JOIN users reviewer ON r.reviewer_id = reviewer.id
                WHERE r.session_id = $1
            `, [sessionId]);

            return {
                success: true,
                session: {
                    ...session,
                    reviews: reviewsResult.rows
                }
            };

        } catch (error) {
            console.error('Error getting session details:', error);
            throw new Error(`Failed to get session details: ${error.message}`);
        }
    }

    /**
     * Get user's sessions (mentor or mentee)
     * @param {string} userId - User ID
     * @param {object} filters - Query filters
     * @returns {object} - User's sessions
     */
    async getUserSessions(userId, filters = {}) {
        try {
            const { status, role, limit = 50, offset = 0 } = filters;

            let query = `
                SELECT 
                    s.*,
                    CASE 
                        WHEN s.mentor_id = $1 THEN 'mentor'
                        ELSE 'mentee'
                    END as user_role,
                    CASE 
                        WHEN s.mentor_id = $1 THEN mentee_profile.display_name
                        ELSE mentor_profile.display_name
                    END as other_party_name,
                    CASE 
                        WHEN s.mentor_id = $1 THEN mentee.username
                        ELSE mentor.username
                    END as other_party_username
                FROM sessions s
                JOIN users mentor ON s.mentor_id = mentor.id
                JOIN users mentee ON s.mentee_id = mentee.id
                LEFT JOIN user_profiles mentor_profile ON mentor.id = mentor_profile.user_id
                LEFT JOIN user_profiles mentee_profile ON mentee.id = mentee_profile.user_id
                WHERE (s.mentor_id = $1 OR s.mentee_id = $1)
            `;

            const queryParams = [userId];
            let paramCount = 1;

            if (status) {
                query += ` AND s.status = $${++paramCount}`;
                queryParams.push(status);
            }

            if (role === 'mentor') {
                query += ` AND s.mentor_id = $1`;
            } else if (role === 'mentee') {
                query += ` AND s.mentee_id = $1`;
            }

            query += ` ORDER BY s.scheduled_at DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`;
            queryParams.push(limit, offset);

            const result = await db.query(query, queryParams);

            return {
                success: true,
                sessions: result.rows,
                count: result.rows.length,
                hasMore: result.rows.length === limit
            };

        } catch (error) {
            console.error('Error getting user sessions:', error);
            throw new Error(`Failed to get user sessions: ${error.message}`);
        }
    }

    /**
     * Send session notifications (placeholder - integrate with notification service)
     * @private
     */
    async sendSessionNotifications(sessionId, eventType) {
        try {
            // This would integrate with your notification service
            console.log(`Session ${sessionId} notification: ${eventType}`);
            
            // TODO: Implement email/SMS/push notifications
            // - Session booked: notify mentor
            // - Session confirmed: notify mentee
            // - Session starting soon: notify both
            // - Session completed: notify both
            // - Session cancelled: notify both

        } catch (error) {
            console.error('Error sending session notifications:', error);
            // Don't throw error - notifications are secondary
        }
    }
}

module.exports = new AscendiaSessionService();