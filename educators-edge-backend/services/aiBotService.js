// AI Bot Service - Intelligent mentors that can interact throughout the platform
const db = require('../db');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const ascendiaScoringService = require('./ascendiaScoringService');
const geminiService = require('./geminiService');

class AIBotService {
    constructor() {
        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        this.model = this.genAI.getGenerativeModel({ 
            model: 'gemini-1.5-pro',
            generationConfig: {
                temperature: 0.7,
                topP: 0.8,
                topK: 40,
                maxOutputTokens: 4000, // Increased for more detailed responses
            }
        });
        
        // Cache for bot personalities and knowledge
        this.botCache = new Map();
    }

    /**
     * Get AI bot by ID with full personality and knowledge
     */
    async getBotById(botId) {
        if (this.botCache.has(botId)) {
            return this.botCache.get(botId);
        }

        const result = await db.query(`
            SELECT 
                ab.*,
                up.display_name,
                up.bio,
                up.location,
                up.languages,
                up.total_sessions,
                up.average_rating,
                up.total_reviews
            FROM ai_bots ab
            JOIN user_profiles up ON ab.user_id = up.user_id
            WHERE ab.id = $1 AND ab.is_active = true
        `, [botId]);

        if (result.rows.length === 0) {
            throw new Error('AI Bot not found');
        }

        const bot = result.rows[0];

        // Get bot's knowledge base
        const knowledgeResult = await db.query(`
            SELECT knowledge_type, topic, content, importance_level
            FROM ai_bot_knowledge
            WHERE bot_id = $1
            ORDER BY importance_level DESC, topic
        `, [botId]);

        bot.knowledge = knowledgeResult.rows;

        // Get bot's specializations (handle missing table)
        try {
            const specializationsResult = await db.query(`
                SELECT s.name, s.category, s.description, us.proficiency_level, us.years_experience
                FROM user_specializations us
                JOIN specializations s ON us.specialization_id = s.id
                WHERE us.user_id = $1
            `, [bot.user_id]);
            bot.specializations = specializationsResult.rows;
        } catch (specializationsError) {
            console.log('Specializations table not found in aiBotService, using empty array:', specializationsError.message);
            bot.specializations = [];
        }

        // Cache the bot
        this.botCache.set(botId, bot);
        
        return bot;
    }

    /**
     * Get the best AI bot for a specific request
     */
    async getBestBotForRequest(requestType, subject, difficulty = 'intermediate') {
        console.log(`[AI_BOT] Looking for bots with requestType: "${requestType}", subject: "${subject}", difficulty: "${difficulty}"`);
        
        const query = `
            SELECT 
                ab.*,
                up.display_name,
                up.bio,
                up.average_rating,
                up.total_sessions
            FROM ai_bots ab
            JOIN user_profiles up ON ab.user_id = up.user_id
            WHERE ab.is_active = true 
            AND ab.current_active_sessions < ab.max_concurrent_sessions
            AND (
                ($1 = 'mentor' AND up.is_mentor = true) OR
                ($1 = 'counselor' AND up.is_counselor = true) OR
                ($1 = 'essay_editor' AND up.is_essay_editor = true)
            )
            ORDER BY up.average_rating DESC, ab.total_interactions DESC
            LIMIT 3
        `;

        console.log(`[AI_BOT] Executing query with requestType: ${requestType}`);
        const result = await db.query(query, [requestType]);
        console.log(`[AI_BOT] Found ${result.rows.length} matching bots`);
        
        if (result.rows.length === 0) {
            // If no bots available due to session limits, try without the session limit check
            console.log(`[AI_BOT] No bots available with session limits, trying without session limits...`);
            
            const fallbackQuery = `
                SELECT 
                    ab.*,
                    up.display_name,
                    up.bio,
                    up.average_rating,
                    up.total_sessions
                FROM ai_bots ab
                JOIN user_profiles up ON ab.user_id = up.user_id
                WHERE ab.is_active = true 
                AND (
                    ($1 = 'mentor' AND up.is_mentor = true) OR
                    ($1 = 'counselor' AND up.is_counselor = true) OR
                    ($1 = 'essay_editor' AND up.is_essay_editor = true)
                )
                ORDER BY up.average_rating DESC, ab.total_interactions DESC
                LIMIT 1
            `;
            
            const fallbackResult = await db.query(fallbackQuery, [requestType]);
            
            if (fallbackResult.rows.length === 0) {
                // Let's also check what bots exist without the filters
                const debugQuery = `SELECT ab.bot_name, ab.is_active, ab.current_active_sessions, ab.max_concurrent_sessions, up.is_mentor, up.is_counselor, up.is_essay_editor FROM ai_bots ab LEFT JOIN user_profiles up ON ab.user_id = up.user_id`;
                const debugResult = await db.query(debugQuery);
                console.log(`[AI_BOT] Debug - All bots in database:`, debugResult.rows);
                
                throw new Error('No available AI bots for this request');
            }
            
            console.log(`[AI_BOT] Using fallback bot (ignoring session limits): ${fallbackResult.rows[0].bot_name}`);
            return fallbackResult.rows[0];
        }

        // For now, return the highest rated bot
        // In the future, we could use AI to match based on subject and student needs
        return result.rows[0];
    }

