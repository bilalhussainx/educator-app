const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const db = require('../db');
const calendlyApiService = require('../services/calendlyApiService');

// @route   GET /api/calendar/teacher/:teacherId/availability
// @desc    Get teacher's availability schedule and available time slots
// @access  Public (students need to see teacher availability)
router.get('/teacher/:teacherId/availability', async (req, res) => {
    try {
        const { teacherId } = req.params;
        const { startDate, endDate } = req.query;

        // Get teacher's recurring availability
        const availabilityQuery = `
            SELECT * FROM teacher_availability 
            WHERE teacher_id = $1 AND is_active = true
            ORDER BY day_of_week, start_time
        `;
        
        // Get teacher's specific time slots (overrides and bookings)
        let slotsQuery = `
            SELECT * FROM teacher_time_slots 
            WHERE teacher_id = $1
        `;
        let slotsParams = [teacherId];

        if (startDate && endDate) {
            slotsQuery += ` AND start_datetime BETWEEN $2 AND $3`;
            slotsParams.push(startDate, endDate);
        }
        slotsQuery += ` ORDER BY start_datetime`;

        // Get teacher's calendar settings
        const settingsQuery = `
            SELECT * FROM teacher_calendar_settings 
            WHERE teacher_id = $1
        `;

        const [availabilityResult, slotsResult, settingsResult] = await Promise.all([
            db.query(availabilityQuery, [teacherId]),
            db.query(slotsQuery, slotsParams),
            db.query(settingsQuery, [teacherId])
        ]);

        res.json({
            success: true,
            availability: availabilityResult.rows,
            timeSlots: slotsResult.rows,
            settings: settingsResult.rows[0] || null
        });

    } catch (error) {
        console.error('Get teacher availability error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get teacher availability'
        });
    }
});

// @route   POST /api/calendar/availability
// @desc    Set teacher's recurring availability schedule
// @access  Private (teachers/mentors only)
router.post('/availability', verifyToken, async (req, res) => {
    try {
        const teacherId = req.user.id;
        const { schedule } = req.body; // Array of availability objects

        // Verify user is a teacher/mentor
        const userResult = await db.query(
            'SELECT u.role, up.is_mentor, up.is_searchable_teacher FROM users u LEFT JOIN user_profiles up ON u.id = up.user_id WHERE u.id = $1',
            [teacherId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const user = userResult.rows[0];
        if (!(user.role === 'teacher' || user.is_mentor || user.is_searchable_teacher)) {
            return res.status(403).json({ 
                success: false, 
                message: 'Only teachers and mentors can set availability' 
            });
        }

        // Begin transaction
        await db.query('BEGIN');

        try {
            // Clear existing availability
            await db.query(
                'DELETE FROM teacher_availability WHERE teacher_id = $1',
                [teacherId]
            );

            // Insert new schedule
            for (const slot of schedule) {
                await db.query(`
                    INSERT INTO teacher_availability (
                        teacher_id, day_of_week, start_time, end_time, 
                        timezone, session_duration, buffer_time
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                `, [
                    teacherId,
                    slot.dayOfWeek,
                    slot.startTime,
                    slot.endTime,
                    slot.timezone || 'UTC',
                    slot.sessionDuration || 60,
                    slot.bufferTime || 15
                ]);
            }

            await db.query('COMMIT');

            res.json({
                success: true,
                message: 'Availability schedule updated successfully'
            });

        } catch (error) {
            await db.query('ROLLBACK');
            throw error;
        }

    } catch (error) {
        console.error('Set teacher availability error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to set availability'
        });
    }
});

// @route   POST /api/calendar/time-slot
// @desc    Create specific time slot (override or block time)
// @access  Private (teachers/mentors only)
router.post('/time-slot', verifyToken, async (req, res) => {
    try {
        const teacherId = req.user.id;
        const { startDatetime, endDatetime, timezone, status, notes } = req.body;

        const result = await db.query(`
            INSERT INTO teacher_time_slots (
                teacher_id, start_datetime, end_datetime, timezone, status, notes
            ) VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `, [teacherId, startDatetime, endDatetime, timezone || 'UTC', status || 'available', notes]);

        res.json({
            success: true,
            timeSlot: result.rows[0]
        });

    } catch (error) {
        console.error('Create time slot error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create time slot'
        });
    }
});

