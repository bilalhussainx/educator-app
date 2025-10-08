/**
 * Azure Vision Document Structure Service
 * Advanced document analysis using Azure Document Intelligence for exact structure detection
 * Detects titles, bullet points, hierarchies, and preserves original formatting
 */

export interface DocumentElement {
    id: string;
    text: string;
    type: 'title' | 'section-header' | 'job-title' | 'company' | 'date' | 'bullet-point' | 'paragraph' | 'contact-info';
    boundingBox: {
        x: number;
        y: number;
        width: number;
        height: number;
        page: number;
    };
    formatting: {
        fontSize: number;
        fontWeight: 'normal' | 'bold' | 'bolder' | number;
        fontStyle: 'normal' | 'italic';
        fontFamily?: string;
        color?: string;
        alignment: 'left' | 'center' | 'right';
        marginTop: number;
        marginBottom: number;
        lineHeight: number;
        isBold: boolean;
        isItalic: boolean;
        isUnderlined: boolean;
    };
    hierarchy: {
        level: number; // 1 = main title, 2 = section header, 3 = subsection, etc.
        parentId?: string;
        children: string[];
    };
    confidence: number;
    spatialRelations: {
        above?: string;
        below?: string;
        alignedWith: string[];
        indentLevel: number;
    };
}

export interface BulletPointStructure {
    bulletType: '•' | '◦' | '▪' | '▫' | '■' | '□' | '★' | '☆' | '-' | 'numbered';
    elements: DocumentElement[];
    indentLevel: number;
    parentBullet?: string;
    subBullets: string[];
}

export interface DocumentSection {
    id: string;
    title: string;
    titleElement: DocumentElement;
    type: 'personal-info' | 'summary' | 'experience' | 'education' | 'skills' | 'projects' | 'certifications' | 'awards' | 'other';
    elements: DocumentElement[];
    bulletStructure?: BulletPointStructure[];
    boundingBox: {
        x: number;
        y: number;
        width: number;
        height: number;
        page: number;
    };
    originalFormat: {
        sectionSpacing: number;
        alignment: 'left' | 'center' | 'right';
        titleFormatting: DocumentElement['formatting'];
        contentFormatting: DocumentElement['formatting'][];
    };
}

export interface DocumentStructureResult {
    success: boolean;
    documentInfo: {
        pageCount: number;
        totalElements: number;
        layoutType: 'single-column' | 'two-column' | 'multi-column' | 'complex';
        overallStyle: 'modern' | 'traditional' | 'creative' | 'academic' | 'technical';
    };
    personalInfo: {
        name?: DocumentElement;
        email?: DocumentElement;
        phone?: DocumentElement;
        address?: DocumentElement;
        linkedin?: DocumentElement;
        website?: DocumentElement;
    };
    sections: DocumentSection[];
    bulletPoints: BulletPointStructure[];
    hierarchyMap: Map<number, DocumentElement[]>;
    originalLayout: {
        margins: { top: number; right: number; bottom: number; left: number };
        columnWidth: number;
        lineSpacing: number;
        fontHierarchy: Array<{
            level: number;
            fontSize: number;
            fontWeight: string;
            usage: string;
        }>;
    };
    preservationData: {
        styleSheet: string; // CSS rules to recreate original formatting
        templateMapping: Record<string, any>;
        reconstructionInstructions: string[];
    };
    metadata: {
        processingTime: number;
        confidence: number;
        azureModelsUsed: string[];
        detectedLanguage: string;
        qualityScore: number;
    };
    error?: string;
}

class AzureVisionDocumentStructureService {
    private azureKey: string;
    private azureEndpoint: string;
    private confidenceThreshold = 0.7;

    constructor() {
        this.azureKey = import.meta.env.VITE_AZURE_DOCUMENT_INTELLIGENCE_KEY || '';
        this.azureEndpoint = import.meta.env.VITE_AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT || '';

        if (!this.azureKey || !this.azureEndpoint) {
            console.warn('⚠️ Azure Document Intelligence credentials not configured');
        }
    }

