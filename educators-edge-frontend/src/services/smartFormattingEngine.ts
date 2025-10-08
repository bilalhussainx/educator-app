/**
 * Smart Formatting Engine - Revolutionary Resume System
 * Intelligent section detection, hierarchy preservation, and layout integrity
 * Maintains proper emphasis for job titles, company names, and formatting structure
 */

import { EnhancedDocumentElement } from './enhancedAzureVisionService';
import { ResumeTemplate } from './resumeFormatAuthenticationSystem';

export interface SectionDefinition {
    id: string;
    name: string;
    type: 'contact' | 'summary' | 'experience' | 'education' | 'skills' | 'projects' | 'certifications' | 'awards' | 'publications' | 'references' | 'other';
    keywords: string[];
    aliases: string[];
    priority: number; // 1-10, higher = more important
    expectedPosition: 'header' | 'early' | 'middle' | 'late' | 'footer';
    requiredFields: string[];
    optionalFields: string[];
    structure: {
        allowsSubsections: boolean;
        allowsBulletPoints: boolean;
        allowsNestedItems: boolean;
        maxDepth: number;
    };
}

export interface HierarchyLevel {
    level: number; // 1 = main title, 2 = section header, 3 = subsection, 4 = item, 5 = sub-item
    name: string;
    description: string;
    typicalFontSize: number;
    typicalFontWeight: 'normal' | 'bold' | 'bolder';
    typicalSpacing: { top: number; bottom: number; };
    indicators: string[]; // Visual indicators that suggest this level
}

export interface BulletStyle {
    symbol: string;
    unicode: string;
    level: number;
    category: 'primary' | 'secondary' | 'tertiary';
    atsCompatible: boolean;
    description: string;
}

export interface FormattedSection {
    definition: SectionDefinition;
    elements: EnhancedDocumentElement[];
    subsections: FormattedSection[];
    hierarchy: {
        headers: EnhancedDocumentElement[];
        items: EnhancedDocumentElement[];
        bullets: EnhancedDocumentElement[];
        metadata: EnhancedDocumentElement[];
    };
    structure: {
        boundingBox: { x: number; y: number; width: number; height: number; };
        spacing: { top: number; bottom: number; internal: number; };
        alignment: 'left' | 'center' | 'right' | 'justify';
        consistency: number; // 0-100
    };
    content: {
        jobTitles: string[];
        companies: string[];
        dates: string[];
        achievements: string[];
        skills: string[];
        keywords: string[];
    };
    quality: {
        completeness: number; // 0-100
        formatting: number; // 0-100
        hierarchy: number; // 0-100
        bulletConsistency: number; // 0-100
    };
}

export interface LayoutPreservation {
    originalSpacing: Map<string, { top: number; bottom: number; left: number; right: number; }>;
    alignmentGroups: Map<string, EnhancedDocumentElement[]>;
    visualHierarchy: Map<number, EnhancedDocumentElement[]>;
    bulletPointGroups: Map<string, EnhancedDocumentElement[]>;
    fontClusters: Map<string, EnhancedDocumentElement[]>;
}

export interface SmartFormattingResult {
    success: boolean;
    sections: FormattedSection[];
    layoutPreservation: LayoutPreservation;
    hierarchy: {
        levels: HierarchyLevel[];
        mapping: Map<string, number>; // element id -> hierarchy level
        consistency: number; // 0-100
    };
    bulletIntelligence: {
        styles: BulletStyle[];
        groups: Map<string, EnhancedDocumentElement[]>;
        consistency: number; // 0-100
        recommendations: string[];
    };
    quality: {
        overall: number; // 0-100
        sectionDetection: number;
        hierarchyPreservation: number;
        bulletConsistency: number;
        layoutIntegrity: number;
    };
    metadata: {
        processingTime: number;
        sectionsDetected: number;
        elementsProcessed: number;
        hierarchyLevels: number;
        bulletStyles: number;
        improvements: string[];
    };
}

class SmartFormattingEngine {
    private sectionDefinitions: Map<string, SectionDefinition> = new Map();
    private hierarchyLevels: HierarchyLevel[] = [];
    private bulletStyles: BulletStyle[] = [];

    constructor() {
        this.initializeSectionDefinitions();
        this.initializeHierarchyLevels();
        this.initializeBulletStyles();
    }

