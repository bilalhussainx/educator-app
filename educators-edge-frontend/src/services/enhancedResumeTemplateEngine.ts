/**
 * Enhanced Resume Template Engine
 * Preserves original document formatting using Azure Vision analysis results
 * Generates templates that maintain exact structure, bullet points, and visual hierarchy
 */

import type { DocumentStructureResult, DocumentElement, DocumentSection } from './azureVisionDocumentStructureService';

export interface TemplateStyle {
    fontSize: number;
    fontWeight: string;
    fontStyle: string;
    fontFamily: string;
    color: string;
    lineHeight: number;
    marginTop: number;
    marginBottom: number;
    alignment: 'left' | 'center' | 'right';
    textDecoration?: string;
}

export interface TemplateSection {
    id: string;
    title: string;
    type: string;
    content: TemplateContent[];
    originalFormatting: {
        titleStyle: TemplateStyle;
        contentSpacing: number;
        alignment: string;
        indentLevel: number;
    };
}

export interface TemplateContent {
    id: string;
    type: 'text' | 'bullet' | 'job-header' | 'date-range' | 'company' | 'contact-info';
    text: string;
    style: TemplateStyle;
    bulletType?: string;
    indentLevel?: number;
    hierarchy?: number;
}

export interface TemplatePersonalInfo {
    name?: TemplateContent;
    email?: TemplateContent;
    phone?: TemplateContent;
    address?: TemplateContent;
    linkedin?: TemplateContent;
    website?: TemplateContent;
}

export interface ResumeTemplate {
    id: string;
    name: string;
    originalDocument: {
        filename: string;
        pageCount: number;
        layoutType: string;
        overallStyle: string;
    };
    pageLayout: {
        margins: { top: number; right: number; bottom: number; left: number };
        pageSize: { width: number; height: number };
        columnLayout: 'single' | 'two-column' | 'multi-column';
        lineSpacing: number;
    };
    fontHierarchy: Array<{
        level: number;
        fontSize: number;
        fontWeight: string;
        fontStyle: string;
        usage: string;
        elements: string[];
    }>;
    personalInfo: TemplatePersonalInfo;
    sections: TemplateSection[];
    globalStyles: {
        defaultFont: string;
        headingColor: string;
        textColor: string;
        accentColor?: string;
        bulletStyle: string;
    };
    cssStylesheet: string;
    htmlTemplate: string;
    preservationMetadata: {
        analysisId: string;
        confidence: number;
        qualityScore: number;
        createdAt: string;
        azureModelsUsed: string[];
    };
}

class EnhancedResumeTemplateEngine {

    /**
     * Generate a template from Azure Vision analysis results
     */
    async generateTemplate(
        analysisResult: DocumentStructureResult,
        analysisId: string,
        originalFilename: string
    ): Promise<ResumeTemplate> {

        console.log('🎨 Generating enhanced resume template...');

        // Convert document elements to template content
        const personalInfo = this.convertPersonalInfo(analysisResult.personalInfo);
        const sections = this.convertSections(analysisResult.sections);
        const fontHierarchy = this.extractFontHierarchy(analysisResult.sections, analysisResult.personalInfo);
        const pageLayout = this.extractPageLayout(analysisResult);
        const globalStyles = this.extractGlobalStyles(analysisResult);

        // Generate CSS stylesheet
        const cssStylesheet = this.generateCSS(fontHierarchy, pageLayout, globalStyles, sections);

        // Generate HTML template
        const htmlTemplate = this.generateHTML(personalInfo, sections, fontHierarchy);

        const template: ResumeTemplate = {
            id: `template_${Date.now()}`,
            name: `Template for ${originalFilename}`,
            originalDocument: {
                filename: originalFilename,
                pageCount: analysisResult.documentInfo.pageCount,
                layoutType: analysisResult.documentInfo.layoutType,
                overallStyle: analysisResult.documentInfo.overallStyle
            },
            pageLayout,
            fontHierarchy,
            personalInfo,
            sections,
            globalStyles,
            cssStylesheet,
            htmlTemplate,
            preservationMetadata: {
                analysisId,
                confidence: analysisResult.metadata.confidence,
                qualityScore: analysisResult.metadata.qualityScore,
                createdAt: new Date().toISOString(),
                azureModelsUsed: analysisResult.metadata.azureModelsUsed
            }
        };

        console.log('✅ Template generated successfully:', {
            sections: sections.length,
            fontLevels: fontHierarchy.length,
            cssLines: cssStylesheet.split('\n').length,
            htmlLines: htmlTemplate.split('\n').length
        });

        return template;
    }

