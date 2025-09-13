const axios = require('axios');
const db = require('../db');

class CalendlyService {
    constructor() {
        this.baseURL = 'https://api.calendly.com';
        this.version = 'v2';
        // These would be set in environment variables
        this.clientId = process.env.CALENDLY_CLIENT_ID;
        this.clientSecret = process.env.CALENDLY_CLIENT_SECRET;
        this.webhookSigningSecret = process.env.CALENDLY_WEBHOOK_SECRET;
    }

    /**
     * Create axios instance with proper headers
     */
    createApiClient(accessToken) {
        return axios.create({
            baseURL: `${this.baseURL}`,
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });
    }

    /**
     * Get user's Calendly information
     */
    async getUserInfo(accessToken) {
        try {
            const client = this.createApiClient(accessToken);
            const response = await client.get('/users/me');
            return {
                success: true,
                user: response.data.resource
            };
        } catch (error) {
            console.error('Failed to get Calendly user info:', error.response?.data);
            return {
                success: false,
                error: error.response?.data?.message || 'Failed to get user info'
            };
        }
    }

    /**
     * Get user's event types (available meeting types)
     */
    async getEventTypes(accessToken, userUri) {
        try {
            const client = this.createApiClient(accessToken);
            const response = await client.get('/event_types', {
                params: {
                    user: userUri,
                    count: 20,
                    active: true
                }
            });
            
            return {
                success: true,
                eventTypes: response.data.collection
            };
        } catch (error) {
            console.error('Failed to get event types:', error.response?.data);
            return {
                success: false,
                error: error.response?.data?.message || 'Failed to get event types'
            };
        }
    }

    /**
     * Get scheduled events for a user
     */
    async getScheduledEvents(accessToken, userUri, options = {}) {
        try {
            const client = this.createApiClient(accessToken);
            const params = {
                user: userUri,
                count: options.count || 100,
                ...options
            };

            const response = await client.get('/scheduled_events', { params });
            
            return {
                success: true,
                events: response.data.collection,
                pagination: response.data.pagination
            };
        } catch (error) {
            console.error('Failed to get scheduled events:', error.response?.data);
            return {
                success: false,
                error: error.response?.data?.message || 'Failed to get events'
            };
        }
    }

    /**
     * Get event invitees
     */
    async getEventInvitees(accessToken, eventUuid) {
        try {
            const client = this.createApiClient(accessToken);
            const response = await client.get(`/scheduled_events/${eventUuid}/invitees`);
            
            return {
                success: true,
                invitees: response.data.collection
            };
        } catch (error) {
            console.error('Failed to get event invitees:', error.response?.data);
            return {
                success: false,
                error: error.response?.data?.message || 'Failed to get invitees'
            };
        }
    }

    /**
     * Cancel a scheduled event
     */
    async cancelEvent(accessToken, eventUuid, reason = null) {
        try {
            const client = this.createApiClient(accessToken);
            const payload = {};
            if (reason) {
                payload.reason = reason;
            }

            await client.post(`/scheduled_events/${eventUuid}/cancellation`, payload);
            
            return {
                success: true,
                message: 'Event cancelled successfully'
            };
        } catch (error) {
            console.error('Failed to cancel event:', error.response?.data);
            return {
                success: false,
                error: error.response?.data?.message || 'Failed to cancel event'
            };
        }
    }

    /**
     * Create a webhook subscription
     */
    async createWebhookSubscription(accessToken, organizationUri, callbackUrl, events) {
        try {
            const client = this.createApiClient(accessToken);
            const payload = {
                url: callbackUrl,
                events: events || ['invitee.created', 'invitee.canceled'],
                organization: organizationUri,
                scope: 'organization'
            };

            const response = await client.post('/webhook_subscriptions', payload);
            
            return {
                success: true,
                subscription: response.data.resource
            };
        } catch (error) {
            console.error('Failed to create webhook subscription:', error.response?.data);
            return {
                success: false,
                error: error.response?.data?.message || 'Failed to create webhook'
            };
        }
    }

