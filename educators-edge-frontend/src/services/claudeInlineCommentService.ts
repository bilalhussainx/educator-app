import { InlineComment } from '../components/analysis/InlineCommentSystem';
import apiClient from './apiClient';

interface ClaudeAnalysisConfig {
    documentType: 'college_essay' | 'academic_paper' | 'creative_writing' | 'business_document';
    analysisDepth: 'basic' | 'dense' | 'very_dense';
    focusAreas: string[];
    userLevel: 'beginner' | 'intermediate' | 'advanced';
}

interface ClaudeCommentResponse {
    success: boolean;
    comments: ClaudeInlineComment[];
    analysisMetadata: {
        totalComments: number;
        commentTypes: Record<string, number>;
        analysisTime: number;
        confidence: number;
    };
    error?: string;
}

interface ClaudeInlineComment {
    id: string;
    startOffset: number;
    endOffset: number;
    highlightedText: string;
    commentType: 'praise' | 'suggestion' | 'correction' | 'question' | 'enhancement' | 'flow' | 'style';
    severity: 'positive' | 'minor' | 'moderate' | 'major';
    message: string;
    suggestion?: string;
    explanation: string;
    alternatives?: string[];
    confidence: number;
    category: string;
    requirementAlignment?: string;
}

class ClaudeInlineCommentService {
    private baseUrl = '/api/ai/scribe';
    private rateLimiter = {
        lastRequest: 0,
        minDelay: 5000, // 5 seconds between requests for Claude API
        maxRetries: 2,
        requestCount: 0,
        maxRequestsPerMinute: 10, // Conservative rate limit
        windowStart: Date.now()
    };

    async generateInlineComments(
        documentContent: string,
        config: ClaudeAnalysisConfig
    ): Promise<InlineComment[]> {
        try {
            // Rate limiting
            await this.waitForRateLimit();

            console.log('Generating Claude-powered inline comments...', config);

            const response = await apiClient.post(`${this.baseUrl}/claude-inline-analysis`, {
                documentContent,
                config,
                analysisType: 'inline_comments'
            });

            if (response.data.success) {
                const claudeComments = response.data.comments as ClaudeInlineComment[];
                return this.convertClaudeCommentsToInlineComments(claudeComments);
            } else {
                throw new Error(response.data.error || 'Claude analysis failed');
            }

        } catch (error) {
            console.error('Claude inline comment generation failed:', error);
            throw error;
        }
    }

    async generateDenseComments(
        documentContent: string,
        density: 'basic' | 'dense' | 'very_dense' = 'dense'
    ): Promise<InlineComment[]> {
        try {
            await this.waitForRateLimit();

            console.log(`Generating ${density} Claude comments...`);

            const response = await apiClient.post(`${this.baseUrl}/claude-dense-analysis`, {
                documentContent,
                density,
                analysisType: 'dense_inline_comments'
            });

            if (response.data.success) {
                const claudeComments = response.data.comments as ClaudeInlineComment[];
                return this.convertClaudeCommentsToInlineComments(claudeComments);
            } else {
                throw new Error(response.data.error || 'Dense analysis failed');
            }

        } catch (error) {
            console.error('Claude dense comment generation failed:', error);
            throw error;
        }
    }

    async generateParagraphByParagraphAnalysis(
        documentContent: string,
        requirements: string[] = []
    ): Promise<InlineComment[]> {
        try {
            await this.waitForRateLimit();

            console.log('Generating paragraph-by-paragraph Claude analysis...');

            const response = await apiClient.post(`${this.baseUrl}/claude-paragraph-analysis`, {
                documentContent,
                requirements,
                analysisType: 'paragraph_by_paragraph'
            });

            if (response.data.success) {
                const claudeComments = response.data.comments as ClaudeInlineComment[];
                return this.convertClaudeCommentsToInlineComments(claudeComments);
            } else {
                throw new Error(response.data.error || 'Paragraph analysis failed');
            }

        } catch (error) {
            console.error('Claude paragraph analysis failed:', error);
            throw error;
        }
    }

    private convertClaudeCommentsToInlineComments(claudeComments: ClaudeInlineComment[]): InlineComment[] {
        return claudeComments.map(comment => ({
            id: comment.id,
            startOffset: comment.startOffset,
            endOffset: comment.endOffset,
            text: comment.highlightedText,
            highlightedText: comment.highlightedText,
            type: comment.commentType,
            severity: comment.severity,
            message: comment.message,
            suggestion: comment.suggestion,
            explanation: comment.explanation,
            alternatives: comment.alternatives || [],
            confidence: comment.confidence,
            category: comment.category,
            timestamp: new Date()
        }));
    }

    private async waitForRateLimit(): Promise<void> {
        const now = Date.now();

        // Reset window if minute has passed
        if (now - this.rateLimiter.windowStart > 60000) {
            this.rateLimiter.requestCount = 0;
            this.rateLimiter.windowStart = now;
        }

        // Check requests per minute limit
        if (this.rateLimiter.requestCount >= this.rateLimiter.maxRequestsPerMinute) {
            const waitTime = 60000 - (now - this.rateLimiter.windowStart);
            console.log(`Claude API rate limit: ${this.rateLimiter.requestCount} requests in current minute. Waiting ${waitTime}ms...`);
            throw new Error(`Rate limit exceeded. Please wait ${Math.ceil(waitTime / 1000)} seconds before trying again.`);
        }

        // Check minimum delay between requests
        const timeSinceLastRequest = now - this.rateLimiter.lastRequest;
        if (timeSinceLastRequest < this.rateLimiter.minDelay) {
            const delay = this.rateLimiter.minDelay - timeSinceLastRequest;
            console.log(`Claude API rate limiting: waiting ${delay}ms between requests`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }

        // Update counters
        this.rateLimiter.lastRequest = Date.now();
        this.rateLimiter.requestCount++;

        console.log(`Claude API request ${this.rateLimiter.requestCount}/${this.rateLimiter.maxRequestsPerMinute} in current minute`);
    }

    getServiceStatus(): { ready: boolean; message: string; nextAvailable?: number; requestsRemaining?: number } {
        const now = Date.now();
        const timeSinceLastRequest = now - this.rateLimiter.lastRequest;

        // Reset window if minute has passed
        if (now - this.rateLimiter.windowStart > 60000) {
            this.rateLimiter.requestCount = 0;
            this.rateLimiter.windowStart = now;
        }

        const requestsRemaining = this.rateLimiter.maxRequestsPerMinute - this.rateLimiter.requestCount;

        // Check if rate limited by requests per minute
        if (this.rateLimiter.requestCount >= this.rateLimiter.maxRequestsPerMinute) {
            const waitTime = 60000 - (now - this.rateLimiter.windowStart);
            return {
                ready: false,
                message: `Rate limited - ${this.rateLimiter.requestCount} requests used this minute`,
                nextAvailable: this.rateLimiter.windowStart + 60000,
                requestsRemaining: 0
            };
        }

        // Check if rate limited by minimum delay
        if (timeSinceLastRequest < this.rateLimiter.minDelay) {
            return {
                ready: false,
                message: `Rate limited - ${Math.ceil((this.rateLimiter.minDelay - timeSinceLastRequest) / 1000)}s until next request`,
                nextAvailable: this.rateLimiter.lastRequest + this.rateLimiter.minDelay,
                requestsRemaining
            };
        }

        return {
            ready: true,
            message: `Claude API ready (${requestsRemaining} requests remaining this minute)`,
            requestsRemaining
        };
    }
}

export default new ClaudeInlineCommentService();