    /**
     * Convert Azure Vision personal info to template format
     */
    private convertPersonalInfo(personalInfo: DocumentStructureResult['personalInfo']): TemplatePersonalInfo {
        const templatePersonalInfo: TemplatePersonalInfo = {};

        if (personalInfo.name) {
            templatePersonalInfo.name = this.convertElementToTemplateContent(personalInfo.name, 'text');
        }

        if (personalInfo.email) {
            templatePersonalInfo.email = this.convertElementToTemplateContent(personalInfo.email, 'contact-info');
        }

        if (personalInfo.phone) {
            templatePersonalInfo.phone = this.convertElementToTemplateContent(personalInfo.phone, 'contact-info');
        }

        if (personalInfo.address) {
            templatePersonalInfo.address = this.convertElementToTemplateContent(personalInfo.address, 'contact-info');
        }

        if (personalInfo.linkedin) {
            templatePersonalInfo.linkedin = this.convertElementToTemplateContent(personalInfo.linkedin, 'contact-info');
        }

        if (personalInfo.website) {
            templatePersonalInfo.website = this.convertElementToTemplateContent(personalInfo.website, 'contact-info');
        }

        return templatePersonalInfo;
    }

    /**
     * Convert Azure Vision sections to template format
     */
    private convertSections(sections: DocumentSection[]): TemplateSection[] {
        return sections.map(section => {
            const content = section.elements.map(element =>
                this.convertElementToTemplateContent(element, this.determineContentType(element))
            );

            return {
                id: section.id,
                title: section.title,
                type: section.type,
                content,
                originalFormatting: {
                    titleStyle: this.convertFormattingToStyle(section.titleElement.formatting),
                    contentSpacing: section.originalFormat?.sectionSpacing || 12,
                    alignment: section.originalFormat?.alignment || 'left',
                    indentLevel: 0
                }
            };
        });
    }

    /**
     * Convert document element to template content
     */
    private convertElementToTemplateContent(
        element: DocumentElement,
        contentType: TemplateContent['type']
    ): TemplateContent {
        return {
            id: element.id,
            type: contentType,
            text: element.text,
            style: this.convertFormattingToStyle(element.formatting),
            bulletType: element.type === 'bullet-point' ? this.extractBulletType(element.text) : undefined,
            indentLevel: element.spatialRelations?.indentLevel || 0,
            hierarchy: element.hierarchy?.level || 5
        };
    }

    /**
     * Convert Azure formatting to template style
     */
    private convertFormattingToStyle(formatting: DocumentElement['formatting']): TemplateStyle {
        return {
            fontSize: formatting.fontSize,
            fontWeight: formatting.fontWeight.toString(),
            fontStyle: formatting.fontStyle,
            fontFamily: formatting.fontFamily || 'Arial, sans-serif',
            color: formatting.color || '#000000',
            lineHeight: formatting.lineHeight,
            marginTop: formatting.marginTop,
            marginBottom: formatting.marginBottom,
            alignment: formatting.alignment,
            textDecoration: formatting.isUnderlined ? 'underline' : undefined
        };
    }

    /**
     * Determine content type from element
     */
    private determineContentType(element: DocumentElement): TemplateContent['type'] {
        switch (element.type) {
            case 'bullet-point':
                return 'bullet';
            case 'job-title':
                return 'job-header';
            case 'date':
                return 'date-range';
            case 'company':
                return 'company';
            case 'contact-info':
                return 'contact-info';
            default:
                return 'text';
        }
    }

    /**
     * Extract bullet type from text
     */
    private extractBulletType(text: string): string {
        if (text.startsWith('•')) return 'disc';
        if (text.startsWith('◦')) return 'circle';
        if (text.startsWith('▪')) return 'square';
        if (text.startsWith('-')) return 'dash';
        if (/^\d+\./.test(text)) return 'decimal';
        return 'disc';
    }

