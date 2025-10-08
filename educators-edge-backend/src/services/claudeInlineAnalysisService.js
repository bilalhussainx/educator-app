/**
 * Claude-powered Inline Analysis Service
 * Generates dense, high-quality inline comments using Claude API
 */

const axios = require('axios');

class ClaudeInlineAnalysisService {
    constructor() {
        this.claudeApiKey = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;
        this.claudeBaseUrl = 'https://api.anthropic.com/v1/messages';

        if (!this.claudeApiKey) {
            console.warn('Claude API key not found. Inline analysis will use fallback mode.');
        }

        // Rate limiting for Claude API - Conservative approach
        this.rateLimiter = {
            lastRequestTime: 0,
            minDelay: 3000, // 3 seconds between requests (reasonable for Claude API)
            maxRetries: 2,
            consecutiveErrors: 0,
            maxConsecutiveErrors: 3,
            requestCount: 0,
            maxRequestsPerMinute: 20, // More reasonable - 20 requests per minute max
            windowStart: Date.now()
        };

        console.log(`Claude Inline Analysis Service initialized with ${this.claudeApiKey ? 'Claude API' : 'fallback mode'}`);
    }

    /**
     * Generate dense inline comments using Claude
     */
    async generateInlineComments(documentContent, config = {}) {
        const {
            documentType = 'college_essay',
            analysisDepth = 'dense',
            focusAreas = ['structure', 'clarity', 'style', 'engagement'],
            userLevel = 'intermediate'
        } = config;

        try {
            if (!this.claudeApiKey) {
                console.warn('Claude API key not found - using sophisticated fallback comments');
                const fallbackResult = this.generateFallbackComments(documentContent, analysisDepth);
                return {
                    ...fallbackResult,
                    analysisMetadata: {
                        ...fallbackResult.analysisMetadata,
                        usingFallback: true,
                        reason: 'Claude API key not configured'
                    }
                };
            }

            await this.waitForRateLimit();

            const prompt = this.buildInlineAnalysisPrompt(documentContent, {
                documentType,
                analysisDepth,
                focusAreas,
                userLevel
            });

            console.log('Sending inline analysis request to Claude API...');

            let analysisResult;
            let retryCount = 0;
            const maxRetries = 2;

            while (retryCount <= maxRetries) {
                const response = await this.makeClaudeAPIRequest(prompt);
                analysisResult = this.parseClaudeResponse(response.content);

                if (analysisResult.success) {
                    break; // Success, exit retry loop
                }

                // If Claude returned a conversational response, try with a more explicit prompt
                if (analysisResult.error && analysisResult.error.includes('conversational response') && retryCount < maxRetries) {
                    console.log(`Retry ${retryCount + 1}: Claude returned conversational response, trying with more explicit JSON prompt...`);

                    // Create a more explicit JSON-only prompt
                    const explicitPrompt = this.buildExplicitJSONPrompt(documentContent, {
                        documentType,
                        analysisDepth,
                        focusAreas,
                        userLevel
                    });

                    retryCount++;
                    prompt = explicitPrompt; // Use the more explicit prompt for retry
                    continue;
                }

                // If it's a different error or we've exhausted retries, break
                break;
            }

            if (!analysisResult.success) {
                throw new Error(`Failed to parse Claude response after ${retryCount} retries: ${analysisResult.error}`);
            }

            const inlineComments = this.generateInlineCommentsFromAnalysis(
                documentContent,
                analysisResult.analysis,
                analysisDepth
            );

            return {
                success: true,
                comments: inlineComments,
                analysisMetadata: {
                    totalComments: inlineComments.length,
                    commentTypes: this.categorizeComments(inlineComments),
                    analysisTime: Date.now() - this.rateLimiter.lastRequestTime,
                    confidence: 0.9
                }
            };

        } catch (error) {
            console.error('Claude inline analysis failed:', error);

            // Fallback to local generation
            return this.generateFallbackComments(documentContent, analysisDepth);
        }
    }

