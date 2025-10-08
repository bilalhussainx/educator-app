/**
 * Enhanced AI Comment Service with Memory, Learning, and Custom Prompts
 *
 * This service generates comprehensive AI comments (20+) with the following features:
 * - Memory: Remembers previous comments and avoids repetition
 * - Learning: Tracks user actions and adapts suggestions
 * - Custom Prompts: Supports user-defined coaching styles
 * - Coaching Templates: Pre-built expert coaching modes
 * - Progressive Generation: Can generate more comments on demand
 */

const axios = require('axios');
const crypto = require('crypto');
const db = require('../../db');

class EnhancedAICommentService {
    constructor() {
        this.claudeApiKey = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;
        this.claudeBaseUrl = 'https://api.anthropic.com/v1/messages';

        // Rate limiting
        this.rateLimiter = {
            lastRequestTime: 0,
            minDelay: 2000, // 2 seconds between requests
            requestCount: 0,
            maxRequestsPerMinute: 30,
            windowStart: Date.now()
        };

        console.log(`Enhanced AI Comment Service initialized with ${this.claudeApiKey ? 'Claude API' : 'no API key'}`);
    }

    /**
     * Generate comprehensive AI comments for a document
     */
    async generateComments(config) {
        const {
            userId,
            sessionId = null,
            documentContent,
            documentType = 'essay',
            targetComments = 50,
            promptTemplate = 'Essay Coach - Comprehensive',
            customPrompt = null,
            rememberPrevious = true,
            excludeCommentIds = []
        } = config;

        const startTime = Date.now();

        try {
            // Create document hash for tracking
            const documentHash = this.createDocumentHash(documentContent);

            // Get coaching prompt template
            const coachingPrompt = await this.getCoachingPrompt(promptTemplate);

            // Get previous comments for this document (if memory enabled)
            const previousComments = rememberPrevious
                ? await this.getPreviousComments(userId, documentHash, excludeCommentIds)
                : [];

            // Get learned patterns for this user
            const userPatterns = await this.getUserLearningPatterns(userId);

            // Build the complete prompt
            const fullPrompt = this.buildEnhancedPrompt({
                documentContent,
                documentType,
                targetComments,
                coachingPrompt,
                customPrompt,
                previousComments,
                userPatterns
            });

            console.log(`Generating ${targetComments} comments for ${documentType} (user: ${userId})...`);

            // Call Claude API
            const claudeResponse = await this.callClaudeAPI(fullPrompt, targetComments);

            // Parse and validate comments
            const comments = this.parseCommentsFromResponse(claudeResponse, documentContent);

            console.log(`Successfully generated ${comments.length} comments`);

            // Save comments to database
            const savedComments = await this.saveComments({
                userId,
                sessionId,
                documentType,
                documentContent,
                documentHash,
                comments,
                promptTemplate: coachingPrompt?.id,
                customPrompt,
                generationTimeMs: Date.now() - startTime
            });

            // Update usage statistics
            if (coachingPrompt?.id) {
                await this.updatePromptUsageStats(coachingPrompt.id);
            }

            return {
                success: true,
                comments: savedComments,
                metadata: {
                    totalComments: savedComments.length,
                    documentType,
                    promptUsed: promptTemplate,
                    generationTimeMs: Date.now() - startTime,
                    previousCommentsCount: previousComments.length,
                    learnedPatternsApplied: userPatterns.length
                }
            };

        } catch (error) {
            console.error('Error generating comments:', error);

            // Fall back to basic comment generation
            return this.generateFallbackComments(documentContent, documentType, targetComments);
        }
    }