    /**
     * Start a new AI bot session
     */
    async startSession(botId, studentId, sessionType, context = {}) {
        const bot = await this.getBotById(botId);
        
        // Create session record
        const sessionResult = await db.query(`
            INSERT INTO ai_bot_sessions 
            (bot_id, student_id, session_type, lesson_id, course_id, initial_problem, status)
            VALUES ($1, $2, $3, $4, $5, $6, 'active')
            RETURNING *
        `, [botId, studentId, sessionType, context.lessonId, context.courseId, context.problem]);

        const session = sessionResult.rows[0];

        // Update bot's active sessions count
        await db.query(`
            UPDATE ai_bots 
            SET current_active_sessions = current_active_sessions + 1,
                total_interactions = total_interactions + 1
            WHERE id = $1
        `, [botId]);

        // Send initial greeting
        const greeting = this.getRandomFromArray(bot.greeting_messages);
        await this.addConversationMessage(session.id, 'ai_bot', greeting, 'greeting');

        return {
            session,
            bot: {
                id: bot.id,
                name: bot.bot_name,
                personality: bot.personality_type,
                specialization: bot.specialization_focus,
                avatar: `/api/avatars/${bot.user_id}`
            },
            initialMessage: greeting
        };
    }

    /**
     * Process a student message and generate AI bot response
     */
    async processMessage(sessionId, studentMessage, context = {}) {
        // Get session and bot info
        const sessionResult = await db.query(`
            SELECT abs.*, ab.*, up.display_name, up.bio
            FROM ai_bot_sessions abs
            JOIN ai_bots ab ON abs.bot_id = ab.id
            JOIN user_profiles up ON ab.user_id = up.user_id
            WHERE abs.id = $1
        `, [sessionId]);

        if (sessionResult.rows.length === 0) {
            throw new Error('Session not found');
        }

        const session = sessionResult.rows[0];
        const bot = await this.getBotById(session.bot_id);

        // Check if this is an urgent session
        const urgentSessionCheck = await db.query(`
            SELECT 
                sr.id as request_id,
                sr.session_type,
                sr.status,
                sr.live_session_id,
                sr.topic,
                sr.description
            FROM session_requests sr
            WHERE sr.chat_session_id = $1
        `, [sessionId]);

        // Add urgent session context if found
        if (urgentSessionCheck.rows.length > 0) {
            const urgentSession = urgentSessionCheck.rows[0];
            context.urgentSession = {
                isUrgentSession: true,
                sessionType: urgentSession.session_type,
                status: urgentSession.status,
                topic: urgentSession.topic,
                description: urgentSession.description,
                liveSessionId: urgentSession.live_session_id
            };
            console.log(`[AI_BOT] Urgent session context added:`, context.urgentSession);
        }

        // Add student message to conversation
        await this.addConversationMessage(sessionId, 'student', studentMessage, 'text');

        // Get conversation history for context
        const conversationHistory = await this.getConversationHistory(sessionId, 10);

        // Generate AI response
        const aiResponse = await this.generateAIResponse(bot, studentMessage, conversationHistory, context);

        // Add AI response to conversation
        await this.addConversationMessage(sessionId, 'ai_bot', aiResponse.content, aiResponse.type, {
            reasoning: aiResponse.reasoning,
            confidence: aiResponse.confidence,
            contextUsed: aiResponse.contextUsed,
            urgentSession: aiResponse.urgentSession
        });

        // If AI suggests an urgent session, create the session request
        if (aiResponse.urgentSession?.suggested) {
            await this.createUrgentSessionFromAI(studentId, botId, aiResponse.urgentSession, studentMessage);
        }

        // Check if this is a request for live collaborative work (essay writing, code editing)
        if (this.shouldOpenCollaborativeSession(studentMessage, bot, aiResponse)) {
            const collaborativeSession = await this.createCollaborativeSession(sessionId, session.student_id, bot, studentMessage);
            aiResponse.collaborativeSession = collaborativeSession;
        }

        return aiResponse;
    }

    /**
     * Check if the student message indicates they want to start collaborative work
     */
    shouldOpenCollaborativeSession(studentMessage, bot, aiResponse) {
        const message = studentMessage.toLowerCase();
        
        // Essay writing triggers
        const essayTriggers = [
            'work on essay', 'work on my essay', 'write essay', 'help me write',
            'start writing', 'collaborative writing', 'work together on',
            'open editor', 'writing session', 'edit my essay', 'draft essay'
        ];
        
        // Code editing triggers  
        const codeTriggers = [
            'work on code', 'write code', 'debug code', 'code together',
            'open ide', 'coding session', 'programming help', 'code editor'
        ];
        
        // Check if bot specializes in essay writing
        if (bot.specialization_focus && bot.specialization_focus.includes('Essay')) {
            return essayTriggers.some(trigger => message.includes(trigger));
        }
        
        // Check if bot specializes in programming
        if (bot.specialization_focus && (bot.specialization_focus.includes('Programming') || bot.specialization_focus.includes('Computer Science'))) {
            return codeTriggers.some(trigger => message.includes(trigger));
        }
        
        return false;
    }

    /**
     * Create a collaborative session (essay editor or code IDE)
     */
    async createCollaborativeSession(sessionId, studentId, bot, studentMessage) {
        try {
            console.log(`[AI_BOT] Creating collaborative session for bot ${bot.bot_name}`);
            
            // Determine session type based on bot specialization
            let toolType = 'general';
            let redirectUrl = null;
            
            if (bot.specialization_focus && bot.specialization_focus.includes('Essay')) {
                toolType = 'essay-editor';
                // Create a document ID for the essay
                const docId = `essay_${sessionId}_${Date.now()}`;
                redirectUrl = `/scribe/${docId}`;
                
                console.log(`[AI_BOT] Opening essay editor: ${redirectUrl}`);
            } else if (bot.specialization_focus && (bot.specialization_focus.includes('Programming') || bot.specialization_focus.includes('Computer Science'))) {
                toolType = 'ascent-ide';
                // For now, open a generic coding session
                redirectUrl = `/ascent-ide/general`;
                
                console.log(`[AI_BOT] Opening AscentIDE: ${redirectUrl}`);
            }
            
            return {
                type: 'collaborative_session',
                toolType: toolType,
                redirectUrl: redirectUrl,
                message: `I've opened a ${toolType === 'essay-editor' ? 'collaborative essay editor' : 'coding environment'} where we can work together in real-time!`,
                instructions: toolType === 'essay-editor' 
                    ? 'Use the essay editor to draft, structure, and refine your essay. I can provide feedback and suggestions as you write.'
                    : 'Use the IDE to write and debug code. I can help explain concepts and suggest improvements.'
            };
            
        } catch (error) {
            console.error('[AI_BOT] Error creating collaborative session:', error);
            return null;
        }
    }

