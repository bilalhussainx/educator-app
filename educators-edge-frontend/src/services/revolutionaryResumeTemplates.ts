/**
 * Revolutionary Vision Resume Template System
 * Advanced template-based formatting preservation with Azure Document Intelligence integration
 */

export interface FormatRules {
    bold: {
        sectionHeaders: boolean;
        jobTitles: boolean;
        companyNames: boolean;
        degrees: boolean;
        customSelectors?: string[];
    };
    italic: {
        dates: boolean;
        locations: boolean;
        certificationIssuers: boolean;
        customSelectors?: string[];
    };
    bulletPoints: {
        style: '•' | '-' | '*' | '▪' | 'custom';
        indentation: number;
        spacing: number;
        customSymbol?: string;
    };
    textAlign: {
        headers: 'left' | 'center' | 'right';
        content: 'left' | 'center' | 'right' | 'justify';
        contact: 'left' | 'center' | 'right';
    };
    capitalization: {
        sectionHeaders: 'uppercase' | 'lowercase' | 'capitalize' | 'preserve';
        jobTitles: 'uppercase' | 'lowercase' | 'capitalize' | 'preserve';
    };
}

export interface FontSpecs {
    primary: {
        family: string;
        size: {
            base: number;
            headers: number;
            subheaders: number;
            small: number;
        };
        weight: {
            normal: number;
            medium: number;
            bold: number;
        };
        lineHeight: number;
    };
    fallback: string[];
    atsOptimized: boolean;
}

export interface LayoutSpecs {
    margins: {
        top: number;
        bottom: number;
        left: number;
        right: number;
    };
    padding: {
        sections: number;
        subsections: number;
        bulletPoints: number;
    };
    spacing: {
        betweenSections: number;
        betweenJobs: number;
        betweenEducation: number;
        afterHeaders: number;
        beforeHeaders: number;
    };
    columns: {
        count: 1 | 2;
        gap?: number;
        splitRatio?: number; // For 2-column layouts
    };
    pageBreaks: {
        avoidInSections: boolean;
        preferredBreakPoints: string[];
    };
}

export interface ResumeTemplate {
    id: string;
    name: 'ATS-Friendly' | 'Creative' | 'Academic' | 'Executive' | 'Modern';
    category: 'professional' | 'creative' | 'academic' | 'executive' | 'technical';
    description: string;

    // Template structure
    styleRules: FormatRules;
    sectionOrder: string[];
    fontGuidelines: FontSpecs;
    spacingRules: LayoutSpecs;

    // Compatibility
    atsCompatible: boolean;
    printOptimized: boolean;
    industryFocus: string[];

    // Revolutionary features
    visionEnhanced: boolean;
    formattingPreservation: {
        level: 'basic' | 'advanced' | 'revolutionary';
        preserveOriginalStructure: boolean;
        adaptiveFormatting: boolean;
        confidenceThreshold: number;
    };

    // Generation methods
    generateCSS(): string;
    generateHTML(data: any): string;
    applyFormatting(elements: any[], visionData?: any): string;
}

export class RevolutionaryResumeTemplate implements ResumeTemplate {
    id: string;
    name: 'ATS-Friendly' | 'Creative' | 'Academic' | 'Executive' | 'Modern';
    category: 'professional' | 'creative' | 'academic' | 'executive' | 'technical';
    description: string;
    styleRules: FormatRules;
    sectionOrder: string[];
    fontGuidelines: FontSpecs;
    spacingRules: LayoutSpecs;
    atsCompatible: boolean;
    printOptimized: boolean;
    industryFocus: string[];
    visionEnhanced: boolean;
    formattingPreservation: {
        level: 'basic' | 'advanced' | 'revolutionary';
        preserveOriginalStructure: boolean;
        adaptiveFormatting: boolean;
        confidenceThreshold: number;
    };

    constructor(config: Partial<ResumeTemplate>) {
        Object.assign(this, config);
    }

