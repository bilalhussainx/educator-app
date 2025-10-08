// Intelligent Resume Analyzer - Professional Grade AI Analysis
export interface ResumeAnalysis {
    overall: {
        score: number; // 0-100
        grade: 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D' | 'F';
        strengths: string[];
        weaknesses: string[];
        summary: string;
    };
    sections: {
        [key: string]: SectionAnalysis;
    };
    keywords: {
        industry: string[];
        missing: string[];
        suggestions: string[];
        atsScore: number;
    };
    recommendations: Recommendation[];
    marketReadiness: {
        level: 'entry' | 'mid' | 'senior' | 'executive';
        industries: string[];
        estimatedSalaryRange: string;
        competitiveAdvantages: string[];
    };
}

export interface SectionAnalysis {
    score: number;
    feedback: string;
    suggestions: string[];
    issues: string[];
    wordCount: number;
    impact: 'low' | 'medium' | 'high';
}

export interface Recommendation {
    type: 'critical' | 'important' | 'suggestion';
    category: 'content' | 'format' | 'keywords' | 'structure';
    title: string;
    description: string;
    example?: string;
    impact: string;
    priority: number;
}

class IntelligentResumeAnalyzer {
    private industryKeywords: Map<string, string[]> = new Map();
    private actionVerbs: string[] = [];
    private quantifiableMetrics: RegExp[] = [];

    constructor() {
        this.initializeKeywordDatabase();
        this.initializeActionVerbs();
        this.initializeMetricPatterns();
    }

    private initializeKeywordDatabase() {
        this.industryKeywords.set('software', [
            'agile', 'scrum', 'javascript', 'python', 'react', 'node.js', 'aws', 'docker',
            'kubernetes', 'microservices', 'api', 'database', 'sql', 'nosql', 'mongodb',
            'postgresql', 'redis', 'jenkins', 'ci/cd', 'git', 'github', 'azure', 'cloud',
            'machine learning', 'ai', 'tensorflow', 'pytorch', 'data structures', 'algorithms'
        ]);

        this.industryKeywords.set('data', [
            'python', 'r', 'sql', 'tableau', 'power bi', 'machine learning', 'deep learning',
            'statistics', 'analytics', 'big data', 'spark', 'hadoop', 'pandas', 'numpy',
            'scikit-learn', 'visualization', 'etl', 'data warehouse', 'snowflake', 'redshift'
        ]);

        this.industryKeywords.set('marketing', [
            'seo', 'sem', 'google analytics', 'social media', 'content marketing', 'email marketing',
            'lead generation', 'conversion optimization', 'a/b testing', 'roi', 'kpi', 'crm',
            'salesforce', 'hubspot', 'adobe creative suite', 'canva', 'hootsuite'
        ]);

        this.industryKeywords.set('finance', [
            'financial modeling', 'excel', 'bloomberg', 'risk management', 'portfolio management',
            'valuation', 'dcf', 'financial analysis', 'accounting', 'gaap', 'ifrs', 'audit',
            'compliance', 'regulatory', 'derivatives', 'fixed income', 'equity', 'bonds'
        ]);

        this.industryKeywords.set('healthcare', [
            'hipaa', 'electronic health records', 'ehr', 'clinical research', 'fda', 'gcp',
            'medical devices', 'pharmaceuticals', 'patient care', 'healthcare administration',
            'telemedicine', 'epic', 'cerner', 'healthcare analytics', 'population health'
        ]);
    }

    private initializeActionVerbs() {
        this.actionVerbs = [
            'achieved', 'accelerated', 'accomplished', 'advanced', 'amplified', 'analyzed',
            'architected', 'automated', 'built', 'collaborated', 'created', 'delivered',
            'designed', 'developed', 'directed', 'drove', 'enhanced', 'established',
            'executed', 'expanded', 'generated', 'grew', 'implemented', 'improved',
            'increased', 'initiated', 'innovated', 'launched', 'led', 'managed',
            'optimized', 'orchestrated', 'pioneered', 'reduced', 'revolutionized',
            'scaled', 'spearheaded', 'streamlined', 'transformed', 'utilized'
        ];
    }

    private initializeMetricPatterns() {
        this.quantifiableMetrics = [
            /\d+%/g, // percentages
            /\$[\d,]+/g, // dollar amounts
            /\d+[km]?\+?\s*(users?|customers?|clients?)/gi,
            /\d+[km]?\+?\s*(projects?|applications?|systems?)/gi,
            /\d+[km]?\+?\s*(team members?|employees?|people)/gi,
            /\d+\s*(months?|years?|weeks?|days?)/gi,
            /\d+[km]?\+?\s*(revenue|sales|profit|savings)/gi
        ];
    }