    /**
     * Build enhanced prompt with memory and learning
     */
    buildEnhancedPrompt(config) {
        const {
            documentContent,
            documentType,
            targetComments,
            coachingPrompt,
            customPrompt,
            previousComments,
            userPatterns
        } = config;

        // Base system prompt
        let systemPrompt = coachingPrompt?.system_prompt ||
            'You are an expert writing coach who provides detailed, actionable feedback.';

        // Add learning patterns to system prompt
        if (userPatterns.length > 0) {
            systemPrompt += '\n\nLEARNED USER PREFERENCES:\n';
            userPatterns.forEach(pattern => {
                systemPrompt += `- ${pattern.pattern_type}: ${JSON.stringify(pattern.pattern_data)}\n`;
            });
            systemPrompt += '\nAdjust your feedback based on these learned preferences.';
        }

        // Build user prompt from template
        let userPrompt = customPrompt || coachingPrompt?.user_prompt_template ||
            'Analyze this document and provide detailed feedback.';

        // Replace template variables
        userPrompt = userPrompt
            .replace('{documentType}', documentType)
            .replace('{targetComments}', targetComments)
            .replace('{content}', documentContent);

        // Add memory context (avoid repeating previous comments)
        if (previousComments.length > 0) {
            userPrompt += '\n\nPREVIOUS COMMENTS TO AVOID REPEATING:\n';
            previousComments.slice(0, 10).forEach((comment, idx) => {
                userPrompt += `${idx + 1}. "${comment.highlighted_text}" - ${comment.message}\n`;
            });
            userPrompt += '\nGenerate NEW, DIFFERENT comments. Do not repeat these suggestions.';
        }

        // Add strict JSON format requirement
        userPrompt += '\n\nCRITICAL: You MUST respond with ONLY valid JSON in this exact format:\n';
        userPrompt += JSON.stringify({
            success: true,
            comments: [{
                highlightedText: "exact text from document",
                startOffset: 0,
                endOffset: 50,
                commentType: "word_choice",
                severity: "moderate",
                category: "Word Choice",
                message: "Brief explanation",
                suggestion: "Specific improvement",
                explanation: "Why this helps",
                replacementText: "Exact replacement",
                alternatives: ["option 1", "option 2", "option 3"]
            }]
        }, null, 2);

        userPrompt += '\n\nStart your response with "{" and provide at least ' + targetComments + ' comments.';
        userPrompt += '\nIMPORTANT: Analyze the ENTIRE document from beginning to end, not just the opening.';

        const fullPrompt = `${systemPrompt}\n\n---\n\n${userPrompt}`;

        console.log(`Built prompt (length: ${fullPrompt.length} chars)`);

        return fullPrompt;
    }