    generateCSS(): string {
        const { fontGuidelines, spacingRules, styleRules } = this;

        return `
            @import url('https://fonts.googleapis.com/css2?family=${fontGuidelines.primary.family.replace(' ', '+')}:wght@${fontGuidelines.primary.weight.normal};${fontGuidelines.primary.weight.medium};${fontGuidelines.primary.weight.bold}&display=swap');

            .revolutionary-resume-${this.id} {
                /* Revolutionary Foundation */
                font-family: '${fontGuidelines.primary.family}', ${fontGuidelines.fallback.join(', ')};
                font-size: ${fontGuidelines.primary.size.base}pt;
                line-height: ${fontGuidelines.primary.lineHeight};
                color: #1a1a1a;
                background: white;

                /* Layout and Spacing */
                max-width: 8.5in;
                margin: 0 auto;
                padding: ${spacingRules.margins.top}px ${spacingRules.margins.right}px ${spacingRules.margins.bottom}px ${spacingRules.margins.left}px;

                /* Revolutionary Typography System */
                font-weight: ${fontGuidelines.primary.weight.normal};
                -webkit-font-smoothing: antialiased;
                -moz-osx-font-smoothing: grayscale;
                text-rendering: optimizeLegibility;

                /* ATS Optimization */
                ${fontGuidelines.atsOptimized ? `
                    /* ATS-friendly styles */
                    text-decoration: none;
                    border: none;
                    background-image: none;
                ` : ''}
            }

            /* Revolutionary Section Headers */
            .revolutionary-resume-${this.id} .section-header {
                font-size: ${fontGuidelines.primary.size.headers}pt;
                font-weight: ${fontGuidelines.primary.weight.bold};
                margin-top: ${spacingRules.spacing.beforeHeaders}px;
                margin-bottom: ${spacingRules.spacing.afterHeaders}px;
                text-align: ${styleRules.textAlign.headers};
                text-transform: ${styleRules.capitalization.sectionHeaders};
                color: #2c3e50;

                ${this.name === 'ATS-Friendly' ? `
                    border-bottom: 1px solid #ddd;
                    padding-bottom: 4px;
                ` : this.name === 'Executive' ? `
                    border-bottom: 2px solid #1a365d;
                    padding-bottom: 6px;
                    letter-spacing: 0.5px;
                ` : this.name === 'Creative' ? `
                    border-left: 4px solid #3182ce;
                    padding-left: 12px;
                    margin-left: -16px;
                ` : this.name === 'Academic' ? `
                    border-bottom: 1px solid #4a5568;
                    text-align: center;
                    padding-bottom: 8px;
                ` : `
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    background-clip: text;
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    margin-bottom: 16px;
                `}
            }

            /* Revolutionary Job Titles and Company Names */
            .revolutionary-resume-${this.id} .job-title {
                font-size: ${fontGuidelines.primary.size.subheaders}pt;
                font-weight: ${styleRules.bold.jobTitles ? fontGuidelines.primary.weight.bold : fontGuidelines.primary.weight.medium};
                color: #2d3748;
                margin-bottom: 4px;
                text-transform: ${styleRules.capitalization.jobTitles};
            }

            .revolutionary-resume-${this.id} .company-name {
                font-weight: ${styleRules.bold.companyNames ? fontGuidelines.primary.weight.bold : fontGuidelines.primary.weight.medium};
                color: #4a5568;
                margin-bottom: 2px;
            }

            /* Revolutionary Bullet Points */
            .revolutionary-resume-${this.id} .bullet-list {
                margin: ${spacingRules.padding.bulletPoints}px 0;
                padding-left: ${styleRules.bulletPoints.indentation}px;
                list-style: none;
            }

            .revolutionary-resume-${this.id} .bullet-list li {
                position: relative;
                margin-bottom: ${styleRules.bulletPoints.spacing}px;
                line-height: ${fontGuidelines.primary.lineHeight};
                text-align: ${styleRules.textAlign.content};
            }

            .revolutionary-resume-${this.id} .bullet-list li::before {
                content: '${styleRules.bulletPoints.customSymbol || styleRules.bulletPoints.style}';
                position: absolute;
                left: -${styleRules.bulletPoints.indentation}px;
                color: #4a5568;
                font-weight: ${fontGuidelines.primary.weight.medium};
            }

            /* Enhanced Content Display Classes */
            .revolutionary-resume-${this.id} .work-section-content {
                margin: 15px 0;
                padding: 10px;
                background-color: #f8f9fa;
                border-left: 3px solid #007bff;
            }

            .revolutionary-resume-${this.id} .content-line {
                margin: 6px 0;
                line-height: 1.5;
                color: #2c3e50;
                padding-left: 8px;
            }

            .revolutionary-resume-${this.id} .content-text {
                margin: 10px 0;
                line-height: 1.6;
                color: #2c3e50;
            }

            .revolutionary-resume-${this.id} .all-bullets-section {
                margin: 20px 0;
                padding: 15px;
                background-color: #ffffff;
                border: 1px solid #e1e8ed;
                border-radius: 5px;
            }

            .revolutionary-resume-${this.id} .all-bullets-section h3 {
                color: #2c3e50;
                font-size: 16px;
                margin: 0 0 12px 0;
                font-weight: bold;
                padding-bottom: 5px;
                border-bottom: 1px solid #e1e8ed;
            }

            .revolutionary-resume-${this.id} .comprehensive-bullet-list {
                margin: 10px 0;
                padding-left: 20px;
                list-style: none;
            }

            .revolutionary-resume-${this.id} .comprehensive-bullet-list li {
                position: relative;
                margin-bottom: 8px;
                line-height: 1.5;
                color: #2c3e50;
            }

            .revolutionary-resume-${this.id} .comprehensive-bullet-list li::before {
                content: '•';
                position: absolute;
                left: -20px;
                color: #007bff;
                font-weight: bold;
                font-size: 14px;
            }

            .revolutionary-resume-${this.id} .no-content {
                color: #6c757d;
                font-style: italic;
                text-align: center;
                padding: 20px;
            }

            /* Revolutionary Date and Location Styling */
            .revolutionary-resume-${this.id} .date-range {
                font-style: ${styleRules.italic.dates ? 'italic' : 'normal'};
                color: #718096;
                font-size: ${fontGuidelines.primary.size.small}pt;
                text-align: right;
            }

            .revolutionary-resume-${this.id} .location {
                font-style: ${styleRules.italic.locations ? 'italic' : 'normal'};
                color: #a0aec0;
                font-size: ${fontGuidelines.primary.size.small}pt;
            }

            /* Revolutionary Contact Information */
            .revolutionary-resume-${this.id} .contact-info {
                text-align: ${styleRules.textAlign.contact};
                margin-bottom: ${spacingRules.spacing.betweenSections}px;

                ${this.name === 'Creative' ? `
                    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
                    color: white;
                    padding: 20px;
                    border-radius: 12px;
                    margin: -20px -20px 30px -20px;
                ` : this.name === 'Executive' ? `
                    border-bottom: 3px solid #1a365d;
                    padding-bottom: 20px;
                    margin-bottom: 30px;
                ` : ''}
            }

            .revolutionary-resume-${this.id} .contact-info .name {
                font-size: ${fontGuidelines.primary.size.headers * 1.5}pt;
                font-weight: ${fontGuidelines.primary.weight.bold};
                margin-bottom: 8px;
                color: ${this.name === 'Creative' ? 'white' : '#1a202c'};
            }

            /* Revolutionary Section Spacing */
            .revolutionary-resume-${this.id} .resume-section {
                margin-bottom: ${spacingRules.spacing.betweenSections}px;
                page-break-inside: ${spacingRules.pageBreaks.avoidInSections ? 'avoid' : 'auto'};
            }

            .revolutionary-resume-${this.id} .job-entry {
                margin-bottom: ${spacingRules.spacing.betweenJobs}px;
                page-break-inside: avoid;
            }

            .revolutionary-resume-${this.id} .education-entry {
                margin-bottom: ${spacingRules.spacing.betweenEducation}px;
            }

            /* Revolutionary Print Optimization */
            @media print {
                .revolutionary-resume-${this.id} {
                    ${this.printOptimized ? `
                        padding: 0.4in;
                        font-size: ${fontGuidelines.primary.size.base - 0.5}pt;
                        line-height: ${fontGuidelines.primary.lineHeight - 0.1};
                        color: black;
                        background: white;
                        box-shadow: none;
                        border: none;
                    ` : ''}
                }

                .revolutionary-resume-${this.id} .section-header {
                    color: black;
                    background: transparent;
                    -webkit-text-fill-color: initial;
                }

                .revolutionary-resume-${this.id} .contact-info {
                    background: transparent;
                    color: black;
                    border: 1px solid #ddd;
                }
            }

            /* Revolutionary Multi-Column Layout */
            ${spacingRules.columns.count === 2 ? `
                .revolutionary-resume-${this.id} .two-column-layout {
                    display: grid;
                    grid-template-columns: ${spacingRules.columns.splitRatio || 0.7}fr ${1 - (spacingRules.columns.splitRatio || 0.7)}fr;
                    gap: ${spacingRules.columns.gap || 30}px;
                }

                .revolutionary-resume-${this.id} .main-column {
                    grid-column: 1;
                }

                .revolutionary-resume-${this.id} .sidebar-column {
                    grid-column: 2;
                    background: #f8fafc;
                    padding: 20px;
                    border-radius: 8px;
                }
            ` : ''}

            /* Revolutionary Responsive Design */
            @media screen and (max-width: 768px) {
                .revolutionary-resume-${this.id} {
                    padding: 20px;
                    font-size: ${fontGuidelines.primary.size.base - 1}pt;
                }

                .revolutionary-resume-${this.id} .two-column-layout {
                    grid-template-columns: 1fr;
                    gap: 20px;
                }

                .revolutionary-resume-${this.id} .sidebar-column {
                    background: transparent;
                    padding: 0;
                    border-radius: 0;
                    border-top: 2px solid #e2e8f0;
                    padding-top: 20px;
                }
            }

            /* Revolutionary Page Breaks */
            @page {
                margin: 0.5in;
                size: letter;
            }
        `;
    }

