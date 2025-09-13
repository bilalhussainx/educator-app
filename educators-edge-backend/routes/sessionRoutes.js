const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware'); // Correctly import your middleware
const db = require('../db'); 
const { getActiveSessions } = require('../services/sessionStore');
const sessionController = require('../controllers/sessionController');

// @route   GET api/sessions/active
// @desc    Get active sessions for courses a student is enrolled in
// @access  Private (Protected by verifyToken)

router.get('/active', verifyToken, async (req, res) => {
    // Because of the verifyToken middleware, we are guaranteed to have req.user here.
    if (req.user.role !== 'student') {
        // Only students need to see active session notifications.
        // Return an empty array for teachers or other roles.
        return res.json([]); 
    }

    try {
        const allActiveSessions = getActiveSessions();
        if (allActiveSessions.length === 0) {
            return res.json([]);
        }

        // Get the list of course IDs the student is enrolled in from the database
        const studentCoursesResult = await db.query(
            'SELECT course_id FROM enrollments WHERE student_id = $1',
            [req.user.id]
        );
        const enrolledCourseIds = new Set(studentCoursesResult.rows.map(row => row.course_id));
        
        // Also allow students to see general sessions that might not be tied to a specific course
        enrolledCourseIds.add('default_course');

        // Filter the globally active sessions to find ones relevant to this student
        const relevantSessions = allActiveSessions.filter(session =>
            enrolledCourseIds.has(session.courseId)
        );

        res.json(relevantSessions);

    } catch (err) {
        console.error("Error fetching active sessions:", err.message);
        res.status(500).send('Server Error');
    }
});

router.get('/:sessionId/generate-token', verifyToken, sessionController.generateAgoraToken);

// @route   POST api/sessions/request
// @desc    Request a session with a mentor
// @access  Private (Protected by verifyToken)
router.post('/request', verifyToken, async (req, res) => {
    try {
        const { 
            mentorId, 
            sessionType, 
            description, 
            preferredTool,
            calendly_event_uri,
            calendly_booking_url,
            booking_method 
        } = req.body;
        const studentId = req.user.id;

        // Validate required fields
        if (!mentorId || !sessionType || !description) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: mentorId, sessionType, and description are required'
            });
        }

        // Prevent students from requesting sessions with themselves
        if (studentId === mentorId) {
            return res.status(400).json({
                success: false,
                message: 'You cannot request a session with yourself. Please select a different teacher or mentor.'
            });
        }

        // Check if mentor/teacher exists 
        const mentorResult = await db.query(
            'SELECT u.id, u.username, u.role, up.display_name, up.is_mentor, up.is_searchable_teacher FROM users u LEFT JOIN user_profiles up ON u.id = up.user_id WHERE u.id = $1',
            [mentorId]
        );

        if (mentorResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const mentor = mentorResult.rows[0];
        
        // Verify this user can receive session requests (is a mentor or teacher)
        if (!(mentor.is_mentor || mentor.role === 'teacher' || mentor.is_searchable_teacher)) {
            return res.status(400).json({
                success: false,
                message: 'This user is not available for sessions'
            });
        }

        // Create session request with calendar and Calendly data if provided
        let query = `
            INSERT INTO session_requests (
                requester_id, 
                mentor_id, 
                session_type, 
                description, 
                status, 
                created_at`;
        
        let values = [studentId, mentorId, sessionType, description];
        let paramCount = 4;
        
        // Add calendar-related fields if provided
        if (req.body.preferred_datetime) {
            query += `, preferred_datetime`;
            values.push(req.body.preferred_datetime);
            paramCount++;
        }
        
        if (req.body.duration_minutes) {
            query += `, duration_minutes`;
            values.push(req.body.duration_minutes);
            paramCount++;
        }
        
        if (req.body.timezone) {
            query += `, timezone`;
            values.push(req.body.timezone);
            paramCount++;
        }
        
        // Add Calendly-specific fields if provided
        if (calendly_event_uri) {
            query += `, calendly_event_uri`;
            values.push(calendly_event_uri);
            paramCount++;
        }
        
        if (calendly_booking_url) {
            query += `, calendly_booking_url`;
            values.push(calendly_booking_url);
            paramCount++;
        }
        
        if (booking_method) {
            query += `, booking_method`;
            values.push(booking_method);
            paramCount++;
        }
        
        query += `) VALUES ($1, $2, $3, $4, 'pending', NOW()`;
        
        // Add parameter placeholders for optional fields
        for (let i = 5; i <= paramCount; i++) {
            query += `, $${i}`;
        }
        
        query += `) RETURNING *`;

        const sessionRequestResult = await db.query(query, values);

        const sessionRequest = sessionRequestResult.rows[0];

        // You could add notification logic here to notify the mentor
        // Example: sendNotificationToMentor(mentorId, sessionRequest);

        res.json({
            success: true,
            message: 'Session request sent successfully',
            sessionRequest: {
                id: sessionRequest.id,
                mentorName: mentor.display_name || mentor.username,
                sessionType: sessionRequest.session_type,
                status: sessionRequest.status,
                createdAt: sessionRequest.created_at
            }
        });

    } catch (error) {
        console.error('Session request error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to send session request'
        });
    }
});

