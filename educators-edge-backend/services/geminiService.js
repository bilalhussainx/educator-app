// educators-edge-backend/services/geminiService.js
const { GoogleGenerativeAI } = require('@google/generative-ai');
const db = require('../db');

class RateLimiter {
    constructor(requestsPerMinute = 12, tokensPerMinute = 900000) { // Conservative limits for free tier
        this.requests = [];
        this.tokens = [];
        this.requestLimit = requestsPerMinute;
        this.tokenLimit = tokensPerMinute;
        this.isThrottling = false;
    }
    
    async throttle(estimatedTokens = 1000) {
        const now = Date.now();
        
        // Remove requests and tokens older than 1 minute
        this.requests = this.requests.filter(time => now - time < 60000);
        this.tokens = this.tokens.filter(entry => now - entry.time < 60000);
        
        // Calculate current token usage
        const currentTokens = this.tokens.reduce((sum, entry) => sum + entry.count, 0);
        
        // Check if we need to wait for request limit
        if (this.requests.length >= this.requestLimit) {
            const waitTime = 60000 - (now - this.requests[0]) + 1000; // Extra 1 second buffer
            console.log(`[RATE_LIMITER] Request limit reached. Waiting ${Math.round(waitTime/1000)}s...`);
            this.isThrottling = true;
            await new Promise(resolve => setTimeout(resolve, waitTime));
            this.isThrottling = false;
        }
        
        // Check if we need to wait for token limit
        if (currentTokens + estimatedTokens >= this.tokenLimit) {
            const oldestToken = this.tokens[0];
            const waitTime = oldestToken ? (60000 - (now - oldestToken.time) + 1000) : 60000;
            console.log(`[RATE_LIMITER] Token limit approaching. Waiting ${Math.round(waitTime/1000)}s...`);
            this.isThrottling = true;
            await new Promise(resolve => setTimeout(resolve, waitTime));
            this.isThrottling = false;
        }
        
        // Record this request and estimated tokens
        this.requests.push(now);
        this.tokens.push({ time: now, count: estimatedTokens });
    }
    
    getStatus() {
        const now = Date.now();
        const recentRequests = this.requests.filter(time => now - time < 60000).length;
        const recentTokens = this.tokens
            .filter(entry => now - entry.time < 60000)
            .reduce((sum, entry) => sum + entry.count, 0);
        
        return {
            requestsUsed: recentRequests,
            requestLimit: this.requestLimit,
            tokensUsed: recentTokens,
            tokenLimit: this.tokenLimit,
            isThrottling: this.isThrottling
        };
    }
}

