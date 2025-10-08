// AI-powered inline comments service for resume optimization
import ResumeLearningService from './resumeLearningService';
import WebResumeLearningService from './webResumelearningService';

export interface BulletPointAnalysis {
    id: string;
    originalText: string;
    position: number;
    section: string;
    jobTitle?: string;
    suggestions: {
        improved: string;
        reason: string;
        impact: 'high' | 'medium' | 'low';
        category: 'quantification' | 'action-verbs' | 'clarity' | 'relevance' | 'keywords' | 'ai-learned';
    }[];
    score: number; // 1-10 effectiveness score
    keywords: string[];
    missingElements: string[];
}

export interface JobDescriptionContext {
    title: string;
    company: string;
    requirements: string[];
    responsibilities: string[];
    keywords: string[];
    industry: string;
}

export class AIInlineCommentsService {
    private static readonly STRONG_ACTION_VERBS = [
        'achieved', 'implemented', 'optimized', 'developed', 'led', 'managed', 'created',
        'designed', 'improved', 'increased', 'reduced', 'streamlined', 'automated',
        'analyzed', 'collaborated', 'delivered', 'established', 'executed', 'generated',
        'initiated', 'launched', 'modernized', 'orchestrated', 'pioneered', 'revolutionized',
        'spearheaded', 'transformed', 'utilized', 'architected', 'engineered', 'facilitated'
    ];

    private static readonly WEAK_PHRASES = [
        'responsible for', 'worked on', 'helped with', 'assisted in', 'involved in',
        'participated in', 'contributed to', 'supported', 'handled', 'dealt with'
    ];

    private static readonly QUANTIFICATION_PATTERNS = [
        /\d+%/, /\$\d+/, /\d+k/, /\d+\+/, /\d+ years?/, /\d+ months?/,
        /\d+ times?/, /\d+ projects?/, /\d+ team members?/, /\d+ clients?/
    ];

    static async analyzeBulletPoints(
        resumeContent: string,
        jobDescription?: JobDescriptionContext
    ): Promise<BulletPointAnalysis[]> {
        console.log('🤖 AI: Starting bullet point analysis...');
        console.log('📄 Resume content length:', resumeContent.length);

        try {
            const bulletPoints = this.extractBulletPoints(resumeContent);
            console.log('🔍 Extracted bullet points:', bulletPoints.length);

            if (bulletPoints.length === 0) {
                console.log('⚠️ No bullet points found, creating sample analysis');
                return this.createSampleAnalysis(resumeContent);
            }

            const analyses: BulletPointAnalysis[] = [];

            for (let i = 0; i < bulletPoints.length; i++) {
                const bullet = bulletPoints[i];
                console.log(`📋 Analyzing bullet ${i + 1}:`, bullet.text.substring(0, 50) + '...');
                const analysis = await this.analyzeSingleBulletPoint(bullet, jobDescription);
                analyses.push(analysis);
            }

            console.log(`✅ AI: Generated ${analyses.length} bullet point analyses`);
            return analyses;
        } catch (error) {
            console.error('❌ AI Analysis error:', error);
            return this.createSampleAnalysis(resumeContent);
        }
    }

    private static createSampleAnalysis(content: string): BulletPointAnalysis[] {
        console.log('🔧 Creating sample analysis for debugging...');

        const sampleBullets = [
            "Developed web applications using React and TypeScript",
            "Managed team of 5 developers on multiple projects",
            "Improved system performance and user experience"
        ];

        return sampleBullets.map((text, index) => ({
            id: `sample-${index}`,
            originalText: text,
            position: index,
            section: 'Work Experience',
            suggestions: [
                {
                    improved: text.replace('Developed', 'Architected and developed'),
                    reason: 'Using stronger action verb "architected" shows leadership and planning skills',
                    impact: 'medium' as const,
                    category: 'action-verbs' as const
                },
                {
                    improved: text + ' (achieving 25% performance improvement)',
                    reason: 'Adding specific metrics makes achievements more credible',
                    impact: 'high' as const,
                    category: 'quantification' as const
                }
            ],
            score: 6,
            keywords: ['React', 'TypeScript', 'web development'],
            missingElements: ['quantifiable metrics', 'specific technologies']
        }));
    }

