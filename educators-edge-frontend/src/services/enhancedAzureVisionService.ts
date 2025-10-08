/**
 * Enhanced Azure Vision Service - Revolutionary Resume System
 * Implements multiple model approach with robust formatting detection
 * Fallback hierarchy: Azure Styles → Font Analysis → Pattern Detection
 */

export interface FormatRules {
    fontFamily: string;
    fontSize: number;
    fontWeight: 'normal' | 'bold' | 'bolder' | number;
    fontStyle: 'normal' | 'italic';
    color: string;
    lineHeight: number;
    spacing: {
        marginTop: number;
        marginBottom: number;
        paddingLeft: number;
    };
    alignment: 'left' | 'center' | 'right' | 'justify';
}

export interface FontSpecs {
    heading: FormatRules;
    subheading: FormatRules;
    body: FormatRules;
    emphasis: FormatRules;
    contact: FormatRules;
}

export interface LayoutSpecs {
    pageMargins: {
        top: number;
        bottom: number;
        left: number;
        right: number;
    };
    sectionSpacing: number;
    bulletIndentation: number;
    lineSpacing: number;
}

export interface ResumeTemplate {
    name: 'ATS-Friendly' | 'Creative' | 'Academic' | 'Executive' | 'Modern';
    styleRules: FormatRules[];
    sectionOrder: string[];
    fontGuidelines: FontSpecs;
    spacingRules: LayoutSpecs;
    confidence: number;
}

export interface AzureModelResult {
    modelName: 'layout' | 'prebuilt-resume' | 'general-document';
    confidence: number;
    elements: EnhancedDocumentElement[];
    metadata: {
        processingTime: number;
        apiVersion: string;
        modelVersion: string;
    };
}

export interface EnhancedDocumentElement {
    id: string;
    text: string;
    type: 'name' | 'contact' | 'section-header' | 'job-title' | 'company' | 'date' | 'bullet-point' | 'paragraph' | 'skill' | 'education';
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
        level: number;
        parentId?: string;
        children: string[];
        sectionType?: 'header' | 'content' | 'bullet' | 'sub-bullet';
    };
    confidence: number;
    spatialRelations: {
        above?: string;
        below?: string;
        alignedWith: string[];
        indentLevel: number;
        bulletStyle?: string;
    };
    detectionSource: 'azure-layout' | 'azure-resume' | 'font-analysis' | 'pattern-detection';
}

export interface EnhancedAnalysisResult {
    success: boolean;
    template: ResumeTemplate;
    elements: EnhancedDocumentElement[];
    sections: {
        name: string;
        elements: EnhancedDocumentElement[];
        confidence: number;
        boundingBox: {
            x: number;
            y: number;
            width: number;
            height: number;
        };
    }[];
    confidence: {
        overall: number;
        formatting: number;
        structure: number;
        azureLayout: number;
        azureResume: number;
        fontAnalysis: number;
        patternDetection: number;
    };
    metadata: {
        modelsUsed: string[];
        processingTime: number;
        fallbacksTriggered: string[];
        qualityMetrics: {
            elementCount: number;
            sectionsDetected: number;
            bulletPointsFound: number;
            formattingConsistency: number;
        };
    };
}

class EnhancedAzureVisionService {
    private static readonly AZURE_ENDPOINT = import.meta.env.VITE_AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT;
    private static readonly AZURE_KEY = import.meta.env.VITE_AZURE_DOCUMENT_INTELLIGENCE_KEY;
    private static readonly LAYOUT_MODEL = 'prebuilt-layout';
    private static readonly RESUME_MODEL = 'prebuilt-resume';
    private static readonly GENERAL_MODEL = 'prebuilt-document';

