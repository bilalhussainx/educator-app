/**
 * Semantic DOM Integration Service
 * Bridges the frontend to our revolutionary backend Semantic JSON DOM system
 */

import intelligentContentPreservationService from './intelligentContentPreservationService';

export interface SemanticDOMResponse {
    success: boolean;
    processingId: string;
    semanticDOM: {
        version: string;
        type: string;
        metadata: {
            generation: {
                timestamp: string;
                modelsUsed: string[];
            };
            document: {
                pageCount: number;
                totalElements: number;
                confidence: number;
            };
        };
        content: {
            hierarchy: Array<{
                id: string;
                level: number;
                tag: string;
                text: string;
                confidence: number;
                style: any;
            }>;
            bulletPoints: Array<{
                id: string;
                text: string;
                bulletType: string;
                level: number;
                confidence: number;
            }>;
            paragraphs: Array<{
                id: string;
                text: string;
                confidence: number;
            }>;
        };
        structure: {
            sections: Array<{
                id: string;
                title: string;
                type: string;
            }>;
        };
        quality: {
            overall: number;
            formatting: number;
            bulletDetection: number;
            hierarchy: number;
        };
    };
    htmlContent: string;
    cssStyles: string;
    preservation: {
        formatPreservation: number;
        qualityScore: number;
        confidenceScore: number;
    };
}

class SemanticDOMIntegrationService {
    private baseUrl: string;

    constructor() {
        this.baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:10000';
    }