    /**
     * Main processing method - intelligent formatting with section detection
     */
    async processDocument(
        elements: EnhancedDocumentElement[],
        template?: ResumeTemplate
    ): Promise<SmartFormattingResult> {
        console.log('🧠 Starting Smart Formatting Engine processing...');
        const startTime = Date.now();

        try {
            // Step 1: Detect and classify sections
            console.log('🔍 Step 1: Detecting sections...');
            const detectedSections = await this.detectSections(elements);
            console.log(`📂 Detected ${detectedSections.length} sections`);

            // Step 2: Preserve layout and spacing
            console.log('📐 Step 2: Preserving layout...');
            const layoutPreservation = await this.preserveLayout(elements);

            // Step 3: Analyze and preserve hierarchy
            console.log('🏗️ Step 3: Analyzing hierarchy...');
            const hierarchyAnalysis = await this.analyzeHierarchy(elements, detectedSections);

            // Step 4: Intelligent bullet point processing
            console.log('🔹 Step 4: Processing bullet points...');
            const bulletIntelligence = await this.processBulletPoints(elements, detectedSections);

            // Step 5: Format sections with structure preservation
            console.log('🎨 Step 5: Formatting sections...');
            const formattedSections = await this.formatSections(
                detectedSections,
                elements,
                hierarchyAnalysis,
                bulletIntelligence,
                template
            );

            // Step 6: Calculate quality metrics
            console.log('📊 Step 6: Calculating quality metrics...');
            const quality = this.calculateQualityMetrics(
                formattedSections,
                hierarchyAnalysis,
                bulletIntelligence,
                layoutPreservation
            );

            const processingTime = Date.now() - startTime;
            console.log(`✅ Smart Formatting Engine completed in ${processingTime}ms`);

            return {
                success: true,
                sections: formattedSections,
                layoutPreservation,
                hierarchy: hierarchyAnalysis,
                bulletIntelligence,
                quality,
                metadata: {
                    processingTime,
                    sectionsDetected: formattedSections.length,
                    elementsProcessed: elements.length,
                    hierarchyLevels: hierarchyAnalysis.levels.length,
                    bulletStyles: bulletIntelligence.styles.length,
                    improvements: []
                }
            };

        } catch (error) {
            console.error('❌ Smart Formatting Engine processing failed:', error);
            return this.createErrorResult(error);
        }
    }

    /**
     * Step 1: Intelligent section detection
     */
    private async detectSections(elements: EnhancedDocumentElement[]): Promise<EnhancedDocumentElement[][]> {
        console.log('🔍 Detecting document sections...');

        const sections: EnhancedDocumentElement[][] = [];
        let currentSection: EnhancedDocumentElement[] = [];
        let lastSectionHeader: EnhancedDocumentElement | null = null;

        for (const element of elements) {
            // Check if this element is a section header
            if (this.isSectionHeader(element)) {
                // Save previous section if it exists
                if (currentSection.length > 0) {
                    sections.push([...currentSection]);
                }

                // Start new section
                currentSection = [element];
                lastSectionHeader = element;

                console.log(`📂 Detected section: "${element.text}"`);
            } else {
                // Add to current section
                currentSection.push(element);
            }
        }

        // Don't forget the last section
        if (currentSection.length > 0) {
            sections.push(currentSection);
        }

        console.log(`✅ Detected ${sections.length} sections total`);
        return sections;
    }