    /**
     * Build Claude prompt for inline analysis
     */
    buildInlineAnalysisPrompt(documentContent, config) {
        const { documentType, analysisDepth, focusAreas, userLevel } = config;

        const densityInstructions = {
            basic: 'Provide 15-25 targeted comments covering major issues throughout the document',
            dense: 'Provide 40-60 comprehensive comments analyzing every paragraph and key sentences',
            very_dense: 'Provide 80-120 detailed comments with extensive feedback on every sentence and phrase'
        };

        return `You are an elite writing coach and editor who provides CONCRETE, ACTIONABLE feedback. Your job is to give specific text replacements, word choices, and structural improvements - not generic advice.

IMPORTANT: You MUST respond ONLY with valid JSON format. Do not include any explanation, conversation, or text outside the JSON structure.

ANALYSIS REQUIREMENTS:
- Document Type: ${documentType}
- Analysis Depth: ${analysisDepth} (${densityInstructions[analysisDepth]})
- Focus Areas: ${focusAreas.join(', ')}
- User Level: ${userLevel}

DOCUMENT TO ANALYZE:
"""
${documentContent}
"""

CRITICAL INSTRUCTIONS:
1. You MUST respond with ONLY valid JSON - no conversational text, no explanations outside JSON
2. You MUST provide specific text replacements and concrete suggestions, not generic advice
3. Begin your response immediately with the JSON object starting with "{"

COMMENT TYPES TO GENERATE (mix these intelligently):

1. **WORD CHOICE IMPROVEMENTS** (30% of comments)
   - Replace weak verbs with stronger ones
   - Suggest more precise nouns
   - Offer more vivid adjectives/adverbs
   - Example: Replace "walked" with "strode", "stumbled", "meandered"

2. **SENTENCE RESTRUCTURING** (25% of comments)
   - Show how to combine choppy sentences
   - Demonstrate how to break up run-on sentences
   - Provide actual rewritten versions
   - Example: "Instead of: [original]. Try: [rewritten version]"

3. **PHRASE REPLACEMENTS** (20% of comments)
   - Replace clichés with fresh expressions
   - Suggest more sophisticated phrasings
   - Offer multiple alternatives for the same concept
   - Example: Replace "heavy heart" with "crushing weight of disappointment"

4. **STYLISTIC IMPROVEMENTS** (15% of comments)
   - Add sensory details
   - Suggest metaphors or similes
   - Recommend rhythm changes
   - Show specific language techniques

5. **STRUCTURAL FIXES** (10% of comments)
   - Suggest transition phrases
   - Recommend paragraph restructuring
   - Provide connection words/phrases

EXAMPLE COMMENT FORMATS:

WORD CHOICE:
"Consider replacing 'walked' with 'strode confidently' or 'shuffled reluctantly' to better convey the character's emotional state."

SENTENCE RESTRUCTURING:
"Instead of: 'He was tired. He had been working all day. He wanted to go home.'
Try: 'After working all day, exhaustion weighed on him like a heavy cloak, and all he wanted was the comfort of home.'"

PHRASE REPLACEMENT:
"Replace 'very sad' with 'devastated', 'heartbroken', or 'consumed by grief' for more emotional impact."

REQUIRED JSON FORMAT:
{
  "success": true,
  "analysis": {
    "comments": [
      {
        "id": "comment_1",
        "startOffset": 0,
        "endOffset": 25,
        "highlightedText": "exact text from document",
        "commentType": "word_choice|sentence_restructure|phrase_replacement|stylistic_improvement|structural_fix|praise_excellence",
        "severity": "positive|minor|moderate|major",
        "message": "Brief explanation of the issue or strength",
        "suggestion": "CONCRETE replacement text or specific rewrite - never generic advice",
        "explanation": "Why this specific change improves the writing",
        "originalText": "exact text being replaced",
        "replacementText": "specific suggested replacement",
        "alternatives": ["alternative replacement 1", "alternative replacement 2", "alternative replacement 3"],
        "confidence": 0.85,
        "category": "Word Choice|Sentence Structure|Phrase Quality|Style|Structure|Excellence",
        "editType": "replace|restructure|expand|enhance"
      }
    ],
    "overallFeedback": "Brief assessment focusing on the most impactful changes"
  }
}

COMMENT DISTRIBUTION TARGET:
- ${Math.floor(0.25 * (analysisDepth === 'basic' ? 20 : analysisDepth === 'dense' ? 50 : 100))} thematic/intellectual depth comments
- ${Math.floor(0.25 * (analysisDepth === 'basic' ? 20 : analysisDepth === 'dense' ? 50 : 100))} rhetorical strategy comments
- ${Math.floor(0.20 * (analysisDepth === 'basic' ? 20 : analysisDepth === 'dense' ? 50 : 100))} stylistic craft comments
- ${Math.floor(0.15 * (analysisDepth === 'basic' ? 20 : analysisDepth === 'dense' ? 50 : 100))} structural coherence comments
- ${Math.floor(0.15 * (analysisDepth === 'basic' ? 20 : analysisDepth === 'dense' ? 50 : 100))} praise for excellence

Focus on the essay as a sophisticated work of communication and analysis. Help the writer develop their voice while enhancing the intellectual and artistic merit of their work.

CRITICAL: Ensure comments are distributed throughout the ENTIRE document from beginning to end. Do not focus only on the introduction - analyze every paragraph, every section, including the middle paragraphs and conclusion. Cover all parts of the essay equally with detailed feedback on:
- Opening paragraphs AND body paragraphs AND concluding paragraphs
- Transitions between all sections
- Development of ideas throughout the essay
- Sentence-level improvements in every part of the text

Respond ONLY with the JSON object. Start immediately with "{" and end with "}". No other text.`;
    }