class GeminiAIService {
    constructor() {
        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        this.rateLimiter = new RateLimiter();
        
        // Specialized agent configurations
        this.agents = {
            editSuggestionAgent: {
                name: 'Edit Suggestion Specialist',
                systemPrompt: `You are an expert editor that provides specific text replacement suggestions for selected text.

CRITICAL INSTRUCTIONS:
1. When given SELECTED TEXT, analyze it for specific improvements
2. Provide ONLY structured edit suggestions using this EXACT format:

[EDIT_SUGGESTION]
Original: "exact text from the selection to replace"
Suggested: "improved replacement text"  
Reason: "brief explanation why this is better"
[/EDIT_SUGGESTION]

3. You can provide multiple [EDIT_SUGGESTION] blocks for different parts
4. NEVER provide incomplete suggestions or fragments
5. If no specific edits are needed, provide general feedback without the [EDIT_SUGGESTION] format
6. Focus on: grammar, clarity, word choice, sentence structure, and style improvements
7. Make sure "Original" text actually exists in the provided selected text

Example of correct format:
[EDIT_SUGGESTION]
Original: "The story is very interesting and good"
Suggested: "The story captivates readers with its compelling narrative"
Reason: "More specific and engaging language"
[/EDIT_SUGGESTION]`,
                model: 'gemini-1.5-flash'
            },
            
            feedbackAgent: {
                name: 'Writing Feedback Specialist',
                systemPrompt: `You are a writing coach that provides general feedback and guidance without specific text edits.
                
Your role is to:
- Analyze overall structure and flow
- Suggest improvements to style and tone
- Provide encouragement and direction
- Give high-level writing advice

Do NOT provide specific text replacements. Focus on conceptual improvements and writing strategies.`,
                model: 'gemini-1.5-flash'
            },
            
            commentAgent: {
                name: 'Contextual Comment Specialist', 
                systemPrompt: `You are an expert at creating specific, contextual comments on selected text passages, like Microsoft Word comments.

When given SELECTED TEXT, provide focused feedback that includes:

1. SPECIFIC analysis of the selected passage
2. CONCRETE suggestions for improvement 
3. Clear explanations of why changes would help

Your response should be concise (2-4 sentences) and directly address the selected text.
Think of this as a professional editor's comment bubble.

Focus areas:
- Clarity and readability
- Word choice and precision  
- Sentence structure and flow
- Grammar and style
- Engagement and impact

Do NOT provide general essay feedback - focus ONLY on the specific selected text.`,
                model: 'gemini-1.5-flash'
            }
        };
        
        // Track API usage for monitoring
        this.apiStats = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            quotaErrors: 0,
            lastError: null,
            lastErrorTime: null
        };
    }

    /**
     * Rate-limited API call wrapper with fallback handling
     * @param {string} prompt - The prompt to send to Gemini
     * @param {number} estimatedTokens - Estimated token count for rate limiting
     * @returns {Promise<object>} - API response or fallback
     */
    async rateLimitedGenerate(prompt, estimatedTokens = 1000) {
        try {
            // Apply rate limiting
            await this.rateLimiter.throttle(estimatedTokens);
            
            this.apiStats.totalRequests++;
            console.log(`[GEMINI_API] Request ${this.apiStats.totalRequests} (Rate Limiter Status:`, this.rateLimiter.getStatus(), ')');
            
            // Make the API call
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            
            this.apiStats.successfulRequests++;
            return {
                success: true,
                response: response,
                text: response.text(),
                fromFallback: false
            };
            
        } catch (error) {
            this.apiStats.failedRequests++;
            this.apiStats.lastError = error.message;
            this.apiStats.lastErrorTime = new Date().toISOString();
            
            // Check if this is a quota/rate limit error
            if (error.message.includes('429') || 
                error.message.includes('quota') || 
                error.message.includes('rate limit') ||
                error.message.includes('Too Many Requests')) {
                
                this.apiStats.quotaErrors++;
                console.error(`[GEMINI_API] Quota exceeded (Error ${this.apiStats.quotaErrors}):`, error.message);
                
                return {
                    success: false,
                    error: error,
                    fallbackResponse: this.generateQuotaFallbackResponse(prompt),
                    fromFallback: true,
                    quotaExceeded: true
                };
            }
            
            // Other API errors
            console.error('[GEMINI_API] API Error:', error.message);
            throw error;
        }
    }

    /**
     * Generate helpful fallback response when quota is exceeded
     * @param {string} prompt - Original prompt for context
     * @returns {object} - Fallback response
     */
    generateQuotaFallbackResponse(prompt) {
        const promptLower = prompt.toLowerCase();
        let fallbackMessage = '';
        
        // Context-aware fallback messages
        if (promptLower.includes('lesson') && promptLower.includes('search')) {
            fallbackMessage = "I'm currently experiencing high demand and cannot analyze lessons with AI right now. Please try again in a minute, or use the basic search filters to find lessons by keywords, difficulty level, or subject area.";
        } else if (promptLower.includes('teacher') && promptLower.includes('search')) {
            fallbackMessage = "AI teacher matching is temporarily unavailable due to high usage. Please try again shortly, or browse teachers by subject area, experience level, or ratings to find a good match.";
        } else if (promptLower.includes('mentor') && promptLower.includes('discovery')) {
            fallbackMessage = "The Talent Crucible AI is currently at capacity. Please wait a moment and try again, or use the standard mentor search with filters for specialization and experience.";
        } else if (promptLower.includes('course') && promptLower.includes('structure')) {
            fallbackMessage = "Course optimization AI is temporarily unavailable. You can manually organize lessons by dragging them into your preferred order, or try again in a minute for AI-powered suggestions.";
        } else if (promptLower.includes('essay') || promptLower.includes('writing')) {
            fallbackMessage = "I'm experiencing high demand and cannot provide detailed writing analysis right now. Please continue writing - I'll provide feedback when available, or try again in a minute.";
        } else {
            fallbackMessage = "AI services are temporarily at capacity due to high usage. Please wait 1-2 minutes and try again. Your request is important and will be processed when quota resets.";
        }
        
        return {
            text: () => fallbackMessage,
            fromQuotaFallback: true,
            retryAfterMinutes: 1
        };
    }

    /**
     * Get current API usage statistics
     * @returns {object} - Usage statistics
     */
    getApiStats() {
        return {
            ...this.apiStats,
            rateLimiterStatus: this.rateLimiter.getStatus(),
            quotaHealthScore: this.calculateQuotaHealth()
        };
    }

    /**
     * Calculate quota health score (0-100)
     * @returns {number} - Health score
     */
    calculateQuotaHealth() {
        const stats = this.rateLimiter.getStatus();
        const requestHealth = Math.max(0, 100 - (stats.requestsUsed / stats.requestLimit) * 100);
        const tokenHealth = Math.max(0, 100 - (stats.tokensUsed / stats.tokenLimit) * 100);
        return Math.min(requestHealth, tokenHealth);
    }

    /**
     * Intelligent lesson search and ranking
     * @param {string} query - Teacher's search query
     * @param {object} context - Course context and preferences
     * @returns {object} - Ranked lesson suggestions with explanations
     */
    async intelligentLessonSearch(query, context = {}) {
        try {
            // Get available lessons from database
            const lessonsResult = await db.query(`
                SELECT 
                    l.id, l.title, l.description, l.lesson_type, l.language,
                    l.objective, l.difficulty_level, l.estimated_time,
                    COALESCE(array_agg(t.name) FILTER (WHERE t.name IS NOT NULL), '{}') as tags
                FROM ingested_lessons l
                LEFT JOIN lesson_tags lt ON l.id = lt.lesson_id
                LEFT JOIN tags t ON lt.tag_id = t.id
                WHERE l.status = 'active'
                GROUP BY l.id, l.title, l.description, l.lesson_type, l.language, l.objective, l.difficulty_level, l.estimated_time
                ORDER BY l.created_at DESC
                LIMIT 100
            `);

            const lessons = lessonsResult.rows;

            // Create AI prompt for intelligent lesson ranking
            const prompt = `
You are an expert curriculum designer and educational AI assistant. Analyze the following teacher request and rank the most suitable lessons.

TEACHER REQUEST: "${query}"

COURSE CONTEXT:
- Course Title: ${context.courseTitle || 'Not specified'}
- Course Level: ${context.courseLevel || 'Not specified'}
- Target Audience: ${context.targetAudience || 'General students'}
- Course Objectives: ${context.objectives || 'Not specified'}
- Preferred Duration: ${context.duration || 'Not specified'}

AVAILABLE LESSONS:
${lessons.map((lesson, index) => `
${index + 1}. Title: ${lesson.title}
   Description: ${lesson.description}
   Type: ${lesson.lesson_type}
   Language: ${lesson.language}
   Objective: ${lesson.objective}
   Difficulty: ${lesson.difficulty_level || 'Not specified'}
   Duration: ${lesson.estimated_time || 'Not specified'}
   Tags: ${lesson.tags.join(', ')}
   ID: ${lesson.id}
`).join('\n')}

Please analyze and rank the top 10 most relevant lessons. For each recommended lesson, provide:

1. Lesson ID
2. Relevance score (1-100)
3. Brief explanation of why it fits the request
4. Suggested position in curriculum (early/middle/late)
5. Prerequisites if any
6. Learning outcomes alignment

Respond in JSON format:
{
  "analysis": "Brief analysis of the teacher's request and approach",
  "recommendations": [
    {
      "lessonId": "lesson_id_here",
      "relevanceScore": 95,
      "explanation": "Why this lesson is perfect for the request",
      "curriculumPosition": "early|middle|late",
      "prerequisites": ["prerequisite1", "prerequisite2"],
      "learningOutcomes": ["outcome1", "outcome2"],
      "aiInsight": "Additional AI insight about this lesson"
    }
  ],
  "additionalSuggestions": "Suggestions for gaps or additional content needed"
}
`;

            const result = await this.rateLimitedGenerate(prompt, 2000); // Estimate 2000 tokens for lesson search
            
            if (!result.success) {
                // Handle quota exceeded case
                if (result.quotaExceeded) {
                    console.log('[LESSON_SEARCH] Using fallback due to quota exceeded');
                    return this.fallbackLessonSearch(query, context);
                }
                throw result.error;
            }
            
            const text = result.text;
            
            // Parse AI response
            let aiAnalysis;
            try {
                // Extract JSON from response
                const jsonMatch = text.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    aiAnalysis = JSON.parse(jsonMatch[0]);
                } else {
                    throw new Error('No JSON found in response');
                }
            } catch (parseError) {
                console.error('Error parsing AI response:', parseError);
                // Fallback to simple relevance matching
                aiAnalysis = this.generateFallbackAnalysis(query, lessons);
            }

            // Enhance recommendations with lesson data
            const enhancedRecommendations = aiAnalysis.recommendations.map(rec => {
                const lesson = lessons.find(l => l.id === rec.lessonId);
                return {
                    ...rec,
                    lesson: lesson || null
                };
            }).filter(rec => rec.lesson); // Remove any invalid lesson IDs

            return {
                query,
                analysis: aiAnalysis.analysis,
                recommendations: enhancedRecommendations,
                additionalSuggestions: aiAnalysis.additionalSuggestions,
                totalLessonsAnalyzed: lessons.length,
                aiProcessedAt: new Date().toISOString()
            };

        } catch (error) {
            console.error('Gemini lesson search error:', error);
            
            // Fallback to keyword-based search
            return this.fallbackLessonSearch(query, context);
        }
    }

    /**
     * AI-powered course structure optimization
     * @param {array} selectedLessons - Array of lesson objects
     * @param {object} courseGoals - Course objectives and constraints
     * @returns {object} - Optimized course structure with chapters
     */
    async optimizeCourseStructure(selectedLessons, courseGoals = {}) {
        try {
            const prompt = `
You are an expert curriculum designer. Given the selected lessons, create an optimal course structure with logical chapters and lesson ordering.

COURSE GOALS:
- Title: ${courseGoals.title || 'Programming Course'}
- Level: ${courseGoals.level || 'Intermediate'}
- Duration: ${courseGoals.duration || '8-12 weeks'}
- Objectives: ${courseGoals.objectives || 'Comprehensive programming skills'}

SELECTED LESSONS:
${selectedLessons.map((lesson, index) => `
${index + 1}. ${lesson.title}
   Description: ${lesson.description}
   Type: ${lesson.lesson_type}
   Difficulty: ${lesson.difficulty_level || 'Not specified'}
   Objective: ${lesson.objective}
`).join('\n')}

Please create an optimal course structure. Consider:
- Logical learning progression
- Difficulty curve
- Prerequisite dependencies
- Balanced chapter lengths
- Engaging variety in lesson types

Respond in JSON format:
{
  "courseStructure": {
    "title": "Optimized course title",
    "description": "Course overview",
    "estimatedDuration": "Duration estimate",
    "chapters": [
      {
        "chapterNumber": 1,
        "title": "Chapter Title",
        "description": "Chapter overview and learning goals",
        "estimatedTime": "Chapter duration",
        "lessons": [
          {
            "lessonId": "lesson_id",
            "orderInChapter": 1,
            "transitionNote": "Why this lesson comes next"
          }
        ]
      }
    ]
  },
  "optimizationInsights": [
    "Key insight about the structure",
    "Pedagogical reasoning for arrangement"
  ],
  "suggestedImprovements": [
    "Suggestion for additional content",
    "Gap analysis and recommendations"
  ]
}
`;

            const result = await this.rateLimitedGenerate(prompt, 1500); // GENERAL
            
            if (!result.success) {
                if (result.quotaExceeded) {
                    console.log('[GENERAL] Using fallback due to quota exceeded');
                    
                }
                throw result.error;
            }
            
            const text = result.text;
            
            // Parse AI response
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const aiStructure = JSON.parse(jsonMatch[0]);
                
                // Enhance with lesson data
                const enhancedStructure = {
                    ...aiStructure.courseStructure,
                    chapters: aiStructure.courseStructure.chapters.map(chapter => ({
                        ...chapter,
                        lessons: chapter.lessons.map(lessonRef => {
                            const lesson = selectedLessons.find(l => l.id === lessonRef.lessonId);
                            return {
                                ...lessonRef,
                                lesson: lesson || null
                            };
                        }).filter(l => l.lesson)
                    }))
                };

                return {
                    originalLessons: selectedLessons,
                    optimizedStructure: enhancedStructure,
                    insights: aiStructure.optimizationInsights,
                    suggestions: aiStructure.suggestedImprovements,
                    aiProcessedAt: new Date().toISOString()
                };
            }
            
            throw new Error('No valid JSON response from AI');

        } catch (error) {
            console.error('Course optimization error:', error);
            return this.generateFallbackStructure(selectedLessons, courseGoals);
        }
    }

    /**
     * Semantic search for lesson discovery
     * @param {string} description - Natural language description of what teacher wants
     * @returns {object} - Contextually relevant lesson suggestions
     */
    async semanticLessonDiscovery(description) {
        try {
            // Get lesson metadata for semantic analysis
            const lessonsResult = await db.query(`
                SELECT 
                    l.id, l.title, l.description, l.lesson_type, l.language,
                    l.objective, l.difficulty_level,
                    COALESCE(array_agg(DISTINCT c.name) FILTER (WHERE c.name IS NOT NULL), '{}') as concepts,
                    COALESCE(array_agg(DISTINCT t.name) FILTER (WHERE t.name IS NOT NULL), '{}') as tags
                FROM ingested_lessons l
                LEFT JOIN lesson_concepts lc ON l.id = lc.lesson_id
                LEFT JOIN concepts c ON lc.concept_id = c.id
                LEFT JOIN lesson_tags lt ON l.id = lt.lesson_id
                LEFT JOIN tags t ON lt.tag_id = t.id
                WHERE l.status = 'active'
                GROUP BY l.id, l.title, l.description, l.lesson_type, l.language, l.objective, l.difficulty_level
                ORDER BY l.created_at DESC
                LIMIT 50
            `);

            const lessons = lessonsResult.rows;

            const prompt = `
You are an expert educational content curator with deep understanding of programming concepts and pedagogy.

TEACHER REQUEST: "${description}"

AVAILABLE LESSONS:
${lessons.map((lesson, index) => `
${index + 1}. ${lesson.title}
   Description: ${lesson.description}
   Concepts: ${lesson.concepts.join(', ')}
   Tags: ${lesson.tags.join(', ')}
   Type: ${lesson.lesson_type}
   Objective: ${lesson.objective}
   ID: ${lesson.id}
`).join('\n')}

Based on the teacher's natural language request, identify lessons that semantically match their intent. Consider:
- Conceptual alignment with the request
- Learning objective compatibility
- Skill progression logic
- Practical application relevance

Return the top 8 most semantically relevant lessons in JSON format:
{
  "interpretation": "How you interpreted the teacher's request",
  "semanticMatches": [
    {
      "lessonId": "lesson_id",
      "semanticRelevance": 95,
      "conceptAlignment": "What concepts match",
      "pedagogicalValue": "Educational value explanation",
      "implementationTip": "How to use this lesson effectively"
    }
  ],
  "learningPath": "Suggested sequence if using multiple lessons"
}
`;

            const result = await this.rateLimitedGenerate(prompt, 1500); // GENERAL
            
            if (!result.success) {
                if (result.quotaExceeded) {
                    console.log('[GENERAL] Using fallback due to quota exceeded');
                    
                }
                throw result.error;
            }
            
            const text = result.text;
            
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const semanticAnalysis = JSON.parse(jsonMatch[0]);
                
                // Enhance with full lesson data
                const enrichedMatches = semanticAnalysis.semanticMatches.map(match => {
                    const lesson = lessons.find(l => l.id === match.lessonId);
                    return {
                        ...match,
                        lesson: lesson || null
                    };
                }).filter(m => m.lesson);

                return {
                    query: description,
                    interpretation: semanticAnalysis.interpretation,
                    matches: enrichedMatches,
                    learningPath: semanticAnalysis.learningPath,
                    aiProcessedAt: new Date().toISOString()
                };
            }

            throw new Error('No valid JSON response');

        } catch (error) {
            console.error('Semantic discovery error:', error);
            return this.fallbackSemanticSearch(description);
        }
    }

    /**
     * Generate chapter suggestions based on lesson analysis
     * @param {array} lessons - Array of lessons to analyze
     * @returns {object} - AI-suggested chapter organization
     */
    async suggestChapters(lessons) {
        try {
            const prompt = `
Analyze the following lessons and suggest logical chapter groupings for a programming course.

LESSONS TO ANALYZE:
${lessons.map((lesson, index) => `
${index + 1}. ${lesson.title}
   Description: ${lesson.description}
   Type: ${lesson.lesson_type}
   Concepts: ${lesson.concepts?.join(', ') || 'N/A'}
   Difficulty: ${lesson.difficulty_level || 'Not specified'}
`).join('\n')}

Create logical chapter groupings that:
- Follow natural learning progression
- Group related concepts together
- Maintain appropriate chapter sizes (3-6 lessons per chapter)
- Create meaningful learning milestones

Respond in JSON format:
{
  "suggestedChapters": [
    {
      "chapterTitle": "Descriptive chapter name",
      "chapterDescription": "What students will learn in this chapter",
      "learningObjectives": ["objective1", "objective2"],
      "lessonIds": ["lesson_id1", "lesson_id2"],
      "rationale": "Why these lessons belong together",
      "estimatedTime": "Chapter duration estimate"
    }
  ],
  "overallProgression": "Description of the learning journey",
  "alternativeGroupings": "Alternative ways to organize these lessons"
}
`;

            const result = await this.rateLimitedGenerate(prompt, 1500); // GENERAL
            
            if (!result.success) {
                if (result.quotaExceeded) {
                    console.log('[GENERAL] Using fallback due to quota exceeded');
                    
                }
                throw result.error;
            }
            
            const text = result.text;
            
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const chapterSuggestions = JSON.parse(jsonMatch[0]);
                return {
                    ...chapterSuggestions,
                    aiProcessedAt: new Date().toISOString()
                };
            }

            throw new Error('No valid JSON response');

        } catch (error) {
            console.error('Chapter suggestion error:', error);
            return this.generateFallbackChapters(lessons);
        }
    }

    // Fallback methods for when AI fails
    generateFallbackAnalysis(query, lessons) {
        const keywords = query.toLowerCase().split(' ');
        const scored = lessons.map(lesson => {
            let score = 0;
            const searchText = `${lesson.title} ${lesson.description} ${lesson.objective}`.toLowerCase();
            
            keywords.forEach(keyword => {
                if (searchText.includes(keyword)) {
                    score += keyword.length > 3 ? 20 : 10;
                }
            });

            return { lesson, score };
        });

        const recommendations = scored
            .filter(item => item.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 10)
            .map((item, index) => ({
                lessonId: item.lesson.id,
                relevanceScore: Math.max(60 - (index * 5), 30),
                explanation: `Matches keywords from your search query`,
                curriculumPosition: index < 3 ? 'early' : index < 7 ? 'middle' : 'late',
                prerequisites: [],
                learningOutcomes: [item.lesson.objective || 'Programming skills'],
                aiInsight: 'Basic keyword matching (AI analysis unavailable)'
            }));

        return {
            analysis: 'Performed keyword-based search (AI analysis unavailable)',
            recommendations,
            additionalSuggestions: 'Consider refining your search terms for better results'
        };
    }

    async fallbackLessonSearch(query, context) {
        // Simple database search fallback
        const result = await db.query(`
            SELECT l.*, 
                   similarity(l.title, $1) + similarity(l.description, $1) as relevance
            FROM ingested_lessons l
            WHERE l.title ILIKE $2 OR l.description ILIKE $2
            ORDER BY relevance DESC
            LIMIT 10
        `, [query, `%${query}%`]);

        return {
            query,
            analysis: 'Performed basic database search',
            recommendations: result.rows.map((lesson, index) => ({
                lessonId: lesson.id,
                relevanceScore: Math.max(80 - (index * 8), 20),
                explanation: 'Matched based on title and description',
                lesson
            })),
            additionalSuggestions: 'AI analysis temporarily unavailable'
        };
    }

    generateFallbackStructure(lessons, goals) {
        // Simple grouping by lesson type
        const chapters = [];
        const lessonsByType = lessons.reduce((acc, lesson) => {
            const type = lesson.lesson_type || 'general';
            if (!acc[type]) acc[type] = [];
            acc[type].push(lesson);
            return acc;
        }, {});

        let chapterNumber = 1;
        Object.entries(lessonsByType).forEach(([type, typeLessons]) => {
            chapters.push({
                chapterNumber: chapterNumber++,
                title: `${type.charAt(0).toUpperCase() + type.slice(1)} Fundamentals`,
                description: `Core concepts in ${type}`,
                lessons: typeLessons.map((lesson, index) => ({
                    lessonId: lesson.id,
                    orderInChapter: index + 1,
                    lesson
                }))
            });
        });

        return {
            originalLessons: lessons,
            optimizedStructure: {
                title: goals.title || 'Programming Course',
                chapters
            },
            insights: ['Grouped lessons by type', 'Basic sequential ordering applied'],
            suggestions: ['Consider AI-powered optimization when service is available']
        };
    }

    fallbackSemanticSearch(description) {
        return {
            query: description,
            interpretation: 'Basic keyword extraction performed',
            matches: [],
            learningPath: 'Semantic analysis temporarily unavailable',
            aiProcessedAt: new Date().toISOString()
        };
    }

    generateFallbackChapters(lessons) {
        const chapterSize = Math.max(3, Math.floor(lessons.length / 4));
        const chapters = [];
        
        for (let i = 0; i < lessons.length; i += chapterSize) {
            const chapterLessons = lessons.slice(i, i + chapterSize);
            chapters.push({
                chapterTitle: `Chapter ${Math.floor(i / chapterSize) + 1}`,
                chapterDescription: 'Programming concepts and skills',
                lessonIds: chapterLessons.map(l => l.id),
                rationale: 'Sequential grouping based on lesson order'
            });
        }

        return {
            suggestedChapters: chapters,
            overallProgression: 'Sequential learning progression',
            alternativeGroupings: 'AI-powered grouping temporarily unavailable'
        };
    }

    /**
     * Intelligent teacher search based on student requirements
     * @param {string} searchQuery - What the student is looking for
     * @param {object} studentPreferences - Student's learning preferences and constraints
     * @returns {object} - Ranked teacher recommendations with explanations
     */
    async intelligentTeacherSearch(searchQuery, studentPreferences = {}) {
        try {
            // Use the profile controller's data endpoint for consistency
            const profileController = require('../controllers/profileController');
            const mockRes = {
                json: (data) => data,
                status: () => mockRes
            };
            
            const teacherData = await new Promise((resolve, reject) => {
                const req = {};
                const res = {
                    json: (data) => resolve(data),
                    status: (code) => ({ 
                        json: (error) => reject(new Error(error.error || 'API Error'))
                    })
                };
                
                profileController.getTeachersForAISearch(req, res);
            });

            if (!teacherData.success) {
                throw new Error('Failed to fetch teachers data');
            }

            const teachers = teacherData.teachers;

            if (teachers.length === 0) {
                return {
                    query: searchQuery,
                    analysis: 'No searchable teachers found in the system',
                    recommendations: [],
                    searchFilters: studentPreferences,
                    aiProcessedAt: new Date().toISOString()
                };
            }

            // Create AI prompt for intelligent teacher matching
            const prompt = `
You are an expert educational matchmaker with deep understanding of learning styles, teacher expertise, and student-teacher compatibility.

STUDENT SEARCH REQUEST: "${searchQuery}"

STUDENT PREFERENCES:
- Budget: ${studentPreferences.budget || 'Not specified'}
- Preferred Schedule: ${studentPreferences.schedule || 'Flexible'}
- Learning Style: ${studentPreferences.learningStyle || 'Not specified'}
- Experience Level: ${studentPreferences.experienceLevel || 'Beginner'}
- Preferred Language: ${studentPreferences.language || 'English'}
- Session Type: ${studentPreferences.sessionType || 'Individual or Group'}
- Subject Areas: ${studentPreferences.subjects || 'General'}
- Timezone: ${studentPreferences.timezone || 'Not specified'}

AVAILABLE TEACHERS:
${teachers.map((teacher, index) => `
${index + 1}. ${teacher.display_name || teacher.username} (Tier: ${teacher.user_tier}, AscendiaScore: ${teacher.ascendia_score})
   Bio: ${teacher.bio || 'No bio provided'}
   Teaching Bio: ${teacher.teacher_bio || 'No teaching bio'}
   Specializations: ${teacher.specializations.join(', ') || 'None listed'}
   Skills Proficiency: ${teacher.skill_levels.join(', ') || 'Not specified'}
   Experience: ${teacher.years_experience || 0} years, Education: ${teacher.education_level || 'Not specified'}
   Services: ${[teacher.is_mentor && 'Mentoring', teacher.is_counselor && 'Counseling', teacher.is_essay_editor && 'Essay Editing'].filter(Boolean).join(', ')}
   Rates: Z-Credits ${teacher.hourly_rate_z_credits || 0}/hr, USD $${teacher.hourly_rate_usd || 0}/hr
   Rating: ${teacher.average_rating}/5.0 (${teacher.total_reviews} reviews), Sessions: ${teacher.total_sessions}
   Availability: ${teacher.availability_status}, Location: ${teacher.location || 'Not specified'}
   Languages: ${teacher.languages ? teacher.languages.join(', ') : 'Not specified'}
   Group Sessions: ${teacher.can_host_group_sessions ? 'Yes' : 'No'}, Max Students: ${teacher.max_students_per_session}
   Courses Created: ${teacher.created_courses.join(', ') || 'None'}
   Verified: ${teacher.verified_mentor ? 'Yes' : 'No'}
   ID: ${teacher.user_id}
`).join('\n')}

Please analyze and rank the top 10 most suitable teachers for this student. Consider:
- Subject expertise alignment with student needs
- Teaching style compatibility
- Budget and pricing alignment  
- Schedule and availability matching
- Experience level appropriateness
- Cultural and language compatibility
- Student's learning preferences
- Teacher's tier status and credibility
- Past performance and reviews

For each recommended teacher, provide:
1. Teacher ID
2. Match score (1-100)
3. Why this teacher is a great fit
4. Potential learning outcomes
5. Suggested session structure
6. Any concerns or considerations

Respond in JSON format:
{
  "analysis": "Analysis of student's needs and teacher landscape",
  "studentProfile": "Summary of what type of learner this student appears to be",
  "recommendations": [
    {
      "teacherId": "user_id_here",
      "matchScore": 95,
      "compatibilityReasons": [
        "Specializes in student's subject area",
        "Perfect experience level match",
        "Budget-friendly pricing"
      ],
      "learningOutcomes": ["outcome1", "outcome2"],
      "sessionStructure": "Recommended approach to sessions",
      "considerations": "Any potential concerns or notes",
      "whyPerfectMatch": "Detailed explanation of compatibility"
    }
  ],
  "alternativeOptions": "Suggestions for expanding search criteria",
  "learningPathSuggestions": "How the student can progress with these teachers"
}
`;

            const result = await this.rateLimitedGenerate(prompt, 1500); // GENERAL
            
            if (!result.success) {
                if (result.quotaExceeded) {
                    console.log('[GENERAL] Using fallback due to quota exceeded');
                    
                }
                throw result.error;
            }
            
            const text = result.text;
            
            // Parse AI response
            let aiAnalysis;
            try {
                const jsonMatch = text.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    aiAnalysis = JSON.parse(jsonMatch[0]);
                } else {
                    throw new Error('No JSON found in response');
                }
            } catch (parseError) {
                console.error('Error parsing AI teacher search response:', parseError);
                aiAnalysis = this.generateFallbackTeacherAnalysis(searchQuery, teachers, studentPreferences);
            }

            // Enhance recommendations with full teacher data
            const enhancedRecommendations = aiAnalysis.recommendations.map(rec => {
                const teacher = teachers.find(t => t.user_id === rec.teacherId);
                return {
                    ...rec,
                    teacher: teacher || null
                };
            }).filter(rec => rec.teacher); // Remove any invalid teacher IDs

            return {
                query: searchQuery,
                studentProfile: aiAnalysis.studentProfile,
                analysis: aiAnalysis.analysis,
                recommendations: enhancedRecommendations,
                alternativeOptions: aiAnalysis.alternativeOptions,
                learningPathSuggestions: aiAnalysis.learningPathSuggestions,
                searchFilters: studentPreferences,
                totalTeachersAnalyzed: teachers.length,
                aiProcessedAt: new Date().toISOString()
            };

        } catch (error) {
            console.error('Gemini teacher search error:', error);
            
            // Fallback to basic teacher search
            return this.fallbackTeacherSearch(searchQuery, studentPreferences);
        }
    }

    /**
     * Get personalized teacher recommendations based on student's learning history
     * @param {string} studentId - Student's user ID
     * @param {object} preferences - Student's current preferences and goals
     * @returns {object} - Personalized teacher recommendations
     */
    async getPersonalizedTeacherRecommendations(studentId, preferences = {}) {
        try {
            // Get student's learning history and preferences
            const studentHistoryResult = await db.query(`
                SELECT 
                    u.id, u.username, 
                    p.display_name, p.bio, p.user_tier, p.z_index,
                    COALESCE(array_agg(DISTINCT s.name) FILTER (WHERE s.name IS NOT NULL), '{}') as interested_subjects,
                    COALESCE(array_agg(DISTINCT c.title) FILTER (WHERE c.title IS NOT NULL), '{}') as completed_courses,
                    COALESCE(array_agg(DISTINCT sr.session_type) FILTER (WHERE sr.session_type IS NOT NULL), '{}') as past_session_types,
                    COALESCE(AVG(ur.rating), 0) as avg_given_rating
                FROM users u
                LEFT JOIN user_profiles p ON u.id = p.user_id
                LEFT JOIN user_specializations us ON u.id = us.user_id
                LEFT JOIN specializations s ON us.specialization_id = s.id
                LEFT JOIN course_enrollments ce ON u.id = ce.student_id AND ce.completion_status = 'completed'
                LEFT JOIN courses c ON ce.course_id = c.id
                LEFT JOIN session_requests sr ON u.id = sr.requester_id AND sr.status = 'completed'
                LEFT JOIN user_reviews ur ON u.id = ur.reviewer_id
                WHERE u.id = $1
                GROUP BY u.id, u.username, p.display_name, p.bio, p.user_tier, p.z_index
            `, [studentId]);

            const studentProfile = studentHistoryResult.rows[0];
            
            if (!studentProfile) {
                throw new Error('Student profile not found');
            }

            // Get available teachers
            const teachersResult = await db.query(`
                SELECT 
                    u.id as user_id, u.username, u.email,
                    p.display_name, p.bio, p.teacher_bio, p.location, p.timezone,
                    p.is_mentor, p.is_counselor, p.is_essay_editor,
                    p.hourly_rate_z_credits, p.hourly_rate_usd,
                    p.years_experience, p.education_level, p.languages,
                    p.availability_status, p.total_sessions, p.average_rating,
                    p.total_reviews, p.verified_mentor, p.user_tier, p.z_index,
                    COALESCE(array_agg(DISTINCT s.name) FILTER (WHERE s.name IS NOT NULL), '{}') as specializations,
                    COALESCE(array_agg(DISTINCT us.proficiency_level) FILTER (WHERE us.proficiency_level IS NOT NULL), '{}') as skill_levels
                FROM users u
                INNER JOIN user_profiles p ON u.id = p.user_id
                LEFT JOIN user_specializations us ON u.id = us.user_id
                LEFT JOIN specializations s ON us.specialization_id = s.id
                WHERE p.is_searchable_teacher = TRUE 
                    AND p.availability_status IN ('available', 'busy')
                    AND u.id != $1
                GROUP BY u.id, u.username, u.email, p.display_name, p.bio, p.teacher_bio,
                         p.location, p.timezone, p.is_mentor, p.is_counselor, p.is_essay_editor,
                         p.hourly_rate_z_credits, p.hourly_rate_usd, p.years_experience,
                         p.education_level, p.languages, p.availability_status, p.total_sessions,
                         p.average_rating, p.total_reviews, p.verified_mentor, p.user_tier, p.z_index
                ORDER BY p.z_index DESC, p.average_rating DESC
                LIMIT 30
            `, [studentId]);

            const teachers = teachersResult.rows;

            const prompt = `
You are an expert educational advisor creating personalized teacher recommendations based on a student's learning history and goals.

STUDENT PROFILE:
- Name: ${studentProfile.display_name || studentProfile.username}
- Current Tier: ${studentProfile.user_tier || 'bronze'} (AscendiaScore: ${studentProfile.ascendia_score || 0})
- Interests/Subjects: ${studentProfile.interested_subjects.join(', ') || 'None specified'}
- Completed Courses: ${studentProfile.completed_courses.join(', ') || 'None'}
- Past Session Types: ${studentProfile.past_session_types.join(', ') || 'None'}
- Average Rating Given: ${studentProfile.avg_given_rating}/5.0

CURRENT GOALS/PREFERENCES:
- Learning Goals: ${preferences.learningGoals || 'General skill improvement'}
- Subject Focus: ${preferences.subjectFocus || 'Open to suggestions'}
- Session Preferences: ${preferences.sessionPreferences || 'Flexible'}
- Budget Range: ${preferences.budgetRange || 'Moderate'}
- Timeline: ${preferences.timeline || 'Flexible'}

AVAILABLE TEACHERS:
${teachers.map((teacher, index) => `
${index + 1}. ${teacher.display_name || teacher.username} (${teacher.user_tier} tier, AscendiaScore: ${teacher.ascendia_score})
   Specializations: ${teacher.specializations.join(', ')}
   Experience: ${teacher.years_experience} years, ${teacher.education_level}
   Services: ${[teacher.is_mentor && 'Mentoring', teacher.is_counselor && 'Counseling', teacher.is_essay_editor && 'Essay Editing'].filter(Boolean).join(', ')}
   Rating: ${teacher.average_rating}/5.0 (${teacher.total_reviews} reviews)
   Rates: Z-Credits ${teacher.hourly_rate_z_credits}/hr, USD $${teacher.hourly_rate_usd}/hr
   Bio: ${teacher.teacher_bio || teacher.bio || 'No bio available'}
   ID: ${teacher.user_id}
`).join('\n')}

Based on the student's history and goals, recommend the most suitable teachers. Consider:
- Alignment with student's interests and past subjects
- Appropriate challenge level for progression
- Teaching style that matches student's learning patterns
- Budget alignment
- Potential for long-term learning relationship

Provide JSON response:
{
  "studentAnalysis": "Analysis of student's learning profile and needs",
  "recommendations": [
    {
      "teacherId": "user_id",
      "personalizedScore": 95,
      "whyPersonalized": "Why this teacher is perfect for THIS student specifically",
      "progressionPath": "How this teacher can help student progress",
      "synergies": ["specific compatibility factors"],
      "nextSteps": "Recommended first session approach"
    }
  ],
  "learningStrategy": "Overall strategy for student's continued learning",
  "diversityRecommendation": "Suggestions for exploring different teaching styles"
}
`;

            const result = await this.rateLimitedGenerate(prompt, 1500); // GENERAL
            
            if (!result.success) {
                if (result.quotaExceeded) {
                    console.log('[GENERAL] Using fallback due to quota exceeded');
                    
                }
                throw result.error;
            }
            
            const text = result.text;
            
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const aiRecommendations = JSON.parse(jsonMatch[0]);
                
                // Enhance with teacher data
                const enhancedRecommendations = aiRecommendations.recommendations.map(rec => {
                    const teacher = teachers.find(t => t.user_id === rec.teacherId);
                    return {
                        ...rec,
                        teacher: teacher || null
                    };
                }).filter(rec => rec.teacher);

                return {
                    studentId,
                    studentProfile: studentProfile,
                    studentAnalysis: aiRecommendations.studentAnalysis,
                    recommendations: enhancedRecommendations,
                    learningStrategy: aiRecommendations.learningStrategy,
                    diversityRecommendation: aiRecommendations.diversityRecommendation,
                    aiProcessedAt: new Date().toISOString()
                };
            }

            throw new Error('No valid JSON response from AI');

        } catch (error) {
            console.error('Personalized recommendations error:', error);
            return this.fallbackPersonalizedRecommendations(studentId, preferences);
        }
    }

    // Fallback methods for teacher search
    generateFallbackTeacherAnalysis(query, teachers, preferences) {
        const keywords = query.toLowerCase().split(' ');
        const scored = teachers.map(teacher => {
            let score = 0;
            const searchText = `${teacher.bio || ''} ${teacher.teacher_bio || ''} ${teacher.specializations.join(' ')}`.toLowerCase();
            
            keywords.forEach(keyword => {
                if (searchText.includes(keyword)) {
                    score += keyword.length > 3 ? 15 : 8;
                }
            });

            // Boost score based on tier and ratings
            if (teacher.user_tier === 'gold') score += 20;
            else if (teacher.user_tier === 'silver') score += 10;
            
            score += Math.floor(teacher.average_rating * 5);
            score += Math.min(teacher.total_sessions * 2, 20);

            return { teacher, score };
        });

        const recommendations = scored
            .filter(item => item.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 8)
            .map((item, index) => ({
                teacherId: item.teacher.user_id,
                matchScore: Math.max(80 - (index * 8), 40),
                compatibilityReasons: ['Keyword match with your search', 'Good ratings and experience'],
                learningOutcomes: ['Skill improvement in your area of interest'],
                sessionStructure: 'Structured learning sessions',
                considerations: 'Review teacher profile for detailed compatibility',
                whyPerfectMatch: 'Basic compatibility based on search terms and ratings',
                teacher: item.teacher
            }));

        return {
            analysis: 'Performed keyword-based teacher search (AI analysis unavailable)',
            studentProfile: 'General learner seeking instruction',
            recommendations,
            alternativeOptions: 'Try more specific search terms',
            learningPathSuggestions: 'Consider multiple teachers for diverse perspectives'
        };
    }

    async fallbackTeacherSearch(query, preferences) {
        try {
            // Simple database search fallback
            const result = await db.query(`
                SELECT 
                    u.id as user_id, u.username,
                    p.display_name, p.bio, p.teacher_bio, p.average_rating,
                    p.total_reviews, p.user_tier, p.hourly_rate_z_credits,
                    similarity(COALESCE(p.bio, ''), $1) + 
                    similarity(COALESCE(p.teacher_bio, ''), $1) as relevance
                FROM users u
                INNER JOIN user_profiles p ON u.id = p.user_id
                WHERE p.is_searchable_teacher = TRUE
                    AND (p.bio ILIKE $2 OR p.teacher_bio ILIKE $2)
                ORDER BY relevance DESC, p.z_index DESC
                LIMIT 10
            `, [query, `%${query}%`]);

            return {
                query,
                analysis: 'Performed basic database teacher search',
                recommendations: result.rows.map((teacher, index) => ({
                    teacherId: teacher.user_id,
                    matchScore: Math.max(75 - (index * 7), 25),
                    compatibilityReasons: ['Database text similarity match'],
                    teacher
                })),
                alternativeOptions: 'AI analysis temporarily unavailable',
                aiProcessedAt: new Date().toISOString()
            };
        } catch (error) {
            console.error('Fallback teacher search error:', error);
            return {
                query,
                analysis: 'Teacher search temporarily unavailable',
                recommendations: [],
                alternativeOptions: 'Please try again later'
            };
        }
    }

    fallbackPersonalizedRecommendations(studentId, preferences) {
        return {
            studentId,
            studentAnalysis: 'Basic profile analysis performed',
            recommendations: [],
            learningStrategy: 'Explore available teachers and find compatible matches',
            diversityRecommendation: 'Try sessions with different teaching styles',
            aiProcessedAt: new Date().toISOString()
        };
    }
    /**
     * TALENT CRUCIBLE: Advanced mentor discovery with deep compatibility analysis
     * @param {string} studentQuery - Student's learning goals and challenges
     * @param {object} studentProfile - Detailed student background
     * @returns {object} - Deep compatibility analysis with mentors
     */
    async talentCrucibleMentorDiscovery(studentQuery, studentProfile = {}) {
        try {
            // Get comprehensive mentor data with Four Pillars scores
            const mentorsResult = await db.query(`
                SELECT 
                    u.id as user_id, u.username,
                    p.display_name, p.bio, p.teacher_bio, p.location, p.timezone,
                    p.hourly_rate_sparks, p.hourly_rate_usd, p.years_experience,
                    p.education_level, p.languages, p.user_tier, p.ascendia_score,
                    p.pillar_academic, p.pillar_community, p.pillar_mentorship, p.pillar_analytical,
                    p.average_rating, p.total_sessions, p.total_reviews,
                    p.verified_mentor, p.can_host_group_sessions,
                    COALESCE(array_agg(DISTINCT s.name) FILTER (WHERE s.name IS NOT NULL), '{}') as specializations,
                    COALESCE(array_agg(DISTINCT us.proficiency_level) FILTER (WHERE us.proficiency_level IS NOT NULL), '{}') as skill_levels,
                    COALESCE(array_agg(DISTINCT c.title) FILTER (WHERE c.title IS NOT NULL), '{}') as created_courses,
                    -- Social proof metrics
                    (SELECT COUNT(*) FROM connections WHERE user1_id = u.id OR user2_id = u.id) as connection_count,
                    (SELECT COUNT(*) FROM followers WHERE followed_id = u.id) as follower_count,
                    -- Session success metrics
                    (SELECT AVG(rating) FROM reviews WHERE session_id IN 
                        (SELECT id FROM sessions WHERE mentor_id = u.id AND status = 'completed')
                    ) as session_success_rate,
                    -- Recent activity indicators
                    (SELECT MAX(created_at) FROM sessions WHERE mentor_id = u.id) as last_session_date,
                    (SELECT COUNT(*) FROM sessions WHERE mentor_id = u.id AND created_at >= NOW() - INTERVAL '30 days') as recent_sessions
                FROM users u
                INNER JOIN user_profiles p ON u.id = p.user_id
                LEFT JOIN user_specializations us ON u.id = us.user_id
                LEFT JOIN specializations s ON us.specialization_id = s.id
                LEFT JOIN courses c ON u.id = c.teacher_id
                WHERE p.is_searchable_teacher = TRUE 
                    AND p.availability_status IN ('available', 'busy')
                    AND p.is_mentor = TRUE
                GROUP BY u.id, u.username, p.display_name, p.bio, p.teacher_bio,
                         p.location, p.timezone, p.hourly_rate_sparks, p.hourly_rate_usd,
                         p.years_experience, p.education_level, p.languages, p.user_tier,
                         p.ascendia_score, p.pillar_academic, p.pillar_community, 
                         p.pillar_mentorship, p.pillar_analytical, p.average_rating,
                         p.total_sessions, p.total_reviews, p.verified_mentor, p.can_host_group_sessions
                ORDER BY p.ascendia_score DESC, p.pillar_mentorship DESC
                LIMIT 25
            `);

            const mentors = mentorsResult.rows;

            if (mentors.length === 0) {
                return {
                    query: studentQuery,
                    analysis: 'No mentors available in the system',
                    discoveries: [],
                    talentCrucibleInsights: 'Mentor pool currently empty'
                };
            }

            // Create advanced AI prompt for deep compatibility analysis
            const prompt = `
You are the Talent Crucible AI, an advanced mentor-student compatibility engine that uses deep psychological and pedagogical analysis.

STUDENT PROFILE & QUERY:
"${studentQuery}"

Student Background:
- Learning Style: ${studentProfile.learningStyle || 'Not specified'}
- Experience Level: ${studentProfile.experienceLevel || 'Beginner'}
- Goals Timeline: ${studentProfile.timeline || 'Flexible'}
- Challenges Faced: ${studentProfile.challenges || 'Not specified'}
- Motivation Type: ${studentProfile.motivationType || 'Not specified'}
- Preferred Interaction: ${studentProfile.interactionStyle || 'Not specified'}
- Success Metrics: ${studentProfile.successMetrics || 'Not specified'}

AVAILABLE MENTORS (with Four Pillars scoring):
${mentors.map((mentor, index) => `
${index + 1}. ${mentor.display_name || mentor.username} (${mentor.user_tier} - AscendiaScore: ${mentor.ascendia_score})
   Four Pillars: Academic(${mentor.pillar_academic}), Community(${mentor.pillar_community}), Mentorship(${mentor.pillar_mentorship}), Analytical(${mentor.pillar_analytical})
   Bio: ${mentor.bio || 'No bio'}
   Teaching Bio: ${mentor.teacher_bio || 'No teaching bio'}
   Specializations: ${mentor.specializations.join(', ') || 'None listed'}
   Experience: ${mentor.years_experience} years, Education: ${mentor.education_level}
   Social Proof: ${mentor.connection_count} connections, ${mentor.follower_count} followers
   Success Rate: ${mentor.session_success_rate}/5.0 (${mentor.total_sessions} sessions)
   Recent Activity: ${mentor.recent_sessions} sessions last 30 days
   Rates: ${mentor.hourly_rate_sparks} Sparks/hr, $${mentor.hourly_rate_usd}/hr
   Languages: ${mentor.languages || 'Not specified'}
   Group Sessions: ${mentor.can_host_group_sessions ? 'Yes' : 'No'}
   ID: ${mentor.user_id}
`).join('\n')}

Perform deep compatibility analysis considering:
1. Four Pillars alignment with student needs
2. Psychological compatibility indicators
3. Learning style synchronization
4. Mentorship approach matching
5. Growth trajectory optimization
6. Social proof and success patterns
7. Communication style compatibility
8. Challenge-solution alignment

Provide JSON response:
{
  "talentCrucibleAnalysis": "Deep analysis of student needs and mentor landscape",
  "studentArchetype": "Identified student learning archetype and needs",
  "discoveries": [
    {
      "mentorId": "user_id",
      "compatibilityScore": 98,
      "compatibilityType": "Perfect Synergy|Strong Alignment|Complementary Strengths|Growth Catalyst",
      "fourPillarsAlignment": {
        "academic": "How their academic strength aligns with student needs",
        "community": "Community building potential for student",
        "mentorship": "Direct mentorship compatibility analysis",
        "analytical": "Problem-solving approach alignment"
      },
      "psychologicalCompatibility": "Deep personality and learning style match analysis",
      "uniqueValue": "What makes this mentor uniquely valuable for this student",
      "growthTrajectory": "How this mentor can accelerate student's development",
      "potentialChallenges": "Areas that might need attention or adjustment",
      "recommendedApproach": "Specific strategy for initial engagement",
      "successIndicators": ["measurable outcomes this pairing could achieve"]
    }
  ],
  "alternativeStrategies": "Additional approaches if primary matches don't work",
  "talentCrucibleInsights": "Meta-insights about mentorship matching for this student type"
}
`;

            const result = await this.rateLimitedGenerate(prompt, 1500); // GENERAL
            
            if (!result.success) {
                if (result.quotaExceeded) {
                    console.log('[GENERAL] Using fallback due to quota exceeded');
                    
                }
                throw result.error;
            }
            
            const text = result.text;
            
            // Parse AI response
            let talentAnalysis;
            try {
                const jsonMatch = text.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    talentAnalysis = JSON.parse(jsonMatch[0]);
                } else {
                    throw new Error('No JSON found in response');
                }
            } catch (parseError) {
                console.error('Error parsing Talent Crucible response:', parseError);
                talentAnalysis = this.generateFallbackTalentAnalysis(studentQuery, mentors);
            }

            // Enhance discoveries with full mentor data
            const enhancedDiscoveries = talentAnalysis.discoveries.map(discovery => {
                const mentor = mentors.find(m => m.user_id === discovery.mentorId);
                return {
                    ...discovery,
                    mentor: mentor || null
                };
            }).filter(d => d.mentor);

            return {
                query: studentQuery,
                studentArchetype: talentAnalysis.studentArchetype,
                talentCrucibleAnalysis: talentAnalysis.talentCrucibleAnalysis,
                discoveries: enhancedDiscoveries,
                alternativeStrategies: talentAnalysis.alternativeStrategies,
                talentCrucibleInsights: talentAnalysis.talentCrucibleInsights,
                totalMentorsAnalyzed: mentors.length,
                aiProcessedAt: new Date().toISOString()
            };

        } catch (error) {
            console.error('Talent Crucible discovery error:', error);
            return this.fallbackTalentCrucibleSearch(studentQuery, studentProfile);
        }
    }

    /**
     * TALENT CRUCIBLE: Learning pathway optimization with mentor sequencing
     * @param {string} studentId - Student's ID
     * @param {string} learningGoal - Primary learning objective
     * @param {number} timeframeWeeks - Learning timeframe in weeks
     * @returns {object} - Optimized learning pathway with mentor sequence
     */
    async optimizeLearningPathway(studentId, learningGoal, timeframeWeeks = 12) {
        try {
            // Get student's current profile and history
            const studentResult = await db.query(`
                SELECT 
                    u.id, u.username,
                    p.display_name, p.user_tier, p.ascendia_score,
                    p.pillar_academic, p.pillar_community, p.pillar_mentorship, p.pillar_analytical,
                    COALESCE(array_agg(DISTINCT s.name) FILTER (WHERE s.name IS NOT NULL), '{}') as specializations,
                    -- Learning history
                    (SELECT COUNT(*) FROM sessions WHERE student_id = u.id AND status = 'completed') as completed_sessions,
                    (SELECT AVG(rating) FROM reviews WHERE student_id = u.id) as avg_rating_given,
                    (SELECT array_agg(DISTINCT service_type) FROM sessions WHERE student_id = u.id) as tried_services,
                    -- Recent progress
                    (SELECT MAX(created_at) FROM sessions WHERE student_id = u.id) as last_session_date
                FROM users u
                LEFT JOIN user_profiles p ON u.id = p.user_id
                LEFT JOIN user_specializations us ON u.id = us.user_id
                LEFT JOIN specializations s ON us.specialization_id = s.id
                WHERE u.id = $1
                GROUP BY u.id, u.username, p.display_name, p.user_tier, p.ascendia_score,
                         p.pillar_academic, p.pillar_community, p.pillar_mentorship, p.pillar_analytical
            `, [studentId]);

            const student = studentResult.rows[0];
            if (!student) {
                throw new Error('Student not found');
            }

            // Get available mentors with pathway suitability metrics
            const mentorsResult = await db.query(`
                SELECT 
                    u.id as user_id, u.username,
                    p.display_name, p.bio, p.teacher_bio, p.user_tier, p.ascendia_score,
                    p.pillar_academic, p.pillar_community, p.pillar_mentorship, p.pillar_analytical,
                    p.years_experience, p.education_level,
                    p.hourly_rate_sparks, p.average_rating, p.total_sessions,
                    COALESCE(array_agg(DISTINCT s.name) FILTER (WHERE s.name IS NOT NULL), '{}') as specializations,
                    -- Pathway-specific metrics
                    (SELECT COUNT(DISTINCT student_id) FROM sessions WHERE mentor_id = u.id AND status = 'completed') as unique_students_mentored,
                    (SELECT AVG(rating) FROM reviews WHERE session_id IN 
                        (SELECT id FROM sessions WHERE mentor_id = u.id AND status = 'completed')
                    ) as mentoring_success_rate,
                    -- Specialization depth
                    (SELECT COUNT(*) FROM courses WHERE teacher_id = u.id) as courses_created
                FROM users u
                INNER JOIN user_profiles p ON u.id = p.user_id
                LEFT JOIN user_specializations us ON u.id = us.user_id
                LEFT JOIN specializations s ON us.specialization_id = s.id
                WHERE p.is_searchable_teacher = TRUE 
                    AND p.is_mentor = TRUE
                    AND p.availability_status IN ('available', 'busy')
                GROUP BY u.id, u.username, p.display_name, p.bio, p.teacher_bio, p.user_tier,
                         p.ascendia_score, p.pillar_academic, p.pillar_community, 
                         p.pillar_mentorship, p.pillar_analytical, p.years_experience,
                         p.education_level, p.hourly_rate_sparks, p.average_rating, p.total_sessions
                ORDER BY p.pillar_mentorship DESC, p.ascendia_score DESC
                LIMIT 30
            `);

            const mentors = mentorsResult.rows;

            const prompt = `
You are the Talent Crucible Pathway Optimizer, designing optimal learning journeys with strategic mentor sequencing.

STUDENT PROFILE:
- Name: ${student.display_name || student.username}
- Current Tier: ${student.user_tier} (AscendiaScore: ${student.ascendia_score})
- Four Pillars: Academic(${student.pillar_academic || 0}), Community(${student.pillar_community || 0}), Mentorship(${student.pillar_mentorship || 0}), Analytical(${student.pillar_analytical || 0})
- Learning History: ${student.completed_sessions || 0} sessions completed
- Services Tried: ${student.tried_services ? student.tried_services.join(', ') : 'None'}
- Current Specializations: ${student.specializations.join(', ') || 'None'}

LEARNING GOAL: "${learningGoal}"
TIMEFRAME: ${timeframeWeeks} weeks

AVAILABLE MENTORS:
${mentors.map((mentor, index) => `
${index + 1}. ${mentor.display_name || mentor.username} (${mentor.user_tier} - Score: ${mentor.ascendia_score})
   Four Pillars: Academic(${mentor.pillar_academic}), Community(${mentor.pillar_community}), Mentorship(${mentor.pillar_mentorship}), Analytical(${mentor.pillar_analytical})
   Experience: ${mentor.years_experience} years, Mentored: ${mentor.unique_students_mentored} students
   Success Rate: ${mentor.mentoring_success_rate}/5.0, Courses: ${mentor.courses_created}
   Specializations: ${mentor.specializations.join(', ')}
   Rate: ${mentor.hourly_rate_sparks} Sparks/hr
   ID: ${mentor.user_id}
`).join('\n')}

Design an optimal learning pathway considering:
1. Progressive skill building sequence
2. Mentor expertise staging (beginner → intermediate → advanced)
3. Four Pillars development balance
4. Realistic timeframe allocation
5. Cost optimization
6. Motivation maintenance strategies

Provide JSON response:
{
  "pathwayAnalysis": "Analysis of optimal learning progression for this goal",
  "recommendedPhases": [
    {
      "phase": 1,
      "title": "Foundation Phase",
      "duration": "2-3 weeks",
      "objective": "Core skill establishment",
      "recommendedMentor": "user_id",
      "sessionFrequency": "2x per week",
      "focusAreas": ["area1", "area2"],
      "expectedOutcomes": ["outcome1", "outcome2"],
      "pillarsTargeted": ["Academic", "Analytical"],
      "estimatedCost": "100-150 Sparks"
    }
  ],
  "milestoneMarkers": ["Week 2: Basic competency", "Week 6: Intermediate application"],
  "adaptationStrategies": "How to adjust if student progresses faster/slower",
  "successMetrics": "Key indicators of pathway effectiveness",
  "riskMitigation": "Strategies to prevent common failure points"
}
`;

            const result = await this.rateLimitedGenerate(prompt, 1500); // GENERAL
            
            if (!result.success) {
                if (result.quotaExceeded) {
                    console.log('[GENERAL] Using fallback due to quota exceeded');
                    
                }
                throw result.error;
            }
            
            const text = result.text;
            
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const pathwayAnalysis = JSON.parse(jsonMatch[0]);
                
                // Enhance phases with mentor data
                const enhancedPhases = pathwayAnalysis.recommendedPhases.map(phase => {
                    const mentor = mentors.find(m => m.user_id === phase.recommendedMentor);
                    return {
                        ...phase,
                        mentor: mentor || null
                    };
                }).filter(p => p.mentor);

                return {
                    studentId,
                    learningGoal,
                    timeframeWeeks,
                    pathwayAnalysis: pathwayAnalysis.pathwayAnalysis,
                    recommendedPhases: enhancedPhases,
                    milestoneMarkers: pathwayAnalysis.milestoneMarkers,
                    adaptationStrategies: pathwayAnalysis.adaptationStrategies,
                    successMetrics: pathwayAnalysis.successMetrics,
                    riskMitigation: pathwayAnalysis.riskMitigation,
                    totalMentorsConsidered: mentors.length,
                    aiProcessedAt: new Date().toISOString()
                };
            }

            throw new Error('No valid JSON response from pathway optimization');

        } catch (error) {
            console.error('Learning pathway optimization error:', error);
            return this.fallbackPathwayOptimization(studentId, learningGoal, timeframeWeeks);
        }
    }

    /**
     * TALENT CRUCIBLE: Predictive matching based on success patterns
     * @param {string} studentId - Student's ID
     * @returns {object} - Predictive mentor matches based on similar students' success
     */
    async predictiveSuccessMatching(studentId) {
        try {
            // Get student profile and similar students who succeeded
            const analysisResult = await db.query(`
                WITH student_profile AS (
                    SELECT 
                        u.id, p.user_tier, p.ascendia_score,
                        p.pillar_academic, p.pillar_community, p.pillar_mentorship, p.pillar_analytical,
                        COALESCE(array_agg(DISTINCT s.name), '{}') as specializations
                    FROM users u
                    LEFT JOIN user_profiles p ON u.id = p.user_id
                    LEFT JOIN user_specializations us ON u.id = us.user_id
                    LEFT JOIN specializations s ON us.specialization_id = s.id
                    WHERE u.id = $1
                    GROUP BY u.id, p.user_tier, p.ascendia_score, p.pillar_academic, 
                             p.pillar_community, p.pillar_mentorship, p.pillar_analytical
                ),
                similar_students AS (
                    SELECT 
                        u.id, p.user_tier, p.ascendia_score,
                        ABS(p.pillar_academic - sp.pillar_academic) + 
                        ABS(p.pillar_community - sp.pillar_community) +
                        ABS(p.pillar_mentorship - sp.pillar_mentorship) + 
                        ABS(p.pillar_analytical - sp.pillar_analytical) as similarity_score
                    FROM users u
                    JOIN user_profiles p ON u.id = p.user_id
                    CROSS JOIN student_profile sp
                    WHERE u.id != $1
                        AND p.user_tier = sp.user_tier
                        AND ABS(p.ascendia_score - sp.ascendia_score) < 200
                    ORDER BY similarity_score ASC
                    LIMIT 20
                ),
                successful_mentors AS (
                    SELECT 
                        ses.mentor_id,
                        COUNT(*) as successful_sessions,
                        AVG(r.rating) as avg_rating,
                        COUNT(DISTINCT ses.student_id) as unique_students
                    FROM sessions ses
                    JOIN similar_students ss ON ses.student_id = ss.id
                    JOIN reviews r ON ses.id = r.session_id
                    WHERE ses.status = 'completed' AND r.rating >= 4
                    GROUP BY ses.mentor_id
                    HAVING COUNT(*) >= 3
                    ORDER BY avg_rating DESC, successful_sessions DESC
                )
                SELECT 
                    u.id as user_id, u.username,
                    p.display_name, p.bio, p.teacher_bio, p.user_tier, p.ascendia_score,
                    p.pillar_academic, p.pillar_community, p.pillar_mentorship, p.pillar_analytical,
                    p.hourly_rate_sparks, p.average_rating, p.total_sessions,
                    sm.successful_sessions, sm.avg_rating as pattern_rating, sm.unique_students,
                    COALESCE(array_agg(DISTINCT s.name) FILTER (WHERE s.name IS NOT NULL), '{}') as specializations
                FROM successful_mentors sm
                JOIN users u ON sm.mentor_id = u.id
                JOIN user_profiles p ON u.id = p.user_id
                LEFT JOIN user_specializations us ON u.id = us.user_id
                LEFT JOIN specializations s ON us.specialization_id = s.id
                WHERE p.is_searchable_teacher = TRUE AND p.availability_status IN ('available', 'busy')
                GROUP BY u.id, u.username, p.display_name, p.bio, p.teacher_bio, p.user_tier,
                         p.ascendia_score, p.pillar_academic, p.pillar_community, p.pillar_mentorship,
                         p.pillar_analytical, p.hourly_rate_sparks, p.average_rating, p.total_sessions,
                         sm.successful_sessions, sm.avg_rating, sm.unique_students
                ORDER BY sm.avg_rating DESC, sm.successful_sessions DESC
                LIMIT 15
            `, [studentId]);

            const successfulMentors = analysisResult.rows;

            if (successfulMentors.length === 0) {
                return {
                    studentId,
                    analysis: 'No predictive success patterns found',
                    predictions: [],
                    confidence: 'Low'
                };
            }

            const prompt = `
You are the Talent Crucible Predictive Engine, analyzing success patterns to predict optimal mentor matches.

STUDENT ID: ${studentId}

MENTORS WITH PROVEN SUCCESS PATTERNS FOR SIMILAR STUDENTS:
${successfulMentors.map((mentor, index) => `
${index + 1}. ${mentor.display_name || mentor.username} (${mentor.user_tier} - Score: ${mentor.ascendia_score})
   Four Pillars: Academic(${mentor.pillar_academic}), Community(${mentor.pillar_community}), Mentorship(${mentor.pillar_mentorship}), Analytical(${mentor.pillar_analytical})
   Success Pattern: ${mentor.successful_sessions} successful sessions with similar students
   Pattern Rating: ${mentor.pattern_rating}/5.0 with ${mentor.unique_students} similar students
   Overall: ${mentor.average_rating}/5.0 (${mentor.total_sessions} total sessions)
   Specializations: ${mentor.specializations.join(', ')}
   Rate: ${mentor.hourly_rate_sparks} Sparks/hr
   ID: ${mentor.user_id}
`).join('\n')}

Analyze these success patterns and predict compatibility. Consider:
1. Pattern strength and consistency
2. Student archetype alignment
3. Success trajectory indicators
4. Risk assessment for each match
5. Confidence levels based on data strength

Provide JSON response:
{
  "predictiveAnalysis": "Analysis of success patterns and predictive indicators",
  "confidenceLevel": "High|Medium|Low",
  "predictions": [
    {
      "mentorId": "user_id",
      "successProbability": 92,
      "patternStrength": "Strong|Medium|Emerging",
      "predictiveFactors": ["factor1", "factor2"],
      "expectedOutcomes": ["outcome1", "outcome2"],
      "riskFactors": ["risk1", "risk2"],
      "recommendedStrategy": "Specific approach based on success patterns"
    }
  ],
  "patternInsights": "Meta-insights about success patterns for this student type",
  "alternativeApproaches": "Backup strategies if primary predictions don't materialize"
}
`;

            const result = await this.rateLimitedGenerate(prompt, 1500); // GENERAL
            
            if (!result.success) {
                if (result.quotaExceeded) {
                    console.log('[GENERAL] Using fallback due to quota exceeded');
                    
                }
                throw result.error;
            }
            
            const text = result.text;
            
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const predictiveAnalysis = JSON.parse(jsonMatch[0]);
                
                const enhancedPredictions = predictiveAnalysis.predictions.map(pred => {
                    const mentor = successfulMentors.find(m => m.user_id === pred.mentorId);
                    return {
                        ...pred,
                        mentor: mentor || null
                    };
                }).filter(p => p.mentor);

                return {
                    studentId,
                    predictiveAnalysis: predictiveAnalysis.predictiveAnalysis,
                    confidenceLevel: predictiveAnalysis.confidenceLevel,
                    predictions: enhancedPredictions,
                    patternInsights: predictiveAnalysis.patternInsights,
                    alternativeApproaches: predictiveAnalysis.alternativeApproaches,
                    dataPointsAnalyzed: successfulMentors.length,
                    aiProcessedAt: new Date().toISOString()
                };
            }

            throw new Error('No valid JSON response from predictive matching');

        } catch (error) {
            console.error('Predictive success matching error:', error);
            return this.fallbackPredictiveMatching(studentId);
        }
    }

    // Fallback methods for Talent Crucible features
    generateFallbackTalentAnalysis(query, mentors) {
        const topMentors = mentors
            .sort((a, b) => (b.pillar_mentorship + b.ascendia_score) - (a.pillar_mentorship + a.ascendia_score))
            .slice(0, 5);

        const discoveries = topMentors.map((mentor, index) => ({
            mentorId: mentor.user_id,
            compatibilityScore: Math.max(85 - (index * 5), 65),
            compatibilityType: index === 0 ? 'Strong Alignment' : 'Complementary Strengths',
            fourPillarsAlignment: {
                academic: `Academic strength: ${mentor.pillar_academic}`,
                community: `Community engagement: ${mentor.pillar_community}`,
                mentorship: `Mentorship expertise: ${mentor.pillar_mentorship}`,
                analytical: `Analytical skills: ${mentor.pillar_analytical}`
            },
            psychologicalCompatibility: 'Basic compatibility assessment (full AI analysis unavailable)',
            uniqueValue: `Tier ${mentor.user_tier} mentor with ${mentor.years_experience} years experience`,
            growthTrajectory: 'Structured skill development approach',
            potentialChallenges: 'Review detailed compatibility after initial session',
            recommendedApproach: 'Start with introductory session to assess fit',
            successIndicators: ['Improved understanding of subject matter'],
            mentor: mentor
        }));

        return {
            talentCrucibleAnalysis: 'Basic mentor ranking performed (full AI analysis unavailable)',
            studentArchetype: 'General learner seeking mentorship',
            discoveries,
            alternativeStrategies: 'Try sessions with different mentors to find best fit',
            talentCrucibleInsights: 'AI-powered deep analysis temporarily unavailable'
        };
    }

    fallbackTalentCrucibleSearch(query, profile) {
        return {
            query,
            talentCrucibleAnalysis: 'Talent Crucible analysis temporarily unavailable',
            discoveries: [],
            alternativeStrategies: 'Try basic mentor search',
            talentCrucibleInsights: 'Advanced matching features temporarily unavailable',
            aiProcessedAt: new Date().toISOString()
        };
    }

    fallbackPathwayOptimization(studentId, goal, weeks) {
        return {
            studentId,
            learningGoal: goal,
            timeframeWeeks: weeks,
            pathwayAnalysis: 'Pathway optimization temporarily unavailable',
            recommendedPhases: [],
            milestoneMarkers: [`Week ${Math.floor(weeks/2)}: Mid-point assessment`],
            adaptationStrategies: 'Adjust based on progress',
            successMetrics: 'Track session completion and satisfaction',
            riskMitigation: 'Regular progress reviews',
            aiProcessedAt: new Date().toISOString()
        };
    }

    fallbackPredictiveMatching(studentId) {
        return {
            studentId,
            predictiveAnalysis: 'Predictive matching temporarily unavailable',
            confidenceLevel: 'Low',
            predictions: [],
            patternInsights: 'Success pattern analysis unavailable',
            alternativeApproaches: 'Try general mentor search',
            aiProcessedAt: new Date().toISOString()
        };
    }
    
    /**
     * Generate response using a specialized agent
     * @param {string} agentType - Type of agent ('editSuggestionAgent', 'feedbackAgent', 'commentAgent')
     * @param {string} userMessage - The user's message/content
     * @param {object} context - Additional context (selectedText, essayType, etc.)
     * @returns {Promise<object>} - Agent-specific response
     */
    async generateAgentResponse(agentType, userMessage, context = {}) {
        const agent = this.agents[agentType];
        if (!agent) {
            throw new Error(`Unknown agent type: ${agentType}`);
        }
        
        // Build context-aware prompt
        let fullPrompt = `${agent.systemPrompt}\n\n`;
        
        if (context.selectedText) {
            fullPrompt += `SELECTED TEXT: "${context.selectedText}"\n\n`;
        }
        
        if (context.fullEssay) {
            fullPrompt += `FULL ESSAY CONTEXT:\n${context.fullEssay}\n\n`;
        }
        
        if (context.essayType) {
            fullPrompt += `ESSAY TYPE: ${context.essayType}\n\n`;
        }
        
        fullPrompt += `USER REQUEST: ${userMessage}`;
        
        console.log(`[GEMINI_AGENT] Using ${agent.name} for request`);
        
        try {
            const result = await this.rateLimitedGenerate(fullPrompt, 1200);
            
            return {
                success: result.success,
                response: result.text || result.fallbackResponse,
                agentUsed: agent.name,
                agentType: agentType,
                fromFallback: result.fromFallback || false
            };
            
        } catch (error) {
            console.error(`[GEMINI_AGENT] Error with ${agent.name}:`, error);
            throw error;
        }
    }
}

module.exports = new GeminiAIService();