    /**
     * Step 2: Preserve original layout and spacing
     */
    private async preserveLayout(elements: EnhancedDocumentElement[]): Promise<LayoutPreservation> {
        console.log('📐 Preserving original layout...');

        const originalSpacing = new Map<string, { top: number; bottom: number; left: number; right: number; }>();
        const alignmentGroups = new Map<string, EnhancedDocumentElement[]>();
        const visualHierarchy = new Map<number, EnhancedDocumentElement[]>();
        const bulletPointGroups = new Map<string, EnhancedDocumentElement[]>();
        const fontClusters = new Map<string, EnhancedDocumentElement[]>();

        // Preserve spacing for each element
        elements.forEach(element => {
            originalSpacing.set(element.id, {
                top: element.formatting.marginTop,
                bottom: element.formatting.marginBottom,
                left: element.spatialRelations.indentLevel * 20, // Convert indent to pixels
                right: 0 // Default right margin
            });

            // Group by alignment
            const alignment = element.formatting.alignment;
            if (!alignmentGroups.has(alignment)) {
                alignmentGroups.set(alignment, []);
            }
            alignmentGroups.get(alignment)!.push(element);

            // Group by hierarchy level
            const level = element.hierarchy.level;
            if (!visualHierarchy.has(level)) {
                visualHierarchy.set(level, []);
            }
            visualHierarchy.get(level)!.push(element);

            // Group bullet points
            if (element.type === 'bullet-point') {
                const bulletStyle = element.spatialRelations.bulletStyle || 'default';
                if (!bulletPointGroups.has(bulletStyle)) {
                    bulletPointGroups.set(bulletStyle, []);
                }
                bulletPointGroups.get(bulletStyle)!.push(element);
            }

            // Group by font characteristics
            const fontKey = `${element.formatting.fontFamily}_${element.formatting.fontSize}_${element.formatting.fontWeight}`;
            if (!fontClusters.has(fontKey)) {
                fontClusters.set(fontKey, []);
            }
            fontClusters.get(fontKey)!.push(element);
        });

        console.log(`📐 Preserved layout for ${elements.length} elements`);
        console.log(`   Alignment groups: ${alignmentGroups.size}`);
        console.log(`   Hierarchy levels: ${visualHierarchy.size}`);
        console.log(`   Bullet point groups: ${bulletPointGroups.size}`);
        console.log(`   Font clusters: ${fontClusters.size}`);

        return {
            originalSpacing,
            alignmentGroups,
            visualHierarchy,
            bulletPointGroups,
            fontClusters
        };
    }

    /**
     * Step 3: Analyze and preserve hierarchy
     */
    private async analyzeHierarchy(
        elements: EnhancedDocumentElement[],
        sections: EnhancedDocumentElement[][]
    ): Promise<SmartFormattingResult['hierarchy']> {
        console.log('🏗️ Analyzing document hierarchy...');

        const mapping = new Map<string, number>();
        let consistency = 0;

        // Analyze font sizes and styles to determine hierarchy
        const fontSizes = elements.map(e => e.formatting.fontSize).filter(Boolean);
        const uniqueSizes = [...new Set(fontSizes)].sort((a, b) => b - a);

        // Map font sizes to hierarchy levels
        elements.forEach(element => {
            let level = 3; // Default body level

            if (element.type === 'name') {
                level = 1; // Name is top level
            } else if (element.type === 'section-header') {
                level = 2; // Section headers
            } else if (element.formatting.fontWeight === 'bold' && element.formatting.fontSize > 12) {
                level = 2; // Large bold text = headers
            } else if (element.formatting.fontWeight === 'bold') {
                level = 3; // Bold text = emphasis
            } else if (element.type === 'bullet-point') {
                level = 4; // Bullet points
            }

            mapping.set(element.id, level);
        });

        // Calculate consistency
        const levelCounts = new Map<number, number>();
        mapping.forEach(level => {
            levelCounts.set(level, (levelCounts.get(level) || 0) + 1);
        });

        // Consistency is based on how well levels are distributed
        const totalElements = elements.length;
        const levelVariance = Array.from(levelCounts.values())
            .map(count => Math.abs(count - totalElements / levelCounts.size))
            .reduce((sum, variance) => sum + variance, 0);

        consistency = Math.max(0, 100 - (levelVariance / totalElements) * 100);

        console.log(`🏗️ Hierarchy analysis complete:`);
        console.log(`   Levels detected: ${levelCounts.size}`);
        console.log(`   Consistency: ${Math.round(consistency)}%`);

        return {
            levels: this.hierarchyLevels,
            mapping,
            consistency
        };
    }