    analyzeResume(content: string, targetIndustry?: string): ResumeAnalysis {
        console.log('🧠 Starting intelligent resume analysis...');

        const sections = this.extractSections(content);
        const sectionAnalyses: { [key: string]: SectionAnalysis } = {};

        // Analyze each section
        Object.entries(sections).forEach(([sectionName, sectionContent]) => {
            sectionAnalyses[sectionName] = this.analyzeSection(sectionName, sectionContent, targetIndustry);
        });

        // Keyword analysis
        const keywordAnalysis = this.analyzeKeywords(content, targetIndustry);

        // Generate recommendations
        const recommendations = this.generateRecommendations(sectionAnalyses, keywordAnalysis, content);

        // Market readiness assessment
        const marketReadiness = this.assessMarketReadiness(content, sectionAnalyses);

        // Calculate overall score
        const overallScore = this.calculateOverallScore(sectionAnalyses, keywordAnalysis);

        const analysis: ResumeAnalysis = {
            overall: {
                score: overallScore,
                grade: this.scoreToGrade(overallScore),
                strengths: this.identifyStrengths(sectionAnalyses, keywordAnalysis),
                weaknesses: this.identifyWeaknesses(sectionAnalyses, keywordAnalysis),
                summary: this.generateOverallSummary(overallScore, sectionAnalyses)
            },
            sections: sectionAnalyses,
            keywords: keywordAnalysis,
            recommendations,
            marketReadiness
        };

        console.log('✅ Resume analysis complete:', {
            score: analysis.overall.score,
            grade: analysis.overall.grade,
            recommendationsCount: recommendations.length
        });

        return analysis;
    }

    private extractSections(content: string): { [key: string]: string } {
        const sections: { [key: string]: string } = {};
        const lines = content.split('\n');

        let currentSection = 'header';
        let currentContent: string[] = [];

        for (const line of lines) {
            const trimmedLine = line.trim();

            if (this.isSectionHeader(trimmedLine)) {
                // Save previous section
                if (currentContent.length > 0) {
                    sections[currentSection] = currentContent.join('\n').trim();
                }

                // Start new section
                currentSection = this.normalizeSectionName(trimmedLine);
                currentContent = [];
            } else if (trimmedLine) {
                currentContent.push(line);
            }
        }

        // Save final section
        if (currentContent.length > 0) {
            sections[currentSection] = currentContent.join('\n').trim();
        }

        return sections;
    }

    private isSectionHeader(line: string): boolean {
        const commonSections = [
            'professional summary', 'summary', 'objective', 'profile',
            'work experience', 'experience', 'employment', 'professional experience',
            'education', 'academic background', 'qualifications',
            'skills', 'technical skills', 'core competencies', 'expertise',
            'projects', 'key projects', 'notable projects',
            'certifications', 'licenses', 'credentials',
            'achievements', 'accomplishments', 'awards',
            'publications', 'research', 'papers'
        ];

        const normalized = line.toLowerCase().replace(/[^a-z\s]/g, '').trim();
        return commonSections.some(section => normalized.includes(section)) && line.length < 50;
    }

    private normalizeSectionName(sectionHeader: string): string {
        const normalized = sectionHeader.toLowerCase().replace(/[^a-z\s]/g, '').trim();

        if (normalized.includes('summary') || normalized.includes('objective') || normalized.includes('profile')) {
            return 'summary';
        } else if (normalized.includes('experience') || normalized.includes('employment')) {
            return 'experience';
        } else if (normalized.includes('education') || normalized.includes('academic')) {
            return 'education';
        } else if (normalized.includes('skill') || normalized.includes('competenc') || normalized.includes('expertise')) {
            return 'skills';
        } else if (normalized.includes('project')) {
            return 'projects';
        } else if (normalized.includes('certification') || normalized.includes('license')) {
            return 'certifications';
        } else if (normalized.includes('achievement') || normalized.includes('accomplishment') || normalized.includes('award')) {
            return 'achievements';
        }

        return 'other';
    }

