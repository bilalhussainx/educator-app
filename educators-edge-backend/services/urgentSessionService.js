// Urgent Session Service - Auto-schedule sessions with AI bots within 1 minute
const db = require('../db');
const aiBotService = require('./aiBotService');
const { v4: uuidv4 } = require('uuid');

class UrgentSessionService {
    constructor() {
        this.scheduledSessions = new Map(); // In-memory store for scheduled sessions
        this.startScheduler();
    }

    /**
     * Start the session scheduler that runs every minute
     */
    startScheduler() {
        setInterval(() => {
            this.processScheduledSessions();
        }, 60000); // Check every minute
    }

    /**
     * Create an urgent session request that will be auto-accepted by AI bot
     */
    async createUrgentRequest(studentId, requestData) {
        const {
            subject = 'Computer Science',
            topic,
            description,
            lessonId,
            courseId,
            difficulty = 'intermediate',
            sessionType = 'mentoring', // 'mentoring', 'essay_editing', 'counseling'
            documentId
        } = requestData;

        try {
            console.log(`[URGENT_SESSION] Starting createUrgentRequest for student ${studentId}`);
            console.log(`[URGENT_SESSION] Request data:`, requestData);
            
            // Find the best AI bot for this request
            // Map frontend session types to backend bot types
            let requestType = sessionType;
            if (sessionType === 'mentoring') requestType = 'mentor';
            if (sessionType === 'essay_editing') requestType = 'essay_editor';
            if (sessionType === 'counseling') requestType = 'counselor';
            
            console.log(`[URGENT_SESSION] Mapping sessionType "${sessionType}" to requestType "${requestType}"`);
            console.log(`[URGENT_SESSION] Calling getBestBotForRequest with params:`, { requestType, subject, difficulty });
            
            const bot = await aiBotService.getBestBotForRequest(
                requestType,
                subject,
                difficulty
            );
            
            console.log(`[URGENT_SESSION] Found bot:`, bot ? { id: bot.id, name: bot.bot_name, user_id: bot.user_id } : 'null');

            if (!bot) {
                throw new Error('No available AI bot found for this request');
            }

            // Create the session request
            const requestId = uuidv4();
            const insertParams = [
                requestId,
                studentId, // Both requester_id and student_id are the same for urgent sessions
                bot.user_id, // AI bot will be the mentor
                subject,
                topic,
                description,
                lessonId,
                courseId,
                sessionType
            ];
            
            console.log(`[URGENT_SESSION] Inserting session request with params:`, {
                requestId,
                studentId,
                mentorId: bot.user_id,
                subject,
                topic,
                description,
                lessonId,
                courseId,
                sessionType
            });
            
            // Add document_id to the insert if provided
            let query, params;
            if (documentId) {
                query = `
                    INSERT INTO session_requests 
                    (id, requester_id, student_id, mentor_id, subject, topic, description, lesson_id, course_id, 
                     status, session_type, urgency_level, document_id, scheduled_time, created_at)
                    VALUES ($1, $2, $2, $3, $4, $5, $6, $7, $8, 'pending', $9, 'urgent', $10,
                            NOW() + INTERVAL '1 minute', NOW())
                    RETURNING *
                `;
                params = [...insertParams, documentId];
            } else {
                query = `
                    INSERT INTO session_requests 
                    (id, requester_id, student_id, mentor_id, subject, topic, description, lesson_id, course_id, 
                     status, session_type, urgency_level, scheduled_time, created_at)
                    VALUES ($1, $2, $2, $3, $4, $5, $6, $7, $8, 'pending', $9, 'urgent', 
                            NOW() + INTERVAL '1 minute', NOW())
                    RETURNING *
                `;
                params = insertParams;
            }
            
            const requestResult = await db.query(query, params);
            
            console.log(`[URGENT_SESSION] Successfully inserted session request:`, requestResult.rows[0] ? { id: requestResult.rows[0].id, status: requestResult.rows[0].status } : 'null');

            const request = requestResult.rows[0];

            // Create live session immediately for urgent requests
            const sessionTime = new Date(); // Start immediately
            
            // Store session data for immediate live session creation  
            const sessionData = {
                requestId: request.id,
                studentId,
                botId: bot.id,
                botUserId: bot.user_id,
                sessionType,
                lessonId,
                courseId,
                topic,
                description,
                documentId,
                sessionTime,
                status: 'starting'
            };
            
            this.scheduledSessions.set(request.id, sessionData);

            // Immediately accept the request (AI bot behavior)
            await db.query(`
                UPDATE session_requests 
                SET status = 'accepted', updated_at = NOW()
                WHERE id = $1
            `, [request.id]);

            // Create initial AI bot session for immediate chat
            console.log(`[URGENT_SESSION] Creating AI bot session with params:`, {
                botId: bot.id,
                studentId,
                sessionType: 'mentoring',
                context: { lessonId, courseId, problem: description }
            });
            
            const chatSession = await aiBotService.startSession(
                bot.id,
                studentId,
                'mentoring',
                {
                    lessonId,
                    courseId,
                    problem: description
                }
            );
            
            console.log(`[URGENT_SESSION] Successfully created AI bot session:`, chatSession ? { sessionId: chatSession.session?.id } : 'null');

            // Update session_requests with chat_session_id for frontend linking
            if (chatSession?.session?.id) {
                await db.query(`
                    UPDATE session_requests 
                    SET chat_session_id = $1
                    WHERE id = $2
                `, [chatSession.session.id, request.id]);
                
                console.log(`[URGENT_SESSION] Linked chat session ${chatSession.session.id} to urgent request ${request.id}`);
            }

            // Send immediate confirmation message
            const confirmationMessage = `Great news! I've accepted your request for help with "${topic}". 

🎯 **Live Session**: Your collaborative editing session is starting now!
📚 **Topic**: ${topic}
✨ **Ready**: Your document is loaded and ready for AI-assisted editing

I'm here to help you improve your writing! Let's get started with collaborative editing.`;

            console.log(`[URGENT_SESSION] Sending confirmation message to AI bot session ${chatSession.session.id}`);
            await aiBotService.processMessage(
                chatSession.session.id,
                'Session scheduled successfully',
                { autoMessage: confirmationMessage }
            );
            console.log(`[URGENT_SESSION] Successfully sent confirmation message`);

            // Immediately start the live session (no waiting)
            console.log(`[URGENT_SESSION] Starting live session immediately...`);
            await this.startLiveSession(request.id, sessionData);

            // Get the updated session data with live session ID
            const updatedSession = await db.query(`
                SELECT * FROM session_requests WHERE id = $1
            `, [request.id]);

            const session = updatedSession.rows[0];
            let liveSessionUrl = null;

            if (session.live_session_id && sessionType === 'essay_editing') {
                liveSessionUrl = `/urgent-session/${session.live_session_id}/essay?session=${session.live_session_id}&mentor=ai`;
                if (documentId) {
                    liveSessionUrl += `&document=${documentId}`;
                }
            }

            return {
                requestId: request.id,
                botInfo: {
                    id: bot.id,
                    name: bot.bot_name,
                    specialization: bot.specialization_focus,
                    personality: bot.personality_type
                },
                sessionTime: sessionTime.toISOString(),
                chatSessionId: chatSession.session.id,
                liveSessionId: session.live_session_id,
                liveSessionUrl,
                confirmationMessage,
                status: 'live' // Changed from 'scheduled' to 'live'
            };

        } catch (error) {
            console.error('[URGENT_SESSION] Error creating urgent session:', {
                error: error.message,
                stack: error.stack,
                code: error.code,
                detail: error.detail
            });
            throw error;
        }
    }