    /**
     * Create urgent session when AI suggests it
     */
    async createUrgentSessionFromAI(studentId, botId, urgentSessionData, originalMessage) {
        try {
            console.log(`[AI_BOT] Creating urgent session suggested by bot ${botId}`);
            
            // Get bot details for session description
            const bot = await this.getBotById(botId);
            
            const sessionDescription = `AI-suggested ${urgentSessionData.sessionType} session\n\nOriginal request: "${originalMessage}"\n\nReason: ${urgentSessionData.reason}\n\nRecommended tool: ${urgentSessionData.toolType}`;
            
            const sessionRequest = await db.query(`
                INSERT INTO session_requests (
                    requester_id, 
                    mentor_id, 
                    session_type, 
                    description, 
                    status, 
                    is_free,
                    duration,
                    preferred_time
                ) VALUES ($1, $2, $3, $4, 'pending', true, 30, NOW() + INTERVAL '5 minutes')
                RETURNING *
            `, [
                studentId,
                bot.user_id, // Use the bot's user_id as the mentor
                urgentSessionData.sessionType || 'general_tutoring',
                sessionDescription
            ]);

            // Add metadata to track this came from AI
            const sessionId = sessionRequest.rows[0].id;
            await db.query(`
                UPDATE session_requests 
                SET payment_method = 'ai_suggested'
                WHERE id = $1
            `, [sessionId]);

            console.log(`[AI_BOT] Created urgent session request: ${sessionId}`);
            return sessionRequest.rows[0];
            
        } catch (error) {
            console.error('[AI_BOT] Error creating urgent session:', error);
            // Don't throw - we don't want to fail the whole conversation
            return null;
        }
    }

    /**
     * Generate AI response using Gemini
     */
    async generateAIResponse(bot, studentMessage, conversationHistory, context = {}) {
        // Build the AI prompt with bot personality and context
        const prompt = this.buildAIPrompt(bot, studentMessage, conversationHistory, context);

        try {
            // Use rate-limited Gemini service to prevent quota exhaustion
            const result = await geminiService.rateLimitedGenerate(prompt, 2500); // AI Bot conversations
            
            if (!result.success) {
                if (result.quotaExceeded) {
                    console.log('[AI_BOT] Using fallback due to quota exceeded');
                    return this.generateQuotaFallbackResponse(studentMessage, bot);
                }
                throw result.error;
            }
            
            const text = result.text;

            // Parse the response to extract different components
            const parsedResponse = this.parseAIResponse(text, bot);

            return {
                content: parsedResponse.message,
                type: parsedResponse.type,
                confidence: parsedResponse.confidence,
                reasoning: parsedResponse.reasoning,
                contextUsed: parsedResponse.contextUsed,
                suggestions: parsedResponse.suggestions
            };

        } catch (error) {
            console.error('AI generation error:', error);
            
            // Check for specific error types
            let fallbackContent = '';
            let errorType = 'unknown';
            
            if (error.status === 429) {
                // Quota exceeded error
                errorType = 'quota';
                if (error.message.includes('free tier')) {
                    fallbackContent = `🚨 **API Quota Issue Detected**

**Problem**: The system is hitting Gemini's free tier limits, but you mentioned having a paid plan.

**Possible Solutions**:
1. **Check API Key Project**: Ensure your API key is from a project with billing enabled
2. **Verify Billing**: Confirm your Google Cloud project has active billing
3. **Model Quota**: Even paid plans have rate limits - try again in a few minutes
4. **Switch Models**: Consider using gemini-1.5-pro for higher quotas

**Immediate Fix**: You can try again in ${error.errorDetails?.find(d => d.retryDelay)?.retryDelay || '60 seconds'}.

For now, I'll provide basic analysis without AI assistance.`;
                } else {
                    fallbackContent = `⚠️ **Rate Limit Reached**

I've reached the API rate limit. This can happen even with paid plans during heavy usage.

**Try again in**: ${error.errorDetails?.find(d => d.retryDelay)?.retryDelay || '60 seconds'}

Meanwhile, I can provide basic analysis and suggestions based on your document category.`;
                }
            } else if (error.status === 403) {
                errorType = 'auth';
                fallbackContent = `🔐 **API Authentication Issue**

There seems to be a problem with the API configuration. Please check that your Gemini API key is properly configured and has the necessary permissions.`;
            } else {
                // General fallback messages
                const fallbackMessages = [
                    "I'm having a small technical hiccup. Could you rephrase your question?",
                    "Let me think about that differently. Could you provide a bit more context?",
                    "I want to give you the best help possible. Could you break down what you're working on?"
                ];
                fallbackContent = this.getRandomFromArray(fallbackMessages);
            }

            return {
                content: fallbackContent,
                type: 'error',
                errorType: errorType,
                confidence: 0.3,
                reasoning: 'Fallback response due to AI generation error'
            };
        }
    }

