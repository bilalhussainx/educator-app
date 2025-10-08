/**
 * Enhanced MozartStroke Analysis Service
 * Provides requirement-specific, paragraph-by-paragraph analysis
 * with counselor-level feedback and proactive suggestions
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

class EnhancedMozartStrokeService {
    constructor() {
        // Primary Claude API setup
        this.claudeApiKey = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;
        this.claudeBaseUrl = 'https://api.anthropic.com/v1/messages';

        // Use Claude as primary for enhanced analysis
        this.useClaudeAPI = !!this.claudeApiKey;

        console.log(`Enhanced MozartStroke Service initialized with ${this.useClaudeAPI ? 'Claude API' : 'No API available'}`);

        this.promptsDir = path.join(__dirname, '../prompts');

        // Rate limiting for enhanced analysis
        this.rateLimiter = {
            lastRequestTime: 0,
            minDelay: 3000, // 3 seconds between requests
            maxRetries: 2,
            consecutiveErrors: 0,
            maxConsecutiveErrors: 3
        };

        // Document type configurations
        this.documentTypes = {
            college_essay: {
                name: 'College Application Essay',
                requirements: [
                    'Personal narrative that reveals character',
                    'Specific examples and concrete details',
                    'Clear theme or central message',
                    'Authentic voice and personality',
                    'Strong opening and compelling conclusion',
                    'Appropriate length and structure'
                ],
                focusAreas: ['personal_growth', 'storytelling', 'authenticity', 'impact']
            },
            academic_paper: {
                name: 'Academic Research Paper',
                requirements: [
                    'Clear thesis statement and argument structure',
                    'Proper citation and source integration',
                    'Logical progression of ideas',
                    'Evidence-based claims',
                    'Academic tone and style',
                    'Proper formatting and structure'
                ],
                focusAreas: ['argumentation', 'evidence', 'academic_style', 'organization']
            },
            creative_writing: {
                name: 'Creative Writing Piece',
                requirements: [
                    'Engaging narrative voice',
                    'Character development and dialogue',
                    'Scene setting and atmosphere',
                    'Plot structure and pacing',
                    'Creative use of language',
                    'Emotional impact and reader engagement'
                ],
                focusAreas: ['narrative_voice', 'character_development', 'atmosphere', 'pacing']
            },
            business_document: {
                name: 'Business/Professional Document',
                requirements: [
                    'Clear communication of key messages',
                    'Professional tone and formatting',
                    'Logical organization of information',
                    'Action-oriented language',
                    'Appropriate level of detail',
                    'Call to action or next steps'
                ],
                focusAreas: ['clarity', 'professionalism', 'action_orientation', 'organization']
            },
            personal_statement: {
                name: 'Personal Statement',
                requirements: [
                    'Clear career goals and motivation',
                    'Relevant experience and qualifications',
                    'Personal qualities and characteristics',
                    'Fit with program or opportunity',
                    'Professional tone with personal touch',
                    'Compelling narrative arc'
                ],
                focusAreas: ['career_goals', 'experience', 'personal_qualities', 'program_fit']
            }
        };
    }

    /**
     * Analyze document with requirements and paragraph-by-paragraph feedback
     */
    async analyzeDocumentEnhanced(documentContent, analysisConfig) {
        const {
            documentType = 'college_essay',
            customRequirements = [],
            focusAreas = [],
            analysisDepth = 'comprehensive' // comprehensive, focused, quick
        } = analysisConfig;

        try {
            console.log(`Starting enhanced MozartStroke analysis: ${documentType}, depth: ${analysisDepth}`);

            // Parse document into paragraphs
            const paragraphs = this.parseDocumentIntoParagraphs(documentContent);
            console.log(`Document parsed into ${paragraphs.length} paragraphs`);

            // Get document type configuration
            const typeConfig = this.documentTypes[documentType] || this.documentTypes.college_essay;
            const requirements = customRequirements.length > 0 ? customRequirements : typeConfig.requirements;

            // Perform analysis based on depth
            let analysisResults;

            if (analysisDepth === 'comprehensive') {
                analysisResults = await this.performComprehensiveAnalysis(
                    documentContent,
                    paragraphs,
                    requirements,
                    typeConfig,
                    focusAreas
                );
            } else if (analysisDepth === 'focused') {
                analysisResults = await this.performFocusedAnalysis(
                    documentContent,
                    paragraphs,
                    requirements,
                    focusAreas
                );
            } else {
                analysisResults = await this.performQuickAnalysis(
                    documentContent,
                    requirements
                );
            }

            return {
                success: true,
                analysisType: 'enhanced_mozart_stroke',
                documentType,
                requirements,
                paragraphCount: paragraphs.length,
                wordCount: documentContent.split(/\s+/).length,
                analysisDepth,
                results: analysisResults,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error('Enhanced analysis failed:', error);
            return {
                success: false,
                error: error.message,
                fallbackAnalysis: await this.generateFallbackAnalysis(documentContent, analysisConfig)
            };
        }
    }

    /**
     * Parse document into logical paragraphs
     */
    parseDocumentIntoParagraphs(content) {
        // Split by double line breaks first
        let paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 0);

        // If no double line breaks, split by single line breaks and group
        if (paragraphs.length === 1) {
            const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
            paragraphs = this.groupSentencesIntoParagraphs(sentences);
        }

        return paragraphs.map((paragraph, index) => ({
            number: index + 1,
            content: paragraph.trim(),
            wordCount: paragraph.trim().split(/\s+/).length,
            startIndex: content.indexOf(paragraph.trim()),
            endIndex: content.indexOf(paragraph.trim()) + paragraph.trim().length
        }));
    }

    /**
     * Group sentences into logical paragraphs
     */
    groupSentencesIntoParagraphs(sentences) {
        const paragraphs = [];
        let currentParagraph = '';
        let sentenceCount = 0;

        for (const sentence of sentences) {
            currentParagraph += sentence.trim() + '. ';
            sentenceCount++;

            // Group every 3-5 sentences into a paragraph
            if (sentenceCount >= 3 && (sentenceCount >= 5 || Math.random() > 0.6)) {
                paragraphs.push(currentParagraph.trim());
                currentParagraph = '';
                sentenceCount = 0;
            }
        }

        if (currentParagraph.trim()) {
            paragraphs.push(currentParagraph.trim());
        }

        return paragraphs;
    }

    /**
     * Perform comprehensive paragraph-by-paragraph analysis
     */
    async performComprehensiveAnalysis(documentContent, paragraphs, requirements, typeConfig, focusAreas) {
        const analysisPrompt = this.buildComprehensiveAnalysisPrompt(
            documentContent,
            paragraphs,
            requirements,
            typeConfig,
            focusAreas
        );

        await this.waitForRateLimit();
        const result = await this.makeClaudeAPIRequest(analysisPrompt);

        return this.parseAnalysisResponse(result.response.text());
    }

    /**
     * Build comprehensive analysis prompt
     */
    buildComprehensiveAnalysisPrompt(documentContent, paragraphs, requirements, typeConfig, focusAreas) {
        const basePrompt = fs.readFileSync(path.join(this.promptsDir, 'enhanced_mozart_analysis.md'), 'utf8');

        return `${basePrompt}

## Document Analysis Request

**Document Type:** ${typeConfig.name}

**Specific Requirements to Analyze Against:**
${requirements.map(req => `- ${req}`).join('\n')}

**Focus Areas:** ${focusAreas.length > 0 ? focusAreas.join(', ') : typeConfig.focusAreas.join(', ')}

**Document Content:**
"""
${documentContent}
"""

**Paragraph Breakdown:**
${paragraphs.map(p => `**Paragraph ${p.number}:** ${p.content.substring(0, 100)}...`).join('\n')}

## Analysis Instructions

Provide a comprehensive, counselor-level analysis following these steps:

1. **Paragraph-by-Paragraph Analysis**: For each paragraph, provide detailed feedback including:
   - How well it meets the specified requirements
   - Specific phrases or sentences that need improvement
   - Flow and transition assessment
   - Counselor-style suggestions for improvement

2. **Overall Document Assessment**:
   - How well the document meets each requirement
   - Major strengths to build upon
   - Critical improvements needed
   - Revision strategy

3. **Proactive Counselor Recommendations**:
   - Immediate next steps
   - Structural changes needed
   - Content development suggestions
   - Encouragement and motivation

Return your analysis as a valid JSON object with the structure specified in the enhanced_mozart_analysis.md template.

CRITICAL: Provide specific, actionable feedback that goes beyond surface-level corrections. Think like an experienced writing counselor who wants to help the student improve not just this document, but their overall writing skills.`;
    }

    /**
     * Perform focused analysis on specific areas
     */
    async performFocusedAnalysis(documentContent, paragraphs, requirements, focusAreas) {
        const focusPrompt = `You are an expert writing counselor conducting a focused analysis.

**Focus Areas:** ${focusAreas.join(', ')}
**Requirements:** ${requirements.slice(0, 3).join(', ')}

**Document:**
${documentContent}

Provide focused feedback on the specified areas only. For each paragraph, comment specifically on how it addresses the focus areas and requirements. Return as JSON with paragraph-level feedback and overall assessment.`;

        await this.waitForRateLimit();
        const result = await this.makeClaudeAPIRequest(focusPrompt);

        return this.parseAnalysisResponse(result.response.text());
    }

    /**
     * Perform quick analysis for rapid feedback
     */
    async performQuickAnalysis(documentContent, requirements) {
        const quickPrompt = `Provide a quick but insightful analysis of this document against these requirements:

Requirements: ${requirements.slice(0, 3).join(', ')}

Document: ${documentContent}

Focus on the 3 most important improvements and 3 biggest strengths. Provide specific, actionable feedback in JSON format.`;

        await this.waitForRateLimit();
        const result = await this.makeClaudeAPIRequest(focusPrompt);

        return this.parseAnalysisResponse(result.response.text());
    }

    /**
     * Parse analysis response from Claude
     */
    parseAnalysisResponse(responseText) {
        try {
            // Clean the response
            let cleanedResponse = responseText.trim();

            // Remove markdown code blocks
            if (cleanedResponse.startsWith('```json')) {
                cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
            }

            // Find JSON content
            const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                cleanedResponse = jsonMatch[0];
            }

            return JSON.parse(cleanedResponse);
        } catch (error) {
            console.error('Failed to parse analysis response:', error);
            return this.generateFallbackResponse();
        }
    }

    /**
     * Generate fallback analysis when AI fails
     */
    generateFallbackResponse() {
        return {
            paragraphAnalysis: [{
                paragraphNumber: 1,
                counselorComment: "Your writing shows promise. Focus on adding more specific details and ensuring each paragraph has a clear purpose.",
                improvementPriority: "medium",
                nextSteps: "Review each paragraph and ask: does this advance my main message?"
            }],
            overallAssessment: {
                documentStrengths: ["Clear writing style", "Good effort"],
                criticalImprovements: ["Add more specific examples", "Strengthen connections between ideas"],
                counselorRecommendation: "Continue developing your ideas with more concrete details and examples."
            },
            encouragement: "You're on the right track! Writing is a process, and each revision makes your work stronger."
        };
    }

    /**
     * Rate limiting for API calls
     */
    async waitForRateLimit() {
        const timeSinceLastRequest = Date.now() - this.rateLimiter.lastRequestTime;
        const delay = Math.max(0, this.rateLimiter.minDelay - timeSinceLastRequest);

        if (delay > 0) {
            console.log(`Rate limiting: waiting ${delay}ms`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    /**
     * Make Claude API request
     */
    async makeClaudeAPIRequest(prompt, retryCount = 0) {
        if (!this.claudeApiKey) {
            throw new Error('Claude API key not configured');
        }

        try {
            this.rateLimiter.lastRequestTime = Date.now();

            console.log('Making enhanced analysis request to Claude API...');

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
                timeout: 45000 // Longer timeout for comprehensive analysis
            });

            this.rateLimiter.consecutiveErrors = 0;
            return { response: { text: () => response.data.content[0].text } };

        } catch (error) {
            this.rateLimiter.consecutiveErrors++;
            console.error('Enhanced analysis API error:', error.response?.data || error.message);

            if (retryCount < this.rateLimiter.maxRetries) {
                const retryDelay = this.rateLimiter.minDelay * (retryCount + 1);
                console.log(`Retrying in ${retryDelay}ms...`);
                await new Promise(resolve => setTimeout(resolve, retryDelay));
                return this.makeClaudeAPIRequest(prompt, retryCount + 1);
            }

            throw error;
        }
    }

    /**
     * Get available document types
     */
    getDocumentTypes() {
        return Object.keys(this.documentTypes).map(key => ({
            id: key,
            name: this.documentTypes[key].name,
            requirements: this.documentTypes[key].requirements,
            focusAreas: this.documentTypes[key].focusAreas
        }));
    }

    /**
     * Get analysis depth options
     */
    getAnalysisDepthOptions() {
        return [
            {
                id: 'comprehensive',
                name: 'Comprehensive Analysis',
                description: 'Detailed paragraph-by-paragraph feedback with counselor-level insights',
                estimatedTime: '2-3 minutes',
                tokenUsage: 'High'
            },
            {
                id: 'focused',
                name: 'Focused Analysis',
                description: 'Targeted feedback on specific areas you choose',
                estimatedTime: '1-2 minutes',
                tokenUsage: 'Medium'
            },
            {
                id: 'quick',
                name: 'Quick Analysis',
                description: 'Rapid feedback on major strengths and improvements',
                estimatedTime: '30-60 seconds',
                tokenUsage: 'Low'
            }
        ];
    }
}

module.exports = new EnhancedMozartStrokeService();