    /**
     * Process scheduled sessions that are ready to start
     */
    async processScheduledSessions() {
        const now = new Date();
        
        console.log(`[URGENT_SESSION] Processing scheduled sessions. Current time: ${now.toISOString()}`);
        console.log(`[URGENT_SESSION] Total scheduled sessions: ${this.scheduledSessions.size}`);
        
        for (const [requestId, sessionData] of this.scheduledSessions.entries()) {
            console.log(`[URGENT_SESSION] Checking session ${requestId}: status=${sessionData.status}, scheduledTime=${sessionData.sessionTime.toISOString()}, ready=${now >= sessionData.sessionTime}`);
            
            if (sessionData.status === 'scheduled' && now >= sessionData.sessionTime) {
                try {
                    console.log(`[URGENT_SESSION] Starting live session ${requestId}`);
                    await this.startLiveSession(requestId, sessionData);
                } catch (error) {
                    console.error(`[URGENT_SESSION] Error starting live session ${requestId}:`, error);
                }
            }
        }
    }

    /**
     * Start the actual live session
     */
    async startLiveSession(requestId, sessionData) {
        try {
            // Create a live session record
            const liveSessionResult = await db.query(`
                INSERT INTO live_sessions 
                (id, request_id, mentor_id, student_id, lesson_id, course_id, 
                 session_type, status, started_at, ai_bot_session)
                VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', NOW(), true)
                RETURNING *
            `, [
                uuidv4(),
                requestId,
                sessionData.botUserId,
                sessionData.studentId,
                sessionData.lessonId,
                sessionData.courseId,
                sessionData.sessionType
            ]);

            const liveSession = liveSessionResult.rows[0];

            // Update session request status
            await db.query(`
                UPDATE session_requests 
                SET status = 'in_session', live_session_id = $1
                WHERE id = $2
            `, [liveSession.id, requestId]);

            // Update scheduled session status
            this.scheduledSessions.set(requestId, {
                ...sessionData,
                status: 'live',
                liveSessionId: liveSession.id
            });

            // Get bot details
            const bot = await aiBotService.getBotById(sessionData.botId);

            // Create the live session environment based on type
            let sessionUrl = '';
            if (sessionData.sessionType === 'mentoring') {
                if (sessionData.lessonId) {
                    sessionUrl = `/ascent-ide/${sessionData.lessonId}?session=${liveSession.id}&mentor=ai`;
                } else {
                    sessionUrl = `/live-tutorial?session=${liveSession.id}&mentor=ai`;
                }
            } else if (sessionData.sessionType === 'essay_editing') {
                sessionUrl = `/urgent-session/${liveSession.id}/essay?session=${liveSession.id}&mentor=ai`;
                if (sessionData.documentId) {
                    sessionUrl += `&document=${sessionData.documentId}`;
                }
            }

            // Create intelligent live learning experience
            const learningExperience = await aiBotService.createLiveLearningExperience(
                sessionData.botId, 
                sessionData.studentId, 
                sessionData
            );

            const startMessage = learningExperience.welcomeMessage;

            // Find existing AI bot session for this student
            const existingSessionResult = await db.query(`
                SELECT id FROM ai_bot_sessions
                WHERE bot_id = $1 AND student_id = $2 
                AND status = 'active'
                ORDER BY started_at DESC
                LIMIT 1
            `, [sessionData.botId, sessionData.studentId]);

            if (existingSessionResult.rows.length > 0) {
                await aiBotService.processMessage(
                    existingSessionResult.rows[0].id,
                    'Live session ready',
                    { autoMessage: startMessage }
                );
            }

            // Notify student about live session (this would integrate with WebSocket in real implementation)
            await this.notifyStudentOfLiveSession(sessionData.studentId, {
                sessionId: liveSession.id,
                botName: bot.bot_name,
                sessionUrl,
                topic: sessionData.topic,
                startMessage
            });

            console.log(`Live session ${liveSession.id} started for request ${requestId}`);

        } catch (error) {
            console.error(`Error starting live session for request ${requestId}:`, error);
            
            // Update session as failed
            this.scheduledSessions.set(requestId, {
                ...sessionData,
                status: 'failed',
                error: error.message
            });
        }
    }

