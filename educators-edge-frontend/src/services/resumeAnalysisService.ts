import apiClient from './apiClient';

interface JobDescription {
    title: string;
    company: string;
    description: string;
    requirements: string[];
    preferredQualifications: string[];
    keywords: string[];
}

interface ResumeAnalysisRequest {
    resumeContent: string;
    jobDescription: JobDescription;
    analysisType: 'inline_comments' | 'overall_feedback' | 'keyword_optimization';
    targetRole: string;
}

interface ResumeInlineComment {
    id: string;
    startOffset: number;
    endOffset: number;
    originalText: string;
    commentType: 'phrasing_improvement' | 'role_alignment' | 'keyword_optimization' | 'quantification' | 'action_verb';
    severity: 'high' | 'medium' | 'low';
    suggestion: string;
    alternatives: string[];
    reasoning: string;
    jobRelevance: number; // 0-1 score
    category: 'experience' | 'skills' | 'education' | 'summary' | 'achievements';
}

interface ResumeAnalysisResponse {
    success: boolean;
    inlineComments: ResumeInlineComment[];
    overallFeedback: {
        matchScore: number; // 0-100 percentage match with job
        keywordCoverage: number; // 0-100 percentage of job keywords covered
        missingKeywords: string[];
        strengths: string[];
        improvementAreas: string[];
    };
    roleSpecificSuggestions: {
        titleOptimizations: Array<{original: string, suggested: string, reason: string}>;
        experienceEnhancements: Array<{section: string, improvement: string}>;
        skillsAlignment: Array<{current: string, suggested: string, relevance: string}>;
    };
    error?: string;
}

class ResumeAnalysisService {
    private baseUrl = '/api/ai/resume-analysis';
    private commonRoleMappings = {
        // Academic to Corporate mappings
        'professor': ['senior consultant', 'subject matter expert', 'technical lead', 'research director'],
        'assistant professor': ['consultant', 'senior analyst', 'technical specialist', 'product manager'],
        'faculty member': ['administrative assistant', 'program coordinator', 'educational specialist', 'curriculum developer'],
        'teaching assistant': ['training coordinator', 'junior analyst', 'program assistant', 'content developer'],
        'research assistant': ['data analyst', 'research associate', 'business analyst', 'market research analyst'],
        'graduate student': ['junior consultant', 'analyst', 'associate', 'trainee'],

        // Industry-specific mappings
        'software engineer': ['full stack developer', 'backend developer', 'frontend developer', 'DevOps engineer'],
        'data scientist': ['machine learning engineer', 'analytics consultant', 'business intelligence analyst'],
        'project manager': ['program manager', 'product manager', 'operations manager', 'delivery manager'],
        'marketing specialist': ['digital marketing coordinator', 'content marketing manager', 'brand manager'],

        // Generic to specific mappings
        'manager': ['team lead', 'department head', 'operations manager', 'program director'],
        'coordinator': ['specialist', 'administrator', 'program manager', 'operations coordinator'],
        'assistant': ['associate', 'coordinator', 'specialist', 'administrator']
    };

    private industryKeywords = {
        'technology': ['agile', 'scrum', 'API', 'cloud computing', 'DevOps', 'CI/CD', 'microservices', 'scalable'],
        'healthcare': ['patient care', 'compliance', 'HIPAA', 'clinical', 'healthcare delivery', 'quality improvement'],
        'finance': ['financial analysis', 'risk management', 'regulatory compliance', 'portfolio management', 'ROI'],
        'education': ['curriculum development', 'student engagement', 'learning outcomes', 'assessment', 'pedagogy'],
        'consulting': ['client engagement', 'stakeholder management', 'strategic planning', 'process improvement'],
        'marketing': ['brand management', 'digital marketing', 'campaign optimization', 'customer acquisition', 'analytics'],
        'operations': ['process optimization', 'supply chain', 'quality control', 'efficiency improvement', 'KPI tracking']
    };