    /**
     * Build an explicit JSON-only prompt for retry attempts
     */
    buildExplicitJSONPrompt(documentContent, config) {
        const { documentType, analysisDepth, focusAreas, userLevel } = config;

        const targetComments = {
            basic: 20,
            dense: 50,
            very_dense: 100
        }[analysisDepth] || 50;

        return `Analyze this ${documentType} and return exactly ${targetComments} inline comments in JSON format.

Document: """${documentContent}"""

Return ONLY this JSON structure with NO other text:

{
  "success": true,
  "analysis": {
    "comments": [
      {
        "id": "comment_1",
        "startOffset": 0,
        "endOffset": 20,
        "highlightedText": "exact text from document",
        "commentType": "word_choice",
        "severity": "moderate",
        "message": "Brief explanation",
        "suggestion": "Specific replacement text",
        "explanation": "Why this improves the writing",
        "originalText": "text being replaced",
        "replacementText": "new text",
        "alternatives": ["option1", "option2"],
        "confidence": 0.85,
        "category": "Word Choice",
        "editType": "replace"
      }
    ],
    "overallFeedback": "Brief assessment"
  }
}

Generate ${targetComments} comments focusing on ${focusAreas.join(', ')}.

CRITICAL: Distribute comments throughout the ENTIRE document, not just the beginning. Analyze every paragraph from start to finish.

Start response with "{".`;
    }

    /**
     * Generate specific inline comments from Claude analysis
     */
    generateInlineCommentsFromAnalysis(documentContent, analysis, density) {
        if (!analysis.comments || !Array.isArray(analysis.comments)) {
            console.warn('Invalid analysis format, generating fallback comments');
            return this.generateBasicFallbackComments(documentContent, density);
        }

        return analysis.comments.map(comment => ({
            id: comment.id || `comment_${Math.random().toString(36).substr(2, 9)}`,
            startOffset: Math.max(0, comment.startOffset || comment.startIndex || 0),
            endOffset: Math.min(documentContent.length, comment.endOffset || comment.endIndex || 50),
            highlightedText: comment.highlightedText || documentContent.substring(comment.startOffset || comment.startIndex || 0, comment.endOffset || comment.endIndex || 50),
            commentType: comment.commentType || 'suggestion',
            severity: comment.severity || 'moderate',
            message: comment.message || 'Consider improving this section',
            suggestion: comment.suggestion || '',
            explanation: comment.explanation || 'This will enhance your writing',
            originalText: comment.originalText || comment.highlightedText || '',
            replacementText: comment.replacementText || '',
            editType: comment.editType || 'enhance',
            alternatives: comment.alternatives || [],
            confidence: comment.confidence || 0.8,
            category: comment.category || 'General Improvement',
            requirementAlignment: comment.requirementAlignment || 'Supports overall writing quality'
        }));
    }

