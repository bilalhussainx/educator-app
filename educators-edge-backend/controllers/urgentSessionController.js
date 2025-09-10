// Urgent Session Controller - Handle immediate AI bot session requests
const urgentSessionService = require('../services/urgentSessionService');
const db = require('../db');

/**
 * Create urgent session request (auto-accepted by AI bot)
 */
const createUrgentRequest = async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({
                success: false,
                error: 'User not authenticated'
            });
        }
        
        const studentId = req.user.id;
        const {
            subject = 'Computer Science',
            topic,
            description,
            lessonId,
            courseId,
            difficulty = 'intermediate',
            sessionType = 'mentoring', // 'mentoring', 'essay_editing', 'counseling'
            documentId
        } = req.body;

        console.log(`[URGENT_SESSION] Received request from student ${studentId}:`);
        console.log(`[URGENT_SESSION] Request body:`, req.body);
        console.log(`[URGENT_SESSION] Parsed fields: topic="${topic}", description="${description}", subject="${subject}", sessionType="${sessionType}", documentId="${documentId}"`);

        // Validate required fields
        if (!topic || !description) {
            return res.status(400).json({
                success: false,
                error: 'Topic and description are required'
            });
        }

        // Check if student has any active urgent sessions
        console.log(`[URGENT_SESSION] Checking for active sessions for student ${studentId}`);
        const activeSessions = await urgentSessionService.getActiveUrgentSessions(studentId);
        console.log(`[URGENT_SESSION] Found ${activeSessions.length} active sessions`);
        
        if (activeSessions.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'You already have an active urgent session. Please complete it before requesting another.',
                activeSessions: activeSessions.map(session => ({
                    id: session.id,
                    topic: session.topic,
                    status: session.status,
                    mentorName: session.mentor_name,
                    scheduledTime: session.scheduled_time,
                    liveSessionId: session.live_session_id
                }))
            });
        }

        // Create urgent request
        const requestData = {
            subject,
            topic,
            description,
            lessonId,
            courseId,
            difficulty,
            sessionType,
            documentId
        };

        console.log(`[URGENT_SESSION] Creating urgent session with data:`, requestData);
        const result = await urgentSessionService.createUrgentRequest(studentId, requestData);
        console.log(`[URGENT_SESSION] Successfully created urgent session:`, result);

        res.json({
            success: true,
            message: 'Urgent session request created successfully',
            data: {
                requestId: result.requestId,
                bot: result.botInfo,
                sessionTime: result.sessionTime,
                chatSessionId: result.chatSessionId,
                status: result.status,
                liveSessionId: result.liveSessionId,
                liveSessionUrl: result.liveSessionUrl
            },
            instructions: {
                nextSteps: [
                    'Your AI mentor has accepted your request',
                    'Live session will start automatically in 10 minutes',
                    'You can chat with your mentor right now to prepare',
                    'You\'ll receive a notification when the live session begins'
                ],
                sessionTime: result.sessionTime,
                mentorInfo: result.botInfo
            }
        });

    } catch (error) {
        console.error('Error creating urgent request:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to create urgent session request'
        });
    }
};

/**
 * Get active urgent sessions for current user
 */
const getActiveUrgentSessions = async (req, res) => {
    try {
        const studentId = req.user.id;
        const sessions = await urgentSessionService.getActiveUrgentSessions(studentId);

        // Get additional session details
        const sessionsWithDetails = await Promise.all(sessions.map(async (session) => {
            const scheduledData = urgentSessionService.getScheduledSession(session.id);
            
            return {
                requestId: session.id,
                topic: session.topic,
                description: session.description,
                status: session.status,
                mentorName: session.mentor_name,
                sessionType: session.session_type,
                scheduledTime: session.scheduled_time,
                liveSessionId: session.live_session_id,
                liveStatus: session.live_status,
                sessionStartedAt: session.session_started_at,
                documentId: session.document_id,
                chatSessionId: session.chat_session_id,
                isScheduled: scheduledData?.status === 'scheduled',
                isLive: scheduledData?.status === 'live',
                scheduledData: scheduledData ? {
                    sessionTime: scheduledData.sessionTime,
                    status: scheduledData.status,
                    botName: scheduledData.botId
                } : null
            };
        }));

        res.json({
            success: true,
            activeSessions: sessionsWithDetails,
            count: sessionsWithDetails.length
        });

    } catch (error) {
        console.error('Error fetching active urgent sessions:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch active sessions'
        });
    }
};