    /**
     * Step 4: Intelligent bullet point processing
     */
    private async processBulletPoints(
        elements: EnhancedDocumentElement[],
        sections: EnhancedDocumentElement[][]
    ): Promise<SmartFormattingResult['bulletIntelligence']> {
        console.log('🔹 Processing bullet points intelligently...');

        const bulletElements = elements.filter(e => e.type === 'bullet-point');
        const groups = new Map<string, EnhancedDocumentElement[]>();
        const detectedStyles: BulletStyle[] = [];
        const recommendations: string[] = [];

        // Group bullets by style
        bulletElements.forEach(bullet => {
            const style = this.detectBulletStyle(bullet.text);
            if (!groups.has(style.symbol)) {
                groups.set(style.symbol, []);
                detectedStyles.push(style);
            }
            groups.get(style.symbol)!.push(bullet);
        });

        // Calculate consistency
        let consistency = 100;
        if (detectedStyles.length > 3) {
            consistency = Math.max(50, 100 - (detectedStyles.length - 3) * 15);
            recommendations.push('Consider using fewer bullet point styles for better consistency');
        }

        // Check for ATS compatibility
        const nonATSStyles = detectedStyles.filter(style => !style.atsCompatible);
        if (nonATSStyles.length > 0) {
            consistency = Math.min(consistency, 75);
            recommendations.push('Some bullet styles may not be ATS-compatible');
        }

        console.log(`🔹 Bullet point analysis:`);
        console.log(`   Styles detected: ${detectedStyles.length}`);
        console.log(`   Total bullets: ${bulletElements.length}`);
        console.log(`   Consistency: ${Math.round(consistency)}%`);

        return {
            styles: detectedStyles,
            groups,
            consistency,
            recommendations
        };
    }

    /**
     * Step 5: Format sections with structure preservation
     */
    private async formatSections(
        sectionGroups: EnhancedDocumentElement[][],
        allElements: EnhancedDocumentElement[],
        hierarchyAnalysis: SmartFormattingResult['hierarchy'],
        bulletIntelligence: SmartFormattingResult['bulletIntelligence'],
        template?: ResumeTemplate
    ): Promise<FormattedSection[]> {
        console.log('🎨 Formatting sections with structure preservation...');

        const formattedSections: FormattedSection[] = [];

        for (const sectionElements of sectionGroups) {
            if (sectionElements.length === 0) continue;

            const headerElement = sectionElements[0];
            const definition = this.identifySectionType(headerElement.text);

            // Organize elements by hierarchy
            const hierarchy = {
                headers: sectionElements.filter(e => hierarchyAnalysis.mapping.get(e.id) === 2),
                items: sectionElements.filter(e => hierarchyAnalysis.mapping.get(e.id) === 3),
                bullets: sectionElements.filter(e => e.type === 'bullet-point'),
                metadata: sectionElements.filter(e => e.type === 'date' || e.type === 'contact')
            };

            // Extract content elements
            const content = this.extractContentElements(sectionElements, definition);

            // Calculate section structure
            const structure = this.calculateSectionStructure(sectionElements);

            // Calculate quality metrics
            const quality = this.calculateSectionQuality(sectionElements, definition, hierarchy);

            const formattedSection: FormattedSection = {
                definition,
                elements: sectionElements,
                subsections: [], // Could be expanded for nested sections
                hierarchy,
                structure,
                content,
                quality
            };

            formattedSections.push(formattedSection);
            console.log(`📂 Formatted section: ${definition.name} (${sectionElements.length} elements)`);
        }

        console.log(`✅ Formatted ${formattedSections.length} sections`);
        return formattedSections;
    }