    /**
     * Make Claude API request with proper error handling
     */
    async makeClaudeAPIRequest(prompt, retryCount = 0) {
        if (!this.claudeApiKey) {
            throw new Error('Claude API key not configured');
        }

        try {
            this.rateLimiter.lastRequestTime = Date.now();

            const response = await axios.post(this.claudeBaseUrl, {
                model: 'claude-3-5-haiku-20241022',
                max_tokens: 4000,
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
                timeout: 30000
            });

            this.rateLimiter.consecutiveErrors = 0;
            return response.data;

        } catch (error) {
            this.rateLimiter.consecutiveErrors++;
            console.error('Claude API error:', error.response?.data || error.message);

            if (retryCount < this.rateLimiter.maxRetries && this.rateLimiter.consecutiveErrors < this.rateLimiter.maxConsecutiveErrors) {
                const retryDelay = this.rateLimiter.minDelay * (retryCount + 1);
                console.log(`Retrying Claude API call in ${retryDelay}ms... (attempt ${retryCount + 1})`);
                await new Promise(resolve => setTimeout(resolve, retryDelay));
                return this.makeClaudeAPIRequest(prompt, retryCount + 1);
            }

            throw error;
        }
    }

    /**
     * Parse Claude's JSON response safely
     */
    parseClaudeResponse(content) {
        try {
            // Extract JSON from Claude's response
            let responseText = content;
            if (Array.isArray(content)) {
                responseText = content[0]?.text || content[0] || '';
            }

            // Clean the response
            let cleanedResponse = responseText.trim();

            // Check if Claude responded conversationally instead of with JSON
            if (!cleanedResponse.includes('{') ||
                cleanedResponse.toLowerCase().startsWith('i understand') ||
                cleanedResponse.toLowerCase().startsWith('i\'ll') ||
                cleanedResponse.toLowerCase().startsWith('certainly') ||
                cleanedResponse.toLowerCase().startsWith('of course')) {
                console.warn('Claude returned conversational response instead of JSON. Response starts with:', cleanedResponse.substring(0, 100));
                return {
                    success: false,
                    error: 'Claude returned conversational response instead of JSON format',
                    conversationalResponse: cleanedResponse.substring(0, 200)
                };
            }

            // Remove markdown code blocks
            if (cleanedResponse.includes('```json')) {
                cleanedResponse = cleanedResponse.replace(/^.*?```json\s*/, '').replace(/\s*```.*$/, '');
            } else if (cleanedResponse.includes('```')) {
                cleanedResponse = cleanedResponse.replace(/^.*?```\s*/, '').replace(/\s*```.*$/, '');
            }

            // Find the complete JSON object (handle nested braces properly)
            let braceCount = 0;
            let jsonStart = cleanedResponse.indexOf('{');
            let jsonEnd = -1;

            if (jsonStart === -1) {
                throw new Error('No JSON object found in response');
            }

            for (let i = jsonStart; i < cleanedResponse.length; i++) {
                if (cleanedResponse[i] === '{') {
                    braceCount++;
                } else if (cleanedResponse[i] === '}') {
                    braceCount--;
                    if (braceCount === 0) {
                        jsonEnd = i + 1;
                        break;
                    }
                }
            }

            if (jsonEnd > -1) {
                cleanedResponse = cleanedResponse.substring(jsonStart, jsonEnd);
            } else {
                cleanedResponse = cleanedResponse.substring(jsonStart);
            }

            const parsed = JSON.parse(cleanedResponse);

            // Validate the parsed response has the expected structure
            if (!parsed.success && !parsed.analysis) {
                console.warn('Parsed JSON does not have expected structure:', parsed);
                return {
                    success: false,
                    error: 'Invalid JSON structure from Claude - missing success or analysis fields'
                };
            }

            return parsed;

        } catch (error) {
            console.error('Failed to parse Claude response:', error);
            console.error('Raw response (first 200 chars):', responseText?.substring(0, 200));
            return {
                success: false,
                error: 'Failed to parse JSON response',
                parseError: error.message,
                rawResponse: responseText?.substring(0, 300)
            };
        }
    }