    /**
     * Build AI prompt with bot personality and context
     */
    buildAIPrompt(bot, studentMessage, conversationHistory, context) {
        const knowledgeContext = bot.knowledge
            .filter(k => k.importance_level >= 7)
            .map(k => `${k.topic}: ${k.content}`)
            .join('\n');

        const specializationContext = bot.specializations
            .map(s => `${s.name} (${s.proficiency_level})`)
            .join(', ');

        const conversationContext = conversationHistory
            .slice(-6) // Last 6 messages
            .map(msg => `${msg.sender_type === 'student' ? 'Student' : 'You'}: ${msg.message_content}`)
            .join('\n');

        return `You are ${bot.bot_name}, an AI ${bot.bot_type} with the following characteristics:

PERSONALITY:
- Type: ${bot.personality_type}
- Teaching Style: ${bot.teaching_style}
- Communication Tone: ${bot.communication_tone}
- Explanation Style: ${bot.explanation_style}
- Error Handling: ${bot.error_handling_approach}

SPECIALIZATIONS: ${specializationContext}

KEY KNOWLEDGE:
${knowledgeContext}

CONVERSATION HISTORY:
${conversationContext}

CURRENT CONTEXT:
${context.lessonId ? `Working on lesson: ${context.lessonId}` : ''}
${context.codeSnippet ? `Student's code:\n${context.codeSnippet}` : ''}
${context.errorMessage ? `Error encountered: ${context.errorMessage}` : ''}
${context.urgentSession ? `
🚨 URGENT SESSION ACTIVE:
- Session Type: ${context.urgentSession.sessionType}
- Topic: ${context.urgentSession.topic}
- Status: ${context.urgentSession.status}
- Live Session ID: ${context.urgentSession.liveSessionId}
- Description: ${context.urgentSession.description}

**CRITICAL**: You are currently IN an urgent session! Do NOT suggest starting another urgent session. Instead:
- Help the student directly with their ${context.urgentSession.sessionType} needs
- Guide them to the live collaborative editor if they need hands-on editing
- Focus on providing immediate assistance with their topic: "${context.urgentSession.topic}"
- If they need to use the collaborative editor, remind them it's already available
` : ''}

STUDENT MESSAGE: "${studentMessage}"

Please respond as ${bot.bot_name} would, staying true to your personality and teaching style. Your response should:
1. Be helpful and encouraging
2. Match your communication tone
3. Use your teaching approach
4. Draw from your specializations when relevant
5. Be concise but thorough (aim for 2-3 sentences for simple questions, longer for complex explanations)

${context.urgentSession ? `
6. **URGENT SESSION MODE**: You are actively helping in an urgent ${context.urgentSession.sessionType} session
   - Provide direct assistance with "${context.urgentSession.topic}"
   - Do NOT suggest starting another urgent session
   - If they need the collaborative editor, mention it's already available in their session
   - Focus on immediate problem-solving and guidance
` : `
6. **REGULAR CHAT MODE**: If the student needs hands-on help with essays, coding problems, or complex work that would benefit from live collaboration, suggest opening an urgent session

URGENT SESSION DETECTION (only if NOT already in urgent session):
- If the student asks for essay help, writing assistance, or wants to work on a paper → suggest urgent session with essay editor
- If the student asks for coding help, debugging, or programming assistance → suggest urgent session with AscentIDE  
- If they have a specific problem to solve or need real-time collaboration → suggest urgent session
- Keywords to watch for: "help me write", "can you code", "debug this", "work on my essay", "need help with", "stuck on", "not working"
`}

If the student is struggling, use one of your encouragement phrases: ${bot.encouragement_phrases?.slice(0, 3).join(' / ')}

Format your response as JSON:
{
    "message": "your response here",
    "type": "text/code/explanation/suggestion/encouragement",
    "confidence": 0.8,
    "reasoning": "brief explanation of your approach",
    "contextUsed": "what knowledge you drew from",
    "suggestions": ["optional", "follow-up", "suggestions"],
    ${context.urgentSession ? `
    "urgentSessionMode": {
        "isActive": true,
        "sessionType": "${context.urgentSession.sessionType}",
        "focusOn": "direct assistance with the current urgent session topic",
        "collaborativeEditorAvailable": true
    }` : `
    "urgentSession": {
        "suggested": true/false,
        "reason": "why urgent session would help (only if suggested is true)",
        "toolType": "essay-editor/ascent-ide/general",
        "sessionType": "essay_writing/coding_help/general_tutoring"
    }`}
}`;
    }

    /**
     * Parse AI response JSON
     */
    parseAIResponse(text, bot) {
        try {
            // Try to extract JSON from the response
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return {
                    message: parsed.message || text,
                    type: parsed.type || 'text',
                    confidence: parsed.confidence || 0.7,
                    reasoning: parsed.reasoning || 'AI response',
                    contextUsed: parsed.contextUsed || 'General knowledge',
                    suggestions: parsed.suggestions || [],
                    urgentSession: parsed.urgentSession || { suggested: false }
                };
            }
        } catch (error) {
            // If JSON parsing fails, use the raw text
            console.log('Could not parse AI response as JSON, using raw text');
        }

        // Fallback - return raw text with defaults
        return {
            message: text,
            type: 'text',
            confidence: 0.7,
            reasoning: 'AI generated response',
            contextUsed: 'General knowledge'
        };
    }

    /**
     * Handle IDE assistance requests
     */
    async handleIDEAssistance(botId, studentId, codeSnippet, errorMessage, language, lessonContext) {
        const context = {
            codeSnippet,
            errorMessage,
            language,
            lessonId: lessonContext?.lessonId,
            sessionType: 'ide_assistance'
        };

        // Start or get existing IDE session
        let session = await this.getOrCreateIDESession(botId, studentId, context);

        // Process the IDE assistance request
        const message = `I'm having trouble with this ${language} code. ${errorMessage ? `I'm getting this error: ${errorMessage}` : 'Could you help me understand what\'s wrong?'}`;

        const response = await this.processMessage(session.id, message, context);

        return {
            sessionId: session.id,
            response: response.content,
            suggestions: response.suggestions,
            confidence: response.confidence
        };
    }