    /**
     * Initialize section definitions
     */
    private initializeSectionDefinitions(): void {
        console.log('📋 Initializing section definitions...');

        const sections: SectionDefinition[] = [
            {
                id: 'contact',
                name: 'Contact Information',
                type: 'contact',
                keywords: ['contact', 'phone', 'email', 'address', 'linkedin'],
                aliases: ['contact info', 'personal info', 'contact details'],
                priority: 10,
                expectedPosition: 'header',
                requiredFields: ['name', 'email'],
                optionalFields: ['phone', 'address', 'linkedin', 'website'],
                structure: { allowsSubsections: false, allowsBulletPoints: false, allowsNestedItems: false, maxDepth: 1 }
            },
            {
                id: 'summary',
                name: 'Professional Summary',
                type: 'summary',
                keywords: ['summary', 'profile', 'objective', 'overview'],
                aliases: ['professional summary', 'career objective', 'profile summary'],
                priority: 9,
                expectedPosition: 'early',
                requiredFields: ['description'],
                optionalFields: ['goals', 'specializations'],
                structure: { allowsSubsections: false, allowsBulletPoints: true, allowsNestedItems: false, maxDepth: 2 }
            },
            {
                id: 'experience',
                name: 'Work Experience',
                type: 'experience',
                keywords: ['experience', 'employment', 'work', 'career', 'professional'],
                aliases: ['work experience', 'professional experience', 'employment history'],
                priority: 10,
                expectedPosition: 'early',
                requiredFields: ['jobTitle', 'company', 'dates'],
                optionalFields: ['achievements', 'responsibilities', 'technologies'],
                structure: { allowsSubsections: true, allowsBulletPoints: true, allowsNestedItems: true, maxDepth: 4 }
            },
            {
                id: 'education',
                name: 'Education',
                type: 'education',
                keywords: ['education', 'academic', 'degree', 'university', 'college'],
                aliases: ['educational background', 'academic background', 'qualifications'],
                priority: 8,
                expectedPosition: 'middle',
                requiredFields: ['institution', 'degree'],
                optionalFields: ['gpa', 'honors', 'coursework'],
                structure: { allowsSubsections: true, allowsBulletPoints: true, allowsNestedItems: false, maxDepth: 3 }
            },
            {
                id: 'skills',
                name: 'Skills',
                type: 'skills',
                keywords: ['skills', 'technical', 'competencies', 'expertise'],
                aliases: ['technical skills', 'core competencies', 'areas of expertise'],
                priority: 7,
                expectedPosition: 'middle',
                requiredFields: ['skillList'],
                optionalFields: ['categories', 'proficiencyLevels'],
                structure: { allowsSubsections: true, allowsBulletPoints: true, allowsNestedItems: true, maxDepth: 3 }
            }
        ];

        sections.forEach(section => {
            this.sectionDefinitions.set(section.id, section);
        });

        console.log(`✅ Initialized ${this.sectionDefinitions.size} section definitions`);
    }

    /**
     * Initialize hierarchy levels
     */
    private initializeHierarchyLevels(): void {
        this.hierarchyLevels = [
            {
                level: 1,
                name: 'Document Title',
                description: 'Main document title or name',
                typicalFontSize: 18,
                typicalFontWeight: 'bold',
                typicalSpacing: { top: 0, bottom: 16 },
                indicators: ['center-aligned', 'largest-font', 'top-of-document']
            },
            {
                level: 2,
                name: 'Section Header',
                description: 'Main section headers',
                typicalFontSize: 14,
                typicalFontWeight: 'bold',
                typicalSpacing: { top: 12, bottom: 6 },
                indicators: ['all-caps', 'underlined', 'bold', 'larger-font']
            },
            {
                level: 3,
                name: 'Subsection Header',
                description: 'Job titles, company names, institution names',
                typicalFontSize: 12,
                typicalFontWeight: 'bold',
                typicalSpacing: { top: 8, bottom: 4 },
                indicators: ['bold', 'italic', 'indented']
            },
            {
                level: 4,
                name: 'Content Item',
                description: 'Bullet points, regular content',
                typicalFontSize: 11,
                typicalFontWeight: 'normal',
                typicalSpacing: { top: 2, bottom: 2 },
                indicators: ['bullet-point', 'indented', 'normal-font']
            },
            {
                level: 5,
                name: 'Sub-item',
                description: 'Sub-bullet points, nested content',
                typicalFontSize: 10,
                typicalFontWeight: 'normal',
                typicalSpacing: { top: 1, bottom: 1 },
                indicators: ['double-indented', 'smaller-bullet', 'nested']
            }
        ];
    }

    /**
     * Initialize bullet styles
     */
    private initializeBulletStyles(): void {
        this.bulletStyles = [
            { symbol: '•', unicode: '\\u2022', level: 1, category: 'primary', atsCompatible: true, description: 'Standard bullet' },
            { symbol: '◦', unicode: '\\u25E6', level: 2, category: 'secondary', atsCompatible: true, description: 'Hollow bullet' },
            { symbol: '▪', unicode: '\\u25AA', level: 1, category: 'primary', atsCompatible: true, description: 'Small square' },
            { symbol: '▫', unicode: '\\u25AB', level: 2, category: 'secondary', atsCompatible: true, description: 'Small hollow square' },
            { symbol: '-', unicode: '-', level: 1, category: 'primary', atsCompatible: true, description: 'Hyphen' },
            { symbol: '*', unicode: '*', level: 1, category: 'primary', atsCompatible: true, description: 'Asterisk' },
            { symbol: '→', unicode: '\\u2192', level: 1, category: 'tertiary', atsCompatible: false, description: 'Right arrow' },
            { symbol: '✓', unicode: '\\u2713', level: 1, category: 'tertiary', atsCompatible: false, description: 'Check mark' }
        ];
    }

