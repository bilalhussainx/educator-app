const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');

class AIWritingSupervisorService {
    constructor() {
        // Primary Claude API setup
        this.claudeApiKey = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;
        this.claudeBaseUrl = 'https://api.anthropic.com/v1/messages';

        // Fallback Gemini API setup
        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

        // Use Claude as primary, Gemini as fallback
        this.useClaudeAPI = !!this.claudeApiKey;

        console.log(`MozartStroke AI Service initialized with ${this.useClaudeAPI ? 'Claude API (primary)' : 'Gemini API (fallback)'}`);

        this.promptsDir = path.join(__dirname, '../prompts');
        this.analysisChain = [
            'structural_analysis.md',
            'rhetorical_devices.md',
            'clarity_and_conciseness.md',
            'admissions_tone.md'
        ];

        // Rate limiting configuration
        this.rateLimiter = {
            requestQueue: [],
            isProcessing: false,
            lastRequestTime: 0,
            minDelay: 5000, // Increased to 5 seconds between requests
            maxRetries: 2, // Reduced retries to conserve quota
            backoffMultiplier: 3, // More aggressive backoff
            dailyRequestCount: 0,
            dailyRequestLimit: 10, // Much more conservative for exhausted quota
            lastResetDate: new Date().toDateString(),
            consecutiveErrors: 0,
            maxConsecutiveErrors: 3, // Fail faster
            quotaExhausted: false,
            quotaExhaustedUntil: null,
            emergencyMode: false
        };
    }

    /**
     * Reset daily request count if needed
     */
    resetDailyCountIfNeeded() {
        const currentDate = new Date().toDateString();
        if (this.rateLimiter.lastResetDate !== currentDate) {
            this.rateLimiter.dailyRequestCount = 0;
            this.rateLimiter.lastResetDate = currentDate;
            this.rateLimiter.consecutiveErrors = 0;
            console.log('Daily request count reset');
        }
    }

    /**
     * Check if we can make a request based on rate limits
     */
    canMakeRequest() {
        this.resetDailyCountIfNeeded();

        if (this.rateLimiter.dailyRequestCount >= this.rateLimiter.dailyRequestLimit) {
            console.warn(`Daily request limit reached: ${this.rateLimiter.dailyRequestCount}/${this.rateLimiter.dailyRequestLimit}`);
            return false;
        }

        if (this.rateLimiter.consecutiveErrors >= this.rateLimiter.maxConsecutiveErrors) {
            console.warn(`Too many consecutive errors: ${this.rateLimiter.consecutiveErrors}`);
            return false;
        }

        return true;
    }

    /**
     * Calculate delay based on current state
     */
    calculateDelay(retryCount = 0) {
        const baseDelay = this.rateLimiter.minDelay;
        const backoffDelay = baseDelay * Math.pow(this.rateLimiter.backoffMultiplier, retryCount);
        const errorDelay = this.rateLimiter.consecutiveErrors * 1000; // Additional delay per consecutive error

        return Math.min(backoffDelay + errorDelay, 60000); // Cap at 60 seconds
    }

    /**
     * Wait for the appropriate delay before next request
     */
    async waitForDelay(delay) {
        const timeSinceLastRequest = Date.now() - this.rateLimiter.lastRequestTime;
        const actualDelay = Math.max(0, delay - timeSinceLastRequest);

        if (actualDelay > 0) {
            console.log(`Rate limiting: waiting ${actualDelay}ms before next request`);
            await new Promise(resolve => setTimeout(resolve, actualDelay));
        }
    }