    /**
     * Notify student about live session (placeholder for WebSocket integration)
     */
    async notifyStudentOfLiveSession(studentId, sessionInfo) {
        // This would integrate with WebSocket to send real-time notification
        // For now, we'll log it and store in database
        
        await db.query(`
            INSERT INTO notifications (user_id, type, title, message, data, created_at)
            VALUES ($1, 'live_session_started', 'Your AI Mentor Session is Ready!', $2, $3, NOW())
        `, [
            studentId,
            `${sessionInfo.botName} is ready to help you with "${sessionInfo.topic}"`,
            JSON.stringify({
                sessionId: sessionInfo.sessionId,
                sessionUrl: sessionInfo.sessionUrl,
                botName: sessionInfo.botName,
                topic: sessionInfo.topic
            })
        ]);

        console.log(`Notification sent to student ${studentId} about live session`);
    }

    /**
     * Get scheduled session info
     */
    getScheduledSession(requestId) {
        return this.scheduledSessions.get(requestId);
    }

    /**
     * Get all active urgent sessions for a student
     */
    async getActiveUrgentSessions(studentId) {
        console.log(`[URGENT_SESSION] Getting active sessions for student ${studentId}`);
        
        const result = await db.query(`
            SELECT 
                sr.*,
                ls.id as live_session_id,
                ls.status as live_status,
                ls.started_at as session_started_at,
                up.display_name as mentor_name
            FROM session_requests sr
            LEFT JOIN live_sessions ls ON sr.live_session_id = ls.id
            LEFT JOIN user_profiles up ON sr.mentor_id = up.user_id
            WHERE sr.student_id = $1 
            AND sr.urgency_level = 'urgent'
            AND (sr.status IN ('accepted', 'in_session') OR ls.status = 'active')
            ORDER BY sr.created_at DESC
        `, [studentId]);

        console.log(`[URGENT_SESSION] Found ${result.rows.length} active sessions:`);
        result.rows.forEach((row, index) => {
            console.log(`[URGENT_SESSION] Session ${index + 1}:`, {
                id: row.id,
                status: row.status,
                topic: row.topic,
                created_at: row.created_at,
                live_session_id: row.live_session_id,
                live_status: row.live_status,
                mentor_name: row.mentor_name
            });
        });

        return result.rows;
    }

