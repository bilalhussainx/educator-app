/**
 * Comprehensive AI Writing Coach Service
 *
 * Provides full document analysis with 30-50+ comprehensive comments.
 * Analyzes documents from start to finish with detailed, actionable feedback.
 */

const axios = require('axios');
const crypto = require('crypto');

class ComprehensiveAICoachService {
    constructor() {
        this.claudeApiKey = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;
        this.claudeBaseUrl = 'https://api.anthropic.com/v1/messages';

        console.log(`Comprehensive AI Coach Service initialized with ${this.claudeApiKey ? 'Claude API' : 'no API key'}`);
    }

    /**
     * Perform comprehensive document analysis
     */
    async analyzeDocument(documentContent, sessionId = null) {
        if (!documentContent || documentContent.length < 50) {
            throw new Error('Document too short for analysis');
        }

        try {
            console.log(`Starting comprehensive analysis (${documentContent.length} chars)...`);

            // Build comprehensive analysis prompt
            const prompt = this.buildComprehensivePrompt(documentContent);

            // Call Claude API
            const response = await this.callClaudeAPI(prompt);

            // Parse response
            const analysisResult = this.parseAnalysisResponse(response);

            console.log(`Analysis complete: ${analysisResult.comments.length} comments generated`);

            return {
                success: true,
                comments: analysisResult.comments,
                analysis: analysisResult.analysis,
                metadata: {
                    totalComments: analysisResult.comments.length,
                    documentLength: documentContent.length,
                    wordCount: documentContent.split(/\s+/).length,
                    generatedAt: new Date().toISOString()
                }
            };

        } catch (error) {
            console.error('Comprehensive analysis error:', error);

            // Return fallback analysis
            return this.generateFallbackAnalysis(documentContent);
        }
    }

    /**
     * Build comprehensive analysis prompt
     */
    buildComprehensivePrompt(documentContent) {
        return `You are an expert writing coach providing comprehensive, paragraph-by-paragraph feedback on a student's essay.

CRITICAL INSTRUCTIONS:
1. Analyze the ENTIRE document from start to finish - not just the beginning
2. Provide 30-50+ specific, actionable comments
3. For each comment, provide the exact text from the document and a concrete replacement
4. Cover all aspects: structure, clarity, word choice, flow, engagement, grammar, style
5. Ensure comments are distributed throughout the ENTIRE document

DOCUMENT TO ANALYZE:
"""
${documentContent}
"""

Provide your analysis in the following JSON format:

{
  "comments": [
    {
      "highlightedText": "exact text from document",
      "startOffset": 0,
      "endOffset": 50,
      "category": "Word Choice" | "Structure" | "Clarity" | "Grammar" | "Flow" | "Engagement" | "Style",
      "severity": "critical" | "important" | "suggestion" | "positive",
      "message": "Brief explanation of the issue or strength",
      "suggestion": "Specific recommendation for improvement",
      "replacementText": "Exact replacement text (if applicable)",
      "explanation": "Detailed explanation of why this matters"
    }
  ],
  "analysis": {
    "overallScore": 75,
    "strengths": [
      "Strong opening that captures attention",
      "Clear thesis statement",
      "Good use of specific examples"
    ],
    "improvements": [
      "Transitions between paragraphs need strengthening",
      "Conclusion could be more impactful",
      "Some sentences are overly complex"
    ],
    "structure": {
      "hasIntroduction": true,
      "hasBodyParagraphs": true,
      "hasConclusion": true,
      "flowScore": 0.75
    },
    "tone": {
      "clarity": 0.8,
      "engagement": 0.7,
      "professionalism": 0.85
    }
  }
}

IMPORTANT RULES:
- Generate AT LEAST 30 comments (aim for 40-50)
- Analyze from BEGINNING to END of the document
- Include both positive comments (what's working) and constructive feedback
- Make every comment specific and actionable
- Provide exact replacement text whenever possible
- Focus on helping the writer improve, not just criticizing
- Ensure comments are evenly distributed across the entire document

Start your response with a '{' character and provide valid JSON only.`;
    }