    async analyzeResume(request: ResumeAnalysisRequest): Promise<ResumeAnalysisResponse> {
        try {
            console.log('📄 Analyzing resume for role:', request.targetRole);

            // First, perform local analysis for quick suggestions
            const localAnalysis = this.performLocalAnalysis(request);

            // Then call the Claude API for advanced analysis
            const response = await apiClient.post<ResumeAnalysisResponse>(this.baseUrl, {
                resumeContent: request.resumeContent,
                jobDescription: request.jobDescription,
                analysisType: request.analysisType,
                targetRole: request.targetRole,
                localSuggestions: localAnalysis
            });

            // Merge local and API analysis
            return this.mergeAnalysisResults(localAnalysis, response.data);

        } catch (error: any) {
            console.error('❌ Resume analysis error:', error);

            // Return comprehensive fallback analysis
            return this.generateFallbackAnalysis(request);
        }
    }

    private performLocalAnalysis(request: ResumeAnalysisRequest): Partial<ResumeAnalysisResponse> {
        const { resumeContent, jobDescription, targetRole } = request;
        const inlineComments: ResumeInlineComment[] = [];

        // Analyze job description keywords
        const jobKeywords = this.extractJobKeywords(jobDescription);
        const resumeWords = resumeContent.toLowerCase();

        // Find role-specific improvements
        this.findRoleSpecificImprovements(resumeContent, targetRole, inlineComments);

        // Find missing keywords
        this.findKeywordOpportunities(resumeContent, jobKeywords, inlineComments);

        // Find phrasing improvements
        this.findPhrasingImprovements(resumeContent, jobDescription, inlineComments);

        return {
            success: true,
            inlineComments,
            overallFeedback: {
                matchScore: this.calculateMatchScore(resumeContent, jobDescription),
                keywordCoverage: this.calculateKeywordCoverage(resumeContent, jobKeywords),
                missingKeywords: jobKeywords.filter(keyword => !resumeWords.includes(keyword.toLowerCase())),
                strengths: [],
                improvementAreas: []
            }
        };
    }

    private findRoleSpecificImprovements(resumeContent: string, targetRole: string, comments: ResumeInlineComment[]) {
        const lines = resumeContent.split('\n');
        const targetRoleLower = targetRole.toLowerCase();

        lines.forEach((line, lineIndex) => {
            const lineStart = resumeContent.split('\n').slice(0, lineIndex).join('\n').length + (lineIndex > 0 ? 1 : 0);

            // Check for role title improvements
            Object.entries(this.commonRoleMappings).forEach(([currentRole, alternatives]) => {
                if (line.toLowerCase().includes(currentRole)) {
                    const startOffset = lineStart + line.toLowerCase().indexOf(currentRole);
                    const endOffset = startOffset + currentRole.length;

                    // Find best alternative based on target role
                    const bestAlternative = this.findBestRoleAlternative(currentRole, targetRole, alternatives);

                    comments.push({
                        id: `role_${lineIndex}_${startOffset}`,
                        startOffset,
                        endOffset,
                        originalText: currentRole,
                        commentType: 'role_alignment',
                        severity: 'high',
                        suggestion: `Consider changing "${currentRole}" to "${bestAlternative}" to better align with the target role.`,
                        alternatives: alternatives,
                        reasoning: `"${bestAlternative}" is more commonly used in ${targetRole} positions and will resonate better with hiring managers.`,
                        jobRelevance: 0.9,
                        category: 'experience'
                    });
                }
            });

            // Check for weak action verbs
            const weakVerbs = ['responsible for', 'worked on', 'helped with', 'assisted in', 'involved in'];
            const strongVerbs = ['led', 'managed', 'developed', 'implemented', 'optimized', 'created', 'established', 'improved'];

            weakVerbs.forEach(weakVerb => {
                if (line.toLowerCase().includes(weakVerb)) {
                    const startOffset = lineStart + line.toLowerCase().indexOf(weakVerb);
                    const endOffset = startOffset + weakVerb.length;

                    comments.push({
                        id: `verb_${lineIndex}_${startOffset}`,
                        startOffset,
                        endOffset,
                        originalText: weakVerb,
                        commentType: 'action_verb',
                        severity: 'medium',
                        suggestion: `Replace "${weakVerb}" with a stronger action verb.`,
                        alternatives: strongVerbs,
                        reasoning: 'Strong action verbs demonstrate leadership and impact more effectively.',
                        jobRelevance: 0.7,
                        category: 'experience'
                    });
                }
            });
        });
    }