    /**
     * Accept mentor request automatically
     */
    async acceptMentorRequest(requestId, botId) {
        // Get the request details
        const requestResult = await db.query(`
            SELECT * FROM session_requests 
            WHERE id = $1 AND status = 'pending'
        `, [requestId]);

        if (requestResult.rows.length === 0) {
            throw new Error('Request not found or already processed');
        }

        const request = requestResult.rows[0];
        const bot = await this.getBotById(botId);

        // Accept the request
        await db.query(`
            UPDATE session_requests 
            SET status = 'accepted', mentor_id = $1, updated_at = NOW()
            WHERE id = $2
        `, [bot.user_id, requestId]);

        // Create a session
        const sessionContext = {
            lessonId: request.lesson_id,
            courseId: request.course_id,
            problem: request.description
        };

        const session = await this.startSession(botId, request.student_id, 'mentoring', sessionContext);

        // Send acceptance message
        const acceptanceMessage = `Great! I've accepted your mentoring request. ${this.getRandomFromArray(bot.greeting_messages)} Let's work on "${request.topic}" together!`;
        
        await this.addConversationMessage(session.session.id, 'ai_bot', acceptanceMessage, 'acceptance');

        return {
            sessionId: session.session.id,
            message: acceptanceMessage,
            botInfo: session.bot
        };
    }

    /**
     * Complete a course and issue certificate
     */
    async completeCourseAndIssueCertificate(botId, studentId, courseId) {
        const bot = await this.getBotById(botId);
        
        // Get course details for proper scoring
        const courseResult = await db.query(`
            SELECT title, description FROM courses WHERE id = $1
        `, [courseId]);
        
        const course = courseResult.rows[0];
        
        // Create certificate record
        const certificateResult = await db.query(`
            INSERT INTO certificates 
            (student_id, course_id, issued_by, certificate_type, status)
            VALUES ($1, $2, $3, 'completion', 'issued')
            RETURNING *
        `, [studentId, courseId, bot.user_id]);

        const certificate = certificateResult.rows[0];

        // Award Ascendia points for course completion
        try {
            const scoringResult = await ascendiaScoringService.awardActivityPoints(
                studentId, 
                'course_completion', 
                { 
                    courseName: course?.title || 'Unknown Course',
                    issuedBy: bot.bot_name,
                    certificateId: certificate.id
                }
            );
            console.log(`✅ Awarded ${scoringResult.pointsAdded} points to ${studentId} for course completion`);
        } catch (error) {
            console.error('Error awarding points for course completion:', error);
        }

        // Create celebration message
        const congratsMessages = [
            "🎉 Congratulations on completing the course! You've shown incredible dedication and growth. You've earned 100 Ascendia points!",
            "🌟 Amazing work! You've mastered all the concepts and earned your certificate plus valuable points towards your next tier!",
            "🎯 Outstanding achievement! Your hard work and persistence have paid off with a completion certificate and academic points!",
            "🚀 Fantastic job! You've successfully completed all requirements and demonstrated real expertise. Ascendia points awarded!"
        ];

        const celebrationMessage = this.getRandomFromArray(congratsMessages);

        // Log this achievement
        await db.query(`
            INSERT INTO ai_bot_analytics (bot_id, date, students_helped)
            VALUES ($1, CURRENT_DATE, 1)
            ON CONFLICT (bot_id, date) 
            DO UPDATE SET students_helped = ai_bot_analytics.students_helped + 1
        `, [botId]);

        return {
            certificate,
            message: celebrationMessage,
            botName: bot.bot_name,
            pointsAwarded: 100
        };
    }

    /**
     * Complete a lesson and award points
     */
    async completeLessonAndAwardPoints(botId, studentId, lessonId) {
        const bot = await this.getBotById(botId);
        
        // Get lesson details
        const lessonResult = await db.query(`
            SELECT l.title, l.course_id, c.title as course_title 
            FROM lessons l
            JOIN courses c ON l.course_id = c.id
            WHERE l.id = $1
        `, [lessonId]);
        
        const lesson = lessonResult.rows[0];
        
        if (!lesson) {
            throw new Error('Lesson not found');
        }

        // Check if lesson already completed to avoid duplicate points
        const existingCompletion = await db.query(`
            SELECT id FROM lesson_completions 
            WHERE student_id = $1 AND lesson_id = $2
        `, [studentId, lessonId]);

        if (existingCompletion.rows.length > 0) {
            return {
                success: false,
                message: "You've already completed this lesson!",
                alreadyCompleted: true
            };
        }

        // Mark lesson as completed
        await db.query(`
            INSERT INTO lesson_completions (student_id, lesson_id, completed_at)
            VALUES ($1, $2, NOW())
        `, [studentId, lessonId]);

        // Award Ascendia points for lesson completion
        let scoringResult = null;
        try {
            scoringResult = await ascendiaScoringService.awardActivityPoints(
                studentId, 
                'lesson_completion', 
                { 
                    lessonTitle: lesson.title,
                    courseTitle: lesson.course_title,
                    mentorBot: bot.bot_name
                }
            );
            console.log(`✅ Awarded ${scoringResult.pointsAdded} points to ${studentId} for lesson completion`);
        } catch (error) {
            console.error('Error awarding points for lesson completion:', error);
        }

        // Create encouraging message
        const encouragementMessages = [
            `🎯 Great job completing "${lesson.title}"! You've earned ${scoringResult?.pointsAdded || 10} Ascendia points and strengthened your academic pillar.`,
            `📚 Excellent work on "${lesson.title}"! Your dedication is paying off with points and knowledge that will help you succeed.`,
            `🌟 Well done! You've mastered "${lesson.title}" and earned valuable points. Keep up the momentum!`,
            `🚀 Outstanding! Another lesson completed successfully. Your academic score is growing - keep learning!`
        ];

        const celebrationMessage = this.getRandomFromArray(encouragementMessages);

        // Update analytics
        await db.query(`
            INSERT INTO ai_bot_analytics (bot_id, date, lessons_completed)
            VALUES ($1, CURRENT_DATE, 1)
            ON CONFLICT (bot_id, date) 
            DO UPDATE SET lessons_completed = COALESCE(ai_bot_analytics.lessons_completed, 0) + 1
        `, [botId]);

        return {
            success: true,
            lessonId,
            lessonTitle: lesson.title,
            courseTitle: lesson.course_title,
            message: celebrationMessage,
            botName: bot.bot_name,
            pointsAwarded: scoringResult?.pointsAdded || 10,
            pillar: 'academic'
        };
    }

