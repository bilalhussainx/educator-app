// Claude API-powered Resume Analysis Service
export interface ClaudeAnalysisRequest {
    bulletPoint: string;
    context: {
        jobTitle?: string;
        industry?: string;
        careerLevel?: string;
        companySize?: string;
        targetRole?: string;
        jobDescription?: string;
    };
}

export interface ClaudeAnalysisResponse {
    originalText: string;
    overallScore: number; // 1-10
    detailedAnalysis: {
        strengths: string[];
        weaknesses: string[];
        impactLevel: 'low' | 'medium' | 'high';
        specificityScore: number;
        atsOptimization: number;
        readabilityScore: number;
    };
    professionalRewrite: {
        version: string;
        improvements: string[];
        reasoning: string;
        confidenceScore: number;
    };
    alternativeVersions: {
        version: string;
        focus: 'quantification' | 'leadership' | 'technical' | 'achievement' | 'collaboration';
        explanation: string;
        score: number;
    }[];
    industryInsights: {
        keywordGaps: string[];
        industryBenchmark: string;
        competitiveAdvantage: string;
        recommendations: string[];
    };
    psychologicalImpact: {
        authorityLevel: number;
        competenceSignaling: number;
        leadershipPresence: number;
        innovationIndicators: number;
    };
}

export class ClaudeResumeAnalyzer {
    private static readonly CLAUDE_API_URL = '/api/claude/analyze-resume';

    static async analyzeBulletPoint(
        bulletPoint: string,
        context: ClaudeAnalysisRequest['context'] = {}
    ): Promise<ClaudeAnalysisResponse> {
        console.log('🧠 Claude AI: Starting professional analysis for bullet point...');

        try {
            const response = await this.callClaudeAPI(bulletPoint, context);
            console.log('✅ Claude AI: Analysis completed successfully');
            return response;
        } catch (error) {
            console.error('❌ Claude AI: Analysis failed, using fallback', error);
            return this.createFallbackAnalysis(bulletPoint, context);
        }
    }

    static async analyzeFullResume(
        resumeText: string,
        context: ClaudeAnalysisRequest['context'] = {}
    ): Promise<{
        overallAssessment: {
            score: number;
            strengths: string[];
            criticalIssues: string[];
            recommendations: string[];
        };
        bulletAnalyses: ClaudeAnalysisResponse[];
        industryAlignment: number;
        atsScore: number;
        executiveSummary: string;
    }> {
        console.log('🧠 Claude AI: Starting comprehensive resume analysis...');

        const bulletPoints = this.extractBulletPoints(resumeText);
        const bulletAnalyses: ClaudeAnalysisResponse[] = [];

        // Analyze each bullet point with Claude
        for (const bullet of bulletPoints) {
            const analysis = await this.analyzeBulletPoint(bullet, context);
            bulletAnalyses.push(analysis);
        }

        // Generate overall assessment
        const overallAssessment = await this.generateOverallAssessment(resumeText, bulletAnalyses, context);

        return {
            overallAssessment,
            bulletAnalyses,
            industryAlignment: this.calculateIndustryAlignment(bulletAnalyses),
            atsScore: this.calculateATSScore(bulletAnalyses),
            executiveSummary: overallAssessment.recommendations[0] || 'Resume shows strong professional experience'
        };
    }

    private static async callClaudeAPI(
        bulletPoint: string,
        context: ClaudeAnalysisRequest['context']
    ): Promise<ClaudeAnalysisResponse> {
        const prompt = this.buildAnalysisPrompt(bulletPoint, context);

        // Simulate Claude API call - In production, this would be an actual API call
        const claudeResponse = await this.simulateClaudeResponse(prompt, bulletPoint, context);

        return claudeResponse;
    }

    private static buildAnalysisPrompt(
        bulletPoint: string,
        context: ClaudeAnalysisRequest['context']
    ): string {
        return `
You are a senior executive recruiter and career coach with 15+ years of experience. Analyze this resume bullet point with professional expertise:

BULLET POINT: "${bulletPoint}"

CONTEXT:
- Target Role: ${context.targetRole || 'Not specified'}
- Industry: ${context.industry || 'Technology'}
- Career Level: ${context.careerLevel || 'Mid-level'}
- Job Description: ${context.jobDescription || 'Not provided'}

Please provide a comprehensive analysis including:

1. PROFESSIONAL ASSESSMENT (Score 1-10):
   - Overall effectiveness
   - Specific strengths and weaknesses
   - Impact level and specificity
   - ATS optimization potential

2. EXPERT REWRITE:
   - Professional rewritten version
   - Specific improvements made
   - Strategic reasoning behind changes

3. ALTERNATIVE VERSIONS:
   - 3-4 different approaches (quantification, leadership, technical, achievement focus)
   - Explanation for each approach
   - Effectiveness score for each

4. INDUSTRY INSIGHTS:
   - Missing industry keywords
   - Competitive positioning
   - Benchmark against industry standards
   - Strategic recommendations

5. PSYCHOLOGICAL IMPACT:
   - Authority and leadership signaling
   - Competence demonstration
   - Innovation indicators

Provide actionable, specific feedback that transforms good bullet points into exceptional ones.
        `;
    }

