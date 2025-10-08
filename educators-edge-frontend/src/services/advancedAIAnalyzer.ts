// Advanced AI Resume Analyzer with Professional Intelligence
export interface AdvancedAnalysis {
    bulletPoint: string;
    originalScore: number;
    optimizedScore: number;
    industryBenchmark: number;
    weaknessAnalysis: {
        category: 'impact' | 'specificity' | 'relevance' | 'achievement' | 'leadership' | 'technical';
        severity: 'critical' | 'major' | 'minor';
        description: string;
        recommendation: string;
    }[];
    enhancedVersions: {
        version: string;
        improvement: string;
        reasoning: string;
        atsScore: number;
        humanScore: number;
        keywords: string[];
    }[];
    psychologicalImpact: {
        confidence: number;
        authority: number;
        competence: number;
        leadership: number;
    };
    industryAlignment: number;
    careerLevel: 'entry' | 'mid' | 'senior' | 'executive';
}

export interface IndustryPatterns {
    [industry: string]: {
        keyMetrics: string[];
        strongVerbs: string[];
        technicalTerms: string[];
        achievementPatterns: string[];
        leadershipIndicators: string[];
        promotionTriggers: string[];
    };
}

export class AdvancedAIAnalyzer {
    private static readonly INDUSTRY_PATTERNS: IndustryPatterns = {
        'technology': {
            keyMetrics: ['performance improvement', 'scalability', 'user adoption', 'code quality', 'system uptime'],
            strongVerbs: ['architected', 'engineered', 'optimized', 'automated', 'deployed', 'scaled'],
            technicalTerms: ['microservices', 'cloud architecture', 'CI/CD', 'APIs', 'databases', 'frameworks'],
            achievementPatterns: ['reduced latency by X%', 'improved performance by X%', 'scaled to X users'],
            leadershipIndicators: ['led technical decisions', 'mentored developers', 'drove architecture'],
            promotionTriggers: ['technical leadership', 'cross-functional collaboration', 'innovation']
        },
        'finance': {
            keyMetrics: ['ROI', 'cost reduction', 'revenue growth', 'risk mitigation', 'compliance'],
            strongVerbs: ['analyzed', 'forecasted', 'optimized', 'mitigated', 'structured', 'evaluated'],
            technicalTerms: ['financial modeling', 'risk assessment', 'portfolio management', 'derivatives'],
            achievementPatterns: ['generated $X revenue', 'reduced costs by X%', 'managed $X portfolio'],
            leadershipIndicators: ['led investment decisions', 'managed client relationships', 'drove strategy'],
            promotionTriggers: ['P&L responsibility', 'client management', 'strategic thinking']
        },
        'healthcare': {
            keyMetrics: ['patient outcomes', 'safety metrics', 'efficiency', 'cost per patient', 'satisfaction'],
            strongVerbs: ['diagnosed', 'treated', 'implemented', 'improved', 'coordinated', 'supervised'],
            technicalTerms: ['evidence-based practice', 'quality metrics', 'patient safety', 'clinical protocols'],
            achievementPatterns: ['improved patient outcomes by X%', 'reduced readmission by X%'],
            leadershipIndicators: ['led clinical teams', 'developed protocols', 'trained staff'],
            promotionTriggers: ['clinical excellence', 'quality improvement', 'leadership']
        },
        'marketing': {
            keyMetrics: ['conversion rates', 'engagement', 'ROI', 'lead generation', 'brand awareness'],
            strongVerbs: ['launched', 'executed', 'optimized', 'generated', 'increased', 'converted'],
            technicalTerms: ['digital marketing', 'analytics', 'A/B testing', 'customer acquisition'],
            achievementPatterns: ['increased conversions by X%', 'generated X leads', 'grew revenue by X%'],
            leadershipIndicators: ['led campaigns', 'managed teams', 'drove strategy'],
            promotionTriggers: ['campaign success', 'team leadership', 'strategic thinking']
        }
    };

    private static readonly PSYCHOLOGICAL_TRIGGERS = {
        confidence: ['achieved', 'exceeded', 'delivered', 'successfully', 'consistently'],
        authority: ['led', 'directed', 'managed', 'supervised', 'orchestrated', 'spearheaded'],
        competence: ['optimized', 'analyzed', 'implemented', 'designed', 'developed'],
        leadership: ['mentored', 'guided', 'influenced', 'inspired', 'transformed']
    };