    /**
     * Main method to analyze document structure using Azure Vision
     */
    async analyzeDocumentStructure(file: File): Promise<DocumentStructureResult> {
        console.log('🔍 Starting Azure Vision document structure analysis...');
        const startTime = Date.now();

        try {
            // Step 1: Multi-model Azure analysis for comprehensive understanding
            const azureResults = await this.performMultiModelAnalysis(file);

            // Step 2: Extract all document elements with precise formatting
            const elements = await this.extractDocumentElements(azureResults);

            // Step 3: Detect hierarchy and relationships
            const hierarchyMap = await this.buildHierarchyMap(elements);

            // Step 4: Identify and structure bullet points
            const bulletStructure = await this.analyzeBulletPointStructure(elements);

            // Step 5: Detect and organize sections
            const sections = await this.detectDocumentSections(elements, hierarchyMap, bulletStructure);

            // Step 6: Extract personal information
            const personalInfo = await this.extractPersonalInformation(elements);

            // Step 7: Analyze overall layout and style
            const layoutAnalysis = await this.analyzeDocumentLayout(elements, azureResults);

            // Step 8: Generate preservation data for template reconstruction
            const preservationData = await this.generatePreservationData(elements, sections, layoutAnalysis);

            const processingTime = Date.now() - startTime;

            const result: DocumentStructureResult = {
                success: true,
                documentInfo: {
                    pageCount: azureResults.pages?.length || 1,
                    totalElements: elements.length,
                    layoutType: layoutAnalysis.layoutType,
                    overallStyle: layoutAnalysis.overallStyle
                },
                personalInfo,
                sections,
                bulletPoints: bulletStructure,
                hierarchyMap,
                originalLayout: layoutAnalysis.originalLayout,
                preservationData,
                metadata: {
                    processingTime,
                    confidence: this.calculateOverallConfidence(elements),
                    azureModelsUsed: ['prebuilt-layout', 'prebuilt-read', 'prebuilt-document'],
                    detectedLanguage: 'en',
                    qualityScore: this.calculateQualityScore(elements, sections)
                }
            };

            console.log('✅ Document structure analysis complete:', {
                elementsFound: elements.length,
                sectionsDetected: sections.length,
                bulletPoints: bulletStructure.length,
                processingTime: `${processingTime}ms`,
                confidence: result.metadata.confidence
            });

            return result;

        } catch (error) {
            console.error('❌ Document structure analysis failed:', error);
            return {
                success: false,
                error: error.message,
                documentInfo: { pageCount: 0, totalElements: 0, layoutType: 'single-column', overallStyle: 'traditional' },
                personalInfo: {},
                sections: [],
                bulletPoints: [],
                hierarchyMap: new Map(),
                originalLayout: { margins: { top: 0, right: 0, bottom: 0, left: 0 }, columnWidth: 0, lineSpacing: 0, fontHierarchy: [] },
                preservationData: { styleSheet: '', templateMapping: {}, reconstructionInstructions: [] },
                metadata: { processingTime: 0, confidence: 0, azureModelsUsed: [], detectedLanguage: 'en', qualityScore: 0 }
            };
        }
    }

    /**
     * Performs comprehensive Azure Document Intelligence analysis using multiple models
     */
    private async performMultiModelAnalysis(file: File): Promise<any> {
        console.log('🔍 Performing multi-model Azure analysis...');

        const formData = new FormData();
        formData.append('file', file);

        // Use multiple Azure models for comprehensive analysis
        const analysisPromises = [
            this.callAzureModel('prebuilt-layout', formData),      // Best for layout and formatting
            this.callAzureModel('prebuilt-read', formData),        // Best for text extraction
            this.callAzureModel('prebuilt-document', formData)      // Best for general document structure
        ];

        const [layoutResult, readResult, documentResult] = await Promise.allSettled(analysisPromises);

        return {
            layout: layoutResult.status === 'fulfilled' ? layoutResult.value : null,
            read: readResult.status === 'fulfilled' ? readResult.value : null,
            document: documentResult.status === 'fulfilled' ? documentResult.value : null,
            timestamp: new Date().toISOString()
        };
    }

    private async callAzureModel(modelId: string, formData: FormData): Promise<any> {
        const analyzeUrl = `${this.azureEndpoint}/formrecognizer/documentModels/${modelId}:analyze?api-version=2024-07-31-preview`;

        const analyzeResponse = await fetch(analyzeUrl, {
            method: 'POST',
            headers: {
                'Ocp-Apim-Subscription-Key': this.azureKey,
                // Don't set Content-Type for FormData - let browser set it
            },
            body: formData  // Send FormData directly
        });

        if (!analyzeResponse.ok) {
            throw new Error(`Azure ${modelId} analysis failed: ${analyzeResponse.statusText}`);
        }

        const operationLocation = analyzeResponse.headers.get('Operation-Location');
        if (!operationLocation) {
            throw new Error(`No operation location for ${modelId}`);
        }

        // Poll for results
        return await this.pollForResults(operationLocation);
    }

    private async pollForResults(operationLocation: string): Promise<any> {
        const maxAttempts = 30;
        const delayMs = 2000;

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const response = await fetch(operationLocation, {
                headers: {
                    'Ocp-Apim-Subscription-Key': this.azureKey,
                }
            });

            const result = await response.json();

            if (result.status === 'succeeded') {
                return result.analyzeResult;
            } else if (result.status === 'failed') {
                throw new Error(`Analysis failed: ${result.error?.message || 'Unknown error'}`);
            }

            await new Promise(resolve => setTimeout(resolve, delayMs));
        }