    /**
     * End urgent session
     */
    async endUrgentSession(requestId, sessionFeedback = null) {
        console.log(`[URGENT_SESSION] Attempting to end session ${requestId}`);
        
        // First try to get from in-memory map
        const sessionData = this.scheduledSessions.get(requestId);
        
        // Also get from database to ensure we have all info
        const dbSessionResult = await db.query(`
            SELECT sr.*, ls.id as live_session_id
            FROM session_requests sr
            LEFT JOIN live_sessions ls ON sr.live_session_id = ls.id
            WHERE sr.id = $1
        `, [requestId]);
        
        if (dbSessionResult.rows.length === 0) {
            console.log(`[URGENT_SESSION] Session ${requestId} not found in database`);
            return false;
        }
        
        const dbSession = dbSessionResult.rows[0];
        console.log(`[URGENT_SESSION] Found session in database:`, {
            id: dbSession.id,
            status: dbSession.status,
            live_session_id: dbSession.live_session_id
        });
        
        // Update live session status if exists
        if (dbSession.live_session_id) {
            console.log(`[URGENT_SESSION] Updating live session ${dbSession.live_session_id} to completed`);
            await db.query(`
                UPDATE live_sessions 
                SET status = 'completed', ended_at = NOW(),
                    duration_minutes = EXTRACT(EPOCH FROM (NOW() - started_at)) / 60
                WHERE id = $1
            `, [dbSession.live_session_id]);
        }

        // Update session request status
        console.log(`[URGENT_SESSION] Updating session request ${requestId} to completed`);
        await db.query(`
            UPDATE session_requests 
            SET status = 'completed'
            WHERE id = $1
        `, [requestId]);

        // End AI bot session if exists
        const botSessionResult = await db.query(`
            SELECT abs.id, abs.bot_id, abs.student_id 
            FROM ai_bot_sessions abs
            JOIN session_requests sr ON abs.student_id = sr.student_id
            WHERE sr.id = $1 AND abs.status = 'active'
            ORDER BY abs.started_at DESC
            LIMIT 1
        `, [requestId]);

        if (botSessionResult.rows.length > 0) {
            console.log(`[URGENT_SESSION] Ending AI bot session ${botSessionResult.rows[0].id}`);
            try {
                await aiBotService.endSession(botSessionResult.rows[0].id, sessionFeedback);
            } catch (error) {
                console.error(`[URGENT_SESSION] Error ending AI bot session:`, error.message);
            }
        }

        // Remove from scheduled sessions if it was there
        if (sessionData) {
            this.scheduledSessions.delete(requestId);
        }

        console.log(`[URGENT_SESSION] Successfully ended session ${requestId}`);
        return true;
    }
}

module.exports = new UrgentSessionService();