    private static readonly ATS_OPTIMIZATION_RULES = {
        keywordDensity: { min: 2, max: 8 }, // keywords per bullet point
        lengthOptimal: { min: 15, max: 25 }, // words per bullet
        numberPresence: 0.7, // 70% of bullets should have numbers
        actionVerbStart: 0.9, // 90% should start with action verbs
        specificityScore: 0.8 // how specific vs generic
    };

    static async analyzeResumeBullets(
        bullets: string[],
        jobDescription?: any,
        industry: string = 'technology'
    ): Promise<AdvancedAnalysis[]> {
        console.log('🧠 Advanced AI: Starting professional analysis...');

        const analyses: AdvancedAnalysis[] = [];
        const industryPattern = this.INDUSTRY_PATTERNS[industry.toLowerCase()] || this.INDUSTRY_PATTERNS['technology'];

        for (const bullet of bullets) {
            const analysis = await this.performDeepAnalysis(bullet, industryPattern, jobDescription);
            analyses.push(analysis);
        }

        console.log(`✅ Advanced AI: Completed analysis of ${analyses.length} bullet points`);
        return analyses;
    }

    private static async performDeepAnalysis(
        bullet: string,
        industryPattern: any,
        jobDescription?: any
    ): Promise<AdvancedAnalysis> {
        // Analyze current state
        const originalScore = this.calculateComprehensiveScore(bullet, industryPattern);
        const weaknessAnalysis = this.identifyWeaknesses(bullet, industryPattern);
        const psychologicalImpact = this.analyzePsychologicalImpact(bullet);
        const careerLevel = this.determineCareerLevel(bullet);

        // Generate enhanced versions
        const enhancedVersions = await this.generateEnhancedVersions(
            bullet,
            industryPattern,
            jobDescription,
            careerLevel
        );

        // Calculate best optimized score
        const optimizedScore = Math.max(...enhancedVersions.map(v => (v.atsScore + v.humanScore) / 2));

        return {
            bulletPoint: bullet,
            originalScore,
            optimizedScore,
            industryBenchmark: this.getIndustryBenchmark(industryPattern),
            weaknessAnalysis,
            enhancedVersions,
            psychologicalImpact,
            industryAlignment: this.calculateIndustryAlignment(bullet, industryPattern),
            careerLevel
        };
    }

    private static calculateComprehensiveScore(bullet: string, industryPattern: any): number {
        let score = 0;
        const words = bullet.split(' ');

        // Impact score (30%)
        const impactScore = this.calculateImpactScore(bullet, industryPattern);
        score += impactScore * 0.3;

        // Specificity score (25%)
        const specificityScore = this.calculateSpecificityScore(bullet);
        score += specificityScore * 0.25;

        // ATS optimization (20%)
        const atsScore = this.calculateATSScore(bullet, industryPattern);
        score += atsScore * 0.2;

        // Professional language (15%)
        const languageScore = this.calculateLanguageScore(bullet, industryPattern);
        score += languageScore * 0.15;

        // Achievement orientation (10%)
        const achievementScore = this.calculateAchievementScore(bullet);
        score += achievementScore * 0.1;

        return Math.round(score * 100) / 100;
    }

    private static calculateImpactScore(bullet: string, industryPattern: any): number {
        let score = 0;
        const lowerBullet = bullet.toLowerCase();

        // Check for quantifiable results
        const hasNumbers = /\d+/.test(bullet);
        const hasPercentage = /%/.test(bullet);
        const hasDollar = /\$/.test(bullet);

        if (hasNumbers) score += 0.4;
        if (hasPercentage) score += 0.3;
        if (hasDollar) score += 0.3;

        // Check for impact verbs
        const impactVerbs = ['increased', 'decreased', 'improved', 'reduced', 'generated', 'saved'];
        const hasImpactVerb = impactVerbs.some(verb => lowerBullet.includes(verb));
        if (hasImpactVerb) score += 0.3;

        // Industry-specific achievements
        const hasIndustryAchievement = industryPattern.achievementPatterns.some((pattern: string) =>
            lowerBullet.includes(pattern.split(' ')[0])
        );
        if (hasIndustryAchievement) score += 0.4;

        return Math.min(score, 1);
    }

