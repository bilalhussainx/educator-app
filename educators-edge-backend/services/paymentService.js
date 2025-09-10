// =================================================================
// ASCENDIA PLATFORM: Payment Service with Stripe Connect
// =================================================================
// Handles all Stripe Connect API logic for the mentorship marketplace

// Initialize Stripe with proper error handling
const stripe = process.env.STRIPE_SECRET_KEY 
    ? require('stripe')(process.env.STRIPE_SECRET_KEY)
    : null;

// Log warning if Stripe is not configured
if (!stripe) {
    console.warn('⚠️  STRIPE_SECRET_KEY not configured - Payment service will be disabled');
}
const db = require('../db');

class PaymentService {
    
    /**
     * Check if Stripe is configured and available
     * @returns {boolean} - True if Stripe is available
     */
    isStripeAvailable() {
        return stripe !== null;
    }

    /**
     * Throw error if Stripe is not available
     */
    requireStripe() {
        if (!this.isStripeAvailable()) {
            throw new Error('Payment service is not available - STRIPE_SECRET_KEY not configured');
        }
    }

    /**
     * Create Stripe Connect account for mentors
     * @param {string} userId - User ID of the mentor
     * @param {object} accountInfo - Account creation information
     * @returns {object} - Stripe account details and onboarding link
     */
    async createConnectAccount(userId, accountInfo) {
        this.requireStripe();
        try {
            // Create Stripe Connect Express account
            const account = await stripe.accounts.create({
                type: 'express',
                country: accountInfo.country || 'US',
                email: accountInfo.email,
                capabilities: {
                    card_payments: { requested: true },
                    transfers: { requested: true },
                },
                business_type: 'individual',
                individual: {
                    first_name: accountInfo.firstName,
                    last_name: accountInfo.lastName,
                    email: accountInfo.email,
                },
                settings: {
                    payouts: {
                        schedule: {
                            interval: 'weekly',
                            weekly_anchor: 'friday'
                        }
                    }
                }
            });

            // Store Stripe Connect ID in mentor profile
            await db.query(`
                INSERT INTO mentor_profiles (user_id, stripe_connect_id, stripe_onboarding_complete)
                VALUES ($1, $2, $3)
                ON CONFLICT (user_id) DO UPDATE SET
                    stripe_connect_id = EXCLUDED.stripe_connect_id,
                    stripe_onboarding_complete = EXCLUDED.stripe_onboarding_complete,
                    updated_at = CURRENT_TIMESTAMP
            `, [userId, account.id, false]);

            // Create account link for onboarding
            const accountLink = await stripe.accountLinks.create({
                account: account.id,
                refresh_url: `${process.env.FRONTEND_URL}/mentor/onboarding/refresh`,
                return_url: `${process.env.FRONTEND_URL}/mentor/onboarding/success`,
                type: 'account_onboarding',
            });

            return {
                success: true,
                accountId: account.id,
                onboardingUrl: accountLink.url,
                message: 'Stripe Connect account created successfully'
            };

        } catch (error) {
            console.error('Error creating Stripe Connect account:', error);
            throw new Error(`Failed to create payment account: ${error.message}`);
        }
    }

    /**
     * Check onboarding status and update mentor profile
     * @param {string} userId - User ID of the mentor
     * @returns {object} - Onboarding status
     */
    async checkOnboardingStatus(userId) {
        this.requireStripe();
        try {
            // Get mentor's Stripe Connect ID
            const mentorResult = await db.query(`
                SELECT stripe_connect_id, stripe_onboarding_complete 
                FROM mentor_profiles 
                WHERE user_id = $1
            `, [userId]);

            if (mentorResult.rows.length === 0) {
                throw new Error('Mentor profile not found');
            }

            const { stripe_connect_id, stripe_onboarding_complete } = mentorResult.rows[0];

            if (!stripe_connect_id) {
                return { onboardingComplete: false, requiresOnboarding: true };
            }

            // Check account status with Stripe
            const account = await stripe.accounts.retrieve(stripe_connect_id);
            const isComplete = account.details_submitted && account.charges_enabled && account.payouts_enabled;

            // Update database if status changed
            if (isComplete !== stripe_onboarding_complete) {
                await db.query(`
                    UPDATE mentor_profiles 
                    SET stripe_onboarding_complete = $1, updated_at = CURRENT_TIMESTAMP
                    WHERE user_id = $2
                `, [isComplete, userId]);
            }

            return {
                onboardingComplete: isComplete,
                requiresOnboarding: !isComplete,
                accountId: stripe_connect_id,
                chargesEnabled: account.charges_enabled,
                payoutsEnabled: account.payouts_enabled,
                requiresAction: account.requirements?.currently_due?.length > 0
            };

        } catch (error) {
            console.error('Error checking onboarding status:', error);
            throw new Error(`Failed to check onboarding status: ${error.message}`);
        }
    }