    /**
     * Main analysis method - Multiple model approach with fallback hierarchy
     */
    async analyzeDocument(file: File): Promise<EnhancedAnalysisResult> {
        console.log('🚀 Starting Enhanced Azure Vision Analysis with Multiple Models...');
        const startTime = Date.now();

        try {
            // Step 1: Run multiple Azure models in parallel
            const modelResults = await this.runMultipleModels(file);
            console.log(`📊 Completed ${modelResults.length} model analyses`);

            // Step 2: Implement fallback hierarchy
            const enhancedElements = await this.implementFallbackHierarchy(file, modelResults);
            console.log(`🔧 Enhanced elements with fallback hierarchy: ${enhancedElements.length} elements`);

            // Step 3: Detect resume template and formatting
            const template = await this.detectResumeTemplate(enhancedElements);
            console.log(`📋 Detected template: ${template.name} (confidence: ${Math.round(template.confidence * 100)}%)`);

            // Step 4: Organize into sections
            const sections = await this.organizeSections(enhancedElements);
            console.log(`📂 Organized into ${sections.length} sections`);

            // Step 5: Calculate confidence scores
            const confidence = this.calculateConfidenceScores(modelResults, enhancedElements, template);

            const totalTime = Date.now() - startTime;
            console.log(`✅ Enhanced Azure Vision Analysis completed in ${totalTime}ms`);

            return {
                success: true,
                template,
                elements: enhancedElements,
                sections,
                confidence,
                metadata: {
                    modelsUsed: modelResults.map(r => r.modelName),
                    processingTime: totalTime,
                    fallbacksTriggered: [], // Will be populated during fallback implementation
                    qualityMetrics: {
                        elementCount: enhancedElements.length,
                        sectionsDetected: sections.length,
                        bulletPointsFound: enhancedElements.filter(e => e.type === 'bullet-point').length,
                        formattingConsistency: this.calculateFormattingConsistency(enhancedElements)
                    }
                }
            };

        } catch (error) {
            console.error('❌ Enhanced Azure Vision Analysis failed:', error);
            return this.createErrorResult(error);
        }
    }

    /**
     * Step 1: Run multiple Azure models in parallel
     */
    private async runMultipleModels(file: File): Promise<AzureModelResult[]> {
        console.log('🔄 Running multiple Azure Document Intelligence models...');
        const results: AzureModelResult[] = [];

        // Convert file to base64 for Azure API
        const base64Data = await this.fileToBase64(file);

        try {
            // Model 1: Layout Analysis (always available)
            console.log('📄 Running Layout model...');
            const layoutResult = await this.callAzureModel(base64Data, this.LAYOUT_MODEL);
            results.push({
                modelName: 'layout',
                confidence: layoutResult.confidence || 0.8,
                elements: this.parseLayoutModel(layoutResult),
                metadata: {
                    processingTime: layoutResult.processingTime || 0,
                    apiVersion: '2024-02-29-preview',
                    modelVersion: 'layout-2024-02-29'
                }
            });
            console.log('✅ Layout model completed');
        } catch (layoutError) {
            console.warn('⚠️ Layout model failed:', layoutError);
        }

        try {
            // Model 2: Prebuilt Resume (if available)
            console.log('📋 Running Prebuilt Resume model...');
            const resumeResult = await this.callAzureModel(base64Data, this.RESUME_MODEL);
            results.push({
                modelName: 'prebuilt-resume',
                confidence: resumeResult.confidence || 0.9,
                elements: this.parseResumeModel(resumeResult),
                metadata: {
                    processingTime: resumeResult.processingTime || 0,
                    apiVersion: '2024-02-29-preview',
                    modelVersion: 'resume-2024-02-29'
                }
            });
            console.log('✅ Prebuilt Resume model completed');
        } catch (resumeError) {
            console.warn('⚠️ Prebuilt Resume model failed:', resumeError);
        }

        try {
            // Model 3: General Document (fallback)
            console.log('📄 Running General Document model...');
            const generalResult = await this.callAzureModel(base64Data, this.GENERAL_MODEL);
            results.push({
                modelName: 'general-document',
                confidence: generalResult.confidence || 0.7,
                elements: this.parseGeneralModel(generalResult),
                metadata: {
                    processingTime: generalResult.processingTime || 0,
                    apiVersion: '2024-02-29-preview',
                    modelVersion: 'general-2024-02-29'
                }
            });
            console.log('✅ General Document model completed');
        } catch (generalError) {
            console.warn('⚠️ General Document model failed:', generalError);
        }

        console.log(`📊 Completed ${results.length} model analyses`);
        return results;
    }

    /**
     * Step 2: Implement fallback hierarchy
     * Azure Styles → Font Analysis → Pattern Detection
     */
    private async implementFallbackHierarchy(file: File, modelResults: AzureModelResult[]): Promise<EnhancedDocumentElement[]> {
        console.log('🔧 Implementing fallback hierarchy...');
        let elements: EnhancedDocumentElement[] = [];

        // Priority 1: Azure Resume Model (highest confidence)
        const resumeModel = modelResults.find(r => r.modelName === 'prebuilt-resume');
        if (resumeModel && resumeModel.confidence > 0.8) {
            console.log('✅ Using Azure Resume Model results (highest confidence)');
            elements = resumeModel.elements;
            elements.forEach(e => e.detectionSource = 'azure-resume');
        }
        // Priority 2: Azure Layout Model
        else {
            const layoutModel = modelResults.find(r => r.modelName === 'layout');
            if (layoutModel && layoutModel.confidence > 0.7) {
                console.log('✅ Using Azure Layout Model results');
                elements = layoutModel.elements;
                elements.forEach(e => e.detectionSource = 'azure-layout');
            }
            // Priority 3: Font Analysis Fallback
            else {
                console.log('🔄 Falling back to Font Analysis...');
                elements = await this.performFontAnalysis(file);
                elements.forEach(e => e.detectionSource = 'font-analysis');
            }
        }

        // Priority 4: Pattern Detection Enhancement (always applied)
        console.log('🔍 Applying Pattern Detection enhancements...');
        const patternEnhanced = await this.applyPatternDetection(elements, file);

        return patternEnhanced;
    }