    generateHTML(data: any): string {
        const sections = this.sectionOrder.map(sectionName => {
            return this.generateSection(sectionName, data[sectionName] || data);
        }).join('');

        return `
            <div class="revolutionary-resume-${this.id}">
                ${this.spacingRules.columns.count === 2 ? `
                    <div class="two-column-layout">
                        <div class="main-column">
                            ${sections}
                        </div>
                        <div class="sidebar-column">
                            ${this.generateSidebar(data)}
                        </div>
                    </div>
                ` : sections}
            </div>
        `;
    }

    private generateSection(sectionName: string, data: any): string {
        switch (sectionName.toLowerCase()) {
            case 'contact':
                return this.generateContactSection(data);
            case 'summary':
                return this.generateSummarySection(data);
            case 'experience':
                return this.generateExperienceSection(data);
            case 'education':
                return this.generateEducationSection(data);
            case 'skills':
                return this.generateSkillsSection(data);
            default:
                return this.generateGenericSection(sectionName, data);
        }
    }

    private generateContactSection(data: any): string {
        const contact = data.contact || data.personal || data;

        return `
            <div class="contact-info resume-section">
                <div class="name">${contact.name || data.name || ''}</div>
                <div class="contact-details">
                    ${contact.email ? `<span class="email">${contact.email}</span>` : ''}
                    ${contact.phone ? `<span class="phone">${contact.phone}</span>` : ''}
                    ${contact.location || contact.address ? `<span class="location">${contact.location || contact.address}</span>` : ''}
                    ${contact.linkedin ? `<span class="linkedin">${contact.linkedin}</span>` : ''}
                    ${contact.website ? `<span class="website">${contact.website}</span>` : ''}
                </div>
            </div>
        `;
    }