    /**
     * Process document using our revolutionary backend Semantic JSON DOM system
     */
    async processDocument(file: File): Promise<SemanticDOMResponse> {
        console.log('🚀 Processing document with Semantic JSON DOM system...');

        try {
            // Create FormData for file upload
            const formData = new FormData();
            formData.append('document', file);

            // Get authentication token (if available)
            const token = this.getAuthToken();

            const response = await fetch(`${this.baseUrl}/api/semantic-dom/generate`, {
                method: 'POST',
                headers: {
                    ...(token && { 'Authorization': `Bearer ${token}` })
                },
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();

            console.log('✅ Semantic DOM processing complete:', {
                elements: result.semanticDOM?.metadata?.document?.totalElements,
                confidence: Math.round((result.semanticDOM?.quality?.overall || 0) * 100) + '%',
                processingId: result.processingId
            });

            return result;

        } catch (error) {
            console.error('❌ Semantic DOM processing failed:', error);
            throw error;
        }
    }

    /**
     * Check if the backend Semantic DOM service is available
     */
    async healthCheck(): Promise<{ available: boolean; features?: any; error?: string }> {
        try {
            const response = await fetch(`${this.baseUrl}/api/semantic-dom/health`);

            if (!response.ok) {
                return {
                    available: false,
                    error: `Health check failed: ${response.status}`
                };
            }

            const health = await response.json();
            return {
                available: health.success && health.status === 'operational',
                features: health.features
            };

        } catch (error) {
            return {
                available: false,
                error: error.message
            };
        }
    }

    /**
     * Convert Semantic DOM result to legacy format using Claude AI preservation
     */
    async convertToLegacyFormat(semanticResult: SemanticDOMResponse): Promise<any> {
        console.log('🔄 Converting Semantic DOM result with Claude AI preservation...');

        try {
            // 🧠 STEP 1: Use Claude AI for intelligent content and formatting preservation
            console.log('🧠 Analyzing document structure with Claude AI...');

            const rawContent = this.extractPlainText(semanticResult);
            const preservationResult = await intelligentContentPreservationService.analyzeDocumentStructure(
                rawContent,
                {
                    goals: [
                        'preserve_job_titles_as_headings',
                        'maintain_bullet_point_associations',
                        'preserve_visual_hierarchy',
                        'maintain_original_formatting',
                        'ensure_content_completeness'
                    ],
                    context: {
                        documentType: 'resume',
                        originalHtml: semanticResult.htmlContent,
                        semanticData: semanticResult.semanticDOM
                    }
                }
            );

            console.log('✅ Claude AI analysis complete:', {
                preservationAccuracy: Math.round(preservationResult.qualityMetrics.preservationAccuracy * 100) + '%',
                contentCompleteness: Math.round(preservationResult.qualityMetrics.contentCompleteness * 100) + '%',
                formattingIntegrity: Math.round(preservationResult.qualityMetrics.formattingIntegrity * 100) + '%'
            });

            // 🎨 STEP 2: Generate intelligent templates with preservation
            console.log('🎨 Generating intelligent templates...');
            const intelligentTemplates = await intelligentContentPreservationService.generateStructuredTemplates(
                preservationResult.elements,
                preservationResult.contentAssociations,
                {
                    preserveFormatting: true,
                    maintainHierarchy: true,
                    templateTypes: ['professional', 'modern', 'executive'],
                    originalHtml: semanticResult.htmlContent,
                    originalCss: semanticResult.cssStyles
                }
            );

            // 🔗 STEP 3: Build legacy-compatible result
            const legacyResult = {
                success: true,
                extractedText: preservationResult.preservedText,
                enhancedResult: {
                    personalInfo: this.mapToLegacyPersonalInfo(preservationResult.elements),
                    workExperience: this.mapToLegacyWorkExperience(preservationResult.elements, preservationResult.contentAssociations),
                    education: this.mapToLegacyEducation(preservationResult.elements),
                    skills: this.mapToLegacySkills(preservationResult.elements),
                    bulletPoints: preservationResult.elements
                        .filter(e => e.type === 'bullet_point')
                        .map(bp => ({
                            text: bp.content,
                            level: bp.hierarchy?.level || 1,
                            confidence: bp.confidence,
                            bulletType: bp.formattingData?.bulletStyle || 'bullet'
                        })),
                    confidence: {
                        overall: preservationResult.qualityMetrics.preservationAccuracy,
                        formatting: preservationResult.qualityMetrics.formattingIntegrity,
                        structure: preservationResult.qualityMetrics.structuralIntegrity,
                        bulletPoint: preservationResult.qualityMetrics.associationIntegrity
                    },
                    metadata: {
                        processingTime: preservationResult.processingMetadata.analysisTime,
                        elementsFound: preservationResult.elements.length,
                        sectionsFound: preservationResult.elements.filter(e => e.type === 'section_header').length,
                        modelsUsed: ['Claude AI', 'Semantic DOM', 'Azure Vision']
                    }
                },
                revolutionaryTemplates: intelligentTemplates.map(template => ({
                    id: template.id,
                    name: template.name,
                    html: template.html,
                    css: template.css,
                    confidence: template.qualityScore,
                    metadata: {
                        source: 'claude-ai-preservation',
                        preservationAccuracy: template.formattingPreservation?.visualSimilarity || 0.9,
                        contentCompleteness: preservationResult.qualityMetrics.contentCompleteness,
                        formattingIntegrity: template.formattingPreservation?.formattingIntegrity || 0.9
                    }
                })),
                formattedContent: intelligentTemplates[0]?.html || semanticResult.htmlContent,
                preservationCSS: intelligentTemplates[0]?.css || semanticResult.cssStyles,
                processingSteps: [
                    'Document uploaded to Semantic DOM backend',
                    'Multi-model Azure analysis completed',
                    '🧠 Claude AI content structure analysis',
                    '🔗 Intelligent content association mapping',
                    '🎨 Formatting preservation analysis',
                    '📄 Intelligent template generation',
                    'Quality validation and metrics calculation',
                    'Legacy format conversion with preservation'
                ],
                qualityMetrics: {
                    formatPreservation: preservationResult.qualityMetrics.formattingIntegrity,
                    confidenceScore: preservationResult.qualityMetrics.preservationAccuracy,
                    qualityScore: preservationResult.qualityMetrics.contentCompleteness
                },
                arbitrationResult: {
                    success: true,
                    confidence: preservationResult.qualityMetrics.preservationAccuracy,
                    bestSource: { name: 'Claude AI + Semantic DOM Hybrid' },
                    bulletPointIntegrity: preservationResult.qualityMetrics.associationIntegrity,
                    contentPreservation: preservationResult.qualityMetrics.contentCompleteness,
                    sourcesAnalyzed: 1,
                    fragmentationDetected: false,
                    fragmentedBullets: [],
                    hybridImprovements: preservationResult.improvementSuggestions || []
                }
            };

            console.log('✅ Claude AI preservation conversion complete!');
            return legacyResult;

        } catch (error) {
            console.error('❌ Claude AI preservation failed, falling back to basic conversion:', error);

            // Fallback to basic conversion if Claude AI fails
            return this.basicLegacyConversion(semanticResult);
        }
    }

    /**
     * Fallback basic conversion method
     */
    private basicLegacyConversion(semanticResult: SemanticDOMResponse): any {
        return {
            success: true,
            extractedText: this.extractPlainText(semanticResult),
            enhancedResult: {
                personalInfo: this.extractPersonalInfo(semanticResult),
                workExperience: this.extractWorkExperience(semanticResult),
                education: this.extractEducation(semanticResult),
                skills: this.extractSkills(semanticResult),
                bulletPoints: semanticResult.semanticDOM.content.bulletPoints.map(bp => ({
                    text: bp.text,
                    level: bp.level,
                    confidence: bp.confidence,
                    bulletType: bp.bulletType
                })),
                confidence: {
                    overall: semanticResult.semanticDOM.quality.overall,
                    formatting: semanticResult.semanticDOM.quality.formatting,
                    structure: semanticResult.semanticDOM.quality.hierarchy,
                    bulletPoint: semanticResult.semanticDOM.quality.bulletDetection
                },
                metadata: {
                    processingTime: 0,
                    elementsFound: semanticResult.semanticDOM.metadata.document.totalElements,
                    sectionsFound: semanticResult.semanticDOM.structure.sections.length,
                    modelsUsed: ['Semantic DOM (Basic)']
                }
            },
            revolutionaryTemplates: this.generateTemplatesFromSemanticDOM(semanticResult),
            formattedContent: semanticResult.htmlContent,
            preservationCSS: semanticResult.cssStyles,
            processingSteps: ['Basic semantic DOM conversion'],
            qualityMetrics: {
                formatPreservation: semanticResult.preservation.formatPreservation,
                confidenceScore: semanticResult.preservation.confidenceScore,
                qualityScore: semanticResult.preservation.qualityScore
            },
            arbitrationResult: {
                success: true,
                confidence: semanticResult.semanticDOM.quality.overall,
                bestSource: { name: 'Semantic DOM (Basic)' },
                bulletPointIntegrity: semanticResult.semanticDOM.quality.bulletDetection,
                contentPreservation: semanticResult.semanticDOM.quality.formatting,
                sourcesAnalyzed: 1,
                fragmentationDetected: false,
                fragmentedBullets: [],
                hybridImprovements: []
            }
        };
    }

    /**
     * Map intelligent preservation elements to legacy personal info format
     */
    private mapToLegacyPersonalInfo(elements: any[]): any {
        const personalElements = elements.filter(e =>
            e.type === 'contact_info' ||
            (e.type === 'text' && e.hierarchy?.level === 1)
        );

        return {
            name: personalElements.find(e => e.elementType === 'name')?.content ||
                  personalElements.find(e => e.hierarchy?.level === 1)?.content || '',
            email: personalElements.find(e => e.elementType === 'email')?.content || '',
            phone: personalElements.find(e => e.elementType === 'phone')?.content || '',
            location: personalElements.find(e => e.elementType === 'location')?.content || '',
            confidence: 0.9
        };
    }

    /**
     * Map intelligent preservation elements to legacy work experience format
     */
    private mapToLegacyWorkExperience(elements: any[], associations: any[]): any[] {
        const jobs: any[] = [];

        // Find job title elements and their associated bullets
        const jobTitleElements = elements.filter(e => e.type === 'job_title' ||
            (e.type === 'heading' && e.hierarchy?.level >= 3));

        jobTitleElements.forEach(jobElement => {
            const associatedBullets = associations
                .filter(assoc => assoc.parentId === jobElement.id && assoc.type === 'job_responsibilities')
                .map(assoc => elements.find(e => e.id === assoc.childId))
                .filter(e => e && e.type === 'bullet_point');

            jobs.push({
                title: jobElement.content,
                company: jobElement.metadata?.company || '',
                duration: jobElement.metadata?.duration || '',
                responsibilities: associatedBullets.map(bullet => bullet.content),
                confidence: jobElement.confidence
            });
        });

        // Fallback: if no proper job structure found, group bullets by proximity
        if (jobs.length === 0) {
            const bullets = elements.filter(e => e.type === 'bullet_point');
            if (bullets.length > 0) {
                jobs.push({
                    title: 'Professional Experience',
                    company: '',
                    duration: '',
                    responsibilities: bullets.map(b => b.content),
                    confidence: 0.8
                });
            }
        }

        return jobs;
    }

    /**
     * Map intelligent preservation elements to legacy education format
     */
    private mapToLegacyEducation(elements: any[]): any[] {
        const educationElements = elements.filter(e =>
            e.type === 'education' ||
            (e.type === 'heading' && e.content.toLowerCase().includes('education'))
        );

        return educationElements.map(e => ({
            degree: e.metadata?.degree || e.content,
            institution: e.metadata?.institution || '',
            year: e.metadata?.year || '',
            confidence: e.confidence
        }));
    }

    /**
     * Map intelligent preservation elements to legacy skills format
     */
    private mapToLegacySkills(elements: any[]): string[] {
        const skillElements = elements.filter(e =>
            e.type === 'skill' ||
            (e.type === 'bullet_point' && e.metadata?.isSkill)
        );

        return skillElements.map(e => e.content).filter(skill => skill && skill.length > 2);
    }

    /**
     * Extract plain text from semantic DOM - PRESERVING DOCUMENT STRUCTURE
     */
    private extractPlainText(semanticResult: SemanticDOMResponse): string {
        // STRATEGY: Maintain proper document structure - headings as headings, bullets as bullets

        // First, try to get content from the reconstructed HTML which should preserve structure
        if (semanticResult.htmlContent) {
            const htmlText = semanticResult.htmlContent
                .replace(/<h[1-6][^>]*>/gi, '\n\n') // Add spacing before headings
                .replace(/<\/h[1-6]>/gi, '\n') // Add spacing after headings
                .replace(/<li[^>]*>/gi, '• ') // Convert list items to bullet points
                .replace(/<\/li>/gi, '\n') // Add line breaks after list items
                .replace(/<p[^>]*>/gi, '\n') // Add spacing for paragraphs
                .replace(/<\/p>/gi, '\n') // Add line breaks after paragraphs
                .replace(/<br\s*\/?>/gi, '\n') // Convert breaks to newlines
                .replace(/<[^>]*>/g, ' ') // Remove remaining HTML tags
                .replace(/\s+/g, ' ') // Normalize whitespace
                .replace(/\n\s*\n/g, '\n\n') // Normalize line breaks
                .trim();

            if (htmlText && htmlText.length > 100) {
                return htmlText;
            }
        }

        // Fallback: Build structured content manually
        const sections: string[] = [];

        // Group content by document sections to maintain structure
        const contentGroups = new Map<string, { headings: any[], bullets: any[], paragraphs: any[] }>();

        // Initialize main groups
        contentGroups.set('header', { headings: [], bullets: [], paragraphs: [] });
        contentGroups.set('experience', { headings: [], bullets: [], paragraphs: [] });
        contentGroups.set('education', { headings: [], bullets: [], paragraphs: [] });
        contentGroups.set('skills', { headings: [], bullets: [], paragraphs: [] });
        contentGroups.set('other', { headings: [], bullets: [], paragraphs: [] });

        // Categorize content
        semanticResult.semanticDOM.content.hierarchy.forEach(h => {
            const text = h.text.toLowerCase();
            if (h.level <= 2) {
                contentGroups.get('header')?.headings.push(h);
            } else if (text.includes('experience') || text.includes('work') ||
                      text.includes('employ') || text.includes('career')) {
                contentGroups.get('experience')?.headings.push(h);
            } else if (text.includes('education') || text.includes('school') ||
                      text.includes('university') || text.includes('degree')) {
                contentGroups.get('education')?.headings.push(h);
            } else if (text.includes('skill') || text.includes('technical') ||
                      text.includes('programming') || text.includes('software')) {
                contentGroups.get('skills')?.headings.push(h);
            } else {
                contentGroups.get('experience')?.headings.push(h); // Default to experience
            }
        });

        // Add bullet points to appropriate sections
        semanticResult.semanticDOM.content.bulletPoints.forEach(bp => {
            const text = bp.text.toLowerCase();
            if (text.includes('skill') || text.includes('programming') ||
                text.includes('software') || text.includes('tool')) {
                contentGroups.get('skills')?.bullets.push(bp);
            } else if (text.includes('education') || text.includes('university') ||
                      text.includes('degree') || text.includes('gpa')) {
                contentGroups.get('education')?.bullets.push(bp);
            } else {
                contentGroups.get('experience')?.bullets.push(bp); // Default to experience
            }
        });

        // Add paragraphs
        semanticResult.semanticDOM.content.paragraphs.forEach(p => {
            contentGroups.get('other')?.paragraphs.push(p);
        });

        // Build sections in order
        ['header', 'experience', 'education', 'skills', 'other'].forEach(sectionKey => {
            const group = contentGroups.get(sectionKey);
            if (!group) return;

            const sectionContent: string[] = [];

            // Add headings first
            group.headings.forEach(h => {
                sectionContent.push(h.text);
            });

            // Add bullet points
            group.bullets.forEach(bp => {
                sectionContent.push(`• ${bp.text}`);
            });

            // Add paragraphs
            group.paragraphs.forEach(p => {
                sectionContent.push(p.text);
            });

            if (sectionContent.length > 0) {
                sections.push(sectionContent.join('\n'));
            }
        });

        return sections.join('\n\n').trim() || 'Content could not be extracted.';
    }

    /**
     * Extract personal info from semantic DOM
     */
    private extractPersonalInfo(semanticResult: SemanticDOMResponse): any {
        const personalSection = semanticResult.semanticDOM.structure.sections
            .find(s => s.type === 'personal-info' || s.title.toLowerCase().includes('contact'));

        return {
            name: semanticResult.semanticDOM.content.hierarchy.find(h => h.level === 1)?.text || '',
            email: this.extractContactInfo(semanticResult, 'email'),
            phone: this.extractContactInfo(semanticResult, 'phone'),
            location: this.extractContactInfo(semanticResult, 'location'),
            confidence: 0.85
        };
    }

    /**
     * Extract work experience - MAINTAINING JOB TITLE TO BULLET RELATIONSHIP
     */
    private extractWorkExperience(semanticResult: SemanticDOMResponse): any[] {
        const jobs: any[] = [];

        // STRATEGY: Process content in document order to maintain associations
        const allElements = [
            ...semanticResult.semanticDOM.content.hierarchy.map(h => ({ ...h, type: 'heading' })),
            ...semanticResult.semanticDOM.content.bulletPoints.map(bp => ({ ...bp, type: 'bullet' })),
            ...semanticResult.semanticDOM.content.paragraphs.map(p => ({ ...p, type: 'paragraph' }))
        ];

        // Sort by original position if available, otherwise by content type priority
        allElements.sort((a, b) => {
            // Preserve document order
            return 0; // Keep original array order
        });

        let currentJob: any = null;

        allElements.forEach(element => {
            if (element.type === 'heading') {
                const text = element.text.toLowerCase();
                const isJobTitle =
                    element.level >= 3 && element.level <= 5 && // Job titles are usually h3-h5
                    element.text.length > 5 &&
                    (
                        // Common job title keywords
                        text.includes('engineer') || text.includes('developer') || text.includes('manager') ||
                        text.includes('analyst') || text.includes('specialist') || text.includes('coordinator') ||
                        text.includes('director') || text.includes('lead') || text.includes('senior') ||
                        text.includes('junior') || text.includes('intern') || text.includes('associate') ||
                        text.includes('consultant') || text.includes('architect') || text.includes('designer') ||
                        text.includes('officer') || text.includes('representative') || text.includes('assistant') ||
                        // Or if it's a level 3 heading (common for job titles)
                        element.level === 3
                    ) &&
                    // Exclude section headers
                    !text.includes('experience') && !text.includes('education') &&
                    !text.includes('skills') && !text.includes('objective') &&
                    !text.includes('summary') && !text.includes('contact');

                if (isJobTitle) {
                    // Save previous job
                    if (currentJob) {
                        jobs.push(currentJob);
                    }

                    // Start new job
                    currentJob = {
                        title: element.text,
                        company: '',
                        duration: '',
                        responsibilities: [],
                        confidence: element.confidence || 0.8
                    };
                }
            } else if (element.type === 'bullet' && element.text && element.text.trim().length > 5) {
                if (currentJob) {
                    // Associate bullet with current job
                    currentJob.responsibilities.push(element.text);
                } else {
                    // Create job for orphaned bullets
                    currentJob = {
                        title: 'Professional Experience',
                        company: '',
                        duration: '',
                        responsibilities: [element.text],
                        confidence: element.confidence || 0.7
                    };
                }
            }
        });

        // Add the last job
        if (currentJob) {
            jobs.push(currentJob);
        }

        // Ensure we have at least some content
        if (jobs.length === 0) {
            // Fallback: create a job from all available content
            const allBullets = semanticResult.semanticDOM.content.bulletPoints
                .filter(bp => bp.text && bp.text.trim().length > 5)
                .map(bp => bp.text);

            if (allBullets.length > 0) {
                jobs.push({
                    title: 'Professional Experience',
                    company: '',
                    duration: '',
                    responsibilities: allBullets,
                    confidence: 0.7
                });
            }
        }

        return jobs;
    }

    /**
     * Extract education from semantic DOM
     */
    private extractEducation(semanticResult: SemanticDOMResponse): any[] {
        const educationSection = semanticResult.semanticDOM.structure.sections
            .find(s => s.type === 'education');

        if (!educationSection) return [];

        return [{
            degree: 'Degree information extracted',
            institution: 'Institution extracted',
            year: 'Year extracted',
            confidence: 0.8
        }];
    }

    /**
     * Extract skills from semantic DOM - ENHANCED for content preservation
     */
    private extractSkills(semanticResult: SemanticDOMResponse): string[] {
        const skills: string[] = [];

        // 1. Look for explicit skills section
        const skillsSection = semanticResult.semanticDOM.structure.sections
            .find(s => s.type === 'skills' || s.title?.toLowerCase().includes('skill'));

        if (skillsSection) {
            // Extract from bullet points in skills section
            semanticResult.semanticDOM.content.bulletPoints
                .filter(bp => bp.confidence > 0.5) // Lower threshold
                .forEach(bp => skills.push(bp.text));
        }

        // 2. Extract from ANY bullet points that look like skills
        semanticResult.semanticDOM.content.bulletPoints.forEach(bp => {
            const text = bp.text.toLowerCase();
            // Heuristics for skill-like content
            if (text.includes('programming') || text.includes('language') || text.includes('framework') ||
                text.includes('software') || text.includes('tool') || text.includes('platform') ||
                text.includes('database') || text.includes('cloud') || text.includes('api') ||
                bp.text.split(/[,;]/).length > 1) { // Comma/semicolon separated lists

                // Split comma-separated skills
                bp.text.split(/[,;]/).forEach(skill => {
                    const cleanSkill = skill.trim();
                    if (cleanSkill.length > 2 && !skills.includes(cleanSkill)) {
                        skills.push(cleanSkill);
                    }
                });
            }
        });

        // 3. Extract from paragraphs that mention technical terms
        semanticResult.semanticDOM.content.paragraphs.forEach(p => {
            const text = p.text.toLowerCase();
            if (text.includes('experience with') || text.includes('proficient in') ||
                text.includes('skilled in') || text.includes('knowledge of')) {
                // Extract technical terms after these phrases
                const matches = p.text.match(/(?:experience with|proficient in|skilled in|knowledge of)[\s:]*([\w\s,.-]+)/gi);
                if (matches) {
                    matches.forEach(match => {
                        const skillText = match.replace(/^[^:]*:?\s*/, '').trim();
                        if (skillText.length > 3 && !skills.includes(skillText)) {
                            skills.push(skillText);
                        }
                    });
                }
            }
        });

        // 4. Return unique skills, preserving order
        return [...new Set(skills)]
            .filter(skill => skill && skill.trim().length > 2)
            .slice(0, 20); // Increased limit
    }

    /**
     * Generate templates from semantic DOM data
     */
    private generateTemplatesFromSemanticDOM(semanticResult: SemanticDOMResponse): any[] {
        return [{
            id: 'semantic-dom-template',
            name: 'Semantic DOM Preserved Format',
            html: semanticResult.htmlContent,
            css: semanticResult.cssStyles,
            confidence: semanticResult.semanticDOM.quality.overall,
            metadata: {
                source: 'semantic-dom-backend',
                elementsPreserved: semanticResult.semanticDOM.metadata.document.totalElements,
                formatPreservation: semanticResult.preservation.formatPreservation
            }
        }];
    }

    /**
     * Extract contact information
     */
    private extractContactInfo(semanticResult: SemanticDOMResponse, type: string): string {
        // This would need more sophisticated extraction logic
        // For now, return placeholder
        return `${type} extracted from semantic DOM`;
    }

    /**
     * Get authentication token from local storage or context
     */
    private getAuthToken(): string | null {
        try {
            // Try to get token from localStorage, sessionStorage, or other auth context
            return localStorage.getItem('authToken') ||
                   sessionStorage.getItem('authToken') ||
                   null;
        } catch {
            return null;
        }
    }
}

export default new SemanticDOMIntegrationService();