    /**
     * Award points for various activities during AI chat sessions
     */
    async awardSessionActivityPoints(studentId, activityType, activityData = {}) {
        try {
            let result = null;
            
            switch (activityType) {
                case 'quiz_passed':
                    result = await ascendiaScoringService.awardActivityPoints(
                        studentId, 
                        'quiz_passed', 
                        activityData
                    );
                    break;
                    
                case 'assignment_submitted':
                    result = await ascendiaScoringService.awardActivityPoints(
                        studentId, 
                        'assignment_submission', 
                        activityData
                    );
                    break;
                    
                case 'problem_solved':
                    result = await ascendiaScoringService.awardActivityPoints(
                        studentId, 
                        'analytical', 
                        15,
                        `Solved problem: ${activityData.problemTitle || 'Unknown'}`
                    );
                    break;
                    
                case 'code_review':
                    result = await ascendiaScoringService.awardActivityPoints(
                        studentId, 
                        'code_review_completed', 
                        activityData
                    );
                    break;
                    
                default:
                    console.log(`Unknown activity type: ${activityType}`);
                    return null;
            }
            
            if (result) {
                console.log(`✅ Awarded ${result.pointsAdded} ${result.pillar} points to ${studentId} for ${activityType}`);
            }
            
            return result;
            
        } catch (error) {
            console.error(`Error awarding points for ${activityType}:`, error);
            return null;
        }
    }

    /**
     * Intelligently create live learning experience based on student need
     */
    async createLiveLearningExperience(botId, studentId, sessionData) {
        try {
            const bot = await this.getBotById(botId);
            
            // Analyze the student's request to determine best learning approach
            const analysisPrompt = `As an AI mentor, analyze this student request and provide a structured learning plan:
            
            Topic: ${sessionData.topic}
            Description: ${sessionData.description}
            Subject: ${sessionData.subject}
            Difficulty: ${sessionData.difficulty}
            Session Type: ${sessionData.sessionType}
            
            Provide:
            1. Recommended lesson approach (hands-on coding, theoretical explanation, problem-solving, essay writing)
            2. Key learning objectives
            3. Step-by-step session plan
            4. Suggested tools/resources needed
            5. Expected learning outcomes
            
            Format as JSON with keys: approach, objectives, sessionPlan, tools, outcomes`;

            // Use rate-limited Gemini service for session planning
            const result = await geminiService.rateLimitedGenerate(analysisPrompt, 1800); // Session planning
            
            if (!result.success) {
                if (result.quotaExceeded) {
                    console.log('[AI_BOT_PLANNING] Using fallback due to quota exceeded');
                    return this.generateFallbackLearningPlan(sessionData, bot);
                }
                throw result.error;
            }
            
            const analysis = this.parseAIResponse(result.text);
            
            let learningPlan;
            try {
                learningPlan = JSON.parse(analysis.content);
            } catch (e) {
                // Fallback if JSON parsing fails
                learningPlan = {
                    approach: "hands-on coding",
                    objectives: ["Understand the core concept", "Apply knowledge practically"],
                    sessionPlan: ["Introduction", "Guided practice", "Independent work", "Review"],
                    tools: ["IDE", "Code examples"],
                    outcomes: ["Practical understanding", "Working solution"]
                };
            }

            // Find appropriate lessons from the library
            const recommendedLessons = await this.findRecommendedLessons(
                sessionData.subject, 
                sessionData.topic, 
                sessionData.difficulty
            );

            // Create comprehensive session environment
            const sessionEnvironment = await this.setupSessionEnvironment(
                sessionData, 
                learningPlan, 
                recommendedLessons
            );

            // Generate welcome message with learning plan
            const welcomeMessage = `🎯 **Live Learning Experience Ready!**

Hi! I'm ${bot.bot_name}, your AI mentor. I've analyzed your request and created a personalized learning experience for you.

**📚 Today's Topic**: ${sessionData.topic}

**🎯 Learning Objectives**:
${learningPlan.objectives.map((obj, i) => `${i + 1}. ${obj}`).join('\n')}

**📋 Session Plan**:
${learningPlan.sessionPlan.map((step, i) => `**Step ${i + 1}**: ${step}`).join('\n')}

**🛠️ Tools We'll Use**:
${learningPlan.tools.map(tool => `• ${tool}`).join('\n')}

${sessionEnvironment.ideUrl ? `**💻 Coding Environment**: [Open WebIDE](${sessionEnvironment.ideUrl})` : ''}
${sessionEnvironment.scribeUrl ? `**📝 Writing Workspace**: [Open Essay Editor](${sessionEnvironment.scribeUrl})` : ''}
${sessionEnvironment.recommendedLessons.length > 0 ? `\n**📖 Recommended Lessons**:\n${sessionEnvironment.recommendedLessons.map(lesson => `• [${lesson.title}](${lesson.url})`).join('\n')}` : ''}

Ready to start? Let's begin with Step 1! 🚀`;

            return {
                success: true,
                learningPlan,
                sessionEnvironment,
                welcomeMessage,
                botName: bot.bot_name,
                estimatedDuration: this.estimateSessionDuration(learningPlan)
            };

        } catch (error) {
            console.error('Error creating live learning experience:', error);
            throw new Error(`Failed to create learning experience: ${error.message}`);
        }
    }

