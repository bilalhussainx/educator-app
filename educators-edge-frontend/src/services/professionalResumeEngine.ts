// Professional Resume Engine - World-Class Templates with Claude AI Formatting
import claudeFormattingAgent, { FormattingAnalysis } from './claudeFormattingAgent';
export interface ProfessionalResumeData {
    personal: {
        name: string;
        title?: string;
        email: string;
        phone: string;
        location: string;
        linkedin?: string;
        website?: string;
        summary: string;
    };
    experience: Array<{
        position: string;
        company: string;
        location?: string;
        startDate: string;
        endDate: string;
        current?: boolean;
        achievements: string[];
        technologies?: string[];
    }>;
    education: Array<{
        degree: string;
        institution: string;
        location?: string;
        year: string;
        gpa?: string;
        honors?: string[];
    }>;
    skills: {
        technical?: string[];
        languages?: string[];
        frameworks?: string[];
        tools?: string[];
    };
    projects?: Array<{
        name: string;
        description: string;
        technologies: string[];
        link?: string;
    }>;
    certifications?: Array<{
        name: string;
        issuer: string;
        date: string;
    }>;
}

export interface ProfessionalTemplate {
    id: string;
    name: string;
    category: 'executive' | 'technical' | 'creative' | 'academic' | 'entry-level';
    industry: string[];
    html: string;
    css: string;
    preview: string;
    features: string[];
    atsOptimized: boolean;
    downloadFormats: ('pdf' | 'docx' | 'html')[];
}

class ProfessionalResumeEngine {
    private templates: Map<string, ProfessionalTemplate> = new Map();

    constructor() {
        this.initializeProfessionalTemplates();
    }

    private initializeProfessionalTemplates() {
        // Executive/Senior Level Template
        this.templates.set('executive-modern', {
            id: 'executive-modern',
            name: 'Executive Modern',
            category: 'executive',
            industry: ['finance', 'consulting', 'management', 'healthcare'],
            html: this.getExecutiveModernHTML(),
            css: this.getExecutiveModernCSS(),
            preview: '/templates/executive-modern-preview.png',
            features: ['Clean layout', 'Executive summary focus', 'Achievement highlights', 'Professional typography'],
            atsOptimized: true,
            downloadFormats: ['pdf', 'docx', 'html']
        });

        // Technical/Engineering Template
        this.templates.set('tech-professional', {
            id: 'tech-professional',
            name: 'Technical Professional',
            category: 'technical',
            industry: ['software', 'engineering', 'data', 'cybersecurity'],
            html: this.getTechProfessionalHTML(),
            css: this.getTechProfessionalCSS(),
            preview: '/templates/tech-professional-preview.png',
            features: ['Skills matrix', 'Project highlights', 'Technical achievements', 'GitHub integration'],
            atsOptimized: true,
            downloadFormats: ['pdf', 'docx', 'html']
        });

        // Creative/Design Template
        this.templates.set('creative-elegant', {
            id: 'creative-elegant',
            name: 'Creative Elegant',
            category: 'creative',
            industry: ['design', 'marketing', 'media', 'advertising'],
            html: this.getCreativeElegantHTML(),
            css: this.getCreativeElegantCSS(),
            preview: '/templates/creative-elegant-preview.png',
            features: ['Visual appeal', 'Portfolio integration', 'Creative achievements', 'Brand-focused'],
            atsOptimized: false,
            downloadFormats: ['pdf', 'html']
        });

        // Academic/Research Template
        this.templates.set('academic-formal', {
            id: 'academic-formal',
            name: 'Academic Formal',
            category: 'academic',
            industry: ['education', 'research', 'academia', 'nonprofit'],
            html: this.getAcademicFormalHTML(),
            css: this.getAcademicFormalCSS(),
            preview: '/templates/academic-formal-preview.png',
            features: ['Publication focus', 'Research highlights', 'Teaching experience', 'References section'],
            atsOptimized: true,
            downloadFormats: ['pdf', 'docx', 'html']
        });

        // Entry Level Template
        this.templates.set('entry-level-modern', {
            id: 'entry-level-modern',
            name: 'Entry Level Modern',
            category: 'entry-level',
            industry: ['general', 'retail', 'hospitality', 'entry-level'],
            html: this.getEntryLevelModernHTML(),
            css: this.getEntryLevelModernCSS(),
            preview: '/templates/entry-level-modern-preview.png',
            features: ['Education focus', 'Skills emphasis', 'Internship highlights', 'Clean design'],
            atsOptimized: true,
            downloadFormats: ['pdf', 'docx', 'html']
        });
    }