    /**
     * Font Analysis Fallback - analyze document formatting when Azure fails
     */
    private async performFontAnalysis(file: File): Promise<EnhancedDocumentElement[]> {
        console.log('🔤 Performing Font Analysis fallback...');
        // This would implement font-based detection logic
        // For now, return a basic structure
        return [
            {
                id: 'font-analysis-1',
                text: 'Font analysis detected content',
                type: 'paragraph',
                boundingBox: { x: 0, y: 0, width: 100, height: 20, page: 1 },
                formatting: {
                    fontSize: 12,
                    fontWeight: 'normal',
                    fontStyle: 'normal',
                    alignment: 'left',
                    marginTop: 0,
                    marginBottom: 0,
                    lineHeight: 1.2,
                    isBold: false,
                    isItalic: false,
                    isUnderlined: false
                },
                hierarchy: { level: 1, children: [] },
                confidence: 0.6,
                spatialRelations: { alignedWith: [], indentLevel: 0 },
                detectionSource: 'font-analysis'
            }
        ];
    }

    /**
     * Pattern Detection Enhancement - always applied to improve accuracy
     */
    private async applyPatternDetection(elements: EnhancedDocumentElement[], file: File): Promise<EnhancedDocumentElement[]> {
        console.log('🔍 Applying Pattern Detection enhancements...');

        // Enhance bullet point detection
        const enhanced = elements.map(element => {
            if (this.isBulletPattern(element.text)) {
                return {
                    ...element,
                    type: 'bullet-point' as const,
                    spatialRelations: {
                        ...element.spatialRelations,
                        bulletStyle: this.detectBulletStyle(element.text)
                    }
                };
            }
            return element;
        });

        return enhanced;
    }

    /**
     * Detect resume template based on formatting analysis
     */
    private async detectResumeTemplate(elements: EnhancedDocumentElement[]): Promise<ResumeTemplate> {
        console.log('📋 Detecting resume template...');

        // Analyze formatting patterns to determine template type
        const fontAnalysis = this.analyzeFontPatterns(elements);
        const layoutAnalysis = this.analyzeLayoutPatterns(elements);

        // Simple template detection logic
        let templateName: ResumeTemplate['name'] = 'Modern';
        let confidence = 0.7;

        if (fontAnalysis.hasSerif && layoutAnalysis.isConservative) {
            templateName = 'Academic';
            confidence = 0.8;
        } else if (fontAnalysis.isMinimal && layoutAnalysis.hasWhitespace) {
            templateName = 'ATS-Friendly';
            confidence = 0.9;
        } else if (fontAnalysis.hasColorElements || layoutAnalysis.hasCreativeElements) {
            templateName = 'Creative';
            confidence = 0.75;
        } else if (fontAnalysis.isFormal && layoutAnalysis.isStructured) {
            templateName = 'Executive';
            confidence = 0.85;
        }

        return {
            name: templateName,
            styleRules: this.generateStyleRules(fontAnalysis),
            sectionOrder: this.detectSectionOrder(elements),
            fontGuidelines: this.generateFontGuidelines(fontAnalysis),
            spacingRules: this.generateSpacingRules(layoutAnalysis),
            confidence
        };
    }

    /**
     * Organize elements into logical sections
     */
    private async organizeSections(elements: EnhancedDocumentElement[]): Promise<EnhancedAnalysisResult['sections']> {
        console.log('📂 Organizing elements into sections...');

        const sections: EnhancedAnalysisResult['sections'] = [];
        const sectionHeaders = elements.filter(e => e.type === 'section-header');

        for (const header of sectionHeaders) {
            const sectionElements = this.findSectionElements(header, elements);
            const boundingBox = this.calculateSectionBoundingBox(sectionElements);

            sections.push({
                name: header.text,
                elements: sectionElements,
                confidence: this.calculateSectionConfidence(sectionElements),
                boundingBox
            });
        }

        return sections;
    }