// @route   PUT /api/calendar/time-slot/:slotId
// @desc    Update specific time slot
// @access  Private (teachers/mentors only)
router.put('/time-slot/:slotId', verifyToken, async (req, res) => {
    try {
        const teacherId = req.user.id;
        const { slotId } = req.params;
        const { startDatetime, endDatetime, timezone, status, notes } = req.body;

        const result = await db.query(`
            UPDATE teacher_time_slots 
            SET start_datetime = $1, end_datetime = $2, timezone = $3, status = $4, notes = $5, updated_at = CURRENT_TIMESTAMP
            WHERE id = $6 AND teacher_id = $7
            RETURNING *
        `, [startDatetime, endDatetime, timezone, status, notes, slotId, teacherId]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Time slot not found or not owned by user'
            });
        }

        res.json({
            success: true,
            timeSlot: result.rows[0]
        });

    } catch (error) {
        console.error('Update time slot error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update time slot'
        });
    }
});

// @route   DELETE /api/calendar/time-slot/:slotId
// @desc    Delete specific time slot
// @access  Private (teachers/mentors only)
router.delete('/time-slot/:slotId', verifyToken, async (req, res) => {
    try {
        const teacherId = req.user.id;
        const { slotId } = req.params;

        const result = await db.query(
            'DELETE FROM teacher_time_slots WHERE id = $1 AND teacher_id = $2 RETURNING id',
            [slotId, teacherId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Time slot not found or not owned by user'
            });
        }

        res.json({
            success: true,
            message: 'Time slot deleted successfully'
        });

    } catch (error) {
        console.error('Delete time slot error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete time slot'
        });
    }
});

// @route   GET /api/calendar/settings
// @desc    Get teacher's calendar settings
// @access  Private (teachers/mentors only)
router.get('/settings', verifyToken, async (req, res) => {
    try {
        const teacherId = req.user.id;

        const result = await db.query(
            'SELECT * FROM teacher_calendar_settings WHERE teacher_id = $1',
            [teacherId]
        );

        if (result.rows.length === 0) {
            // Return default settings if none exist
            return res.json({
                success: true,
                settings: {
                    teacher_id: teacherId,
                    timezone: 'UTC',
                    min_notice_hours: 24,
                    max_advance_days: 30,
                    default_session_duration: 60,
                    auto_accept_bookings: false,
                    calendar_color: '#3B82F6',
                    is_calendar_public: true
                }
            });
        }

        res.json({
            success: true,
            settings: result.rows[0]
        });

    } catch (error) {
        console.error('Get calendar settings error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get calendar settings'
        });
    }
});

// @route   PUT /api/calendar/settings
// @desc    Update teacher's calendar settings
// @access  Private (teachers/mentors only)
router.put('/settings', verifyToken, async (req, res) => {
    try {
        const teacherId = req.user.id;
        const {
            timezone,
            minNoticeHours,
            maxAdvanceDays,
            defaultSessionDuration,
            autoAcceptBookings,
            calendarColor,
            bookingInstructions,
            cancellationPolicy,
            isCalendarPublic
        } = req.body;

        const result = await db.query(`
            INSERT INTO teacher_calendar_settings (
                teacher_id, timezone, min_notice_hours, max_advance_days,
                default_session_duration, auto_accept_bookings, calendar_color,
                booking_instructions, cancellation_policy, is_calendar_public
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT (teacher_id) DO UPDATE SET
                timezone = EXCLUDED.timezone,
                min_notice_hours = EXCLUDED.min_notice_hours,
                max_advance_days = EXCLUDED.max_advance_days,
                default_session_duration = EXCLUDED.default_session_duration,
                auto_accept_bookings = EXCLUDED.auto_accept_bookings,
                calendar_color = EXCLUDED.calendar_color,
                booking_instructions = EXCLUDED.booking_instructions,
                cancellation_policy = EXCLUDED.cancellation_policy,
                is_calendar_public = EXCLUDED.is_calendar_public,
                updated_at = CURRENT_TIMESTAMP
            RETURNING *
        `, [
            teacherId,
            timezone || 'UTC',
            minNoticeHours || 24,
            maxAdvanceDays || 30,
            defaultSessionDuration || 60,
            autoAcceptBookings || false,
            calendarColor || '#3B82F6',
            bookingInstructions,
            cancellationPolicy,
            isCalendarPublic !== false
        ]);

        res.json({
            success: true,
            settings: result.rows[0]
        });

    } catch (error) {
        console.error('Update calendar settings error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update calendar settings'
        });
    }
});