    generateResume(data: ProfessionalResumeData, templateId: string): string {
        const template = this.templates.get(templateId);
        if (!template) {
            throw new Error(`Template ${templateId} not found`);
        }

        // Process the template with data
        let html = template.html;

        // Replace placeholders with actual data
        html = this.processTemplate(html, data);

        // Combine with CSS
        const fullHTML = `
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${data.personal.name} - Resume</title>
                <style>${template.css}</style>
            </head>
            <body>
                ${html}
            </body>
            </html>
        `;

        return fullHTML;
    }

    private processTemplate(html: string, data: ProfessionalResumeData): string {
        // Personal Information
        html = html.replace(/{{name}}/g, data.personal.name);
        html = html.replace(/{{title}}/g, data.personal.title || '');
        html = html.replace(/{{email}}/g, data.personal.email);
        html = html.replace(/{{phone}}/g, data.personal.phone);
        html = html.replace(/{{location}}/g, data.personal.location);
        html = html.replace(/{{linkedin}}/g, data.personal.linkedin || '');
        html = html.replace(/{{website}}/g, data.personal.website || '');
        html = html.replace(/{{summary}}/g, data.personal.summary);

        // Experience Section
        const experienceHTML = data.experience.map(exp => `
            <div class="experience-item">
                <div class="experience-header">
                    <h3 class="position">${exp.position}</h3>
                    <div class="company-info">
                        <span class="company">${exp.company}</span>
                        ${exp.location ? `<span class="location">${exp.location}</span>` : ''}
                    </div>
                    <div class="date-range">
                        ${exp.startDate} - ${exp.current ? 'Present' : exp.endDate}
                    </div>
                </div>
                <ul class="achievements">
                    ${exp.achievements.map(achievement => `<li>${achievement}</li>`).join('')}
                </ul>
                ${exp.technologies ? `
                    <div class="technologies">
                        <strong>Technologies:</strong> ${exp.technologies.join(', ')}
                    </div>
                ` : ''}
            </div>
        `).join('');
        html = html.replace(/{{experience}}/g, experienceHTML);

        // Education Section
        const educationHTML = data.education.map(edu => `
            <div class="education-item">
                <h3 class="degree">${edu.degree}</h3>
                <div class="institution">${edu.institution}</div>
                ${edu.location ? `<div class="location">${edu.location}</div>` : ''}
                <div class="year">${edu.year}</div>
                ${edu.gpa ? `<div class="gpa">GPA: ${edu.gpa}</div>` : ''}
                ${edu.honors ? `<div class="honors">${edu.honors.join(', ')}</div>` : ''}
            </div>
        `).join('');
        html = html.replace(/{{education}}/g, educationHTML);

        // Skills Section
        const skillsHTML = `
            ${data.skills.technical ? `
                <div class="skill-category">
                    <h4>Technical Skills</h4>
                    <div class="skill-list">${data.skills.technical.join(' • ')}</div>
                </div>
            ` : ''}
            ${data.skills.languages ? `
                <div class="skill-category">
                    <h4>Languages</h4>
                    <div class="skill-list">${data.skills.languages.join(' • ')}</div>
                </div>
            ` : ''}
            ${data.skills.frameworks ? `
                <div class="skill-category">
                    <h4>Frameworks</h4>
                    <div class="skill-list">${data.skills.frameworks.join(' • ')}</div>
                </div>
            ` : ''}
            ${data.skills.tools ? `
                <div class="skill-category">
                    <h4>Tools</h4>
                    <div class="skill-list">${data.skills.tools.join(' • ')}</div>
                </div>
            ` : ''}
        `;
        html = html.replace(/{{skills}}/g, skillsHTML);

        return html;
    }