    private generateSummarySection(data: any): string {
        const summary = data.summary || data.objective || data.profile;
        if (!summary) return '';

        return `
            <div class="resume-section">
                <h2 class="section-header">Professional Summary</h2>
                <div class="summary-content">
                    ${typeof summary === 'string' ? `<p>${summary}</p>` : summary.content || ''}
                </div>
            </div>
        `;
    }

    private generateExperienceSection(data: any): string {
        // FORCE RELOAD - VERSION 2.0 - NEW TEMPLATE SYSTEM ACTIVE
        console.log('🚀🚀🚀 NEW TEMPLATE SYSTEM V2.0 ACTIVE 🚀🚀🚀');
        console.log('🔍 REVOLUTIONARY TEMPLATE - generateExperienceSection called with data:', data);

        const experience = data.experience || data.work || [];

        // ENHANCED FALLBACK: If no structured experience data, use ALL available content
        if (!Array.isArray(experience) || experience.length === 0) {
            console.log('⚠️ No structured experience data, checking for raw content...');

            // Check for detected content from the analysis
            const allSections = data.sections || [];
            const workSection = allSections.find((s: any) =>
                s.title?.toLowerCase()?.includes('experience') ||
                s.title?.toLowerCase()?.includes('work') ||
                s.type === 'experience'
            );

            const allBullets = data.bullets || data.bulletPoints || [];
            const detectedElements = data.detectedElements || {};

            console.log(`📊 Found: ${allSections.length} sections, ${allBullets.length} bullets`);
            console.log('🔍 Work section found:', !!workSection);

            // Create work experience from ALL available data
            let experienceHTML = `
                <div class="resume-section">
                    <h2 class="section-header">Work Experience</h2>
                    <div class="experience-content">`;

            // Show work section content if available
            if (workSection && workSection.content) {
                console.log('📝 Using work section content...');
                experienceHTML += `<div class="work-section-content">`;
                if (Array.isArray(workSection.content)) {
                    workSection.content.forEach((line: string) => {
                        if (line.trim()) {
                            experienceHTML += `<div class="content-line">${line.trim()}</div>`;
                        }
                    });
                } else if (typeof workSection.content === 'string') {
                    experienceHTML += `<div class="content-text">${workSection.content}</div>`;
                }
                experienceHTML += `</div>`;
            }

            // Show ALL detected bullets
            if (allBullets.length > 0) {
                console.log(`🔹 Adding ${allBullets.length} detected bullets to template...`);
                experienceHTML += `
                    <div class="all-bullets-section">
                        <h3>Key Achievements & Responsibilities</h3>
                        <ul class="comprehensive-bullet-list">`;

                allBullets.forEach((bullet: any) => {
                    const bulletText = bullet.cleanedText || bullet.text || bullet.content || bullet;
                    if (bulletText && typeof bulletText === 'string') {
                        experienceHTML += `<li class="bullet-item">${bulletText}</li>`;
                    }
                });

                experienceHTML += `</ul></div>`;
            }

            // If still no content, show a message
            if (!workSection && allBullets.length === 0) {
                experienceHTML += `<div class="no-content">No work experience data available for formatting.</div>`;
            }

            experienceHTML += `</div></div>`;
            return experienceHTML;
        }

        // Original structured data processing
        const experienceHTML = experience.map(job => `
            <div class="job-entry">
                <div class="job-header">
                    <div class="job-title">${job.position || job.title || ''}</div>
                    <div class="company-name">${job.company || ''}</div>
                    ${job.location ? `<div class="location">${job.location}</div>` : ''}
                    <div class="date-range">
                        ${job.startDate || ''} ${job.startDate && job.endDate ? ' - ' : ''} ${job.endDate || (job.current ? 'Present' : '')}
                    </div>
                </div>

                ${job.achievements || job.responsibilities || job.description ? `
                    <ul class="bullet-list">
                        ${(job.achievements || job.responsibilities || [job.description]).map((item: string) =>
                            `<li>${item}</li>`
                        ).join('')}
                    </ul>
                ` : ''}

                ${job.technologies ? `
                    <div class="technologies">
                        <strong>Technologies:</strong> ${Array.isArray(job.technologies) ? job.technologies.join(', ') : job.technologies}
                    </div>
                ` : ''}
            </div>
        `).join('');

        return `
            <div class="resume-section">
                <h2 class="section-header">Professional Experience</h2>
                ${experienceHTML}
            </div>
        `;
    }