    /**
     * Generate fallback comments when Claude API is unavailable
     */
    generateFallbackComments(documentContent, density) {
        console.log('Generating fallback inline comments...');

        const commentCount = {
            basic: 15,
            dense: 40,
            very_dense: 80
        }[density] || 40;

        const comments = this.generateBasicFallbackComments(documentContent, density, commentCount);

        return {
            success: true,
            comments,
            analysisMetadata: {
                totalComments: comments.length,
                commentTypes: this.categorizeComments(comments),
                analysisTime: 500,
                confidence: 0.7,
                fallbackMode: true
            }
        };
    }

    /**
     * Generate basic fallback comments
     */
    generateBasicFallbackComments(documentContent, density, targetCount = 20) {
        const comments = [];
        const sentences = documentContent.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const paragraphs = documentContent.split(/\n\n/).filter(p => p.trim().length > 0);

        let commentId = 1;

        // New sophisticated comment types
        const sophisticatedTypes = [
            'thematic_insight', 'rhetorical_strategy', 'stylistic_craft',
            'structural_coherence', 'intellectual_depth', 'reader_engagement',
            'praise_excellence', 'contextual_connection'
        ];

        // Ensure comments are distributed throughout the entire document
        const totalTextLength = documentContent.length;
        const commentInterval = Math.floor(totalTextLength / targetCount);

        let currentPosition = 0;
        let usedPositions = new Set();

        for (let i = 0; i < targetCount && currentPosition < totalTextLength; i++) {
            // Find the next appropriate text span starting from currentPosition
            let targetStart = currentPosition;
            let targetEnd = Math.min(currentPosition + commentInterval, totalTextLength);

            // Find sentence boundaries near the target position
            const nearSentences = sentences.filter(sentence => {
                const sentenceStart = documentContent.indexOf(sentence, targetStart - 100);
                return sentenceStart >= targetStart - 100 && sentenceStart <= targetEnd + 100;
            });

            if (nearSentences.length === 0) {
                currentPosition += commentInterval;
                continue;
            }

            // Select a sentence for commenting
            const selectedSentence = nearSentences[Math.floor(Math.random() * nearSentences.length)];
            const sentenceStart = documentContent.indexOf(selectedSentence, targetStart - 100);
            const sentenceEnd = sentenceStart + selectedSentence.length;

            // Skip if we've already commented on this position
            const positionKey = `${sentenceStart}-${sentenceEnd}`;
            if (usedPositions.has(positionKey)) {
                currentPosition += commentInterval;
                continue;
            }
            usedPositions.add(positionKey);

            // Choose comment type based on position and content
            const commentType = this.selectAppropriateCommentType(selectedSentence, i, sophisticatedTypes);
            const severity = this.determineSeverity(selectedSentence, commentType, i);

            // Create sophisticated span for highlighting (not the entire sentence for variety)
            const spanLength = Math.min(selectedSentence.length, Math.max(50, selectedSentence.length * 0.6));
            const spanStart = sentenceStart;
            const spanEnd = spanStart + spanLength;
            const highlightedText = documentContent.substring(spanStart, spanEnd);

            comments.push({
                id: `fallback_${commentId++}`,
                startOffset: Math.max(0, spanStart),
                endOffset: Math.min(documentContent.length, spanEnd),
                highlightedText: highlightedText.trim(),
                commentType,
                severity,
                message: this.getFallbackMessage(commentType),
                suggestion: this.getFallbackSuggestion(commentType),
                explanation: this.getFallbackExplanation(commentType),
                originalText: highlightedText.trim(),
                replacementText: this.generateFallbackReplacement(highlightedText.trim(), commentType),
                editType: this.getFallbackEditType(commentType),
                alternatives: this.generateSophisticatedAlternatives(commentType),
                confidence: 0.78 + (Math.random() * 0.15), // Vary confidence realistically
                category: this.getFallbackCategory(commentType),
                requirementAlignment: this.getRequirementAlignment(commentType)
            });

            currentPosition += commentInterval;
        }

        // Add some paragraph-level comments for structural analysis
        paragraphs.forEach((paragraph, index) => {
            if (comments.length < targetCount && index % 2 === 0) {
                const paragraphStart = documentContent.indexOf(paragraph);
                const firstSentence = paragraph.split(/[.!?]+/)[0];
                const commentType = index === 0 ? 'structural_coherence' :
                                 index === paragraphs.length - 1 ? 'contextual_connection' :
                                 'thematic_insight';

                comments.push({
                    id: `fallback_para_${commentId++}`,
                    startOffset: paragraphStart,
                    endOffset: paragraphStart + Math.min(firstSentence.length + 20, 80),
                    highlightedText: firstSentence.trim(),
                    commentType,
                    severity: 'moderate',
                    message: this.getFallbackMessage(commentType),
                    suggestion: this.getFallbackSuggestion(commentType),
                    explanation: this.getFallbackExplanation(commentType),
                    originalText: firstSentence.trim(),
                    replacementText: this.generateFallbackReplacement(firstSentence.trim(), commentType),
                    editType: this.getFallbackEditType(commentType),
                    alternatives: this.generateSophisticatedAlternatives(commentType),
                    confidence: 0.82,
                    category: this.getFallbackCategory(commentType),
                    requirementAlignment: this.getRequirementAlignment(commentType)
                });
            }
        });

        return comments.slice(0, targetCount);
    }