    private analyzeSection(sectionName: string, content: string, targetIndustry?: string): SectionAnalysis {
        const wordCount = content.split(/\s+/).length;
        let score = 50; // Base score
        const suggestions: string[] = [];
        const issues: string[] = [];

        switch (sectionName) {
            case 'summary':
                return this.analyzeSummarySection(content);
            case 'experience':
                return this.analyzeExperienceSection(content, targetIndustry);
            case 'education':
                return this.analyzeEducationSection(content);
            case 'skills':
                return this.analyzeSkillsSection(content, targetIndustry);
            default:
                return {
                    score: 70,
                    feedback: 'Section content looks adequate.',
                    suggestions: [],
                    issues: [],
                    wordCount,
                    impact: 'medium'
                };
        }
    }

    private analyzeSummarySection(content: string): SectionAnalysis {
        const wordCount = content.split(/\s+/).length;
        let score = 50;
        const suggestions: string[] = [];
        const issues: string[] = [];

        // Word count analysis
        if (wordCount < 30) {
            score -= 20;
            issues.push('Summary is too short - should be 30-80 words');
            suggestions.push('Expand your summary to include key achievements and value proposition');
        } else if (wordCount > 100) {
            score -= 10;
            issues.push('Summary is too long - should be concise and impactful');
            suggestions.push('Condense to 30-80 words focusing on your strongest qualifications');
        } else {
            score += 15;
        }

        // Check for quantifiable achievements
        const hasMetrics = this.quantifiableMetrics.some(pattern => pattern.test(content));
        if (hasMetrics) {
            score += 15;
        } else {
            suggestions.push('Include quantifiable achievements in your summary');
        }

        // Check for action verbs
        const actionVerbCount = this.actionVerbs.filter(verb =>
            content.toLowerCase().includes(verb.toLowerCase())
        ).length;

        if (actionVerbCount >= 2) {
            score += 10;
        } else {
            suggestions.push('Use strong action verbs to demonstrate impact');
        }

        // Check for value proposition
        const valueWords = ['increase', 'improve', 'reduce', 'optimize', 'deliver', 'achieve'];
        const hasValueProp = valueWords.some(word => content.toLowerCase().includes(word));
        if (hasValueProp) {
            score += 10;
        } else {
            suggestions.push('Clearly articulate the value you bring to employers');
        }

        return {
            score: Math.min(100, Math.max(0, score)),
            feedback: this.generateSectionFeedback('summary', score),
            suggestions,
            issues,
            wordCount,
            impact: 'high'
        };
    }

    private analyzeExperienceSection(content: string, targetIndustry?: string): SectionAnalysis {
        const wordCount = content.split(/\s+/).length;
        let score = 50;
        const suggestions: string[] = [];
        const issues: string[] = [];

        // Check for bullet points structure
        const bulletPoints = content.match(/^[\s]*[•▪▫◦‣⁃-]/gm) || [];
        if (bulletPoints.length === 0) {
            score -= 15;
            issues.push('Experience should use bullet points for achievements');
            suggestions.push('Format achievements as bullet points for better readability');
        }

        // Analyze each bullet point for impact
        const achievements = content.split(/\n/).filter(line =>
            /^[\s]*[•▪▫◦‣⁃-]/.test(line)
        );

        let quantifiedCount = 0;
        let actionVerbCount = 0;

        achievements.forEach(achievement => {
            // Check for quantification
            if (this.quantifiableMetrics.some(pattern => pattern.test(achievement))) {
                quantifiedCount++;
            }

            // Check for action verbs
            if (this.actionVerbs.some(verb =>
                achievement.toLowerCase().includes(verb.toLowerCase())
            )) {
                actionVerbCount++;
            }
        });

        // Score based on quantification
        const quantificationRate = achievements.length > 0 ? quantifiedCount / achievements.length : 0;
        if (quantificationRate >= 0.6) {
            score += 20;
        } else if (quantificationRate >= 0.3) {
            score += 10;
        } else {
            score -= 10;
            suggestions.push('Quantify more achievements with specific numbers, percentages, or metrics');
        }

        // Score based on action verbs
        const actionVerbRate = achievements.length > 0 ? actionVerbCount / achievements.length : 0;
        if (actionVerbRate >= 0.8) {
            score += 15;
        } else if (actionVerbRate >= 0.5) {
            score += 8;
        } else {
            suggestions.push('Start more bullet points with strong action verbs');
        }

        // Check for industry relevance
        if (targetIndustry && this.industryKeywords.has(targetIndustry)) {
            const industryWords = this.industryKeywords.get(targetIndustry)!;
            const relevantKeywords = industryWords.filter(keyword =>
                content.toLowerCase().includes(keyword.toLowerCase())
            );

            if (relevantKeywords.length >= 5) {
                score += 15;
            } else if (relevantKeywords.length >= 2) {
                score += 8;
            } else {
                suggestions.push(`Include more ${targetIndustry} industry keywords in your experience descriptions`);
            }
        }

        return {
            score: Math.min(100, Math.max(0, score)),
            feedback: this.generateSectionFeedback('experience', score),
            suggestions,
            issues,
            wordCount,
            impact: 'high'
        };
    }