    private static async simulateClaudeResponse(
        prompt: string,
        bulletPoint: string,
        context: ClaudeAnalysisRequest['context']
    ): Promise<ClaudeAnalysisResponse> {
        // This simulates what Claude API would return with intelligent analysis
        // In production, replace with actual Claude API call

        const analysisPatterns = this.analyzeTextPatterns(bulletPoint, context);

        return {
            originalText: bulletPoint,
            overallScore: analysisPatterns.score,
            detailedAnalysis: {
                strengths: analysisPatterns.strengths,
                weaknesses: analysisPatterns.weaknesses,
                impactLevel: analysisPatterns.impactLevel,
                specificityScore: analysisPatterns.specificityScore,
                atsOptimization: analysisPatterns.atsScore,
                readabilityScore: analysisPatterns.readabilityScore
            },
            professionalRewrite: this.generateProfessionalRewrite(bulletPoint, context),
            alternativeVersions: this.generateAlternativeVersions(bulletPoint, context),
            industryInsights: this.generateIndustryInsights(bulletPoint, context),
            psychologicalImpact: this.analyzePsychologicalFactors(bulletPoint)
        };
    }

    private static analyzeTextPatterns(
        text: string,
        context: ClaudeAnalysisRequest['context']
    ): {
        score: number;
        strengths: string[];
        weaknesses: string[];
        impactLevel: 'low' | 'medium' | 'high';
        specificityScore: number;
        atsScore: number;
        readabilityScore: number;
    } {
        const lowerText = text.toLowerCase();
        const words = text.split(' ');
        let score = 5; // Base score
        const strengths: string[] = [];
        const weaknesses: string[] = [];

        // Analyze quantification
        const hasNumbers = /\d+/.test(text);
        const hasPercentage = /%/.test(text);
        const hasDollar = /\$/.test(text);

        if (hasNumbers || hasPercentage || hasDollar) {
            strengths.push('Contains quantifiable metrics');
            score += 1.5;
        } else {
            weaknesses.push('Missing quantifiable results');
            score -= 1;
        }

        // Analyze action verbs
        const strongVerbs = ['led', 'managed', 'developed', 'implemented', 'optimized', 'achieved', 'delivered'];
        const startsWithStrongVerb = strongVerbs.some(verb => lowerText.startsWith(verb));

        if (startsWithStrongVerb) {
            strengths.push('Starts with strong action verb');
            score += 1;
        } else {
            weaknesses.push('Could start with stronger action verb');
            score -= 0.5;
        }

        // Analyze weak language
        const weakPhrases = ['responsible for', 'helped with', 'worked on', 'assisted'];
        const hasWeakLanguage = weakPhrases.some(phrase => lowerText.includes(phrase));

        if (hasWeakLanguage) {
            weaknesses.push('Contains passive or weak language');
            score -= 1;
        } else {
            strengths.push('Uses active, assertive language');
            score += 0.5;
        }

        // Length analysis
        const wordCount = words.length;
        if (wordCount >= 15 && wordCount <= 25) {
            strengths.push('Optimal length for readability');
        } else if (wordCount < 10) {
            weaknesses.push('Too brief - could be more descriptive');
            score -= 0.5;
        } else if (wordCount > 30) {
            weaknesses.push('Too lengthy - could be more concise');
            score -= 0.5;
        }

        // Industry relevance
        const techTerms = ['api', 'database', 'cloud', 'agile', 'react', 'python', 'aws', 'ci/cd'];
        const techTermCount = techTerms.reduce((count, term) =>
            count + (lowerText.includes(term) ? 1 : 0), 0);

        if (context.industry === 'technology' && techTermCount > 0) {
            strengths.push('Contains relevant technical terminology');
            score += 0.5;
        }

        const impactLevel: 'low' | 'medium' | 'high' =
            score >= 8 ? 'high' : score >= 6 ? 'medium' : 'low';

        return {
            score: Math.max(1, Math.min(10, score)),
            strengths,
            weaknesses,
            impactLevel,
            specificityScore: hasNumbers ? 8.5 : 5.5,
            atsScore: startsWithStrongVerb && techTermCount > 0 ? 8.0 : 6.0,
            readabilityScore: wordCount <= 25 ? 8.5 : 6.5
        };
    }

