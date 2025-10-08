import apiClient from './apiClient';

interface SmartPromptRequest {
    prompt: string;
    documentContent: string;
    documentType: string;
    wordCount: number;
    requirements: {
        type: string;
        length: string;
        audience: string;
        purpose: string;
        tone: string;
        subject?: string;
        customInstructions?: string;
    };
}

interface AIComment {
    id: string;
    highlightedText: string;
    startOffset: number;
    endOffset: number;
    commentType: string;
    severity: string;
    category: string;
    message: string;
    suggestion: string;
    explanation: string;
    replacementText: string;
    alternatives: string[];
    confidence: number;
}

interface SmartPromptResponse {
    success: boolean;
    response?: string;
    comments?: AIComment[]; // New: inline comments from AI
    metadata?: {
        processingTime?: number;
        totalComments?: number;
        originalPrompt?: string;
        promptDriven?: boolean;
        fallbackMode?: boolean;
    };
    analysisMetadata?: {
        processingTime: number;
        confidence: number;
        responseType: string;
    };
    error?: string;
}

class SmartPromptService {
    private baseUrl = '/api/ai/smart-prompts';
    private rateLimiter = {
        lastRequest: 0,
        minDelay: 3000, // 3 seconds between requests
        maxRetries: 2
    };

    async sendPromptToAI(requestData: SmartPromptRequest): Promise<SmartPromptResponse> {
        try {
            // Rate limiting
            const now = Date.now();
            const timeSinceLastRequest = now - this.rateLimiter.lastRequest;
            if (timeSinceLastRequest < this.rateLimiter.minDelay) {
                const waitTime = this.rateLimiter.minDelay - timeSinceLastRequest;
                await this.delay(waitTime);
            }

            this.rateLimiter.lastRequest = Date.now();

            console.log('📤 Sending smart prompt to Claude API:', {
                promptLength: requestData.prompt.length,
                contentLength: requestData.documentContent.length,
                requirements: requestData.requirements
            });

            // Send request to backend API
            const response = await apiClient.post<SmartPromptResponse>(this.baseUrl, {
                prompt: requestData.prompt,
                documentContent: requestData.documentContent,
                documentType: requestData.documentType,
                wordCount: requestData.wordCount,
                requirements: requestData.requirements,
                analysisType: 'smart_prompt_response',
                userLevel: 'intermediate',
                focusAreas: ['content_improvement', 'writing_quality', 'structural_analysis']
            });

            console.log('✅ Received Claude AI response:', {
                success: response.data.success,
                responseLength: response.data.response?.length,
                confidence: response.data.analysisMetadata?.confidence
            });

            return response.data;

        } catch (error: any) {
            console.error('❌ Smart prompt API error:', error);

            // Return a fallback response that still provides value
            return {
                success: false,
                response: this.generateFallbackResponse(requestData),
                analysisMetadata: {
                    processingTime: 0,
                    confidence: 0.3,
                    responseType: 'fallback'
                },
                error: error.message || 'Failed to connect to AI service'
            };
        }
    }

    private generateFallbackResponse(requestData: SmartPromptRequest): string {
        const { prompt, requirements, wordCount, documentContent } = requestData;

        // Analyze the content for better fallback suggestions
        const contentAnalysis = this.analyzeContent(documentContent, requirements);

        return `**Enhanced Local Analysis** (Smart Fallback Mode)

📝 **Your Request:** "${prompt}"

🎯 **Document Analysis for ${requirements.type.replace('_', ' ')}:**

**Document Overview:**
- **Length:** ${wordCount} words (${this.assessLength(wordCount, requirements.length)})
- **Type:** ${requirements.type.replace('_', ' ')} for ${requirements.audience.replace('_', ' ')}
- **Purpose:** ${requirements.purpose.replace('_', ' ')}
- **Tone:** ${requirements.tone}

✅ **Content Strengths:**
${contentAnalysis.strengths.map(strength => `- ${strength}`).join('\n')}

🎯 **Priority Improvements:**
${contentAnalysis.improvements.map((improvement, index) => `${index + 1}. **${improvement.title}** - ${improvement.description}`).join('\n')}

📊 **Content Quality Metrics:**
- **Readability:** ${contentAnalysis.readabilityScore}/10
- **Structure:** ${contentAnalysis.structureScore}/10
- **Keyword Usage:** ${contentAnalysis.keywordScore}/10
- **Engagement:** ${contentAnalysis.engagementScore}/10

💡 **Smart Suggestions Based on Your Prompt:**
${this.generateSmartSuggestions(prompt, documentContent, requirements)}

🔧 **Technical Feedback:**
- **Sentence Variety:** ${contentAnalysis.sentenceVariety}
- **Paragraph Structure:** ${contentAnalysis.paragraphStructure}
- **Transition Quality:** ${contentAnalysis.transitionQuality}

⚡ **Quick Wins:**
${contentAnalysis.quickWins.map(win => `- ${win}`).join('\n')}

🎯 **Next Steps:**
1. Address the highest priority improvements first
2. Focus on your specific prompt request: "${prompt}"
3. Consider your ${requirements.audience.replace('_', ' ')} audience needs
4. Maintain consistency with your ${requirements.purpose.replace('_', ' ')} purpose

⚠️ **Note:** This enhanced local analysis provides comprehensive feedback. For AI-powered suggestions, ensure internet connectivity.`;
    }

