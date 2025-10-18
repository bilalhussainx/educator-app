const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware'); // Correctly import your middleware
const db = require('../db');
const { getActiveSessions } = require('../services/sessionStore');
const sessionController = require('../controllers/sessionController');
const { getSessionNotificationHandler } = require('../src/handlers/sessionNotificationHandler');

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

// @route   POST api/sessions/create-live
// @desc    Create a new live session record in the database
// @access  Private (Protected by verifyToken - must be teacher)
// NOTE: This route MUST come before /:sessionId routes to avoid being matched by the parameter
router.post('/create-live', verifyToken, async (req, res) => {
    try {
        const { sessionId, mode, courseId, sessionType, description } = req.body;
        const teacherId = req.user.id;

        console.log('[CREATE_LIVE_SESSION] Request body:', req.body);
        console.log('[CREATE_LIVE_SESSION] Creating live session:', {
            sessionId,
            mode,
            courseId,
            courseIdType: typeof courseId,
            sessionType,
            teacherId
        });

        // Validate required fields
        if (!courseId) {
            console.log('[CREATE_LIVE_SESSION] ❌ Missing courseId');
            return res.status(400).json({
                success: false,
                error: 'Course ID is required'
            });
        }

        // Check if user is a teacher
        if (req.user.role !== 'teacher') {
            return res.status(403).json({
                success: false,
                error: 'Only teachers can create live sessions'
            });
        }

        // Create the session record
        // For live sessions without a specific student, we use the teacher's ID as both mentor and student
        // This is a temporary solution - in a real system, students would join dynamically
        // Note: We don't specify 'id' - let database auto-generate it
        let result;
        try {
            result = await db.query(`
                INSERT INTO sessions (
                    mentor_id,
                    student_id,
                    session_type,
                    description,
                    status,
                    scheduled_time
                ) VALUES ($1, $1, $2, $3, 'active', NOW())
                RETURNING *
            `, [
                teacherId,
                sessionType || 'live_tutorial',
                description || 'Live Session'
            ]);
        } catch (dbError) {
            console.error('[CREATE_LIVE_SESSION] ❌ Database error:', dbError);
            console.error('[CREATE_LIVE_SESSION] Error details:', {
                code: dbError.code,
                detail: dbError.detail,
                message: dbError.message,
                constraint: dbError.constraint
            });
            return res.status(500).json({
                success: false,
                error: 'Failed to create session in database',
                details: dbError.message,
                code: dbError.code
            });
        }

        const session = result.rows[0];

        console.log('[CREATE_LIVE_SESSION] ✅ Session created:', session.id);

        // Broadcast live session notification to enrolled students
        try {
            const notificationHandler = getSessionNotificationHandler();
            const teacherResult = await db.query('SELECT username FROM users WHERE id = $1', [teacherId]);
            const teacherName = teacherResult.rows[0]?.username || 'Teacher';

            console.log('[CREATE_LIVE_SESSION] Broadcasting to enrolled students in course:', courseId);
            await notificationHandler.broadcastSessionCreated({
                courseId,
                sessionId: session.id,
                teacherId,
                teacherName,
                title: session.description || 'Live Session',
                mode: mode || 'code'
            });
            console.log('[CREATE_LIVE_SESSION] ✅ Live session notifications sent to enrolled students');
        } catch (notificationError) {
            console.error('[CREATE_LIVE_SESSION] ⚠️  Error sending live session notifications:', notificationError);
            console.error('[CREATE_LIVE_SESSION] Notification error stack:', notificationError.stack);
            // Don't fail the request if notifications fail
        }

        res.json({
            success: true,
            message: 'Live session created successfully',
            session
        });

    } catch (error) {
        console.error('[CREATE_LIVE_SESSION] ❌ Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create live session',
            details: error.message
        });
    }
});

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
                 WHERE sr.requester_id = $2)
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

        console.log('[RESPOND_TO_REQUEST] ==========================================');
        console.log('[RESPOND_TO_REQUEST] Request ID:', requestId);
        console.log('[RESPOND_TO_REQUEST] Mentor ID:', mentorId);
        console.log('[RESPOND_TO_REQUEST] Action:', action);
        console.log('[RESPOND_TO_REQUEST] Scheduled Time:', scheduledTime);

        // Validate action
        if (!['accept', 'decline'].includes(action)) {
            console.log('[RESPOND_TO_REQUEST] ❌ Invalid action');
            return res.status(400).json({
                success: false,
                message: 'Invalid action. Must be "accept" or "decline"'
            });
        }

        // Check if request exists and belongs to this mentor
        console.log('[RESPOND_TO_REQUEST] Querying for session request...');
        const requestResult = await db.query(
            'SELECT * FROM session_requests WHERE id = $1 AND mentor_id = $2 AND status = $3',
            [requestId, mentorId, 'pending']
        );

        console.log('[RESPOND_TO_REQUEST] Query result:', {
            rowCount: requestResult.rows.length,
            rows: requestResult.rows
        });

        if (requestResult.rows.length === 0) {
            console.log('[RESPOND_TO_REQUEST] ❌ Request not found or already responded to');

            // Debug: Check if request exists at all
            const debugResult = await db.query('SELECT * FROM session_requests WHERE id = $1', [requestId]);
            console.log('[RESPOND_TO_REQUEST] Debug - Request exists:', debugResult.rows.length > 0);
            if (debugResult.rows.length > 0) {
                console.log('[RESPOND_TO_REQUEST] Debug - Request details:', debugResult.rows[0]);
                console.log('[RESPOND_TO_REQUEST] Debug - Mentor ID match:', debugResult.rows[0].mentor_id === mentorId);
                console.log('[RESPOND_TO_REQUEST] Debug - Status:', debugResult.rows[0].status);
            }

            return res.status(404).json({
                success: false,
                message: 'Session request not found or already responded to',
                debug: {
                    requestExists: debugResult.rows.length > 0,
                    requestStatus: debugResult.rows[0]?.status,
                    mentorMatch: debugResult.rows[0]?.mentor_id === mentorId
                }
            });
        }

        const sessionRequest = requestResult.rows[0];

        if (action === 'accept') {
            console.log('[RESPOND_TO_REQUEST] ✅ Accepting request and creating session...');

            // Update request status and create actual session
            await db.query('BEGIN');

            try {
                // Use provided scheduledTime or fall back to preferred_datetime
                const finalScheduledTime = scheduledTime || sessionRequest.preferred_datetime || sessionRequest.scheduled_time;

                console.log('[RESPOND_TO_REQUEST] Final scheduled time:', finalScheduledTime);
                console.log('[RESPOND_TO_REQUEST] Session request details:', {
                    requester_id: sessionRequest.requester_id,
                    mentor_id: sessionRequest.mentor_id,
                    session_type: sessionRequest.session_type,
                    description: sessionRequest.description
                });

                // Update session request
                console.log('[RESPOND_TO_REQUEST] Updating session request status to accepted...');
                await db.query(
                    'UPDATE session_requests SET status = $1, responded_at = NOW(), scheduled_time = $2 WHERE id = $3',
                    ['accepted', finalScheduledTime, requestId]
                );
                console.log('[RESPOND_TO_REQUEST] ✅ Session request updated');

                // Create actual session
                console.log('[RESPOND_TO_REQUEST] Creating session...');
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

                console.log('[RESPOND_TO_REQUEST] ✅ Session created:', sessionResult.rows[0]);

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
                        console.log('[RESPOND_TO_REQUEST] Optional time slot update failed (this is OK):', timeSlotError.message);
                    }
                }

                await db.query('COMMIT');
                console.log('[RESPOND_TO_REQUEST] ✅ Transaction committed');

                console.log('[RESPOND_TO_REQUEST] ==========================================');

                res.json({
                    success: true,
                    message: 'Session request accepted and session created',
                    session: sessionResult.rows[0]
                });

            } catch (error) {
                console.error('[RESPOND_TO_REQUEST] ❌ Error during accept:', error);
                await db.query('ROLLBACK');
                console.log('[RESPOND_TO_REQUEST] Transaction rolled back');
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

// @route   GET api/sessions/:sessionId/generate-token
// @desc    Generate Agora token for video session
// @access  Private (Protected by verifyToken)
// NOTE: This must come AFTER all specific routes (like /create-live, /request, etc.)
router.get('/:sessionId/generate-token', verifyToken, sessionController.generateAgoraToken);

// @route   POST api/sessions/:sessionId/start
// @desc    Start a session immediately (sets status to active and notifies participants)
// @access  Private (Protected by verifyToken - must be mentor/teacher)
router.post('/:sessionId/start', verifyToken, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { mode } = req.body; // Get mode from request body
        const userId = req.user.id;

        console.log('[START_SESSION] Teacher starting session:', sessionId, 'by user:', userId, 'mode:', mode);

        // Validate mode
        if (mode && !['code', 'essay'].includes(mode)) {
            return res.status(400).json({
                success: false,
                error: `Invalid session mode: ${mode}. Must be 'code' or 'essay'`
            });
        }

        // Get the session - handle both integer and UUID strings
        const sessionQuery = !isNaN(sessionId)
            ? 'SELECT * FROM sessions WHERE id = $1'
            : 'SELECT * FROM sessions WHERE id::text = $1';
        const sessionParam = !isNaN(sessionId) ? parseInt(sessionId) : sessionId;
        const sessionResult = await db.query(sessionQuery, [sessionParam]);

        if (sessionResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Session not found'
            });
        }

        const session = sessionResult.rows[0];

        // Verify user is the mentor/teacher
        if (session.mentor_id !== userId) {
            return res.status(403).json({
                success: false,
                error: 'Only the teacher can start this session'
            });
        }

        // First, mark any other active sessions by this teacher as completed
        const excludeQuery = !isNaN(sessionId)
            ? `UPDATE sessions SET status = 'completed', ended_at = NOW(), updated_at = NOW() WHERE mentor_id = $1 AND status = 'active' AND id != $2 RETURNING id, student_id`
            : `UPDATE sessions SET status = 'completed', ended_at = NOW(), updated_at = NOW() WHERE mentor_id = $1 AND status = 'active' AND id::text != $2 RETURNING id, student_id`;
        const excludeParam = !isNaN(sessionId) ? parseInt(sessionId) : sessionId;
        const oldSessionsResult = await db.query(excludeQuery, [userId, excludeParam]);

        console.log('[START_SESSION] Marked', oldSessionsResult.rows.length, 'previous active sessions as completed');

        // Notify students that their old sessions have ended
        const io = req.app.get('io');
        if (io && oldSessionsResult.rows.length > 0) {
            oldSessionsResult.rows.forEach(oldSession => {
                io.emit('session_ended', {
                    sessionId: oldSession.id,
                    studentId: oldSession.student_id,
                    message: 'Teacher has started a new session'
                });
                console.log('[START_SESSION] Notified student', oldSession.student_id, 'that session', oldSession.id, 'ended');
            });
        }

        // Update session status to active, set started_at, and save mode
        const updateQuery = !isNaN(sessionId)
            ? `UPDATE sessions SET status = 'active', started_at = NOW(), updated_at = NOW(), session_mode = $2 WHERE id = $1 RETURNING *`
            : `UPDATE sessions SET status = 'active', started_at = NOW(), updated_at = NOW(), session_mode = $2 WHERE id::text = $1 RETURNING *`;
        const updateParam = !isNaN(sessionId) ? parseInt(sessionId) : sessionId;
        const updateResult = await db.query(updateQuery, [updateParam, mode || null]);

        const updatedSession = updateResult.rows[0];

        console.log('[START_SESSION] Session started:', updatedSession.id);

        // Send Socket.IO notification to all connected clients (especially the student)
        // Reusing the io variable declared earlier
        if (io) {
            const notificationData = {
                sessionId: updatedSession.id,
                sessionType: updatedSession.session_type,
                sessionMode: updatedSession.session_mode,
                mentorId: session.mentor_id,
                studentId: session.student_id,
                startedAt: updatedSession.started_at,
                message: `Session has been started in ${mode === 'code' ? 'Code Editor' : 'Essay Writing'} mode!`
            };

            console.log('[START_SESSION] =====================================');
            console.log('[START_SESSION] Emitting session_started event');
            console.log('[START_SESSION] Session ID:', sessionId);
            console.log('[START_SESSION] Session Mode:', mode);
            console.log('[START_SESSION] Session Type:', updatedSession.session_type);
            console.log('[START_SESSION] Student ID:', session.student_id);
            console.log('[START_SESSION] Connected sockets:', io.sockets.sockets.size);
            console.log('[START_SESSION] Notification data:', notificationData);
            console.log('[START_SESSION] =====================================');

            // Broadcast to all clients
            io.emit('session_started', notificationData);

            // Also try room-based notification if rooms are set up
            io.to(`user_${session.student_id}`).emit('session_started', notificationData);

            console.log('[START_SESSION] ✅ Socket.IO events emitted');
        } else {
            console.log('[START_SESSION] ❌ WARNING: Socket.IO not available');
        }

        // NEW: Broadcast live session notification to enrolled students if courseId is available
        try {
            const notificationHandler = getSessionNotificationHandler();
            // Get teacher info for notification
            const teacherResult = await db.query('SELECT username FROM users WHERE id = $1', [userId]);
            const teacherName = teacherResult.rows[0]?.username || 'Teacher';

            // Try to get courseId from the request body or session metadata
            const courseId = req.body.courseId || updatedSession.course_id;

            if (courseId) {
                console.log('[START_SESSION] Broadcasting to enrolled students in course:', courseId);
                await notificationHandler.broadcastSessionCreated({
                    courseId,
                    sessionId: updatedSession.id,
                    teacherId: userId,
                    teacherName,
                    title: updatedSession.description || 'Live Session',
                    mode: mode || 'code'
                });
                console.log('[START_SESSION] ✅ Live session notifications sent to enrolled students');
            } else {
                console.log('[START_SESSION] ⏭️  No courseId, skipping enrolled student notifications');
            }
        } catch (notificationError) {
            console.error('[START_SESSION] ⚠️  Error sending live session notifications:', notificationError.message);
            // Don't fail the request if notifications fail
        }

        res.json({
            success: true,
            message: 'Session started successfully',
            session: updatedSession
        });

    } catch (error) {
        console.error('Start session error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to start session',
            details: error.message
        });
    }
});