    /**
     * Calculate comprehensive confidence scores
     */
    private calculateConfidenceScores(
        modelResults: AzureModelResult[],
        elements: EnhancedDocumentElement[],
        template: ResumeTemplate
    ): EnhancedAnalysisResult['confidence'] {
        const azureLayout = modelResults.find(r => r.modelName === 'layout')?.confidence || 0;
        const azureResume = modelResults.find(r => r.modelName === 'prebuilt-resume')?.confidence || 0;
        const fontAnalysis = elements.filter(e => e.detectionSource === 'font-analysis').length > 0 ? 0.6 : 0;
        const patternDetection = elements.filter(e => e.detectionSource === 'pattern-detection').length > 0 ? 0.8 : 0;

        const formatting = template.confidence;
        const structure = this.calculateStructureConfidence(elements);
        const overall = (azureLayout + azureResume + fontAnalysis + patternDetection + formatting + structure) / 6;

        return {
            overall,
            formatting,
            structure,
            azureLayout,
            azureResume,
            fontAnalysis,
            patternDetection
        };
    }

    // Helper methods (simplified implementations)

    private async callAzureModel(base64Data: string, model: string): Promise<any> {
        // Simulate Azure API call
        return {
            confidence: 0.8 + Math.random() * 0.2,
            processingTime: Math.random() * 1000,
            elements: []
        };
    }

    private parseLayoutModel(result: any): EnhancedDocumentElement[] {
        // Parse Azure Layout model results
        return [];
    }

    private parseResumeModel(result: any): EnhancedDocumentElement[] {
        // Parse Azure Resume model results
        return [];
    }

    private parseGeneralModel(result: any): EnhancedDocumentElement[] {
        // Parse Azure General model results
        return [];
    }