    private getExecutiveModernHTML(): string {
        return `
            <div class="resume-container executive-modern">
                <header class="header">
                    <h1 class="name">{{name}}</h1>
                    <div class="title">{{title}}</div>
                    <div class="contact-info">
                        <span class="email">{{email}}</span>
                        <span class="phone">{{phone}}</span>
                        <span class="location">{{location}}</span>
                        <span class="linkedin">{{linkedin}}</span>
                    </div>
                </header>

                <section class="executive-summary">
                    <h2>Executive Summary</h2>
                    <p class="summary">{{summary}}</p>
                </section>

                <section class="professional-experience">
                    <h2>Professional Experience</h2>
                    {{experience}}
                </section>

                <section class="education">
                    <h2>Education</h2>
                    {{education}}
                </section>

                <section class="core-competencies">
                    <h2>Core Competencies</h2>
                    {{skills}}
                </section>
            </div>
        `;
    }

    private getExecutiveModernCSS(): string {
        return `
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

            .resume-container {
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
                max-width: 8.5in;
                margin: 0 auto;
                padding: 0.75in;
                background: white;
                color: #1a1a1a;
                line-height: 1.6;
                font-size: 11pt;
            }

            .header {
                text-align: center;
                border-bottom: 2px solid #2563eb;
                padding-bottom: 20px;
                margin-bottom: 30px;
            }

            .name {
                font-size: 32pt;
                font-weight: 700;
                color: #1e40af;
                margin: 0 0 8px 0;
                letter-spacing: -0.5px;
            }

            .title {
                font-size: 14pt;
                font-weight: 500;
                color: #64748b;
                margin-bottom: 16px;
            }

            .contact-info {
                display: flex;
                justify-content: center;
                gap: 20px;
                flex-wrap: wrap;
                font-size: 10pt;
                color: #475569;
            }

            .contact-info span {
                position: relative;
            }

            .contact-info span:not(:last-child)::after {
                content: '|';
                position: absolute;
                right: -12px;
                color: #cbd5e1;
            }

            h2 {
                font-size: 14pt;
                font-weight: 600;
                color: #1e40af;
                margin: 25px 0 15px 0;
                padding-bottom: 5px;
                border-bottom: 1px solid #e2e8f0;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            .executive-summary .summary {
                font-size: 12pt;
                line-height: 1.7;
                color: #374151;
                margin: 0;
                text-align: justify;
            }

            .experience-item {
                margin-bottom: 25px;
                page-break-inside: avoid;
            }

            .experience-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 8px;
                flex-wrap: wrap;
            }

            .position {
                font-size: 13pt;
                font-weight: 600;
                color: #1f2937;
                margin: 0;
                flex: 1;
            }

            .company-info {
                display: flex;
                flex-direction: column;
                align-items: center;
                text-align: center;
                margin: 0 20px;
            }

            .company {
                font-size: 12pt;
                font-weight: 500;
                color: #4f46e5;
            }

            .location {
                font-size: 10pt;
                color: #6b7280;
                font-style: italic;
            }

            .date-range {
                font-size: 10pt;
                color: #6b7280;
                font-weight: 500;
                white-space: nowrap;
            }

            .achievements {
                margin: 12px 0 0 20px;
                padding: 0;
            }

            .achievements li {
                margin-bottom: 6px;
                color: #374151;
                line-height: 1.6;
            }

            .achievements li::marker {
                color: #2563eb;
            }

            .technologies {
                margin-top: 10px;
                font-size: 10pt;
                color: #6b7280;
                font-style: italic;
            }

            .education-item {
                margin-bottom: 20px;
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                flex-wrap: wrap;
            }

            .degree {
                font-size: 12pt;
                font-weight: 600;
                color: #1f2937;
                margin: 0;
                flex: 1;
            }

            .institution {
                font-size: 11pt;
                color: #4f46e5;
                font-weight: 500;
                margin: 0 20px;
            }

            .year {
                font-size: 10pt;
                color: #6b7280;
                font-weight: 500;
            }

            .skill-category {
                margin-bottom: 12px;
            }

            .skill-category h4 {
                font-size: 11pt;
                font-weight: 600;
                color: #374151;
                margin: 0 0 4px 0;
            }

            .skill-list {
                font-size: 10pt;
                color: #4b5563;
                line-height: 1.5;
            }

            @media print {
                .resume-container {
                    padding: 0.5in;
                    box-shadow: none;
                }

                .header {
                    border-bottom: 2px solid #2563eb;
                }

                h2 {
                    border-bottom: 1px solid #6b7280;
                }
            }

            @page {
                margin: 0.5in;
                size: letter;
            }
        `;
    }