// @route   GET /api/calendar/my-appointments
// @desc    Get teacher's upcoming appointments
// @access  Private (teachers/mentors only)
router.get('/my-appointments', verifyToken, async (req, res) => {
    try {
        const teacherId = req.user.id;
        const { startDate, endDate } = req.query;

        let query = `
            SELECT 
                s.*, 
                sr.description as request_description,
                sr.preferred_datetime,
                u.username as student_username,
                up.display_name as student_display_name
            FROM sessions s
            LEFT JOIN session_requests sr ON sr.mentor_id = s.mentor_id 
                AND sr.student_id = s.student_id 
                AND sr.status = 'accepted'
            JOIN users u ON s.student_id = u.id
            LEFT JOIN user_profiles up ON u.id = up.user_id
            WHERE s.mentor_id = $1
            AND s.status IN ('scheduled', 'active')
        `;
        
        let params = [teacherId];

        if (startDate && endDate) {
            query += ` AND s.scheduled_time BETWEEN $2 AND $3`;
            params.push(startDate, endDate);
        }

        query += ` ORDER BY s.scheduled_time`;

        const result = await db.query(query, params);

        res.json({
            success: true,
            appointments: result.rows
        });

    } catch (error) {
        console.error('Get appointments error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get appointments'
        });
    }
});

// @route   POST /api/calendar/calendly/connect
// @desc    Connect or update Calendly access token
// @access  Private (teachers/mentors only)
router.post('/calendly/connect', verifyToken, async (req, res) => {
    try {
        const teacherId = req.user.id;
        const { accessToken, calendlyUrl } = req.body;

        if (!accessToken) {
            return res.status(400).json({
                success: false,
                error: 'Calendly access token is required'
            });
        }

        // Validate the token with Calendly
        const validation = await calendlyApiService.validateToken(accessToken);
        if (!validation) {
            return res.status(400).json({
                success: false,
                error: 'Invalid Calendly access token'
            });
        }

        // Get user info from Calendly
        const userResult = await calendlyApiService.getCurrentUser(accessToken);
        if (!userResult.success) {
            return res.status(400).json({
                success: false,
                error: 'Failed to fetch Calendly user info'
            });
        }

        // Store in user profile
        await db.query(`
            UPDATE user_profiles 
            SET 
                calendly_access_token = $1,
                calendly_url = $2,
                calendly_user_uri = $3,
                calendly_organization_uri = $4,
                updated_at = NOW()
            WHERE user_id = $5
        `, [
            accessToken,
            calendlyUrl || userResult.user.scheduling_url,
            userResult.user.uri,
            userResult.organizationUri,
            teacherId
        ]);

        res.json({
            success: true,
            message: 'Calendly account connected successfully',
            user: userResult.user
        });

    } catch (error) {
        console.error('Connect Calendly error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to connect Calendly account'
        });
    }
});

// @route   GET /api/calendar/calendly/events
// @desc    Get Calendly scheduled events for the teacher
// @access  Private (teachers/mentors only)
router.get('/calendly/events', verifyToken, async (req, res) => {
    try {
        const teacherId = req.user.id;
        const { timeframe = 'upcoming' } = req.query;

        // Get Calendly access token from user profile
        const profileResult = await db.query(
            'SELECT calendly_access_token FROM user_profiles WHERE user_id = $1',
            [teacherId]
        );

        if (profileResult.rows.length === 0 || !profileResult.rows[0].calendly_access_token) {
            return res.status(400).json({
                success: false,
                error: 'Calendly account not connected. Please connect your Calendly account first.'
            });
        }

        const accessToken = profileResult.rows[0].calendly_access_token;

        // Fetch events based on timeframe
        let eventsResult;
        if (timeframe === 'today') {
            eventsResult = await calendlyApiService.getTodaysEvents(accessToken);
        } else {
            eventsResult = await calendlyApiService.getUpcomingEvents(accessToken);
        }

        if (!eventsResult.success) {
            return res.status(400).json({
                success: false,
                error: eventsResult.error
            });
        }

        // Enhance events with invitee information
        const enhancedEvents = await Promise.all(
            eventsResult.events.map(async (event) => {
                try {
                    const inviteesResult = await calendlyApiService.getEventInvitees(accessToken, event.uri);
                    return {
                        ...event,
                        invitees: inviteesResult.success ? inviteesResult.invitees : []
                    };
                } catch (error) {
                    console.warn('Failed to fetch invitees for event:', event.id);
                    return { ...event, invitees: [] };
                }
            })
        );

        res.json({
            success: true,
            events: enhancedEvents,
            pagination: eventsResult.pagination,
            user: eventsResult.user
        });

    } catch (error) {
        console.error('Get Calendly events error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch Calendly events'
        });
    }
});