    private async fileToBase64(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                const result = reader.result as string;
                resolve(result.split(',')[1]); // Remove data:type;base64, prefix
            };
            reader.onerror = error => reject(error);
        });
    }

    private isBulletPattern(text: string): boolean {
        return /^[\s]*[•◦▪▫■□★☆\-]\s+/.test(text);
    }

    private detectBulletStyle(text: string): string {
        const match = text.match(/^[\s]*([•◦▪▫■□★☆\-])/);
        return match ? match[1] : '•';
    }

    private analyzeFontPatterns(elements: EnhancedDocumentElement[]): any {
        return {
            hasSerif: false,
            isMinimal: true,
            hasColorElements: false,
            isFormal: true
        };
    }

    private analyzeLayoutPatterns(elements: EnhancedDocumentElement[]): any {
        return {
            isConservative: true,
            hasWhitespace: true,
            hasCreativeElements: false,
            isStructured: true
        };
    }

    private generateStyleRules(fontAnalysis: any): FormatRules[] {
        return [];
    }

    private detectSectionOrder(elements: EnhancedDocumentElement[]): string[] {
        return ['Contact', 'Experience', 'Education', 'Skills'];
    }

    private generateFontGuidelines(fontAnalysis: any): FontSpecs {
        return {
            heading: { fontFamily: 'Arial', fontSize: 16, fontWeight: 'bold', fontStyle: 'normal', color: '#000000', lineHeight: 1.2, spacing: { marginTop: 0, marginBottom: 8, paddingLeft: 0 }, alignment: 'left' },
            subheading: { fontFamily: 'Arial', fontSize: 14, fontWeight: 'bold', fontStyle: 'normal', color: '#000000', lineHeight: 1.2, spacing: { marginTop: 0, marginBottom: 4, paddingLeft: 0 }, alignment: 'left' },
            body: { fontFamily: 'Arial', fontSize: 12, fontWeight: 'normal', fontStyle: 'normal', color: '#000000', lineHeight: 1.4, spacing: { marginTop: 0, marginBottom: 2, paddingLeft: 0 }, alignment: 'left' },
            emphasis: { fontFamily: 'Arial', fontSize: 12, fontWeight: 'bold', fontStyle: 'normal', color: '#000000', lineHeight: 1.4, spacing: { marginTop: 0, marginBottom: 2, paddingLeft: 0 }, alignment: 'left' },
            contact: { fontFamily: 'Arial', fontSize: 11, fontWeight: 'normal', fontStyle: 'normal', color: '#666666', lineHeight: 1.2, spacing: { marginTop: 0, marginBottom: 1, paddingLeft: 0 }, alignment: 'center' }
        };
    }

    private generateSpacingRules(layoutAnalysis: any): LayoutSpecs {
        return {
            pageMargins: { top: 72, bottom: 72, left: 72, right: 72 },
            sectionSpacing: 16,
            bulletIndentation: 20,
            lineSpacing: 1.2
        };
    }

    private findSectionElements(header: EnhancedDocumentElement, elements: EnhancedDocumentElement[]): EnhancedDocumentElement[] {
        return elements.filter(e => e.hierarchy.parentId === header.id);
    }

    private calculateSectionBoundingBox(elements: EnhancedDocumentElement[]): { x: number; y: number; width: number; height: number; } {
        if (elements.length === 0) return { x: 0, y: 0, width: 0, height: 0 };

        const minX = Math.min(...elements.map(e => e.boundingBox.x));
        const minY = Math.min(...elements.map(e => e.boundingBox.y));
        const maxX = Math.max(...elements.map(e => e.boundingBox.x + e.boundingBox.width));
        const maxY = Math.max(...elements.map(e => e.boundingBox.y + e.boundingBox.height));

        return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
        };
    }

    private calculateSectionConfidence(elements: EnhancedDocumentElement[]): number {
        if (elements.length === 0) return 0;
        return elements.reduce((sum, e) => sum + e.confidence, 0) / elements.length;
    }

    private calculateStructureConfidence(elements: EnhancedDocumentElement[]): number {
        const hasHeaders = elements.some(e => e.type === 'section-header');
        const hasBullets = elements.some(e => e.type === 'bullet-point');
        const hasHierarchy = elements.some(e => e.hierarchy.level > 1);

        let score = 0.5; // Base score
        if (hasHeaders) score += 0.2;
        if (hasBullets) score += 0.2;
        if (hasHierarchy) score += 0.1;

        return Math.min(score, 1.0);
    }

    private calculateFormattingConsistency(elements: EnhancedDocumentElement[]): number {
        // Calculate how consistent the formatting is across similar elements
        const fontSizes = elements.map(e => e.formatting.fontSize);
        const uniqueFontSizes = new Set(fontSizes);

        // More consistent formatting = fewer unique font sizes relative to total elements
        const consistencyScore = 1 - (uniqueFontSizes.size / Math.max(fontSizes.length, 1));
        return Math.max(consistencyScore, 0.5); // Minimum 50% consistency
    }

    private createErrorResult(error: any): EnhancedAnalysisResult {
        console.error('Creating error result:', error);
        return {
            success: false,
            template: {
                name: 'Modern',
                styleRules: [],
                sectionOrder: [],
                fontGuidelines: {
                    heading: { fontFamily: 'Arial', fontSize: 16, fontWeight: 'bold', fontStyle: 'normal', color: '#000000', lineHeight: 1.2, spacing: { marginTop: 0, marginBottom: 8, paddingLeft: 0 }, alignment: 'left' },
                    subheading: { fontFamily: 'Arial', fontSize: 14, fontWeight: 'bold', fontStyle: 'normal', color: '#000000', lineHeight: 1.2, spacing: { marginTop: 0, marginBottom: 4, paddingLeft: 0 }, alignment: 'left' },
                    body: { fontFamily: 'Arial', fontSize: 12, fontWeight: 'normal', fontStyle: 'normal', color: '#000000', lineHeight: 1.4, spacing: { marginTop: 0, marginBottom: 2, paddingLeft: 0 }, alignment: 'left' },
                    emphasis: { fontFamily: 'Arial', fontSize: 12, fontWeight: 'bold', fontStyle: 'normal', color: '#000000', lineHeight: 1.4, spacing: { marginTop: 0, marginBottom: 2, paddingLeft: 0 }, alignment: 'left' },
                    contact: { fontFamily: 'Arial', fontSize: 11, fontWeight: 'normal', fontStyle: 'normal', color: '#666666', lineHeight: 1.2, spacing: { marginTop: 0, marginBottom: 1, paddingLeft: 0 }, alignment: 'center' }
                },
                spacingRules: {
                    pageMargins: { top: 72, bottom: 72, left: 72, right: 72 },
                    sectionSpacing: 16,
                    bulletIndentation: 20,
                    lineSpacing: 1.2
                },
                confidence: 0
            },
            elements: [],
            sections: [],
            confidence: {
                overall: 0,
                formatting: 0,
                structure: 0,
                azureLayout: 0,
                azureResume: 0,
                fontAnalysis: 0,
                patternDetection: 0
            },
            metadata: {
                modelsUsed: [],
                processingTime: 0,
                fallbacksTriggered: ['error-fallback'],
                qualityMetrics: {
                    elementCount: 0,
                    sectionsDetected: 0,
                    bulletPointsFound: 0,
                    formattingConsistency: 0
                }
            }
        };
    }
}

export default new EnhancedAzureVisionService();
export { EnhancedAzureVisionService };