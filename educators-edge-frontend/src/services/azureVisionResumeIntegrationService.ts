/**
 * Azure Vision Resume Integration Service
 * Bridges Azure Document Intelligence vision detection results with resume template formatting
 * Preserves position titles, bold text, bullet points, and document structure
 */

import {
    DocumentStructureResult,
    DocumentElement,
    BulletPointStructure,
    DocumentSection
} from './azureVisionDocumentStructureService';
import { RevolutionaryResumeFormatterAPI, DocumentAnalysis, FormattedResumeTemplate } from './revolutionaryResumeFormatterAPI';

export interface VisionPreservedElement {
    id: string;
    text: string;
    type: DocumentElement['type'];
    formatting: {
        isBold: boolean;
        isItalic: boolean;
        fontSize: number;
        fontWeight: string;
        isJobTitle: boolean;
        isCompanyName: boolean;
        isSectionHeader: boolean;
    };
    position: {
        x: number;
        y: number;
        width: number;
        height: number;
        page: number;
    };
    hierarchyLevel: number;
    confidence: number;
}

export interface VisionPreservedBullet {
    id: string;
    text: string;
    cleanedText: string;
    bulletType: '•' | '◦' | '▪' | '▫' | '■' | '□' | '★' | '☆' | '-' | 'numbered';
    indentLevel: number;
    originalFormatting: DocumentElement['formatting'];
    sectionId: string;
    parentBulletId?: string;
    confidence: number;
}

export interface VisionPreservedSection {
    id: string;
    title: string;
    type: DocumentSection['type'];
    elements: VisionPreservedElement[];
    bullets: VisionPreservedBullet[];
    originalFormatting: {
        titleFormatting: DocumentElement['formatting'];
        spacing: number;
        alignment: string;
    };
    boundingBox: DocumentSection['boundingBox'];
}

export interface VisionIntegratedTemplate {
    name: string;
    html: string;
    css: string;
    preservationStats: {
        jobTitlesPreserved: number;
        boldElementsApplied: number;
        bulletsPreserved: number;
        sectionsStructured: number;
        originalFormattingApplied: number;
    };
    improvements: string[];
    qualityScore: number;
}

export interface VisionIntegrationResult {
    success: boolean;
    preservedElements: VisionPreservedElement[];
    preservedBullets: VisionPreservedBullet[];
    preservedSections: VisionPreservedSection[];
    integratedTemplates: VisionIntegratedTemplate[];
    originalStructure: DocumentStructureResult;
    preservationReport: {
        totalElementsDetected: number;
        elementsPreserved: number;
        formattingAccuracy: number;
        structuralIntegrity: number;
        recommendations: string[];
    };
    error?: string;
}

class AzureVisionResumeIntegrationService {
    private formatterAPI: RevolutionaryResumeFormatterAPI;

    constructor() {
        this.formatterAPI = new RevolutionaryResumeFormatterAPI();
    }