/**
 * Get scheduled session details
 */
const getScheduledSession = async (req, res) => {
    try {
        const { requestId } = req.params;
        const studentId = req.user.id;

        console.log(`[URGENT_SESSION] Getting scheduled session ${requestId} for student ${studentId}`);

        // Verify the student owns this session
        const sessionResult = await db.query(`
            SELECT * FROM session_requests
            WHERE id = $1 AND student_id = $2
        `, [requestId, studentId]);

        if (sessionResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Session not found or access denied'
            });
        }

        const session = sessionResult.rows[0];
        const scheduledData = urgentSessionService.getScheduledSession(requestId);

        console.log(`[URGENT_SESSION] Session status: ${session.status}, live_session_id: ${session.live_session_id}`);
        console.log(`[URGENT_SESSION] Scheduled data:`, scheduledData);

        // Check if live session is ready
        let liveSessionUrl = null;
        if (session.live_session_id) {
            const liveSessionResult = await db.query(`
                SELECT * FROM live_sessions 
                WHERE id = $1 AND status = 'active'
            `, [session.live_session_id]);

            if (liveSessionResult.rows.length > 0) {
                const liveSession = liveSessionResult.rows[0];
                // Generate the live session URL
                if (session.session_type === 'essay_editing') {
                    liveSessionUrl = `/urgent-session/${session.live_session_id}/essay?session=${session.live_session_id}&mentor=ai`;
                    if (session.document_id) {
                        liveSessionUrl += `&document=${session.document_id}`;
                    }
                }
                console.log(`[URGENT_SESSION] Live session ready, URL: ${liveSessionUrl}`);
            }
        }

        res.json({
            success: true,
            session: {
                requestId: session.id,
                topic: session.topic,
                description: session.description,
                status: session.status,
                sessionType: session.session_type,
                scheduledTime: session.scheduled_time,
                liveSessionId: session.live_session_id,
                documentId: session.document_id,
                liveSessionUrl,
                isLiveSessionReady: !!liveSessionUrl,
                scheduledData
            }
        });

    } catch (error) {
        console.error('Error fetching scheduled session:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch session details'
        });
    }
};

/**
 * End urgent session
 */
const endUrgentSession = async (req, res) => {
    try {
        const { requestId } = req.params;
        const { rating, feedback, completedSuccessfully = true } = req.body;
        const studentId = req.user.id;

        // Verify the student owns this session
        const sessionResult = await db.query(`
            SELECT * FROM session_requests
            WHERE id = $1 AND student_id = $2
        `, [requestId, studentId]);

        if (sessionResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Session not found or access denied'
            });
        }

        const sessionFeedback = rating ? { rating, feedback, completedSuccessfully } : null;
        const success = await urgentSessionService.endUrgentSession(requestId, sessionFeedback);

        if (success) {
            res.json({
                success: true,
                message: 'Session ended successfully',
                feedback: sessionFeedback
            });
        } else {
            res.status(404).json({
                success: false,
                error: 'Session not found or already ended'
            });
        }

    } catch (error) {
        console.error('Error ending urgent session:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to end session'
        });
    }
};

/**
 * Join live session (redirect to appropriate session type)
 */