    selectAppropriateCommentType(sentence, index, types) {
        // Intelligent selection based on sentence content and position
        const lowerSentence = sentence.toLowerCase();

        if (lowerSentence.includes('feel') || lowerSentence.includes('emotion') || lowerSentence.includes('experience')) {
            return 'reader_engagement';
        }
        if (lowerSentence.includes('because') || lowerSentence.includes('therefore') || lowerSentence.includes('however')) {
            return 'rhetorical_strategy';
        }
        if (lowerSentence.includes('theme') || lowerSentence.includes('meaning') || lowerSentence.includes('significance')) {
            return 'thematic_insight';
        }
        if (sentence.length > 100) {
            return 'stylistic_craft';
        }
        if (index % 4 === 0) {
            return 'praise_excellence';
        }

        // Default rotation through types
        return types[index % types.length];
    }

    determineSeverity(sentence, commentType, index) {
        if (commentType === 'praise_excellence') return 'positive';
        if (sentence.length > 150) return 'moderate';
        if (index % 5 === 0) return 'major';
        return 'minor';
    }

    generateSophisticatedAlternatives(commentType) {
        const alternatives = {
            thematic_insight: [
                'Develop this theme with a specific example or anecdote',
                'Connect this theme to a broader universal experience',
                'Show how this theme has evolved throughout your essay'
            ],
            rhetorical_strategy: [
                'Strengthen this argument with statistical evidence',
                'Add a counterargument to show sophisticated thinking',
                'Use a specific example to make this point more concrete'
            ],
            stylistic_craft: [
                'Vary your sentence structure for better rhythm',
                'Use more specific, vivid language here',
                'Consider a metaphor or analogy to enhance meaning'
            ],
            structural_coherence: [
                'Add a transition that connects to your main argument',
                'Restructure this to follow a clearer logical progression',
                'Move this point earlier to strengthen your opening'
            ],
            intellectual_depth: [
                'Explore the underlying assumptions behind this claim',
                'Consider multiple perspectives on this issue',
                'Analyze the long-term implications of this point'
            ],
            reader_engagement: [
                'Use sensory details to help readers visualize this',
                'Add dialogue or direct quotes for immediacy',
                'Include a surprising fact or insight here'
            ],
            praise_excellence: [
                'This technique works well - apply it elsewhere',
                'This demonstrates mature thinking and analysis',
                'This shows excellent command of academic voice'
            ],
            contextual_connection: [
                'Connect this to current events or contemporary issues',
                'Link this to historical precedents or patterns',
                'Show how this relates to broader human experiences'
            ]
        };

        return alternatives[commentType] || ['Consider multiple approaches to this section'];
    }