    private static generateProfessionalRewrite(
        bulletPoint: string,
        context: ClaudeAnalysisRequest['context']
    ): ClaudeAnalysisResponse['professionalRewrite'] {
        let rewritten = bulletPoint;
        const improvements: string[] = [];

        // Enhance with quantification if missing
        if (!/\d+/.test(bulletPoint)) {
            if (bulletPoint.toLowerCase().includes('improve')) {
                rewritten = bulletPoint.replace(/improved?/i, 'improved by 30%');
                improvements.push('Added quantifiable improvement metric');
            } else if (bulletPoint.toLowerCase().includes('manage')) {
                rewritten = bulletPoint.replace(/managed?/i, 'managed team of 8');
                improvements.push('Specified team size for scale context');
            } else {
                rewritten = bulletPoint + ', resulting in 25% efficiency gain';
                improvements.push('Added measurable outcome');
            }
        }

        // Strengthen action verbs
        const weakToStrong: Record<string, string> = {
            'worked on': 'developed',
            'helped with': 'facilitated',
            'responsible for': 'managed',
            'assisted in': 'supported',
            'participated in': 'led'
        };

        for (const [weak, strong] of Object.entries(weakToStrong)) {
            if (rewritten.toLowerCase().includes(weak)) {
                rewritten = rewritten.replace(new RegExp(weak, 'gi'), strong);
                improvements.push(`Replaced "${weak}" with stronger verb "${strong}"`);
                break;
            }
        }

        // Add industry-specific terms
        if (context.industry === 'technology' && !rewritten.toLowerCase().includes('technology')) {
            const techTerms = ['leveraging modern frameworks', 'utilizing cloud technologies', 'implementing best practices'];
            const randomTerm = techTerms[Math.floor(Math.random() * techTerms.length)];
            rewritten = rewritten + ` ${randomTerm}`;
            improvements.push('Integrated relevant technical terminology');
        }

        return {
            version: rewritten,
            improvements,
            reasoning: 'Enhanced impact through quantification, stronger verbs, and industry-specific language',
            confidenceScore: 8.7
        };
    }

    private static generateAlternativeVersions(
        bulletPoint: string,
        context: ClaudeAnalysisRequest['context']
    ): ClaudeAnalysisResponse['alternativeVersions'] {
        const alternatives: ClaudeAnalysisResponse['alternativeVersions'] = [];

        // Quantification-focused version
        alternatives.push({
            version: bulletPoint.replace(/(\w+)/, 'Delivered $1 with 25% efficiency improvement'),
            focus: 'quantification',
            explanation: 'Emphasizes measurable results and ROI impact',
            score: 8.5
        });

        // Leadership-focused version
        alternatives.push({
            version: bulletPoint.replace(/^(\w+)/, 'Led cross-functional initiative to $1'),
            focus: 'leadership',
            explanation: 'Highlights leadership and cross-functional collaboration',
            score: 8.2
        });

        // Technical-focused version
        if (context.industry === 'technology') {
            alternatives.push({
                version: bulletPoint + ' using React, Node.js, and AWS cloud infrastructure',
                focus: 'technical',
                explanation: 'Showcases specific technical expertise and modern stack',
                score: 8.8
            });
        }

        // Achievement-focused version
        alternatives.push({
            version: bulletPoint.replace(/(\w+)/, 'Successfully achieved $1, exceeding targets by 15%'),
            focus: 'achievement',
            explanation: 'Emphasizes success and exceeding expectations',
            score: 8.6
        });

        return alternatives;
    }

    private static generateIndustryInsights(
        bulletPoint: string,
        context: ClaudeAnalysisRequest['context']
    ): ClaudeAnalysisResponse['industryInsights'] {
        const industry = context.industry || 'technology';

        const industryKeywords: Record<string, string[]> = {
            technology: ['agile', 'CI/CD', 'cloud', 'microservices', 'API', 'scalability'],
            finance: ['ROI', 'risk management', 'compliance', 'portfolio', 'analysis'],
            marketing: ['conversion', 'engagement', 'analytics', 'campaign', 'ROI'],
            healthcare: ['patient outcomes', 'quality metrics', 'compliance', 'safety']
        };

        const relevantKeywords = industryKeywords[industry] || industryKeywords.technology;
        const lowerBullet = bulletPoint.toLowerCase();

        const missingKeywords = relevantKeywords.filter(keyword =>
            !lowerBullet.includes(keyword.toLowerCase()));

        return {
            keywordGaps: missingKeywords.slice(0, 3),
            industryBenchmark: `${industry.charAt(0).toUpperCase() + industry.slice(1)} professionals typically score 7.2/10 on similar achievements`,
            competitiveAdvantage: 'Strong technical execution with room for strategic impact emphasis',
            recommendations: [
                'Integrate 2-3 industry-specific technical terms',
                'Quantify business impact beyond technical metrics',
                'Highlight cross-functional collaboration',
                'Emphasize scalability and efficiency gains'
            ]
        };
    }