    private analyzeEducationSection(content: string): SectionAnalysis {
        const wordCount = content.split(/\s+/).length;
        let score = 70; // Education is generally straightforward
        const suggestions: string[] = [];
        const issues: string[] = [];

        // Check for degree completion
        if (content.toLowerCase().includes('bachelor') || content.toLowerCase().includes('master') ||
            content.toLowerCase().includes('phd') || content.toLowerCase().includes('doctorate')) {
            score += 10;
        }

        // Check for GPA (if mentioned)
        if (/gpa.*[3-4]\.\d/i.test(content)) {
            score += 5;
        }

        // Check for honors/awards
        if (/magna cum laude|summa cum laude|cum laude|dean.*list|honor/i.test(content)) {
            score += 10;
        } else {
            suggestions.push('Include academic honors, awards, or relevant coursework if applicable');
        }

        // Check for relevant coursework or certifications
        if (content.toLowerCase().includes('relevant coursework') ||
            content.toLowerCase().includes('certification')) {
            score += 5;
        }

        return {
            score: Math.min(100, Math.max(0, score)),
            feedback: this.generateSectionFeedback('education', score),
            suggestions,
            issues,
            wordCount,
            impact: 'medium'
        };
    }

    private analyzeSkillsSection(content: string, targetIndustry?: string): SectionAnalysis {
        const wordCount = content.split(/\s+/).length;
        let score = 50;
        const suggestions: string[] = [];
        const issues: string[] = [];

        // Count skills
        const skills = content.split(/[,•\n]/).map(s => s.trim()).filter(s => s.length > 0);

        if (skills.length < 8) {
            score -= 10;
            suggestions.push('Include more relevant skills (aim for 8-15 key skills)');
        } else if (skills.length > 20) {
            score -= 5;
            suggestions.push('Focus on your most relevant and strongest skills');
        } else {
            score += 15;
        }

        // Check for industry relevance
        if (targetIndustry && this.industryKeywords.has(targetIndustry)) {
            const industryWords = this.industryKeywords.get(targetIndustry)!;
            const relevantSkills = skills.filter(skill =>
                industryWords.some(keyword =>
                    skill.toLowerCase().includes(keyword.toLowerCase())
                )
            );

            if (relevantSkills.length >= 5) {
                score += 20;
            } else if (relevantSkills.length >= 3) {
                score += 10;
            } else {
                suggestions.push(`Include more ${targetIndustry} industry-specific skills`);
            }
        }

        // Check for skill categorization
        if (content.includes('Technical') || content.includes('Programming') ||
            content.includes('Languages') || content.includes('Frameworks')) {
            score += 10;
        } else {
            suggestions.push('Organize skills into categories (e.g., Technical, Languages, Frameworks)');
        }

        return {
            score: Math.min(100, Math.max(0, score)),
            feedback: this.generateSectionFeedback('skills', score),
            suggestions,
            issues,
            wordCount,
            impact: 'high'
        };
    }

    private analyzeKeywords(content: string, targetIndustry?: string): any {
        const allKeywords: string[] = [];
        const missingKeywords: string[] = [];

        if (targetIndustry && this.industryKeywords.has(targetIndustry)) {
            const industryWords = this.industryKeywords.get(targetIndustry)!;

            industryWords.forEach(keyword => {
                if (content.toLowerCase().includes(keyword.toLowerCase())) {
                    allKeywords.push(keyword);
                } else {
                    missingKeywords.push(keyword);
                }
            });
        }

        const atsScore = Math.min(100, (allKeywords.length / (allKeywords.length + missingKeywords.length)) * 100);

        return {
            industry: allKeywords,
            missing: missingKeywords.slice(0, 10), // Top 10 missing
            suggestions: this.generateKeywordSuggestions(missingKeywords, targetIndustry),
            atsScore: Math.round(atsScore)
        };
    }