    /**
     * Main integration method - takes Azure Vision results and creates formatted templates
     * while preserving all detected formatting and structure
     */
    async integrateVisionWithTemplates(visionResult: DocumentStructureResult): Promise<VisionIntegrationResult> {
        console.log('🔗 AZURE VISION RESUME INTEGRATION - Starting integration...');

        if (!visionResult.success || !visionResult.sections.length) {
            return {
                success: false,
                error: 'Invalid or empty Azure Vision results',
                preservedElements: [],
                preservedBullets: [],
                preservedSections: [],
                integratedTemplates: [],
                originalStructure: visionResult,
                preservationReport: {
                    totalElementsDetected: 0,
                    elementsPreserved: 0,
                    formattingAccuracy: 0,
                    structuralIntegrity: 0,
                    recommendations: ['Retry document analysis with Azure Vision']
                }
            };
        }

        try {
            // Step 1: Extract and preserve all elements with their formatting
            const preservedElements = this.extractVisionElements(visionResult);
            console.log(`📋 Extracted ${preservedElements.length} vision elements`);

            // Step 2: Preserve bullet points with hierarchy and formatting
            const preservedBullets = this.extractVisionBullets(visionResult);
            console.log(`🔹 Extracted ${preservedBullets.length} vision bullets`);

            // Step 3: Structure sections with preserved formatting
            const preservedSections = this.structureVisionSections(visionResult, preservedElements, preservedBullets);
            console.log(`📑 Structured ${preservedSections.length} vision sections`);

            // Step 4: Create integrated document analysis for formatter API
            const integratedAnalysis = this.createIntegratedAnalysis(preservedElements, preservedBullets, preservedSections, visionResult);

            // Step 5: Generate templates with vision-preserved formatting
            const integratedTemplates = await this.generateVisionIntegratedTemplates(integratedAnalysis, visionResult);
            console.log(`🎨 Generated ${integratedTemplates.length} vision-integrated templates`);

            // Step 6: Calculate preservation metrics
            const preservationReport = this.calculatePreservationMetrics(visionResult, preservedElements, preservedBullets, preservedSections);

            const result: VisionIntegrationResult = {
                success: true,
                preservedElements,
                preservedBullets,
                preservedSections,
                integratedTemplates,
                originalStructure: visionResult,
                preservationReport
            };

            console.log('✅ VISION INTEGRATION COMPLETE:', {
                elementsPreserved: preservedElements.length,
                bulletsPreserved: preservedBullets.length,
                sectionsStructured: preservedSections.length,
                templatesGenerated: integratedTemplates.length,
                formattingAccuracy: `${Math.round(preservationReport.formattingAccuracy * 100)}%`
            });

            return result;

        } catch (error) {
            console.error('❌ Vision integration failed:', error);
            return {
                success: false,
                error: error.message,
                preservedElements: [],
                preservedBullets: [],
                preservedSections: [],
                integratedTemplates: [],
                originalStructure: visionResult,
                preservationReport: {
                    totalElementsDetected: 0,
                    elementsPreserved: 0,
                    formattingAccuracy: 0,
                    structuralIntegrity: 0,
                    recommendations: ['Check error logs and retry']
                }
            };
        }
    }

    /**
     * Extract elements from Azure Vision results with preserved formatting
     */
    private extractVisionElements(visionResult: DocumentStructureResult): VisionPreservedElement[] {
        console.log('📋 Extracting vision elements with formatting preservation...');

        const elements: VisionPreservedElement[] = [];

        // Extract from sections first to maintain structure
        visionResult.sections.forEach(section => {
            // Add section title as preserved element
            if (section.titleElement) {
                elements.push({
                    id: `title_${section.id}`,
                    text: section.titleElement.text,
                    type: section.titleElement.type,
                    formatting: {
                        isBold: section.titleElement.formatting.isBold,
                        isItalic: section.titleElement.formatting.isItalic,
                        fontSize: section.titleElement.formatting.fontSize,
                        fontWeight: section.titleElement.formatting.fontWeight.toString(),
                        isJobTitle: false,
                        isCompanyName: false,
                        isSectionHeader: true
                    },
                    position: {
                        x: section.titleElement.boundingBox.x,
                        y: section.titleElement.boundingBox.y,
                        width: section.titleElement.boundingBox.width,
                        height: section.titleElement.boundingBox.height,
                        page: section.titleElement.boundingBox.page
                    },
                    hierarchyLevel: section.titleElement.hierarchy.level,
                    confidence: section.titleElement.confidence
                });
            }

            // Add section elements with type classification
            section.elements.forEach(element => {
                const isJobTitle = this.classifyAsJobTitle(element, section);
                const isCompanyName = this.classifyAsCompanyName(element, section);

                elements.push({
                    id: element.id,
                    text: element.text,
                    type: element.type,
                    formatting: {
                        isBold: element.formatting.isBold,
                        isItalic: element.formatting.isItalic,
                        fontSize: element.formatting.fontSize,
                        fontWeight: element.formatting.fontWeight.toString(),
                        isJobTitle,
                        isCompanyName,
                        isSectionHeader: element.type === 'section-header'
                    },
                    position: {
                        x: element.boundingBox.x,
                        y: element.boundingBox.y,
                        width: element.boundingBox.width,
                        height: element.boundingBox.height,
                        page: element.boundingBox.page
                    },
                    hierarchyLevel: element.hierarchy.level,
                    confidence: element.confidence
                });
            });
        });

        // Also extract personal info elements
        Object.values(visionResult.personalInfo).forEach(element => {
            if (element) {
                elements.push({
                    id: `personal_${element.id}`,
                    text: element.text,
                    type: element.type,
                    formatting: {
                        isBold: element.formatting.isBold,
                        isItalic: element.formatting.isItalic,
                        fontSize: element.formatting.fontSize,
                        fontWeight: element.formatting.fontWeight.toString(),
                        isJobTitle: false,
                        isCompanyName: false,
                        isSectionHeader: false
                    },
                    position: {
                        x: element.boundingBox.x,
                        y: element.boundingBox.y,
                        width: element.boundingBox.width,
                        height: element.boundingBox.height,
                        page: element.boundingBox.page
                    },
                    hierarchyLevel: element.hierarchy.level,
                    confidence: element.confidence
                });
            }
        });

        console.log(`✅ Extracted ${elements.length} vision elements`);
        return elements;
    }