    /**
     * Create checkout session for session booking
     * @param {object} sessionData - Session booking information
     * @returns {object} - Stripe checkout session
     */
    async createCheckoutSession(sessionData) {
        this.requireStripe();
        try {
            const { sessionId, mentorId, menteeId, amountUSD, amountSparks, paymentMethod } = sessionData;

            // Get session details
            const sessionResult = await db.query(`
                SELECT s.*, mp.stripe_connect_id, u.username as mentor_name
                FROM sessions s
                JOIN mentor_profiles mp ON s.mentor_id = mp.user_id
                JOIN users u ON s.mentor_id = u.id
                WHERE s.id = $1 AND s.mentee_id = $2
            `, [sessionId, menteeId]);

            if (sessionResult.rows.length === 0) {
                throw new Error('Session not found or unauthorized');
            }

            const session = sessionResult.rows[0];
            
            if (!session.stripe_connect_id) {
                throw new Error('Mentor has not completed payment setup');
            }

            // Create Stripe checkout session
            const checkoutSession = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                mode: 'payment',
                success_url: `${process.env.FRONTEND_URL}/session/${sessionId}/payment/success`,
                cancel_url: `${process.env.FRONTEND_URL}/session/${sessionId}/payment/cancel`,
                
                line_items: [{
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: `Mentoring Session with ${session.mentor_name}`,
                            description: `${session.duration_minutes} minute ${session.session_type} session`,
                        },
                        unit_amount: Math.round(amountUSD * 100), // Convert to cents
                    },
                    quantity: 1,
                }],

                // Use Stripe Connect for direct charge to mentor
                payment_intent_data: {
                    application_fee_amount: Math.round(amountUSD * 100 * 0.05), // 5% platform fee
                    transfer_data: {
                        destination: session.stripe_connect_id,
                    },
                    metadata: {
                        session_id: sessionId,
                        mentor_id: mentorId,
                        mentee_id: menteeId,
                        payment_type: 'session_booking'
                    }
                },