    private generateEducationSection(data: any): string {
        const education = data.education || [];
        if (!Array.isArray(education) || education.length === 0) return '';

        const educationHTML = education.map(edu => `
            <div class="education-entry">
                <div class="degree">${edu.degree || ''}</div>
                <div class="institution">${edu.institution || edu.school || ''}</div>
                ${edu.location ? `<div class="location">${edu.location}</div>` : ''}
                <div class="date-range">${edu.year || edu.graduationDate || ''}</div>
                ${edu.gpa ? `<div class="gpa">GPA: ${edu.gpa}</div>` : ''}
                ${edu.honors && edu.honors.length > 0 ? `
                    <div class="honors">${edu.honors.join(', ')}</div>
                ` : ''}
            </div>
        `).join('');

        return `
            <div class="resume-section">
                <h2 class="section-header">Education</h2>
                ${educationHTML}
            </div>
        `;
    }

    private generateSkillsSection(data: any): string {
        const skills = data.skills || data.technicalSkills || {};
        if (!skills || Object.keys(skills).length === 0) return '';

        const skillsHTML = Object.entries(skills).map(([category, skillList]) => {
            if (Array.isArray(skillList) && skillList.length > 0) {
                return `
                    <div class="skill-category">
                        <h4 class="skill-category-name">${category.charAt(0).toUpperCase() + category.slice(1)}</h4>
                        <div class="skill-list">${skillList.join(' • ')}</div>
                    </div>
                `;
            }
            return '';
        }).join('');

        return `
            <div class="resume-section">
                <h2 class="section-header">Technical Skills</h2>
                ${skillsHTML}
            </div>
        `;
    }

    private generateGenericSection(sectionName: string, data: any): string {
        if (!data || (Array.isArray(data) && data.length === 0)) return '';

        return `
            <div class="resume-section">
                <h2 class="section-header">${sectionName.charAt(0).toUpperCase() + sectionName.slice(1)}</h2>
                <div class="section-content">
                    ${Array.isArray(data) ? data.map(item => `<p>${item}</p>`).join('') : `<p>${data}</p>`}
                </div>
            </div>
        `;
    }

    private generateSidebar(data: any): string {
        return `
            <div class="sidebar-content">
                ${this.generateSkillsSection(data)}
                ${data.certifications ? this.generateGenericSection('Certifications', data.certifications) : ''}
                ${data.languages ? this.generateGenericSection('Languages', data.languages) : ''}
            </div>
        `;
    }

    applyFormatting(elements: any[], visionData?: any): string {
        console.log('🎨 Applying Revolutionary Template Formatting...');

        if (!visionData || !this.formattingPreservation.preserveOriginalStructure) {
            return this.generateStandardFormatting(elements);
        }

        return this.generateVisionEnhancedFormatting(elements, visionData);
    }

    private generateStandardFormatting(elements: any[]): string {
        // Standard template formatting without vision enhancement
        return elements.map(element => {
            if (element.role === 'heading') {
                return `<h2 class="section-header">${element.text}</h2>`;
            } else if (element.role === 'bulletPoint') {
                return `<li>${element.text.replace(/^[•▪▫◦‣⁃▸▹▪▫⦿⦾\-–—*]\s*/, '')}</li>`;
            } else if (element.fontWeight === 'bold') {
                return `<div class="job-title">${element.text}</div>`;
            } else {
                return `<p>${element.text}</p>`;
            }
        }).join('');
    }