// @route   GET api/sessions/requests
// @desc    Get session requests (for mentor: incoming requests, for student: outgoing requests)
// @access  Private (Protected by verifyToken)
router.get('/requests', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { type = 'all' } = req.query; // 'incoming', 'outgoing', or 'all'

        console.log('[SESSION_REQUESTS] API called by user:', req.user.username, 'ID:', userId, 'Type:', type);

        let query = '';
        let params = [];

        if (type === 'incoming') {
            // Requests where user is the mentor
            query = `
                SELECT sr.*, 
                       u.username as student_username, 
                       up.display_name as student_display_name
                FROM session_requests sr
                JOIN users u ON sr.requester_id = u.id
                LEFT JOIN user_profiles up ON u.id = up.user_id
                WHERE sr.mentor_id = $1
                ORDER BY sr.created_at DESC
            `;
            params = [userId];
        } else if (type === 'outgoing') {
            // Requests where user is the student
            query = `
                SELECT sr.*, 
                       u.username as mentor_username, 
                       up.display_name as mentor_display_name
                FROM session_requests sr
                JOIN users u ON sr.mentor_id = u.id
                LEFT JOIN user_profiles up ON u.id = up.user_id
                WHERE sr.requester_id = $1
                ORDER BY sr.created_at DESC
            `;
            params = [userId];
        } else {
            // All requests (both incoming and outgoing)
            query = `
                (SELECT sr.*, 
                        u.username as other_username, 
                        up.display_name as other_display_name,
                        'incoming' as request_direction
                 FROM session_requests sr
                 JOIN users u ON sr.requester_id = u.id
                 LEFT JOIN user_profiles up ON u.id = up.user_id
                 WHERE sr.mentor_id = $1)
                UNION ALL
                (SELECT sr.*, 
                        u.username as other_username, 
                        up.display_name as other_display_name,
                        'outgoing' as request_direction
                 FROM session_requests sr
                 JOIN users u ON sr.mentor_id = u.id
                 LEFT JOIN user_profiles up ON u.id = up.user_id
                 WHERE sr.requester_id = $1)
                ORDER BY created_at DESC
            `;
            params = [userId, userId];
        }

        const result = await db.query(query, params);

        console.log('[SESSION_REQUESTS] Query executed:', query);
        console.log('[SESSION_REQUESTS] Query params:', params);
        console.log('[SESSION_REQUESTS] Query result rows:', result.rows.length);
        console.log('[SESSION_REQUESTS] Query result data:', result.rows);

        res.json({
            success: true,
            requests: result.rows
        });

    } catch (error) {
        console.error('Get session requests error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get session requests'
        });
    }
});

