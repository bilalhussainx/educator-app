import { ParsedResume } from './universalResumeParser';
import MultiPageLayoutEngine from './multiPageLayoutEngine';

type TemplateStyle = 'modern' | 'classic' | 'creative' | 'professional' | 'minimalist' | 'executive';

interface TemplateOptions {
    style: TemplateStyle;
    colorScheme: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'monochrome';
    layout: 'single-column' | 'two-column' | 'sidebar';
    fontSize: 'small' | 'medium' | 'large';
    includePhoto: boolean;
    customSections?: string[];
}

interface TemplateResult {
    html: string;
    css: string;
    plainText: string;
    preview: string;
    metadata: {
        templateUsed: TemplateStyle;
        sectionsIncluded: string[];
        wordCount: number;
        estimatedPages: number;
    };
}

class ResumeTemplateEngine {
    private readonly colorSchemes = {
        blue: {
            primary: '#2563eb',
            secondary: '#1e40af',
            accent: '#3b82f6',
            text: '#1f2937',
            light: '#eff6ff'
        },
        green: {
            primary: '#059669',
            secondary: '#047857',
            accent: '#10b981',
            text: '#1f2937',
            light: '#ecfdf5'
        },
        purple: {
            primary: '#7c3aed',
            secondary: '#6d28d9',
            accent: '#8b5cf6',
            text: '#1f2937',
            light: '#faf5ff'
        },
        orange: {
            primary: '#ea580c',
            secondary: '#c2410c',
            accent: '#f97316',
            text: '#1f2937',
            light: '#fff7ed'
        },
        red: {
            primary: '#dc2626',
            secondary: '#b91c1c',
            accent: '#ef4444',
            text: '#1f2937',
            light: '#fef2f2'
        },
        monochrome: {
            primary: '#374151',
            secondary: '#1f2937',
            accent: '#6b7280',
            text: '#111827',
            light: '#f9fafb'
        }
    };

    generateResume(parsedResume: ParsedResume, options: TemplateOptions): TemplateResult {
        console.log('🎨 Generating resume with template:', options.style);
        console.log('📋 Input data for template:', {
            hasName: !!parsedResume.name,
            hasSections: !!parsedResume.sections,
            sectionsCount: parsedResume.sections?.length || 0,
            hasContact: !!parsedResume.contact
        });

        // Sanitize input data with defaults
        const sanitizedResume = {
            name: parsedResume.name || 'No Name Provided',
            contact: parsedResume.contact || {},
            sections: parsedResume.sections || [],
            wordCount: parsedResume.wordCount || 0
        };

        // Validate input data
        if (!Array.isArray(sanitizedResume.sections)) {
            console.warn('⚠️ Converting sections to array format');
            sanitizedResume.sections = [];
        }

        if (sanitizedResume.sections.length === 0) {
            console.warn('⚠️ No sections found, creating placeholder section');
            sanitizedResume.sections = [{
                title: 'Content',
                content: 'Resume content will appear here',
                type: 'other'
            }];
        }

        console.log('📋 Sections for template:', sanitizedResume.sections.map(s => ({
            title: s.title,
            contentLength: s.content?.length || 0,
            contentPreview: (s.content?.substring(0, 100) || '') + '...'
        })));

        const colors = this.colorSchemes[options.colorScheme] || this.colorSchemes.blue || {
            primary: '#2563eb',
            secondary: '#1e40af',
            accent: '#3b82f6',
            text: '#1f2937',
            light: '#eff6ff'
        };

        // Generate components based on template style
        const html = this.generateHtml(sanitizedResume, options, colors);
        const css = this.generateCss(options, colors);
        const plainText = this.generatePlainText(sanitizedResume, options);
        const preview = this.generatePreview(sanitizedResume, options);

        // Calculate metadata
        const metadata = {
            templateUsed: options.style,
            sectionsIncluded: sanitizedResume.sections.map(s => s.title),
            wordCount: sanitizedResume.wordCount,
            estimatedPages: Math.ceil(sanitizedResume.wordCount / 250) // Rough estimate
        };

        console.log('✅ Resume template generated:', {
            style: options.style,
            sections: metadata.sectionsIncluded.length,
            sectionsIncluded: metadata.sectionsIncluded,
            wordCount: metadata.wordCount,
            estimatedPages: metadata.estimatedPages,
            htmlLength: html.length,
            htmlPreview: html.substring(0, 500) + '...'
        });

        return {
            html,
            css,
            plainText,
            preview,
            metadata
        };
    }