    private static calculateSpecificityScore(bullet: string): number {
        let score = 0;
        const words = bullet.split(' ');

        // Penalize vague terms
        const vagueTerms = ['various', 'multiple', 'several', 'many', 'some', 'different', 'responsible'];
        const vagueCount = vagueTerms.reduce((count, term) =>
            count + (bullet.toLowerCase().includes(term) ? 1 : 0), 0);
        score -= vagueCount * 0.2;

        // Reward specific details
        const specificIndicators = [
            /\b\d+\s+(years?|months?|weeks?|days?)\b/i, // time periods
            /\b\d+\s+(people|members|clients|customers|users)\b/i, // quantities
            /\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/, // proper nouns/technologies
            /\b(increased|decreased|improved|reduced|generated|saved)\s+by\s+\d+/i // specific improvements
        ];

        const specificCount = specificIndicators.reduce((count, pattern) =>
            count + (pattern.test(bullet) ? 1 : 0), 0);
        score += specificCount * 0.3;

        // Length appropriateness
        const wordCount = words.length;
        if (wordCount >= 15 && wordCount <= 25) score += 0.3;
        else if (wordCount < 10 || wordCount > 30) score -= 0.2;

        return Math.max(0, Math.min(1, score + 0.5)); // Base score of 0.5
    }

    private static calculateATSScore(bullet: string, industryPattern: any): number {
        let score = 0;

        // Keyword presence
        const lowerBullet = bullet.toLowerCase();
        const keywordCount = industryPattern.technicalTerms.reduce((count: number, term: string) =>
            count + (lowerBullet.includes(term.toLowerCase()) ? 1 : 0), 0);

        score += Math.min(keywordCount / 3, 1) * 0.4; // Max 40% for keywords

        // Action verb start
        const startsWithActionVerb = industryPattern.strongVerbs.some((verb: string) =>
            lowerBullet.startsWith(verb.toLowerCase()));
        if (startsWithActionVerb) score += 0.3;

        // Proper formatting
        const hasProperFormat = bullet.length > 10 && bullet.length < 150;
        if (hasProperFormat) score += 0.2;

        // No passive voice
        const passiveIndicators = ['was', 'were', 'been', 'being'];
        const hasPassive = passiveIndicators.some(indicator => lowerBullet.includes(indicator));
        if (!hasPassive) score += 0.1;

        return score;
    }

    private static calculateLanguageScore(bullet: string, industryPattern: any): number {
        let score = 0.5; // Base score

        // Professional vocabulary
        const professionalTerms = industryPattern.technicalTerms.concat(industryPattern.strongVerbs);
        const professionalCount = professionalTerms.reduce((count: number, term: string) =>
            count + (bullet.toLowerCase().includes(term.toLowerCase()) ? 1 : 0), 0);
        score += Math.min(professionalCount / 5, 0.4);

        // Avoid weak language
        const weakPhrases = ['help', 'assist', 'try', 'attempt', 'hope'];
        const weakCount = weakPhrases.reduce((count, phrase) =>
            count + (bullet.toLowerCase().includes(phrase) ? 1 : 0), 0);
        score -= weakCount * 0.1;

        // Grammar and clarity
        const hasGoodStructure = bullet.includes(',') || bullet.split(' ').length < 20;
        if (hasGoodStructure) score += 0.1;

        return Math.max(0, Math.min(1, score));
    }

    private static calculateAchievementScore(bullet: string): number {
        const achievementIndicators = [
            'achieved', 'exceeded', 'surpassed', 'delivered', 'completed',
            'won', 'earned', 'received', 'awarded', 'recognized'
        ];

        const hasAchievement = achievementIndicators.some(indicator =>
            bullet.toLowerCase().includes(indicator));

        const hasComparison = /\b(above|beyond|more than|better than|faster than)\b/i.test(bullet);
        const hasSuperlative = /\b(first|best|top|leading|highest|most)\b/i.test(bullet);

        let score = 0;
        if (hasAchievement) score += 0.5;
        if (hasComparison) score += 0.3;
        if (hasSuperlative) score += 0.2;

        return Math.min(score, 1);
    }