    /**
     * Extract font hierarchy from document analysis
     */
    private extractFontHierarchy(
        sections: DocumentSection[],
        personalInfo: DocumentStructureResult['personalInfo']
    ): ResumeTemplate['fontHierarchy'] {
        const allElements: DocumentElement[] = [];

        // Collect all elements
        if (personalInfo.name) allElements.push(personalInfo.name);
        Object.values(personalInfo).forEach(info => {
            if (info) allElements.push(info);
        });

        sections.forEach(section => {
            allElements.push(section.titleElement);
            allElements.push(...section.elements);
        });

        // Group by font size and create hierarchy
        const fontSizeGroups = new Map<number, DocumentElement[]>();
        allElements.forEach(element => {
            const fontSize = element.formatting.fontSize;
            if (!fontSizeGroups.has(fontSize)) {
                fontSizeGroups.set(fontSize, []);
            }
            fontSizeGroups.get(fontSize)!.push(element);
        });

        // Sort by font size (largest first) and create hierarchy levels
        const sortedSizes = Array.from(fontSizeGroups.keys()).sort((a, b) => b - a);

        return sortedSizes.map((fontSize, index) => {
            const elements = fontSizeGroups.get(fontSize)!;
            const firstElement = elements[0];

            return {
                level: index + 1,
                fontSize,
                fontWeight: firstElement.formatting.fontWeight.toString(),
                fontStyle: firstElement.formatting.fontStyle,
                usage: this.describeFontUsage(elements),
                elements: elements.map(el => el.id)
            };
        });
    }

    /**
     * Describe font usage based on element types
     */
    private describeFontUsage(elements: DocumentElement[]): string {
        const types = [...new Set(elements.map(el => el.type))];

        if (types.includes('title')) return 'Main titles and headings';
        if (types.includes('section-header')) return 'Section headers';
        if (types.includes('job-title')) return 'Job titles and positions';
        if (types.includes('company')) return 'Company names';
        if (types.includes('contact-info')) return 'Contact information';
        return 'Body text and content';
    }

    /**
     * Extract page layout information
     */
    private extractPageLayout(analysisResult: DocumentStructureResult): ResumeTemplate['pageLayout'] {
        return {
            margins: analysisResult.originalLayout.margins,
            pageSize: { width: 612, height: 792 }, // Standard letter size in points
            columnLayout: analysisResult.documentInfo.layoutType as any,
            lineSpacing: analysisResult.originalLayout.lineSpacing
        };
    }

    /**
     * Extract global styles
     */
    private extractGlobalStyles(analysisResult: DocumentStructureResult): ResumeTemplate['globalStyles'] {
        // Find most common font family
        const fontFamilies = analysisResult.originalLayout.fontHierarchy.map(f => 'Arial'); // Simplified
        const defaultFont = fontFamilies[0] || 'Arial, sans-serif';

        return {
            defaultFont,
            headingColor: '#000000',
            textColor: '#000000',
            bulletStyle: 'disc'
        };
    }

    /**
     * Generate CSS stylesheet
     */
    private generateCSS(
        fontHierarchy: ResumeTemplate['fontHierarchy'],
        pageLayout: ResumeTemplate['pageLayout'],
        globalStyles: ResumeTemplate['globalStyles'],
        sections: TemplateSection[]
    ): string {
        let css = `/* Enhanced Resume Template - Generated from Azure Vision Analysis */\n\n`;

        // Page layout
        css += `body {\n`;
        css += `  font-family: ${globalStyles.defaultFont};\n`;
        css += `  color: ${globalStyles.textColor};\n`;
        css += `  line-height: ${pageLayout.lineSpacing / 12};\n`;
        css += `  margin: 0;\n`;
        css += `  padding: 0;\n`;
        css += `}\n\n`;

        css += `.resume-container {\n`;
        css += `  max-width: ${pageLayout.pageSize.width}pt;\n`;
        css += `  margin: 0 auto;\n`;
        css += `  padding: ${pageLayout.margins.top}pt ${pageLayout.margins.right}pt ${pageLayout.margins.bottom}pt ${pageLayout.margins.left}pt;\n`;
        css += `  background: white;\n`;
        css += `}\n\n`;

        // Font hierarchy styles
        fontHierarchy.forEach(font => {
            css += `.font-level-${font.level} {\n`;
            css += `  font-size: ${font.fontSize}pt;\n`;
            css += `  font-weight: ${font.fontWeight};\n`;
            css += `  font-style: ${font.fontStyle};\n`;
            css += `  /* ${font.usage} */\n`;
            css += `}\n\n`;
        });

        // Section styles
        sections.forEach(section => {
            css += `.section-${section.type} {\n`;
            css += `  margin-bottom: ${section.originalFormatting.contentSpacing}pt;\n`;
            css += `  text-align: ${section.originalFormatting.alignment};\n`;
            css += `}\n\n`;

            css += `.section-${section.type} .section-title {\n`;
            css += `  font-size: ${section.originalFormatting.titleStyle.fontSize}pt;\n`;
            css += `  font-weight: ${section.originalFormatting.titleStyle.fontWeight};\n`;
            css += `  font-style: ${section.originalFormatting.titleStyle.fontStyle};\n`;
            css += `  color: ${section.originalFormatting.titleStyle.color};\n`;
            css += `  margin-bottom: ${section.originalFormatting.titleStyle.marginBottom}pt;\n`;
            css += `}\n\n`;
        });

        // Bullet point styles
        css += `.bullet-list {\n`;
        css += `  list-style-type: ${globalStyles.bulletStyle};\n`;
        css += `  margin: 0;\n`;
        css += `  padding-left: 20pt;\n`;
        css += `}\n\n`;

        css += `.bullet-item {\n`;
        css += `  margin-bottom: 4pt;\n`;
        css += `}\n\n`;

        // Indent levels
        for (let i = 1; i <= 5; i++) {
            css += `.indent-level-${i} {\n`;
            css += `  margin-left: ${i * 20}pt;\n`;
            css += `}\n\n`;
        }

        // Contact info styles
        css += `.contact-info {\n`;
        css += `  display: flex;\n`;
        css += `  flex-wrap: wrap;\n`;
        css += `  gap: 10pt;\n`;
        css += `  margin-bottom: 20pt;\n`;
        css += `}\n\n`;

        css += `.contact-item {\n`;
        css += `  text-decoration: none;\n`;
        css += `  color: inherit;\n`;
        css += `}\n\n`;

        return css;
    }