    getRequirementAlignment(commentType) {
        const alignments = {
            thematic_insight: 'Develops central themes and demonstrates analytical thinking',
            rhetorical_strategy: 'Strengthens argumentative structure and logical reasoning',
            stylistic_craft: 'Enhances prose quality and demonstrates writing maturity',
            structural_coherence: 'Improves organization and guides reader comprehension',
            intellectual_depth: 'Shows critical thinking and sophisticated analysis',
            reader_engagement: 'Creates connection and maintains reader interest',
            praise_excellence: 'Recognizes successful application of writing principles',
            contextual_connection: 'Demonstrates awareness of broader significance'
        };

        return alignments[commentType] || 'Supports overall academic writing excellence';
    }

    getFallbackMessage(type) {
        const messages = {
            thematic_insight: 'This passage contributes to your central theme - consider deepening this connection.',
            rhetorical_strategy: 'Your argument here shows promise - consider strengthening the logical progression.',
            stylistic_craft: 'This demonstrates skillful prose - the language choices enhance your voice.',
            structural_coherence: 'This section supports your overall structure - consider how it transitions to the next idea.',
            intellectual_depth: 'You\'re exploring important ideas here - consider developing this analysis further.',
            reader_engagement: 'This moment has strong potential to connect with readers - consider amplifying its impact.',
            praise_excellence: 'Excellent work here - this exemplifies sophisticated academic writing.',
            contextual_connection: 'This relates well to broader themes - consider making these connections more explicit.'
        };
        return messages[type] || 'Consider how this passage serves your larger rhetorical purpose.';
    }

    getFallbackSuggestion(type) {
        const suggestions = {
            thematic_insight: 'Explore how this moment reinforces or complicates your main themes. What deeper meaning emerges?',
            rhetorical_strategy: 'Strengthen this argument with more specific evidence or a clearer logical connection.',
            stylistic_craft: 'Continue developing this sophisticated voice - consider varying sentence structure for rhythm.',
            structural_coherence: 'Add a transition that explicitly connects this idea to your previous paragraph.',
            intellectual_depth: 'Push this analysis further - what are the broader implications of this point?',
            reader_engagement: 'Use more vivid, specific details to help readers visualize and connect with this moment.',
            praise_excellence: 'This sophisticated approach serves as a model for other sections of your essay.',
            contextual_connection: 'Explicitly connect this to contemporary issues or universal human experiences.'
        };
        return suggestions[type] || 'Consider how to enhance the intellectual and artistic merit of this passage.';
    }

    getFallbackExplanation(type) {
        const explanations = {
            thematic_insight: 'Strong thematic development creates coherence and depth, helping readers understand your central message.',
            rhetorical_strategy: 'Effective argumentation relies on clear logic and compelling evidence that builds reader confidence.',
            stylistic_craft: 'Sophisticated prose style demonstrates mastery of language and enhances your credibility as a writer.',
            structural_coherence: 'Well-organized writing guides readers smoothly through your ideas, enhancing comprehension.',
            intellectual_depth: 'Deep analysis demonstrates critical thinking and engages readers in meaningful exploration.',
            reader_engagement: 'Vivid, specific writing creates emotional connection and helps readers invest in your message.',
            praise_excellence: 'Recognizing strong writing helps identify successful strategies to apply throughout your work.',
            contextual_connection: 'Broader connections help readers understand the significance and relevance of your ideas.'
        };
        return explanations[type] || 'Sophisticated writing balances intellectual rigor with engaging prose craft.';
    }

    getFallbackCategory(type) {
        const categories = {
            thematic_insight: 'Theme Development',
            rhetorical_strategy: 'Rhetorical Strategy',
            stylistic_craft: 'Prose Craft',
            structural_coherence: 'Structural Design',
            intellectual_depth: 'Critical Analysis',
            reader_engagement: 'Reader Impact',
            praise_excellence: 'Writing Excellence',
            contextual_connection: 'Broader Context'
        };
        return categories[type] || 'Academic Writing';
    }