    // Helper methods

    private isSectionHeader(element: EnhancedDocumentElement): boolean {
        // Check if element looks like a section header
        const text = element.text.toLowerCase().trim();

        // Check against known section keywords
        for (const [_, definition] of this.sectionDefinitions) {
            if (definition.keywords.some(keyword => text.includes(keyword)) ||
                definition.aliases.some(alias => text.includes(alias.toLowerCase()))) {
                return true;
            }
        }

        // Check formatting indicators
        return element.formatting.fontWeight === 'bold' &&
               element.formatting.fontSize > 12 &&
               element.text.length < 50; // Headers are typically short
    }

    private identifySectionType(headerText: string): SectionDefinition {
        const text = headerText.toLowerCase().trim();

        for (const [_, definition] of this.sectionDefinitions) {
            if (definition.keywords.some(keyword => text.includes(keyword)) ||
                definition.aliases.some(alias => text.includes(alias.toLowerCase()))) {
                return definition;
            }
        }

        // Default to 'other' type
        return {
            id: 'other',
            name: 'Other',
            type: 'other',
            keywords: [],
            aliases: [],
            priority: 1,
            expectedPosition: 'middle',
            requiredFields: [],
            optionalFields: [],
            structure: { allowsSubsections: true, allowsBulletPoints: true, allowsNestedItems: true, maxDepth: 3 }
        };
    }

    private detectBulletStyle(text: string): BulletStyle {
        for (const style of this.bulletStyles) {
            if (text.trim().startsWith(style.symbol)) {
                return style;
            }
        }

        // Default bullet style
        return this.bulletStyles[0];
    }

    private extractContentElements(elements: EnhancedDocumentElement[], definition: SectionDefinition): FormattedSection['content'] {
        const content: FormattedSection['content'] = {
            jobTitles: [],
            companies: [],
            dates: [],
            achievements: [],
            skills: [],
            keywords: []
        };

        elements.forEach(element => {
            if (element.type === 'job-title') {
                content.jobTitles.push(element.text);
            } else if (element.type === 'company') {
                content.companies.push(element.text);
            } else if (element.type === 'date') {
                content.dates.push(element.text);
            } else if (element.type === 'bullet-point') {
                content.achievements.push(element.text);
            } else if (element.type === 'skill') {
                content.skills.push(element.text);
            }

            // Extract keywords based on section type
            definition.keywords.forEach(keyword => {
                if (element.text.toLowerCase().includes(keyword)) {
                    content.keywords.push(keyword);
                }
            });
        });

        return content;
    }