    private static extractBulletPoints(content: string): Array<{
        text: string;
        section: string;
        jobTitle?: string;
        position: number;
    }> {
        console.log('🔍 Extracting bullet points from content...');
        const lines = content.split('\n');
        console.log(`📝 Total lines to process: ${lines.length}`);

        const bulletPoints: Array<{text: string, section: string, jobTitle?: string, position: number}> = [];

        let currentSection = 'Work Experience'; // Default section
        let currentJobTitle: string | undefined;
        let position = 0;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue; // Skip empty lines

            // Detect section headers
            if (this.isSectionHeader(line)) {
                currentSection = line.replace(/[^\w\s]/g, '').trim();
                currentJobTitle = undefined;
                console.log(`📋 Found section: ${currentSection}`);
                continue;
            }

            // Detect job titles in work experience
            if (currentSection.toLowerCase().includes('experience') && this.isJobTitle(line)) {
                currentJobTitle = line.replace(/[^\w\s]/g, '').trim();
                console.log(`💼 Found job title: ${currentJobTitle}`);
                continue;
            }

            // Detect bullet points - enhanced detection
            if (this.isBulletPoint(line) || this.isLikelyBulletPoint(line)) {
                const cleanText = line.replace(/^[\s\-\•\*]+/, '').trim();
                if (cleanText.length > 10) { // Only meaningful content
                    bulletPoints.push({
                        text: cleanText,
                        section: currentSection,
                        jobTitle: currentJobTitle,
                        position: position++
                    });
                    console.log(`🔸 Found bullet: ${cleanText.substring(0, 50)}...`);
                }
            }
        }