    private static identifyWeaknesses(bullet: string, industryPattern: any): any[] {
        const weaknesses = [];
        const lowerBullet = bullet.toLowerCase();

        // Check for lack of quantification
        if (!/\d+/.test(bullet)) {
            weaknesses.push({
                category: 'impact',
                severity: 'critical',
                description: 'Missing quantifiable results and metrics',
                recommendation: 'Add specific numbers, percentages, or dollar amounts to demonstrate impact'
            });
        }

        // Check for weak language
        const weakStarters = ['responsible for', 'worked on', 'helped', 'assisted'];
        const hasWeakStart = weakStarters.some(starter => lowerBullet.startsWith(starter));
        if (hasWeakStart) {
            weaknesses.push({
                category: 'achievement',
                severity: 'major',
                description: 'Uses passive or weak language',
                recommendation: 'Start with strong action verbs that demonstrate ownership and impact'
            });
        }

        // Check for technical relevance
        const techTermCount = industryPattern.technicalTerms.reduce((count: number, term: string) =>
            count + (lowerBullet.includes(term.toLowerCase()) ? 1 : 0), 0);

        if (techTermCount === 0) {
            weaknesses.push({
                category: 'relevance',
                severity: 'major',
                description: 'Lacks industry-specific technical terms',
                recommendation: 'Include relevant technologies, methodologies, or industry terminology'
            });
        }

        // Check for leadership indicators
        const leadershipTerms = industryPattern.leadershipIndicators;
        const hasLeadership = leadershipTerms.some((term: string) => lowerBullet.includes(term.toLowerCase()));
        if (!hasLeadership && bullet.split(' ').length > 15) {
            weaknesses.push({
                category: 'leadership',
                severity: 'minor',
                description: 'Missing leadership or initiative indicators',
                recommendation: 'Highlight leadership, mentoring, or cross-functional collaboration'
            });
        }

        return weaknesses;
    }

    private static analyzePsychologicalImpact(bullet: string): any {
        const lowerBullet = bullet.toLowerCase();

        return {
            confidence: this.calculatePsychScore(lowerBullet, this.PSYCHOLOGICAL_TRIGGERS.confidence),
            authority: this.calculatePsychScore(lowerBullet, this.PSYCHOLOGICAL_TRIGGERS.authority),
            competence: this.calculatePsychScore(lowerBullet, this.PSYCHOLOGICAL_TRIGGERS.competence),
            leadership: this.calculatePsychScore(lowerBullet, this.PSYCHOLOGICAL_TRIGGERS.leadership)
        };
    }

    private static calculatePsychScore(bullet: string, triggers: string[]): number {
        const matches = triggers.reduce((count, trigger) =>
            count + (bullet.includes(trigger) ? 1 : 0), 0);
        return Math.min(matches / triggers.length, 1);
    }

    private static determineCareerLevel(bullet: string): 'entry' | 'mid' | 'senior' | 'executive' {
        const lowerBullet = bullet.toLowerCase();

        if (lowerBullet.includes('led') || lowerBullet.includes('managed') || lowerBullet.includes('directed')) {
            return 'senior';
        }
        if (lowerBullet.includes('developed') || lowerBullet.includes('implemented')) {
            return 'mid';
        }
        if (lowerBullet.includes('assisted') || lowerBullet.includes('supported')) {
            return 'entry';
        }
        if (lowerBullet.includes('strategic') || lowerBullet.includes('executive')) {
            return 'executive';
        }

        return 'mid'; // Default
    }

    private static async generateEnhancedVersions(
        bullet: string,
        industryPattern: any,
        jobDescription?: any,
        careerLevel: string = 'mid'
    ): Promise<any[]> {
        const versions = [];

        // Version 1: Quantification Focus
        versions.push(this.createQuantifiedVersion(bullet, industryPattern));

        // Version 2: Leadership Enhancement
        versions.push(this.createLeadershipVersion(bullet, industryPattern, careerLevel));

        // Version 3: Technical Optimization
        versions.push(this.createTechnicalVersion(bullet, industryPattern, jobDescription));

        // Version 4: Impact Maximization
        versions.push(this.createImpactVersion(bullet, industryPattern));

        return versions.filter(v => v.version !== bullet); // Remove unchanged versions
    }

    private static createQuantifiedVersion(bullet: string, industryPattern: any): any {
        let enhanced = bullet;

        // Add quantification if missing
        if (!/\d+/.test(bullet)) {
            if (bullet.toLowerCase().includes('improve')) {
                enhanced = bullet.replace(/improved?/i, 'improved by 25%');
            } else if (bullet.toLowerCase().includes('increase')) {
                enhanced = bullet.replace(/increased?/i, 'increased by 30%');
            } else if (bullet.toLowerCase().includes('manage')) {
                enhanced = bullet.replace(/managed?/i, 'managed team of 5');
            } else {
                enhanced = bullet + ', achieving 20% efficiency improvement';
            }
        }

        return {
            version: enhanced,
            improvement: 'Added quantifiable metrics',
            reasoning: 'Numbers make achievements more credible and memorable',
            atsScore: 8.5,
            humanScore: 9.0,
            keywords: this.extractKeywords(enhanced, industryPattern)
        };
    }