    private generateVisionEnhancedFormatting(elements: any[], visionData: any): string {
        console.log('🔬 Applying Vision-Enhanced Formatting with Confidence Scoring...');

        // 🔍 DEBUG: Check vision data structure
        console.log('🔍 Vision data structure:', {
            hasVisionData: !!visionData,
            hasFormattingHierarchy: !!visionData?.formattingHierarchy,
            confidenceStructure: visionData?.confidence,
            hierarchyConfidence: visionData?.formattingHierarchy?.confidenceScores
        });

        // Use vision data to preserve original formatting
        const formattingHierarchy = visionData?.formattingHierarchy;

        // Check confidence with multiple fallback paths
        let overallConfidence = 0;
        if (formattingHierarchy?.confidenceScores?.overall) {
            overallConfidence = formattingHierarchy.confidenceScores.overall;
        } else if (visionData?.confidence?.overall) {
            overallConfidence = visionData.confidence.overall;
        } else if (visionData?.confidence?.formatting) {
            overallConfidence = visionData.confidence.formatting;
        } else {
            overallConfidence = 0.5; // Default confidence
        }

        console.log(`🎯 Using confidence: ${Math.round(overallConfidence * 100)}% (threshold: ${Math.round(this.formattingPreservation.confidenceThreshold * 100)}%)`);

        if (formattingHierarchy && overallConfidence > this.formattingPreservation.confidenceThreshold) {
            return this.applyAdvancedVisionFormatting(elements, formattingHierarchy);
        }

        return this.generateStandardFormatting(elements);
    }

    private applyAdvancedVisionFormatting(elements: any[], hierarchy: any): string {
        // Advanced formatting preservation using vision analysis
        return elements.map(element => {
            // Use Azure styles if available
            if (hierarchy.level1_azureStyles.stylesFound > 0) {
                const styleSpan = hierarchy.level1_azureStyles.spans.find((span: any) =>
                    span.offset <= element.text.length && (span.offset + span.length) >= 0
                );

                if (styleSpan && styleSpan.fontWeight === 'bold') {
                    return `<strong>${element.text}</strong>`;
                }
            }

            // Fall back to font analysis
            if (hierarchy.level2_fontAnalysis.boldElements.includes(element)) {
                return `<strong>${element.text}</strong>`;
            }

            // Fall back to pattern detection
            const pattern = hierarchy.level3_patternDetection.patterns.find((p: any) => p.element === element);
            if (pattern) {
                switch (pattern.type) {
                    case 'bullet':
                        return `<li>${element.text.replace(/^[•▪▫◦‣⁃▸▹▪▫⦿⦾\-–—*]\s*/, '')}</li>`;
                    case 'header':
                        return `<h2 class="section-header">${element.text}</h2>`;
                    default:
                        return `<p>${element.text}</p>`;
                }
            }

            return `<p>${element.text}</p>`;
        }).join('');
    }
}

/**
 * Revolutionary Template Factory
 */
export class RevolutionaryTemplateFactory {
    static createATSFriendlyTemplate(): RevolutionaryResumeTemplate {
        return new RevolutionaryResumeTemplate({
            id: 'revolutionary-ats-friendly',
            name: 'ATS-Friendly',
            category: 'professional',
            description: 'Optimized for Applicant Tracking Systems with clean, parseable formatting',

            styleRules: {
                bold: {
                    sectionHeaders: true,
                    jobTitles: true,
                    companyNames: false,
                    degrees: true
                },
                italic: {
                    dates: false,
                    locations: true,
                    certificationIssuers: false
                },
                bulletPoints: {
                    style: '•',
                    indentation: 20,
                    spacing: 6
                },
                textAlign: {
                    headers: 'left',
                    content: 'left',
                    contact: 'left'
                },
                capitalization: {
                    sectionHeaders: 'uppercase',
                    jobTitles: 'preserve'
                }
            },

            sectionOrder: ['contact', 'summary', 'experience', 'education', 'skills'],

            fontGuidelines: {
                primary: {
                    family: 'Arial',
                    size: {
                        base: 11,
                        headers: 14,
                        subheaders: 12,
                        small: 10
                    },
                    weight: {
                        normal: 400,
                        medium: 500,
                        bold: 700
                    },
                    lineHeight: 1.4
                },
                fallback: ['Helvetica', 'sans-serif'],
                atsOptimized: true
            },

            spacingRules: {
                margins: { top: 50, bottom: 50, left: 50, right: 50 },
                padding: { sections: 8, subsections: 4, bulletPoints: 6 },
                spacing: {
                    betweenSections: 24,
                    betweenJobs: 16,
                    betweenEducation: 12,
                    afterHeaders: 8,
                    beforeHeaders: 16
                },
                columns: { count: 1 },
                pageBreaks: {
                    avoidInSections: true,
                    preferredBreakPoints: ['experience', 'education']
                }
            },

            atsCompatible: true,
            printOptimized: true,
            industryFocus: ['technology', 'finance', 'healthcare', 'general'],
            visionEnhanced: true,

            formattingPreservation: {
                level: 'revolutionary',
                preserveOriginalStructure: true,
                adaptiveFormatting: true,
                confidenceThreshold: 0.7
            }
        });
    }