                metadata: {
                    session_id: sessionId,
                    mentor_id: mentorId,
                    mentee_id: menteeId
                }
            });

            // Update session with payment intent
            await db.query(`
                UPDATE sessions 
                SET stripe_payment_intent_id = $1, payment_status = 'pending'
                WHERE id = $2
            `, [checkoutSession.payment_intent, sessionId]);

            return {
                success: true,
                checkoutUrl: checkoutSession.url,
                sessionId: checkoutSession.id,
                paymentIntentId: checkoutSession.payment_intent
            };

        } catch (error) {
            console.error('Error creating checkout session:', error);
            throw new Error(`Failed to create checkout session: ${error.message}`);
        }
    }

    /**
     * Handle Stripe webhooks for payment processing
     * @param {object} event - Stripe webhook event
     * @returns {object} - Processing result
     */
    async handleStripeWebhook(event) {
        this.requireStripe();
        try {
            switch (event.type) {
                case 'payment_intent.succeeded':
                    return await this.handlePaymentSuccess(event.data.object);
                    
                case 'payment_intent.payment_failed':
                    return await this.handlePaymentFailed(event.data.object);
                    
                case 'account.updated':
                    return await this.handleAccountUpdated(event.data.object);
                    
                case 'transfer.created':
                    return await this.handleTransferCreated(event.data.object);
                    
                default:
                    console.log(`Unhandled event type: ${event.type}`);
                    return { success: true, message: 'Event acknowledged but not processed' };
            }
        } catch (error) {
            console.error('Error handling Stripe webhook:', error);
            throw new Error(`Webhook processing failed: ${error.message}`);
        }
    }

    /**
     * Handle successful payment
     * @private
     */
    async handlePaymentSuccess(paymentIntent) {
        this.requireStripe();
        const { session_id, mentor_id, mentee_id } = paymentIntent.metadata;
        const amountUSD = paymentIntent.amount / 100; // Convert from cents
        const platformFee = (paymentIntent.application_fee_amount || 0) / 100;
        const mentorEarnings = amountUSD - platformFee;

        try {
            await db.query('BEGIN');

            // Update session payment status
            await db.query(`
                UPDATE sessions 
                SET payment_status = 'escrowed',
                    amount_usd = $1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $2
            `, [amountUSD, session_id]);

            // Record transaction for mentee (payment)
            await db.query(`
                INSERT INTO transactions (
                    user_id, transaction_type, amount_usd, currency_type,
                    description, reference_id, reference_type,
                    stripe_charge_id, status, balance_after_usd
                ) VALUES ($1, 'spend', $2, 'usd', $3, $4, 'session', $5, 'completed',
                    (SELECT COALESCE(spark_balance, 0) FROM user_wallets WHERE user_id = $1))
            `, [
                mentee_id,
                amountUSD,
                `Payment for mentoring session`,
                session_id,
                paymentIntent.id
            ]);

            // Update mentee wallet
            await db.query(`
                UPDATE user_wallets 
                SET total_spent_usd = total_spent_usd + $1,
                    escrow_balance_usd = escrow_balance_usd + $2,
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = $3
            `, [amountUSD, amountUSD, mentee_id]);

            // Record pending earnings for mentor
            await db.query(`
                INSERT INTO transactions (
                    user_id, transaction_type, amount_usd, currency_type,
                    description, reference_id, reference_type,
                    status, balance_after_usd
                ) VALUES ($1, 'earn', $2, 'usd', $3, $4, 'session', 'pending',
                    (SELECT COALESCE(spark_balance, 0) FROM user_wallets WHERE user_id = $1))
            `, [
                mentor_id,
                mentorEarnings,
                `Earnings from mentoring session (pending completion)`,
                session_id
            ]);

            await db.query('COMMIT');

            return {
                success: true,
                message: 'Payment processed and escrowed successfully',
                sessionId: session_id,
                amountUSD,
                mentorEarnings
            };

        } catch (error) {
            await db.query('ROLLBACK');
            throw error;
        }
    }

    /**
     * Handle failed payment
     * @private
     */
    async handlePaymentFailed(paymentIntent) {
        this.requireStripe();
        const { session_id } = paymentIntent.metadata;

        await db.query(`
            UPDATE sessions 
            SET payment_status = 'failed',
                status = 'cancelled',
                cancellation_reason = 'Payment failed',
                cancelled_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
        `, [session_id]);

        return {
            success: true,
            message: 'Payment failure processed',
            sessionId: session_id
        };
    }

    /**
     * Release payment after session completion
     * @param {string} sessionId - Session ID
     * @param {string} mentorId - Mentor user ID
     * @returns {object} - Release result
     */
    async releaseEscrowPayment(sessionId, mentorId) {
        this.requireStripe();
        try {
            await db.query('BEGIN');

            // Get session details
            const sessionResult = await db.query(`
                SELECT s.*, t.amount_usd, t.id as transaction_id
                FROM sessions s
                JOIN transactions t ON s.id = t.reference_id::UUID 
                WHERE s.id = $1 AND s.mentor_id = $2 AND s.payment_status = 'escrowed'
                AND t.transaction_type = 'earn' AND t.status = 'pending'
            `, [sessionId, mentorId]);

            if (sessionResult.rows.length === 0) {
                throw new Error('Session not found or payment already released');
            }

            const session = sessionResult.rows[0];
            const earnings = session.amount_usd;

            // Release payment to mentor
            await db.query(`
                UPDATE sessions 
                SET payment_status = 'released',
                    escrow_released_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
            `, [sessionId]);

            // Update mentor earnings transaction
            await db.query(`
                UPDATE transactions 
                SET status = 'completed',
                    processed_at = CURRENT_TIMESTAMP
                WHERE id = $1
            `, [session.transaction_id]);

            // Update mentor wallet
            await db.query(`
                INSERT INTO user_wallets (user_id, total_earned_usd)
                VALUES ($1, $2)
                ON CONFLICT (user_id) DO UPDATE SET
                    total_earned_usd = user_wallets.total_earned_usd + $2,
                    updated_at = CURRENT_TIMESTAMP
            `, [mentorId, earnings]);

            // Update mentor profile earnings
            await db.query(`
                UPDATE mentor_profiles 
                SET total_earnings_usd = total_earnings_usd + $1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = $2
            `, [earnings, mentorId]);

            // Move from escrow to available in mentee wallet
            await db.query(`
                UPDATE user_wallets 
                SET escrow_balance_usd = escrow_balance_usd - $1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = $2
            `, [earnings, session.mentee_id]);

            await db.query('COMMIT');

            return {
                success: true,
                message: 'Payment released successfully',
                sessionId,
                earnings,
                mentorId
            };

        } catch (error) {
            await db.query('ROLLBACK');
            console.error('Error releasing escrow payment:', error);
            throw new Error(`Failed to release payment: ${error.message}`);
        }
    }

    /**
     * Process refund for cancelled sessions
     * @param {string} sessionId - Session ID
     * @param {string} reason - Refund reason
     * @returns {object} - Refund result
     */
    async processRefund(sessionId, reason = 'Session cancelled') {
        this.requireStripe();
        try {
            // Get session and payment details
            const sessionResult = await db.query(`
                SELECT s.*, s.stripe_payment_intent_id
                FROM sessions s
                WHERE s.id = $1 AND s.payment_status IN ('escrowed', 'pending')
            `, [sessionId]);

            if (sessionResult.rows.length === 0) {
                throw new Error('Session not found or not eligible for refund');
            }

            const session = sessionResult.rows[0];

            // Process Stripe refund
            const refund = await stripe.refunds.create({
                payment_intent: session.stripe_payment_intent_id,
                reason: 'requested_by_customer',
                metadata: {
                    session_id: sessionId,
                    refund_reason: reason
                }
            });

            // Update session status
            await db.query(`
                UPDATE sessions 
                SET payment_status = 'refunded',
                    status = 'cancelled',
                    cancellation_reason = $1,
                    cancelled_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $2
            `, [reason, sessionId]);

            // Record refund transaction
            await db.query(`
                INSERT INTO transactions (
                    user_id, transaction_type, amount_usd, currency_type,
                    description, reference_id, reference_type,
                    stripe_charge_id, status
                ) VALUES ($1, 'refund', $2, 'usd', $3, $4, 'session', $5, 'completed')
            `, [
                session.mentee_id,
                session.amount_usd,
                `Refund for cancelled session: ${reason}`,
                sessionId,
                refund.id
            ]);

            return {
                success: true,
                message: 'Refund processed successfully',
                refundId: refund.id,
                amount: session.amount_usd
            };

        } catch (error) {
            console.error('Error processing refund:', error);
            throw new Error(`Failed to process refund: ${error.message}`);
        }
    }

    /**
     * Get mentor earnings dashboard data
     * @param {string} mentorId - Mentor user ID
     * @returns {object} - Earnings data
     */
    async getMentorEarnings(mentorId) {
        this.requireStripe();
        try {
            const earningsResult = await db.query(`
                SELECT 
                    mp.total_earnings_usd,
                    mp.total_earnings_sparks,
                    COUNT(s.id) as total_sessions,
                    COUNT(CASE WHEN s.status = 'completed' THEN 1 END) as completed_sessions,
                    COUNT(CASE WHEN s.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as sessions_this_month,
                    AVG(r.rating) as average_rating,
                    COUNT(r.id) as total_reviews
                FROM mentor_profiles mp
                LEFT JOIN sessions s ON mp.user_id = s.mentor_id
                LEFT JOIN reviews r ON mp.user_id = r.reviewed_user_id
                WHERE mp.user_id = $1
                GROUP BY mp.total_earnings_usd, mp.total_earnings_sparks
            `, [mentorId]);

            const recentTransactions = await db.query(`
                SELECT * FROM transactions
                WHERE user_id = $1 AND transaction_type = 'earn'
                ORDER BY created_at DESC
                LIMIT 10
            `, [mentorId]);

            return {
                success: true,
                earnings: earningsResult.rows[0] || {},
                recentTransactions: recentTransactions.rows
            };

        } catch (error) {
            console.error('Error getting mentor earnings:', error);
            throw new Error(`Failed to get earnings data: ${error.message}`);
        }
    }

    /**
     * Handle account status updates from Stripe
     * @private
     */
    async handleAccountUpdated(account) {
        this.requireStripe();
        const isComplete = account.details_submitted && account.charges_enabled && account.payouts_enabled;
        
        await db.query(`
            UPDATE mentor_profiles 
            SET stripe_onboarding_complete = $1, updated_at = CURRENT_TIMESTAMP
            WHERE stripe_connect_id = $2
        `, [isComplete, account.id]);

        return { success: true, message: 'Account status updated' };
    }

    /**
     * Handle transfer creation events
     * @private
     */
    async handleTransferCreated(transfer) {
        this.requireStripe();
        // Log successful transfers for accounting
        console.log('Transfer created:', transfer.id, 'Amount:', transfer.amount / 100);
        return { success: true, message: 'Transfer logged' };
    }
}

module.exports = new PaymentService();