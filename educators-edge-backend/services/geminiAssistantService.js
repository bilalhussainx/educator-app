/**
 * Gemini-Style Writing Assistant Service
 *
 * Provides real-time, context-aware writing assistance similar to Google Docs Gemini
 *
 * Features:
 * - Quick actions (rewrite, shorten, elaborate, etc.)
 * - Help me write (generate from scratch)
 * - Continue writing
 * - Tone adjustments
 * - Grammar fixes
 */

const axios = require('axios');

class GeminiAssistantService {
    constructor() {
        this.claudeApiKey = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;
        this.claudeBaseUrl = 'https://api.anthropic.com/v1/messages';

        console.log(`Gemini Assistant Service initialized with ${this.claudeApiKey ? 'Claude API' : 'no API key'}`);

        // Action definitions with prompts
        this.actionPrompts = {
            'help-write': (customPrompt, context) => `You are a writing assistant helping a user create content.

User's request: "${customPrompt}"

Document context (what they've written so far):
"""
${context || 'No existing content'}
"""

Generate natural, flowing content that matches the user's request. Write in a clear, engaging style.

IMPORTANT:
- Only return the generated text
- No explanations or meta-commentary
- Match the tone and style of any existing content
- Be concise but complete

Generated text:`,

            'rewrite': (selectedText) => `Rewrite the following text to improve clarity, flow, and impact while preserving the original meaning:

Original text:
"""
${selectedText}
"""

Rewritten version (return ONLY the improved text, no explanations):`,

            'shorten': (selectedText) => `Make this text more concise while keeping all key information:

Original text:
"""
${selectedText}
"""

Shortened version (return ONLY the condensed text):`,

            'elaborate': (selectedText) => `Expand this text with more details, examples, and explanation while maintaining its core message:

Original text:
"""
${selectedText}
"""

Elaborated version (return ONLY the expanded text):`,

            'formalize': (selectedText) => `Rewrite this in a more formal, professional tone suitable for academic or business writing:

Original text:
"""
${selectedText}
"""

Formalized version (return ONLY the text in formal tone):`,

            'casual': (selectedText) => `Rewrite this in a more casual, conversational tone while keeping it appropriate:

Original text:
"""
${selectedText}
"""

Casual version (return ONLY the text in casual tone):`,

            'continue': (context, cursorPosition) => `Continue writing from where the user left off. Match their style and naturally extend their ideas.

Existing text:
"""
${context}
"""

Continue writing (return ONLY 2-3 sentences that naturally continue the text):`,

            'fix-grammar': (selectedText) => `Fix all grammar, spelling, and punctuation errors in this text:

Original text:
"""
${selectedText}
"""

Corrected version (return ONLY the corrected text with no other changes):`,
        };
    }

    /**
     * Handle quick action requests
     */
    async handleQuickAction(config) {
        const {
            action,
            selectedText = '',
            documentContext = '',
            cursorPosition = 0,
            customPrompt = null
        } = config;

        try {
            console.log(`Gemini Assistant: Processing action "${action}"`);

            // Build prompt based on action
            let prompt;
            switch (action) {
                case 'help-write':
                    if (!customPrompt) {
                        throw new Error('Custom prompt required for help-write action');
                    }
                    prompt = this.actionPrompts['help-write'](customPrompt, documentContext);
                    break;

                case 'continue':
                    if (!documentContext) {
                        throw new Error('Document context required for continue action');
                    }
                    prompt = this.actionPrompts['continue'](documentContext, cursorPosition);
                    break;

                case 'rewrite':
                case 'shorten':
                case 'elaborate':
                case 'formalize':
                case 'casual':
                case 'fix-grammar':
                    if (!selectedText) {
                        throw new Error(`Selected text required for ${action} action`);
                    }
                    prompt = this.actionPrompts[action](selectedText);
                    break;

                default:
                    throw new Error(`Unknown action: ${action}`);
            }

            // Call Claude API
            const suggestion = await this.callClaudeAPI(prompt);

            return {
                success: true,
                suggestion: suggestion.trim(),
                action,
                metadata: {
                    hasSelection: !!selectedText,
                    generatedAt: new Date().toISOString()
                }
            };

        } catch (error) {
            console.error('Gemini Assistant error:', error);
            throw error;
        }
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
                model: 'claude-3-haiku-20240307',
                max_tokens: 2000,
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
                timeout: 30000
            });

            return response.data.content[0].text;

        } catch (error) {
            console.error('Claude API error:', error.response?.data || error.message);
            throw new Error('Failed to generate suggestion');
        }
    }

    /**
     * Generate smart suggestions based on context
     */
    async generateSmartSuggestions(documentContent, cursorPosition) {
        try {
            // Analyze context and provide proactive suggestions
            const prompt = `Analyze this document and suggest 3 specific improvements:

Document:
"""
${documentContent}
"""

Provide 3 actionable suggestions in this format:
1. [Type]: Brief suggestion
2. [Type]: Brief suggestion
3. [Type]: Brief suggestion

Where Type can be: Grammar, Clarity, Flow, Style, Structure`;

            const suggestions = await this.callClaudeAPI(prompt);

            return {
                success: true,
                suggestions: suggestions.split('\n').filter(s => s.trim())
            };

        } catch (error) {
            console.error('Smart suggestions error:', error);
            return {
                success: false,
                suggestions: []
            };
        }
    }
}

module.exports = new GeminiAssistantService();