    private findKeywordOpportunities(resumeContent: string, jobKeywords: string[], comments: ResumeInlineComment[]) {
        const resumeLower = resumeContent.toLowerCase();

        // Find sections where keywords could be naturally added
        const sections = this.identifyResumeSections(resumeContent);

        jobKeywords.forEach(keyword => {
            if (!resumeLower.includes(keyword.toLowerCase())) {
                // Suggest where to add missing keywords
                const suggestedSection = this.findBestSectionForKeyword(keyword, sections);
                if (suggestedSection) {
                    comments.push({
                        id: `keyword_${keyword.replace(/\s/g, '_')}`,
                        startOffset: suggestedSection.startOffset,
                        endOffset: suggestedSection.endOffset,
                        originalText: suggestedSection.text.substring(0, 50) + '...',
                        commentType: 'keyword_optimization',
                        severity: 'high',
                        suggestion: `Consider adding "${keyword}" to this section to match job requirements.`,
                        alternatives: [keyword, `experience with ${keyword}`, `proficient in ${keyword}`],
                        reasoning: `"${keyword}" is mentioned in the job description and adding it here would improve your match score.`,
                        jobRelevance: 0.8,
                        category: suggestedSection.type as any
                    });
                }
            }
        });
    }

    private findPhrasingImprovements(resumeContent: string, jobDescription: JobDescription, comments: ResumeInlineComment[]) {
        const industry = this.detectIndustry(jobDescription.description);
        const industryTerms = this.industryKeywords[industry] || [];

        // Look for generic terms that could be made more industry-specific
        const genericToSpecific = {
            'worked with': `collaborated on ${industry} initiatives`,
            'managed': `led cross-functional ${industry} projects`,
            'developed': `architected and developed`,
            'improved': 'optimized and enhanced',
            'created': 'designed and implemented'
        };

        Object.entries(genericToSpecific).forEach(([generic, specific]) => {
            const regex = new RegExp(generic, 'gi');
            let match;
            while ((match = regex.exec(resumeContent)) !== null) {
                comments.push({
                    id: `phrasing_${match.index}`,
                    startOffset: match.index,
                    endOffset: match.index + generic.length,
                    originalText: generic,
                    commentType: 'phrasing_improvement',
                    severity: 'medium',
                    suggestion: `Consider using more specific language: "${specific}"`,
                    alternatives: [specific, `${generic} ${industry} solutions`, `${generic} enterprise-level`],
                    reasoning: `More specific terminology demonstrates ${industry} expertise.`,
                    jobRelevance: 0.6,
                    category: 'experience'
                });
            }
        });
    }

    private extractJobKeywords(jobDescription: JobDescription): string[] {
        const text = `${jobDescription.description} ${jobDescription.requirements.join(' ')} ${jobDescription.preferredQualifications.join(' ')}`;

        // Extract keywords using common patterns
        const keywords = new Set<string>();

        // Technical skills patterns
        const techPatterns = [
            /\b[A-Z]{2,}\b/g, // Acronyms like API, SQL, AWS
            /\b\w+\s?(programming|language|framework|database|platform|tool|software)\b/gi,
            /\b(experience with|proficient in|knowledge of)\s+([^,\.]+)/gi
        ];

        techPatterns.forEach(pattern => {
            const matches = text.match(pattern);
            if (matches) {
                matches.forEach(match => {
                    keywords.add(match.trim().toLowerCase());
                });
            }
        });

        // Add manual keywords from requirements
        jobDescription.requirements.forEach(req => {
            req.split(/[,;]/).forEach(keyword => {
                if (keyword.trim().length > 2) {
                    keywords.add(keyword.trim().toLowerCase());
                }
            });
        });

        return Array.from(keywords).slice(0, 20); // Top 20 keywords
    }

    private findBestRoleAlternative(currentRole: string, targetRole: string, alternatives: string[]): string {
        // Simple matching logic - can be enhanced with ML
        const targetWords = targetRole.toLowerCase().split(' ');

        let bestMatch = alternatives[0];
        let bestScore = 0;

        alternatives.forEach(alt => {
            const altWords = alt.toLowerCase().split(' ');
            const score = altWords.reduce((acc, word) => {
                return acc + (targetWords.includes(word) ? 1 : 0);
            }, 0);

            if (score > bestScore) {
                bestScore = score;
                bestMatch = alt;
            }
        });

        return bestMatch;
    }