    private getTechProfessionalHTML(): string {
        return `
            <div class="resume-container tech-professional">
                <header class="header">
                    <div class="header-left">
                        <h1 class="name">{{name}}</h1>
                        <div class="title">{{title}}</div>
                    </div>
                    <div class="header-right">
                        <div class="contact-info">
                            <div class="contact-item">{{email}}</div>
                            <div class="contact-item">{{phone}}</div>
                            <div class="contact-item">{{location}}</div>
                            <div class="contact-item">{{linkedin}}</div>
                            <div class="contact-item">{{website}}</div>
                        </div>
                    </div>
                </header>

                <section class="summary">
                    <h2>Technical Summary</h2>
                    <p class="summary-text">{{summary}}</p>
                </section>

                <div class="main-content">
                    <div class="left-column">
                        <section class="experience">
                            <h2>Experience</h2>
                            {{experience}}
                        </section>

                        <section class="education">
                            <h2>Education</h2>
                            {{education}}
                        </section>
                    </div>

                    <div class="right-column">
                        <section class="skills">
                            <h2>Technical Skills</h2>
                            {{skills}}
                        </section>
                    </div>
                </div>
            </div>
        `;
    }

    private getTechProfessionalCSS(): string {
        return `
            @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Inter:wght@300;400;500;600;700&display=swap');

            .tech-professional {
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
                max-width: 8.5in;
                margin: 0 auto;
                padding: 0.6in;
                background: white;
                color: #0f172a;
                line-height: 1.5;
                font-size: 10.5pt;
            }

            .header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                border-bottom: 3px solid #0ea5e9;
                padding-bottom: 20px;
                margin-bottom: 25px;
            }

            .name {
                font-size: 28pt;
                font-weight: 700;
                color: #0f172a;
                margin: 0 0 4px 0;
                letter-spacing: -0.3px;
            }

            .title {
                font-size: 13pt;
                font-weight: 500;
                color: #0ea5e9;
                font-family: 'JetBrains Mono', monospace;
            }

            .contact-info {
                text-align: right;
                font-size: 9.5pt;
                color: #475569;
            }

            .contact-item {
                margin-bottom: 4px;
                font-family: 'JetBrains Mono', monospace;
            }

            h2 {
                font-size: 13pt;
                font-weight: 600;
                color: #0ea5e9;
                margin: 20px 0 12px 0;
                text-transform: uppercase;
                letter-spacing: 0.8px;
                position: relative;
            }

            h2::after {
                content: '';
                position: absolute;
                bottom: -4px;
                left: 0;
                width: 30px;
                height: 2px;
                background: #0ea5e9;
            }

            .summary-text {
                font-size: 11pt;
                line-height: 1.6;
                color: #334155;
                margin-bottom: 20px;
            }

            .main-content {
                display: flex;
                gap: 25px;
            }

            .left-column {
                flex: 2;
            }

            .right-column {
                flex: 1;
                background: #f8fafc;
                padding: 20px;
                border-radius: 8px;
                height: fit-content;
            }

            .experience-item {
                margin-bottom: 22px;
                page-break-inside: avoid;
            }

            .experience-header {
                margin-bottom: 8px;
            }

            .position {
                font-size: 12pt;
                font-weight: 600;
                color: #1e293b;
                margin: 0 0 2px 0;
            }

            .company {
                font-size: 11pt;
                font-weight: 500;
                color: #0ea5e9;
                margin-right: 15px;
            }

            .date-range {
                font-size: 9.5pt;
                color: #64748b;
                font-family: 'JetBrains Mono', monospace;
                float: right;
            }

            .achievements {
                margin: 10px 0 0 18px;
                padding: 0;
            }

            .achievements li {
                margin-bottom: 5px;
                color: #334155;
                line-height: 1.5;
            }

            .achievements li::marker {
                color: #0ea5e9;
            }

            .technologies {
                margin-top: 8px;
                padding: 8px 12px;
                background: #eff6ff;
                border-radius: 4px;
                font-size: 9.5pt;
                font-family: 'JetBrains Mono', monospace;
                color: #1d4ed8;
            }

            .skill-category {
                margin-bottom: 15px;
            }

            .skill-category h4 {
                font-size: 10pt;
                font-weight: 600;
                color: #1e293b;
                margin: 0 0 6px 0;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            .skill-list {
                font-size: 9.5pt;
                color: #475569;
                line-height: 1.6;
                font-family: 'JetBrains Mono', monospace;
            }

            .education-item {
                margin-bottom: 15px;
            }

            .degree {
                font-size: 11pt;
                font-weight: 600;
                color: #1e293b;
                margin: 0 0 2px 0;
            }

            .institution {
                font-size: 10pt;
                color: #0ea5e9;
                font-weight: 500;
            }

            @media print {
                .tech-professional {
                    padding: 0.4in;
                }

                .right-column {
                    background: #f8fafc;
                    -webkit-print-color-adjust: exact;
                    color-adjust: exact;
                }
            }
        `;
    }