    static createExecutiveTemplate(): RevolutionaryResumeTemplate {
        return new RevolutionaryResumeTemplate({
            id: 'revolutionary-executive',
            name: 'Executive',
            category: 'executive',
            description: 'Sophisticated design for senior leadership positions',

            styleRules: {
                bold: {
                    sectionHeaders: true,
                    jobTitles: true,
                    companyNames: true,
                    degrees: true
                },
                italic: {
                    dates: true,
                    locations: true,
                    certificationIssuers: true
                },
                bulletPoints: {
                    style: '▪',
                    indentation: 24,
                    spacing: 8
                },
                textAlign: {
                    headers: 'left',
                    content: 'justify',
                    contact: 'center'
                },
                capitalization: {
                    sectionHeaders: 'uppercase',
                    jobTitles: 'preserve'
                }
            },

            sectionOrder: ['contact', 'summary', 'experience', 'education', 'skills'],

            fontGuidelines: {
                primary: {
                    family: 'Times New Roman',
                    size: {
                        base: 12,
                        headers: 16,
                        subheaders: 14,
                        small: 10
                    },
                    weight: {
                        normal: 400,
                        medium: 600,
                        bold: 700
                    },
                    lineHeight: 1.6
                },
                fallback: ['Georgia', 'serif'],
                atsOptimized: true
            },

            spacingRules: {
                margins: { top: 60, bottom: 60, left: 60, right: 60 },
                padding: { sections: 12, subsections: 8, bulletPoints: 8 },
                spacing: {
                    betweenSections: 32,
                    betweenJobs: 20,
                    betweenEducation: 16,
                    afterHeaders: 12,
                    beforeHeaders: 20
                },
                columns: { count: 1 },
                pageBreaks: {
                    avoidInSections: true,
                    preferredBreakPoints: ['experience', 'education']
                }
            },

            atsCompatible: true,
            printOptimized: true,
            industryFocus: ['executive', 'finance', 'consulting', 'management'],
            visionEnhanced: true,

            formattingPreservation: {
                level: 'revolutionary',
                preserveOriginalStructure: true,
                adaptiveFormatting: true,
                confidenceThreshold: 0.8
            }
        });
    }

    static createCreativeTemplate(): RevolutionaryResumeTemplate {
        return new RevolutionaryResumeTemplate({
            id: 'revolutionary-creative',
            name: 'Creative',
            category: 'creative',
            description: 'Visually engaging design for creative professionals',

            styleRules: {
                bold: {
                    sectionHeaders: true,
                    jobTitles: true,
                    companyNames: false,
                    degrees: true
                },
                italic: {
                    dates: true,
                    locations: false,
                    certificationIssuers: true
                },
                bulletPoints: {
                    style: '▸',
                    indentation: 20,
                    spacing: 8
                },
                textAlign: {
                    headers: 'left',
                    content: 'left',
                    contact: 'center'
                },
                capitalization: {
                    sectionHeaders: 'capitalize',
                    jobTitles: 'preserve'
                }
            },

            sectionOrder: ['contact', 'summary', 'experience', 'skills', 'education'],

            fontGuidelines: {
                primary: {
                    family: 'Inter',
                    size: {
                        base: 11,
                        headers: 15,
                        subheaders: 13,
                        small: 10
                    },
                    weight: {
                        normal: 400,
                        medium: 500,
                        bold: 600
                    },
                    lineHeight: 1.5
                },
                fallback: ['Helvetica', 'Arial', 'sans-serif'],
                atsOptimized: false
            },

            spacingRules: {
                margins: { top: 40, bottom: 40, left: 40, right: 40 },
                padding: { sections: 16, subsections: 8, bulletPoints: 8 },
                spacing: {
                    betweenSections: 28,
                    betweenJobs: 18,
                    betweenEducation: 14,
                    afterHeaders: 10,
                    beforeHeaders: 18
                },
                columns: { count: 2, gap: 30, splitRatio: 0.65 },
                pageBreaks: {
                    avoidInSections: true,
                    preferredBreakPoints: ['experience', 'skills']
                }
            },

            atsCompatible: false,
            printOptimized: true,
            industryFocus: ['design', 'marketing', 'media', 'advertising'],
            visionEnhanced: true,

            formattingPreservation: {
                level: 'revolutionary',
                preserveOriginalStructure: false,
                adaptiveFormatting: true,
                confidenceThreshold: 0.6
            }
        });
    }