    private identifyResumeSections(resumeContent: string) {
        const sections = [];
        const lines = resumeContent.split('\n');
        let currentOffset = 0;

        const sectionHeaders = [
            { pattern: /experience|work|employment/i, type: 'experience' },
            { pattern: /skills|technical|competencies/i, type: 'skills' },
            { pattern: /education|academic/i, type: 'education' },
            { pattern: /summary|profile|objective/i, type: 'summary' },
            { pattern: /achievements|accomplishments/i, type: 'achievements' }
        ];

        lines.forEach((line, index) => {
            sectionHeaders.forEach(header => {
                if (header.pattern.test(line)) {
                    sections.push({
                        type: header.type,
                        startOffset: currentOffset,
                        endOffset: currentOffset + line.length,
                        text: line
                    });
                }
            });
            currentOffset += line.length + 1; // +1 for newline
        });

        return sections;
    }

    private findBestSectionForKeyword(keyword: string, sections: any[]) {
        // Logic to determine where a keyword would fit best
        const keywordLower = keyword.toLowerCase();

        if (keywordLower.includes('manage') || keywordLower.includes('lead')) {
            return sections.find(s => s.type === 'experience');
        }
        if (keywordLower.includes('skill') || keywordLower.includes('proficient')) {
            return sections.find(s => s.type === 'skills');
        }

        return sections.find(s => s.type === 'experience') || sections[0];
    }

    private calculateMatchScore(resumeContent: string, jobDescription: JobDescription): number {
        const jobKeywords = this.extractJobKeywords(jobDescription);
        const resumeLower = resumeContent.toLowerCase();

        const matchedKeywords = jobKeywords.filter(keyword =>
            resumeLower.includes(keyword.toLowerCase())
        );

        return Math.round((matchedKeywords.length / jobKeywords.length) * 100);
    }

    private calculateKeywordCoverage(resumeContent: string, jobKeywords: string[]): number {
        const resumeLower = resumeContent.toLowerCase();
        const coveredKeywords = jobKeywords.filter(keyword =>
            resumeLower.includes(keyword.toLowerCase())
        );

        return Math.round((coveredKeywords.length / jobKeywords.length) * 100);
    }

    private detectIndustry(jobDescription: string): keyof typeof this.industryKeywords {
        const desc = jobDescription.toLowerCase();

        for (const [industry, keywords] of Object.entries(this.industryKeywords)) {
            const matches = keywords.filter(keyword => desc.includes(keyword.toLowerCase()));
            if (matches.length >= 2) {
                return industry as keyof typeof this.industryKeywords;
            }
        }

        return 'technology'; // Default fallback
    }

    private mergeAnalysisResults(local: Partial<ResumeAnalysisResponse>, api: ResumeAnalysisResponse): ResumeAnalysisResponse {
        return {
            ...api,
            inlineComments: [...(local.inlineComments || []), ...(api.inlineComments || [])],
            overallFeedback: {
                ...api.overallFeedback,
                ...(local.overallFeedback || {})
            }
        };
    }

    private generateFallbackAnalysis(request: ResumeAnalysisRequest): ResumeAnalysisResponse {
        const localAnalysis = this.performLocalAnalysis(request);
        const { resumeContent, jobDescription, targetRole } = request;

        // Generate comprehensive local analysis
        const analysis = this.performDeepLocalAnalysis(resumeContent, jobDescription, targetRole);

        return {
            success: true, // Local analysis is still valuable
            inlineComments: localAnalysis.inlineComments || [],
            overallFeedback: {
                matchScore: analysis.matchScore,
                keywordCoverage: analysis.keywordCoverage,
                missingKeywords: analysis.missingKeywords,
                strengths: analysis.strengths,
                improvementAreas: analysis.improvementAreas
            },
            roleSpecificSuggestions: {
                titleOptimizations: analysis.titleOptimizations,
                experienceEnhancements: analysis.experienceEnhancements,
                skillsAlignment: analysis.skillsAlignment
            },
            error: 'Using advanced local analysis (AI service enhancement available)'
        };
    }