    private generateHtml(parsedResume: ParsedResume, options: TemplateOptions, colors: any): string {
        switch (options.style) {
            case 'modern':
                return this.generateModernTemplate(parsedResume, options, colors);
            case 'classic':
                return this.generateClassicTemplate(parsedResume, options, colors);
            case 'creative':
                return this.generateCreativeTemplate(parsedResume, options, colors);
            case 'professional':
                return this.generateProfessionalTemplate(parsedResume, options, colors);
            case 'minimalist':
                return this.generateMinimalistTemplate(parsedResume, options, colors);
            case 'executive':
                return this.generateExecutiveTemplate(parsedResume, options, colors);
            default:
                return this.generateModernTemplate(parsedResume, options, colors);
        }
    }

    private generateModernTemplate(parsedResume: ParsedResume, options: TemplateOptions, colors: any): string {
        const contact = parsedResume.contact;
        const sections = parsedResume.sections;

        return `
        <div class="resume-container modern-template" data-layout="${options.layout}">
            <!-- Header Section -->
            <header class="resume-header">
                <div class="header-content">
                    ${options.includePhoto ? '<div class="photo-placeholder">📷</div>' : ''}
                    <div class="name-contact">
                        <h1 class="name">${parsedResume.name}</h1>
                        <div class="contact-grid">
                            ${contact.email ? `<span class="contact-item">📧 ${contact.email}</span>` : ''}
                            ${contact.phone ? `<span class="contact-item">📞 ${contact.phone}</span>` : ''}
                            ${contact.linkedin ? `<span class="contact-item">🔗 ${contact.linkedin}</span>` : ''}
                            ${contact.website ? `<span class="contact-item">🌐 ${contact.website}</span>` : ''}
                            ${contact.address ? `<span class="contact-item">📍 ${contact.address}</span>` : ''}
                        </div>
                    </div>
                </div>
            </header>

            <!-- Main Content -->
            <main class="resume-main">
                ${options.layout === 'two-column' ? this.generateTwoColumnLayout(sections) : this.generateSingleColumnLayout(sections)}
            </main>
        </div>
        `;
    }

    private generateClassicTemplate(parsedResume: ParsedResume, options: TemplateOptions, colors: any): string {
        const contact = parsedResume.contact;
        const sections = parsedResume.sections;

        return `
        <div class="resume-container classic-template">
            <!-- Header Section -->
            <header class="resume-header classic-header">
                <div class="header-line"></div>
                <h1 class="name">${parsedResume.name}</h1>
                <div class="contact-line">
                    ${contact.email || ''} ${contact.phone ? '• ' + contact.phone : ''} ${contact.address ? '• ' + contact.address : ''}
                </div>
                <div class="header-line"></div>
            </header>

            <!-- Sections -->
            <main class="resume-main classic-main">
                ${sections.map(section => `
                    <section class="resume-section">
                        <h2 class="section-title">${section.title}</h2>
                        <div class="section-content">${this.formatSectionContent(section.content)}</div>
                    </section>
                `).join('')}
            </main>
        </div>
        `;
    }

    private generateCreativeTemplate(parsedResume: ParsedResume, options: TemplateOptions, colors: any): string {
        const contact = parsedResume.contact;
        const sections = parsedResume.sections;

        return `
        <div class="resume-container creative-template">
            <!-- Creative Header -->
            <header class="resume-header creative-header">
                <div class="header-shape"></div>
                <div class="header-content">
                    <h1 class="name creative-name">${parsedResume.name}</h1>
                    <div class="creative-contact">
                        ${contact.email ? `<div class="contact-bubble">📧 ${contact.email}</div>` : ''}
                        ${contact.phone ? `<div class="contact-bubble">📞 ${contact.phone}</div>` : ''}
                        ${contact.linkedin ? `<div class="contact-bubble">🔗 LinkedIn</div>` : ''}
                    </div>
                </div>
            </header>

            <!-- Creative Sections -->
            <main class="resume-main creative-main">
                <div class="sections-grid">
                    ${sections.map((section, index) => `
                        <section class="creative-section section-${index % 2 === 0 ? 'left' : 'right'}">
                            <div class="section-icon">🎯</div>
                            <h2 class="creative-section-title">${section.title}</h2>
                            <div class="creative-content">${this.formatSectionContent(section.content)}</div>
                        </section>
                    `).join('')}
                </div>
            </main>
        </div>
        `;
    }