const joinLiveSession = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const studentId = req.user.id;

        // Get live session details
        const sessionResult = await db.query(`
            SELECT 
                ls.*,
                sr.topic,
                sr.description,
                sr.lesson_id,
                sr.course_id,
                sr.session_type,
                up.display_name as mentor_name
            FROM live_sessions ls
            JOIN session_requests sr ON ls.request_id = sr.id
            LEFT JOIN user_profiles up ON ls.mentor_id = up.user_id
            WHERE ls.id = $1 AND ls.student_id = $2 AND ls.status = 'active'
        `, [sessionId, studentId]);

        if (sessionResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Live session not found or not active'
            });
        }

        const session = sessionResult.rows[0];

        // Generate session URL based on type
        let sessionUrl = '';
        let sessionData = {};

        if (session.session_type === 'mentoring') {
            if (session.lesson_id) {
                sessionUrl = `/ascent-ide/${session.lesson_id}?session=${sessionId}&mentor=ai`;
                sessionData = {
                    type: 'ide_mentoring',
                    lessonId: session.lesson_id,
                    ideUrl: sessionUrl
                };
            } else {
                sessionUrl = `/live-tutorial?session=${sessionId}&mentor=ai`;
                sessionData = {
                    type: 'live_tutoring',
                    tutorialUrl: sessionUrl
                };
            }
        } else if (session.session_type === 'essay_editing') {
            sessionUrl = `/scribe-session?session=${sessionId}&mentor=ai`;
            sessionData = {
                type: 'essay_editing',
                scribeUrl: sessionUrl
            };
        } else if (session.session_type === 'counseling') {
            sessionUrl = `/counseling-session?session=${sessionId}&mentor=ai`;
            sessionData = {
                type: 'counseling',
                counselingUrl: sessionUrl
            };
        }

        res.json({
            success: true,
            session: {
                id: session.id,
                topic: session.topic,
                description: session.description,
                sessionType: session.session_type,
                mentorName: session.mentor_name,
                startedAt: session.started_at,
                status: session.status
            },
            sessionUrl,
            sessionData,
            instructions: {
                message: `Your live session with ${session.mentor_name} is ready!`,
                action: 'Click the link below to join your mentoring session',
                sessionType: session.session_type,
                expectedDuration: '30-60 minutes'
            }
        });

    } catch (error) {
        console.error('Error joining live session:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to join live session'
        });
    }
};

/**
 * Get session analytics for admin
 */
const getUrgentSessionAnalytics = async (req, res) => {
    try {
        const { days = 30 } = req.query;

        const analyticsResult = await db.query(`
            SELECT 
                DATE(sr.created_at) as date,
                COUNT(*) as total_requests,
                COUNT(CASE WHEN sr.status = 'completed' THEN 1 END) as completed_sessions,
                COUNT(CASE WHEN ls.id IS NOT NULL THEN 1 END) as live_sessions_started,
                AVG(CASE 
                    WHEN ls.ended_at IS NOT NULL THEN 
                        EXTRACT(EPOCH FROM (ls.ended_at - ls.started_at)) / 60 
                    END
                ) as avg_duration_minutes,
                AVG(CASE WHEN sr.status = 'completed' THEN 1 ELSE 0 END) as success_rate
            FROM session_requests sr
            LEFT JOIN live_sessions ls ON sr.live_session_id = ls.id
            WHERE sr.urgency_level = 'urgent' 
            AND sr.created_at >= CURRENT_DATE - INTERVAL '${days} days'
            GROUP BY DATE(sr.created_at)
            ORDER BY date DESC
        `, []);

        const summaryResult = await db.query(`
            SELECT 
                COUNT(*) as total_urgent_requests,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as total_completed,
                COUNT(CASE WHEN live_session_id IS NOT NULL THEN 1 END) as total_live_sessions,
                AVG(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as overall_success_rate
            FROM session_requests
            WHERE urgency_level = 'urgent' 
            AND created_at >= CURRENT_DATE - INTERVAL '${days} days'
        `, []);

        res.json({
            success: true,
            analytics: analyticsResult.rows,
            summary: summaryResult.rows[0],
            period: `${days} days`
        });

    } catch (error) {
        console.error('Error fetching urgent session analytics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch analytics'
        });
    }
};