// @route   POST api/sessions/requests/:requestId/respond
// @desc    Respond to a session request (accept/decline)
// @access  Private (Protected by verifyToken)
router.post('/requests/:requestId/respond', verifyToken, async (req, res) => {
    const { requestId } = req.params;
    const { action, scheduledTime } = req.body; // action: 'accept' or 'decline'
    
    try {
        const mentorId = req.user.id;

        // Validate action
        if (!['accept', 'decline'].includes(action)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid action. Must be "accept" or "decline"'
            });
        }

        // Check if request exists and belongs to this mentor
        const requestResult = await db.query(
            'SELECT * FROM session_requests WHERE id = $1 AND mentor_id = $2 AND status = $3',
            [requestId, mentorId, 'pending']
        );

        if (requestResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Session request not found or already responded to'
            });
        }

        const sessionRequest = requestResult.rows[0];

        if (action === 'accept') {
            // Update request status and create actual session
            await db.query('BEGIN');

            try {
                // Use provided scheduledTime or fall back to preferred_datetime
                const finalScheduledTime = scheduledTime || sessionRequest.preferred_datetime || sessionRequest.scheduled_time;
                
                // Update session request
                await db.query(
                    'UPDATE session_requests SET status = $1, responded_at = NOW(), scheduled_time = $2 WHERE id = $3',
                    ['accepted', finalScheduledTime, requestId]
                );

                // Create actual session
                const sessionResult = await db.query(`
                    INSERT INTO sessions (
                        student_id, 
                        mentor_id, 
                        session_type, 
                        description, 
                        status, 
                        scheduled_time,
                        created_at
                    ) VALUES ($1, $2, $3, $4, 'scheduled', $5, NOW())
                    RETURNING *
                `, [
                    sessionRequest.requester_id,
                    sessionRequest.mentor_id,
                    sessionRequest.session_type,
                    sessionRequest.description,
                    finalScheduledTime
                ]);

                // If there was a preferred time, try to mark any corresponding time slot as booked
                // Only if calendar tables exist and finalScheduledTime is valid
                if (finalScheduledTime) {
                    try {
                        await db.query(`
                            UPDATE teacher_time_slots 
                            SET status = 'booked', session_request_id = $1
                            WHERE teacher_id = $2 
                            AND start_datetime <= $3 
                            AND end_datetime >= $3
                            AND status = 'available'
                        `, [sessionRequest.id, sessionRequest.mentor_id, finalScheduledTime]);
                    } catch (timeSlotError) {
                        // Calendar integration is optional - don't fail if time slot update fails
                        console.log('Optional time slot update failed (this is OK for older requests):', timeSlotError.message);
                    }
                }

                await db.query('COMMIT');

                res.json({
                    success: true,
                    message: 'Session request accepted and session created',
                    session: sessionResult.rows[0]
                });

            } catch (error) {
                await db.query('ROLLBACK');
                throw error;
            }
        } else {
            // Decline request
            await db.query(
                'UPDATE session_requests SET status = $1, responded_at = NOW() WHERE id = $2',
                ['declined', requestId]
            );

            res.json({
                success: true,
                message: 'Session request declined'
            });
        }

    } catch (error) {
        console.error('Respond to session request error:', error);
        console.error('Error details:', error.message);
        console.error('Request ID:', requestId);
        console.error('User ID:', req.user?.id);
        console.error('Action:', req.body?.action);
        res.status(500).json({
            success: false,
            error: 'Failed to respond to session request',
            details: error.message
        });
    }
});

// @route   PUT api/sessions/requests/:requestId/schedule
// @desc    Update the scheduled time for an accepted session request
// @access  Private (Protected by verifyToken)
router.put('/requests/:requestId/schedule', verifyToken, async (req, res) => {
    const { requestId } = req.params;
    const { scheduledTime } = req.body;
    
    try {
        const mentorId = req.user.id;

        // Validate scheduledTime
        if (!scheduledTime) {
            return res.status(400).json({
                success: false,
                message: 'scheduledTime is required'
            });
        }

        // Verify the request exists and belongs to this mentor
        const requestResult = await db.query(
            'SELECT * FROM session_requests WHERE id = $1 AND mentor_id = $2 AND status = $3',
            [requestId, mentorId, 'accepted']
        );

        if (requestResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Accepted session request not found or does not belong to you'
            });
        }

        // Update the scheduled time
        const updateResult = await db.query(
            'UPDATE session_requests SET scheduled_time = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
            [scheduledTime, requestId]
        );

        res.json({
            success: true,
            message: 'Session time updated successfully',
            request: updateResult.rows[0]
        });

    } catch (error) {
        console.error('Update session time error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update session time',
            details: error.message
        });
    }
});

// @route   POST api/sessions/requests/:requestId/schedule-response
// @desc    Send a scheduling response to the student with either Calendly link or fixed time
// @access  Private (Protected by verifyToken)
router.post('/requests/:requestId/schedule-response', verifyToken, async (req, res) => {
    const { requestId } = req.params;
    const { message, schedulingType, calendlyUrl, scheduledTime } = req.body;
    
    try {
        const mentorId = req.user.id;

        // Validate required fields
        if (!message || !schedulingType) {
            return res.status(400).json({
                success: false,
                message: 'message and schedulingType are required'
            });
        }

        if (schedulingType === 'calendly_link' && !calendlyUrl) {
            return res.status(400).json({
                success: false,
                message: 'calendlyUrl is required for calendly_link scheduling type'
            });
        }

        if (schedulingType === 'fixed_time' && !scheduledTime) {
            return res.status(400).json({
                success: false,
                message: 'scheduledTime is required for fixed_time scheduling type'
            });
        }

        // Verify the request exists and belongs to this mentor
        const requestResult = await db.query(
            'SELECT sr.*, u.username as student_username, up.email as student_email FROM session_requests sr JOIN users u ON sr.requester_id = u.id LEFT JOIN user_profiles up ON u.id = up.user_id WHERE sr.id = $1 AND sr.mentor_id = $2 AND sr.status = $3',
            [requestId, mentorId, 'accepted']
        );

        if (requestResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Accepted session request not found or does not belong to you'
            });
        }

        const sessionRequest = requestResult.rows[0];
        
        await db.query('BEGIN');

        try {
            // If it's a fixed time, update the scheduled_time field
            if (schedulingType === 'fixed_time') {
                await db.query(
                    'UPDATE session_requests SET scheduled_time = $1, updated_at = NOW() WHERE id = $2',
                    [scheduledTime, requestId]
                );
            }

            // Create a notification/message for the student
            await db.query(`
                INSERT INTO messages (
                    sender_id,
                    recipient_id, 
                    subject,
                    content,
                    message_type,
                    session_request_id,
                    created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
            `, [
                mentorId,
                sessionRequest.requester_id,
                `Scheduling Response: ${sessionRequest.session_type}`,
                schedulingType === 'calendly_link' 
                    ? `${message}\n\nCalendly Link: ${calendlyUrl}`
                    : `${message}\n\nScheduled Time: ${new Date(scheduledTime).toLocaleString()}`,
                'scheduling_response',
                requestId
            ]);

            // Update request status to indicate teacher has responded with scheduling info
            await db.query(
                'UPDATE session_requests SET flow_status = $1, updated_at = NOW() WHERE id = $2',
                ['teacher_scheduled', requestId]
            );

            await db.query('COMMIT');

            res.json({
                success: true,
                message: 'Scheduling response sent to student successfully',
                schedulingType,
                scheduledTime: schedulingType === 'fixed_time' ? scheduledTime : null,
                calendlyUrl: schedulingType === 'calendly_link' ? calendlyUrl : null
            });

        } catch (error) {
            await db.query('ROLLBACK');
            throw error;
        }

    } catch (error) {
        console.error('Send scheduling response error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to send scheduling response',
            details: error.message
        });
    }
});