    private generateProfessionalTemplate(parsedResume: ParsedResume, options: TemplateOptions, colors: any): string {
        const contact = parsedResume.contact;
        const sections = parsedResume.sections;

        return `
        <div class="resume-container professional-template">
            <!-- Professional Header -->
            <header class="resume-header professional-header">
                <div class="header-bar"></div>
                <div class="header-content">
                    <h1 class="name professional-name">${parsedResume.name}</h1>
                    <div class="professional-contact">
                        ${Object.entries(contact).filter(([key, value]) => value).map(([key, value]) =>
                            `<span class="contact-item professional-contact-item">${value}</span>`
                        ).join(' | ')}
                    </div>
                </div>
            </header>

            <!-- Professional Sections -->
            <main class="resume-main professional-main">
                ${sections.map(section => `
                    <section class="professional-section">
                        <div class="section-header">
                            <h2 class="professional-section-title">${section.title}</h2>
                            <div class="section-underline"></div>
                        </div>
                        <div class="professional-content">${this.formatSectionContent(section.content)}</div>
                    </section>
                `).join('')}
            </main>
        </div>
        `;
    }

    private generateMinimalistTemplate(parsedResume: ParsedResume, options: TemplateOptions, colors: any): string {
        const contact = parsedResume.contact;
        const sections = parsedResume.sections;

        return `
        <div class="resume-container minimalist-template">
            <!-- Minimalist Header -->
            <header class="minimalist-header">
                <h1 class="minimalist-name">${parsedResume.name}</h1>
                <div class="minimalist-contact">
                    ${Object.values(contact).filter(v => v).join(' • ')}
                </div>
            </header>

            <!-- Minimalist Sections -->
            <main class="minimalist-main">
                ${sections.map(section => `
                    <section class="minimalist-section">
                        <h2 class="minimalist-title">${section.title}</h2>
                        <div class="minimalist-content">${this.formatSectionContent(section.content, true)}</div>
                    </section>
                `).join('')}
            </main>
        </div>
        `;
    }

    private generateExecutiveTemplate(parsedResume: ParsedResume, options: TemplateOptions, colors: any): string {
        const contact = parsedResume.contact;
        const sections = parsedResume.sections;

        return `
        <div class="resume-container executive-template">
            <!-- Executive Header -->
            <header class="executive-header">
                <div class="executive-letterhead">
                    <h1 class="executive-name">${parsedResume.name}</h1>
                    <div class="executive-title">Senior Executive</div>
                </div>
                <div class="executive-contact">
                    <table class="contact-table">
                        <tr>
                            ${contact.email ? `<td>Email: ${contact.email}</td>` : ''}
                            ${contact.phone ? `<td>Phone: ${contact.phone}</td>` : ''}
                        </tr>
                        <tr>
                            ${contact.linkedin ? `<td>LinkedIn: ${contact.linkedin}</td>` : ''}
                            ${contact.address ? `<td>Address: ${contact.address}</td>` : ''}
                        </tr>
                    </table>
                </div>
            </header>

            <!-- Executive Sections -->
            <main class="executive-main">
                ${sections.map(section => `
                    <section class="executive-section">
                        <h2 class="executive-section-title">${section.title}</h2>
                        <div class="executive-content">${this.formatSectionContent(section.content)}</div>
                    </section>
                `).join('')}
            </main>
        </div>
        `;
    }

    private generateTwoColumnLayout(sections: ParsedResume['sections']): string {
        const leftSections = sections.filter((_, index) => index % 2 === 0);
        const rightSections = sections.filter((_, index) => index % 2 === 1);

        return `
        <div class="two-column-layout">
            <div class="left-column">
                ${leftSections.map(section => `
                    <section class="resume-section">
                        <h2 class="section-title">${section.title}</h2>
                        <div class="section-content">${this.formatSectionContent(section.content)}</div>
                    </section>
                `).join('')}
            </div>
            <div class="right-column">
                ${rightSections.map(section => `
                    <section class="resume-section">
                        <h2 class="section-title">${section.title}</h2>
                        <div class="section-content">${this.formatSectionContent(section.content)}</div>
                    </section>
                `).join('')}
            </div>
        </div>
        `;
    }