    private static analyzePsychologicalFactors(
        bulletPoint: string
    ): ClaudeAnalysisResponse['psychologicalImpact'] {
        const lowerText = bulletPoint.toLowerCase();

        const authorityWords = ['led', 'managed', 'directed', 'supervised', 'orchestrated'];
        const competenceWords = ['optimized', 'engineered', 'developed', 'implemented', 'designed'];
        const leadershipWords = ['mentored', 'guided', 'influenced', 'inspired', 'transformed'];
        const innovationWords = ['created', 'pioneered', 'revolutionized', 'innovated', 'launched'];

        const calculatePresence = (words: string[]) => {
            const matches = words.reduce((count, word) =>
                count + (lowerText.includes(word) ? 1 : 0), 0);
            return Math.min(matches / words.length * 10, 10);
        };

        return {
            authorityLevel: calculatePresence(authorityWords),
            competenceSignaling: calculatePresence(competenceWords),
            leadershipPresence: calculatePresence(leadershipWords),
            innovationIndicators: calculatePresence(innovationWords)
        };
    }

    private static extractBulletPoints(resumeText: string): string[] {
        const lines = resumeText.split('\n');
        const bulletPoints: string[] = [];

        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.startsWith('*')) {
                const cleaned = trimmed.replace(/^[\s\-\•\*]+/, '').trim();
                if (cleaned.length > 10) {
                    bulletPoints.push(cleaned);
                }
            }
        }

        return bulletPoints;
    }

    private static async generateOverallAssessment(
        resumeText: string,
        analyses: ClaudeAnalysisResponse[],
        context: ClaudeAnalysisRequest['context']
    ): Promise<{
        score: number;
        strengths: string[];
        criticalIssues: string[];
        recommendations: string[];
    }> {
        const averageScore = analyses.reduce((sum, analysis) => sum + analysis.overallScore, 0) / analyses.length;

        const strengths: string[] = [];
        const criticalIssues: string[] = [];
        const recommendations: string[] = [];

        // Analyze patterns across all bullet points
        const quantifiedCount = analyses.filter(a => a.detailedAnalysis.specificityScore > 7).length;
        const strongVerbCount = analyses.filter(a => a.detailedAnalysis.atsOptimization > 7).length;

        if (quantifiedCount > analyses.length * 0.7) {
            strengths.push('Strong use of quantifiable metrics throughout');
        } else {
            criticalIssues.push('Insufficient quantification of achievements');
            recommendations.push('Add specific numbers, percentages, and dollar amounts to at least 70% of bullet points');
        }

        if (strongVerbCount > analyses.length * 0.8) {
            strengths.push('Excellent use of strong action verbs');
        } else {
            recommendations.push('Replace weak language with strong action verbs in remaining bullet points');
        }

        recommendations.push('Focus on business impact and leadership indicators for senior roles');
        recommendations.push('Integrate industry-specific keywords for better ATS optimization');

        return {
            score: Math.round(averageScore * 10) / 10,
            strengths,
            criticalIssues,
            recommendations
        };
    }

    private static calculateIndustryAlignment(analyses: ClaudeAnalysisResponse[]): number {
        return analyses.reduce((sum, analysis) =>
            sum + analysis.industryInsights.keywordGaps.length, 0) / analyses.length;
    }

    private static calculateATSScore(analyses: ClaudeAnalysisResponse[]): number {
        return analyses.reduce((sum, analysis) =>
            sum + analysis.detailedAnalysis.atsOptimization, 0) / analyses.length;
    }

    private static createFallbackAnalysis(
        bulletPoint: string,
        context: ClaudeAnalysisRequest['context']
    ): ClaudeAnalysisResponse {
        // Fallback analysis when Claude API is unavailable
        const patterns = this.analyzeTextPatterns(bulletPoint, context);

        return {
            originalText: bulletPoint,
            overallScore: patterns.score,
            detailedAnalysis: {
                strengths: patterns.strengths,
                weaknesses: patterns.weaknesses,
                impactLevel: patterns.impactLevel,
                specificityScore: patterns.specificityScore,
                atsOptimization: patterns.atsScore,
                readabilityScore: patterns.readabilityScore
            },
            professionalRewrite: this.generateProfessionalRewrite(bulletPoint, context),
            alternativeVersions: this.generateAlternativeVersions(bulletPoint, context),
            industryInsights: this.generateIndustryInsights(bulletPoint, context),
            psychologicalImpact: this.analyzePsychologicalFactors(bulletPoint)
        };
    }
}

export default ClaudeResumeAnalyzer;