        throw new Error('Analysis timed out');
    }

    /**
     * Extracts document elements with precise formatting information
     */
    private async extractDocumentElements(azureResults: any): Promise<DocumentElement[]> {
        console.log('📄 Extracting document elements with formatting...');

        const elements: DocumentElement[] = [];
        let elementId = 0;

        // Primary source: Layout model for best formatting detection
        if (azureResults.layout?.pages) {
            for (const page of azureResults.layout.pages) {
                if (page.words) {
                    for (const word of page.words) {
                        const element = await this.createDocumentElement(word, page, azureResults, elementId++);
                        elements.push(element);
                    }
                }

                // Process paragraphs for better grouping
                if (page.paragraphs) {
                    for (const paragraph of page.paragraphs) {
                        const element = await this.createParagraphElement(paragraph, page, azureResults, elementId++);
                        elements.push(element);
                    }
                }
            }
        }

        // Enhance with read model data for better text understanding
        if (azureResults.read?.pages) {
            await this.enhanceWithReadModel(elements, azureResults.read);
        }

        // Apply intelligent clustering and hierarchy detection
        const processedElements = await this.processElementRelationships(elements);

        return processedElements;
    }

    private async createDocumentElement(
        word: any,
        page: any,
        azureResults: any,
        id: number
    ): Promise<DocumentElement> {

        const formatting = await this.extractFormattingDetails(word, page, azureResults);
        const elementType = await this.classifyElementType(word, formatting, page);
        const boundingBox = this.extractBoundingBox(word, page.pageNumber || 1);

        return {
            id: `element_${id}`,
            text: word.content || '',
            type: elementType,
            boundingBox,
            formatting,
            hierarchy: {
                level: this.calculateHierarchyLevel(elementType, formatting),
                children: []
            },
            confidence: word.confidence || 0.8,
            spatialRelations: {
                alignedWith: [],
                indentLevel: this.calculateIndentLevel(boundingBox)
            }
        };
    }

    private async createParagraphElement(
        paragraph: any,
        page: any,
        azureResults: any,
        id: number
    ): Promise<DocumentElement> {

        const formatting = await this.extractParagraphFormatting(paragraph, page, azureResults);
        const elementType = await this.classifyParagraphType(paragraph, formatting);
        const boundingBox = this.extractBoundingBox(paragraph, page.pageNumber || 1);

        return {
            id: `paragraph_${id}`,
            text: paragraph.content || '',
            type: elementType,
            boundingBox,
            formatting,
            hierarchy: {
                level: this.calculateHierarchyLevel(elementType, formatting),
                children: []
            },
            confidence: paragraph.confidence || 0.8,
            spatialRelations: {
                alignedWith: [],
                indentLevel: this.calculateIndentLevel(boundingBox)
            }
        };
    }

    private async extractFormattingDetails(word: any, page: any, azureResults: any): Promise<DocumentElement['formatting']> {
        // Extract detailed formatting from Azure analysis
        const polygon = word.polygon || [];
        const height = polygon.length >= 6 ? Math.abs(polygon[5] - polygon[1]) : 12;

        // Try to get style information from multiple sources
        let fontWeight: any = 'normal';
        let fontStyle: any = 'normal';
        let fontSize = Math.round(height * 0.75) || 12;

        // Check word-level style
        if (word.style) {
            fontWeight = word.style.fontWeight === 'bold' ? 'bold' : 'normal';
            fontStyle = word.style.fontStyle === 'italic' ? 'italic' : 'normal';
        }

        // Check page-level styles
        if (page.styles) {
            const matchingStyle = page.styles.find((style: any) =>
                style.spans?.some((span: any) =>
                    span.offset <= (word.span?.offset || 0) &&
                    span.offset + span.length >= (word.span?.offset || 0) + (word.span?.length || 0)
                )
            );

            if (matchingStyle) {
                fontWeight = matchingStyle.fontWeight === 'bold' ? 'bold' : fontWeight;
                fontStyle = matchingStyle.fontStyle === 'italic' ? 'italic' : fontStyle;
            }
        }

        return {
            fontSize,
            fontWeight,
            fontStyle,
            fontFamily: 'Arial, sans-serif', // Default, enhanced later
            color: '#000000',
            alignment: 'left',
            marginTop: 0,
            marginBottom: 0,
            lineHeight: height,
            isBold: fontWeight === 'bold',
            isItalic: fontStyle === 'italic',
            isUnderlined: false
        };
    }

    private async extractParagraphFormatting(paragraph: any, page: any, azureResults: any): Promise<DocumentElement['formatting']> {
        // Similar to word formatting but for paragraph level
        const boundingRegion = paragraph.boundingRegions?.[0];
        const height = boundingRegion ? Math.abs(boundingRegion.polygon[5] - boundingRegion.polygon[1]) : 16;

        return {
            fontSize: Math.round(height * 0.6) || 12,
            fontWeight: 'normal',
            fontStyle: 'normal',
            fontFamily: 'Arial, sans-serif',
            color: '#000000',
            alignment: 'left',
            marginTop: 0,
            marginBottom: 6,
            lineHeight: height,
            isBold: false,
            isItalic: false,
            isUnderlined: false
        };
    }

    private async classifyElementType(
        word: any,
        formatting: DocumentElement['formatting'],
        page: any
    ): Promise<DocumentElement['type']> {

        const text = (word.content || '').toLowerCase().trim();

        // Title detection (large, bold, usually at top)
        if (formatting.fontSize > 16 && formatting.isBold) {
            return 'title';
        }

        // Section header detection
        if (this.isSectionHeader(text) || (formatting.isBold && formatting.fontSize > 12)) {
            return 'section-header';
        }

        // Contact info detection
        if (this.isContactInfo(text)) {
            return 'contact-info';
        }

        // Date detection
        if (this.isDate(text)) {
            return 'date';
        }

        // Job title detection
        if (this.isJobTitle(text)) {
            return 'job-title';
        }

        // Company detection
        if (this.isCompany(text)) {
            return 'company';
        }

        // Bullet point detection
        if (this.isBulletPoint(text)) {
            return 'bullet-point';
        }

        return 'paragraph';
    }

    private async classifyParagraphType(
        paragraph: any,
        formatting: DocumentElement['formatting']
    ): Promise<DocumentElement['type']> {

        const text = (paragraph.content || '').toLowerCase().trim();

        if (formatting.fontSize > 16 && formatting.isBold) {
            return 'title';
        }

        if (this.isSectionHeader(text)) {
            return 'section-header';
        }

        return 'paragraph';
    }

    // Utility methods for text classification
    private isSectionHeader(text: string): boolean {
        const sectionHeaders = [
            'experience', 'education', 'skills', 'summary', 'objective',
            'certifications', 'projects', 'awards', 'publications', 'contact',
            'work experience', 'professional experience', 'employment history',
            'technical skills', 'core competencies', 'achievements'
        ];
        return sectionHeaders.some(header => text.includes(header));
    }

    private isContactInfo(text: string): boolean {
        const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
        const phonePattern = /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/;
        const urlPattern = /\b(?:https?:\/\/|www\.)\S+\b/;
        return emailPattern.test(text) || phonePattern.test(text) || urlPattern.test(text);
    }

    private isDate(text: string): boolean {
        const datePatterns = [
            /\b\d{4}\b/, // Year
            /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/i, // Month
            /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/, // Date format
            /\b(January|February|March|April|May|June|July|August|September|October|November|December)\b/i
        ];
        return datePatterns.some(pattern => pattern.test(text));
    }

    private isJobTitle(text: string): boolean {
        const jobTitlePatterns = [
            /\b(manager|director|analyst|engineer|developer|designer|specialist|coordinator|assistant|supervisor|executive|officer|representative|associate|technician|lead|senior|junior|principal|chief)\b/i
        ];
        return jobTitlePatterns.some(pattern => pattern.test(text));
    }

    private isCompany(text: string): boolean {
        const companyPatterns = [
            /(inc\.|llc|corp\.|ltd\.|company|corporation|industries|solutions|systems|technologies|group|associates)$/i
        ];
        return companyPatterns.some(pattern => pattern.test(text));
    }

    private isBulletPoint(text: string): boolean {
        const bulletChars = ['•', '◦', '▪', '▫', '■', '□', '★', '☆', '-', '▶'];
        return bulletChars.some(char => text.startsWith(char)) || /^\d+\./.test(text);
    }

    private extractBoundingBox(element: any, pageNumber: number): DocumentElement['boundingBox'] {
        const polygon = element.polygon || element.boundingRegions?.[0]?.polygon;

        if (!polygon || polygon.length < 6) {
            return { x: 0, y: 0, width: 0, height: 0, page: pageNumber };
        }

        return {
            x: polygon[0],
            y: polygon[1],
            width: polygon[4] - polygon[0],
            height: polygon[5] - polygon[1],
            page: pageNumber
        };
    }

    private calculateHierarchyLevel(
        type: DocumentElement['type'],
        formatting: DocumentElement['formatting']
    ): number {

        // Base levels by type
        const baseLevels = {
            'title': 1,
            'section-header': 2,
            'job-title': 3,
            'company': 3,
            'date': 4,
            'bullet-point': 4,
            'paragraph': 5,
            'contact-info': 6
        };

        let level = baseLevels[type] || 5;

        // Adjust based on formatting
        if (formatting.isBold) level -= 0.5;
        if (formatting.fontSize > 14) level -= 0.5;
        if (formatting.fontSize > 18) level -= 1;

        return Math.max(1, Math.round(level));
    }

    private calculateIndentLevel(boundingBox: DocumentElement['boundingBox']): number {
        // Calculate indent level based on x position
        // Assuming standard margins, each 36 points (0.5 inch) is one indent level
        return Math.round(boundingBox.x / 36);
    }

    // Additional methods for building hierarchy, bullet structure, sections, etc.
    private async buildHierarchyMap(elements: DocumentElement[]): Promise<Map<number, DocumentElement[]>> {
        const hierarchyMap = new Map<number, DocumentElement[]>();

        elements.forEach(element => {
            const level = element.hierarchy.level;
            if (!hierarchyMap.has(level)) {
                hierarchyMap.set(level, []);
            }
            hierarchyMap.get(level)!.push(element);
        });

        return hierarchyMap;
    }

    private async analyzeBulletPointStructure(elements: DocumentElement[]): Promise<BulletPointStructure[]> {
        const bulletElements = elements.filter(el => el.type === 'bullet-point');
        const bulletStructures: BulletPointStructure[] = [];

        // Group bullets by indent level and detect hierarchy
        const bulletGroups = new Map<number, DocumentElement[]>();

        bulletElements.forEach(bullet => {
            const indentLevel = bullet.spatialRelations.indentLevel;
            if (!bulletGroups.has(indentLevel)) {
                bulletGroups.set(indentLevel, []);
            }
            bulletGroups.get(indentLevel)!.push(bullet);
        });

        // Create bullet structures
        bulletGroups.forEach((bullets, indentLevel) => {
            bullets.forEach(bullet => {
                const bulletType = this.detectBulletType(bullet.text);

                bulletStructures.push({
                    bulletType,
                    elements: [bullet],
                    indentLevel,
                    subBullets: []
                });
            });
        });

        return bulletStructures;
    }

    private detectBulletType(text: string): BulletPointStructure['bulletType'] {
        if (text.startsWith('•')) return '•';
        if (text.startsWith('◦')) return '◦';
        if (text.startsWith('▪')) return '▪';
        if (text.startsWith('▫')) return '▫';
        if (text.startsWith('■')) return '■';
        if (text.startsWith('□')) return '□';
        if (text.startsWith('★')) return '★';
        if (text.startsWith('☆')) return '☆';
        if (text.startsWith('-')) return '-';
        if (/^\d+\./.test(text)) return 'numbered';
        return '•';
    }

    private async detectDocumentSections(
        elements: DocumentElement[],
        hierarchyMap: Map<number, DocumentElement[]>,
        bulletStructure: BulletPointStructure[]
    ): Promise<DocumentSection[]> {

        const sections: DocumentSection[] = [];
        const sectionHeaders = elements.filter(el => el.type === 'section-header');

        for (let i = 0; i < sectionHeaders.length; i++) {
            const header = sectionHeaders[i];
            const nextHeader = sectionHeaders[i + 1];

            // Find elements belonging to this section
            const sectionElements = elements.filter(el => {
                const afterCurrentHeader = el.boundingBox.y > header.boundingBox.y;
                const beforeNextHeader = !nextHeader || el.boundingBox.y < nextHeader.boundingBox.y;
                return afterCurrentHeader && beforeNextHeader && el.id !== header.id;
            });

            const sectionType = this.classifySectionType(header.text);

            sections.push({
                id: `section_${i}`,
                title: header.text,
                titleElement: header,
                type: sectionType,
                elements: sectionElements,
                boundingBox: this.calculateSectionBoundingBox(header, sectionElements),
                originalFormat: {
                    sectionSpacing: this.calculateSectionSpacing(header, sectionElements),
                    alignment: header.formatting.alignment,
                    titleFormatting: header.formatting,
                    contentFormatting: sectionElements.map(el => el.formatting)
                }
            });
        }

        return sections;
    }

    private classifySectionType(title: string): DocumentSection['type'] {
        const titleLower = title.toLowerCase();

        if (titleLower.includes('experience') || titleLower.includes('employment')) return 'experience';
        if (titleLower.includes('education') || titleLower.includes('academic')) return 'education';
        if (titleLower.includes('skills') || titleLower.includes('competencies')) return 'skills';
        if (titleLower.includes('summary') || titleLower.includes('objective')) return 'summary';
        if (titleLower.includes('project')) return 'projects';
        if (titleLower.includes('certification') || titleLower.includes('license')) return 'certifications';
        if (titleLower.includes('award') || titleLower.includes('achievement')) return 'awards';
        if (titleLower.includes('contact')) return 'personal-info';

        return 'other';
    }

    private calculateSectionBoundingBox(
        header: DocumentElement,
        elements: DocumentElement[]
    ): DocumentSection['boundingBox'] {

        if (elements.length === 0) {
            return header.boundingBox;
        }

        const allElements = [header, ...elements];
        const minX = Math.min(...allElements.map(el => el.boundingBox.x));
        const minY = Math.min(...allElements.map(el => el.boundingBox.y));
        const maxX = Math.max(...allElements.map(el => el.boundingBox.x + el.boundingBox.width));
        const maxY = Math.max(...allElements.map(el => el.boundingBox.y + el.boundingBox.height));

        return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY,
            page: header.boundingBox.page
        };
    }

    private calculateSectionSpacing(header: DocumentElement, elements: DocumentElement[]): number {
        if (elements.length === 0) return 12;

        const headerBottom = header.boundingBox.y + header.boundingBox.height;
        const firstElementTop = Math.min(...elements.map(el => el.boundingBox.y));

        return Math.max(0, firstElementTop - headerBottom);
    }

    private async extractPersonalInformation(elements: DocumentElement[]): Promise<DocumentStructureResult['personalInfo']> {
        const personalInfo: DocumentStructureResult['personalInfo'] = {};

        // Find name (usually the first large, bold text)
        const nameCandidate = elements.find(el =>
            el.type === 'title' &&
            el.hierarchy.level === 1 &&
            !this.isContactInfo(el.text)
        );
        if (nameCandidate) personalInfo.name = nameCandidate;

        // Find contact information
        const contactElements = elements.filter(el => el.type === 'contact-info');

        contactElements.forEach(element => {
            const text = element.text;

            if (text.includes('@')) {
                personalInfo.email = element;
            } else if (/\d{3}[-.]?\d{3}[-.]?\d{4}/.test(text)) {
                personalInfo.phone = element;
            } else if (text.includes('linkedin')) {
                personalInfo.linkedin = element;
            } else if (text.includes('http') || text.includes('www')) {
                personalInfo.website = element;
            } else {
                personalInfo.address = element;
            }
        });

        return personalInfo;
    }

    private async analyzeDocumentLayout(elements: DocumentElement[], azureResults: any): Promise<{
        layoutType: DocumentStructureResult['documentInfo']['layoutType'];
        overallStyle: DocumentStructureResult['documentInfo']['overallStyle'];
        originalLayout: DocumentStructureResult['originalLayout'];
    }> {

        // Analyze column structure
        const layoutType = this.detectLayoutType(elements);

        // Analyze style
        const overallStyle = this.detectOverallStyle(elements);

        // Extract layout measurements
        const originalLayout = this.extractLayoutMeasurements(elements, azureResults);

        return { layoutType, overallStyle, originalLayout };
    }

    private detectLayoutType(elements: DocumentElement[]): DocumentStructureResult['documentInfo']['layoutType'] {
        // Analyze element positions to determine column structure
        const xPositions = elements.map(el => el.boundingBox.x).sort((a, b) => a - b);
        const uniqueXPositions = [...new Set(xPositions.map(x => Math.round(x / 10) * 10))];

        if (uniqueXPositions.length <= 2) return 'single-column';
        if (uniqueXPositions.length <= 4) return 'two-column';
        return 'multi-column';
    }

    private detectOverallStyle(elements: DocumentElement[]): DocumentStructureResult['documentInfo']['overallStyle'] {
        // Analyze fonts, spacing, and formatting to determine style
        const boldCount = elements.filter(el => el.formatting.isBold).length;
        const italicCount = elements.filter(el => el.formatting.isItalic).length;
        const largeFontCount = elements.filter(el => el.formatting.fontSize > 14).length;

        const boldRatio = boldCount / elements.length;
        const largeFontRatio = largeFontCount / elements.length;

        if (boldRatio > 0.3 && largeFontRatio > 0.2) return 'creative';
        if (boldRatio < 0.1 && largeFontRatio < 0.1) return 'traditional';
        if (italicCount > elements.length * 0.1) return 'academic';

        return 'modern';
    }

    private extractLayoutMeasurements(elements: DocumentElement[], azureResults: any): DocumentStructureResult['originalLayout'] {
        // Calculate margins based on element positions
        const minX = Math.min(...elements.map(el => el.boundingBox.x));
        const maxX = Math.max(...elements.map(el => el.boundingBox.x + el.boundingBox.width));
        const minY = Math.min(...elements.map(el => el.boundingBox.y));
        const maxY = Math.max(...elements.map(el => el.boundingBox.y + el.boundingBox.height));

        // Assuming page width/height from Azure results or standard letter size
        const pageWidth = azureResults.layout?.pages?.[0]?.width || 612; // 8.5 inches * 72 pts
        const pageHeight = azureResults.layout?.pages?.[0]?.height || 792; // 11 inches * 72 pts

        const margins = {
            top: minY,
            right: pageWidth - maxX,
            bottom: pageHeight - maxY,
            left: minX
        };

        // Calculate font hierarchy
        const fontSizes = [...new Set(elements.map(el => el.formatting.fontSize))].sort((a, b) => b - a);
        const fontHierarchy = fontSizes.map((size, index) => ({
            level: index + 1,
            fontSize: size,
            fontWeight: elements.find(el => el.formatting.fontSize === size)?.formatting.fontWeight || 'normal',
            usage: this.describeFontUsage(size, elements)
        }));

        return {
            margins,
            columnWidth: maxX - minX,
            lineSpacing: this.calculateAverageLineSpacing(elements),
            fontHierarchy
        };
    }

    private describeFontUsage(fontSize: number, elements: DocumentElement[]): string {
        const elementsWithSize = elements.filter(el => el.formatting.fontSize === fontSize);
        const types = [...new Set(elementsWithSize.map(el => el.type))];

        if (types.includes('title')) return 'Main titles';
        if (types.includes('section-header')) return 'Section headers';
        if (types.includes('job-title')) return 'Job titles';
        return 'Body text';
    }

    private calculateAverageLineSpacing(elements: DocumentElement[]): number {
        // Calculate average spacing between consecutive elements
        const sortedElements = elements.sort((a, b) => a.boundingBox.y - b.boundingBox.y);
        const spacings: number[] = [];

        for (let i = 1; i < sortedElements.length; i++) {
            const prevBottom = sortedElements[i-1].boundingBox.y + sortedElements[i-1].boundingBox.height;
            const currentTop = sortedElements[i].boundingBox.y;
            const spacing = currentTop - prevBottom;

            if (spacing > 0 && spacing < 50) { // Reasonable line spacing
                spacings.push(spacing);
            }
        }

        return spacings.length > 0 ? spacings.reduce((a, b) => a + b) / spacings.length : 12;
    }

    private async generatePreservationData(
        elements: DocumentElement[],
        sections: DocumentSection[],
        layoutAnalysis: any
    ): Promise<DocumentStructureResult['preservationData']> {

        // Generate CSS stylesheet to recreate formatting
        const styleSheet = this.generateStyleSheet(elements, sections, layoutAnalysis);

        // Create template mapping for reconstruction
        const templateMapping = this.createTemplateMapping(sections, elements);

        // Generate reconstruction instructions
        const reconstructionInstructions = this.generateReconstructionInstructions(sections, elements);

        return {
            styleSheet,
            templateMapping,
            reconstructionInstructions
        };
    }

    private generateStyleSheet(
        elements: DocumentElement[],
        sections: DocumentSection[],
        layoutAnalysis: any
    ): string {

        let css = `/* Auto-generated stylesheet from document analysis */\n\n`;

        // Page layout
        css += `.resume-page {\n`;
        css += `  margin: ${layoutAnalysis.originalLayout.margins.top}pt ${layoutAnalysis.originalLayout.margins.right}pt ${layoutAnalysis.originalLayout.margins.bottom}pt ${layoutAnalysis.originalLayout.margins.left}pt;\n`;
        css += `  line-height: ${layoutAnalysis.originalLayout.lineSpacing}pt;\n`;
        css += `}\n\n`;

        // Font hierarchy styles
        layoutAnalysis.originalLayout.fontHierarchy.forEach((font: any, index: number) => {
            css += `.font-level-${font.level} {\n`;
            css += `  font-size: ${font.fontSize}pt;\n`;
            css += `  font-weight: ${font.fontWeight};\n`;
            css += `  /* ${font.usage} */\n`;
            css += `}\n\n`;
        });

        // Section styles
        sections.forEach((section, index) => {
            css += `.section-${section.type} {\n`;
            css += `  margin-top: ${section.originalFormat.sectionSpacing}pt;\n`;
            css += `  text-align: ${section.originalFormat.alignment};\n`;
            css += `}\n\n`;

            css += `.section-${section.type} .title {\n`;
            css += `  font-size: ${section.originalFormat.titleFormatting.fontSize}pt;\n`;
            css += `  font-weight: ${section.originalFormat.titleFormatting.fontWeight};\n`;
            css += `  font-style: ${section.originalFormat.titleFormatting.fontStyle};\n`;
            css += `}\n\n`;
        });

        return css;
    }

    private createTemplateMapping(sections: DocumentSection[], elements: DocumentElement[]): Record<string, any> {
        return {
            sections: sections.map(section => ({
                id: section.id,
                title: section.title,
                type: section.type,
                elementCount: section.elements.length,
                originalFormat: section.originalFormat
            })),
            elementTypes: {
                titles: elements.filter(el => el.type === 'title').length,
                sectionHeaders: elements.filter(el => el.type === 'section-header').length,
                bulletPoints: elements.filter(el => el.type === 'bullet-point').length,
                paragraphs: elements.filter(el => el.type === 'paragraph').length
            }
        };
    }

    private generateReconstructionInstructions(sections: DocumentSection[], elements: DocumentElement[]): string[] {
        const instructions: string[] = [];

        instructions.push('Document Structure Reconstruction Guide:');
        instructions.push('');
        instructions.push('1. Apply page margins and layout settings from originalLayout');
        instructions.push('2. Use font hierarchy levels to maintain visual structure');
        instructions.push('3. Preserve section spacing and alignment');
        instructions.push('4. Maintain bullet point indentation and styles');
        instructions.push('5. Keep contact information formatting consistent');

        sections.forEach(section => {
            instructions.push(`6. Section "${section.title}": ${section.elements.length} elements, ${section.originalFormat.sectionSpacing}pt spacing`);
        });

        return instructions;
    }

    // Utility methods
    private async processElementRelationships(elements: DocumentElement[]): Promise<DocumentElement[]> {
        // Sort elements by position
        elements.sort((a, b) => {
            if (a.boundingBox.page !== b.boundingBox.page) {
                return a.boundingBox.page - b.boundingBox.page;
            }
            if (Math.abs(a.boundingBox.y - b.boundingBox.y) < 5) {
                return a.boundingBox.x - b.boundingBox.x;
            }
            return a.boundingBox.y - b.boundingBox.y;
        });

        // Build spatial relationships
        for (let i = 0; i < elements.length; i++) {
            const element = elements[i];

            // Find elements above and below
            if (i > 0) {
                element.spatialRelations.above = elements[i - 1].id;
            }
            if (i < elements.length - 1) {
                element.spatialRelations.below = elements[i + 1].id;
            }

            // Find aligned elements (same Y position, within threshold)
            const aligned = elements.filter(other =>
                other.id !== element.id &&
                other.boundingBox.page === element.boundingBox.page &&
                Math.abs(other.boundingBox.y - element.boundingBox.y) < 5
            );
            element.spatialRelations.alignedWith = aligned.map(el => el.id);
        }

        return elements;
    }

    private async enhanceWithReadModel(elements: DocumentElement[], readResults: any): Promise<void> {
        // Enhance elements with additional text understanding from read model
        if (readResults.pages) {
            for (const page of readResults.pages) {
                if (page.words) {
                    for (const word of page.words) {
                        const matchingElement = elements.find(el =>
                            el.text === word.content &&
                            Math.abs(el.boundingBox.x - (word.polygon?.[0] || 0)) < 5
                        );

                        if (matchingElement && word.confidence) {
                            matchingElement.confidence = Math.max(matchingElement.confidence, word.confidence);
                        }
                    }
                }
            }
        }
    }

    private calculateOverallConfidence(elements: DocumentElement[]): number {
        if (elements.length === 0) return 0;
        const totalConfidence = elements.reduce((sum, el) => sum + el.confidence, 0);
        return totalConfidence / elements.length;
    }

    private calculateQualityScore(elements: DocumentElement[], sections: DocumentSection[]): number {
        let score = 0;

        // Base score for having elements
        if (elements.length > 0) score += 20;

        // Score for having sections
        if (sections.length >= 3) score += 30;

        // Score for having structured content
        const bulletPoints = elements.filter(el => el.type === 'bullet-point').length;
        if (bulletPoints > 0) score += 20;

        // Score for having personal info
        const contactInfo = elements.filter(el => el.type === 'contact-info').length;
        if (contactInfo > 0) score += 20;

        // Score for confidence levels
        const avgConfidence = this.calculateOverallConfidence(elements);
        score += Math.round(avgConfidence * 10);

        return Math.min(100, score);
    }
}

export default new AzureVisionDocumentStructureService();
export type {
    DocumentElement,
    BulletPointStructure,
    DocumentSection,
    DocumentStructureResult
};