    private generateKeywordSuggestions(missingKeywords: string[], targetIndustry?: string): string[] {
        return missingKeywords.slice(0, 5).map(keyword =>
            `Consider adding "${keyword}" to relevant sections of your resume`
        );
    }

    private generateRecommendations(sectionAnalyses: { [key: string]: SectionAnalysis }, keywordAnalysis: any, content: string): Recommendation[] {
        const recommendations: Recommendation[] = [];

        // Critical recommendations
        Object.entries(sectionAnalyses).forEach(([section, analysis]) => {
            if (analysis.score < 60) {
                recommendations.push({
                    type: 'critical',
                    category: 'content',
                    title: `Improve ${section} section`,
                    description: analysis.feedback,
                    impact: 'Significantly improves resume effectiveness',
                    priority: 1
                });
            }
        });

        // ATS optimization
        if (keywordAnalysis.atsScore < 70) {
            recommendations.push({
                type: 'important',
                category: 'keywords',
                title: 'Optimize for ATS systems',
                description: `Your resume only matches ${keywordAnalysis.atsScore}% of industry keywords. Add relevant keywords to improve ATS compatibility.`,
                impact: 'Increases chances of passing ATS screening',
                priority: 2
            });
        }

        // Quantification
        const hasQuantification = this.quantifiableMetrics.some(pattern => pattern.test(content));
        if (!hasQuantification) {
            recommendations.push({
                type: 'important',
                category: 'content',
                title: 'Add quantifiable achievements',
                description: 'Include specific numbers, percentages, and metrics to demonstrate your impact.',
                example: 'Instead of "Improved sales" write "Increased sales by 25% over 6 months"',
                impact: 'Makes achievements more credible and impactful',
                priority: 3
            });
        }

        return recommendations.sort((a, b) => a.priority - b.priority);
    }

    private assessMarketReadiness(content: string, sectionAnalyses: { [key: string]: SectionAnalysis }): any {
        // Simple heuristic-based assessment
        const experienceSection = sectionAnalyses.experience;
        const avgScore = Object.values(sectionAnalyses).reduce((sum, analysis) => sum + analysis.score, 0) / Object.keys(sectionAnalyses).length;

        let level: 'entry' | 'mid' | 'senior' | 'executive' = 'entry';

        // Determine experience level based on content analysis
        const yearMatches = content.match(/\b\d+\+?\s*years?\b/gi) || [];
        const seniorWords = ['senior', 'lead', 'principal', 'director', 'manager', 'vp', 'ceo', 'cto'];
        const hasSeniorTitle = seniorWords.some(word => content.toLowerCase().includes(word));

        if (hasSeniorTitle && yearMatches.length > 2) {
            level = 'executive';
        } else if (hasSeniorTitle || yearMatches.length > 1) {
            level = 'senior';
        } else if (yearMatches.length > 0) {
            level = 'mid';
        }

        return {
            level,
            industries: ['Technology', 'Finance', 'Healthcare'], // Simplified
            estimatedSalaryRange: this.getSalaryRange(level),
            competitiveAdvantages: this.identifyCompetitiveAdvantages(content, avgScore)
        };
    }

    private getSalaryRange(level: string): string {
        const ranges = {
            'entry': '$45,000 - $65,000',
            'mid': '$65,000 - $95,000',
            'senior': '$95,000 - $140,000',
            'executive': '$140,000 - $250,000+'
        };
        return ranges[level as keyof typeof ranges] || ranges.entry;
    }

    private identifyCompetitiveAdvantages(content: string, avgScore: number): string[] {
        const advantages: string[] = [];

        if (avgScore >= 85) {
            advantages.push('Well-structured and comprehensive resume');
        }

        if (this.quantifiableMetrics.some(pattern => pattern.test(content))) {
            advantages.push('Strong quantifiable achievements');
        }

        if (content.toLowerCase().includes('award') || content.toLowerCase().includes('recognition')) {
            advantages.push('Industry recognition and awards');
        }

        return advantages;
    }

    private calculateOverallScore(sectionAnalyses: { [key: string]: SectionAnalysis }, keywordAnalysis: any): number {
        const sectionScores = Object.values(sectionAnalyses);
        const weightedScore = sectionScores.reduce((sum, analysis) => {
            const weight = analysis.impact === 'high' ? 1.5 : analysis.impact === 'medium' ? 1.0 : 0.5;
            return sum + (analysis.score * weight);
        }, 0);

        const totalWeight = sectionScores.reduce((sum, analysis) => {
            return sum + (analysis.impact === 'high' ? 1.5 : analysis.impact === 'medium' ? 1.0 : 0.5);
        }, 0);

        const avgSectionScore = weightedScore / totalWeight;
        const atsScore = keywordAnalysis.atsScore;

        // Combine section score (70%) and ATS score (30%)
        return Math.round((avgSectionScore * 0.7) + (atsScore * 0.3));
    }