    private generateSingleColumnLayout(sections: ParsedResume['sections']): string {
        console.log(`🎨 Generating layout for ${sections.length} sections:`, sections.map(s => `${s.title} (${s.content?.length || 0} chars)`));

        return sections.map(section => {
            console.log(`📋 Processing section: ${section.title} with content length: ${section.content?.length || 0}`);
            const formattedContent = this.formatSectionContent(section.content);

            return `
            <section class="resume-section">
                <h2 class="section-title">${section.title}</h2>
                <div class="section-content">${formattedContent}</div>
            </section>
        `;
        }).join('');
    }

    private formatSectionContent(content: string, minimal: boolean = false): string {
        if (!content) {
            console.log('⚠️ Empty section content detected');
            return '<p class="empty-section">No content available for this section</p>';
        }

        console.log(`📝 Formatting section content (${content.length} chars): ${content.substring(0, 100)}...`);

        // Check if this looks like work experience with multiple positions
        if (this.isWorkExperienceSection(content)) {
            console.log('💼 Detected work experience section, using specialized formatting');
            return this.formatWorkExperience(content, minimal);
        }

        // Convert plain text to HTML with proper formatting
        let formatted = content
            // Preserve bullet points
            .replace(/^[\s]*•\s+(.+)$/gm, '<li>$1</li>')
            .replace(/^[\s]*-\s+(.+)$/gm, '<li>$1</li>')

            // Wrap consecutive list items in ul tags
            .replace(/(<li>.*<\/li>\s*)+/gs, '<ul>$&</ul>')

            // Format dates and locations
            .replace(/📅\s*([^📞📧📍🌐]+)/g, '<span class="date">$1</span>')
            .replace(/📍\s*([^📞📧📅🌐]+)/g, '<span class="location">$1</span>')
            .replace(/🏢\s*([^📞📧📅📍🌐]+)/g, '<span class="company">$1</span>')
            .replace(/💼\s*([^📞📧📅📍🌐]+)/g, '<span class="job-title">$1</span>')

            // Format emphasized text
            .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
            .replace(/\*([^*]+)\*/g, '<em>$1</em>')
            .replace(/_([^_]+)_/g, '<u>$1</u>')

            // Convert line breaks to paragraphs
            .split('\n\n')
            .map(para => para.trim() ? `<p>${para.replace(/\n/g, '<br>')}</p>` : '')
            .join('');

        if (minimal) {
            // Remove excessive formatting for minimalist template
            formatted = formatted
                .replace(/<strong>/g, '')
                .replace(/<\/strong>/g, '')
                .replace(/<em>/g, '')
                .replace(/<\/em>/g, '');
        }

        return formatted;
    }

    private isWorkExperienceSection(content: string): boolean {
        const hasJobTitles = /\b(engineer|developer|manager|analyst|coordinator|specialist|assistant|administrator|faculty|member|lead)\b/i.test(content);
        const hasCompanies = /\b(academy|company|corp|inc|llc|ltd|university|school)\b/i.test(content);
        const hasDates = /\b(january|february|march|april|may|june|july|august|september|october|november|december|\d{4})\b/i.test(content);
        const hasMultiplePositions = (content.match(/\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{4}/gi) || []).length > 1;

        return (hasJobTitles && hasCompanies && hasDates) || hasMultiplePositions;
    }

    private formatWorkExperience(content: string, minimal: boolean = false): string {
        const lines = content.split('\n').filter(line => line.trim());
        const positions: Array<{
            title: string;
            company: string;
            location: string;
            dates: string;
            responsibilities: string[];
        }> = [];

        let currentPosition: any = null;
        let responsibilities: string[] = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            // Detect job title patterns
            if (this.isJobTitleLine(line)) {
                // Save previous position
                if (currentPosition) {
                    currentPosition.responsibilities = [...responsibilities];
                    positions.push(currentPosition);
                }

                // Parse new position
                currentPosition = this.parseJobTitleLine(line);
                responsibilities = [];
            }
            // Detect date lines
            else if (this.isDateLine(line) && currentPosition) {
                currentPosition.dates = line;
            }
            // Detect responsibility/description lines
            else if (line.length > 20 && (line.startsWith('•') || line.startsWith('-') || /^[A-Z]/.test(line))) {
                responsibilities.push(line.replace(/^[•\-]\s*/, ''));
            }
            // If it's a short line that might be location or additional info
            else if (currentPosition && line.length < 50 && line.includes(',')) {
                currentPosition.location = line;
            }
        }