    // Additional template methods would go here...
    private getCreativeElegantHTML(): string { return '<!-- Creative template HTML -->'; }
    private getCreativeElegantCSS(): string { return '/* Creative template CSS */'; }
    private getAcademicFormalHTML(): string { return '<!-- Academic template HTML -->'; }
    private getAcademicFormalCSS(): string { return '/* Academic template CSS */'; }
    private getEntryLevelModernHTML(): string { return '<!-- Entry level template HTML -->'; }
    private getEntryLevelModernCSS(): string { return '/* Entry level template CSS */'; }

    getAvailableTemplates(): ProfessionalTemplate[] {
        return Array.from(this.templates.values());
    }

    getTemplatesByCategory(category: string): ProfessionalTemplate[] {
        return Array.from(this.templates.values()).filter(t => t.category === category);
    }

    getTemplatesByIndustry(industry: string): ProfessionalTemplate[] {
        return Array.from(this.templates.values()).filter(t => t.industry.includes(industry));
    }

    /**
     * Generate authentic resume with Claude AI formatting
     * Preserves original document structure and positioning
     */
    async generateAuthenticResume(
        data: ProfessionalResumeData,
        templateId: string,
        originalContent?: string,
        formattingData?: any
    ): Promise<{
        html: string;
        analysis?: FormattingAnalysis;
        authenticity?: any;
        improvements?: string[];
    }> {
        console.log(`🎨 Generating authentic resume with Claude AI for template: ${templateId}`);

        // Generate standard template first
        const standardHTML = this.generateResume(data, templateId);

        // If original content is provided, enhance with Claude formatting
        if (originalContent && originalContent.trim().length > 0) {
            try {
                const enhanced = await claudeFormattingAgent.enhanceTemplate(
                    originalContent,
                    templateId,
                    true,  // preserve original order
                    formattingData // pass formatting data from Word API
                );

                console.log('✅ Claude AI enhanced template with authenticity preservation');
                return enhanced;
            } catch (error) {
                console.error('❌ Claude AI formatting failed, using standard template:', error);
                return {
                    html: standardHTML,
                    improvements: ['Standard template applied (Claude AI unavailable)']
                };
            }
        }

        return {
            html: standardHTML,
            improvements: ['Standard professional template applied']
        };
    }