    /**
     * Call Claude API with rate limiting
     */
    async callClaudeAPI(prompt, targetComments) {
        if (!this.claudeApiKey) {
            throw new Error('Claude API key not configured');
        }

        // Wait for rate limit
        await this.waitForRateLimit();

        try {
            const response = await axios.post(this.claudeBaseUrl, {
                model: 'claude-3-5-sonnet-20241022',
                max_tokens: 8000, // Increased for more comments
                temperature: 0.7,
                messages: [{
                    role: 'user',
                    content: prompt
                }]
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': this.claudeApiKey,
                    'anthropic-version': '2023-06-01'
                },
                timeout: 60000 // 60 second timeout for large responses
            });

            this.rateLimiter.requestCount++;
            return response.data.content[0].text;

        } catch (error) {
            console.error('Claude API error:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Parse comments from Claude's response
     */
    parseCommentsFromResponse(responseText, documentContent) {
        try {
            // Clean response
            let cleaned = responseText.trim();

            // Remove markdown code blocks
            cleaned = cleaned.replace(/```json\n?/g, '').replace(/```\n?/g, '');

            // Find JSON object
            const jsonStart = cleaned.indexOf('{');
            const jsonEnd = cleaned.lastIndexOf('}') + 1;

            if (jsonStart === -1 || jsonEnd === 0) {
                throw new Error('No JSON found in response');
            }

            const jsonString = cleaned.substring(jsonStart, jsonEnd);
            const parsed = JSON.parse(jsonString);

            if (!parsed.comments || !Array.isArray(parsed.comments)) {
                throw new Error('Invalid comments structure');
            }

            // Track used text positions to handle duplicate text
            const usedPositions = new Set();

            // Validate and enhance each comment
            return parsed.comments
                .filter(c => c.highlightedText && c.message)
                .map((c, idx) => {
                    // Calculate accurate offsets by finding the text in the document
                    let startOffset = 0;
                    let endOffset = 0;

                    if (c.highlightedText) {
                        // Try to use Claude's provided offsets first
                        if (typeof c.startOffset === 'number' && typeof c.endOffset === 'number') {
                            const textAtOffset = documentContent.substring(c.startOffset, c.endOffset);
                            if (textAtOffset === c.highlightedText && !usedPositions.has(c.startOffset)) {
                                startOffset = c.startOffset;
                                endOffset = c.endOffset;
                                usedPositions.add(startOffset);
                            }
                        }

                        // If Claude's offsets don't work, search for the text
                        if (startOffset === 0 && endOffset === 0) {
                            // Find all occurrences of this text
                            let searchPos = 0;
                            let foundPos = -1;

                            while (searchPos < documentContent.length) {
                                const pos = documentContent.indexOf(c.highlightedText, searchPos);
                                if (pos === -1) break;

                                // Use this position if it hasn't been used yet
                                if (!usedPositions.has(pos)) {
                                    foundPos = pos;
                                    break;
                                }

                                searchPos = pos + 1;
                            }

                            if (foundPos !== -1) {
                                startOffset = foundPos;
                                endOffset = foundPos + c.highlightedText.length;
                                usedPositions.add(startOffset);
                            } else {
                                // Fallback: use first occurrence even if it's used
                                const firstPos = documentContent.indexOf(c.highlightedText);
                                if (firstPos !== -1) {
                                    startOffset = firstPos;
                                    endOffset = firstPos + c.highlightedText.length;
                                } else {
                                    // Text not found, skip this comment
                                    console.warn(`Could not find highlighted text: "${c.highlightedText.substring(0, 50)}..."`);
                                    return null;
                                }
                            }
                        }
                    }

                    return {
                        id: `comment_${Date.now()}_${idx}`,
                        highlightedText: c.highlightedText || '',
                        startOffset: Math.max(0, startOffset),
                        endOffset: Math.min(documentContent.length, endOffset),
                        commentType: c.commentType || 'suggestion',
                        severity: c.severity || 'moderate',
                        category: c.category || 'General',
                        message: c.message || 'Consider improving this section',
                        suggestion: c.suggestion || '',
                        explanation: c.explanation || '',
                        replacementText: c.replacementText || '',
                        alternatives: c.alternatives || [],
                        confidence: c.confidence || 0.85,
                        timestamp: new Date()
                    };
                })
                .filter(c => c !== null); // Remove null comments (where text wasn't found)

        } catch (error) {
            console.error('Error parsing comments:', error);
            throw error;
        }
    }

    /**
     * Validate a single comment (basic validation before processing)
     */
    validateComment(comment, documentContent) {
        // Basic validation - detailed offset calculation happens in parseCommentsFromResponse
        if (!comment.highlightedText || !comment.message) {
            return false;
        }

        // Check if the highlighted text exists in the document
        if (documentContent.indexOf(comment.highlightedText) === -1) {
            console.warn(`Highlighted text not found in document: "${comment.highlightedText.substring(0, 50)}..."`);
            return false;
        }

        return true;
    }

    /**
     * Save comments to database
     */
    async saveComments(config) {
        const {
            userId,
            sessionId,
            documentType,
            documentContent,
            documentHash,
            comments,
            promptTemplate,
            customPrompt,
            generationTimeMs
        } = config;

        const client = await db.connect();

        try {
            await client.query('BEGIN');

            // Create comment session record
            const sessionResult = await client.query(
                `INSERT INTO ai_comment_sessions
                (user_id, session_id, document_type, document_length, prompt_template_id, custom_prompt, comments_generated, generation_time_ms, api_used)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING id`,
                [userId, sessionId, documentType, documentContent.length, promptTemplate, customPrompt, comments.length, generationTimeMs, 'claude']
            );

            const commentSessionId = sessionResult.rows[0].id;

            // Insert each comment
            const savedComments = [];
            for (const comment of comments) {
                const result = await client.query(
                    `INSERT INTO ai_comments
                    (session_id, user_id, document_type, document_content, document_hash, comment_type, severity, category,
                     highlighted_text, start_offset, end_offset, message, suggestion, explanation, replacement_text, alternatives,
                     confidence, prompt_template, custom_prompt)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
                    RETURNING *`,
                    [
                        commentSessionId, userId, documentType, documentContent, documentHash,
                        comment.commentType, comment.severity, comment.category,
                        comment.highlightedText, comment.startOffset, comment.endOffset,
                        comment.message, comment.suggestion, comment.explanation,
                        comment.replacementText, JSON.stringify(comment.alternatives),
                        comment.confidence, promptTemplate, customPrompt
                    ]
                );

                savedComments.push(result.rows[0]);
            }

            await client.query('COMMIT');

            return savedComments;

        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Error saving comments:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Record user feedback on a comment
     */
    async recordFeedback(userId, commentId, action, userModification = null, timeToAction = null) {
        try {
            // Insert feedback
            await db.query(
                `INSERT INTO ai_comment_feedback (comment_id, user_id, action, user_modification, time_to_action)
                VALUES ($1, $2, $3, $4, $5)`,
                [commentId, userId, action, userModification, timeToAction]
            );

            // Update learning patterns
            await this.updateLearningPatterns(userId, commentId, action, userModification);

            console.log(`Recorded feedback: ${action} for comment ${commentId}`);

        } catch (error) {
            console.error('Error recording feedback:', error);
        }
    }

    /**
     * Update learning patterns based on user feedback
     */
    async updateLearningPatterns(userId, commentId, action, userModification) {
        try {
            // Get comment details
            const commentResult = await db.query(
                'SELECT * FROM ai_comments WHERE id = $1',
                [commentId]
            );

            if (commentResult.rows.length === 0) return;

            const comment = commentResult.rows[0];

            // Determine pattern type and key
            let patternType, patternKey, patternData;

            if (action === 'applied') {
                patternType = 'accepted_suggestion';
                patternKey = `${comment.comment_type}_accepted`;
                patternData = {
                    commentType: comment.comment_type,
                    category: comment.category,
                    originalText: comment.highlighted_text,
                    appliedSuggestion: comment.replacement_text
                };
            } else if (action === 'dismissed') {
                patternType = 'rejected_suggestion';
                patternKey = `${comment.comment_type}_rejected`;
                patternData = {
                    commentType: comment.comment_type,
                    category: comment.category,
                    reason: 'dismissed'
                };
            } else if (action === 'modified' && userModification) {
                patternType = 'modification_pattern';
                patternKey = `${comment.comment_type}_modified`;
                patternData = {
                    commentType: comment.comment_type,
                    originalSuggestion: comment.replacement_text,
                    userVersion: userModification
                };
            }

            if (!patternType) return;

            // Upsert learning pattern
            await db.query(
                `INSERT INTO ai_learning_patterns (user_id, pattern_type, pattern_key, pattern_data, occurrences, last_seen)
                VALUES ($1, $2, $3, $4, 1, CURRENT_TIMESTAMP)
                ON CONFLICT (user_id, pattern_key)
                DO UPDATE SET
                    occurrences = ai_learning_patterns.occurrences + 1,
                    last_seen = CURRENT_TIMESTAMP,
                    confidence_score = LEAST(1.0, ai_learning_patterns.confidence_score + 0.05)`,
                [userId, patternType, patternKey, JSON.stringify(patternData)]
            );

            console.log(`Updated learning pattern: ${patternKey}`);

        } catch (error) {
            console.error('Error updating learning patterns:', error);
        }
    }

    /**
     * Get previous comments for a document
     */
    async getPreviousComments(userId, documentHash, excludeIds = []) {
        try {
            const result = await db.query(
                `SELECT * FROM ai_comments
                WHERE user_id = $1 AND document_hash = $2
                AND id NOT IN (${excludeIds.length > 0 ? excludeIds.join(',') : '0'})
                ORDER BY created_at DESC
                LIMIT 20`,
                [userId, documentHash]
            );

            return result.rows;
        } catch (error) {
            console.error('Error getting previous comments:', error);
            return [];
        }
    }

    /**
     * Get user's learned patterns
     */
    async getUserLearningPatterns(userId) {
        try {
            const result = await db.query(
                `SELECT * FROM ai_learning_patterns
                WHERE user_id = $1 AND confidence_score > 0.6
                ORDER BY confidence_score DESC, occurrences DESC
                LIMIT 10`,
                [userId]
            );

            return result.rows;
        } catch (error) {
            console.error('Error getting learning patterns:', error);
            return [];
        }
    }

    /**
     * Get coaching prompt template
     */
    async getCoachingPrompt(promptName) {
        try {
            const result = await db.query(
                'SELECT * FROM ai_coaching_prompts WHERE name = $1 AND is_active = true',
                [promptName]
            );

            return result.rows[0] || null;
        } catch (error) {
            console.error('Error getting coaching prompt:', error);
            return null;
        }
    }

    /**
     * Get all available coaching prompts
     */
    async getAvailablePrompts(category = null) {
        try {
            const query = category
                ? 'SELECT * FROM ai_coaching_prompts WHERE is_active = true AND category = $1 ORDER BY name'
                : 'SELECT * FROM ai_coaching_prompts WHERE is_active = true ORDER BY category, name';

            const params = category ? [category] : [];
            const result = await db.query(query, params);

            return result.rows;
        } catch (error) {
            console.error('Error getting available prompts:', error);
            return [];
        }
    }

    /**
     * Update prompt usage statistics
     */
    async updatePromptUsageStats(promptId) {
        try {
            await db.query(
                'UPDATE ai_coaching_prompts SET usage_count = usage_count + 1 WHERE id = $1',
                [promptId]
            );
        } catch (error) {
            console.error('Error updating prompt stats:', error);
        }
    }

    /**
     * Create document hash for tracking
     */
    createDocumentHash(content) {
        return crypto.createHash('sha256').update(content).digest('hex');
    }

    /**
     * Wait for rate limit
     */
    async waitForRateLimit() {
        const now = Date.now();

        // Reset window if minute has passed
        if (now - this.rateLimiter.windowStart > 60000) {
            this.rateLimiter.requestCount = 0;
            this.rateLimiter.windowStart = now;
        }

        // Check requests per minute
        if (this.rateLimiter.requestCount >= this.rateLimiter.maxRequestsPerMinute) {
            const waitTime = 60000 - (now - this.rateLimiter.windowStart);
            console.log(`Rate limit reached. Waiting ${waitTime}ms...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }

        // Check minimum delay
        const timeSinceLastRequest = now - this.rateLimiter.lastRequestTime;
        if (timeSinceLastRequest < this.rateLimiter.minDelay) {
            const delay = this.rateLimiter.minDelay - timeSinceLastRequest;
            await new Promise(resolve => setTimeout(resolve, delay));
        }

        this.rateLimiter.lastRequestTime = Date.now();
    }

    /**
     * Generate fallback comments when Claude API fails
     */
    async generateFallbackComments(documentContent, documentType, targetComments) {
        console.log('Generating fallback comments...');

        // Generate basic comments based on document analysis
        const generatedComments = [];
        const sentences = documentContent.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const paragraphs = documentContent.split(/\n\n+/).filter(p => p.trim().length > 0);

        // Generate structure comments
        if (paragraphs.length < 3) {
            generatedComments.push({
                highlightedText: documentContent.substring(0, 50),
                startOffset: 0,
                endOffset: Math.min(50, documentContent.length),
                commentType: 'structural_coherence',
                severity: 'moderate',
                category: 'Structure',
                message: 'Consider adding more paragraph breaks to improve document structure',
                suggestion: 'Break your content into clear paragraphs with distinct ideas',
                explanation: 'Well-structured documents are easier to read and understand',
                replacementText: '',
                alternatives: [],
                confidence: 0.75
            });
        }

        // Generate comments for each paragraph
        paragraphs.forEach((para, idx) => {
            if (para.length > 500) {
                const offset = documentContent.indexOf(para);
                generatedComments.push({
                    highlightedText: para.substring(0, 100),
                    startOffset: offset,
                    endOffset: Math.min(offset + 100, documentContent.length),
                    commentType: 'stylistic_craft',
                    severity: 'minor',
                    category: 'Clarity',
                    message: 'This paragraph might be too long',
                    suggestion: 'Consider breaking this into smaller paragraphs for better readability',
                    explanation: 'Shorter paragraphs help readers digest information more easily',
                    replacementText: '',
                    alternatives: [],
                    confidence: 0.70
                });
            }
        });

        // Add general improvement suggestions
        generatedComments.push({
            highlightedText: documentContent.substring(0, 50),
            startOffset: 0,
            endOffset: Math.min(50, documentContent.length),
            commentType: 'thematic_insight',
            severity: 'moderate',
            category: 'Content Development',
            message: 'AI comment generation is in fallback mode',
            suggestion: 'For comprehensive AI feedback with 20+ comments, configure the Claude API key in your environment variables',
            explanation: 'The enhanced AI comment system requires Claude API access for full functionality',
            replacementText: '',
            alternatives: [],
            confidence: 1.0
        });

        // Ensure we have at least a few comments
        const targetCount = Math.min(targetComments, 10);
        while (generatedComments.length < targetCount && sentences.length > generatedComments.length) {
            const sentenceIdx = generatedComments.length;
            const sentence = sentences[sentenceIdx];
            const offset = documentContent.indexOf(sentence);

            generatedComments.push({
                highlightedText: sentence.trim(),
                startOffset: offset,
                endOffset: offset + sentence.length,
                commentType: 'suggestion',
                severity: 'minor',
                category: 'Style',
                message: 'Review this sentence for clarity',
                suggestion: 'Ensure this sentence conveys your intended meaning clearly',
                explanation: 'Clear, concise sentences improve overall writing quality',
                replacementText: '',
                alternatives: [],
                confidence: 0.65
            });
        }

        const finalComments = generatedComments.slice(0, targetCount).map((comment, idx) => ({
            ...comment,
            id: `fallback_${Date.now()}_${idx}`
        }));

        return {
            success: true,
            comments: finalComments,
            metadata: {
                totalComments: finalComments.length,
                fallbackMode: true,
                documentType,
                generationTimeMs: 50,
                message: 'Using fallback comment generation. Configure Claude API for enhanced features.'
            }
        };
    }
}

module.exports = new EnhancedAICommentService();