    private analyzeContent(content: string, requirements: any) {
        const words = content.trim().split(/\s+/);
        const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 0);

        const analysis = {
            strengths: [] as string[],
            improvements: [] as {title: string, description: string}[],
            readabilityScore: 0,
            structureScore: 0,
            keywordScore: 0,
            engagementScore: 0,
            sentenceVariety: '',
            paragraphStructure: '',
            transitionQuality: '',
            quickWins: [] as string[]
        };

        // Analyze strengths
        if (words.length > 100) analysis.strengths.push('Substantial content length');
        if (paragraphs.length >= 3) analysis.strengths.push('Well-organized paragraph structure');
        if (content.includes(requirements.audience)) analysis.strengths.push('Audience-aware content');
        if (sentences.length > 5) analysis.strengths.push('Good sentence variety');

        // Analyze improvements needed
        if (words.length < 200) {
            analysis.improvements.push({
                title: 'Expand Content',
                description: 'Add more detail and examples to reach optimal length'
            });
        }
        if (paragraphs.length < 3) {
            analysis.improvements.push({
                title: 'Improve Structure',
                description: 'Break content into clear, focused paragraphs'
            });
        }
        if (!content.toLowerCase().includes('because') && !content.toLowerCase().includes('therefore')) {
            analysis.improvements.push({
                title: 'Add Logical Connections',
                description: 'Include more cause-and-effect relationships'
            });
        }

        // Calculate scores
        analysis.readabilityScore = Math.min(10, Math.round((sentences.length / Math.max(paragraphs.length, 1)) * 2));
        analysis.structureScore = Math.min(10, paragraphs.length * 2);
        analysis.keywordScore = Math.min(10, Math.round(words.length / 50));
        analysis.engagementScore = Math.min(10, Math.round(content.split(/[.!?]/).length / 2));

        // Sentence variety analysis
        const avgSentenceLength = words.length / sentences.length;
        if (avgSentenceLength < 10) analysis.sentenceVariety = 'Short sentences - consider varying length';
        else if (avgSentenceLength > 25) analysis.sentenceVariety = 'Long sentences - consider breaking up complex ideas';
        else analysis.sentenceVariety = 'Good sentence length variety';

        // Paragraph structure
        const avgParagraphLength = words.length / paragraphs.length;
        if (avgParagraphLength < 30) analysis.paragraphStructure = 'Short paragraphs - consider developing ideas more';
        else if (avgParagraphLength > 150) analysis.paragraphStructure = 'Long paragraphs - consider breaking into focused sections';
        else analysis.paragraphStructure = 'Well-balanced paragraph length';

        // Transition quality
        const transitions = ['however', 'furthermore', 'therefore', 'moreover', 'consequently'];
        const transitionCount = transitions.filter(t => content.toLowerCase().includes(t)).length;
        analysis.transitionQuality = transitionCount > 2 ? 'Strong use of transitions' : 'Consider adding more transitional phrases';

        // Quick wins
        if (!content.trim().endsWith('.') && !content.trim().endsWith('!') && !content.trim().endsWith('?')) {
            analysis.quickWins.push('Add proper punctuation to conclusion');
        }
        if (content.includes('  ')) {
            analysis.quickWins.push('Remove extra spaces for cleaner formatting');
        }
        if (paragraphs.length === 1 && words.length > 100) {
            analysis.quickWins.push('Break single large paragraph into focused sections');
        }

        return analysis;
    }

    private assessLength(wordCount: number, targetLength: string): string {
        const targets = {
            'short': [50, 200],
            'medium': [200, 500],
            'long': [500, 1000],
            'very_long': [1000, 2000]
        };

        const target = targets[targetLength as keyof typeof targets] || [200, 500];
        const [min, max] = target;

        if (wordCount < min) return `Below target (need ${min - wordCount} more words)`;
        if (wordCount > max) return `Above target (consider reducing by ${wordCount - max} words)`;
        return 'Perfect length for target';
    }

    private generateSmartSuggestions(prompt: string, content: string, requirements: any): string {
        const suggestions = [];

        if (prompt.toLowerCase().includes('improve')) {
            suggestions.push('Focus on the weakest areas identified in the analysis above');
        }
        if (prompt.toLowerCase().includes('make') && prompt.toLowerCase().includes('better')) {
            suggestions.push('Consider your audience needs and adjust tone accordingly');
        }
        if (prompt.toLowerCase().includes('help')) {
            suggestions.push('Start with the quick wins for immediate improvement');
        }
        if (prompt.toLowerCase().includes('review')) {
            suggestions.push('Check each paragraph serves your main purpose clearly');
        }

        return suggestions.length > 0 ? suggestions.join('\n- ') : 'Focus on clarity, engagement, and purpose alignment';
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Method to check if AI service is available
    async checkServiceStatus(): Promise<boolean> {
        try {
            const response = await apiClient.get('/api/ai/health');
            return response.status === 200;
        } catch {
            return false;
        }
    }
}

export default new SmartPromptService();
export type { SmartPromptRequest, SmartPromptResponse, AIComment };