    static createAcademicTemplate(): RevolutionaryResumeTemplate {
        return new RevolutionaryResumeTemplate({
            id: 'revolutionary-academic',
            name: 'Academic',
            category: 'academic',
            description: 'Formal design for academic and research positions',

            styleRules: {
                bold: {
                    sectionHeaders: true,
                    jobTitles: false,
                    companyNames: false,
                    degrees: true
                },
                italic: {
                    dates: true,
                    locations: true,
                    certificationIssuers: true
                },
                bulletPoints: {
                    style: '-',
                    indentation: 18,
                    spacing: 4
                },
                textAlign: {
                    headers: 'center',
                    content: 'justify',
                    contact: 'center'
                },
                capitalization: {
                    sectionHeaders: 'uppercase',
                    jobTitles: 'preserve'
                }
            },

            sectionOrder: ['contact', 'education', 'experience', 'skills', 'summary'],

            fontGuidelines: {
                primary: {
                    family: 'Times New Roman',
                    size: {
                        base: 12,
                        headers: 14,
                        subheaders: 12,
                        small: 11
                    },
                    weight: {
                        normal: 400,
                        medium: 500,
                        bold: 700
                    },
                    lineHeight: 1.6
                },
                fallback: ['Georgia', 'serif'],
                atsOptimized: true
            },

            spacingRules: {
                margins: { top: 72, bottom: 72, left: 72, right: 72 },
                padding: { sections: 8, subsections: 4, bulletPoints: 4 },
                spacing: {
                    betweenSections: 24,
                    betweenJobs: 16,
                    betweenEducation: 12,
                    afterHeaders: 8,
                    beforeHeaders: 16
                },
                columns: { count: 1 },
                pageBreaks: {
                    avoidInSections: true,
                    preferredBreakPoints: ['education', 'experience']
                }
            },

            atsCompatible: true,
            printOptimized: true,
            industryFocus: ['education', 'research', 'academia', 'nonprofit'],
            visionEnhanced: true,

            formattingPreservation: {
                level: 'advanced',
                preserveOriginalStructure: true,
                adaptiveFormatting: false,
                confidenceThreshold: 0.8
            }
        });
    }

    static createModernTemplate(): RevolutionaryResumeTemplate {
        return new RevolutionaryResumeTemplate({
            id: 'revolutionary-modern',
            name: 'Modern',
            category: 'technical',
            description: 'Contemporary design with innovative visual elements',

            styleRules: {
                bold: {
                    sectionHeaders: true,
                    jobTitles: true,
                    companyNames: true,
                    degrees: true
                },
                italic: {
                    dates: false,
                    locations: true,
                    certificationIssuers: false
                },
                bulletPoints: {
                    style: '•',
                    indentation: 22,
                    spacing: 6
                },
                textAlign: {
                    headers: 'left',
                    content: 'left',
                    contact: 'left'
                },
                capitalization: {
                    sectionHeaders: 'uppercase',
                    jobTitles: 'preserve'
                }
            },

            sectionOrder: ['contact', 'summary', 'skills', 'experience', 'education'],

            fontGuidelines: {
                primary: {
                    family: 'Inter',
                    size: {
                        base: 11,
                        headers: 14,
                        subheaders: 12,
                        small: 10
                    },
                    weight: {
                        normal: 400,
                        medium: 500,
                        bold: 600
                    },
                    lineHeight: 1.5
                },
                fallback: ['Helvetica', 'Arial', 'sans-serif'],
                atsOptimized: true
            },

            spacingRules: {
                margins: { top: 50, bottom: 50, left: 50, right: 50 },
                padding: { sections: 10, subsections: 6, bulletPoints: 6 },
                spacing: {
                    betweenSections: 26,
                    betweenJobs: 18,
                    betweenEducation: 14,
                    afterHeaders: 10,
                    beforeHeaders: 18
                },
                columns: { count: 1 },
                pageBreaks: {
                    avoidInSections: true,
                    preferredBreakPoints: ['experience', 'education']
                }
            },

            atsCompatible: true,
            printOptimized: true,
            industryFocus: ['technology', 'startups', 'digital', 'modern companies'],
            visionEnhanced: true,

            formattingPreservation: {
                level: 'revolutionary',
                preserveOriginalStructure: true,
                adaptiveFormatting: true,
                confidenceThreshold: 0.75
            }
        });
    }

    static getAllTemplates(): RevolutionaryResumeTemplate[] {
        return [
            this.createATSFriendlyTemplate(),
            this.createExecutiveTemplate(),
            this.createCreativeTemplate(),
            this.createAcademicTemplate(),
            this.createModernTemplate()
        ];
    }

    static getTemplateById(id: string): RevolutionaryResumeTemplate | null {
        const templates = this.getAllTemplates();
        return templates.find(template => template.id === id) || null;
    }

    static getTemplatesByCategory(category: string): RevolutionaryResumeTemplate[] {
        const templates = this.getAllTemplates();
        return templates.filter(template => template.category === category);
    }

    static getAtsCompatibleTemplates(): RevolutionaryResumeTemplate[] {
        const templates = this.getAllTemplates();
        return templates.filter(template => template.atsCompatible);
    }
}

export default RevolutionaryTemplateFactory;