        return bulletPoints;
    }

    private static async analyzeSingleBulletPoint(
        bullet: {text: string, section: string, jobTitle?: string, position: number},
        jobDescription?: JobDescriptionContext
    ): Promise<BulletPointAnalysis> {
        const analysis: BulletPointAnalysis = {
            id: `bullet-${bullet.position}`,
            originalText: bullet.text,
            position: bullet.position,
            section: bullet.section,
            jobTitle: bullet.jobTitle,
            suggestions: [],
            score: 0,
            keywords: [],
            missingElements: []
        };

        // Analyze and generate suggestions
        await this.generateQuantificationSuggestions(analysis, jobDescription);
        await this.generateActionVerbSuggestions(analysis);
        await this.generateClaritySuggestions(analysis);
        await this.generateKeywordSuggestions(analysis, jobDescription);
        await this.generateRelevanceSuggestions(analysis, jobDescription);
        await this.generateLearnedSuggestions(analysis, jobDescription);

        // Calculate overall score
        analysis.score = this.calculateEffectivenessScore(analysis);

        return analysis;
    }

    private static async generateQuantificationSuggestions(
        analysis: BulletPointAnalysis,
        jobDescription?: JobDescriptionContext
    ): Promise<void> {
        const text = analysis.originalText;
        const hasQuantification = this.QUANTIFICATION_PATTERNS.some(pattern => pattern.test(text));

        if (!hasQuantification) {
            const suggestions = [
                "Add specific metrics (e.g., '25% improvement', '5 team members', '$100K budget')",
                "Include timeframes (e.g., 'within 3 months', 'over 2 years')",
                "Specify scale (e.g., 'for 500+ users', 'across 10 departments')"
            ];

            // Generate specific quantified version based on content
            let improvedText = text;
            if (text.includes('improve') || text.includes('increase')) {
                improvedText = text.replace(/(improved?|increased?)/i, '$1 by 25%');
            } else if (text.includes('manage') || text.includes('lead')) {
                improvedText = text.replace(/(managed?|led)/i, '$1 team of 5');
            } else if (text.includes('develop') || text.includes('create')) {
                improvedText = text.replace(/(developed?|created?)/i, '$1 in 3 months');
            } else {
                // Generic quantification
                improvedText = text + ' (achieving 20% improvement in efficiency)';
            }

            analysis.suggestions.push({
                improved: improvedText,
                reason: "Adding specific metrics makes achievements more credible and impactful",
                impact: 'high',
                category: 'quantification'
            });

            analysis.missingElements.push('quantifiable metrics');
        }
    }

    private static async generateActionVerbSuggestions(analysis: BulletPointAnalysis): Promise<void> {
        const text = analysis.originalText.toLowerCase();

        // Check for weak phrases
        for (const weakPhrase of this.WEAK_PHRASES) {
            if (text.includes(weakPhrase)) {
                const strongVerb = this.getStrongAlternative(weakPhrase);
                const improvedText = analysis.originalText.replace(
                    new RegExp(weakPhrase, 'gi'),
                    strongVerb
                );

                analysis.suggestions.push({
                    improved: improvedText,
                    reason: `Replace passive phrase "${weakPhrase}" with strong action verb "${strongVerb}"`,
                    impact: 'medium',
                    category: 'action-verbs'
                });
                break;
            }
        }

        // Check if starts with strong action verb
        const firstWord = text.split(' ')[0];
        if (!this.STRONG_ACTION_VERBS.includes(firstWord)) {
            const betterVerb = this.suggestBetterActionVerb(text);
            if (betterVerb) {
                const improvedText = analysis.originalText.replace(/^\w+/, betterVerb);
                analysis.suggestions.push({
                    improved: improvedText,
                    reason: `Start with strong action verb "${betterVerb}" for more impact`,
                    impact: 'medium',
                    category: 'action-verbs'
                });
            }
        }
    }

    private static async generateClaritySuggestions(analysis: BulletPointAnalysis): Promise<void> {
        const text = analysis.originalText;

        // Check for vague terms
        const vagueTerms = ['various', 'multiple', 'several', 'many', 'some', 'different'];
        for (const term of vagueTerms) {
            if (text.toLowerCase().includes(term)) {
                const improvedText = text.replace(
                    new RegExp(term, 'gi'),
                    this.getSpecificAlternative(term)
                );

                analysis.suggestions.push({
                    improved: improvedText,
                    reason: `Replace vague term "${term}" with specific details`,
                    impact: 'medium',
                    category: 'clarity'
                });
            }
        }

        // Check for overly long sentences
        if (text.length > 120) {
            const shortened = this.shortenSentence(text);
            analysis.suggestions.push({
                improved: shortened,
                reason: "Break down long sentences for better readability",
                impact: 'low',
                category: 'clarity'
            });
        }
    }

    private static async generateKeywordSuggestions(
        analysis: BulletPointAnalysis,
        jobDescription?: JobDescriptionContext
    ): Promise<void> {
        if (!jobDescription) return;

        const text = analysis.originalText.toLowerCase();
        const missingKeywords = jobDescription.keywords.filter(
            keyword => !text.includes(keyword.toLowerCase())
        );

        if (missingKeywords.length > 0 && missingKeywords.length <= 3) {
            const relevantKeywords = missingKeywords.slice(0, 2);
            const improvedText = this.integrateKeywords(analysis.originalText, relevantKeywords);

            analysis.suggestions.push({
                improved: improvedText,
                reason: `Integrate relevant keywords: ${relevantKeywords.join(', ')}`,
                impact: 'high',
                category: 'keywords'
            });

            analysis.missingElements.push(`keywords: ${relevantKeywords.join(', ')}`);
        }
    }

    private static async generateRelevanceSuggestions(
        analysis: BulletPointAnalysis,
        jobDescription?: JobDescriptionContext
    ): Promise<void> {
        if (!jobDescription) return;

        const relevanceScore = this.calculateRelevanceScore(analysis.originalText, jobDescription);

        if (relevanceScore < 0.3) {
            analysis.suggestions.push({
                improved: this.makeMoreRelevant(analysis.originalText, jobDescription),
                reason: `Align better with target role requirements for ${jobDescription.title}`,
                impact: 'high',
                category: 'relevance'
            });
        }
    }

    private static async generateLearnedSuggestions(
        analysis: BulletPointAnalysis,
        jobDescription?: JobDescriptionContext
    ): Promise<void> {
        if (!jobDescription) return;

        console.log('🌐 Generating web-learned AI suggestions for:', analysis.originalText.substring(0, 50));

        try {
            // NOTE: Web learning is now manual-only to prevent content mixing
            // Users can trigger it via the Web Learning panel if desired
            console.log('🎓 Generating AI suggestions using existing patterns...');

            // Get enhanced suggestions from web-learned patterns
            const webLearnedSuggestions = await WebResumeLearningService.getWebLearnedSuggestions(
                analysis.originalText,
                jobDescription.title,
                jobDescription.industry
            );

            // Also get local learned suggestions
            const localSuggestions = ResumeLearningService.getEnhancedSuggestions(
                analysis.originalText,
                jobDescription.title,
                jobDescription.industry
            );

            // Combine and prioritize web-learned suggestions
            const allSuggestions = [
                ...webLearnedSuggestions.map(s => ({ ...s, source: 'web' })),
                ...localSuggestions.map(s => ({ ...s, source: 'local' }))
            ];

            // Sort by confidence and take top suggestions
            allSuggestions
                .sort((a, b) => b.confidence - a.confidence)
                .slice(0, 3) // Top 3 suggestions
                .forEach(suggestion => {
                    const sourceInfo = suggestion.source === 'web'
                        ? 'Web-learned from GitHub repositories & successful resumes'
                        : `Learned from ${suggestion.learnedFrom}`;

                    analysis.suggestions.push({
                        improved: suggestion.improved,
                        reason: `🌐 AI Web Learning: ${suggestion.reason} (${sourceInfo})`,
                        impact: suggestion.confidence > 0.8 ? 'high' : suggestion.confidence > 0.6 ? 'medium' : 'low',
                        category: 'ai-learned' as any
                    });
                });

            if (allSuggestions.length > 0) {
                console.log(`🎯 Applied ${allSuggestions.length} web-learned AI suggestions`);
            }
        } catch (error) {
            console.error('Error generating web-learned suggestions:', error);
            console.log('🔄 Falling back to local learning patterns...');

            // Fallback to local learning
            try {
                const localSuggestions = ResumeLearningService.getEnhancedSuggestions(
                    analysis.originalText,
                    jobDescription.title,
                    jobDescription.industry
                );

                localSuggestions.forEach(suggestion => {
                    analysis.suggestions.push({
                        improved: suggestion.improved,
                        reason: `AI Learning: ${suggestion.reason} (${suggestion.learnedFrom})`,
                        impact: suggestion.confidence > 0.8 ? 'high' : suggestion.confidence > 0.6 ? 'medium' : 'low',
                        category: 'ai-learned' as any
                    });
                });
            } catch (fallbackError) {
                console.error('Fallback learning also failed:', fallbackError);
            }
        }
    }

    // Helper methods
    private static isSectionHeader(line: string): boolean {
        const cleanLine = line.toLowerCase().replace(/[^\w\s]/g, '').trim();
        const sectionKeywords = [
            'experience', 'education', 'skills', 'projects', 'certifications',
            'achievements', 'summary', 'objective', 'languages'
        ];
        return sectionKeywords.some(keyword => cleanLine.includes(keyword)) &&
               line.length < 50 && !line.includes('.');
    }

    private static isJobTitle(line: string): boolean {
        const titlePatterns = [
            /\b(engineer|developer|manager|analyst|coordinator|specialist|assistant|lead|director)\b/i,
            /\b(consultant|administrator|supervisor|representative|executive|officer)\b/i
        ];
        return titlePatterns.some(pattern => pattern.test(line)) &&
               line.length < 80 && !line.startsWith('•') && !line.startsWith('-');
    }

    private static isBulletPoint(line: string): boolean {
        return /^[\s]*[\-\•\*]/.test(line) && line.length > 10;
    }

    private static isLikelyBulletPoint(line: string): boolean {
        // Enhanced detection for lines that look like bullet points but don't have traditional bullets
        const actionVerbs = ['developed', 'managed', 'led', 'created', 'implemented', 'designed', 'improved', 'achieved', 'collaborated', 'analyzed'];
        const startsWithActionVerb = actionVerbs.some(verb => line.toLowerCase().startsWith(verb.toLowerCase()));

        // Check if line contains typical bullet point characteristics
        const hasMetrics = /\d+/.test(line);
        const hasPercentage = /%/.test(line);
        const hasTimeFrame = /(year|month|week)/i.test(line);
        const hasTechTerms = /(software|system|application|platform|database)/i.test(line);

        return (startsWithActionVerb || hasMetrics || hasPercentage || hasTimeFrame || hasTechTerms) &&
               line.length > 15 && line.length < 200;
    }

    private static getStrongAlternative(weakPhrase: string): string {
        const alternatives: Record<string, string> = {
            'responsible for': 'managed',
            'worked on': 'developed',
            'helped with': 'contributed to',
            'assisted in': 'supported',
            'involved in': 'participated in',
            'participated in': 'collaborated on',
            'contributed to': 'enhanced',
            'supported': 'facilitated',
            'handled': 'managed',
            'dealt with': 'resolved'
        };
        return alternatives[weakPhrase] || 'implemented';
    }

    private static suggestBetterActionVerb(text: string): string | null {
        if (text.includes('create') || text.includes('build')) return 'Developed';
        if (text.includes('improve') || text.includes('enhance')) return 'Optimized';
        if (text.includes('work') || text.includes('help')) return 'Collaborated';
        if (text.includes('manage') || text.includes('oversee')) return 'Led';
        if (text.includes('analyze') || text.includes('research')) return 'Analyzed';
        if (text.includes('design') || text.includes('plan')) return 'Architected';
        return null;
    }

    private static getSpecificAlternative(vageTerm: string): string {
        const alternatives: Record<string, string> = {
            'various': '5 different',
            'multiple': '3 key',
            'several': '4 major',
            'many': '10+',
            'some': '3',
            'different': 'diverse'
        };
        return alternatives[vageTerm] || '3';
    }

    private static shortenSentence(text: string): string {
        // Simple sentence shortening - split at conjunctions
        const parts = text.split(/\s+(and|while|by|through)\s+/);
        return parts[0].trim() + (parts.length > 1 ? ` and ${parts[parts.length - 1].trim()}` : '');
    }

    private static integrateKeywords(text: string, keywords: string[]): string {
        // Simple keyword integration
        return text + ` utilizing ${keywords.join(' and ')}`;
    }

    private static calculateRelevanceScore(text: string, jobDescription: JobDescriptionContext): number {
        const textLower = text.toLowerCase();
        let matches = 0;
        const totalKeywords = jobDescription.keywords.length;

        for (const keyword of jobDescription.keywords) {
            if (textLower.includes(keyword.toLowerCase())) {
                matches++;
            }
        }

        return totalKeywords > 0 ? matches / totalKeywords : 0;
    }

    private static makeMoreRelevant(text: string, jobDescription: JobDescriptionContext): string {
        const relevantKeyword = jobDescription.keywords[0];
        return text + ` aligned with ${jobDescription.title} requirements in ${relevantKeyword}`;
    }

    private static calculateEffectivenessScore(analysis: BulletPointAnalysis): number {
        let score = 5; // Base score

        // Deduct points for missing elements
        score -= analysis.missingElements.length;

        // Add points for existing strengths
        const text = analysis.originalText.toLowerCase();
        if (this.QUANTIFICATION_PATTERNS.some(pattern => pattern.test(text))) score += 2;
        if (this.STRONG_ACTION_VERBS.some(verb => text.startsWith(verb))) score += 1;
        if (text.length > 20 && text.length < 100) score += 1;

        return Math.max(1, Math.min(10, score));
    }
}

export default AIInlineCommentsService;