    /**
     * Extract bullet points from Azure Vision results with hierarchy preservation
     */
    private extractVisionBullets(visionResult: DocumentStructureResult): VisionPreservedBullet[] {
        console.log('🔹 Extracting vision bullets with hierarchy preservation...');

        const bullets: VisionPreservedBullet[] = [];

        visionResult.bulletPoints.forEach(bulletStructure => {
            bulletStructure.elements.forEach(element => {
                const cleanedText = this.cleanBulletText(element.text, bulletStructure.bulletType);

                bullets.push({
                    id: element.id,
                    text: element.text,
                    cleanedText,
                    bulletType: bulletStructure.bulletType,
                    indentLevel: bulletStructure.indentLevel,
                    originalFormatting: element.formatting,
                    sectionId: this.findElementSection(element, visionResult.sections),
                    parentBulletId: bulletStructure.parentBullet,
                    confidence: element.confidence
                });
            });
        });

        console.log(`✅ Extracted ${bullets.length} vision bullets`);
        return bullets;
    }

    /**
     * Structure sections with preserved formatting and elements
     */
    private structureVisionSections(
        visionResult: DocumentStructureResult,
        preservedElements: VisionPreservedElement[],
        preservedBullets: VisionPreservedBullet[]
    ): VisionPreservedSection[] {
        console.log('📑 Structuring vision sections...');

        const sections: VisionPreservedSection[] = [];

        visionResult.sections.forEach(section => {
            // Get elements for this section
            const sectionElements = preservedElements.filter(element =>
                element.id.includes(section.id) ||
                this.isElementInSection(element, section)
            );

            // Get bullets for this section
            const sectionBullets = preservedBullets.filter(bullet =>
                bullet.sectionId === section.id
            );

            sections.push({
                id: section.id,
                title: section.title,
                type: section.type,
                elements: sectionElements,
                bullets: sectionBullets,
                originalFormatting: {
                    titleFormatting: section.originalFormat.titleFormatting,
                    spacing: section.originalFormat.sectionSpacing,
                    alignment: section.originalFormat.alignment
                },
                boundingBox: section.boundingBox
            });
        });

        console.log(`✅ Structured ${sections.length} vision sections`);
        return sections;
    }

    /**
     * Create integrated analysis for the formatter API
     */
    private createIntegratedAnalysis(
        preservedElements: VisionPreservedElement[],
        preservedBullets: VisionPreservedBullet[],
        preservedSections: VisionPreservedSection[],
        visionResult: DocumentStructureResult
    ): DocumentAnalysis {
        console.log('🔄 Creating integrated analysis for formatter API...');

        // Convert preserved elements to formatter API format
        const bullets = preservedBullets.map(bullet => ({
            line: 0, // Will be calculated
            originalText: bullet.text,
            cleanedText: bullet.cleanedText,
            bulletType: this.mapBulletType(bullet.bulletType),
            section: this.findSectionTitle(bullet.sectionId, preservedSections)
        }));

        const boldText = preservedElements
            .filter(element => element.formatting.isBold || element.formatting.isJobTitle)
            .map(element => ({
                text: element.text,
                type: element.formatting.isSectionHeader ? 'section' as const :
                      element.formatting.isJobTitle ? 'emphasis' as const :
                      element.type === 'title' ? 'name' as const : 'header' as const,
                confidence: element.confidence
            }));

        const sections = preservedSections.map(section => ({
            title: section.title,
            content: section.elements.map(el => el.text),
            type: this.mapSectionType(section.type),
            bullets: bullets.filter(bullet => bullet.section.includes(section.title))
        }));

        const contactInfo = this.extractContactInfoFromElements(preservedElements);
        const dates = this.extractDatesFromElements(preservedElements);

        const confidence = {
            overall: Math.min(0.95, visionResult.metadata.confidence),
            formatting: bullets.length > 0 ? 0.9 : 0.7,
            structure: sections.length > 2 ? 0.9 : 0.6
        };

        return {
            rawContent: this.reconstructRawContent(preservedElements, preservedBullets),
            detectedElements: {
                bullets,
                boldText,
                sections,
                contactInfo,
                dates
            },
            confidence
        };
    }