    /**
     * Make a rate-limited request to Claude API
     */
    async makeClaudeAPIRequest(prompt, retryCount = 0) {
        if (!this.claudeApiKey) {
            throw new Error('Claude API key not configured');
        }

        const delay = this.calculateDelay(retryCount);
        await this.waitForDelay(delay);

        try {
            this.rateLimiter.lastRequestTime = Date.now();
            this.rateLimiter.dailyRequestCount++;

            console.log(`Making Claude API request (${this.rateLimiter.dailyRequestCount}/${this.rateLimiter.dailyRequestLimit} today, retry: ${retryCount})`);

            const response = await axios.post(this.claudeBaseUrl, {
                model: 'claude-3-5-sonnet-20240620',
                max_tokens: 4000,
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ]
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': this.claudeApiKey,
                    'anthropic-version': '2023-06-01'
                },
                timeout: 30000
            });

            // Success - reset consecutive errors
            this.rateLimiter.consecutiveErrors = 0;

            return { response: { text: () => response.data.content[0].text } };

        } catch (error) {
            this.rateLimiter.consecutiveErrors++;

            // Check if it's a rate limit error
            if (error.response?.status === 429 || error.message?.includes('quota') || error.message?.includes('rate limit')) {
                console.warn(`Claude API rate limit hit (attempt ${retryCount + 1}/${this.rateLimiter.maxRetries + 1}):`, error.message);

                let retryDelay = this.calculateDelay(retryCount + 1);

                if (retryCount < this.rateLimiter.maxRetries) {
                    console.log(`Retrying Claude API in ${retryDelay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, retryDelay));
                    return this.makeClaudeAPIRequest(prompt, retryCount + 1);
                } else {
                    throw new Error(`Claude API rate limit exceeded after ${this.rateLimiter.maxRetries} retries. Please try again later.`);
                }
            }

            // For other errors, still increment consecutive errors but don't retry
            console.error('Claude API error:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Make a rate-limited request to Gemini API (fallback)
     */
    async makeGeminiAPIRequest(prompt, retryCount = 0) {
        if (!this.canMakeRequest()) {
            throw new Error('Rate limit exceeded - please try again later');
        }

        const delay = this.calculateDelay(retryCount);
        await this.waitForDelay(delay);

        try {
            this.rateLimiter.lastRequestTime = Date.now();
            this.rateLimiter.dailyRequestCount++;

            console.log(`Making Gemini API request (${this.rateLimiter.dailyRequestCount}/${this.rateLimiter.dailyRequestLimit} today, retry: ${retryCount})`);

            const result = await this.model.generateContent(prompt);

            // Success - reset consecutive errors
            this.rateLimiter.consecutiveErrors = 0;

            return result;

        } catch (error) {
            this.rateLimiter.consecutiveErrors++;

            // Check if it's a rate limit error
            if (error.status === 429 || error.message?.includes('quota') || error.message?.includes('rate limit')) {
                console.warn(`Gemini rate limit hit (attempt ${retryCount + 1}/${this.rateLimiter.maxRetries + 1}):`, error.message);

                // Extract retry delay from error if available
                let retryDelay = this.calculateDelay(retryCount + 1);

                // Try to parse retry delay from error response
                if (error.message?.includes('retry in')) {
                    const retryMatch = error.message.match(/retry in (\d+\.?\d*)s/);
                    if (retryMatch) {
                        retryDelay = Math.max(retryDelay, parseFloat(retryMatch[1]) * 1000);
                    }
                }

                if (retryCount < this.rateLimiter.maxRetries) {
                    console.log(`Retrying Gemini in ${retryDelay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, retryDelay));
                    return this.makeGeminiAPIRequest(prompt, retryCount + 1);
                } else {
                    throw new Error(`Gemini rate limit exceeded after ${this.rateLimiter.maxRetries} retries. Please try again later.`);
                }
            }

            // For other errors, still increment consecutive errors but don't retry
            throw error;
        }
    }

    /**
     * Unified request method that tries Claude first, then falls back to Gemini
     */
    async makeRateLimitedRequest(prompt, retryCount = 0) {
        if (!this.canMakeRequest()) {
            throw new Error('Rate limit exceeded - please try again later');
        }

        try {
            if (this.useClaudeAPI) {
                console.log('Using Claude API for MozartStroke analysis...');
                return await this.makeClaudeAPIRequest(prompt, retryCount);
            } else {
                console.log('Using Gemini API for MozartStroke analysis...');
                return await this.makeGeminiAPIRequest(prompt, retryCount);
            }
        } catch (error) {
            // If Claude fails and we haven't tried Gemini, fallback to Gemini
            if (this.useClaudeAPI && !this.claudeApiFailed && process.env.GEMINI_API_KEY) {
                console.warn('Claude API failed, attempting fallback to Gemini API...');
                this.claudeApiFailed = true; // Temporarily disable Claude for this session
                return await this.makeGeminiAPIRequest(prompt, retryCount);
            }
            throw error;
        }
    }

    /**
     * Load a prompt template from the prompts directory
     * @param {string} promptFile - The filename of the prompt
     * @returns {string} The prompt content
     */
    loadPrompt(promptFile) {
        try {
            const promptPath = path.join(this.promptsDir, promptFile);
            return fs.readFileSync(promptPath, 'utf8');
        } catch (error) {
            console.error(`Failed to load prompt ${promptFile}:`, error);
            throw new Error(`Prompt file ${promptFile} not found`);
        }
    }

    /**
     * Execute a single analysis pass with Gemini
     * @param {string} documentContent - The document to analyze
     * @param {string} promptTemplate - The analysis prompt
     * @param {string} passType - The type of analysis pass
     * @returns {Array} Array of annotation objects
     */
    async executeAnalysisPass(documentContent, promptTemplate, passType) {
        try {
            const fullPrompt = `${promptTemplate}

## Document to Analyze:
"""
${documentContent}
"""

Please analyze this document according to the instructions above and return your findings as a valid JSON array of annotation objects. Ensure each object follows the exact schema specified in the prompt.

CRITICAL: Your response must be ONLY a valid JSON array. Do not include any text before or after the JSON array.`;

            console.log(`Executing ${passType} analysis pass...`);

            const result = await this.makeRateLimitedRequest(fullPrompt);
            const response = result.response;
            let responseText = response.text();

            // Clean up the response to extract JSON
            responseText = responseText.trim();

            // Remove any markdown code block markers
            responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '');

            // Find the JSON array
            const jsonStart = responseText.indexOf('[');
            const jsonEnd = responseText.lastIndexOf(']') + 1;

            if (jsonStart === -1 || jsonEnd === 0) {
                console.warn(`No valid JSON array found in ${passType} response`);
                return [];
            }

            const jsonString = responseText.substring(jsonStart, jsonEnd);

            try {
                const annotations = JSON.parse(jsonString);

                if (!Array.isArray(annotations)) {
                    console.warn(`${passType} response is not an array`);
                    return [];
                }

                // Validate and enhance each annotation
                const validatedAnnotations = annotations
                    .filter(annotation => this.validateAnnotation(annotation, passType))
                    .map(annotation => ({
                        ...annotation,
                        passType,
                        timestamp: new Date().toISOString(),
                        id: `${passType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
                    }));

                console.log(`${passType} pass completed: ${validatedAnnotations.length} annotations generated`);
                return validatedAnnotations;

            } catch (parseError) {
                console.error(`Failed to parse JSON from ${passType} pass:`, parseError);
                console.error('Raw response:', responseText);
                return [];
            }

        } catch (error) {
            console.error(`Error in ${passType} analysis pass:`, error);
            return [];
        }
    }

    /**
     * Validate an annotation object
     * @param {Object} annotation - The annotation to validate
     * @param {string} passType - The analysis pass type
     * @returns {boolean} Whether the annotation is valid
     */
    validateAnnotation(annotation, passType) {
        const requiredFields = ['startIndex', 'endIndex', 'highlightedText', 'suggestion', 'category', 'rationale', 'severity'];

        for (const field of requiredFields) {
            if (!(field in annotation)) {
                console.warn(`${passType}: Missing required field ${field} in annotation`);
                return false;
            }
        }

        // Validate data types
        if (typeof annotation.startIndex !== 'number' || typeof annotation.endIndex !== 'number') {
            console.warn(`${passType}: Invalid index types in annotation`);
            return false;
        }

        if (annotation.startIndex < 0 || annotation.endIndex <= annotation.startIndex) {
            console.warn(`${passType}: Invalid index values in annotation`);
            return false;
        }

        if (!['high', 'medium', 'low'].includes(annotation.severity)) {
            console.warn(`${passType}: Invalid severity value: ${annotation.severity}`);
            return false;
        }

        return true;
    }

    /**
     * Main analysis function that executes the full chain of analysis passes
     * @param {string} documentContent - The document to analyze
     * @returns {Object} Analysis results with annotations and metadata
     */
    async analyzeDocument(documentContent) {
        if (!documentContent || typeof documentContent !== 'string') {
            throw new Error('Invalid document content provided');
        }

        if (documentContent.trim().length < 50) {
            throw new Error('Document too short for meaningful analysis (minimum 50 characters)');
        }

        const analysisStartTime = Date.now();
        const allAnnotations = [];
        const passResults = {};

        console.log('Starting multi-pass document analysis...');
        console.log(`Document length: ${documentContent.length} characters`);

        try {
            // Execute each analysis pass in sequence
            for (const promptFile of this.analysisChain) {
                const passType = promptFile.replace('.md', '');

                try {
                    // Load the prompt template
                    const promptTemplate = this.loadPrompt(promptFile);

                    // Execute the analysis pass
                    const passAnnotations = await this.executeAnalysisPass(
                        documentContent,
                        promptTemplate,
                        passType
                    );

                    // Store results
                    passResults[passType] = {
                        annotationCount: passAnnotations.length,
                        executionTime: Date.now() - analysisStartTime
                    };

                    allAnnotations.push(...passAnnotations);

                    // Longer pause between passes to avoid rate limiting
                    if (this.analysisChain.indexOf(promptFile) < this.analysisChain.length - 1) {
                        const pauseDuration = Math.max(3000, this.rateLimiter.minDelay);
                        console.log(`Pausing ${pauseDuration}ms before next analysis pass...`);
                        await new Promise(resolve => setTimeout(resolve, pauseDuration));
                    }

                } catch (passError) {
                    console.error(`Failed to execute ${passType} pass:`, passError);
                    passResults[passType] = {
                        annotationCount: 0,
                        error: passError.message,
                        executionTime: Date.now() - analysisStartTime
                    };
                }
            }

            // Sort annotations by position for logical review order
            allAnnotations.sort((a, b) => a.startIndex - b.startIndex);

            // Generate analysis summary
            const analysisResults = {
                success: true,
                annotations: allAnnotations,
                metadata: {
                    totalAnnotations: allAnnotations.length,
                    analysisTime: Date.now() - analysisStartTime,
                    documentLength: documentContent.length,
                    passResults,
                    breakdown: {
                        high: allAnnotations.filter(a => a.severity === 'high').length,
                        medium: allAnnotations.filter(a => a.severity === 'medium').length,
                        low: allAnnotations.filter(a => a.severity === 'low').length
                    },
                    categories: this.categorizeAnnotations(allAnnotations)
                },
                timestamp: new Date().toISOString()
            };

            console.log(`Analysis completed: ${allAnnotations.length} total annotations in ${Date.now() - analysisStartTime}ms`);
            return analysisResults;

        } catch (error) {
            console.error('Analysis failed:', error);
            return {
                success: false,
                error: error.message,
                annotations: [],
                metadata: {
                    totalAnnotations: 0,
                    analysisTime: Date.now() - analysisStartTime,
                    documentLength: documentContent.length,
                    passResults
                },
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Categorize annotations for summary statistics
     * @param {Array} annotations - Array of annotation objects
     * @returns {Object} Category breakdown
     */
    categorizeAnnotations(annotations) {
        const categories = {};
        annotations.forEach(annotation => {
            if (!categories[annotation.category]) {
                categories[annotation.category] = 0;
            }
            categories[annotation.category]++;
        });
        return categories;
    }

    /**
     * Get analysis statistics for a set of annotations
     * @param {Array} annotations - Array of annotation objects
     * @returns {Object} Statistical summary
     */
    getAnalysisStatistics(annotations) {
        return {
            total: annotations.length,
            severityBreakdown: {
                high: annotations.filter(a => a.severity === 'high').length,
                medium: annotations.filter(a => a.severity === 'medium').length,
                low: annotations.filter(a => a.severity === 'low').length
            },
            categoryBreakdown: this.categorizeAnnotations(annotations),
            averageIssuesPerParagraph: this.calculateAverageIssuesPerParagraph(annotations)
        };
    }

    /**
     * Calculate average issues per paragraph
     * @param {Array} annotations - Array of annotation objects
     * @returns {number} Average issues per paragraph
     */
    calculateAverageIssuesPerParagraph(annotations) {
        if (annotations.length === 0) return 0;

        // Estimate paragraph count based on double line breaks
        const textPositions = annotations.map(a => a.startIndex);
        const estimatedParagraphs = Math.max(1, Math.ceil(Math.max(...textPositions) / 500)); // Rough estimate

        return (annotations.length / estimatedParagraphs).toFixed(2);
    }

    /**
     * Get current rate limiter status
     * @returns {Object} Rate limiter status information
     */
    getRateLimiterStatus() {
        this.resetDailyCountIfNeeded();

        return {
            dailyRequestCount: this.rateLimiter.dailyRequestCount,
            dailyRequestLimit: this.rateLimiter.dailyRequestLimit,
            remainingRequests: Math.max(0, this.rateLimiter.dailyRequestLimit - this.rateLimiter.dailyRequestCount),
            consecutiveErrors: this.rateLimiter.consecutiveErrors,
            maxConsecutiveErrors: this.rateLimiter.maxConsecutiveErrors,
            canMakeRequest: this.canMakeRequest(),
            timeSinceLastRequest: Date.now() - this.rateLimiter.lastRequestTime,
            minDelay: this.rateLimiter.minDelay,
            isHealthy: this.rateLimiter.consecutiveErrors < this.rateLimiter.maxConsecutiveErrors
        };
    }

    /**
     * Manually reset rate limiter (for admin/debugging)
     */
    resetRateLimiter() {
        this.rateLimiter.dailyRequestCount = 0;
        this.rateLimiter.consecutiveErrors = 0;
        this.rateLimiter.lastRequestTime = 0;
        console.log('Rate limiter manually reset');
    }

    /**
     * Generate TrustGraph tokens using Claude API for MozartStroke integration
     * @param {Object} sessionData - Data about the session and user interaction
     * @returns {Object} Generated token data for TrustGraph
     */
    async generateTrustGraphTokens(sessionData) {
        const {
            userId,
            sessionId,
            analysisResults,
            userInteractions,
            documentMetrics
        } = sessionData;

        const tokenPrompt = `You are an AI system responsible for generating trust and engagement tokens for the TrustGraph network based on MozartStroke writing analysis sessions.

**Session Analysis Data:**
- User ID: ${userId}
- Session ID: ${sessionId}
- Document Length: ${documentMetrics?.length || 0} characters
- Analysis Issues Found: ${analysisResults?.totalAnnotations || 0}
- User Interactions: ${userInteractions?.length || 0}

**Analysis Results Summary:**
${analysisResults ? JSON.stringify(analysisResults.metadata, null, 2) : 'No analysis data available'}

**User Interaction Patterns:**
${userInteractions ? JSON.stringify(userInteractions, null, 2) : 'No interaction data available'}

Based on this MozartStroke session data, generate appropriate TrustGraph tokens that reflect:

1. **Engagement Quality**: How actively the user engaged with AI suggestions
2. **Learning Progress**: Evidence of writing improvement and skill development
3. **Trust Metrics**: User's trust in AI recommendations and system reliability
4. **Collaboration Value**: Quality of human-AI collaboration during the session

Generate tokens as a JSON object with the following structure:
{
  "tokens": [
    {
      "type": "engagement_quality",
      "value": 0.85,
      "source": "mozartstroke_session",
      "evidence": "User actively engaged with 8/10 suggestions",
      "weight": 1.0,
      "expires_at": "2024-12-31T23:59:59Z"
    },
    {
      "type": "learning_progress",
      "value": 0.73,
      "source": "mozartstroke_session",
      "evidence": "Demonstrated improvement in clarity and structure",
      "weight": 0.8,
      "expires_at": "2024-12-31T23:59:59Z"
    },
    {
      "type": "ai_trust_score",
      "value": 0.91,
      "source": "mozartstroke_session",
      "evidence": "High acceptance rate of AI suggestions",
      "weight": 0.9,
      "expires_at": "2024-12-31T23:59:59Z"
    }
  ],
  "session_summary": {
    "total_tokens": 3,
    "average_value": 0.83,
    "session_quality": "high",
    "trust_trajectory": "positive"
  }
}

Return ONLY valid JSON with no additional text.`;

        try {
            console.log('Generating TrustGraph tokens for MozartStroke session...');

            const result = await this.makeRateLimitedRequest(tokenPrompt);
            const response = result.response;
            let responseText = response.text();

            // Clean and parse the response
            responseText = responseText.trim();
            responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '');

            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                responseText = jsonMatch[0];
            }

            const tokenData = JSON.parse(responseText);

            // Validate token structure
            if (!tokenData.tokens || !Array.isArray(tokenData.tokens)) {
                throw new Error('Invalid token data structure');
            }

            // Enhance tokens with session metadata
            const enhancedTokens = {
                ...tokenData,
                metadata: {
                    generated_at: new Date().toISOString(),
                    session_id: sessionId,
                    user_id: userId,
                    generator: 'mozartstroke_claude_api',
                    api_used: this.useClaudeAPI ? 'claude' : 'gemini'
                }
            };

            console.log(`Generated ${enhancedTokens.tokens.length} TrustGraph tokens for session ${sessionId}`);
            return enhancedTokens;

        } catch (error) {
            console.error('Error generating TrustGraph tokens:', error);

            // Return fallback tokens if generation fails
            return {
                tokens: [
                    {
                        type: 'session_completion',
                        value: 0.5,
                        source: 'mozartstroke_fallback',
                        evidence: 'Session completed with fallback token generation',
                        weight: 0.3,
                        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
                    }
                ],
                session_summary: {
                    total_tokens: 1,
                    average_value: 0.5,
                    session_quality: 'basic',
                    trust_trajectory: 'neutral'
                },
                metadata: {
                    generated_at: new Date().toISOString(),
                    session_id: sessionId,
                    user_id: userId,
                    generator: 'mozartstroke_fallback',
                    error: error.message
                }
            };
        }
    }

    /**
     * Check if the service is ready to process analysis requests
     * @returns {Object} Service readiness status
     */
    getServiceStatus() {
        const rateLimiterStatus = this.getRateLimiterStatus();

        return {
            ready: rateLimiterStatus.canMakeRequest && rateLimiterStatus.isHealthy,
            rateLimiter: rateLimiterStatus,
            analysisChainLength: this.analysisChain.length,
            estimatedAnalysisTime: this.analysisChain.length * (this.rateLimiter.minDelay + 5000), // Rough estimate
            message: !rateLimiterStatus.canMakeRequest
                ? 'Service temporarily unavailable due to rate limits'
                : !rateLimiterStatus.isHealthy
                ? 'Service experiencing issues, retries may be slower'
                : 'Service ready'
        };
    }
}

module.exports = new AIWritingSupervisorService();