    /**
     * Analyze original document structure for authenticity preservation
     */
    async analyzeOriginalStructure(originalContent: string): Promise<FormattingAnalysis> {
        console.log('🔍 Analyzing original document structure for authenticity preservation...');

        try {
            return await claudeFormattingAgent.analyzeDocumentStructure(originalContent);
        } catch (error) {
            console.error('❌ Error analyzing document structure:', error);
            return {
                sections: [],
                originalStructure: {
                    titlePositions: {},
                    contentFlow: [],
                    bulletPointStyles: [],
                    sectionBreaks: []
                },
                authenticity: {
                    contentPreserved: false,
                    positionMaintained: false,
                    structureIntact: false,
                    improvements: ['Analysis failed - using basic structure']
                },
                recommendations: {
                    spacing: [],
                    alignment: [],
                    typography: [],
                    visual: []
                }
            };
        }
    }

    /**
     * Validate that generated template maintains content authenticity
     */
    async validateContentAuthenticity(
        originalContent: string,
        generatedHTML: string
    ): Promise<{
        isAuthentic: boolean;
        preservationScore: number;
        issues: string[];
        recommendations: string[];
    }> {
        console.log('✅ Validating content authenticity...');

        try {
            return await claudeFormattingAgent.validateAuthenticity(originalContent, generatedHTML);
        } catch (error) {
            console.error('❌ Error validating authenticity:', error);
            return {
                isAuthentic: false,
                preservationScore: 0,
                issues: ['Unable to validate authenticity'],
                recommendations: ['Manual review recommended']
            };
        }
    }

    /**
     * Enhanced template generation with document preservation
     * This is the main method that components should use
     */
    async generateEnhancedResume(
        data: ProfessionalResumeData,
        templateId: string,
        originalContent?: string,
        options: {
            preserveOrder?: boolean;
            enhanceVisuals?: boolean;
            validateAuthenticity?: boolean;
            formattingData?: any;
        } = {}
    ): Promise<{
        html: string;
        analysis?: FormattingAnalysis;
        authenticity?: any;
        improvements: string[];
        preservationScore?: number;
    }> {
        const startTime = Date.now();
        console.log(`🚀 Starting enhanced resume generation with Claude AI...`);

        const {
            preserveOrder = true,
            enhanceVisuals = true,
            validateAuthenticity = true,
            formattingData
        } = options;

        try {
            // Step 1: Generate authentic resume
            const result = await this.generateAuthenticResume(data, templateId, originalContent, formattingData);

            // Step 2: Validate authenticity if requested
            let authenticity = result.authenticity;
            let preservationScore = result.authenticity?.preservationScore;

            if (validateAuthenticity && originalContent && result.html) {
                authenticity = await this.validateContentAuthenticity(originalContent, result.html);
                preservationScore = authenticity.preservationScore;
            }

            const duration = Date.now() - startTime;
            console.log(`✅ Enhanced resume generation completed in ${duration}ms`);
            console.log(`📊 Preservation Score: ${preservationScore || 'N/A'}`);

            return {
                html: result.html,
                analysis: result.analysis,
                authenticity,
                improvements: result.improvements || [],
                preservationScore
            };

        } catch (error) {
            console.error('❌ Enhanced resume generation failed:', error);

            // Fallback to standard template
            const fallbackHTML = this.generateResume(data, templateId);
            return {
                html: fallbackHTML,
                improvements: ['Fallback to standard template due to error'],
                preservationScore: 0
            };
        }
    }
}

export default new ProfessionalResumeEngine();