// @route   GET api/sessions/messages
// @desc    Get scheduling messages for the authenticated user
// @access  Private (Protected by verifyToken)
router.get('/messages', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const messagesResult = await db.query(`
            SELECT 
                m.*,
                sender.username as sender_username,
                sender_profile.display_name as sender_display_name,
                sr.session_type,
                sr.description as session_description,
                sr.scheduled_time,
                sr.status as session_status
            FROM messages m
            JOIN users sender ON m.sender_id = sender.id
            LEFT JOIN user_profiles sender_profile ON sender.id = sender_profile.user_id
            LEFT JOIN session_requests sr ON m.session_request_id = sr.id
            WHERE m.recipient_id = $1 
            AND m.message_type IN ('scheduling_response', 'session_update')
            ORDER BY m.created_at DESC
            LIMIT 50
        `, [userId]);

        res.json({
            success: true,
            messages: messagesResult.rows
        });

    } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get messages',
            details: error.message
        });
    }
});

// @route   POST api/sessions/messages/:messageId/mark-read
// @desc    Mark a message as read
// @access  Private (Protected by verifyToken)
router.post('/messages/:messageId/mark-read', verifyToken, async (req, res) => {
    try {
        const { messageId } = req.params;
        const userId = req.user.id;

        await db.query(
            'UPDATE messages SET is_read = true, read_at = NOW() WHERE id = $1 AND recipient_id = $2',
            [messageId, userId]
        );

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

// @route   GET api/sessions
// @desc    Get sessions for the authenticated user (as student or mentor)
// @access  Private (Protected by verifyToken)
router.get('/', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { status = 'all' } = req.query; // 'scheduled', 'active', 'completed', 'all'

        console.log('[SESSIONS] API called by user:', req.user.username, 'ID:', userId, 'Status filter:', status);

        let statusFilter = '';
        let params = [userId, userId];

        if (status !== 'all') {
            statusFilter = 'AND s.status = $3';
            params.push(status);
        }

        // Get sessions where user is either student or mentor
        const query = `
            SELECT s.*, 
                   student.username as student_username, 
                   student_profile.display_name as student_display_name,
                   mentor.username as mentor_username, 
                   mentor_profile.display_name as mentor_display_name,
                   CASE 
                       WHEN s.student_id = $1 THEN 'student'
                       WHEN s.mentor_id = $1 THEN 'mentor'
                   END as user_role_in_session
            FROM sessions s
            JOIN users student ON s.student_id = student.id
            LEFT JOIN user_profiles student_profile ON student.id = student_profile.user_id
            JOIN users mentor ON s.mentor_id = mentor.id
            LEFT JOIN user_profiles mentor_profile ON mentor.id = mentor_profile.user_id
            WHERE (s.student_id = $1 OR s.mentor_id = $2)
            ${statusFilter}
            ORDER BY s.scheduled_time DESC, s.created_at DESC
        `;

        const result = await db.query(query, params);

        console.log('[SESSIONS] Query executed:', query);
        console.log('[SESSIONS] Query params:', params);
        console.log('[SESSIONS] Query result rows:', result.rows.length);
        console.log('[SESSIONS] Query result data:', result.rows);

        res.json({
            success: true,
            sessions: result.rows
        });

    } catch (error) {
        console.error('Get sessions error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get sessions'
        });
    }
});

module.exports = router;