    /**
     * Find recommended lessons from the lesson library
     */
    async findRecommendedLessons(subject, topic, difficulty) {
        try {
            // Add null checks and default values
            const safeSubject = subject || 'General';
            const safeTopic = topic || 'Learning';
            const safeDifficulty = difficulty || 'beginner';
            
            console.log(`[AI_BOT] Finding lessons for: subject="${safeSubject}", topic="${safeTopic}", difficulty="${safeDifficulty}"`);
            
            // Search for relevant lessons in the database
            const lessonsResult = await db.query(`
                SELECT 
                    l.id,
                    l.title,
                    l.description,
                    l.difficulty_level,
                    l.content_type,
                    l.estimated_duration,
                    COALESCE(c.title, 'General Course') as course_title
                FROM lessons l
                LEFT JOIN courses c ON l.course_id = c.id
                WHERE 
                    (LOWER(l.title) LIKE $1 OR LOWER(COALESCE(l.description, '')) LIKE $1 OR LOWER(COALESCE(c.title, '')) LIKE $2)
                    AND l.difficulty_level <= $3
                    AND l.is_active = true
                ORDER BY 
                    CASE 
                        WHEN LOWER(l.title) LIKE $1 THEN 1
                        WHEN LOWER(COALESCE(l.description, '')) LIKE $1 THEN 2
                        ELSE 3
                    END,
                    l.difficulty_level DESC
                LIMIT 5
            `, [
                `%${safeTopic.toLowerCase()}%`,
                `%${safeSubject.toLowerCase()}%`,
                this.mapDifficultyToLevel(safeDifficulty)
            ]);

            return lessonsResult.rows.map(lesson => ({
                id: lesson.id,
                title: lesson.title,
                description: lesson.description,
                difficulty: lesson.difficulty_level,
                duration: lesson.estimated_duration,
                courseTitle: lesson.course_title,
                url: `/course-lesson/${lesson.id}`
            }));

        } catch (error) {
            console.error('Error finding recommended lessons:', error);
            return [];
        }
    }

    /**
     * Setup session environment with appropriate tools
     */
    async setupSessionEnvironment(sessionData, learningPlan, recommendedLessons) {
        const environment = {
            recommendedLessons,
            ideUrl: null,
            scribeUrl: null,
            tutorialUrl: null,
            resources: []
        };

        // Setup WebIDE for coding sessions
        if (learningPlan.approach === 'hands-on coding' || sessionData.sessionType === 'mentoring') {
            if (sessionData.lessonId) {
                environment.ideUrl = `/ascent-ide/${sessionData.lessonId}?mentor=ai&guided=true`;
            } else if (recommendedLessons.length > 0) {
                environment.ideUrl = `/ascent-ide/${recommendedLessons[0].id}?mentor=ai&guided=true`;
            } else {
                environment.ideUrl = `/ascent-ide/playground?mentor=ai&topic=${encodeURIComponent(sessionData.topic)}`;
            }
        }

        // Setup Scribe for essay writing sessions
        if (sessionData.sessionType === 'essay_editing') {
            environment.scribeUrl = `/scribe-session?topic=${encodeURIComponent(sessionData.topic)}&mentor=ai&guided=true`;
        }

        // Add additional resources based on topic
        environment.resources = await this.gatherTopicResources(sessionData.topic, sessionData.subject);

        return environment;
    }

    /**
     * Gather additional resources for the topic
     */
    async gatherTopicResources(topic, subject) {
        const resources = [];

        // Add common CS resources based on topic keywords
        const topicLower = topic.toLowerCase();
        
        if (topicLower.includes('algorithm') || topicLower.includes('sorting') || topicLower.includes('search')) {
            resources.push({
                type: 'visualization',
                title: 'Algorithm Visualizer',
                url: 'https://algorithm-visualizer.org/',
                description: 'Visual representation of algorithms'
            });
        }

        if (topicLower.includes('data structure')) {
            resources.push({
                type: 'reference',
                title: 'Data Structures Reference',
                url: '/resources/data-structures',
                description: 'Comprehensive guide to data structures'
            });
        }

        if (topicLower.includes('javascript') || topicLower.includes('js')) {
            resources.push({
                type: 'documentation',
                title: 'MDN JavaScript Reference',
                url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript',
                description: 'Official JavaScript documentation'
            });
        }

        return resources;
    }

    /**
     * Estimate session duration based on learning plan
     */
    estimateSessionDuration(learningPlan) {
        const baseTime = 30; // 30 minutes base
        const stepTime = learningPlan.sessionPlan.length * 10; // 10 minutes per step
        const objectiveTime = learningPlan.objectives.length * 5; // 5 minutes per objective
        
        return Math.min(baseTime + stepTime + objectiveTime, 90); // Cap at 90 minutes
    }

    /**
     * Map difficulty string to numeric level
     */
    mapDifficultyToLevel(difficulty) {
        const difficultyMap = {
            'beginner': 1,
            'intermediate': 2,
            'advanced': 3,
            'expert': 4
        };
        return difficultyMap[difficulty] || 2;
    }

    /**
     * Utility functions
     */
    async addConversationMessage(sessionId, senderType, content, messageType = 'text', metadata = {}) {
        const orderResult = await db.query(`
            SELECT COALESCE(MAX(message_order), 0) + 1 as next_order
            FROM ai_bot_conversations WHERE session_id = $1
        `, [sessionId]);

        const nextOrder = orderResult.rows[0].next_order;

        return db.query(`
            INSERT INTO ai_bot_conversations 
            (session_id, message_order, sender_type, message_content, message_type, ai_reasoning, confidence_score, context_used)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `, [
            sessionId, 
            nextOrder, 
            senderType, 
            content, 
            messageType,
            metadata.reasoning,
            metadata.confidence,
            metadata.contextUsed
        ]);
    }

