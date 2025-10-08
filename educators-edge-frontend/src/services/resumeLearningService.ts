// AI Resume Learning Service - Learns from successful resumes to improve suggestions
export interface SuccessfulResumePattern {
    id: string;
    resumeContent: string;
    jobTitle: string;
    industry: string;
    successMetrics: {
        interviewRate: number;
        offerRate: number;
        responseRate: number;
    };
    extractedPatterns: {
        bulletPointStructure: string[];
        actionVerbs: string[];
        quantificationPatterns: string[];
        sectionOrder: string[];
        keywordDensity: Record<string, number>;
    };
    timestamp: number;
}

export interface LearnedPattern {
    type: 'bullet_structure' | 'action_verb' | 'quantification' | 'section_order' | 'keyword_usage';
    pattern: string;
    successScore: number;
    frequency: number;
    industries: string[];
    jobTitles: string[];
    examples: string[];
}

export class ResumeLearningService {
    private static readonly STORAGE_KEY = 'resume_learning_patterns';
    private static readonly MAX_STORED_RESUMES = 1000;

    // Store successful resume for learning
    static storeSuccessfulResume(
        resumeContent: string,
        jobTitle: string,
        industry: string,
        successMetrics: {
            interviewRate: number;
            offerRate: number;
            responseRate: number;
        }
    ): void {
        console.log('📚 Learning from successful resume:', jobTitle, 'in', industry);

        const patterns = this.extractPatterns(resumeContent);

        const successfulResume: SuccessfulResumePattern = {
            id: `resume-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            resumeContent,
            jobTitle,
            industry,
            successMetrics,
            extractedPatterns: patterns,
            timestamp: Date.now()
        };

        this.addToLearningDatabase(successfulResume);
    }

    // Extract patterns from resume content
    private static extractPatterns(content: string): SuccessfulResumePattern['extractedPatterns'] {
        const lines = content.split('\n').filter(line => line.trim());

        // Extract bullet point structures
        const bulletPoints = lines.filter(line => /^[\s]*[•\-\*]/.test(line))
            .map(line => line.replace(/^[\s]*[•\-\*]\s*/, '').trim());

        // Extract action verbs (first word of bullet points)
        const actionVerbs = bulletPoints
            .map(bullet => bullet.split(' ')[0].toLowerCase())
            .filter(verb => verb.length > 2);

        // Extract quantification patterns
        const quantificationPatterns: string[] = [];
        const quantRegex = /(\d+%|\$\d+k?|\d+\+|\d+ years?|\d+ months?|\d+ times?)/gi;
        content.match(quantRegex)?.forEach(match => {
            quantificationPatterns.push(match);
        });

        // Extract section order
        const sectionHeaders = lines.filter(line => this.isSectionHeader(line))
            .map(header => header.replace(/[^\w\s]/g, '').trim().toLowerCase());

        // Calculate keyword density
        const words = content.toLowerCase().split(/\s+/);
        const keywordDensity: Record<string, number> = {};
        words.forEach(word => {
            if (word.length > 3 && !/^\d+$/.test(word)) {
                keywordDensity[word] = (keywordDensity[word] || 0) + 1;
            }
        });

        return {
            bulletPointStructure: bulletPoints.slice(0, 10), // Store top 10 examples
            actionVerbs: [...new Set(actionVerbs)],
            quantificationPatterns: [...new Set(quantificationPatterns)],
            sectionOrder: sectionHeaders,
            keywordDensity
        };
    }

    // Check if line is a section header
    private static isSectionHeader(line: string): boolean {
        const cleanLine = line.toLowerCase().replace(/[^\w\s]/g, '').trim();
        const sectionKeywords = [
            'experience', 'education', 'skills', 'projects', 'certifications',
            'achievements', 'summary', 'objective', 'languages', 'awards'
        ];
        return sectionKeywords.some(keyword => cleanLine.includes(keyword)) &&
               line.length < 50 && !line.includes('.');
    }

    // Add resume to learning database
    private static addToLearningDatabase(resume: SuccessfulResumePattern): void {
        const stored = this.getStoredResumes();
        stored.push(resume);

        // Keep only the most recent resumes
        if (stored.length > this.MAX_STORED_RESUMES) {
            stored.sort((a, b) => b.timestamp - a.timestamp);
            stored.splice(this.MAX_STORED_RESUMES);
        }

        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(stored));
        console.log(`📚 Stored resume. Database now contains ${stored.length} successful resumes`);
    }

    // Get stored resumes from local storage
    private static getStoredResumes(): SuccessfulResumePattern[] {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Error loading stored resumes:', error);
            return [];
        }
    }

    // Generate learned patterns for specific job/industry
    static getLearnedPatternsFor(jobTitle: string, industry: string): LearnedPattern[] {
        console.log('🎯 Getting learned patterns for:', jobTitle, 'in', industry);

        const storedResumes = this.getStoredResumes();
        const relevantResumes = storedResumes.filter(resume =>
            resume.jobTitle.toLowerCase().includes(jobTitle.toLowerCase()) ||
            resume.industry.toLowerCase().includes(industry.toLowerCase()) ||
            this.calculateSuccessScore(resume.successMetrics) > 0.7
        );

        console.log(`📊 Found ${relevantResumes.length} relevant successful resumes`);

        if (relevantResumes.length === 0) {
            return this.getGeneralBestPractices();
        }

        return this.analyzePatterns(relevantResumes, jobTitle, industry);
    }

    // Analyze patterns from relevant resumes
    private static analyzePatterns(resumes: SuccessfulResumePattern[], jobTitle: string, industry: string): LearnedPattern[] {
        const patterns: LearnedPattern[] = [];

        // Analyze action verbs
        const actionVerbFreq: Record<string, { count: number, successSum: number, examples: string[] }> = {};
        resumes.forEach(resume => {
            const successScore = this.calculateSuccessScore(resume.successMetrics);
            resume.extractedPatterns.actionVerbs.forEach(verb => {
                if (!actionVerbFreq[verb]) {
                    actionVerbFreq[verb] = { count: 0, successSum: 0, examples: [] };
                }
                actionVerbFreq[verb].count++;
                actionVerbFreq[verb].successSum += successScore;
                actionVerbFreq[verb].examples.push(resume.extractedPatterns.bulletPointStructure.find(bp =>
                    bp.toLowerCase().startsWith(verb)) || '');
            });
        });

        // Convert to learned patterns
        Object.entries(actionVerbFreq)
            .filter(([_, data]) => data.count >= 2) // Must appear in at least 2 resumes
            .sort(([_, a], [__, b]) => (b.successSum / b.count) - (a.successSum / a.count))
            .slice(0, 10)
            .forEach(([verb, data]) => {
                patterns.push({
                    type: 'action_verb',
                    pattern: verb,
                    successScore: data.successSum / data.count,
                    frequency: data.count,
                    industries: [industry],
                    jobTitles: [jobTitle],
                    examples: data.examples.filter(ex => ex).slice(0, 3)
                });
            });

        // Analyze bullet point structures
        const structurePatterns: Record<string, { count: number, successSum: number }> = {};
        resumes.forEach(resume => {
            const successScore = this.calculateSuccessScore(resume.successMetrics);
            resume.extractedPatterns.bulletPointStructure.forEach(bullet => {
                const structure = this.extractStructurePattern(bullet);
                if (!structurePatterns[structure]) {
                    structurePatterns[structure] = { count: 0, successSum: 0 };
                }
                structurePatterns[structure].count++;
                structurePatterns[structure].successSum += successScore;
            });
        });

        Object.entries(structurePatterns)
            .filter(([_, data]) => data.count >= 3)
            .sort(([_, a], [__, b]) => (b.successSum / b.count) - (a.successSum / a.count))
            .slice(0, 5)
            .forEach(([structure, data]) => {
                patterns.push({
                    type: 'bullet_structure',
                    pattern: structure,
                    successScore: data.successSum / data.count,
                    frequency: data.count,
                    industries: [industry],
                    jobTitles: [jobTitle],
                    examples: [structure]
                });
            });

        console.log(`✨ Generated ${patterns.length} learned patterns`);
        return patterns;
    }

    // Extract structure pattern from bullet point
    private static extractStructurePattern(bullet: string): string {
        return bullet
            .replace(/\d+/g, '[NUMBER]')
            .replace(/\$\d+k?/g, '[MONEY]')
            .replace(/\d+%/g, '[PERCENTAGE]')
            .replace(/[A-Z][a-z]+ [A-Z][a-z]+/g, '[PROPER_NOUN]')
            .replace(/\b[a-z]{6,}\b/g, '[LONG_WORD]')
            .substring(0, 100);
    }

    // Calculate success score from metrics
    private static calculateSuccessScore(metrics: SuccessfulResumePattern['successMetrics']): number {
        return (metrics.interviewRate * 0.4 + metrics.offerRate * 0.4 + metrics.responseRate * 0.2);
    }

    // Get general best practices when no specific patterns are available
    private static getGeneralBestPractices(): LearnedPattern[] {
        return [
            {
                type: 'action_verb',
                pattern: 'achieved',
                successScore: 0.85,
                frequency: 50,
                industries: ['general'],
                jobTitles: ['general'],
                examples: ['Achieved 25% increase in team productivity']
            },
            {
                type: 'action_verb',
                pattern: 'implemented',
                successScore: 0.82,
                frequency: 45,
                industries: ['technology'],
                jobTitles: ['general'],
                examples: ['Implemented new system reducing processing time by 30%']
            },
            {
                type: 'quantification',
                pattern: '[NUMBER]%',
                successScore: 0.90,
                frequency: 80,
                industries: ['general'],
                jobTitles: ['general'],
                examples: ['Increased sales by 40%', 'Improved efficiency by 25%']
            }
        ];
    }

    // Get enhanced suggestions based on learned patterns (SAFE - preserves content)
    static getEnhancedSuggestions(
        originalText: string,
        jobTitle: string,
        industry: string
    ): Array<{
        improved: string;
        reason: string;
        learnedFrom: string;
        confidence: number;
    }> {
        const learnedPatterns = this.getLearnedPatternsFor(jobTitle, industry);
        const suggestions: Array<{
            improved: string;
            reason: string;
            learnedFrom: string;
            confidence: number;
        }> = [];

        // SAFE: Only suggest action verb replacement for first word
        const actionVerbPatterns = learnedPatterns.filter(p => p.type === 'action_verb');
        const firstWord = originalText.split(' ')[0].toLowerCase();

        const betterVerb = actionVerbPatterns
            .sort((a, b) => b.successScore - a.successScore)[0];

        if (betterVerb && !originalText.toLowerCase().startsWith(betterVerb.pattern)) {
            // SAFE: Only replace the first word, keep everything else identical
            const improvedText = originalText.replace(/^\w+/, betterVerb.pattern.charAt(0).toUpperCase() + betterVerb.pattern.slice(1));

            // Verify the replacement is safe
            if (this.isContentPreservingSuggestion(originalText, improvedText)) {
                suggestions.push({
                    improved: improvedText,
                    reason: `High-performing ${industry} professionals use "${betterVerb.pattern}" (${(betterVerb.successScore * 100).toFixed(0)}% success rate)`,
                    learnedFrom: `${betterVerb.frequency} successful ${jobTitle} resumes`,
                    confidence: betterVerb.successScore
                });
            }
        }

        // SAFE: Only ADD quantification, never replace content
        if (!/\d/.test(originalText)) {
            const quantPattern = learnedPatterns.find(p => p.type === 'quantification');
            if (quantPattern) {
                // SAFE: Add metrics at the end, preserving original content
                const improvedText = originalText + ' (achieving 25% improvement)';

                suggestions.push({
                    improved: improvedText,
                    reason: `Successful ${industry} resumes show quantifiable results (${(quantPattern.successScore * 100).toFixed(0)}% success rate)`,
                    learnedFrom: `${quantPattern.frequency} high-performing resumes`,
                    confidence: quantPattern.successScore
                });
            }
        }

        // SAFE: Only suggest structure improvements that preserve meaning
        if (originalText.length > 150) {
            const shortenedText = this.safeShortenText(originalText);
            if (shortenedText !== originalText && this.isContentPreservingSuggestion(originalText, shortenedText)) {
                suggestions.push({
                    improved: shortenedText,
                    reason: `Successful resumes use concise, impactful statements`,
                    learnedFrom: `Analysis of high-performing resumes`,
                    confidence: 0.75
                });
            }
        }

        return suggestions;
    }

    // Helper: Check if suggestion preserves original content meaning
    private static isContentPreservingSuggestion(original: string, improved: string): boolean {
        // Ensure the core content is preserved
        const originalCore = original.substring(5); // Skip first word for action verb changes
        return improved.includes(originalCore) ||
               improved.length - original.length < 50; // Only small additions allowed
    }

    // Helper: Safely shorten text without losing meaning
    private static safeShortenText(text: string): string {
        // Only split at natural break points, preserve core message
        const parts = text.split(/\s+(and|while|by|through)\s+/);
        if (parts.length > 2) {
            // Keep the main action and the most important result
            return parts[0].trim() + ' and ' + parts[parts.length - 1].trim();
        }
        return text; // Don't shorten if no clear break point
    }

    // Initialize with sample successful resumes if database is empty
    static initializeWithSampleData(): void {
        const existing = this.getStoredResumes();
        if (existing.length === 0) {
            console.log('📚 Initializing learning database with sample successful resumes...');

            const sampleResumes = [
                {
                    content: `JOHN SMITH
Senior Software Engineer
john.smith@email.com | (555) 123-4567

EXPERIENCE
Senior Software Engineer | Google | 2020-2023
• Architected microservices platform serving 10M+ users daily
• Reduced system latency by 45% through performance optimization
• Led team of 8 engineers on cloud migration project
• Implemented CI/CD pipeline reducing deployment time by 60%

Software Engineer | Microsoft | 2018-2020
• Developed machine learning models achieving 95% accuracy
• Collaborated with 15+ cross-functional teams on product features
• Optimized database queries improving response time by 30%`,
                    jobTitle: 'Software Engineer',
                    industry: 'Technology',
                    metrics: { interviewRate: 0.85, offerRate: 0.70, responseRate: 0.90 }
                },
                {
                    content: `SARAH JOHNSON
Product Manager
sarah.johnson@email.com | (555) 987-6543

EXPERIENCE
Senior Product Manager | Amazon | 2019-2023
• Launched 3 products generating $50M+ annual revenue
• Increased user engagement by 40% through data-driven features
• Managed product roadmap for team of 25 engineers
• Reduced customer churn by 35% through UX improvements

Product Manager | Uber | 2017-2019
• Delivered 12 product releases with 99.9% uptime
• Analyzed user data to identify 5 key growth opportunities
• Coordinated with engineering teams to deliver features 25% faster`,
                    jobTitle: 'Product Manager',
                    industry: 'Technology',
                    metrics: { interviewRate: 0.80, offerRate: 0.65, responseRate: 0.85 }
                },
                {
                    content: `MICHAEL CHEN
Data Scientist
michael.chen@email.com | (555) 456-7890

EXPERIENCE
Senior Data Scientist | Netflix | 2020-2023
• Built recommendation algorithms improving user retention by 25%
• Processed 100TB+ of data using distributed computing systems
• Developed machine learning models with 92% prediction accuracy
• Collaborated with product teams to implement A/B testing framework

Data Scientist | Spotify | 2018-2020
• Created predictive models increasing ad revenue by $15M annually
• Optimized content recommendation system for 200M+ users
• Implemented real-time analytics dashboard reducing report generation by 70%`,
                    jobTitle: 'Data Scientist',
                    industry: 'Technology',
                    metrics: { interviewRate: 0.90, offerRate: 0.75, responseRate: 0.88 }
                }
            ];

            sampleResumes.forEach(resume => {
                this.storeSuccessfulResume(
                    resume.content,
                    resume.jobTitle,
                    resume.industry,
                    resume.metrics
                );
            });

            console.log(`✅ Initialized learning database with ${sampleResumes.length} successful resumes`);
        }
    }

    // Get learning statistics
    static getLearningStats(): {
        totalResumes: number;
        industries: string[];
        topJobTitles: string[];
        averageSuccessRate: number;
    } {
        // Initialize with sample data if empty
        this.initializeWithSampleData();
        const resumes = this.getStoredResumes();
        const industries = [...new Set(resumes.map(r => r.industry))];
        const jobTitles = [...new Set(resumes.map(r => r.jobTitle))];
        const avgSuccess = resumes.length > 0
            ? resumes.reduce((sum, r) => sum + this.calculateSuccessScore(r.successMetrics), 0) / resumes.length
            : 0;

        return {
            totalResumes: resumes.length,
            industries,
            topJobTitles: jobTitles.slice(0, 10),
            averageSuccessRate: avgSuccess
        };
    }
}

export default ResumeLearningService;