// @route   GET /api/calendar/unified-appointments
// @desc    Get unified view of both internal sessions and Calendly events
// @access  Private (teachers/mentors only)
router.get('/unified-appointments', verifyToken, async (req, res) => {
    try {
        const teacherId = req.user.id;
        const { startDate, endDate } = req.query;

        // Get internal appointments (existing functionality)
        let internalQuery = `
            SELECT 
                s.*, 
                sr.description as request_description,
                sr.preferred_datetime,
                u.username as student_username,
                up.display_name as student_display_name,
                'internal' as source
            FROM sessions s
            LEFT JOIN session_requests sr ON sr.mentor_id = s.mentor_id 
                AND sr.student_id = s.student_id 
                AND sr.status = 'accepted'
            JOIN users u ON s.student_id = u.id
            LEFT JOIN user_profiles up ON u.id = up.user_id
            WHERE s.mentor_id = $1
            AND s.status IN ('scheduled', 'active')
        `;
        
        let params = [teacherId];

        if (startDate && endDate) {
            internalQuery += ` AND s.scheduled_time BETWEEN $2 AND $3`;
            params.push(startDate, endDate);
        }

        internalQuery += ` ORDER BY s.scheduled_time`;

        const internalResult = await db.query(internalQuery, params);

        // Try to get Calendly events
        let calendlyEvents = [];
        try {
            const profileResult = await db.query(
                'SELECT calendly_access_token FROM user_profiles WHERE user_id = $1',
                [teacherId]
            );

            if (profileResult.rows.length > 0 && profileResult.rows[0].calendly_access_token) {
                const accessToken = profileResult.rows[0].calendly_access_token;
                const eventsResult = await calendlyApiService.getUpcomingEvents(accessToken);
                
                if (eventsResult.success) {
                    calendlyEvents = eventsResult.events.map(event => ({
                        id: event.id,
                        name: event.name,
                        scheduled_time: event.start_time,
                        end_time: event.end_time,
                        status: event.status,
                        location: event.location,
                        event_type: event.event_type,
                        source: 'calendly',
                        calendly_uri: event.uri
                    }));
                }
            }
        } catch (calendlyError) {
            console.warn('Failed to fetch Calendly events:', calendlyError);
        }

        res.json({
            success: true,
            appointments: {
                internal: internalResult.rows,
                calendly: calendlyEvents
            },
            unified: [...internalResult.rows, ...calendlyEvents].sort((a, b) => 
                new Date(a.scheduled_time || a.start_time) - new Date(b.scheduled_time || b.start_time)
            )
        });

    } catch (error) {
        console.error('Get unified appointments error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get unified appointments'
        });
    }
});

// @route   DELETE /api/calendar/calendly/disconnect
// @desc    Disconnect Calendly account
// @access  Private (teachers/mentors only)
router.delete('/calendly/disconnect', verifyToken, async (req, res) => {
    try {
        const teacherId = req.user.id;

        await db.query(`
            UPDATE user_profiles 
            SET 
                calendly_access_token = NULL,
                calendly_user_uri = NULL,
                calendly_organization_uri = NULL,
                updated_at = NOW()
            WHERE user_id = $1
        `, [teacherId]);

        res.json({
            success: true,
            message: 'Calendly account disconnected successfully'
        });

    } catch (error) {
        console.error('Disconnect Calendly error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to disconnect Calendly account'
        });
    }
});

module.exports = router;