    async getConversationHistory(sessionId, limit = 20) {
        const result = await db.query(`
            SELECT * FROM ai_bot_conversations
            WHERE session_id = $1
            ORDER BY message_order DESC
            LIMIT $2
        `, [sessionId, limit]);

        return result.rows.reverse(); // Return in chronological order
    }

    async getOrCreateIDESession(botId, studentId, context) {
        // Check for existing active IDE session
        const existingResult = await db.query(`
            SELECT * FROM ai_bot_sessions
            WHERE bot_id = $1 AND student_id = $2 
            AND session_type = 'ide_assistance' 
            AND status = 'active'
            AND started_at > NOW() - INTERVAL '1 hour'
            ORDER BY started_at DESC
            LIMIT 1
        `, [botId, studentId]);

        if (existingResult.rows.length > 0) {
            return existingResult.rows[0];
        }

        // Create new IDE session
        const sessionData = await this.startSession(botId, studentId, 'ide_assistance', context);
        return sessionData.session;
    }

    getRandomFromArray(array) {
        if (!array || array.length === 0) return "I'm here to help!";
        return array[Math.floor(Math.random() * array.length)];
    }

    /**
     * End session and update analytics
     */
    async endSession(sessionId, studentFeedback = null) {
        const session = await db.query(`
            UPDATE ai_bot_sessions 
            SET 
                ended_at = NOW(),
                duration_minutes = EXTRACT(EPOCH FROM (NOW() - started_at)) / 60,
                status = 'completed',
                student_satisfaction = $2
            WHERE id = $1
            RETURNING *
        `, [sessionId, studentFeedback?.rating]);

        if (session.rows.length > 0) {
            const sessionData = session.rows[0];
            
            // Update bot's active sessions count
            await db.query(`
                UPDATE ai_bots 
                SET current_active_sessions = GREATEST(current_active_sessions - 1, 0)
                WHERE id = $1
            `, [sessionData.bot_id]);

            // Update analytics
            await db.query(`
                INSERT INTO ai_bot_analytics (bot_id, date, sessions_conducted, problems_solved)
                VALUES ($1, CURRENT_DATE, 1, 1)
                ON CONFLICT (bot_id, date) 
                DO UPDATE SET 
                    sessions_conducted = ai_bot_analytics.sessions_conducted + 1,
                    problems_solved = ai_bot_analytics.problems_solved + 1
            `, [sessionData.bot_id]);
        }

        return session.rows[0];
    }

    /**
     * Get available AI bots for discovery
     */
    async getAvailableBots() {
        const result = await db.query(`
            SELECT 
                ab.id,
                ab.user_id,
                ab.bot_name,
                ab.bot_type,
                ab.personality_type,
                ab.specialization_focus,
                up.display_name,
                up.bio,
                up.location,
                up.average_rating,
                up.total_sessions,
                up.total_reviews,
                up.is_mentor,
                up.is_counselor,
                up.is_essay_editor
            FROM ai_bots ab
            JOIN user_profiles up ON ab.user_id = up.user_id
            WHERE ab.is_active = true
            ORDER BY up.average_rating DESC, up.total_sessions DESC
        `);

        return result.rows;
    }

    /**
     * Generate fallback response when Gemini quota is exceeded
     */
    generateQuotaFallbackResponse(studentMessage, bot) {
        const fallbackMessages = [
            "I'm experiencing high demand right now and need a moment to respond thoughtfully. Please try asking me again in a minute - I'll be here to help!",
            "My AI systems are at capacity due to heavy usage. Give me 60 seconds to reset and I'll provide you with detailed assistance.",
            "I'm temporarily overwhelmed with requests. Please wait a minute and ask again - I want to give you the quality help you deserve!",
            "High traffic is affecting my response time. Please retry in a moment and I'll provide comprehensive guidance on your question.",
            "I'm currently processing many requests. Please try again shortly - I'm committed to helping you succeed!"
        ];
        
        const randomMessage = fallbackMessages[Math.floor(Math.random() * fallbackMessages.length)];
        
        return {
            content: `${randomMessage}\n\nIn the meantime, feel free to continue working on your ${bot.specialization_focus || 'project'} and I'll catch up when my systems are less busy.`,
            type: 'supportive',
            confidence: 80,
            reasoning: 'Quota fallback response - encourages retry',
            contextUsed: 'System capacity management',
            suggestions: [
                'Try asking again in 1-2 minutes',
                'Continue working on your current task',
                'Break down complex questions into smaller parts'
            ]
        };
    }

    /**
     * Generate fallback learning plan when quota exceeded
     */
    generateFallbackLearningPlan(sessionData, bot) {
        return {
            approach: 'structured-learning',
            objectives: [
                `Understand key concepts in ${sessionData.subject || 'the subject area'}`,
                'Apply learning through practical exercises',
                'Build confidence through guided practice'
            ],
            sessionPlan: [
                'Introduction and goal setting (5 mins)',
                `Core concept explanation for ${sessionData.subject || 'the topic'} (15 mins)`,
                'Hands-on practice activity (20 mins)', 
                'Q&A and clarification (10 mins)',
                'Next steps planning (5 mins)'
            ],
            tools: ['Interactive examples', 'Practice exercises', 'Reference materials'],
            outcomes: [
                `Basic understanding of ${sessionData.subject || 'the topic'}`,
                'Practical application skills',
                'Clear action plan for continued learning'
            ],
            fallbackNotice: 'This is a basic lesson plan. For AI-optimized planning, please try again when systems are less busy.'
        };
    }
}

module.exports = new AIBotService();