    private calculateSectionStructure(elements: EnhancedDocumentElement[]): FormattedSection['structure'] {
        if (elements.length === 0) {
            return {
                boundingBox: { x: 0, y: 0, width: 0, height: 0 },
                spacing: { top: 0, bottom: 0, internal: 0 },
                alignment: 'left',
                consistency: 0
            };
        }

        // Calculate bounding box
        const minX = Math.min(...elements.map(e => e.boundingBox.x));
        const minY = Math.min(...elements.map(e => e.boundingBox.y));
        const maxX = Math.max(...elements.map(e => e.boundingBox.x + e.boundingBox.width));
        const maxY = Math.max(...elements.map(e => e.boundingBox.y + e.boundingBox.height));

        // Calculate spacing
        const spacings = elements.map(e => e.formatting.marginTop + e.formatting.marginBottom);
        const avgSpacing = spacings.reduce((sum, spacing) => sum + spacing, 0) / spacings.length;

        // Determine primary alignment
        const alignments = elements.map(e => e.formatting.alignment);
        const alignmentCounts = alignments.reduce((acc, alignment) => {
            acc[alignment] = (acc[alignment] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        const primaryAlignment = Object.keys(alignmentCounts).reduce((a, b) =>
            alignmentCounts[a] > alignmentCounts[b] ? a : b
        ) as FormattedSection['structure']['alignment'];

        // Calculate consistency
        const fontSizes = elements.map(e => e.formatting.fontSize);
        const uniqueFontSizes = new Set(fontSizes);
        const consistency = Math.max(0, 100 - (uniqueFontSizes.size - 1) * 20);

        return {
            boundingBox: { x: minX, y: minY, width: maxX - minX, height: maxY - minY },
            spacing: { top: avgSpacing / 2, bottom: avgSpacing / 2, internal: avgSpacing },
            alignment: primaryAlignment,
            consistency
        };
    }

    private calculateSectionQuality(
        elements: EnhancedDocumentElement[],
        definition: SectionDefinition,
        hierarchy: FormattedSection['hierarchy']
    ): FormattedSection['quality'] {
        // Completeness based on required fields
        const hasRequiredElements = definition.requiredFields.length === 0 ? 100 :
            (definition.requiredFields.filter(field =>
                elements.some(e => e.type.includes(field.toLowerCase()))
            ).length / definition.requiredFields.length) * 100;

        // Formatting quality based on consistency
        const fontSizes = elements.map(e => e.formatting.fontSize);
        const fontWeights = elements.map(e => e.formatting.fontWeight);
        const formattingConsistency = Math.min(
            100 - (new Set(fontSizes).size - 1) * 15,
            100 - (new Set(fontWeights).size - 1) * 10
        );

        // Hierarchy quality based on proper structure
        const hasHeaders = hierarchy.headers.length > 0;
        const hasBullets = hierarchy.bullets.length > 0;
        const hierarchyScore = (hasHeaders ? 50 : 0) + (hasBullets ? 30 : 0) + 20; // Base 20

        // Bullet consistency
        const bulletStyles = hierarchy.bullets.map(b => b.spatialRelations.bulletStyle || 'default');
        const uniqueBulletStyles = new Set(bulletStyles);
        const bulletConsistency = bulletStyles.length === 0 ? 100 :
            Math.max(50, 100 - (uniqueBulletStyles.size - 1) * 25);

        return {
            completeness: Math.round(hasRequiredElements),
            formatting: Math.round(Math.max(0, formattingConsistency)),
            hierarchy: Math.round(Math.min(100, hierarchyScore)),
            bulletConsistency: Math.round(bulletConsistency)
        };
    }

    private calculateQualityMetrics(
        sections: FormattedSection[],
        hierarchyAnalysis: SmartFormattingResult['hierarchy'],
        bulletIntelligence: SmartFormattingResult['bulletIntelligence'],
        layoutPreservation: LayoutPreservation
    ): SmartFormattingResult['quality'] {
        const sectionDetection = sections.length > 0 ?
            (sections.filter(s => s.definition.id !== 'other').length / sections.length) * 100 : 0;

        const hierarchyPreservation = hierarchyAnalysis.consistency;
        const bulletConsistency = bulletIntelligence.consistency;

        // Layout integrity based on preserved spacing and alignment
        const layoutIntegrity = Math.min(
            (layoutPreservation.alignmentGroups.size > 0 ? 100 : 50),
            (layoutPreservation.originalSpacing.size > 0 ? 100 : 50)
        );

        const overall = (sectionDetection + hierarchyPreservation + bulletConsistency + layoutIntegrity) / 4;

        return {
            overall: Math.round(overall),
            sectionDetection: Math.round(sectionDetection),
            hierarchyPreservation: Math.round(hierarchyPreservation),
            bulletConsistency: Math.round(bulletConsistency),
            layoutIntegrity: Math.round(layoutIntegrity)
        };
    }

    private createErrorResult(error: any): SmartFormattingResult {
        console.error('Creating error result for Smart Formatting Engine:', error);

        return {
            success: false,
            sections: [],
            layoutPreservation: {
                originalSpacing: new Map(),
                alignmentGroups: new Map(),
                visualHierarchy: new Map(),
                bulletPointGroups: new Map(),
                fontClusters: new Map()
            },
            hierarchy: {
                levels: this.hierarchyLevels,
                mapping: new Map(),
                consistency: 0
            },
            bulletIntelligence: {
                styles: [],
                groups: new Map(),
                consistency: 0,
                recommendations: ['Failed to process bullet points']
            },
            quality: {
                overall: 0,
                sectionDetection: 0,
                hierarchyPreservation: 0,
                bulletConsistency: 0,
                layoutIntegrity: 0
            },
            metadata: {
                processingTime: 0,
                sectionsDetected: 0,
                elementsProcessed: 0,
                hierarchyLevels: 0,
                bulletStyles: 0,
                improvements: ['Processing failed']
            }
        };
    }
}

export default new SmartFormattingEngine();
export { SmartFormattingEngine };