        // Add final position
        if (currentPosition) {
            currentPosition.responsibilities = [...responsibilities];
            positions.push(currentPosition);
        }

        // Generate HTML for positions
        const positionsHtml = positions.map(position => `
            <div class="job-position">
                <div class="job-header">
                    <h3 class="job-title">${position.title}</h3>
                    <div class="company-info">
                        <span class="company">${position.company}</span>
                        ${position.location ? `<span class="location">${position.location}</span>` : ''}
                    </div>
                    ${position.dates ? `<div class="job-dates">${position.dates}</div>` : ''}
                </div>
                <div class="job-content">
                    ${position.responsibilities.length > 0 ?
                        `<ul class="responsibilities">
                            ${position.responsibilities.map(resp => `<li>${resp}</li>`).join('')}
                        </ul>` :
                        ''
                    }
                </div>
            </div>
        `).join('');

        return positionsHtml;
    }

    private isJobTitleLine(line: string): boolean {
        const jobTitlePatterns = [
            /\b(engineer|developer|manager|analyst|coordinator|specialist|assistant|administrator|faculty|member|lead|director)\b/i,
            /\b(milton academy|healthynox|office administrator)\b/i,
            /^[A-Z][a-z]+\s+(Engineer|Developer|Manager|Analyst|Coordinator|Specialist|Assistant|Administrator|Faculty|Member|Lead)/i
        ];

        return jobTitlePatterns.some(pattern => pattern.test(line)) &&
               line.length < 100 &&
               !line.includes('•') &&
               !line.includes('-') &&
               !/^\d/.test(line.trim());
    }

    private isDateLine(line: string): boolean {
        return /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{4}/i.test(line) ||
               /\d{4}\s*[-–—]\s*\d{4}/i.test(line) ||
               /\d{4}\s*[-–—]\s*(present|current)/i.test(line);
    }

    private parseJobTitleLine(line: string): any {
        let title = '';
        let company = '';

        // Try to split by common separators
        if (line.includes(' — ')) {
            const parts = line.split(' — ');
            title = parts[1] || '';
            company = parts[0] || '';
        } else if (line.includes(', ')) {
            const parts = line.split(', ');
            if (parts.length >= 2) {
                title = parts[1] || '';
                company = parts[0] || '';
            } else {
                title = line;
            }
        } else {
            // Check if line contains company name patterns
            const companyMatch = line.match(/\b(academy|healthynox|corporation|company|corp|inc|llc|ltd|university|school)\b/i);
            if (companyMatch) {
                const companyIndex = line.indexOf(companyMatch[0]);
                title = line.substring(companyIndex + companyMatch[0].length).trim();
                company = line.substring(0, companyIndex + companyMatch[0].length).trim();
            } else {
                title = line;
            }
        }

        return {
            title: title.trim(),
            company: company.trim(),
            location: '',
            dates: ''
        };
    }

    private generateCss(options: TemplateOptions, colors: any): string {
        const fontSize = {
            small: { base: '12px', h1: '20px', h2: '16px' },
            medium: { base: '14px', h1: '24px', h2: '18px' },
            large: { base: '16px', h1: '28px', h2: '20px' }
        }[options.fontSize];

        return `
        .resume-container {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-size: ${fontSize.base};
            line-height: 1.6;
            color: ${colors.text};
            max-width: 8.5in;
            margin: 0 auto;
            padding: 0.75in;
            background: white;
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
            min-height: auto;
            height: auto; /* Natural height - follows content length */
            overflow: visible; /* Allow content to expand naturally */
            position: relative;
        }

        /* Natural multi-page display */
        @media screen {
            .resume-container {
                /* On screen, show as continuous document */
                min-height: 11in; /* Minimum one page */
                /* Will expand naturally for longer content */
            }

            /* Visual page breaks for screen viewing */
            .resume-container::after {
                content: '';
                display: block;
                height: 1px;
                background: #e5e7eb;
                margin: 11in 0 2rem 0;
                opacity: 0.5;
            }

            /* Hide page break if content fits in one page */
            .resume-container[data-content-height="single"]::after {
                display: none;
            }
        }

        @media print {
            .resume-container {
                /* Print will naturally break pages based on content */
                height: auto;
                page-break-inside: auto;
            }

            .resume-container::after {
                display: none;
            }
        }

        /* NATURAL SPACING */
        .resume-container h1 {
            margin-bottom: 0.5rem;
        }

        .resume-container h2 {
            margin-bottom: 0.75rem;
            margin-top: 1.5rem;
        }

        .resume-container p {
            margin-bottom: 0.5rem;
        }

        .resume-container ul {
            margin-bottom: 0.75rem;
            padding-left: 1.5rem;
        }

        .resume-container li {
            margin-bottom: 0.25rem;
            line-height: 1.6;
        }

        /* Multi-page support */
        .resume-container * {
            max-height: none !important;
            overflow: visible !important;
        }

        /* Page break handling for long documents */
        .resume-section {
            break-inside: avoid;
            page-break-inside: avoid;
        }

        .job-position {
            break-inside: avoid;
            page-break-inside: avoid;
        }

        /* Print styles */
        @media print {
            .resume-container {
                box-shadow: none;
                padding: 0.5in;
                max-height: none;
                height: auto;
            }
        }

        /* Work Experience Job Positions Styling */
        .job-position {
            margin-bottom: 1.5rem;
            padding-bottom: 1rem;
            border-bottom: 1px solid #e5e7eb;
        }

        .job-position:last-child {
            border-bottom: none;
        }

        .job-header {
            margin-bottom: 0.75rem;
        }

        .job-title {
            font-size: ${fontSize.h2};
            font-weight: 600;
            color: ${colors.primary};
            margin: 0 0 0.25rem 0;
        }

        .company-info {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            margin-bottom: 0.25rem;
        }

        .company {
            font-weight: 500;
            color: ${colors.secondary};
        }

        .location {
            color: ${colors.accent};
            font-style: italic;
        }

        .job-dates {
            color: ${colors.accent};
            font-size: 0.9em;
            font-weight: 500;
        }

        .job-content {
            margin-left: 0;
        }

        .responsibilities {
            margin: 0.5rem 0;
            padding-left: 1.2rem;
        }

        .responsibilities li {
            margin-bottom: 0.3rem;
            color: ${colors.text};
        }

        /* Modern Template Styles */
        .modern-template .resume-header {
            background: linear-gradient(135deg, ${colors.primary}, ${colors.secondary});
            color: white;
            padding: 2rem;
            border-radius: 8px;
            margin-bottom: 2rem;
        }

        .modern-template .name {
            font-size: ${fontSize.h1};
            font-weight: 700;
            margin: 0 0 1rem 0;
            text-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }

        .modern-template .contact-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 0.5rem;
        }

        .modern-template .contact-item {
            background: rgba(255,255,255,0.2);
            padding: 0.5rem;
            border-radius: 4px;
            font-size: 0.9em;
        }

        .modern-template .section-title {
            color: ${colors.primary};
            font-size: ${fontSize.h2};
            font-weight: 600;
            margin: 2rem 0 1rem 0;
            padding-bottom: 0.5rem;
            border-bottom: 2px solid ${colors.accent};
        }

        /* Classic Template Styles */
        .classic-template .classic-header {
            text-align: center;
            margin-bottom: 2rem;
        }

        .classic-template .header-line {
            height: 2px;
            background: ${colors.primary};
            margin: 1rem 0;
        }

        .classic-template .name {
            font-size: ${fontSize.h1};
            font-weight: 700;
            margin: 1rem 0;
            text-transform: uppercase;
            letter-spacing: 2px;
        }

        .classic-template .contact-line {
            font-size: 0.9em;
            color: ${colors.secondary};
        }

        .classic-template .section-title {
            background: ${colors.primary};
            color: white;
            padding: 0.5rem 1rem;
            font-size: ${fontSize.h2};
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        /* Creative Template Styles */
        .creative-template .creative-header {
            position: relative;
            background: ${colors.light};
            padding: 3rem;
            border-radius: 20px;
            margin-bottom: 2rem;
            overflow: hidden;
        }

        .creative-template .header-shape {
            position: absolute;
            top: -50px;
            right: -50px;
            width: 200px;
            height: 200px;
            background: ${colors.accent};
            border-radius: 50%;
            opacity: 0.3;
        }

        .creative-template .creative-name {
            font-size: ${fontSize.h1};
            color: ${colors.primary};
            margin-bottom: 1rem;
            position: relative;
            z-index: 2;
        }

        .creative-template .contact-bubble {
            display: inline-block;
            background: ${colors.primary};
            color: white;
            padding: 0.5rem 1rem;
            margin: 0.25rem;
            border-radius: 25px;
            font-size: 0.9em;
        }

        .creative-template .creative-section-title {
            color: ${colors.primary};
            font-size: ${fontSize.h2};
            margin-bottom: 1rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        /* Professional Template Styles */
        .professional-template .professional-header {
            border-left: 5px solid ${colors.primary};
            padding-left: 2rem;
            margin-bottom: 2rem;
        }

        .professional-template .header-bar {
            height: 4px;
            background: ${colors.primary};
            margin-bottom: 1rem;
        }

        .professional-template .professional-name {
            font-size: ${fontSize.h1};
            color: ${colors.primary};
            margin-bottom: 0.5rem;
        }

        .professional-template .professional-section-title {
            color: ${colors.secondary};
            font-size: ${fontSize.h2};
            font-weight: 600;
            margin-bottom: 0.5rem;
        }

        .professional-template .section-underline {
            height: 1px;
            background: ${colors.accent};
            margin-bottom: 1rem;
        }

        /* Minimalist Template Styles */
        .minimalist-template {
            font-family: 'Georgia', serif;
        }

        .minimalist-template .minimalist-name {
            font-size: ${fontSize.h1};
            font-weight: 300;
            color: ${colors.text};
            margin-bottom: 0.5rem;
            border-bottom: 1px solid ${colors.accent};
            padding-bottom: 0.5rem;
        }

        .minimalist-template .minimalist-contact {
            font-size: 0.9em;
            color: ${colors.secondary};
            margin-bottom: 2rem;
        }

        .minimalist-template .minimalist-title {
            font-size: ${fontSize.h2};
            font-weight: 400;
            color: ${colors.text};
            margin: 2rem 0 1rem 0;
        }

        /* Executive Template Styles */
        .executive-template .executive-header {
            border: 2px solid ${colors.primary};
            padding: 2rem;
            margin-bottom: 2rem;
        }

        .executive-template .executive-name {
            font-size: ${fontSize.h1};
            font-weight: 700;
            color: ${colors.primary};
            text-align: center;
            margin-bottom: 0.5rem;
        }

        .executive-template .executive-title {
            text-align: center;
            font-style: italic;
            color: ${colors.secondary};
            margin-bottom: 1rem;
        }

        .executive-template .contact-table {
            width: 100%;
            font-size: 0.9em;
        }

        .executive-template .contact-table td {
            padding: 0.25rem 1rem;
            border-right: 1px solid ${colors.accent};
        }

        .executive-template .executive-section-title {
            background: ${colors.primary};
            color: white;
            padding: 0.75rem 1.5rem;
            font-size: ${fontSize.h2};
            font-weight: 600;
            margin: 2rem 0 1rem 0;
        }

        /* Layout Styles */
        .two-column-layout {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 2rem;
        }

        [data-layout="sidebar"] .resume-main {
            display: grid;
            grid-template-columns: 300px 1fr;
            gap: 2rem;
        }

        /* Content Formatting */
        .section-content ul {
            padding-left: 1.5rem;
            margin: 1rem 0;
        }

        .section-content li {
            margin-bottom: 0.5rem;
        }

        .section-content .date {
            color: ${colors.accent};
            font-weight: 600;
            font-size: 0.9em;
        }

        .section-content .location {
            color: ${colors.secondary};
            font-style: italic;
        }

        .section-content .company {
            color: ${colors.primary};
            font-weight: 600;
        }

        .section-content .job-title {
            color: ${colors.secondary};
            font-weight: 600;
        }

        /* Responsive Design */
        @media (max-width: 768px) {
            .resume-container {
                padding: 1rem;
            }

            .two-column-layout {
                grid-template-columns: 1fr;
            }

            [data-layout="sidebar"] .resume-main {
                grid-template-columns: 1fr;
            }
        }

        /* Multi-page support */
        @page {
            size: 8.5in 11in;
            margin: 0.5in;
        }

        .resume-container {
            page-break-inside: avoid;
        }

        .job-position {
            page-break-inside: avoid;
            break-inside: avoid;
        }

        .resume-section {
            page-break-inside: avoid;
            break-inside: avoid;
        }

        /* Print Styles */
        @media print {
            .resume-container {
                box-shadow: none;
                padding: 0;
                min-height: auto;
                max-width: none;
                width: 100%;
            }

            .modern-template .resume-header {
                background: ${colors.primary} !important;
                -webkit-print-color-adjust: exact;
                color-adjust: exact;
            }

            .job-position {
                page-break-inside: avoid;
            }

            .section-title {
                page-break-after: avoid;
            }
        }

        /* Ensure content flows naturally */
        .resume-main {
            overflow: visible;
            height: auto;
        }

        .section-content {
            overflow: visible;
            height: auto;
        }

        /* Enhanced template preview styling */
        .resume-template-preview {
            background: #f5f5f5;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .resume-template-preview .resume-container {
            background: white;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
            margin-bottom: 20px;
        }

        /* Multi-page visual separation */
        .resume-section {
            margin-bottom: 2rem;
        }

        .resume-section:last-child {
            margin-bottom: 0;
        }
        `;
    }

    private generatePlainText(parsedResume: ParsedResume, options: TemplateOptions): string {
        const contact = parsedResume.contact;
        let text = '';

        // Name and contact
        text += `${parsedResume.name}\n`;
        text += '='.repeat(parsedResume.name.length) + '\n\n';

        const contactItems = Object.values(contact).filter(v => v);
        if (contactItems.length > 0) {
            text += contactItems.join(' | ') + '\n\n';
        }

        // Sections
        parsedResume.sections.forEach(section => {
            text += `${section.title.toUpperCase()}\n`;
            text += '-'.repeat(section.title.length) + '\n';
            text += section.content + '\n\n';
        });

        return text;
    }

    private generatePreview(parsedResume: ParsedResume, options: TemplateOptions): string {
        return `
        <div class="resume-preview ${options.style}-preview">
            <div class="preview-header">
                <strong>${parsedResume.name}</strong>
            </div>
            <div class="preview-sections">
                ${parsedResume.sections.slice(0, 3).map(section =>
                    `<div class="preview-section">${section.title}</div>`
                ).join('')}
                ${parsedResume.sections.length > 3 ? '<div class="preview-more">+ more sections</div>' : ''}
            </div>
        </div>
        `;
    }

    // Get available template options
    getTemplateOptions(): { styles: TemplateStyle[]; colorSchemes: string[]; layouts: string[] } {
        return {
            styles: ['modern', 'classic', 'creative', 'professional', 'minimalist', 'executive'],
            colorSchemes: Object.keys(this.colorSchemes),
            layouts: ['single-column', 'two-column', 'sidebar']
        };
    }

    // Preview a template style
    previewTemplate(style: TemplateStyle): { name: string; description: string; preview: string } {
        const templates = {
            modern: {
                name: 'Modern',
                description: 'Clean, contemporary design with gradient headers and modern typography',
                preview: '🎨 Gradient header, modern typography, clean sections'
            },
            classic: {
                name: 'Classic',
                description: 'Traditional professional format with clean lines and standard typography',
                preview: '📋 Traditional format, clean lines, professional appearance'
            },
            creative: {
                name: 'Creative',
                description: 'Eye-catching design with visual elements and unique layout',
                preview: '🎯 Creative shapes, visual elements, unique layout'
            },
            professional: {
                name: 'Professional',
                description: 'Corporate-style template perfect for business environments',
                preview: '💼 Corporate design, structured layout, business-focused'
            },
            minimalist: {
                name: 'Minimalist',
                description: 'Simple, clean design focusing on content with minimal visual elements',
                preview: '⚪ Clean typography, minimal design, content-focused'
            },
            executive: {
                name: 'Executive',
                description: 'Formal, high-level template for senior positions and executives',
                preview: '👔 Formal letterhead, executive styling, premium appearance'
            }
        };

        return templates[style];
    }
}

export default new ResumeTemplateEngine();
export type { TemplateOptions, TemplateResult, TemplateStyle };