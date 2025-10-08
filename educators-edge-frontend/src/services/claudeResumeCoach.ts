/**
 * Claude Resume Coach Service
 * Uses Claude AI to provide comprehensive, educational resume feedback
 */

export interface ResumeAnalysis {
    success: boolean;
    overallAssessment: string;
    structure: AnalysisSection;
    content: AnalysisSection;
    atsCompatibility: AnalysisSection;
    topImprovements: Improvement[];
    strengths: string[];
    error?: string;
}

export interface AnalysisSection {
    score: number; // 1-10
    feedback: string;
    issues: Issue[];
}

export interface Issue {
    title: string;
    description: string;
    severity: 'high' | 'medium' | 'low';
    location?: string; // section or line reference
}

export interface Improvement {
    priority: number; // 1-3
    title: string;
    why: string; // Why it matters
    how: string; // How to fix
    example?: string; // Before/after example
}

class ClaudeResumeCoach {
    private apiKey: string;
    private apiEndpoint = 'https://api.anthropic.com/v1/messages';

    constructor() {
        this.apiKey = import.meta.env.VITE_CLAUDE_API_KEY || '';

        if (!this.apiKey) {
            console.warn('⚠️ Claude API key not configured');
        }
    }

    /**
     * Analyze resume and provide comprehensive feedback
     */
    async analyzeResume(resumeText: string, jobDescription?: string): Promise<ResumeAnalysis> {
        if (!this.apiKey) {
            return {
                success: false,
                overallAssessment: '',
                structure: { score: 0, feedback: '', issues: [] },
                content: { score: 0, feedback: '', issues: [] },
                atsCompatibility: { score: 0, feedback: '', issues: [] },
                topImprovements: [],
                strengths: [],
                error: 'Claude API key not configured. Please add VITE_CLAUDE_API_KEY to your .env file.'
            };
        }

        try {
            const prompt = this.buildAnalysisPrompt(resumeText, jobDescription);
            const response = await this.callClaudeAPI(prompt);

            return this.parseAnalysisResponse(response);
        } catch (error: any) {
            console.error('Claude analysis failed:', error);
            return {
                success: false,
                overallAssessment: '',
                structure: { score: 0, feedback: '', issues: [] },
                content: { score: 0, feedback: '', issues: [] },
                atsCompatibility: { score: 0, feedback: '', issues: [] },
                topImprovements: [],
                strengths: [],
                error: error.message || 'Failed to analyze resume'
            };
        }
    }

    /**
     * Build comprehensive analysis prompt
     */
    private buildAnalysisPrompt(resumeText: string, jobDescription?: string): string {
        const jobContext = jobDescription ? `\n\nTarget Job Description:\n${jobDescription}\n` : '';

        return `You are an expert resume coach helping a job seeker improve their resume. Your goal is to empower them with knowledge and specific, actionable guidance.

Analyze this resume and provide structured feedback in JSON format.

${jobContext}
Resume Content:
${resumeText}

Provide your analysis in this exact JSON structure:

{
  "overallAssessment": "A 1-2 sentence overall assessment",
  "structure": {
    "score": 1-10,
    "feedback": "Brief summary of structure quality",
    "issues": [
      {
        "title": "Issue title",
        "description": "What's wrong and where",
        "severity": "high|medium|low",
        "location": "Section name or area"
      }
    ]
  },
  "content": {
    "score": 1-10,
    "feedback": "Brief summary of content quality",
    "issues": [
      {
        "title": "Issue title",
        "description": "What needs improvement",
        "severity": "high|medium|low",
        "location": "Section or area"
      }
    ]
  },
  "atsCompatibility": {
    "score": 1-10,
    "feedback": "ATS compatibility assessment",
    "issues": [
      {
        "title": "ATS issue",
        "description": "How this affects ATS scanning",
        "severity": "high|medium|low"
      }
    ]
  },
  "topImprovements": [
    {
      "priority": 1,
      "title": "Most important improvement",
      "why": "Why this matters (educational - teach them the principle)",
      "how": "Specific steps to fix",
      "example": "Optional before/after example"
    },
    {
      "priority": 2,
      "title": "Second priority",
      "why": "Why this matters",
      "how": "How to fix",
      "example": "Optional example"
    },
    {
      "priority": 3,
      "title": "Third priority",
      "why": "Why this matters",
      "how": "How to fix",
      "example": "Optional example"
    }
  ],
  "strengths": [
    "Specific strength 1",
    "Specific strength 2",
    "Specific strength 3"
  ]
}

Focus on:
1. Being encouraging but honest
2. Teaching WHY things matter (not just what to fix)
3. Providing specific, actionable guidance
4. Empowering the user to understand resume best practices
5. Highlighting what's working well

Return ONLY the JSON object, no other text.`;
    }

    /**
     * Call Claude API
     */
    private async callClaudeAPI(prompt: string): Promise<string> {
        const response = await fetch(this.apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': this.apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-3-5-sonnet-20241022',
                max_tokens: 4000,
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ]
            })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Claude API error: ${response.status} - ${error}`);
        }

        const data = await response.json();
        return data.content[0].text;
    }

    /**
     * Parse Claude's response into structured format
     */
    private parseAnalysisResponse(response: string): ResumeAnalysis {
        try {
            // Extract JSON from response (in case Claude added any extra text)
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON found in response');
            }

            const parsed = JSON.parse(jsonMatch[0]);

            return {
                success: true,
                ...parsed
            };
        } catch (error: any) {
            console.error('Failed to parse Claude response:', error);
            console.log('Raw response:', response);

            // Return a fallback structure
            return {
                success: false,
                overallAssessment: 'Unable to parse AI response',
                structure: { score: 0, feedback: '', issues: [] },
                content: { score: 0, feedback: '', issues: [] },
                atsCompatibility: { score: 0, feedback: '', issues: [] },
                topImprovements: [],
                strengths: [],
                error: 'Failed to parse AI response'
            };
        }
    }

    /**
     * Analyze a specific section for quick feedback
     */
    async analyzeSection(sectionName: string, sectionText: string): Promise<string> {
        if (!this.apiKey) {
            return 'Claude API key not configured';
        }

        try {
            const prompt = `You are a resume coach. Analyze this ${sectionName} section and provide brief, specific feedback (2-3 sentences):

${sectionText}

Focus on clarity, impact, and professionalism. Be encouraging.`;

            const response = await this.callClaudeAPI(prompt);
            return response;
        } catch (error: any) {
            return 'Failed to analyze section';
        }
    }
}

export default new ClaudeResumeCoach();