/**
 * Debug endpoint to clean up stuck sessions
 */
const cleanupStuckSessions = async (req, res) => {
    try {
        const studentId = req.user.id;
        const { force = false } = req.body;
        
        console.log(`[CLEANUP] Starting cleanup for student ${studentId}, force=${force}`);
        
        // Get all active sessions first to see what we're working with
        const allActiveSessions = await urgentSessionService.getActiveUrgentSessions(studentId);
        console.log(`[CLEANUP] Currently active sessions: ${allActiveSessions.length}`);
        
        let sessionsToCleanup = [];
        
        if (force) {
            // Force cleanup - end ALL active urgent sessions regardless of time
            sessionsToCleanup = await db.query(`
                SELECT 
                    sr.*,
                    ls.id as live_session_id,
                    ls.status as live_status
                FROM session_requests sr
                LEFT JOIN live_sessions ls ON sr.live_session_id = ls.id
                WHERE sr.student_id = $1 
                AND sr.urgency_level = 'urgent'
                AND (sr.status IN ('accepted', 'in_session') OR ls.status = 'active')
                ORDER BY sr.created_at DESC
            `, [studentId]);
            console.log(`[CLEANUP] Force cleanup - found ${sessionsToCleanup.rows.length} sessions to end`);
        } else {
            // Normal cleanup - only end sessions older than 1 hour
            sessionsToCleanup = await db.query(`
                SELECT 
                    sr.*,
                    ls.id as live_session_id,
                    ls.status as live_status
                FROM session_requests sr
                LEFT JOIN live_sessions ls ON sr.live_session_id = ls.id
                WHERE sr.student_id = $1 
                AND sr.urgency_level = 'urgent'
                AND (
                    (sr.status IN ('accepted', 'in_session') AND sr.created_at < NOW() - INTERVAL '1 hour') OR
                    (ls.status = 'active' AND ls.started_at < NOW() - INTERVAL '1 hour')
                )
                ORDER BY sr.created_at DESC
            `, [studentId]);
            console.log(`[CLEANUP] Normal cleanup - found ${sessionsToCleanup.rows.length} old sessions to end`);
        }
        
        // End sessions
        let cleanedCount = 0;
        for (const session of sessionsToCleanup.rows) {
            console.log(`[CLEANUP] Ending session ${session.id} (status: ${session.status}, created: ${session.created_at})`);
            try {
                const success = await urgentSessionService.endUrgentSession(session.id);
                if (success) {
                    cleanedCount++;
                    console.log(`[CLEANUP] Successfully ended session ${session.id}`);
                } else {
                    console.log(`[CLEANUP] Failed to end session ${session.id} - not found or already ended`);
                }
            } catch (error) {
                console.error(`[CLEANUP] Error ending session ${session.id}:`, error.message);
            }
        }
        
        // Get remaining active sessions after cleanup
        const remainingActive = await urgentSessionService.getActiveUrgentSessions(studentId);
        console.log(`[CLEANUP] After cleanup, remaining active sessions: ${remainingActive.length}`);
        
        res.json({
            success: true,
            message: `Cleaned up ${cleanedCount} sessions`,
            cleanedSessions: sessionsToCleanup.rows.map(s => ({
                id: s.id,
                topic: s.topic,
                status: s.status,
                createdAt: s.created_at
            })),
            remainingActiveSessions: remainingActive.length,
            remainingSessionDetails: remainingActive.map(s => ({
                id: s.id,
                topic: s.topic,
                status: s.status,
                createdAt: s.created_at
            }))
        });
        
    } catch (error) {
        console.error('Error cleaning up stuck sessions:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to cleanup sessions'
        });
    }
};

module.exports = {
    createUrgentRequest,
    getActiveUrgentSessions,
    getScheduledSession,
    endUrgentSession,
    joinLiveSession,
    getUrgentSessionAnalytics,
    cleanupStuckSessions
};