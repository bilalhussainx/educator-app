const fetch = require('node-fetch');

class CalendlyApiService {
    constructor() {
        this.baseUrl = 'https://api.calendly.com';
        this.apiVersion = 'v2';
    }

    /**
     * Get user information and organization URI
     * @param {string} accessToken - Calendly personal access token
     * @returns {Promise<Object>} User and organization data
     */
    async getCurrentUser(accessToken) {
        try {
            const response = await fetch(`${this.baseUrl}/users/me`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Calendly API error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            return {
                success: true,
                user: data.resource,
                organizationUri: data.resource.current_organization
            };
        } catch (error) {
            console.error('Error fetching Calendly user:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * List scheduled events for a user or organization
     * @param {string} accessToken - Calendly personal access token
     * @param {Object} options - Query options
     * @returns {Promise<Object>} Scheduled events data
     */
    async listScheduledEvents(accessToken, options = {}) {
        try {
            // First get user info to get organization URI
            const userResult = await this.getCurrentUser(accessToken);
            if (!userResult.success) {
                return userResult;
            }

            const { user, organizationUri } = userResult;
            
            // Build query parameters
            const params = new URLSearchParams();
            
            // Use organization for broader access, user for personal events only
            if (options.scope === 'user') {
                params.append('user', user.uri);
            } else {
                params.append('organization', organizationUri);
            }

            // Add date filters
            if (options.min_start_time) {
                params.append('min_start_time', options.min_start_time);
            }
            if (options.max_start_time) {
                params.append('max_start_time', options.max_start_time);
            }

            // Add pagination
            if (options.count) {
                params.append('count', options.count);
            }
            if (options.page_token) {
                params.append('page_token', options.page_token);
            }

            // Add status filter
            if (options.status) {
                params.append('status', options.status);
            }

            const url = `${this.baseUrl}/scheduled_events?${params.toString()}`;
            console.log('Calendly API request URL:', url);

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.text();
                throw new Error(`Calendly API error: ${response.status} ${response.statusText} - ${errorData}`);
            }

            const data = await response.json();
            
            // Transform the data to a more usable format
            const events = data.collection.map(event => ({
                id: event.uri.split('/').pop(),
                uri: event.uri,
                name: event.name,
                status: event.status,
                start_time: event.start_time,
                end_time: event.end_time,
                event_type: event.event_type,
                location: event.location,
                invitees_counter: event.invitees_counter,
                created_at: event.created_at,
                updated_at: event.updated_at,
                event_memberships: event.event_memberships,
                event_guests: event.event_guests
            }));

            return {
                success: true,
                events: events,
                pagination: data.pagination,
                user: user
            };

        } catch (error) {
            console.error('Error fetching Calendly scheduled events:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get event invitees
     * @param {string} accessToken - Calendly personal access token
     * @param {string} eventUri - Event URI
     * @returns {Promise<Object>} Event invitees data
     */
    async getEventInvitees(accessToken, eventUri) {
        try {
            const url = `${eventUri}/invitees`;
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Calendly API error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            return {
                success: true,
                invitees: data.collection
            };

        } catch (error) {
            console.error('Error fetching Calendly event invitees:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get upcoming events for today and next 7 days
     * @param {string} accessToken - Calendly personal access token
     * @returns {Promise<Object>} Upcoming events
     */
    async getUpcomingEvents(accessToken) {
        const today = new Date();
        const nextWeek = new Date();
        nextWeek.setDate(today.getDate() + 7);

        return this.listScheduledEvents(accessToken, {
            min_start_time: today.toISOString(),
            max_start_time: nextWeek.toISOString(),
            status: 'active',
            count: 50
        });
    }

    /**
     * Get today's events
     * @param {string} accessToken - Calendly personal access token
     * @returns {Promise<Object>} Today's events
     */
    async getTodaysEvents(accessToken) {
        const today = new Date();
        const tomorrow = new Date();
        tomorrow.setDate(today.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);

        return this.listScheduledEvents(accessToken, {
            min_start_time: today.toISOString(),
            max_start_time: tomorrow.toISOString(),
            status: 'active',
            count: 20
        });
    }

    /**
     * Validate Calendly access token
     * @param {string} accessToken - Calendly personal access token
     * @returns {Promise<boolean>} Whether token is valid
     */
    async validateToken(accessToken) {
        const result = await this.getCurrentUser(accessToken);
        return result.success;
    }

    /**
     * Parse Calendly webhook data
     * @param {Object} webhookPayload - Webhook payload from Calendly
     * @returns {Object} Parsed event data
     */
    parseWebhookEvent(webhookPayload) {
        const event = webhookPayload.payload;
        
        return {
            event_type: webhookPayload.event,
            event_uri: event.uri,
            event_name: event.name,
            status: event.status,
            start_time: event.start_time,
            end_time: event.end_time,
            invitee_uri: event.invitee?.uri,
            invitee_email: event.invitee?.email,
            invitee_name: event.invitee?.name,
            created_at: event.created_at,
            updated_at: event.updated_at
        };
    }
}

module.exports = new CalendlyApiService();