    private scoreToGrade(score: number): 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D' | 'F' {
        if (score >= 97) return 'A+';
        if (score >= 93) return 'A';
        if (score >= 87) return 'B+';
        if (score >= 83) return 'B';
        if (score >= 77) return 'C+';
        if (score >= 70) return 'C';
        if (score >= 60) return 'D';
        return 'F';
    }

    private identifyStrengths(sectionAnalyses: { [key: string]: SectionAnalysis }, keywordAnalysis: any): string[] {
        const strengths: string[] = [];

        Object.entries(sectionAnalyses).forEach(([section, analysis]) => {
            if (analysis.score >= 85) {
                strengths.push(`Excellent ${section} section with strong content`);
            }
        });

        if (keywordAnalysis.atsScore >= 80) {
            strengths.push('Strong ATS compatibility with relevant industry keywords');
        }

        return strengths;
    }

    private identifyWeaknesses(sectionAnalyses: { [key: string]: SectionAnalysis }, keywordAnalysis: any): string[] {
        const weaknesses: string[] = [];

        Object.entries(sectionAnalyses).forEach(([section, analysis]) => {
            if (analysis.score < 70) {
                weaknesses.push(`${section} section needs improvement (${analysis.score}/100)`);
            }
        });

        if (keywordAnalysis.atsScore < 60) {
            weaknesses.push('Low ATS compatibility - missing industry keywords');
        }

        return weaknesses;
    }

    private generateOverallSummary(score: number, sectionAnalyses: { [key: string]: SectionAnalysis }): string {
        const grade = this.scoreToGrade(score);
        const strongSections = Object.entries(sectionAnalyses)
            .filter(([_, analysis]) => analysis.score >= 80)
            .map(([section, _]) => section);

        const weakSections = Object.entries(sectionAnalyses)
            .filter(([_, analysis]) => analysis.score < 70)
            .map(([section, _]) => section);

        let summary = `Your resume receives a ${grade} grade with an overall score of ${score}/100. `;

        if (strongSections.length > 0) {
            summary += `Strong performance in: ${strongSections.join(', ')}. `;
        }

        if (weakSections.length > 0) {
            summary += `Areas for improvement: ${weakSections.join(', ')}. `;
        }

        if (score >= 85) {
            summary += 'Your resume is competitive and ready for most applications.';
        } else if (score >= 70) {
            summary += 'Your resume has good potential but could benefit from targeted improvements.';
        } else {
            summary += 'Your resume needs significant improvements to be competitive.';
        }

        return summary;
    }

    private generateSectionFeedback(section: string, score: number): string {
        const feedbackMap: { [key: string]: { [key: string]: string } } = {
            summary: {
                excellent: 'Outstanding professional summary with clear value proposition and quantified achievements.',
                good: 'Strong summary that effectively communicates your professional brand.',
                fair: 'Adequate summary but could be more compelling and specific.',
                poor: 'Summary needs significant improvement - lacks impact and specificity.'
            },
            experience: {
                excellent: 'Exceptional experience section with strong action verbs and quantified achievements.',
                good: 'Well-structured experience section with clear accomplishments.',
                fair: 'Experience section is adequate but could use more quantification and impact.',
                poor: 'Experience section lacks specificity and measurable achievements.'
            },
            education: {
                excellent: 'Comprehensive education section with relevant details.',
                good: 'Well-presented educational background.',
                fair: 'Basic education information provided.',
                poor: 'Education section could include more relevant details.'
            },
            skills: {
                excellent: 'Comprehensive and well-organized skills section.',
                good: 'Good mix of relevant technical and soft skills.',
                fair: 'Adequate skills listed but could be more comprehensive.',
                poor: 'Skills section needs expansion and better organization.'
            }
        };

        const quality = score >= 85 ? 'excellent' : score >= 75 ? 'good' : score >= 60 ? 'fair' : 'poor';
        return feedbackMap[section]?.[quality] || 'Section analysis completed.';
    }
}

export default new IntelligentResumeAnalyzer();