    generateFallbackReplacement(originalText, commentType) {
        // Simple word/phrase replacements based on comment type
        const replacements = {
            stylistic_craft: {
                'very': 'extremely',
                'really': 'genuinely',
                'quite': 'remarkably',
                'walked': 'strode',
                'said': 'declared',
                'looked': 'gazed',
                'went': 'traveled',
                'got': 'obtained'
            },
            word_choice: {
                'big': 'substantial',
                'small': 'minute',
                'good': 'excellent',
                'bad': 'deplorable',
                'happy': 'elated',
                'sad': 'melancholic',
                'angry': 'furious'
            },
            phrase_replacement: {
                'heavy heart': 'crushing weight of sorrow',
                'long time': 'extended period',
                'very important': 'critically significant',
                'a lot of': 'numerous',
                'in conclusion': 'ultimately'
            }
        };

        const typeReplacements = replacements[commentType] || replacements.stylistic_craft;

        // Look for direct word matches
        for (const [original, replacement] of Object.entries(typeReplacements)) {
            if (originalText.toLowerCase().includes(original.toLowerCase())) {
                return originalText.replace(new RegExp(original, 'gi'), replacement);
            }
        }

        // If no direct replacement, suggest enhancement based on type
        if (commentType === 'sentence_restructure') {
            return `Consider restructuring: "${originalText.slice(0, 50)}..."`;
        }

        return originalText; // Return original if no replacement found
    }

    getFallbackEditType(commentType) {
        const editTypes = {
            stylistic_craft: 'replace',
            word_choice: 'replace',
            phrase_replacement: 'replace',
            sentence_restructure: 'restructure',
            structural_coherence: 'expand',
            thematic_insight: 'enhance',
            rhetorical_strategy: 'enhance',
            intellectual_depth: 'expand',
            reader_engagement: 'enhance',
            praise_excellence: 'enhance',
            contextual_connection: 'expand'
        };
        return editTypes[commentType] || 'enhance';
    }

    /**
     * Categorize comments by type
     */
    categorizeComments(comments) {
        return comments.reduce((acc, comment) => {
            acc[comment.commentType] = (acc[comment.commentType] || 0) + 1;
            return acc;
        }, {});
    }

    /**
     * Rate limiting helper with per-minute limits
     */
    async waitForRateLimit() {
        const now = Date.now();

        // Reset window if minute has passed
        if (now - this.rateLimiter.windowStart > 60000) {
            this.rateLimiter.requestCount = 0;
            this.rateLimiter.windowStart = now;
            console.log('Claude API rate limit window reset');
        }

        // Check requests per minute limit
        if (this.rateLimiter.requestCount >= this.rateLimiter.maxRequestsPerMinute) {
            const waitTime = 60000 - (now - this.rateLimiter.windowStart);
            console.log(`Claude API rate limit exceeded: ${this.rateLimiter.requestCount} requests in current minute. Must wait ${waitTime}ms`);
            throw new Error(`Claude API rate limit exceeded. Please wait ${Math.ceil(waitTime / 1000)} seconds.`);
        }

        // Check minimum delay between requests
        const timeSinceLastRequest = now - this.rateLimiter.lastRequestTime;
        const delay = Math.max(0, this.rateLimiter.minDelay - timeSinceLastRequest);

        if (delay > 0) {
            console.log(`Claude API rate limiting: waiting ${delay}ms between requests (${Math.ceil(delay / 1000)}s)`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }

        // Update rate limiting counters
        this.rateLimiter.lastRequestTime = Date.now();
        this.rateLimiter.requestCount++;

        console.log(`Claude API request ${this.rateLimiter.requestCount}/${this.rateLimiter.maxRequestsPerMinute} in current minute`);
    }

    /**
     * Get service status
     */
    getServiceStatus() {
        const timeSinceLastRequest = Date.now() - this.rateLimiter.lastRequestTime;
        const ready = timeSinceLastRequest >= this.rateLimiter.minDelay &&
                     this.rateLimiter.consecutiveErrors < this.rateLimiter.maxConsecutiveErrors;

        return {
            ready,
            hasApiKey: !!this.claudeApiKey,
            consecutiveErrors: this.rateLimiter.consecutiveErrors,
            nextAvailable: ready ? 0 : this.rateLimiter.lastRequestTime + this.rateLimiter.minDelay,
            message: ready ? 'Claude API ready' : 'Rate limited or error backoff'
        };
    }
}

module.exports = new ClaudeInlineAnalysisService();