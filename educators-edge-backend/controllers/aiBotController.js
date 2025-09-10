// AI Bot Controller - Handle all AI bot interactions
const aiBotService = require('../services/aiBotService');
const db = require('../db');

/**
 * Get all available AI bots
 */
const getAvailableBots = async (req, res) => {
    try {
        const bots = await aiBotService.getAvailableBots();
        
        // Get specializations for each bot
        for (const bot of bots) {
            const specializationsResult = await db.query(`
                SELECT s.name, s.category, us.proficiency_level
                FROM user_specializations us
                JOIN specializations s ON us.specialization_id = s.id
                WHERE us.user_id = $1
            `, [bot.user_id]);
            
            bot.specializations = specializationsResult.rows;
        }
        
        res.json({
            success: true,
            bots
        });
    } catch (error) {
        console.error('Error fetching AI bots:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch AI bots'
        });
    }
};

/**
 * Start a new session with an AI bot
 */
const startSession = async (req, res) => {
    try {
        const { botId, sessionType, lessonId, courseId, problem } = req.body;
        const studentId = req.user.id;
        
        const context = {
            lessonId,
            courseId,
            problem
        };
        
        const session = await aiBotService.startSession(botId, studentId, sessionType, context);
        
        res.json({
            success: true,
            session: session.session,
            bot: session.bot,
            initialMessage: session.initialMessage
        });
        
    } catch (error) {
        console.error('Error starting AI bot session:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to start session'
        });
    }
};

/**
 * Send message to AI bot
 */
const sendMessage = async (req, res) => {
    try {
        const { sessionId, message, codeSnippet, errorMessage, language } = req.body;
        
        const context = {
            codeSnippet,
            errorMessage,
            language
        };
        
        const response = await aiBotService.processMessage(sessionId, message, context);
        
        res.json({
            success: true,
            response: response.content,
            messageType: response.type,
            confidence: response.confidence,
            suggestions: response.suggestions,
            urgentSession: response.urgentSession,
            collaborativeSession: response.collaborativeSession
        });
        
    } catch (error) {
        console.error('Error processing AI bot message:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to process message'
        });
    }
};

/**
 * Get conversation history
 */
const getConversationHistory = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { limit = 20 } = req.query;
        
        // Verify user has access to this session
        const sessionResult = await db.query(`
            SELECT * FROM ai_bot_sessions
            WHERE id = $1 AND student_id = $2
        `, [sessionId, req.user.id]);
        
        if (sessionResult.rows.length === 0) {
            return res.status(403).json({
                success: false,
                error: 'Access denied to this session'
            });
        }
        
        const history = await aiBotService.getConversationHistory(sessionId, parseInt(limit));
        
        res.json({
            success: true,
            conversation: history
        });
        
    } catch (error) {
        console.error('Error fetching conversation history:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch conversation history'
        });
    }
};

/**
 * Handle IDE assistance request
 */
const handleIDEAssistance = async (req, res) => {
    try {
        const { codeSnippet, errorMessage, language, lessonId } = req.body;
        const studentId = req.user.id;
        
        // Get the best programming mentor bot
        const bot = await aiBotService.getBestBotForRequest('mentor', 'programming');
        
        const result = await aiBotService.handleIDEAssistance(
            bot.id,
            studentId,
            codeSnippet,
            errorMessage,
            language,
            { lessonId }
        );
        
        res.json({
            success: true,
            sessionId: result.sessionId,
            response: result.response,
            suggestions: result.suggestions,
            confidence: result.confidence,
            botInfo: {
                id: bot.id,
                name: bot.bot_name,
                specialization: bot.specialization_focus
            }
        });
        
    } catch (error) {
        console.error('Error handling IDE assistance:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to get IDE assistance'
        });
    }
};

/**
 * Auto-accept mentor request (AI bot behavior)
 */
const autoAcceptMentorRequest = async (req, res) => {
    try {
        const { requestId } = req.params;
        
        // Get the best available bot for the request
        const requestResult = await db.query(`
            SELECT sr.*, c.subject
            FROM session_requests sr
            LEFT JOIN courses c ON sr.course_id = c.id
            WHERE sr.id = $1
        `, [requestId]);
        
        if (requestResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Request not found'
            });
        }
        
        const request = requestResult.rows[0];
        const bot = await aiBotService.getBestBotForRequest('mentor', request.subject);
        
        const result = await aiBotService.acceptMentorRequest(requestId, bot.id);
        
        res.json({
            success: true,
            message: 'Request accepted by AI mentor',
            sessionId: result.sessionId,
            botInfo: result.botInfo,
            acceptanceMessage: result.message
        });
        
    } catch (error) {
        console.error('Error auto-accepting mentor request:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to accept request'
        });
    }
};