    private performDeepLocalAnalysis(resumeContent: string, jobDescription: JobDescription, targetRole: string) {
        const words = resumeContent.toLowerCase();
        const lines = resumeContent.split('\n').filter(line => line.trim());
        const jobKeywords = this.extractJobKeywords(jobDescription);

        // Advanced scoring system
        const analysis = {
            matchScore: this.calculateAdvancedMatchScore(resumeContent, jobDescription),
            keywordCoverage: this.calculateKeywordCoverage(resumeContent, jobKeywords),
            missingKeywords: jobKeywords.filter(keyword => !words.includes(keyword.toLowerCase())),
            strengths: this.identifyStrengths(resumeContent, jobDescription),
            improvementAreas: this.identifyImprovementAreas(resumeContent, jobDescription),
            titleOptimizations: this.suggestTitleOptimizations(resumeContent, targetRole),
            experienceEnhancements: this.suggestExperienceEnhancements(resumeContent, jobDescription),
            skillsAlignment: this.suggestSkillsAlignment(resumeContent, jobDescription)
        };

        return analysis;
    }

    private identifyStrengths(resumeContent: string, jobDescription: JobDescription): string[] {
        const strengths: string[] = [];
        const content = resumeContent.toLowerCase();

        // Check for quantified achievements
        if (content.match(/\d+%|\$[\d,]+|\d+\+|improved.*\d+/g)) {
            strengths.push('✅ Includes quantified achievements and metrics');
        }

        // Check for action verbs
        const strongVerbs = ['led', 'managed', 'developed', 'implemented', 'created', 'optimized', 'achieved'];
        if (strongVerbs.some(verb => content.includes(verb))) {
            strengths.push('✅ Uses strong action verbs to describe accomplishments');
        }

        // Check for relevant experience
        const jobKeywords = this.extractJobKeywords(jobDescription);
        const matchedKeywords = jobKeywords.filter(keyword => content.includes(keyword.toLowerCase()));
        if (matchedKeywords.length > jobKeywords.length * 0.5) {
            strengths.push('✅ Strong keyword alignment with job requirements');
        }

        // Check for education section
        if (content.includes('education') || content.includes('degree') || content.includes('university')) {
            strengths.push('✅ Clear education background provided');
        }

        // Check for skills section
        if (content.includes('skills') || content.includes('technical') || content.includes('programming')) {
            strengths.push('✅ Dedicated skills section identified');
        }

        return strengths.length > 0 ? strengths : ['✅ Resume structure is clear and readable'];
    }

    private identifyImprovementAreas(resumeContent: string, jobDescription: JobDescription): string[] {
        const improvements: string[] = [];
        const content = resumeContent.toLowerCase();
        const lines = resumeContent.split('\n');

        // Check for missing contact info
        if (!content.includes('@') || !content.match(/\d{3}[-.]?\d{3}[-.]?\d{4}/)) {
            improvements.push('📧 Add complete contact information (email and phone)');
        }

        // Check for weak language
        if (content.includes('responsible for') || content.includes('helped with')) {
            improvements.push('💪 Replace weak phrases with strong action verbs');
        }

        // Check for missing metrics
        if (!content.match(/\d+%|\$[\d,]+|\d+\+/)) {
            improvements.push('📊 Add quantified achievements and metrics to demonstrate impact');
        }

        // Check for missing keywords
        const jobKeywords = this.extractJobKeywords(jobDescription);
        const missingCount = jobKeywords.filter(keyword => !content.includes(keyword.toLowerCase())).length;
        if (missingCount > jobKeywords.length * 0.3) {
            improvements.push(`🔍 Include ${missingCount} key terms from job posting to improve ATS compatibility`);
        }

        // Check resume length
        const wordCount = resumeContent.trim().split(/\s+/).length;
        if (wordCount < 300) {
            improvements.push('📝 Expand content - resumes should typically be 400-800 words');
        } else if (wordCount > 1000) {
            improvements.push('✂️ Consider condensing - focus on most relevant achievements');
        }

        return improvements.length > 0 ? improvements : ['🎯 Focus on tailoring content more specifically to the target role'];
    }