    /**
     * Generate vision-integrated templates with preserved formatting
     */
    private async generateVisionIntegratedTemplates(
        integratedAnalysis: DocumentAnalysis,
        visionResult: DocumentStructureResult
    ): Promise<VisionIntegratedTemplate[]> {
        console.log('🎨 Generating vision-integrated templates...');

        const templates: VisionIntegratedTemplate[] = [];
        const styleVariations = ['professional', 'modern', 'creative'] as const;

        for (const style of styleVariations) {
            try {
                // Use formatter API with integrated analysis
                const formattedTemplate = this.formatterAPI.formatToResumeTemplate(integratedAnalysis, style);

                // Enhance with vision-specific formatting
                const enhancedHTML = this.enhanceWithVisionFormatting(formattedTemplate.html, visionResult);
                const enhancedCSS = this.enhanceWithVisionCSS(formattedTemplate.css, visionResult);

                // Calculate preservation stats
                const preservationStats = this.calculateTemplatePreservationStats(formattedTemplate, visionResult);

                templates.push({
                    name: `Vision-Enhanced ${formattedTemplate.name}`,
                    html: enhancedHTML,
                    css: enhancedCSS,
                    preservationStats,
                    improvements: [
                        ...formattedTemplate.improvements,
                        `🔍 Azure Vision: ${visionResult.documentInfo.totalElements} elements analyzed`,
                        `📋 Structure: ${visionResult.sections.length} sections preserved`,
                        `🔹 Bullets: ${visionResult.bulletPoints.length} bullet structures maintained`,
                        `📝 Bold text: ${this.countBoldElements(visionResult)} elements emphasized`,
                        `💼 Job titles: ${this.countJobTitles(visionResult)} positions highlighted`
                    ],
                    qualityScore: this.calculateTemplateQuality(formattedTemplate, visionResult)
                });

            } catch (error) {
                console.error(`❌ Failed to generate ${style} template:`, error);
            }
        }

        console.log(`✅ Generated ${templates.length} vision-integrated templates`);
        return templates;
    }