    /**
     * Call Claude API
     */
    async callClaudeAPI(prompt) {
        if (!this.claudeApiKey) {
            throw new Error('Claude API key not configured');
        }

        try {
            const response = await axios.post(this.claudeBaseUrl, {
                model: 'claude-3-5-sonnet-20240620',
                max_tokens: 16000, // Large token limit for comprehensive feedback
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
                timeout: 90000 // 90 second timeout for comprehensive analysis
            });

            return response.data.content[0].text;

        } catch (error) {
            console.error('Claude API error:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Parse analysis response from Claude
     */
    parseAnalysisResponse(responseText) {
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

            // Validate structure
            if (!parsed.comments || !Array.isArray(parsed.comments)) {
                throw new Error('Invalid comments structure');
            }

            if (!parsed.analysis) {
                throw new Error('Missing analysis section');
            }

            // Add IDs to comments
            parsed.comments = parsed.comments.map((comment, index) => ({
                ...comment,
                id: `ai_coach_${Date.now()}_${index}`,
                confidence: 0.85
            }));

            return parsed;

        } catch (error) {
            console.error('Error parsing analysis response:', error);
            throw error;
        }
    }

    /**
     * Generate fallback analysis when Claude API fails
     */
    generateFallbackAnalysis(documentContent) {
        console.log('Generating fallback analysis...');

        const paragraphs = documentContent.split(/\n\n+/).filter(p => p.trim().length > 0);
        const sentences = documentContent.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const words = documentContent.split(/\s+/).length;

        const comments = [];

        // Generate basic structure comments
        if (paragraphs.length < 3) {
            comments.push({
                id: `fallback_${Date.now()}_1`,
                highlightedText: documentContent.substring(0, 50),
                startOffset: 0,
                endOffset: 50,
                category: 'Structure',
                severity: 'important',
                message: 'Your essay could benefit from clearer paragraph structure',
                suggestion: 'Consider breaking your content into introduction, body paragraphs, and conclusion',
                replacementText: '',
                explanation: 'Well-structured essays with distinct paragraphs are easier to follow and more persuasive',
                confidence: 0.8
            });
        }

        // Analyze each paragraph
        paragraphs.forEach((para, idx) => {
            const paraStart = documentContent.indexOf(para);
            const paraEnd = paraStart + para.length;

            // Comment on paragraph length
            if (para.split(/\s+/).length > 150) {
                comments.push({
                    id: `fallback_${Date.now()}_para_${idx}_1`,
                    highlightedText: para.substring(0, 100),
                    startOffset: paraStart,
                    endOffset: paraStart + 100,
                    category: 'Clarity',
                    severity: 'suggestion',
                    message: 'This paragraph is quite long',
                    suggestion: 'Consider breaking this into 2-3 shorter paragraphs for better readability',
                    replacementText: '',
                    explanation: 'Shorter paragraphs help readers digest information more easily',
                    confidence: 0.75
                });
            }

            // Comment on paragraph transitions
            if (idx > 0 && !this.hasTransitionWord(para)) {
                comments.push({
                    id: `fallback_${Date.now()}_para_${idx}_2`,
                    highlightedText: para.substring(0, 50),
                    startOffset: paraStart,
                    endOffset: paraStart + 50,
                    category: 'Flow',
                    severity: 'suggestion',
                    message: 'This paragraph could use a transition from the previous one',
                    suggestion: 'Start with a transitional phrase like "Furthermore," "However," or "In addition,"',
                    replacementText: '',
                    explanation: 'Transitions help guide readers through your argument',
                    confidence: 0.7
                });
            }
        });

        // Add some positive feedback
        comments.push({
            id: `fallback_${Date.now()}_positive`,
            highlightedText: documentContent.substring(0, 50),
            startOffset: 0,
            endOffset: 50,
            category: 'Engagement',
            severity: 'positive',
            message: 'Your writing shows promise and clear effort',
            suggestion: 'Keep refining your work with the specific suggestions provided',
            replacementText: '',
            explanation: 'Good writing is a process of continuous improvement',
            confidence: 1.0
        });

        // General advice comment
        comments.push({
            id: `fallback_${Date.now()}_info`,
            highlightedText: documentContent.substring(0, 30),
            startOffset: 0,
            endOffset: 30,
            category: 'System',
            severity: 'suggestion',
            message: 'AI analysis is running in fallback mode',
            suggestion: 'For comprehensive AI feedback with 30-50+ detailed comments, configure the Claude API key',
            replacementText: '',
            explanation: 'The full AI Coach system provides detailed, expert-level feedback when properly configured',
            confidence: 1.0
        });

        return {
            success: true,
            comments,
            analysis: {
                overallScore: 70,
                strengths: [
                    'Clear writing effort demonstrated',
                    `Document length of ${words} words is substantial`,
                    'Content shows engagement with the topic'
                ],
                improvements: [
                    'Consider adding more specific examples',
                    'Strengthen transitions between ideas',
                    'Review for clarity and conciseness'
                ],
                structure: {
                    hasIntroduction: paragraphs.length >= 1,
                    hasBodyParagraphs: paragraphs.length >= 2,
                    hasConclusion: paragraphs.length >= 3,
                    flowScore: 0.6
                },
                tone: {
                    clarity: 0.7,
                    engagement: 0.65,
                    professionalism: 0.75
                }
            },
            metadata: {
                totalComments: comments.length,
                documentLength: documentContent.length,
                wordCount: words,
                fallbackMode: true,
                generatedAt: new Date().toISOString()
            }
        };
    }

    /**
     * Check if paragraph has transition word
     */
    hasTransitionWord(paragraph) {
        const transitionWords = [
            'however', 'furthermore', 'moreover', 'additionally', 'therefore',
            'thus', 'consequently', 'meanwhile', 'nevertheless', 'nonetheless',
            'in addition', 'for example', 'for instance', 'on the other hand',
            'as a result', 'in contrast', 'similarly', 'likewise', 'first',
            'second', 'third', 'finally', 'in conclusion'
        ];

        const lowerPara = paragraph.toLowerCase();
        return transitionWords.some(word => lowerPara.startsWith(word));
    }
}

module.exports = new ComprehensiveAICoachService();