// @route   POST api/sessions/:sessionId/end
// @desc    End and delete an active session
// @access  Private (Protected by verifyToken - must be mentor)
router.post('/:sessionId/end', verifyToken, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const userId = req.user.id;
        const { deleteSession = true } = req.body; // Option to delete or just mark as completed

        console.log('[END_SESSION] Request from user:', req.user.username, 'for session:', sessionId);
        console.log('[END_SESSION] Delete session:', deleteSession);

        // Get session details - handle both UUID string and integer IDs
        let sessionQuery;
        try {
            // Try as integer first if it looks like a number
            if (!isNaN(sessionId)) {
                sessionQuery = await db.query(
                    'SELECT * FROM sessions WHERE id = $1',
                    [parseInt(sessionId)]
                );
            } else {
                // Otherwise try as text/UUID
                sessionQuery = await db.query(
                    'SELECT * FROM sessions WHERE id::text = $1',
                    [sessionId]
                );
            }
        } catch (err) {
            console.log('[END_SESSION] Query error:', err.message);
            return res.status(500).json({
                success: false,
                error: 'Failed to query session',
                details: err.message
            });
        }

        if (sessionQuery.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Session not found'
            });
        }

        const session = sessionQuery.rows[0];

        // Verify user is the mentor (handle both string and UUID comparison)
        const sessionMentorId = String(session.mentor_id);
        const requestUserId = String(userId);

        console.log('[END_SESSION] Comparing IDs - Session mentor:', sessionMentorId, 'Request user:', requestUserId);

        if (sessionMentorId !== requestUserId) {
            return res.status(403).json({
                success: false,
                error: 'Only the teacher can end this session'
            });
        }

        // Send Socket.IO notification BEFORE deleting (optional, won't fail if not available)
        try {
            const io = req.app.get('io');
            if (io) {
                const notificationData = {
                    sessionId: session.id,
                    studentId: session.student_id,
                    mentorId: session.mentor_id,
                    endedAt: new Date().toISOString(),
                    message: 'Session has been ended and removed by the teacher'
                };

                console.log('[END_SESSION] Emitting session_ended event');
                io.emit('session_ended', notificationData);
                io.to(`user_${session.student_id}`).emit('session_ended', notificationData);
                console.log('[END_SESSION] ✅ Socket.IO events emitted');
            } else {
                console.log('[END_SESSION] ⚠️ Socket.IO not available, skipping notification');
            }

            // Remove from active sessions
            try {
                const notificationHandler = getSessionNotificationHandler();
                notificationHandler.removeActiveSession(session.id);
                console.log('[END_SESSION] ✅ Removed session from active sessions');
            } catch (err) {
                console.log('[END_SESSION] ⚠️ Could not remove from active sessions:', err.message);
            }
        } catch (ioError) {
            console.log('[END_SESSION] ⚠️ Socket.IO error (non-fatal):', ioError.message);
        }

        let result;
        try {
            if (deleteSession) {
                // Delete the session completely
                console.log('[END_SESSION] Attempting to delete session:', sessionId);
                const deleteQuery = !isNaN(sessionId)
                    ? 'DELETE FROM sessions WHERE id = $1 RETURNING *'
                    : 'DELETE FROM sessions WHERE id::text = $1 RETURNING *';
                const deleteParam = !isNaN(sessionId) ? parseInt(sessionId) : sessionId;
                const deleteResult = await db.query(deleteQuery, [deleteParam]);

                if (deleteResult.rows.length === 0) {
                    throw new Error('Session not found or already deleted');
                }

                result = deleteResult.rows[0];
                console.log('[END_SESSION] ✅ Session deleted:', result.id);
            } else {
                // Just mark as completed
                console.log('[END_SESSION] Attempting to mark session as completed:', sessionId);
                const updateQuery = !isNaN(sessionId)
                    ? `UPDATE sessions SET status = 'completed', ended_at = NOW(), updated_at = NOW() WHERE id = $1 RETURNING *`
                    : `UPDATE sessions SET status = 'completed', ended_at = NOW(), updated_at = NOW() WHERE id::text = $1 RETURNING *`;
                const updateParam = !isNaN(sessionId) ? parseInt(sessionId) : sessionId;
                const updateResult = await db.query(updateQuery, [updateParam]);

                if (updateResult.rows.length === 0) {
                    throw new Error('Session not found or update failed');
                }

                result = updateResult.rows[0];
                console.log('[END_SESSION] ✅ Session marked as completed:', result.id);
            }

            res.json({
                success: true,
                message: deleteSession ? 'Session ended and removed successfully' : 'Session ended successfully',
                session: result,
                deleted: deleteSession
            });
        } catch (dbError) {
            console.error('[END_SESSION] ❌ Database error:', dbError);
            throw dbError;
        }

    } catch (error) {
        console.error('[END_SESSION] ❌ Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to end session',
            details: error.message
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

// REMOVED: Duplicate /start endpoint that didn't save session_mode
// The correct /start endpoint is defined earlier in this file (around line 638)
// which properly saves the session_mode parameter

// @route   POST api/sessions/upload-document
// @desc    Upload document for live sessions
// @access  Private (Protected by verifyToken)
router.post('/upload-document', verifyToken, async (req, res) => {
    try {
        // Import the document controller upload functionality
        const { uploadDocument } = require('../controllers/documentController');

        // Use the existing document upload middleware and controller
        const multer = require('multer');
        const path = require('path');
        const fs = require('fs').promises;

        // Configure multer for session document uploads
        const storage = multer.diskStorage({
            destination: async (req, file, cb) => {
                const uploadDir = path.join(__dirname, '../uploads/session-documents');
                try {
                    await fs.mkdir(uploadDir, { recursive: true });
                    cb(null, uploadDir);
                } catch (error) {
                    cb(error);
                }
            },
            filename: (req, file, cb) => {
                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
                const extension = path.extname(file.originalname);
                cb(null, `session-doc-${uniqueSuffix}${extension}`);
            }
        });

        const upload = multer({
            storage: storage,
            limits: {
                fileSize: 10 * 1024 * 1024, // 10MB limit
            },
            fileFilter: (req, file, cb) => {
                const allowedTypes = [
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
                    'application/msword', // .doc
                    'text/plain', // .txt
                    'application/pdf' // .pdf
                ];

                if (allowedTypes.includes(file.mimetype)) {
                    cb(null, true);
                } else {
                    cb(new Error('Invalid file type. Only Word documents, PDFs, and text files are allowed.'));
                }
            }
        });

        // Use multer middleware to handle the file upload
        upload.single('document')(req, res, async (err) => {
            if (err) {
                console.error('File upload error:', err);
                return res.status(400).json({
                    success: false,
                    error: err.message || 'File upload failed'
                });
            }

            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    error: 'No file uploaded'
                });
            }

            try {
                const { sessionId, courseId, instructions, teacherId } = req.body;

                // Create a simple document record for the session
                const db = require('../db');
                const { v4: uuidv4 } = require('uuid');

                const documentId = uuidv4();

                // Store document info in a session_documents table (create if needed)
                await db.query(`
                    CREATE TABLE IF NOT EXISTS session_documents (
                        id VARCHAR(36) PRIMARY KEY,
                        session_id VARCHAR(36),
                        teacher_id VARCHAR(36),
                        course_id VARCHAR(36),
                        original_name VARCHAR(255) NOT NULL,
                        file_path VARCHAR(500) NOT NULL,
                        file_size INTEGER NOT NULL,
                        mime_type VARCHAR(100),
                        instructions TEXT,
                        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                `);

                await db.query(`
                    INSERT INTO session_documents
                    (id, session_id, teacher_id, course_id, original_name, file_path, file_size, mime_type, instructions)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                `, [
                    documentId,
                    sessionId,
                    teacherId || req.user.id,
                    courseId,
                    req.file.originalname,
                    req.file.path,
                    req.file.size,
                    req.file.mimetype,
                    instructions
                ]);

                console.log(`[SESSION] Document uploaded for session ${sessionId}: ${req.file.originalname}`);

                // Extract content from the uploaded file
                const fs = require('fs').promises;
                let content = '';

                try {
                    if (req.file.mimetype === 'text/plain') {
                        content = await fs.readFile(req.file.path, 'utf-8');
                    } else if (req.file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
                        // For .docx files, use mammoth
                        try {
                            const mammoth = require('mammoth');
                            const result = await mammoth.extractRawText({ path: req.file.path });
                            content = result.value;
                        } catch (mammothError) {
                            console.log('Mammoth not available, trying to install it...');
                            content = '[Document uploaded but content extraction failed. Please install mammoth: npm install mammoth]';
                        }
                    } else if (req.file.mimetype === 'application/pdf') {
                        content = '[PDF content extraction not implemented yet. Document uploaded successfully.]';
                    }
                } catch (extractError) {
                    console.error('Content extraction error:', extractError);
                    content = '[Content extraction failed but document was uploaded successfully]';
                }

                res.json({
                    success: true,
                    documentId: documentId,
                    message: 'Document uploaded successfully',
                    fileName: req.file.originalname,
                    fileSize: req.file.size,
                    content: content
                });

            } catch (dbError) {
                console.error('Database error during document upload:', dbError);
                res.status(500).json({
                    success: false,
                    error: 'Failed to save document information'
                });
            }
        });

    } catch (error) {
        console.error('Document upload route error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// @route   GET api/sessions/:sessionId/document
// @desc    Get document for a session
// @access  Private (Protected by verifyToken)
router.get('/:sessionId/document', verifyToken, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const db = require('../db');

        // Get document for this session
        const result = await db.query(`
            SELECT
                id,
                session_id,
                original_name,
                file_path,
                file_size,
                mime_type,
                instructions,
                uploaded_at
            FROM session_documents
            WHERE session_id = $1
            ORDER BY uploaded_at DESC
            LIMIT 1
        `, [sessionId]);

        if (result.rows.length === 0) {
            return res.json({
                success: false,
                message: 'No document found for this session'
            });
        }

        const document = result.rows[0];

        // Try to extract content from the file
        const fs = require('fs').promises;
        const path = require('path');
        let content = '';

        try {
            if (document.mime_type === 'text/plain') {
                content = await fs.readFile(document.file_path, 'utf-8');
            } else if (document.mime_type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
                // For .docx files, use mammoth if available
                try {
                    const mammoth = require('mammoth');
                    const result = await mammoth.extractRawText({ path: document.file_path });
                    content = result.value;
                } catch (mammothError) {
                    console.log('Mammoth not available or failed, returning empty content');
                    content = '';
                }
            }
        } catch (fileError) {
            console.error('Failed to read file content:', fileError);
            content = '';
        }

        res.json({
            success: true,
            document: {
                ...document,
                content
            }
        });

    } catch (error) {
        console.error('Error getting session document:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get session document'
        });
    }
});

module.exports = router;