    /**
     * Enhance HTML with vision-specific formatting
     */
    private enhanceWithVisionFormatting(html: string, visionResult: DocumentStructureResult): string {
        let enhancedHTML = html;

        // Apply section-specific formatting based on vision analysis
        visionResult.sections.forEach(section => {
            if (section.titleElement) {
                const titleStyle = this.generateTitleStyle(section.titleElement);
                enhancedHTML = enhancedHTML.replace(
                    new RegExp(`<h2 class="section-title">${section.title}</h2>`, 'gi'),
                    `<h2 class="section-title vision-preserved-title" style="${titleStyle}">${section.title}</h2>`
                );
            }
        });

        // Apply bullet formatting based on vision hierarchy
        visionResult.bulletPoints.forEach(bulletStructure => {
            bulletStructure.elements.forEach(element => {
                const bulletStyle = this.generateBulletStyle(element, bulletStructure);
                const cleanedText = this.cleanBulletText(element.text, bulletStructure.bulletType);

                enhancedHTML = enhancedHTML.replace(
                    new RegExp(`<li class="bullet-item">${cleanedText}</li>`, 'gi'),
                    `<li class="bullet-item vision-preserved-bullet" style="${bulletStyle}" data-indent="${bulletStructure.indentLevel}">${cleanedText}</li>`
                );
            });
        });

        // Apply job title formatting
        this.findJobTitles(visionResult).forEach(jobTitle => {
            const jobTitleStyle = this.generateJobTitleStyle(jobTitle);
            enhancedHTML = enhancedHTML.replace(
                new RegExp(jobTitle.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'),
                `<span class="vision-preserved-job-title" style="${jobTitleStyle}">${jobTitle.text}</span>`
            );
        });

        return enhancedHTML;
    }

    /**
     * Enhance CSS with vision-specific styles
     */
    private enhanceWithVisionCSS(css: string, visionResult: DocumentStructureResult): string {
        const visionEnhancements = `
        /* Azure Vision Enhanced Styles */
        .vision-preserved-title {
            font-size: ${this.getAverageTitleFontSize(visionResult)}pt !important;
            font-weight: ${this.getAverageTitleWeight(visionResult)} !important;
            margin-top: ${this.getAverageSpacing(visionResult)}px !important;
        }

        .vision-preserved-bullet {
            margin-left: calc(var(--indent-level, 0) * 20px);
            font-size: ${this.getAverageBulletFontSize(visionResult)}pt;
        }

        .vision-preserved-job-title {
            font-weight: bold !important;
            color: #2c3e50 !important;
            font-size: ${this.getAverageJobTitleFontSize(visionResult)}pt !important;
        }

        /* Preserve original layout characteristics */
        .revolutionary-resume {
            margin: ${visionResult.originalLayout.margins.top}px ${visionResult.originalLayout.margins.right}px ${visionResult.originalLayout.margins.bottom}px ${visionResult.originalLayout.margins.left}px;
            line-height: ${visionResult.originalLayout.lineSpacing}px;
        }

        /* Font hierarchy preservation */
        ${visionResult.originalLayout.fontHierarchy.map((font, index) => `
        .font-hierarchy-${font.level} {
            font-size: ${font.fontSize}pt;
            font-weight: ${font.fontWeight};
        }
        `).join('\n')}
        `;

        return css + visionEnhancements;
    }

    // Helper methods for classification and formatting

    private classifyAsJobTitle(element: DocumentElement, section: DocumentSection): boolean {
        if (section.type !== 'experience') return false;

        const jobTitlePatterns = [
            /\b(manager|director|analyst|engineer|developer|designer|specialist|coordinator|assistant|supervisor|executive|officer|representative|associate|technician|lead|senior|junior|principal|chief|facilitator|administrator)\b/i
        ];

        return jobTitlePatterns.some(pattern => pattern.test(element.text)) ||
               (element.formatting.isBold && element.type === 'job-title');
    }

    private classifyAsCompanyName(element: DocumentElement, section: DocumentSection): boolean {
        if (section.type !== 'experience') return false;

        const companyPatterns = [
            /(inc\.|llc|corp\.|ltd\.|company|corporation|industries|solutions|systems|technologies|group|associates)$/i,
            /\b(school|university|college|institute|academy)\b/i
        ];

        return companyPatterns.some(pattern => pattern.test(element.text)) ||
               (element.type === 'company');
    }

    private cleanBulletText(text: string, bulletType: BulletPointStructure['bulletType']): string {
        const bulletChars = ['•', '◦', '▪', '▫', '■', '□', '★', '☆', '-'];
        let cleaned = text.trim();

        // Remove bullet characters
        bulletChars.forEach(char => {
            if (cleaned.startsWith(char)) {
                cleaned = cleaned.substring(1).trim();
            }
        });

        // Remove numbered list prefixes
        cleaned = cleaned.replace(/^\d+\.\s*/, '');

        return cleaned;
    }

    private findElementSection(element: DocumentElement, sections: DocumentSection[]): string {
        for (const section of sections) {
            if (section.elements.some(el => el.id === element.id)) {
                return section.id;
            }
        }
        return 'unknown';
    }

    private isElementInSection(element: VisionPreservedElement, section: DocumentSection): boolean {
        return element.position.y >= section.boundingBox.y &&
               element.position.y <= section.boundingBox.y + section.boundingBox.height &&
               element.position.page === section.boundingBox.page;
    }

    private mapBulletType(bulletType: string): 'unicode' | 'dash' | 'asterisk' | 'numbered' {
        if (bulletType === 'numbered') return 'numbered';
        if (bulletType === '-') return 'dash';
        if (bulletType === '*') return 'asterisk';
        return 'unicode';
    }

    private mapSectionType(type: DocumentSection['type']): 'header' | 'summary' | 'experience' | 'education' | 'skills' | 'contact' {
        const mapping: Record<DocumentSection['type'], 'header' | 'summary' | 'experience' | 'education' | 'skills' | 'contact'> = {
            'personal-info': 'contact',
            'summary': 'summary',
            'experience': 'experience',
            'education': 'education',
            'skills': 'skills',
            'projects': 'experience',
            'certifications': 'education',
            'awards': 'experience',
            'other': 'header'
        };
        return mapping[type] || 'header';
    }

    private findSectionTitle(sectionId: string, sections: VisionPreservedSection[]): string {
        const section = sections.find(s => s.id === sectionId);
        return section?.title || 'UNKNOWN';
    }

    private extractContactInfoFromElements(elements: VisionPreservedElement[]): any {
        const contactInfo: any = {};

        elements.forEach(element => {
            if (element.type === 'contact-info') {
                const text = element.text;
                if (text.includes('@')) {
                    contactInfo.email = text;
                } else if (/\d{3}[-.]?\d{3}[-.]?\d{4}/.test(text)) {
                    contactInfo.phone = text;
                } else if (text.includes('linkedin')) {
                    contactInfo.linkedin = text;
                }
            } else if (element.type === 'title' && element.hierarchyLevel === 1) {
                contactInfo.name = element.text;
            }
        });

        return contactInfo;
    }

    private extractDatesFromElements(elements: VisionPreservedElement[]): any[] {
        return elements
            .filter(element => element.type === 'date')
            .map(element => ({
                text: element.text,
                startYear: this.extractYear(element.text),
                isCurrent: /present|current|now/i.test(element.text)
            }));
    }

    private extractYear(text: string): number | undefined {
        const yearMatch = text.match(/\b(19|20)\d{2}\b/);
        return yearMatch ? parseInt(yearMatch[0]) : undefined;
    }

    private reconstructRawContent(elements: VisionPreservedElement[], bullets: VisionPreservedBullet[]): string {
        // Sort elements by position
        const sortedElements = [...elements].sort((a, b) => {
            if (a.position.page !== b.position.page) return a.position.page - b.position.page;
            if (Math.abs(a.position.y - b.position.y) > 5) return a.position.y - b.position.y;
            return a.position.x - b.position.x;
        });

        return sortedElements.map(el => el.text).join('\n');
    }

    private generateTitleStyle(titleElement: DocumentElement): string {
        return `font-size: ${titleElement.formatting.fontSize}pt; font-weight: ${titleElement.formatting.fontWeight}; text-align: ${titleElement.formatting.alignment};`;
    }

    private generateBulletStyle(element: DocumentElement, bulletStructure: BulletPointStructure): string {
        return `margin-left: ${bulletStructure.indentLevel * 20}px; font-size: ${element.formatting.fontSize}pt;`;
    }

    private generateJobTitleStyle(element: DocumentElement): string {
        return `font-size: ${element.formatting.fontSize}pt; font-weight: bold;`;
    }

    private findJobTitles(visionResult: DocumentStructureResult): DocumentElement[] {
        const jobTitles: DocumentElement[] = [];

        visionResult.sections.forEach(section => {
            if (section.type === 'experience') {
                section.elements.forEach(element => {
                    if (this.classifyAsJobTitle(element, section)) {
                        jobTitles.push(element);
                    }
                });
            }
        });

        return jobTitles;
    }

    private getAverageTitleFontSize(visionResult: DocumentStructureResult): number {
        const titleElements = visionResult.sections.map(s => s.titleElement).filter(Boolean);
        if (titleElements.length === 0) return 16;

        const avgSize = titleElements.reduce((sum, el) => sum + el.formatting.fontSize, 0) / titleElements.length;
        return Math.round(avgSize);
    }

    private getAverageTitleWeight(visionResult: DocumentStructureResult): string {
        const titleElements = visionResult.sections.map(s => s.titleElement).filter(Boolean);
        const boldCount = titleElements.filter(el => el.formatting.isBold).length;
        return boldCount > titleElements.length / 2 ? 'bold' : 'normal';
    }

    private getAverageSpacing(visionResult: DocumentStructureResult): number {
        const spacings = visionResult.sections.map(s => s.originalFormat.sectionSpacing);
        return spacings.length > 0 ? Math.round(spacings.reduce((a, b) => a + b) / spacings.length) : 15;
    }

    private getAverageBulletFontSize(visionResult: DocumentStructureResult): number {
        const bulletElements = visionResult.bulletPoints.flatMap(bp => bp.elements);
        if (bulletElements.length === 0) return 12;

        const avgSize = bulletElements.reduce((sum, el) => sum + el.formatting.fontSize, 0) / bulletElements.length;
        return Math.round(avgSize);
    }

    private getAverageJobTitleFontSize(visionResult: DocumentStructureResult): number {
        const jobTitles = this.findJobTitles(visionResult);
        if (jobTitles.length === 0) return 14;

        const avgSize = jobTitles.reduce((sum, el) => sum + el.formatting.fontSize, 0) / jobTitles.length;
        return Math.round(avgSize);
    }

    private calculateTemplatePreservationStats(template: FormattedResumeTemplate, visionResult: DocumentStructureResult): VisionIntegratedTemplate['preservationStats'] {
        return {
            jobTitlesPreserved: this.findJobTitles(visionResult).length,
            boldElementsApplied: this.countBoldElements(visionResult),
            bulletsPreserved: visionResult.bulletPoints.length,
            sectionsStructured: visionResult.sections.length,
            originalFormattingApplied: template.detectionStats.boldElementsDetected + template.detectionStats.bulletsDetected
        };
    }

    private countBoldElements(visionResult: DocumentStructureResult): number {
        let count = 0;
        visionResult.sections.forEach(section => {
            count += section.elements.filter(el => el.formatting.isBold).length;
            if (section.titleElement?.formatting.isBold) count++;
        });
        return count;
    }

    private countJobTitles(visionResult: DocumentStructureResult): number {
        return this.findJobTitles(visionResult).length;
    }

    private calculateTemplateQuality(template: FormattedResumeTemplate, visionResult: DocumentStructureResult): number {
        let score = 0;

        // Base quality from formatter
        score += template.detectionStats.confidenceScore * 0.4;

        // Vision integration bonus
        if (visionResult.bulletPoints.length > 0) score += 20;
        if (this.countJobTitles(visionResult) > 0) score += 20;
        if (this.countBoldElements(visionResult) > 0) score += 15;
        if (visionResult.sections.length >= 3) score += 10;

        // Azure confidence bonus
        score += visionResult.metadata.confidence * 5;

        return Math.min(100, Math.round(score));
    }

    private calculatePreservationMetrics(
        visionResult: DocumentStructureResult,
        preservedElements: VisionPreservedElement[],
        preservedBullets: VisionPreservedBullet[],
        preservedSections: VisionPreservedSection[]
    ): VisionIntegrationResult['preservationReport'] {
        const totalDetected = visionResult.documentInfo.totalElements;
        const totalPreserved = preservedElements.length + preservedBullets.length;

        const formattingAccuracy = Math.min(1, totalPreserved / totalDetected);
        const structuralIntegrity = Math.min(1, preservedSections.length / Math.max(1, visionResult.sections.length));

        const recommendations: string[] = [];
        if (formattingAccuracy < 0.8) recommendations.push('Consider improving document quality for better detection');
        if (structuralIntegrity < 0.8) recommendations.push('Review section detection and structure');
        if (preservedBullets.length === 0) recommendations.push('Check bullet point formatting in original document');
        if (this.countJobTitles(visionResult) === 0) recommendations.push('Ensure job titles are clearly formatted');

        return {
            totalElementsDetected: totalDetected,
            elementsPreserved: totalPreserved,
            formattingAccuracy,
            structuralIntegrity,
            recommendations
        };
    }
}

// Create singleton instance
const azureVisionResumeIntegrationService = new AzureVisionResumeIntegrationService();

export default azureVisionResumeIntegrationService;
export {
    AzureVisionResumeIntegrationService,
    type VisionPreservedElement,
    type VisionPreservedBullet,
    type VisionPreservedSection,
    type VisionIntegratedTemplate,
    type VisionIntegrationResult
};