    /**
     * Generate HTML template
     */
    private generateHTML(
        personalInfo: TemplatePersonalInfo,
        sections: TemplateSection[],
        fontHierarchy: ResumeTemplate['fontHierarchy']
    ): string {
        let html = `<!DOCTYPE html>\n<html lang="en">\n<head>\n`;
        html += `  <meta charset="UTF-8">\n`;
        html += `  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n`;
        html += `  <title>Resume Template</title>\n`;
        html += `  <style>{{STYLESHEET}}</style>\n`;
        html += `</head>\n<body>\n\n`;

        html += `<div class="resume-container">\n`;

        // Personal information section
        if (personalInfo.name || personalInfo.email || personalInfo.phone) {
            html += `  <!-- Personal Information -->\n`;

            if (personalInfo.name) {
                const fontLevel = this.getFontLevel(personalInfo.name.style.fontSize, fontHierarchy);
                html += `  <div class="personal-name font-level-${fontLevel}">\n`;
                html += `    {{NAME}}\n`;
                html += `  </div>\n\n`;
            }

            html += `  <div class="contact-info">\n`;
            if (personalInfo.email) {
                html += `    <div class="contact-item">{{EMAIL}}</div>\n`;
            }
            if (personalInfo.phone) {
                html += `    <div class="contact-item">{{PHONE}}</div>\n`;
            }
            if (personalInfo.address) {
                html += `    <div class="contact-item">{{ADDRESS}}</div>\n`;
            }
            if (personalInfo.linkedin) {
                html += `    <div class="contact-item">{{LINKEDIN}}</div>\n`;
            }
            if (personalInfo.website) {
                html += `    <div class="contact-item">{{WEBSITE}}</div>\n`;
            }
            html += `  </div>\n\n`;
        }

        // Sections
        sections.forEach(section => {
            html += `  <!-- ${section.title} Section -->\n`;
            html += `  <div class="section-${section.type}">\n`;

            const titleFontLevel = this.getFontLevel(section.originalFormatting.titleStyle.fontSize, fontHierarchy);
            html += `    <div class="section-title font-level-${titleFontLevel}">{{SECTION_${section.type.toUpperCase()}_TITLE}}</div>\n`;

            // Group content by type
            const bulletPoints = section.content.filter(c => c.type === 'bullet');
            const textContent = section.content.filter(c => c.type === 'text');
            const jobHeaders = section.content.filter(c => c.type === 'job-header');

            if (jobHeaders.length > 0) {
                jobHeaders.forEach((job, index) => {
                    const jobFontLevel = this.getFontLevel(job.style.fontSize, fontHierarchy);
                    html += `    <div class="job-entry">\n`;
                    html += `      <div class="job-title font-level-${jobFontLevel}">{{JOB_TITLE_${index + 1}}}</div>\n`;
                    html += `      <div class="job-details">{{JOB_DETAILS_${index + 1}}}</div>\n`;
                    html += `    </div>\n`;
                });
            }

            if (bulletPoints.length > 0) {
                html += `    <ul class="bullet-list">\n`;
                bulletPoints.forEach((bullet, index) => {
                    const indentClass = bullet.indentLevel ? `indent-level-${bullet.indentLevel}` : '';
                    html += `      <li class="bullet-item ${indentClass}">{{BULLET_${section.type.toUpperCase()}_${index + 1}}}</li>\n`;
                });
                html += `    </ul>\n`;
            }

            if (textContent.length > 0) {
                textContent.forEach((text, index) => {
                    const textFontLevel = this.getFontLevel(text.style.fontSize, fontHierarchy);
                    html += `    <div class="text-content font-level-${textFontLevel}">{{TEXT_${section.type.toUpperCase()}_${index + 1}}}</div>\n`;
                });
            }

            html += `  </div>\n\n`;
        });

        html += `</div>\n\n</body>\n</html>`;

        return html;
    }