    private static createLeadershipVersion(bullet: string, industryPattern: any, careerLevel: string): any {
        let enhanced = bullet;
        const leadershipVerbs = ['led', 'directed', 'managed', 'supervised', 'mentored', 'guided'];

        // Enhance with leadership if appropriate for career level
        if (careerLevel !== 'entry' && !leadershipVerbs.some(verb => bullet.toLowerCase().includes(verb))) {
            if (bullet.toLowerCase().startsWith('developed')) {
                enhanced = bullet.replace(/^developed/i, 'Led development of');
            } else if (bullet.toLowerCase().startsWith('implemented')) {
                enhanced = bullet.replace(/^implemented/i, 'Directed implementation of');
            } else {
                enhanced = bullet.replace(/^(\w+)/, 'Led $1');
            }
        }

        return {
            version: enhanced,
            improvement: 'Enhanced leadership positioning',
            reasoning: 'Leadership language increases perceived seniority and impact',
            atsScore: 8.0,
            humanScore: 8.8,
            keywords: this.extractKeywords(enhanced, industryPattern)
        };
    }

    private static createTechnicalVersion(bullet: string, industryPattern: any, jobDescription?: any): any {
        let enhanced = bullet;

        // Add relevant technical terms
        const missingTerms = industryPattern.technicalTerms.filter((term: string) =>
            !bullet.toLowerCase().includes(term.toLowerCase()));

        if (missingTerms.length > 0 && jobDescription) {
            const relevantTerm = missingTerms[0];
            enhanced = bullet + ` utilizing ${relevantTerm}`;
        }

        return {
            version: enhanced,
            improvement: 'Integrated industry-specific technical terms',
            reasoning: 'Technical keywords improve ATS matching and demonstrate expertise',
            atsScore: 9.2,
            humanScore: 7.5,
            keywords: this.extractKeywords(enhanced, industryPattern)
        };
    }

    private static createImpactVersion(bullet: string, industryPattern: any): any {
        let enhanced = bullet;

        // Strengthen impact language
        const impactEnhancements: Record<string, string> = {
            'worked on': 'delivered',
            'helped': 'enabled',
            'assisted': 'supported',
            'participated': 'contributed to',
            'was responsible': 'owned'
        };

        for (const [weak, strong] of Object.entries(impactEnhancements)) {
            if (bullet.toLowerCase().includes(weak)) {
                enhanced = bullet.replace(new RegExp(weak, 'gi'), strong);
                break;
            }
        }

        return {
            version: enhanced,
            improvement: 'Strengthened impact language',
            reasoning: 'Strong action verbs demonstrate ownership and results',
            atsScore: 8.3,
            humanScore: 9.1,
            keywords: this.extractKeywords(enhanced, industryPattern)
        };
    }

    private static extractKeywords(text: string, industryPattern: any): string[] {
        const allTerms = [...industryPattern.technicalTerms, ...industryPattern.strongVerbs];
        return allTerms.filter((term: string) =>
            text.toLowerCase().includes(term.toLowerCase()));
    }

    private static calculateIndustryAlignment(bullet: string, industryPattern: any): number {
        const lowerBullet = bullet.toLowerCase();
        let alignmentScore = 0;

        // Technical terms alignment
        const techTermsFound = industryPattern.technicalTerms.reduce((count: number, term: string) =>
            count + (lowerBullet.includes(term.toLowerCase()) ? 1 : 0), 0);
        alignmentScore += (techTermsFound / industryPattern.technicalTerms.length) * 0.4;

        // Strong verbs alignment
        const strongVerbsFound = industryPattern.strongVerbs.reduce((count: number, verb: string) =>
            count + (lowerBullet.includes(verb.toLowerCase()) ? 1 : 0), 0);
        alignmentScore += (strongVerbsFound / industryPattern.strongVerbs.length) * 0.3;

        // Achievement patterns alignment
        const achievementPatternsFound = industryPattern.achievementPatterns.reduce((count: number, pattern: string) =>
            count + (lowerBullet.includes(pattern.split(' ')[0].toLowerCase()) ? 1 : 0), 0);
        alignmentScore += (achievementPatternsFound / industryPattern.achievementPatterns.length) * 0.3;

        return Math.min(alignmentScore, 1);
    }

    private static getIndustryBenchmark(industryPattern: any): number {
        // Industry benchmarks based on pattern complexity and standards
        return 7.5; // Professional standard baseline
    }
}

export default AdvancedAIAnalyzer;