/**
 * End AI bot session
 */
const endSession = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { rating, feedback } = req.body;
        
        // Verify user has access to this session
        const sessionResult = await db.query(`
            SELECT * FROM ai_bot_sessions
            WHERE id = $1 AND student_id = $2
        `, [sessionId, req.user.id]);
        
        if (sessionResult.rows.length === 0) {
            return res.status(403).json({
                success: false,
                error: 'Access denied to this session'
            });
        }
        
        const studentFeedback = rating ? { rating, feedback } : null;
        const session = await aiBotService.endSession(sessionId, studentFeedback);
        
        res.json({
            success: true,
            session,
            message: 'Session ended successfully'
        });
        
    } catch (error) {
        console.error('Error ending AI bot session:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to end session'
        });
    }
};

/**
 * Issue course completion certificate
 */
const issueCertificate = async (req, res) => {
    try {
        const { courseId } = req.params;
        const studentId = req.user.id;
        
        // Get appropriate AI bot (preferably one that has mentored this student)
        const bot = await aiBotService.getBestBotForRequest('mentor', 'general');
        
        const result = await aiBotService.completeCourseAndIssueCertificate(
            bot.id,
            studentId,
            courseId
        );
        
        res.json({
            success: true,
            certificate: result.certificate,
            message: result.message,
            issuedBy: result.botName
        });
        
    } catch (error) {
        console.error('Error issuing certificate:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to issue certificate'
        });
    }
};

/**
 * Complete a lesson and award points
 */
const completeLessonWithBot = async (req, res) => {
    try {
        const { lessonId, botId } = req.body;
        const studentId = req.user.id;
        
        if (!lessonId || !botId) {
            return res.status(400).json({
                success: false,
                error: 'Lesson ID and Bot ID are required'
            });
        }
        
        const result = await aiBotService.completeLessonAndAwardPoints(
            botId,
            studentId,
            lessonId
        );
        
        res.json({
            success: result.success,
            message: result.message,
            pointsAwarded: result.pointsAwarded,
            pillar: result.pillar,
            lessonTitle: result.lessonTitle,
            botName: result.botName
        });
        
    } catch (error) {
        console.error('Error completing lesson:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to complete lesson'
        });
    }
};

/**
 * Award points for session activities
 */
const awardSessionPoints = async (req, res) => {
    try {
        const { activityType, activityData } = req.body;
        const studentId = req.user.id;
        
        if (!activityType) {
            return res.status(400).json({
                success: false,
                error: 'Activity type is required'
            });
        }
        
        const result = await aiBotService.awardSessionActivityPoints(
            studentId,
            activityType,
            activityData || {}
        );
        
        if (result) {
            res.json({
                success: true,
                pointsAwarded: result.pointsAdded,
                pillar: result.pillar,
                description: result.description
            });
        } else {
            res.json({
                success: false,
                error: 'Failed to award points'
            });
        }
        
    } catch (error) {
        console.error('Error awarding session points:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to award points'
        });
    }
};

/**
 * Get AI bot analytics for admin
 */
const getBotAnalytics = async (req, res) => {
    try {
        const { botId } = req.params;
        const { days = 30 } = req.query;
        
        const analyticsResult = await db.query(`
            SELECT 
                date,
                sessions_conducted,
                students_helped,
                problems_solved,
                average_session_satisfaction,
                successful_resolution_rate
            FROM ai_bot_analytics
            WHERE bot_id = $1 AND date >= CURRENT_DATE - INTERVAL '${days} days'
            ORDER BY date DESC
        `, [botId]);
        
        const totalStatsResult = await db.query(`
            SELECT 
                COUNT(*) as total_sessions,
                COUNT(DISTINCT student_id) as unique_students,
                AVG(student_satisfaction) as avg_satisfaction,
                AVG(duration_minutes) as avg_duration
            FROM ai_bot_sessions
            WHERE bot_id = $1 AND ended_at IS NOT NULL
        `, [botId]);
        
        res.json({
            success: true,
            analytics: analyticsResult.rows,
            summary: totalStatsResult.rows[0]
        });
        
    } catch (error) {
        console.error('Error fetching bot analytics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch analytics'
        });
    }
};

module.exports = {
    getAvailableBots,
    startSession,
    sendMessage,
    getConversationHistory,
    handleIDEAssistance,
    autoAcceptMentorRequest,
    endSession,
    issueCertificate,
    getBotAnalytics,
    completeLessonWithBot,
    awardSessionPoints
};