    /**
     * Get font level based on font size
     */
    private getFontLevel(fontSize: number, fontHierarchy: ResumeTemplate['fontHierarchy']): number {
        const matchingLevel = fontHierarchy.find(level => level.fontSize === fontSize);
        return matchingLevel?.level || fontHierarchy.length;
    }

    /**
     * Apply template with user data
     */
    async applyTemplate(
        template: ResumeTemplate,
        userData: Record<string, any>
    ): Promise<{ html: string; css: string }> {

        console.log('🎨 Applying template with user data...');

        let html = template.htmlTemplate;
        let css = template.cssStylesheet;

        // Replace placeholders with user data
        Object.keys(userData).forEach(key => {
            const placeholder = `{{${key.toUpperCase()}}}`;
            const value = userData[key] || '';
            html = html.replace(new RegExp(placeholder, 'g'), value);
        });

        // Replace CSS placeholder
        html = html.replace('{{STYLESHEET}}', css);

        console.log('✅ Template applied successfully');

        return { html, css };
    }

    /**
     * Generate editable template for user customization
     */
    async generateEditableTemplate(template: ResumeTemplate): Promise<{
        structure: any;
        placeholders: Record<string, string>;
        styleOptions: any;
    }> {

        const placeholders: Record<string, string> = {};

        // Generate placeholders for personal info
        if (template.personalInfo.name) {
            placeholders['NAME'] = template.personalInfo.name.text || 'Your Name';
        }
        if (template.personalInfo.email) {
            placeholders['EMAIL'] = template.personalInfo.email.text || 'your.email@example.com';
        }
        if (template.personalInfo.phone) {
            placeholders['PHONE'] = template.personalInfo.phone.text || '(555) 123-4567';
        }

        // Generate section placeholders
        template.sections.forEach(section => {
            const sectionKey = section.type.toUpperCase();
            placeholders[`SECTION_${sectionKey}_TITLE`] = section.title;

            section.content.forEach((content, index) => {
                if (content.type === 'bullet') {
                    placeholders[`BULLET_${sectionKey}_${index + 1}`] = content.text || 'Bullet point content';
                } else if (content.type === 'text') {
                    placeholders[`TEXT_${sectionKey}_${index + 1}`] = content.text || 'Text content';
                } else if (content.type === 'job-header') {
                    placeholders[`JOB_TITLE_${index + 1}`] = content.text || 'Job Title';
                }
            });
        });

        const structure = {
            personalInfo: template.personalInfo,
            sections: template.sections.map(section => ({
                id: section.id,
                title: section.title,
                type: section.type,
                contentCount: section.content.length,
                formatting: section.originalFormatting
            })),
            fontHierarchy: template.fontHierarchy,
            pageLayout: template.pageLayout
        };

        const styleOptions = {
            fonts: template.fontHierarchy.map(f => f.fontSize),
            colors: [template.globalStyles.headingColor, template.globalStyles.textColor],
            margins: template.pageLayout.margins,
            spacing: template.pageLayout.lineSpacing
        };

        return { structure, placeholders, styleOptions };
    }
}

export default new EnhancedResumeTemplateEngine();
export type { ResumeTemplate, TemplateSection, TemplateContent, TemplatePersonalInfo, TemplateStyle };