    private suggestTitleOptimizations(resumeContent: string, targetRole: string): Array<{original: string, suggested: string, reason: string}> {
        const optimizations: Array<{original: string, suggested: string, reason: string}> = [];
        const lines = resumeContent.split('\n');

        // Look for current job titles and suggest improvements
        lines.forEach(line => {
            const lowerLine = line.toLowerCase();
            Object.entries(this.commonRoleMappings).forEach(([current, alternatives]) => {
                if (lowerLine.includes(current)) {
                    const bestMatch = this.findBestRoleAlternative(current, targetRole, alternatives);
                    optimizations.push({
                        original: current,
                        suggested: bestMatch,
                        reason: `Better aligns with ${targetRole} position requirements`
                    });
                }
            });
        });

        return optimizations;
    }

    private suggestExperienceEnhancements(resumeContent: string, jobDescription: JobDescription): Array<{section: string, improvement: string}> {
        const enhancements: Array<{section: string, improvement: string}> = [];
        const industry = this.detectIndustry(jobDescription.description);

        enhancements.push({
            section: 'Experience Bullets',
            improvement: `Use ${industry}-specific terminology and include measurable outcomes (e.g., "Increased efficiency by 25%")`
        });

        enhancements.push({
            section: 'Technical Skills',
            improvement: 'List specific tools, technologies, and methodologies mentioned in the job posting'
        });

        enhancements.push({
            section: 'Achievement Focus',
            improvement: 'Transform job duties into accomplishments using the STAR method (Situation, Task, Action, Result)'
        });

        return enhancements;
    }

    private suggestSkillsAlignment(resumeContent: string, jobDescription: JobDescription): Array<{current: string, suggested: string, relevance: string}> {
        const alignments: Array<{current: string, suggested: string, relevance: string}> = [];
        const jobKeywords = this.extractJobKeywords(jobDescription);
        const content = resumeContent.toLowerCase();

        // Suggest adding missing high-priority keywords
        jobKeywords.slice(0, 5).forEach(keyword => {
            if (!content.includes(keyword.toLowerCase())) {
                alignments.push({
                    current: 'Missing',
                    suggested: keyword,
                    relevance: 'High - mentioned in job requirements'
                });
            }
        });

        return alignments;
    }

    private calculateAdvancedMatchScore(resumeContent: string, jobDescription: JobDescription): number {
        let score = 0;
        const content = resumeContent.toLowerCase();

        // Keyword matching (40% of score)
        const jobKeywords = this.extractJobKeywords(jobDescription);
        const matchedKeywords = jobKeywords.filter(keyword => content.includes(keyword.toLowerCase()));
        score += (matchedKeywords.length / jobKeywords.length) * 40;

        // Resume structure (20% of score)
        const hasContactInfo = content.includes('@') && content.match(/\d{3}/);
        const hasExperience = content.includes('experience') || content.includes('work');
        const hasSkills = content.includes('skills') || content.includes('technical');
        const hasEducation = content.includes('education') || content.includes('degree');

        const structureScore = [hasContactInfo, hasExperience, hasSkills, hasEducation].filter(Boolean).length;
        score += (structureScore / 4) * 20;

        // Language quality (20% of score)
        const hasStrongVerbs = ['led', 'managed', 'developed', 'achieved'].some(verb => content.includes(verb));
        const hasQuantifiers = content.match(/\d+%|\$[\d,]+|\d+\+/);
        const languageScore = (hasStrongVerbs ? 10 : 0) + (hasQuantifiers ? 10 : 0);
        score += languageScore;

        // Content relevance (20% of score)
        const industry = this.detectIndustry(jobDescription.description);
        const industryTerms = this.industryKeywords[industry] || [];
        const relevantTerms = industryTerms.filter(term => content.includes(term.toLowerCase()));
        score += (relevantTerms.length / Math.max(industryTerms.length, 1)) * 20;

        return Math.min(Math.round(score), 100);
    }
}

export default new ResumeAnalysisService();
export type { ResumeAnalysisRequest, ResumeAnalysisResponse, ResumeInlineComment, JobDescription };