    /**
     * Process webhook payload
     */
    async processWebhook(payload, signature) {
        try {
            // Verify webhook signature (implement signature verification)
            if (!this.verifyWebhookSignature(payload, signature)) {
                throw new Error('Invalid webhook signature');
            }

            const { event, payload: eventPayload } = payload;
            
            switch (event) {
                case 'invitee.created':
                    return await this.handleInviteeCreated(eventPayload);
                
                case 'invitee.canceled':
                    return await this.handleInviteeCanceled(eventPayload);
                
                default:
                    console.log('Unhandled webhook event:', event);
                    return { success: true, message: 'Event ignored' };
            }
        } catch (error) {
            console.error('Failed to process webhook:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Handle invitee created event
     */
    async handleInviteeCreated(payload) {
        try {
            const { event, invitee } = payload;
            
            // Find corresponding session request by Calendly event URI
            const sessionRequest = await db.query(
                `SELECT * FROM session_requests WHERE calendly_event_uri = $1`,
                [event.uri]
            );

            if (sessionRequest.rows.length > 0) {
                const requestId = sessionRequest.rows[0].id;
                
                // Update session request status
                await db.query(
                    `UPDATE session_requests 
                     SET status = 'confirmed', 
                         scheduled_time = $1,
                         calendly_invitee_uri = $2
                     WHERE id = $3`,
                    [event.start_time, invitee.uri, requestId]
                );

                // Create actual session
                await db.query(
                    `INSERT INTO sessions (
                        student_id, mentor_id, session_type, description, 
                        status, scheduled_time, calendly_event_uri, created_at
                    ) VALUES ($1, $2, $3, $4, 'scheduled', $5, $6, NOW())`,
                    [
                        sessionRequest.rows[0].requester_id,
                        sessionRequest.rows[0].mentor_id,
                        sessionRequest.rows[0].session_type,
                        sessionRequest.rows[0].description,
                        event.start_time,
                        event.uri
                    ]
                );

                console.log('Session confirmed via Calendly webhook:', requestId);
            }

            return {
                success: true,
                message: 'Invitee created event processed'
            };
        } catch (error) {
            console.error('Failed to handle invitee created:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Handle invitee canceled event
     */
    async handleInviteeCanceled(payload) {
        try {
            const { event } = payload;
            
            // Update session request and session status
            await db.query(
                `UPDATE session_requests SET status = $1 WHERE calendly_event_uri = $2`,
                ['canceled', event.uri]
            );

            await db.query(
                `UPDATE sessions SET status = $1 WHERE calendly_event_uri = $2`,
                ['canceled', event.uri]
            );

            console.log('Session canceled via Calendly webhook:', event.uri);

            return {
                success: true,
                message: 'Invitee canceled event processed'
            };
        } catch (error) {
            console.error('Failed to handle invitee canceled:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Verify webhook signature (simplified - implement proper HMAC verification)
     */
    verifyWebhookSignature(payload, signature) {
        // Implement proper signature verification using HMAC SHA256
        // This is a placeholder - in production, verify the signature properly
        return true;
    }

    /**
     * Get user's availability based on their Calendly schedule
     */
    async getUserAvailability(accessToken, userUri, startDate, endDate) {
        try {
            // Get user's event types to understand their offerings
            const eventTypesResult = await this.getEventTypes(accessToken, userUri);
            if (!eventTypesResult.success) {
                return eventTypesResult;
            }

            // Get scheduled events in the date range to show busy times
            const eventsResult = await this.getScheduledEvents(accessToken, userUri, {
                min_start_time: startDate,
                max_start_time: endDate
            });

            if (!eventsResult.success) {
                return eventsResult;
            }

            return {
                success: true,
                availability: {
                    eventTypes: eventTypesResult.eventTypes,
                    scheduledEvents: eventsResult.events,
                    dateRange: { startDate, endDate }
                }
            };
        } catch (error) {
            console.error('Failed to get user availability:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Generate dynamic Calendly URL with prefilled data
     */
    generateCalendlyURL(baseUrl, options = {}) {
        const url = new URL(baseUrl);
        
        // Add UTM parameters
        if (options.utm) {
            Object.entries(options.utm).forEach(([key, value]) => {
                url.searchParams.set(`utm_${key}`, value);
            });
        }

        // Add prefilled data
        if (options.prefill) {
            Object.entries(options.prefill).forEach(([key, value]) => {
                url.searchParams.set(key, value);
            });
        }

        // Add embed parameters
        if (options.embed) {
            url.searchParams.set('embed_domain', options.embed.domain);
            url.searchParams.set('embed_type', options.embed.type || 'Inline');
        }

        return url.toString();
    }
}

module.exports = new CalendlyService();