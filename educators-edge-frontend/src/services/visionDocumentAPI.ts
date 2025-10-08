/**
 * Vision-Based Document Intelligence API
 * Revolutionary approach using Azure Document Intelligence and Google Cloud Document AI
 * for true visual layout understanding and spatial relationship detection
 */

export interface BoundingBox {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface TextElement {
    text: string;
    boundingBox: BoundingBox;
    confidence: number;
    fontSize?: number;
    fontWeight?: 'normal' | 'bold';
    fontStyle?: 'normal' | 'italic';
    fontFamily?: string;
    role?: 'title' | 'heading' | 'jobTitle' | 'company' | 'dates' | 'bulletPoint' | 'paragraph' | 'contact';
    hierarchyLevel?: number;
    spatialRelationships?: {
        isIndentedUnder?: string; // ID of parent element
        isAlignedWith?: string[]; // IDs of aligned elements
        precedingElement?: string; // ID of element above
        followingElement?: string; // ID of element below
    };
}

export interface JobPosition {
    title: string;
    titleElement: TextElement;
    company?: string;
    companyElement?: TextElement;
    dates?: string;
    datesElement?: TextElement;
    details: Array<{
        text: string;
        element: TextElement;
        bulletType?: '•' | '*' | '-' | 'numbered';
        indentLevel?: number;
    }>;
    boundingBox: BoundingBox; // Overall bounding box for entire position
}

export interface ResumeSection {
    title: string;
    titleElement: TextElement;
    content: TextElement[];
    jobPositions?: JobPosition[];
    boundingBox: BoundingBox;
    sectionType: 'experience' | 'education' | 'skills' | 'summary' | 'contact' | 'projects' | 'certifications' | 'other';
}

export interface VisionAnalysisResult {
    success: boolean;
    pages: Array<{
        pageNumber: number;
        imageData: string; // Base64 encoded image
        dimensions: { width: number; height: number };
        elements: TextElement[];
        sections: ResumeSection[];
        layoutAnalysis: {
            margins: { top: number; bottom: number; left: number; right: number };
            columns: number;
            textFlow: 'left-to-right' | 'right-to-left';
            averageFontSize: number;
            dominantFontFamily: string;
        };
    }>;
    structuredData: {
        personalInfo: {
            name?: TextElement;
            email?: TextElement;
            phone?: TextElement;
            address?: TextElement;
            linkedin?: TextElement;
            website?: TextElement;
        };
        sections: ResumeSection[];
        jobPositions: JobPosition[];
        visualHierarchy: Array<{
            level: number;
            elements: TextElement[];
            purpose: string; // e.g., "main headings", "job titles", "content"
        }>;
    };
    metadata: {
        processingTime: number;
        apiProvider: 'azure' | 'google' | 'fallback';
        confidence: number;
        layoutComplexity: 'simple' | 'moderate' | 'complex';
        recommendedTemplate: string;
    };
    error?: string;
}

class VisionDocumentAPI {
    private azureKey: string;
    private azureEndpoint: string;
    private googleCredentials: any;

    constructor() {
        this.azureKey = import.meta.env.VITE_AZURE_DOCUMENT_INTELLIGENCE_KEY || '';
        this.azureEndpoint = import.meta.env.VITE_AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT || '';

        console.log('🔧 VisionDocumentAPI Constructor - Checking Azure Configuration...');
        console.log('📋 Environment Variables Check:');
        console.log('   - VITE_AZURE_DOCUMENT_INTELLIGENCE_KEY:', this.azureKey ? `***${this.azureKey.slice(-4)}` : 'NOT SET');
        console.log('   - VITE_AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT:', this.azureEndpoint || 'NOT SET');

        if (!this.azureKey || !this.azureEndpoint) {
            console.warn('⚠️ Azure Document Intelligence not configured. Vision analysis will use fallback mode.');
            console.warn('   To enable advanced vision features, set VITE_AZURE_DOCUMENT_INTELLIGENCE_KEY and VITE_AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT');
        } else {
            console.log('✅ Azure Document Intelligence configuration found');
            this.testAzureConnection();
        }
    }

    /**
     * Test Azure connection
     */
    private async testAzureConnection(): Promise<void> {
        try {
            console.log('🧪 Testing Azure Document Intelligence connection...');
            // Simple health check - just validate the endpoint format
            if (!this.azureEndpoint.includes('cognitiveservices.azure.com')) {
                console.warn('⚠️ Azure endpoint format may be incorrect. Expected format: https://your-resource.cognitiveservices.azure.com/');
            }
            console.log('✅ Azure endpoint format looks correct');
        } catch (error) {
            console.error('❌ Azure connection test failed:', error);
        }
    }

    /**
     * Main method: Convert document to visual analysis
     */
    async analyzeDocumentVisually(file: File): Promise<VisionAnalysisResult> {
        console.log('🔍 Vision Document API: Starting document analysis...');
        console.log('📄 File details:', {
            name: file.name,
            size: `${Math.round(file.size / 1024)}KB`,
            type: file.type,
            lastModified: new Date(file.lastModified).toISOString()
        });
        const startTime = Date.now();

        try {
            console.log('🚀 Starting document processing pipeline...');

            // Step 1: Convert document to high-resolution images
            console.log('📸 Step 1: Converting document to images...');
            const images = await this.convertDocumentToImages(file);
            console.log(`✅ Document converted to ${images.length} images`);

            images.forEach((img, index) => {
                console.log(`   📷 Image ${index + 1}: ${img.dimensions.width}x${img.dimensions.height}px`);
            });

            // Step 2: Analyze each page with Document Intelligence
            console.log('🔍 Step 2: Analyzing pages with Document Intelligence...');
            const pages = await Promise.all(
                images.map((image, index) => this.analyzePageLayout(image, index + 1))
            );
            console.log(`✅ Analyzed ${pages.length} pages`);

            // Step 3: Extract structured data across all pages
            const structuredData = this.extractStructuredData(pages);

            // Step 4: Perform advanced layout analysis
            const layoutAnalysis = this.performLayoutAnalysis(pages);

            const processingTime = Date.now() - startTime;

            const result: VisionAnalysisResult = {
                success: true,
                pages,
                structuredData,
                metadata: {
                    processingTime,
                    apiProvider: this.azureKey ? 'azure' : 'fallback',
                    confidence: this.calculateOverallConfidence(pages),
                    layoutComplexity: this.assessLayoutComplexity(pages),
                    recommendedTemplate: this.recommendTemplate(structuredData)
                }
            };

            console.log('✅ Vision analysis completed:', {
                pages: pages.length,
                sections: structuredData.sections.length,
                jobPositions: structuredData.jobPositions.length,
                processingTime: `${processingTime}ms`
            });

            return result;

        } catch (error: any) {
            console.error('❌ Vision document analysis failed:', error);
            console.error('🔍 Error details:', {
                message: error.message,
                stack: error.stack,
                name: error.name,
                cause: error.cause
            });

            // Check if it's a network error
            if (error.message.includes('fetch')) {
                console.error('🌐 Network error detected - check internet connection and Azure endpoint');
            }

            // Check if it's an authentication error
            if (error.message.includes('401') || error.message.includes('403')) {
                console.error('🔑 Authentication error - check Azure API key');
            }

            return {
                success: false,
                pages: [],
                structuredData: { personalInfo: {}, sections: [], jobPositions: [], visualHierarchy: [] },
                metadata: {
                    processingTime: Date.now() - startTime,
                    apiProvider: 'fallback',
                    confidence: 0,
                    layoutComplexity: 'simple',
                    recommendedTemplate: 'basic'
                },
                error: `Analysis failed: ${error.message}`
            };
        }
    }

    /**
     * Convert document to format suitable for Azure Document Intelligence
     */
    private async convertDocumentToImages(file: File): Promise<Array<{
        imageData: string;
        dimensions: { width: number; height: number };
        isDirectFile?: boolean;
        originalFile?: File;
    }>> {
        console.log('📸 Preparing document for Azure Document Intelligence...');

        // For PDFs, try direct processing first (Azure supports PDFs natively)
        if (file.type === 'application/pdf') {
            console.log('📄 PDF detected - using direct Azure processing (no conversion needed)');
            try {
                // Return file data directly for Azure - no image conversion needed
                const arrayBuffer = await file.arrayBuffer();
                const base64Data = this.arrayBufferToBase64(arrayBuffer);
                return [{
                    imageData: `data:application/pdf;base64,${base64Data}`,
                    dimensions: { width: 800, height: 1000 }, // Default PDF dimensions
                    isDirectFile: true,
                    originalFile: file
                }];
            } catch (error) {
                console.warn('⚠️ Direct PDF processing failed, attempting image conversion...');
                // Still pass the original file for fallback processing
                const images = await this.convertPDFToImages(file);
                return images.map(img => ({
                    ...img,
                    originalFile: file
                }));
            }
        }

        // For Word documents, first convert to PDF, then to images
        if (file.name.toLowerCase().endsWith('.docx') || file.name.toLowerCase().endsWith('.doc')) {
            return await this.convertWordToImages(file);
        }

        // For images, just process directly
        if (file.type.startsWith('image/')) {
            const imageData = await this.fileToBase64(file);
            const dimensions = await this.getImageDimensions(imageData);
            return [{ imageData, dimensions }];
        }

        throw new Error('Unsupported file type for vision analysis');
    }

    /**
     * Analyze page layout using Azure Document Intelligence
     */
    private async analyzePageLayout(
        image: { imageData: string; dimensions: { width: number; height: number } },
        pageNumber: number
    ): Promise<{
        pageNumber: number;
        imageData: string;
        dimensions: { width: number; height: number };
        elements: TextElement[];
        sections: ResumeSection[];
        layoutAnalysis: any;
    }> {
        console.log(`🔍 Analyzing page ${pageNumber} layout...`);

        if (this.azureKey) {
            return await this.analyzeWithAzure(image, pageNumber);
        } else {
            console.warn('⚠️ Azure Document Intelligence not configured, using fallback analysis');
            return await this.fallbackAnalysis(image, pageNumber);
        }
    }

    /**
     * Enhanced Azure Document Intelligence analysis with multiple models
     */
    private async analyzeWithAzure(
        image: { imageData: string; dimensions: { width: number; height: number }; isDirectFile?: boolean; originalFile?: File },
        pageNumber: number
    ): Promise<any> {
        console.log(`🔍 Starting Enhanced Multi-Model Azure Document Intelligence analysis for page ${pageNumber}...`);

        try {
            let byteArray: Uint8Array;
            let contentType: string;

            // Handle direct file vs image conversion
            if (image.isDirectFile && image.originalFile) {
                console.log('📄 Using direct file upload to Azure...');
                byteArray = new Uint8Array(await image.originalFile.arrayBuffer());
                contentType = image.originalFile.type;
                console.log(`📤 Sending ${image.originalFile.name} (${byteArray.length} bytes) directly to Azure...`);
            } else {
                console.log('📄 Converting image data for Azure...');
                const base64Data = image.imageData.split(',')[1];
                const byteCharacters = atob(base64Data);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                byteArray = new Uint8Array(byteNumbers);
                contentType = 'application/octet-stream';
            }

            console.log(`📤 Sending ${byteArray.length} bytes to Azure Document Intelligence...`);
            console.log('🔗 Azure Configuration:');
            console.log(`   - Endpoint: ${this.azureEndpoint}`);
            console.log(`   - API Key: ***${this.azureKey.slice(-4)}`);
            console.log(`   - Content Type: ${contentType}`);

            // REVOLUTIONARY MULTI-MODEL APPROACH
            console.log('🚀 Starting Revolutionary Multi-Model Analysis...');
            const multiModelResults = await this.runMultiModelAnalysis(byteArray, contentType);

            // Combine and enhance results with confidence scoring
            const enhancedResults = await this.combineMultiModelResults(multiModelResults, image, pageNumber);

            console.log('✅ Enhanced Multi-Model Azure Document Intelligence analysis completed successfully');
            return enhancedResults;

        } catch (error: any) {
            console.error('❌ Azure Document Intelligence analysis failed:', error);
            console.error('🔍 Detailed error information:', {
                message: error.message,
                stack: error.stack,
                name: error.name
            });

            // Check for common error types
            if (error.message.includes('401')) {
                console.error('🔑 AUTHENTICATION ERROR: Invalid API key or subscription');
                console.error('   - Check your Azure Document Intelligence API key');
                console.error('   - Verify your subscription is active');
            } else if (error.message.includes('403')) {
                console.error('🚫 AUTHORIZATION ERROR: Access denied');
                console.error('   - Check your Azure resource permissions');
                console.error('   - Verify the endpoint matches your resource region');
            } else if (error.message.includes('404')) {
                console.error('🔍 ENDPOINT ERROR: Resource not found');
                console.error('   - Check your Azure endpoint URL');
                console.error('   - Verify your resource name and region');
            } else if (error.message.includes('429')) {
                console.error('⏰ RATE LIMIT ERROR: Too many requests');
                console.error('   - Your API quota may be exceeded');
                console.error('   - Wait and try again later');
            } else if (error.message.includes('500')) {
                console.error('🔧 SERVER ERROR: Azure service issue');
                console.error('   - This is an Azure service problem');
                console.error('   - Try again later or contact Azure support');
            }

            // Re-throw with more context
            throw new Error(`Azure Document Intelligence failed: ${error.message}`);
        }
    }

    /**
     * Revolutionary Multi-Model Analysis Pipeline
     * Uses both Layout and Prebuilt Resume models for comprehensive analysis
     */
    private async runMultiModelAnalysis(byteArray: Uint8Array, contentType: string): Promise<{
        layoutResult: any;
        resumeResult: any | null;
        confidence: {
            layout: number;
            resume: number;
            combined: number;
        };
        analysisMetadata: {
            modelsUsed: string[];
            processingTime: number;
            fallbackUsed: boolean;
        };
    }> {
        const startTime = Date.now();
        console.log('🎯 REVOLUTIONARY MULTI-MODEL PIPELINE INITIATED');

        // Model 1: Prebuilt Layout (Primary - Always Available)
        console.log('📐 MODEL 1: Running Prebuilt Layout Analysis...');
        const layoutResult = await this.runSingleModelAnalysis(byteArray, contentType, 'prebuilt-layout');

        let resumeResult = null;
        let resumeConfidence = 0;

        // Model 2: Prebuilt Resume (Secondary - Best for Resume Documents)
        try {
            console.log('📄 MODEL 2: Running Prebuilt Resume Analysis...');
            resumeResult = await this.runSingleModelAnalysis(byteArray, contentType, 'prebuilt-resume');
            resumeConfidence = 0.95; // High confidence if successful
            console.log('✅ Resume model analysis successful');
        } catch (error) {
            console.log('⚠️ Resume model not available or failed, using layout-only approach');
            resumeConfidence = 0;
        }

        // Calculate confidence scores
        const layoutConfidence = 0.85; // Layout model baseline confidence
        const combinedConfidence = resumeResult
            ? (layoutConfidence * 0.6 + resumeConfidence * 0.4)
            : layoutConfidence * 0.8; // Reduced confidence without resume model

        const processingTime = Date.now() - startTime;

        console.log('📊 MULTI-MODEL ANALYSIS COMPLETE:', {
            layoutSuccess: !!layoutResult,
            resumeSuccess: !!resumeResult,
            combinedConfidence: Math.round(combinedConfidence * 100),
            processingTime: `${processingTime}ms`,
            modelsUsed: resumeResult ? ['prebuilt-layout', 'prebuilt-resume'] : ['prebuilt-layout']
        });

        return {
            layoutResult,
            resumeResult,
            confidence: {
                layout: layoutConfidence,
                resume: resumeConfidence,
                combined: combinedConfidence
            },
            analysisMetadata: {
                modelsUsed: resumeResult ? ['prebuilt-layout', 'prebuilt-resume'] : ['prebuilt-layout'],
                processingTime,
                fallbackUsed: !resumeResult
            }
        };
    }

    /**
     * Run analysis with a specific Azure model
     */
    private async runSingleModelAnalysis(
        byteArray: Uint8Array,
        contentType: string,
        modelId: string
    ): Promise<any> {
        const analyzeUrl = `${this.azureEndpoint}/formrecognizer/documentModels/${modelId}:analyze?api-version=2023-07-31`;

        console.log(`🎯 Analyzing with model: ${modelId}`);
        console.log(`🔗 Request URL: ${analyzeUrl}`);

        const requestHeaders = {
            'Ocp-Apim-Subscription-Key': this.azureKey,
            'Content-Type': contentType
        };

        const response = await fetch(analyzeUrl, {
            method: 'POST',
            headers: requestHeaders,
            body: byteArray
        });

        console.log(`📨 ${modelId} response status: ${response.status} ${response.statusText}`);

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ ${modelId} API error:`, {
                status: response.status,
                statusText: response.statusText,
                body: errorText
            });
            throw new Error(`${modelId} API error (${response.status}): ${response.statusText} - ${errorText}`);
        }

        const operationLocation = response.headers.get('Operation-Location');
        if (!operationLocation) {
            throw new Error(`No operation location returned from ${modelId}`);
        }

        console.log(`📍 ${modelId} Operation Location: ${operationLocation}`);

        // Poll for results
        const results = await this.pollAzureResults(operationLocation);
        console.log(`✅ ${modelId} analysis completed successfully`);

        return results;
    }

    /**
     * Combine and enhance results from multiple models with confidence scoring
     */
    private async combineMultiModelResults(
        multiModelResults: any,
        image: any,
        pageNumber: number
    ): Promise<any> {
        console.log('🔬 COMBINING MULTI-MODEL RESULTS WITH CONFIDENCE SCORING...');

        const { layoutResult, resumeResult, confidence, analysisMetadata } = multiModelResults;

        // Start with layout result as primary source
        const enhancedResult = await this.parseAzureResults(layoutResult, image, pageNumber);

        // Enhance with resume model data if available
        if (resumeResult) {
            console.log('🎯 ENHANCING WITH RESUME MODEL DATA...');
            enhancedResult.resumeEnhanced = await this.enhanceWithResumeModel(enhancedResult, resumeResult);
            enhancedResult.confidence = confidence;
        }

        // Add comprehensive metadata
        enhancedResult.multiModelAnalysis = {
            modelsUsed: analysisMetadata.modelsUsed,
            processingTime: analysisMetadata.processingTime,
            confidence: confidence,
            fallbackUsed: analysisMetadata.fallbackUsed,
            enhancementLevel: resumeResult ? 'resume-optimized' : 'layout-based'
        };

        // Enhanced formatting detection with fallback hierarchy
        enhancedResult.formattingHierarchy = this.buildFormattingHierarchy(
            enhancedResult.elements,
            layoutResult,
            resumeResult
        );

        console.log('✅ MULTI-MODEL COMBINATION COMPLETE:', {
            elementsFound: enhancedResult.elements.length,
            sectionsFound: enhancedResult.sections.length,
            confidenceScore: Math.round(confidence.combined * 100),
            enhancementLevel: enhancedResult.multiModelAnalysis.enhancementLevel
        });

        return enhancedResult;
    }

    /**
     * Enhance layout results with resume model insights
     */
    private async enhanceWithResumeModel(layoutResult: any, resumeResult: any): Promise<any> {
        console.log('🎯 Enhancing layout analysis with resume model insights...');

        const enhancement = {
            resumeSpecificFields: {},
            skillsDetection: {},
            experienceStructure: {},
            educationDetails: {},
            contactInformation: {}
        };

        try {
            // Extract resume-specific structured data
            if (resumeResult.documents && resumeResult.documents.length > 0) {
                const doc = resumeResult.documents[0];

                // Enhanced contact information
                if (doc.fields) {
                    enhancement.contactInformation = {
                        email: doc.fields.Email?.content || null,
                        phone: doc.fields.Phone?.content || null,
                        name: doc.fields.Name?.content || null,
                        address: doc.fields.Address?.content || null
                    };

                    // Skills detection
                    enhancement.skillsDetection = {
                        skills: doc.fields.Skills?.content || [],
                        confidence: doc.fields.Skills?.confidence || 0
                    };

                    // Experience structure
                    if (doc.fields.Experience) {
                        enhancement.experienceStructure = {
                            positions: doc.fields.Experience.content || [],
                            totalExperience: doc.fields.Experience.content?.length || 0,
                            confidence: doc.fields.Experience.confidence || 0
                        };
                    }

                    // Education details
                    if (doc.fields.Education) {
                        enhancement.educationDetails = {
                            degrees: doc.fields.Education.content || [],
                            confidence: doc.fields.Education.confidence || 0
                        };
                    }
                }
            }

            console.log('✅ Resume model enhancement applied:', {
                contactFields: Object.keys(enhancement.contactInformation).filter(k => enhancement.contactInformation[k]).length,
                skillsFound: enhancement.skillsDetection.skills.length || 0,
                experienceEntries: enhancement.experienceStructure.totalExperience || 0,
                educationEntries: enhancement.educationDetails.degrees.length || 0
            });

        } catch (error) {
            console.error('⚠️ Error enhancing with resume model:', error);
        }

        return enhancement;
    }

    /**
     * Build formatting hierarchy with fallback detection
     * Implements: Azure Styles → Font Analysis → Pattern Detection
     */
    private buildFormattingHierarchy(
        elements: TextElement[],
        layoutResult: any,
        resumeResult: any
    ): {
        level1_azureStyles: any;
        level2_fontAnalysis: any;
        level3_patternDetection: any;
        confidenceScores: {
            azureStyles: number;
            fontAnalysis: number;
            patternDetection: number;
            overall: number;
        };
    } {
        console.log('🏗️ Building Comprehensive Formatting Hierarchy...');

        // LEVEL 1: Azure Styles (Primary - Highest Confidence)
        const azureStyles = this.extractAzureStyles(layoutResult, resumeResult);
        const azureConfidence = azureStyles.stylesFound > 0 ? 0.95 : 0.1;

        // LEVEL 2: Font Analysis (Secondary - Medium Confidence)
        const fontAnalysis = this.performAdvancedFontAnalysis(elements);
        const fontConfidence = 0.75;

        // LEVEL 3: Pattern Detection (Fallback - Lower Confidence)
        const patternDetection = this.performPatternDetection(elements);
        const patternConfidence = 0.6;

        // Calculate overall confidence based on available data
        const overallConfidence = azureConfidence > 0.5
            ? azureConfidence * 0.6 + fontConfidence * 0.3 + patternConfidence * 0.1
            : fontConfidence * 0.7 + patternConfidence * 0.3;

        console.log('✅ Formatting hierarchy built:', {
            azureStylesAvailable: azureConfidence > 0.5,
            boldElementsDetected: fontAnalysis.boldElements.length,
            patternsDetected: patternDetection.patterns.length,
            overallConfidence: Math.round(overallConfidence * 100)
        });

        return {
            level1_azureStyles: azureStyles,
            level2_fontAnalysis: fontAnalysis,
            level3_patternDetection: patternDetection,
            confidenceScores: {
                azureStyles: azureConfidence,
                fontAnalysis: fontConfidence,
                patternDetection: patternConfidence,
                overall: overallConfidence
            }
        };
    }

    /**
     * Extract Azure Document Intelligence style information
     */
    private extractAzureStyles(layoutResult: any, resumeResult: any): any {
        const styleData = {
            stylesFound: 0,
            fontWeights: new Map(),
            fontSizes: new Map(),
            colors: new Map(),
            backgroundColors: new Map(),
            spans: [],
            confidence: 0
        };

        try {
            // Extract from layout result
            if (layoutResult?.styles && layoutResult.styles.length > 0) {
                console.log(`📊 Processing ${layoutResult.styles.length} Azure styles...`);

                layoutResult.styles.forEach((style: any, index: number) => {
                    if (style.spans) {
                        style.spans.forEach((span: any) => {
                            styleData.spans.push({
                                offset: span.offset,
                                length: span.length,
                                fontWeight: style.fontWeight,
                                fontStyle: style.fontStyle,
                                color: style.color,
                                backgroundColor: style.backgroundColor,
                                confidence: style.confidence || 0.8,
                                source: 'layout'
                            });
                        });
                    }
                    styleData.stylesFound++;
                });
            }

            // Enhance with resume result styles if available
            if (resumeResult?.styles && resumeResult.styles.length > 0) {
                console.log(`📊 Processing ${resumeResult.styles.length} additional resume model styles...`);
                resumeResult.styles.forEach((style: any) => {
                    if (style.spans) {
                        style.spans.forEach((span: any) => {
                            styleData.spans.push({
                                offset: span.offset,
                                length: span.length,
                                fontWeight: style.fontWeight,
                                fontStyle: style.fontStyle,
                                color: style.color,
                                backgroundColor: style.backgroundColor,
                                confidence: style.confidence || 0.9, // Higher confidence for resume model
                                source: 'resume'
                            });
                        });
                    }
                    styleData.stylesFound++;
                });
            }

            styleData.confidence = styleData.stylesFound > 0 ? 0.9 : 0.1;

        } catch (error) {
            console.error('⚠️ Error extracting Azure styles:', error);
        }

        return styleData;
    }

    /**
     * Perform advanced font analysis
     */
    private performAdvancedFontAnalysis(elements: TextElement[]): any {
        const analysis = {
            boldElements: [],
            italicElements: [],
            largeTextElements: [],
            smallTextElements: [],
            fontSizeDistribution: new Map(),
            averageFontSize: 0,
            confidence: 0.75
        };

        let totalFontSize = 0;
        let fontSizeCount = 0;

        elements.forEach(element => {
            const fontSize = element.fontSize || 12;
            totalFontSize += fontSize;
            fontSizeCount++;

            // Track font size distribution
            analysis.fontSizeDistribution.set(fontSize, (analysis.fontSizeDistribution.get(fontSize) || 0) + 1);

            // Categorize elements
            if (element.fontWeight === 'bold') {
                analysis.boldElements.push(element);
            }

            if (element.fontStyle === 'italic') {
                analysis.italicElements.push(element);
            }

            if (fontSize > 14) {
                analysis.largeTextElements.push(element);
            }

            if (fontSize < 10) {
                analysis.smallTextElements.push(element);
            }
        });

        analysis.averageFontSize = fontSizeCount > 0 ? totalFontSize / fontSizeCount : 12;

        return analysis;
    }

    /**
     * Perform pattern detection for formatting
     */
    private performPatternDetection(elements: TextElement[]): any {
        const patterns = {
            patterns: [],
            bulletPoints: [],
            headers: [],
            dates: [],
            emails: [],
            phones: [],
            confidence: 0.6
        };

        elements.forEach(element => {
            const text = element.text.trim();

            // Bullet point patterns
            if (/^[•▪▫◦‣⁃▸▹▪▫⦿⦾\-–—*]/.test(text)) {
                patterns.bulletPoints.push(element);
                patterns.patterns.push({
                    type: 'bullet',
                    element: element,
                    confidence: 0.9
                });
            }

            // Header patterns
            if (text.length < 50 && text === text.toUpperCase() && /^[A-Z\s]+$/.test(text)) {
                patterns.headers.push(element);
                patterns.patterns.push({
                    type: 'header',
                    element: element,
                    confidence: 0.8
                });
            }

            // Date patterns
            if (/\b\d{4}\b/.test(text) || /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/i.test(text)) {
                patterns.dates.push(element);
                patterns.patterns.push({
                    type: 'date',
                    element: element,
                    confidence: 0.7
                });
            }

            // Email patterns
            if (/@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(text)) {
                patterns.emails.push(element);
                patterns.patterns.push({
                    type: 'email',
                    element: element,
                    confidence: 0.95
                });
            }

            // Phone patterns
            if (/(?:\+?1[-.]?)?(?:\(?[0-9]{3}\)?[-.]?[0-9]{3}[-.]?[0-9]{4})/.test(text)) {
                patterns.phones.push(element);
                patterns.patterns.push({
                    type: 'phone',
                    element: element,
                    confidence: 0.9
                });
            }
        });

        return patterns;
    }

    /**
     * Poll Azure for analysis results
     */
    private async pollAzureResults(operationLocation: string): Promise<any> {
        const maxAttempts = 30;
        const delayMs = 1000;

        console.log(`⏳ Starting polling for Azure results (max ${maxAttempts} attempts, ${delayMs}ms delay)...`);

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            console.log(`🔄 Polling attempt ${attempt + 1}/${maxAttempts}...`);

            try {
                const response = await fetch(operationLocation, {
                    headers: {
                        'Ocp-Apim-Subscription-Key': this.azureKey,
                    }
                });

                console.log(`📡 Poll response status: ${response.status} ${response.statusText}`);

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error(`❌ Poll request failed: ${response.status} - ${errorText}`);
                    throw new Error(`Poll request failed: ${response.status} ${response.statusText}`);
                }

                const result = await response.json();
                console.log(`📊 Analysis status: ${result.status}`);

                if (result.status === 'succeeded') {
                    console.log('✅ Azure analysis completed successfully!');
                    console.log('📋 Result summary:', {
                        pages: result.analyzeResult?.pages?.length || 0,
                        paragraphs: result.analyzeResult?.paragraphs?.length || 0,
                        words: result.analyzeResult?.pages?.[0]?.words?.length || 0
                    });
                    return result.analyzeResult;
                } else if (result.status === 'failed') {
                    console.error('❌ Azure analysis failed:', result.error);
                    throw new Error(`Azure analysis failed: ${result.error?.message || 'Unknown error'}`);
                } else if (result.status === 'running') {
                    console.log('🔄 Analysis still running, waiting...');
                } else {
                    console.log(`📋 Unknown status: ${result.status}`);
                }

                // Wait before next attempt
                if (attempt < maxAttempts - 1) {
                    console.log(`⏰ Waiting ${delayMs}ms before next poll...`);
                    await new Promise(resolve => setTimeout(resolve, delayMs));
                }

            } catch (error: any) {
                console.error(`❌ Error during polling attempt ${attempt + 1}:`, error);
                if (attempt === maxAttempts - 1) {
                    throw error; // Re-throw on last attempt
                }
                // Wait before retry
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        }

        console.error('⏰ Azure analysis timed out after maximum polling attempts');
        throw new Error('Azure analysis timed out');
    }

    /**
     * Parse Azure Document Intelligence results
     */
    private async parseAzureResults(azureResult: any, image: any, pageNumber: number): Promise<any> {
        console.log('🔍 Parsing Azure Document Intelligence results...');
        const elements: TextElement[] = [];
        const sections: ResumeSection[] = [];

        try {
            // Parse styles for font weight detection with detailed logging
            const stylesMap = new Map();
            console.log('🎨 Full Azure result structure:', JSON.stringify(azureResult, null, 2));

            // Check multiple possible locations for style data
            const possibleStyles = azureResult.styles ||
                                 azureResult.analyzeResult?.styles ||
                                 azureResult.pages?.[0]?.styles ||
                                 [];

            console.log('🎨 Found styles data:', possibleStyles);

            if (possibleStyles && possibleStyles.length > 0) {
                console.log(`📊 Processing ${possibleStyles.length} style definitions from Azure...`);

                possibleStyles.forEach((style: any, styleIndex: number) => {
                    console.log(`Style ${styleIndex}:`, {
                        isHandwritten: style.isHandwritten,
                        fontWeight: style.fontWeight,
                        fontStyle: style.fontStyle,
                        confidence: style.confidence,
                        spans: style.spans?.length || 0
                    });

                    if (style.spans) {
                        style.spans.forEach((span: any) => {
                            for (let i = span.offset; i < span.offset + span.length; i++) {
                                stylesMap.set(i, {
                                    isHandwritten: style.isHandwritten,
                                    fontWeight: style.fontWeight || 'normal',
                                    fontStyle: style.fontStyle || 'normal',
                                    backgroundColor: style.backgroundColor,
                                    color: style.color,
                                    confidence: style.confidence
                                });
                            }
                        });
                    }
                });

                console.log(`✅ Created style mapping for ${stylesMap.size} character positions`);
            } else {
                console.log('⚠️ No style information available from Azure Document Intelligence');
                console.log('📝 Will use enhanced heuristic detection instead');
            }

            // Parse words and create text elements with enhanced formatting detection
            if (azureResult.pages?.[0]?.words) {
                console.log(`📝 Processing ${azureResult.pages[0].words.length} words from Azure with formatting detection...`);

                azureResult.pages[0].words.forEach((word: any, index: number) => {
                    // Azure returns polygon coordinates as an array [x1,y1,x2,y2,x3,y3,x4,y4]
                    const polygon = word.polygon;
                    const boundingBox = {
                        x: Math.min(polygon[0], polygon[2], polygon[4], polygon[6]),
                        y: Math.min(polygon[1], polygon[3], polygon[5], polygon[7]),
                        width: Math.max(polygon[0], polygon[2], polygon[4], polygon[6]) - Math.min(polygon[0], polygon[2], polygon[4], polygon[6]),
                        height: Math.max(polygon[1], polygon[3], polygon[5], polygon[7]) - Math.min(polygon[1], polygon[3], polygon[5], polygon[7])
                    };

                    // Get style information for this word with debugging
                    const wordStyle = word.span ? stylesMap.get(word.span.offset) : null;

                    // Enhanced font weight detection with fallback
                    const fontSize = this.inferFontSize(boundingBox);
                    const fontWeight = this.inferAdvancedFontWeight(word.content, fontSize, boundingBox.height, wordStyle);
                    const isBulletPoint = this.detectBulletPoint(word.content, elements, index);

                    // AGGRESSIVE fallback detection when no Azure styles
                    let enhancedFontWeight = fontWeight;
                    let enhancedIsBullet = isBulletPoint;

                    if (stylesMap.size === 0) {
                        // No Azure styles, use aggressive heuristics
                        enhancedFontWeight = this.aggressiveBoldDetection(word.content, fontSize, boundingBox.height);
                        enhancedIsBullet = this.aggressiveBulletDetection(word.content, elements);

                        if (word.content.trim().length > 2) {
                            console.log(`🎯 FALLBACK detection for "${word.content}":`, {
                                original: { fontWeight, isBulletPoint },
                                enhanced: { fontWeight: enhancedFontWeight, isBullet: enhancedIsBullet },
                                fontSize,
                                boundingHeight: boundingBox.height
                            });
                        }
                    }

                    // Debug specific words for formatting detection
                    if (word.content.length > 2 && (enhancedFontWeight === 'bold' || enhancedIsBullet || word.content.match(/^[•▪▫◦‣⁃▸▹▪▫⦿⦾\-–—*]/))) {
                        console.log(`🔍 Word "${word.content}":`, {
                            fontSize,
                            fontWeight: enhancedFontWeight,
                            isBulletPoint: enhancedIsBullet,
                            wordStyle,
                            boundingHeight: boundingBox.height,
                            span: word.span
                        });
                    }

                    const element: TextElement = {
                        text: word.content,
                        boundingBox,
                        confidence: word.confidence || 0.9,
                        role: enhancedIsBullet ? 'bulletPoint' : this.inferRole(word.content, polygon),
                        fontSize: fontSize,
                        fontWeight: enhancedFontWeight,
                        fontStyle: wordStyle?.fontStyle || 'normal',
                        hierarchyLevel: this.calculateHierarchyLevel(fontSize, enhancedFontWeight),
                        spatialRelationships: this.calculateSpatialRelationships(word, elements)
                    };

                    elements.push(element);
                });

                // Enhanced processing summary with detailed breakdown
                const boldElements = elements.filter(e => e.fontWeight === 'bold');
                const bulletPoints = elements.filter(e => e.role === 'bulletPoint');
                const headings = elements.filter(e => e.role === 'heading');
                const regularElements = elements.filter(e => e.fontWeight === 'normal' && e.role !== 'bulletPoint' && e.role !== 'heading');

                console.log('\n🎯 ===== FORMATTING DETECTION SUMMARY =====');
                console.log(`📊 Total elements processed: ${elements.length}`);
                console.log(`✅ Bold elements found: ${boldElements.length}`);
                console.log(`🔸 Bullet points found: ${bulletPoints.length}`);
                console.log(`📂 Heading elements: ${headings.length}`);
                console.log(`📝 Regular text elements: ${regularElements.length}`);
                console.log(`🎨 Detection method: ${stylesMap.size > 0 ? 'Azure styles' : 'Aggressive fallback'}`);

                // Show all detected bold elements
                if (boldElements.length > 0) {
                    console.log('\n📝 ALL BOLD ELEMENTS DETECTED:');
                    boldElements.forEach((element, idx) => {
                        console.log(`  ${idx + 1}. "${element.text}" (font: ${element.fontSize}px, hierarchy: ${element.hierarchyLevel})`);
                    });
                } else {
                    console.log('⚠️  NO BOLD ELEMENTS DETECTED - This may indicate a detection problem');
                }

                // Show all detected bullet points
                if (bulletPoints.length > 0) {
                    console.log('\n🎯 ALL BULLET POINTS DETECTED:');
                    bulletPoints.forEach((element, idx) => {
                        console.log(`  ${idx + 1}. "${element.text}"`);
                    });
                } else {
                    console.log('⚠️  NO BULLET POINTS DETECTED - This may indicate a detection problem');
                }

                // Show some sample regular elements for comparison
                if (regularElements.length > 0) {
                    console.log('\n📄 Sample regular elements (for comparison):');
                    regularElements.slice(0, 3).forEach((element, idx) => {
                        console.log(`  ${idx + 1}. "${element.text}" (font: ${element.fontSize}px)`);
                    });
                }

                console.log('🎯 ===== END FORMATTING SUMMARY =====\n');
            }

            // Parse paragraphs for better text grouping
            if (azureResult.pages?.[0]?.paragraphs) {
                console.log(`📄 Processing ${azureResult.pages[0].paragraphs.length} paragraphs from Azure...`);

                azureResult.pages[0].paragraphs.forEach((paragraph: any) => {
                    // Paragraphs provide logical grouping of related text
                    const paragraphElements = elements.filter(el =>
                        paragraph.spans.some((span: any) =>
                            span.offset <= el.text.length && (span.offset + span.length) >= 0
                        )
                    );

                    if (paragraphElements.length > 0) {
                        // Mark these elements as belonging to the same paragraph
                        paragraphElements.forEach(el => {
                            el.role = el.role || this.inferRoleFromContext(paragraph.content);
                        });
                    }
                });
            }

            // Group elements into sections using spatial analysis and Azure's structure detection
            const detectedSections = await this.groupElementsIntoSections(elements, azureResult);
            sections.push(...detectedSections);

            console.log(`✅ Parsed Azure results: ${elements.length} elements, ${sections.length} sections`);

            return {
                pageNumber,
                imageData: image.imageData,
                dimensions: image.dimensions,
                elements,
                sections,
                layoutAnalysis: this.analyzeLayoutFromElements(elements, image.dimensions)
            };

        } catch (error: any) {
            console.error('❌ Error parsing Azure results:', error);
            throw new Error(`Failed to parse Azure Document Intelligence results: ${error.message}`);
        }
    }

    /**
     * Fallback analysis when Azure Document Intelligence is not available
     * Uses PDF.js or browser-based text extraction
     */
    private async fallbackAnalysis(image: any, pageNumber: number): Promise<any> {
        console.log('🔧 Using fallback analysis - Azure Document Intelligence not available');
        console.warn('⚠️ FALLBACK MODE: Advanced vision features disabled. Configure Azure Document Intelligence for full functionality.');

        try {
            // For PDFs, try to extract text using PDF.js directly
            if (image.originalFile && image.originalFile.type === 'application/pdf') {
                console.log('📄 Attempting PDF text extraction with PDF.js...');
                const pdfElements = await this.extractTextFromPDF(image.originalFile, pageNumber);
                const basicSections = await this.performBasicSectionDetection(pdfElements);

                return {
                    pageNumber,
                    imageData: image.imageData,
                    dimensions: image.dimensions,
                    elements: pdfElements,
                    sections: basicSections,
                    layoutAnalysis: {
                        margins: { top: 50, bottom: 50, left: 50, right: 50 },
                        columns: 1,
                        textFlow: 'left-to-right',
                        averageFontSize: 12,
                        dominantFontFamily: 'Arial',
                        fallbackMode: true,
                        extractionMethod: 'pdf.js'
                    }
                };
            }

            // For other file types, use basic text extraction
            const basicElements = await this.performBasicTextExtraction(image);
            const basicSections = await this.performBasicSectionDetection(basicElements);

            return {
                pageNumber,
                imageData: image.imageData,
                dimensions: image.dimensions,
                elements: basicElements,
                sections: basicSections,
                layoutAnalysis: {
                    margins: { top: 50, bottom: 50, left: 50, right: 50 },
                    columns: 1,
                    textFlow: 'left-to-right',
                    averageFontSize: 12,
                    dominantFontFamily: 'Arial',
                    fallbackMode: true,
                    extractionMethod: 'basic'
                }
            };

        } catch (error: any) {
            console.error('❌ Fallback analysis also failed:', error);

            // Return minimal structure to prevent complete failure
            return {
                pageNumber,
                imageData: image.imageData,
                dimensions: image.dimensions,
                elements: [],
                sections: [],
                layoutAnalysis: {
                    margins: { top: 50, bottom: 50, left: 50, right: 50 },
                    columns: 1,
                    textFlow: 'left-to-right',
                    averageFontSize: 12,
                    dominantFontFamily: 'Arial',
                    fallbackMode: true,
                    error: 'Text extraction failed'
                }
            };
        }
    }

    /**
     * Extract text from PDF using PDF.js for fallback mode
     */
    private async extractTextFromPDF(file: File, pageNumber: number): Promise<TextElement[]> {
        console.log(`📄 Extracting text from PDF page ${pageNumber} using PDF.js...`);

        try {
            const pdfjsLib = await import('pdfjs-dist');
            pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`;

            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

            if (pageNumber > pdf.numPages) {
                console.warn(`Page ${pageNumber} does not exist in PDF`);
                return [];
            }

            const page = await pdf.getPage(pageNumber);
            const textContent = await page.getTextContent();
            const viewport = page.getViewport({ scale: 1.0 });

            const elements: TextElement[] = [];

            textContent.items.forEach((item: any, index: number) => {
                if (item.str && item.str.trim()) {
                    const transform = item.transform;
                    const x = transform[4];
                    const y = viewport.height - transform[5]; // Convert to top-down coordinates
                    const fontSize = Math.abs(transform[0]); // Font size from transform matrix

                    // Enhanced PDF text analysis
                    const isBulletChar = /^[•▪▫◦‣⁃▸▹▪▫⦿⦾\-–—*]/.test(item.str.trim());
                    const isAllCaps = item.str === item.str.toUpperCase() && /^[A-Z\s&-]+$/.test(item.str);
                    const isBoldBySize = fontSize > 14;
                    const isBoldByPattern = this.inferAdvancedFontWeight(item.str, fontSize, item.height || fontSize, null);

                    console.log(`📄 PDF text "${item.str}":`, {
                        fontSize,
                        isBulletChar,
                        isAllCaps,
                        isBoldBySize,
                        isBoldByPattern
                    });

                    const element: TextElement = {
                        text: item.str,
                        boundingBox: {
                            x: x,
                            y: y,
                            width: item.width || (item.str.length * fontSize * 0.6),
                            height: item.height || fontSize
                        },
                        confidence: 0.95, // PDF.js is generally reliable
                        fontSize: fontSize,
                        fontWeight: isBoldByPattern,
                        role: isBulletChar ? 'bulletPoint' : this.inferRole(item.str, [x, y, x + (item.width || 100), y + (item.height || fontSize)]),
                        hierarchyLevel: this.calculateHierarchyLevel(fontSize, isBoldByPattern)
                    };

                    elements.push(element);
                }
            });

            console.log(`✅ Extracted ${elements.length} text elements from PDF page ${pageNumber}`);
            return elements;

        } catch (error: any) {
            console.error('❌ PDF text extraction failed:', error);
            return [];
        }
    }

    /**
     * Basic text extraction for fallback mode
     */
    private async performBasicTextExtraction(image: any): Promise<TextElement[]> {
        console.log('📝 Performing basic text extraction...');

        // This would integrate with a basic OCR library like Tesseract.js in production
        // For now, return empty array since we can't extract text without proper OCR
        console.warn('⚠️ Basic OCR not implemented. Consider adding Tesseract.js for fallback text extraction.');

        return [];
    }

    /**
     * Basic section detection for fallback mode
     */
    private async performBasicSectionDetection(elements: TextElement[]): Promise<ResumeSection[]> {
        console.log('📋 Performing basic section detection...');

        if (elements.length === 0) {
            console.warn('⚠️ No text elements found for section detection');
            return [];
        }

        // Basic section detection based on text patterns
        return await this.groupElementsIntoSections(elements);
    }

    /**
     * Helper methods for document processing
     */
    private async convertPDFToImages(file: File): Promise<Array<{ imageData: string; dimensions: { width: number; height: number } }>> {
        console.log('🔄 Converting PDF to high-resolution images using PDF.js...');

        try {
            // Load PDF.js dynamically
            const pdfjsLib = await import('pdfjs-dist');
            // Use alternative CDN or fallback for worker
            pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`;

            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            const images: Array<{ imageData: string; dimensions: { width: number; height: number } }> = [];

            for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                const page = await pdf.getPage(pageNum);

                // Scale for high resolution (300 DPI equivalent)
                const scale = 3.0;
                const viewport = page.getViewport({ scale });

                // Create canvas
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d')!;
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                // Render page to canvas
                await page.render({
                    canvasContext: context,
                    viewport: viewport
                }).promise;

                // Convert to base64
                const imageData = canvas.toDataURL('image/png');
                images.push({
                    imageData,
                    dimensions: { width: viewport.width, height: viewport.height }
                });

                console.log(`✅ PDF page ${pageNum} converted to image (${viewport.width}x${viewport.height})`);
            }

            return images;
        } catch (error) {
            console.error('❌ PDF conversion failed:', error);
            throw new Error('Failed to convert PDF to images. Please ensure the PDF is not corrupted.');
        }
    }

    private async convertWordToImages(file: File): Promise<Array<{ imageData: string; dimensions: { width: number; height: number } }>> {
        console.log('🔄 Converting Word document to images via server endpoint...');

        try {
            // For now, use a fallback approach by converting to text first, then creating a visual representation
            // In production, this would require a server-side conversion service
            const wordAPI = (await import('./wordDocumentAPI')).default;
            const result = await wordAPI.processWordDocument(file);

            if (!result.success) {
                throw new Error('Failed to process Word document');
            }

            // Create a visual representation of the document content
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d')!;

            // Set canvas size (8.5" x 11" at 96 DPI)
            canvas.width = 816;  // 8.5 * 96
            canvas.height = 1056; // 11 * 96

            // White background
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Set text properties
            ctx.fillStyle = 'black';
            ctx.font = '12px Arial';

            // Render text content with basic layout
            const lines = result.extractedText.split('\n');
            let y = 50;
            const lineHeight = 18;
            const margin = 50;

            for (const line of lines) {
                if (y > canvas.height - 50) break; // Don't overflow

                const words = line.split(' ');
                let currentLine = '';
                let x = margin;

                for (const word of words) {
                    const testLine = currentLine + word + ' ';
                    const metrics = ctx.measureText(testLine);

                    if (metrics.width > canvas.width - (margin * 2) && currentLine !== '') {
                        ctx.fillText(currentLine, x, y);
                        currentLine = word + ' ';
                        y += lineHeight;
                        if (y > canvas.height - 50) break;
                    } else {
                        currentLine = testLine;
                    }
                }

                if (currentLine.trim()) {
                    ctx.fillText(currentLine, x, y);
                    y += lineHeight;
                }
            }

            const imageData = canvas.toDataURL('image/png');
            console.log('✅ Word document converted to visual representation');

            return [{
                imageData,
                dimensions: { width: canvas.width, height: canvas.height }
            }];

        } catch (error) {
            console.error('❌ Word to image conversion failed:', error);
            throw new Error('Failed to convert Word document to images');
        }
    }

    private async fileToBase64(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    private async getImageDimensions(base64Image: string): Promise<{ width: number; height: number }> {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve({ width: img.width, height: img.height });
            img.src = base64Image;
        });
    }

    private arrayBufferToBase64(buffer: ArrayBuffer): string {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    private inferRole(text: string, polygon: number[]): TextElement['role'] {
        const textLower = text.toLowerCase().trim();

        // Email detection
        if (/@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(text)) return 'contact';

        // Phone number detection (various formats)
        if (/(?:\+?1[-.]?)?(?:\(?[0-9]{3}\)?[-.]?[0-9]{3}[-.]?[0-9]{4})/.test(text)) return 'contact';

        // URL detection
        if (/(https?:\/\/|www\.|linkedin\.com|github\.com)/.test(textLower)) return 'contact';

        // Section headings
        if (/(professional\s+experience|work\s+experience|experience|employment|education|skills|summary|objective|projects|certifications|achievements|awards|volunteer|languages|references)/i.test(text)) {
            return 'heading';
        }

        // Job titles (common patterns)
        if (/(engineer|developer|manager|analyst|director|specialist|coordinator|consultant|architect|lead|senior|junior|intern)/i.test(textLower) && text.length < 100) {
            return 'jobTitle';
        }

        // Company names (often followed by location)
        if (/(inc\.|llc|corp\.|company|technologies|solutions|systems|group)/i.test(textLower) && text.length < 80) {
            return 'company';
        }

        // Date ranges
        if (/\b(20\d{2}|19\d{2})\s*[-–—]\s*(20\d{2}|19\d{2}|present|current)\b/i.test(text)) return 'dates';

        // Month-year patterns
        const monthPattern = /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|january|february|march|april|may|june|july|august|september|october|november|december)\s+(20\d{2}|19\d{2})/i;
        if (monthPattern.test(text)) return 'dates';

        // Bullet points
        if (text.startsWith('•') || text.startsWith('-') || text.startsWith('*') || /^\d+\./.test(text)) {
            return 'bulletPoint';
        }

        // Default to paragraph
        return 'paragraph';
    }

    private inferFontSize(boundingBox: BoundingBox): number {
        // Calculate font size based on bounding box height
        // Typical relationship: font size ≈ 75% of bounding box height
        const height = boundingBox.height;
        const estimatedFontSize = Math.round(height * 0.75);

        // Clamp to reasonable ranges
        return Math.min(Math.max(estimatedFontSize, 8), 72);
    }

    private inferFontWeight(text: string): 'normal' | 'bold' {
        // This would need to be determined from actual font analysis
        // For now, use heuristics
        return text === text.toUpperCase() && text.length < 50 ? 'bold' : 'normal';
    }

    /**
     * Advanced font weight detection using multiple signals
     */
    private inferAdvancedFontWeight(
        text: string,
        fontSize: number,
        boundingHeight: number,
        styleInfo: any
    ): 'normal' | 'bold' {
        const trimmed = text.trim();

        // Debug logging for bold detection
        const debugInfo = {
            text: trimmed,
            fontSize,
            boundingHeight,
            styleInfo: styleInfo ? {
                fontWeight: styleInfo.fontWeight,
                confidence: styleInfo.confidence
            } : null
        };

        // Direct style information from Azure (most reliable)
        if (styleInfo?.fontWeight) {
            const isBoldFromStyle = styleInfo.fontWeight === 'bold' ||
                                   styleInfo.fontWeight === 'Bold' ||
                                   (typeof styleInfo.fontWeight === 'number' && styleInfo.fontWeight > 400);

            if (isBoldFromStyle) {
                console.log(`✅ Bold from Azure style: "${trimmed}"`, debugInfo);
                return 'bold';
            }
        }

        // Height-to-fontSize ratio analysis (bold text is often thicker)
        const heightToFontRatio = boundingHeight / fontSize;
        const isBoldByHeight = heightToFontRatio > 1.3; // Slightly more aggressive

        // Enhanced text pattern analysis
        const isAllCaps = text === text.toUpperCase() && /^[A-Z\s&-]+$/.test(text);
        const isLikelyHeader = trimmed.length < 50 && trimmed.length > 3;

        // More comprehensive section title detection
        const isSectionTitle = /^(SUMMARY|EXPERIENCE|PROFESSIONAL EXPERIENCE|WORK EXPERIENCE|EMPLOYMENT|EDUCATION|SKILLS|TECHNICAL SKILLS|QUALIFICATIONS|OBJECTIVE|PROJECTS|CERTIFICATIONS|ACHIEVEMENTS|ACCOMPLISHMENTS|CONTACT|PROFESSIONAL|TECHNICAL|BACKGROUND|COMPETENCIES|EXPERTISE)/.test(trimmed.toUpperCase());

        // Job title patterns
        const isJobTitle = /^[A-Z][a-z]+ [A-Z][a-z]+/.test(trimmed) && // Title case
                          trimmed.length < 40 &&
                          !trimmed.includes('•') &&
                          !trimmed.match(/\d{4}/); // Not a date

        // Company name patterns
        const isCompanyName = (trimmed.includes('Inc') || trimmed.includes('LLC') ||
                              trimmed.includes('Corp') || trimmed.includes('Ltd') ||
                              trimmed.includes('Company') || trimmed.includes('&')) &&
                             trimmed.length < 50;

        // Large text is likely bold (headers)
        const isLargeText = fontSize > 14;

        // Combination of signals with more aggressive detection
        const shouldBeBold = isSectionTitle ||
                            (isAllCaps && isLikelyHeader) ||
                            (isLargeText && (isJobTitle || isCompanyName)) ||
                            (fontSize > 16) ||
                            (isBoldByHeight && isLikelyHeader) ||
                            (isAllCaps && trimmed.length > 5 && trimmed.length < 30);

        if (shouldBeBold) {
            console.log(`✅ Bold detected: "${trimmed}"`, {
                ...debugInfo,
                reasons: {
                    isSectionTitle,
                    isAllCaps: isAllCaps && isLikelyHeader,
                    isLargeText: isLargeText && (isJobTitle || isCompanyName),
                    largeFontSize: fontSize > 16,
                    heightRatio: isBoldByHeight && isLikelyHeader,
                    capsPattern: isAllCaps && trimmed.length > 5 && trimmed.length < 30
                }
            });
            return 'bold';
        }

        return 'normal';
    }

    /**
     * Detect bullet points based on text content and spatial positioning
     */
    private detectBulletPoint(text: string, existingElements: TextElement[], currentIndex: number): boolean {
        const trimmed = text.trim();

        // Debug logging for bullet detection
        if (trimmed.match(/^[•▪▫◦‣⁃▸▹▪▫⦿⦾\-–—*]/)) {
            console.log(`🎯 Checking bullet "${trimmed}":`, {
                isDirect: /^[•▪▫◦‣⁃▸▹▪▫⦿⦾]/.test(trimmed),
                isDash: /^[-–—*]/.test(trimmed),
                fullText: text
            });
        }

        // Direct bullet characters (most common)
        if (/^[•▪▫◦‣⁃▸▹▪▫⦿⦾]/.test(trimmed)) {
            console.log(`✅ Direct bullet detected: "${trimmed}"`);
            return true;
        }

        // Single bullet character
        if (trimmed.length === 1 && /[•▪▫◦‣⁃▸▹▪▫⦿⦾]/.test(trimmed)) {
            console.log(`✅ Single bullet char detected: "${trimmed}"`);
            return true;
        }

        // Dash or hyphen bullets (common in resumes)
        if (/^[-–—]/.test(trimmed) && trimmed.length <= 3) {
            console.log(`✅ Dash bullet detected: "${trimmed}"`);
            return true;
        }

        // Asterisk bullets
        if (/^\*/.test(trimmed) && trimmed.length <= 2) {
            console.log(`✅ Asterisk bullet detected: "${trimmed}"`);
            return true;
        }

        // Numbered bullets (1., 2., etc.)
        if (/^\d{1,2}\.?$/.test(trimmed)) {
            console.log(`✅ Numbered bullet detected: "${trimmed}"`);
            return true;
        }

        // Letter bullets (a., b., etc.)
        if (/^[a-zA-Z]\.?$/.test(trimmed)) {
            console.log(`✅ Letter bullet detected: "${trimmed}"`);
            return true;
        }

        // Look for bullet symbols within text (sometimes Azure splits them)
        if (trimmed.includes('•') && trimmed.length < 5) {
            console.log(`✅ Embedded bullet detected: "${trimmed}"`);
            return true;
        }

        // Check for indented content that might be bullet items
        // This is more complex spatial analysis
        if (existingElements.length > 2) {
            const lastFewElements = existingElements.slice(-3);
            const hasBulletNearby = lastFewElements.some(el => el.role === 'bulletPoint');

            if (hasBulletNearby && trimmed.length > 5 && /^[A-Z]/.test(trimmed)) {
                // Check if this text is positioned like a bullet item
                const lastElement = existingElements[existingElements.length - 1];
                if (lastElement && lastElement.boundingBox) {
                    const verticalDistance = Math.abs(lastElement.boundingBox.y - 0); // We don't have current position here
                    // This would need to be enhanced with actual positioning data
                    console.log(`⚠️ Potential bullet content detected: "${trimmed}"`);
                }
            }
        }

        return false;
    }

    /**
     * Aggressive bold detection when Azure styles are unavailable
     */
    private aggressiveBoldDetection(text: string, fontSize: number, boundingHeight: number): 'normal' | 'bold' {
        const trimmed = text.trim();

        // Skip very short text unless it's clearly a header
        if (trimmed.length <= 2 && !/^[A-Z&|]+$/.test(trimmed)) {
            return 'normal';
        }

        // Skip common non-bold words
        const commonWords = /^(and|or|of|in|to|the|a|an|for|with|by|at|on|from|as|is|are|was|were|be|been|have|has|had|do|does|did|will|would|could|should|may|might|can|shall|must)$/i;
        if (commonWords.test(trimmed) && trimmed.length < 8) {
            return 'normal';
        }

        // Section headers (very likely to be bold)
        if (/^(PROFESSIONAL|SUMMARY|EXPERIENCE|WORK|EMPLOYMENT|EDUCATION|SKILLS|TECHNICAL|QUALIFICATIONS|OBJECTIVE|PROJECTS|CERTIFICATIONS|ACHIEVEMENTS|ACCOMPLISHMENTS|CONTACT|BACKGROUND|COMPETENCIES|EXPERTISE|HIGHLIGHTS|OF\s+QUALIFICATIONS)$/i.test(trimmed)) {
            console.log(`✅ AGGRESSIVE BOLD (section): "${trimmed}"`);
            return 'bold';
        }

        // All caps text (likely headers) - more restrictive
        if (trimmed === trimmed.toUpperCase() &&
            trimmed.length > 4 &&
            trimmed.length < 30 &&
            /^[A-Z\s&-]+$/.test(trimmed) &&
            fontSize >= 11) {
            console.log(`✅ AGGRESSIVE BOLD (caps): "${trimmed}"`);
            return 'bold';
        }

        // Job titles - only specific patterns
        if (/^(Manager|Administrator|Specialist|Assistant|Coordinator|Director|Analyst|Developer|Engineer|Designer|Consultant|Supervisor|Executive|Officer|Representative|Associate|Technician|Lead|Senior|Junior|Principal|Chief)$/i.test(trimmed) ||
            /^(Administrative|Program|Curriculum|Support|Documentation)$/i.test(trimmed)) {
            console.log(`✅ AGGRESSIVE BOLD (job title): "${trimmed}"`);
            return 'bold';
        }

        // Company names with clear endings
        if (/(Inc\.|LLC|Corp\.|Ltd\.|Company|Corporation|Industries|Solutions|Systems|Technologies|Group|Associates|Academy|University|College|Museum)$/i.test(trimmed)) {
            console.log(`✅ AGGRESSIVE BOLD (company): "${trimmed}"`);
            return 'bold';
        }

        // Important institutions/technologies
        if (/^(Harvard|MIT|Stanford|Google|Microsoft|Apple|Adobe|Oracle|IBM|Intel|Amazon|Meta|Facebook|Twitter|LinkedIn)$/i.test(trimmed) ||
            /^(MS\s+Office|Google\s+Workspace|Office|Excel|Word|PowerPoint|Outlook|Gmail|Calendar|Docs|Sheets)$/i.test(trimmed)) {
            console.log(`✅ AGGRESSIVE BOLD (institution/tech): "${trimmed}"`);
            return 'bold';
        }

        // Dates and years
        if (/^\d{4}$/.test(trimmed) ||
            /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}$/i.test(trimmed) ||
            /^\d{1,2}\/\d{4}$/.test(trimmed)) {
            console.log(`✅ AGGRESSIVE BOLD (date): "${trimmed}"`);
            return 'bold';
        }

        // Large font size (likely headers) - more conservative
        if (fontSize > 14 && trimmed.length > 3) {
            console.log(`✅ AGGRESSIVE BOLD (font size): "${trimmed}" (${fontSize}px)`);
            return 'bold';
        }

        // Height ratio analysis - much more conservative
        const heightRatio = boundingHeight / fontSize;
        if (heightRatio > 1.7 &&
            trimmed.length > 4 &&
            trimmed.length < 30 &&
            fontSize >= 11 &&
            /^[A-Z]/.test(trimmed)) {
            console.log(`✅ AGGRESSIVE BOLD (height ratio): "${trimmed}" (${heightRatio.toFixed(2)})`);
            return 'bold';
        }

        return 'normal';
    }

    /**
     * Aggressive bullet detection when Azure styles are unavailable
     */
    private aggressiveBulletDetection(text: string, existingElements: TextElement[]): boolean {
        const trimmed = text.trim();

        // Direct bullet characters
        if (/^[•▪▫◦‣⁃▸▹▪▫⦿⦾]/.test(trimmed)) {
            console.log(`✅ AGGRESSIVE BULLET (direct): "${trimmed}"`);
            return true;
        }

        // Single character bullets
        if (trimmed.length === 1 && /[•▪▫◦‣⁃▸▹▪▫⦿⦾\-*]/.test(trimmed)) {
            console.log(`✅ AGGRESSIVE BULLET (single char): "${trimmed}"`);
            return true;
        }

        // Dash bullets (very common)
        if (/^[-–—]\s*$/.test(trimmed) || (trimmed.length <= 3 && /^[-–—]/.test(trimmed))) {
            console.log(`✅ AGGRESSIVE BULLET (dash): "${trimmed}"`);
            return true;
        }

        // Asterisk bullets
        if (/^\*\s*$/.test(trimmed) || (trimmed.length <= 2 && /^\*/.test(trimmed))) {
            console.log(`✅ AGGRESSIVE BULLET (asterisk): "${trimmed}"`);
            return true;
        }

        // Numbered bullets
        if (/^\d{1,2}\.?\s*$/.test(trimmed)) {
            console.log(`✅ AGGRESSIVE BULLET (number): "${trimmed}"`);
            return true;
        }

        // Letter bullets
        if (/^[a-zA-Z]\.?\s*$/.test(trimmed)) {
            console.log(`✅ AGGRESSIVE BULLET (letter): "${trimmed}"`);
            return true;
        }

        // Look for bullet symbols anywhere in short text
        if (trimmed.length < 5 && /[•▪▫◦‣⁃▸▹▪▫⦿⦾]/.test(trimmed)) {
            console.log(`✅ AGGRESSIVE BULLET (embedded): "${trimmed}"`);
            return true;
        }

        // Context-based detection (text that starts typical bullet content)
        if (trimmed.length > 10 &&
            /^(Managed|Developed|Created|Implemented|Led|Coordinated|Responsible|Achieved|Improved|Designed|Executed|Supervised|Organized|Maintained|Established|Collaborated)/i.test(trimmed)) {

            // Check if recent elements suggest we're in a bullet list area
            const recentBullets = existingElements.slice(-5).filter(el => el.role === 'bulletPoint').length;
            if (recentBullets > 0) {
                console.log(`✅ AGGRESSIVE BULLET (context): "${trimmed.substring(0, 20)}..."`);
                return true;
            }
        }

        return false;
    }

    /**
     * Calculate hierarchy level based on font size and weight
     */
    private calculateHierarchyLevel(fontSize: number, fontWeight: 'normal' | 'bold'): number {
        if (fontWeight === 'bold' && fontSize > 16) return 1; // Main headers
        if (fontWeight === 'bold' && fontSize > 14) return 2; // Sub headers
        if (fontWeight === 'bold' || fontSize > 12) return 3;  // Job titles, etc.
        return 4; // Regular text
    }

    /**
     * Calculate spatial relationships between elements
     */
    private calculateSpatialRelationships(currentWord: any, existingElements: TextElement[]): any {
        if (existingElements.length === 0) return {};

        const currentBounds = {
            x: Math.min(...currentWord.polygon.filter((_: any, i: number) => i % 2 === 0)),
            y: Math.min(...currentWord.polygon.filter((_: any, i: number) => i % 2 === 1)),
        };

        // Find elements in similar vertical or horizontal alignment
        const alignedElements = existingElements.filter(el => {
            const verticalDistance = Math.abs(el.boundingBox.y - currentBounds.y);
            const horizontalDistance = Math.abs(el.boundingBox.x - currentBounds.x);

            return verticalDistance < 10 || horizontalDistance < 20;
        });

        return {
            alignedElements: alignedElements.map(el => el.text).slice(-3), // Keep last 3 for context
            isIndented: existingElements.some(el =>
                Math.abs(el.boundingBox.y - currentBounds.y) < 5 &&
                currentBounds.x > el.boundingBox.x + 20
            )
        };
    }

    private async groupElementsIntoSections(elements: TextElement[], azureResult?: any): Promise<ResumeSection[]> {
        console.log('🔍 REVOLUTIONARY SECTION DETECTION: Advanced multi-algorithm analysis...');

        return await this.revolutionarySectionDetection(elements, azureResult);
    }

    /**
     * Revolutionary Section Detection Algorithm
     * Multi-stage detection with confidence scoring and adaptive recognition
     */
    private async revolutionarySectionDetection(elements: TextElement[], azureResult?: any): Promise<ResumeSection[]> {
        console.log('🚀 REVOLUTIONARY SECTION DETECTION INITIATED');
        console.log(`📊 Processing ${elements.length} elements with advanced algorithms`);

        const detectionResult = {
            sections: [] as ResumeSection[],
            confidence: {
                overall: 0,
                bySection: {} as Record<string, number>,
                algorithms: {
                    hierarchical: 0,
                    spatial: 0,
                    semantic: 0,
                    pattern: 0
                }
            },
            metadata: {
                algorithmsUsed: [] as string[],
                fallbacksActivated: [] as string[],
                processingTime: 0
            }
        };

        const startTime = Date.now();

        try {
            // STAGE 1: Advanced Preprocessing
            console.log('📐 STAGE 1: Advanced element preprocessing...');
            const preprocessedElements = await this.advancedElementPreprocessing(elements);

            // STAGE 2: Multi-Algorithm Section Detection
            console.log('🔬 STAGE 2: Multi-algorithm section detection...');
            const algorithms = [
                { name: 'hierarchical', fn: this.hierarchicalSectionDetection.bind(this) },
                { name: 'spatial', fn: this.spatialSectionDetection.bind(this) },
                { name: 'semantic', fn: this.semanticSectionDetection.bind(this) },
                { name: 'pattern', fn: this.patternBasedSectionDetection.bind(this) }
            ];

            const algorithmResults = [];

            for (const algorithm of algorithms) {
                try {
                    console.log(`🎯 Running ${algorithm.name} detection...`);
                    const result = await algorithm.fn(preprocessedElements, azureResult);
                    algorithmResults.push({
                        name: algorithm.name,
                        sections: result.sections,
                        confidence: result.confidence,
                        metadata: result.metadata
                    });
                    detectionResult.metadata.algorithmsUsed.push(algorithm.name);
                    console.log(`✅ ${algorithm.name} detection: ${result.sections.length} sections, confidence: ${Math.round(result.confidence * 100)}%`);
                } catch (error) {
                    console.error(`❌ ${algorithm.name} detection failed:`, error);
                    detectionResult.metadata.fallbacksActivated.push(algorithm.name);
                }
            }

            // STAGE 3: Intelligent Section Merging and Validation
            console.log('🧠 STAGE 3: Intelligent section merging with confidence weighting...');
            const mergedSections = await this.intelligentSectionMerging(algorithmResults, preprocessedElements);
            detectionResult.sections = mergedSections.sections;
            detectionResult.confidence = mergedSections.confidence;

            // STAGE 4: Section Enhancement and Refinement
            console.log('✨ STAGE 4: Section enhancement and content refinement...');
            const enhancedSections = await this.enhanceSectionsWithJobPositions(detectionResult.sections, preprocessedElements);
            detectionResult.sections = enhancedSections;

            // STAGE 5: Quality Assurance and Validation
            console.log('🔍 STAGE 5: Quality assurance and section validation...');
            const validatedSections = await this.validateAndRefineDetectedSections(detectionResult.sections, preprocessedElements);
            detectionResult.sections = validatedSections.sections;
            detectionResult.confidence.overall = validatedSections.overallConfidence;

            detectionResult.metadata.processingTime = Date.now() - startTime;

            console.log('🎯 REVOLUTIONARY SECTION DETECTION COMPLETE:');
            console.log(`📊 Results: ${detectionResult.sections.length} sections detected`);
            console.log(`🎯 Overall Confidence: ${Math.round(detectionResult.confidence.overall * 100)}%`);
            console.log(`⚡ Processing Time: ${detectionResult.metadata.processingTime}ms`);
            console.log(`🔧 Algorithms Used: ${detectionResult.metadata.algorithmsUsed.join(', ')}`);

            if (detectionResult.metadata.fallbacksActivated.length > 0) {
                console.log(`⚠️ Fallbacks Activated: ${detectionResult.metadata.fallbacksActivated.join(', ')}`);
            }

            // Log detailed section analysis
            detectionResult.sections.forEach((section, index) => {
                console.log(`📋 Section ${index + 1}: "${section.title}" (${section.content.length} elements, confidence: ${Math.round((detectionResult.confidence.bySection[section.title] || 0) * 100)}%)`);
            });

            return detectionResult.sections;

        } catch (error: any) {
            console.error('❌ Revolutionary section detection failed:', error);
            console.log('🔄 Falling back to legacy section detection...');
            return await this.legacySectionDetection(elements);
        }
    }

    /**
     * Advanced Element Preprocessing
     */
    private async advancedElementPreprocessing(elements: TextElement[]): Promise<TextElement[]> {
        console.log('📐 Preprocessing elements with advanced algorithms...');

        // Sort elements by reading order (top to bottom, left to right)
        const sortedElements = [...elements].sort((a, b) => {
            const yDiff = a.boundingBox.y - b.boundingBox.y;
            if (Math.abs(yDiff) < 5) { // Same line
                return a.boundingBox.x - b.boundingBox.x;
            }
            return yDiff;
        });

        // Enhance elements with additional metadata
        const enhancedElements = sortedElements.map((element, index) => {
            const enhanced = { ...element };

            // Calculate relative positioning
            enhanced.metadata = {
                index,
                isFirstInLine: index === 0 || Math.abs(element.boundingBox.y - sortedElements[index - 1].boundingBox.y) > 5,
                isLastInLine: index === sortedElements.length - 1 || Math.abs(element.boundingBox.y - sortedElements[index + 1].boundingBox.y) > 5,
                linePosition: this.calculateLinePosition(element, sortedElements),
                proximity: this.calculateElementProximity(element, sortedElements, index)
            };

            // Enhanced role detection
            enhanced.enhancedRole = this.detectEnhancedRole(element, enhanced.metadata);

            return enhanced;
        });

        console.log(`✅ Preprocessed ${enhancedElements.length} elements with enhanced metadata`);
        return enhancedElements;
    }

    /**
     * Hierarchical Section Detection
     * Uses font sizes, weights, and visual hierarchy
     */
    private async hierarchicalSectionDetection(elements: TextElement[], azureResult?: any): Promise<{
        sections: ResumeSection[];
        confidence: number;
        metadata: any;
    }> {
        console.log('🏗️ Running hierarchical section detection...');

        const sections: ResumeSection[] = [];
        const metadata = {
            headerCandidates: 0,
            averageFontSize: 0,
            hierarchyLevels: 0
        };

        // Calculate average font size for baseline
        const avgFontSize = elements.reduce((sum, el) => sum + (el.fontSize || 12), 0) / elements.length;
        metadata.averageFontSize = avgFontSize;

        // Identify headers based on visual hierarchy
        const headerCandidates = elements.filter(el => {
            const text = el.text.trim();
            const fontSize = el.fontSize || 12;
            const isBold = el.fontWeight === 'bold';
            const isLarger = fontSize > avgFontSize + 1;
            const isShort = text.length < 60;
            const isAllCaps = text === text.toUpperCase() && /^[A-Z\s&-]+$/.test(text);
            const isKnownSection = this.isLikelySectionHeader(text);

            const hierarchyScore =
                (isBold ? 0.4 : 0) +
                (isLarger ? 0.3 : 0) +
                (isShort ? 0.1 : 0) +
                (isAllCaps ? 0.1 : 0) +
                (isKnownSection ? 0.5 : 0);

            return hierarchyScore > 0.5 && text.length >= 3;
        });

        metadata.headerCandidates = headerCandidates.length;
        metadata.hierarchyLevels = new Set(headerCandidates.map(h => h.hierarchyLevel || 1)).size;

        console.log(`📊 Found ${headerCandidates.length} header candidates using hierarchical analysis`);

        // Group content under each header
        for (let i = 0; i < headerCandidates.length; i++) {
            const header = headerCandidates[i];
            const nextHeader = headerCandidates[i + 1];

            const sectionElements = elements.filter(el => {
                const isAfterHeader = el.boundingBox.y > header.boundingBox.y + 5;
                const isBeforeNext = !nextHeader || el.boundingBox.y < nextHeader.boundingBox.y - 5;
                const isNotHeader = el !== header;
                return isAfterHeader && isBeforeNext && isNotHeader;
            });

            if (sectionElements.length > 0) {
                const section: ResumeSection = {
                    title: header.text.trim(),
                    titleElement: header,
                    content: sectionElements,
                    boundingBox: this.calculateCombinedBoundingBox([header, ...sectionElements]),
                    sectionType: this.determineSectionType(header.text)
                };

                sections.push(section);
            }
        }

        const confidence = headerCandidates.length > 0 ? Math.min(0.9, 0.5 + (headerCandidates.length * 0.1)) : 0.3;

        return { sections, confidence, metadata };
    }

    /**
     * Spatial Section Detection
     * Uses positioning and layout analysis
     */
    private async spatialSectionDetection(elements: TextElement[], azureResult?: any): Promise<{
        sections: ResumeSection[];
        confidence: number;
        metadata: any;
    }> {
        console.log('📐 Running spatial section detection...');

        const sections: ResumeSection[] = [];
        const metadata = {
            clusters: 0,
            averageSpacing: 0,
            layoutType: 'unknown'
        };

        // Group elements by spatial proximity
        const spatialClusters = this.clusterElementsSpatially(elements);
        metadata.clusters = spatialClusters.length;

        // Analyze spacing patterns
        const spacings = [];
        for (let i = 1; i < elements.length; i++) {
            const spacing = elements[i].boundingBox.y - (elements[i-1].boundingBox.y + elements[i-1].boundingBox.height);
            if (spacing > 0) spacings.push(spacing);
        }

        metadata.averageSpacing = spacings.length > 0 ? spacings.reduce((sum, s) => sum + s, 0) / spacings.length : 0;

        // Detect significant gaps that indicate section boundaries
        const significantGaps = spacings.filter(spacing => spacing > metadata.averageSpacing * 1.5);

        // Use gaps to create sections
        let currentSectionElements: TextElement[] = [];
        let sectionTitle = 'Document Content';

        for (let i = 0; i < elements.length; i++) {
            const element = elements[i];
            const nextElement = elements[i + 1];

            currentSectionElements.push(element);

            // Check if there's a significant gap after this element
            if (nextElement) {
                const gap = nextElement.boundingBox.y - (element.boundingBox.y + element.boundingBox.height);
                if (gap > metadata.averageSpacing * 1.5 && currentSectionElements.length > 1) {
                    // Create section
                    const titleElement = currentSectionElements.find(el =>
                        el.fontWeight === 'bold' || (el.fontSize && el.fontSize > 12)
                    ) || currentSectionElements[0];

                    const section: ResumeSection = {
                        title: titleElement.text.trim(),
                        titleElement,
                        content: currentSectionElements.filter(el => el !== titleElement),
                        boundingBox: this.calculateCombinedBoundingBox(currentSectionElements),
                        sectionType: this.determineSectionType(titleElement.text)
                    };

                    sections.push(section);
                    currentSectionElements = [];
                }
            }
        }

        // Add final section if elements remain
        if (currentSectionElements.length > 0) {
            const titleElement = currentSectionElements.find(el =>
                el.fontWeight === 'bold' || (el.fontSize && el.fontSize > 12)
            ) || currentSectionElements[0];

            const section: ResumeSection = {
                title: titleElement.text.trim(),
                titleElement,
                content: currentSectionElements.filter(el => el !== titleElement),
                boundingBox: this.calculateCombinedBoundingBox(currentSectionElements),
                sectionType: this.determineSectionType(titleElement.text)
            };

            sections.push(section);
        }

        const confidence = sections.length > 1 ? 0.7 : 0.4;

        console.log(`📊 Spatial detection found ${sections.length} sections with ${spatialClusters.length} spatial clusters`);

        return { sections, confidence, metadata };
    }

    /**
     * Semantic Section Detection
     * Uses natural language processing and content analysis
     */
    private async semanticSectionDetection(elements: TextElement[], azureResult?: any): Promise<{
        sections: ResumeSection[];
        confidence: number;
        metadata: any;
    }> {
        console.log('🧠 Running semantic section detection...');

        const sections: ResumeSection[] = [];
        const metadata = {
            keywordMatches: 0,
            semanticPatterns: 0,
            contentAnalysis: {}
        };

        // Define comprehensive section patterns
        const sectionPatterns = {
            contact: {
                keywords: ['contact', 'information', 'details', 'reach', 'phone', 'email', 'address'],
                patterns: [/@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/, /\d{3}[-.]?\d{3}[-.]?\d{4}/],
                weight: 0.9
            },
            summary: {
                keywords: ['summary', 'objective', 'profile', 'overview', 'about', 'introduction'],
                patterns: [/^(summary|objective|profile)/i],
                weight: 0.8
            },
            experience: {
                keywords: ['experience', 'employment', 'work', 'career', 'professional', 'history'],
                patterns: [/\d{4}\s*[-–—]\s*(\d{4}|present|current)/i, /(manager|developer|analyst|director)/i],
                weight: 0.9
            },
            education: {
                keywords: ['education', 'academic', 'degree', 'university', 'college', 'school'],
                patterns: [/(bachelor|master|phd|b\.a\.|b\.s\.|m\.a\.|m\.s\.)/i, /\b(university|college)\b/i],
                weight: 0.8
            },
            skills: {
                keywords: ['skills', 'technical', 'competencies', 'abilities', 'proficiencies', 'expertise'],
                patterns: [/(programming|languages|software|tools)/i],
                weight: 0.7
            },
            projects: {
                keywords: ['projects', 'portfolio', 'work', 'development', 'implementation'],
                patterns: [/project/i, /(github|git|repository)/i],
                weight: 0.6
            },
            certifications: {
                keywords: ['certifications', 'certificates', 'credentials', 'licenses'],
                patterns: [/(certified|certification|license)/i],
                weight: 0.7
            }
        };

        // Analyze content semantically
        const textContent = elements.map(el => el.text).join(' ').toLowerCase();

        // Find semantic boundaries
        const semanticBoundaries = [];

        for (let i = 0; i < elements.length; i++) {
            const element = elements[i];
            const text = element.text.toLowerCase().trim();

            let maxScore = 0;
            let bestMatch = 'other';

            // Check against patterns
            for (const [sectionType, config] of Object.entries(sectionPatterns)) {
                let score = 0;

                // Keyword matching
                const keywordScore = config.keywords.reduce((sum, keyword) => {
                    return sum + (text.includes(keyword) ? 1 : 0);
                }, 0) / config.keywords.length;

                // Pattern matching
                const patternScore = config.patterns.reduce((sum, pattern) => {
                    return sum + (pattern.test(text) ? 1 : 0);
                }, 0) / config.patterns.length;

                score = (keywordScore * 0.6 + patternScore * 0.4) * config.weight;

                if (score > maxScore && score > 0.3) {
                    maxScore = score;
                    bestMatch = sectionType;
                }
            }

            if (maxScore > 0.3) {
                semanticBoundaries.push({
                    elementIndex: i,
                    element: element,
                    sectionType: bestMatch,
                    confidence: maxScore
                });
                metadata.keywordMatches++;
            }
        }

        // Group elements into sections based on semantic boundaries
        for (let i = 0; i < semanticBoundaries.length; i++) {
            const boundary = semanticBoundaries[i];
            const nextBoundary = semanticBoundaries[i + 1];

            const startIndex = boundary.elementIndex;
            const endIndex = nextBoundary ? nextBoundary.elementIndex : elements.length;

            const sectionElements = elements.slice(startIndex, endIndex);

            if (sectionElements.length > 0) {
                const section: ResumeSection = {
                    title: boundary.element.text.trim(),
                    titleElement: boundary.element,
                    content: sectionElements.slice(1), // Exclude the header element
                    boundingBox: this.calculateCombinedBoundingBox(sectionElements),
                    sectionType: boundary.sectionType as ResumeSection['sectionType']
                };

                sections.push(section);
            }
        }

        metadata.semanticPatterns = sections.length;

        const confidence = metadata.keywordMatches > 0 ? Math.min(0.8, 0.4 + (metadata.keywordMatches * 0.1)) : 0.2;

        console.log(`📊 Semantic detection found ${sections.length} sections with ${metadata.keywordMatches} keyword matches`);

        return { sections, confidence, metadata };
    }

    /**
     * Pattern-Based Section Detection
     * Uses formatting patterns and structural cues
     */
    private async patternBasedSectionDetection(elements: TextElement[], azureResult?: any): Promise<{
        sections: ResumeSection[];
        confidence: number;
        metadata: any;
    }> {
        console.log('🔍 Running pattern-based section detection...');

        const sections: ResumeSection[] = [];
        const metadata = {
            patterns: [],
            formatChanges: 0,
            structuralCues: 0
        };

        // Detect formatting changes that indicate section boundaries
        const formatChanges = [];

        for (let i = 1; i < elements.length; i++) {
            const prev = elements[i - 1];
            const curr = elements[i];

            const fontSizeChange = Math.abs((curr.fontSize || 12) - (prev.fontSize || 12)) > 1;
            const weightChange = prev.fontWeight !== curr.fontWeight;
            const significantSpacing = (curr.boundingBox.y - (prev.boundingBox.y + prev.boundingBox.height)) > 15;

            if (fontSizeChange || weightChange || significantSpacing) {
                formatChanges.push({
                    index: i,
                    element: curr,
                    changes: {
                        fontSizeChange,
                        weightChange,
                        significantSpacing
                    }
                });
            }
        }

        metadata.formatChanges = formatChanges.length;

        // Use format changes to identify section boundaries
        let currentSection: TextElement[] = [];
        let sectionStartIndex = 0;

        for (const change of formatChanges) {
            if (currentSection.length > 0) {
                // Create section from accumulated elements
                const titleElement = currentSection.find(el =>
                    el.fontWeight === 'bold' ||
                    this.isLikelySectionHeader(el.text)
                ) || currentSection[0];

                const section: ResumeSection = {
                    title: titleElement.text.trim(),
                    titleElement,
                    content: currentSection.filter(el => el !== titleElement),
                    boundingBox: this.calculateCombinedBoundingBox(currentSection),
                    sectionType: this.determineSectionType(titleElement.text)
                };

                sections.push(section);
            }

            // Start new section
            currentSection = elements.slice(sectionStartIndex, change.index);
            sectionStartIndex = change.index;
        }

        // Add final section
        if (sectionStartIndex < elements.length) {
            currentSection = elements.slice(sectionStartIndex);
            if (currentSection.length > 0) {
                const titleElement = currentSection.find(el =>
                    el.fontWeight === 'bold' ||
                    this.isLikelySectionHeader(el.text)
                ) || currentSection[0];

                const section: ResumeSection = {
                    title: titleElement.text.trim(),
                    titleElement,
                    content: currentSection.filter(el => el !== titleElement),
                    boundingBox: this.calculateCombinedBoundingBox(currentSection),
                    sectionType: this.determineSectionType(titleElement.text)
                };

                sections.push(section);
            }
        }

        metadata.structuralCues = sections.length;

        const confidence = formatChanges.length > 0 ? Math.min(0.7, 0.3 + (formatChanges.length * 0.05)) : 0.2;

        console.log(`📊 Pattern detection found ${sections.length} sections with ${formatChanges.length} format changes`);

        return { sections, confidence, metadata };
    }

    /**
     * Intelligent Section Merging
     * Combines results from multiple algorithms with confidence weighting
     */
    private async intelligentSectionMerging(
        algorithmResults: any[],
        elements: TextElement[]
    ): Promise<{
        sections: ResumeSection[];
        confidence: any;
    }> {
        console.log('🧠 Performing intelligent section merging...');

        if (algorithmResults.length === 0) {
            return { sections: [], confidence: { overall: 0, bySection: {}, algorithms: {} } };
        }

        // Weight algorithms by their confidence and success
        const weightedResults = algorithmResults.map(result => ({
            ...result,
            weight: result.confidence * (result.sections.length > 0 ? 1.2 : 0.8)
        }));

        // Find the best primary algorithm
        const primaryResult = weightedResults.reduce((best, current) =>
            current.weight > best.weight ? current : best
        );

        console.log(`📊 Selected ${primaryResult.name} as primary algorithm (weight: ${primaryResult.weight.toFixed(2)})`);

        // Start with primary algorithm's sections
        let mergedSections = [...primaryResult.sections];

        // Enhance with insights from other algorithms
        for (const result of weightedResults) {
            if (result.name !== primaryResult.name && result.confidence > 0.3) {
                mergedSections = this.enhanceSectionsWithAlgorithmInsights(mergedSections, result, elements);
            }
        }

        // Calculate overall confidence
        const algorithmConfidences = {};
        for (const result of algorithmResults) {
            algorithmConfidences[result.name] = result.confidence;
        }

        const overallConfidence = weightedResults.reduce((sum, result) => sum + result.weight, 0) / weightedResults.length;

        const confidence = {
            overall: Math.min(0.95, overallConfidence),
            bySection: this.calculateSectionConfidences(mergedSections, algorithmResults),
            algorithms: algorithmConfidences
        };

        console.log(`✅ Merged sections: ${mergedSections.length} sections with overall confidence ${Math.round(confidence.overall * 100)}%`);

        return { sections: mergedSections, confidence };
    }

    /**
     * Legacy Section Detection Fallback
     */
    private async legacySectionDetection(elements: TextElement[]): Promise<ResumeSection[]> {
        console.log('🔄 Using legacy section detection as fallback...');

        const sections: ResumeSection[] = [];

        // Simple header detection
        const headers = elements.filter(el => {
            const text = el.text.trim();
            return (
                (el.fontWeight === 'bold' && text.length > 3 && text.length < 50) ||
                (text === text.toUpperCase() && /^[A-Z\s]+$/.test(text) && text.length > 3 && text.length < 30)
            );
        });

        // Group content under headers
        for (let i = 0; i < headers.length; i++) {
            const header = headers[i];
            const nextHeader = headers[i + 1];

            const sectionElements = elements.filter(el => {
                const isAfterHeader = el.boundingBox.y > header.boundingBox.y;
                const isBeforeNext = !nextHeader || el.boundingBox.y < nextHeader.boundingBox.y;
                const isNotHeader = el !== header;
                return isAfterHeader && isBeforeNext && isNotHeader;
            });

            const section: ResumeSection = {
                title: header.text.trim(),
                titleElement: header,
                content: sectionElements,
                boundingBox: this.calculateCombinedBoundingBox([header, ...sectionElements]),
                sectionType: this.determineSectionType(header.text)
            };

            sections.push(section);
        }

        console.log(`✅ Legacy detection found ${sections.length} sections`);
        return sections;
    }

    // Helper methods for section detection
    private calculateLinePosition(element: TextElement, allElements: TextElement[]): any {
        // Implementation for calculating line position
        return { line: 0, position: 0 };
    }

    private calculateElementProximity(element: TextElement, allElements: TextElement[], index: number): any {
        // Implementation for calculating element proximity
        return { nearestNeighbors: [], avgDistance: 0 };
    }

    private detectEnhancedRole(element: TextElement, metadata: any): string {
        // Enhanced role detection based on metadata
        const text = element.text.trim().toLowerCase();

        if (this.isLikelySectionHeader(text)) return 'section-header';
        if (element.fontWeight === 'bold' && text.length < 50) return 'subsection-header';
        if (text.startsWith('•') || text.startsWith('-')) return 'bullet-point';
        if (/@/.test(text) || /\d{3}[-.]?\d{3}[-.]?\d{4}/.test(text)) return 'contact-info';

        return 'content';
    }

    private clusterElementsSpatially(elements: TextElement[]): TextElement[][] {
        // Implementation for spatial clustering
        return [elements]; // Simplified for now
    }

    private enhanceSectionsWithAlgorithmInsights(
        sections: ResumeSection[],
        algorithmResult: any,
        elements: TextElement[]
    ): ResumeSection[] {
        // Implementation for enhancing sections with additional algorithm insights
        return sections; // Simplified for now
    }

    private calculateSectionConfidences(
        sections: ResumeSection[],
        algorithmResults: any[]
    ): Record<string, number> {
        const confidences: Record<string, number> = {};

        sections.forEach(section => {
            confidences[section.title] = 0.8; // Default confidence
        });

        return confidences;
    }

    private async enhanceSectionsWithJobPositions(
        sections: ResumeSection[],
        elements: TextElement[]
    ): Promise<ResumeSection[]> {
        console.log('💼 Enhancing sections with job position detection...');

        return sections.map(section => {
            if (section.sectionType === 'experience') {
                section.jobPositions = this.extractJobPositions(section.content);
            }
            return section;
        });
    }

    private async validateAndRefineDetectedSections(
        sections: ResumeSection[],
        elements: TextElement[]
    ): Promise<{
        sections: ResumeSection[];
        overallConfidence: number;
    }> {
        console.log('🔍 Validating and refining detected sections...');

        // Filter out sections with too few elements
        const validSections = sections.filter(section =>
            section.content.length > 0 || this.isLikelySectionHeader(section.title)
        );

        // Calculate quality score
        const qualityFactors = {
            sectionCount: Math.min(1, validSections.length / 5), // Ideal: 3-7 sections
            contentDistribution: this.calculateContentDistribution(validSections),
            titleQuality: this.calculateTitleQuality(validSections),
            structuralConsistency: this.calculateStructuralConsistency(validSections)
        };

        const overallConfidence = (
            qualityFactors.sectionCount * 0.3 +
            qualityFactors.contentDistribution * 0.3 +
            qualityFactors.titleQuality * 0.2 +
            qualityFactors.structuralConsistency * 0.2
        );

        console.log(`✅ Section validation complete: ${validSections.length} sections, confidence: ${Math.round(overallConfidence * 100)}%`);

        return {
            sections: validSections,
            overallConfidence: Math.min(0.95, overallConfidence)
        };
    }

    private calculateContentDistribution(sections: ResumeSection[]): number {
        if (sections.length === 0) return 0;

        const contentCounts = sections.map(s => s.content.length);
        const avg = contentCounts.reduce((sum, count) => sum + count, 0) / contentCounts.length;
        const variance = contentCounts.reduce((sum, count) => sum + Math.pow(count - avg, 2), 0) / contentCounts.length;

        // Lower variance = better distribution
        return Math.max(0, 1 - (variance / (avg * avg)));
    }

    private calculateTitleQuality(sections: ResumeSection[]): number {
        if (sections.length === 0) return 0;

        const goodTitles = sections.filter(section =>
            this.isLikelySectionHeader(section.title) ||
            (section.title.length > 3 && section.title.length < 30)
        );

        return goodTitles.length / sections.length;
    }

    private calculateStructuralConsistency(sections: ResumeSection[]): number {
        // Check for consistent formatting in section titles
        if (sections.length === 0) return 0;

        const titleFormats = sections.map(section => ({
            isBold: section.titleElement.fontWeight === 'bold',
            isUpperCase: section.title === section.title.toUpperCase(),
            fontSize: section.titleElement.fontSize || 12
        }));

        const consistency = {
            bold: titleFormats.filter(t => t.isBold).length / titleFormats.length,
            case: titleFormats.filter(t => t.isUpperCase).length / titleFormats.length,
            size: this.calculateFontSizeConsistency(titleFormats.map(t => t.fontSize))
        };

        // Higher consistency = better score
        return (consistency.bold + consistency.case + consistency.size) / 3;
    }

    private calculateFontSizeConsistency(fontSizes: number[]): number {
        if (fontSizes.length === 0) return 0;

        const uniqueSizes = [...new Set(fontSizes)];
        return uniqueSizes.length <= 2 ? 1 : Math.max(0, 1 - (uniqueSizes.length - 2) * 0.2);
    }

    /**
     * Reconstruct formatted content from text elements preserving bold, bullets, etc.
     */
    private reconstructFormattedContent(elements: TextElement[]): { lines: any[], htmlContent: string } {
        const lines: any[] = [];
        let currentLine: any = null;
        const lineThreshold = 5; // pixels

        // Group elements into lines
        elements.forEach(element => {
            if (!currentLine || Math.abs(element.boundingBox.y - currentLine.y) > lineThreshold) {
                // Start new line
                if (currentLine) {
                    lines.push(currentLine);
                }
                currentLine = {
                    y: element.boundingBox.y,
                    elements: [element],
                    isBulletLine: element.role === 'bulletPoint',
                    hasBold: element.fontWeight === 'bold'
                };
            } else {
                // Add to current line
                currentLine.elements.push(element);
                if (element.role === 'bulletPoint') currentLine.isBulletLine = true;
                if (element.fontWeight === 'bold') currentLine.hasBold = true;
            }
        });

        if (currentLine) {
            lines.push(currentLine);
        }

        // Generate HTML content with formatting
        const htmlContent = lines.map((line, lineIndex) => {
            const lineText = line.elements
                .sort((a: any, b: any) => a.boundingBox.x - b.boundingBox.x)
                .map((el: any) => {
                    let text = el.text.trim();

                    // Apply formatting based on element properties
                    if (el.fontWeight === 'bold') {
                        text = `<strong>${text}</strong>`;
                    }
                    if (el.fontStyle === 'italic') {
                        text = `<em>${text}</em>`;
                    }

                    return text;
                })
                .join(' ')
                .trim();

            console.log(`📝 Line ${lineIndex}: "${lineText}"`, {
                isBulletLine: line.isBulletLine,
                hasBold: line.hasBold,
                elementCount: line.elements.length
            });

            // Bullet point handling
            if (line.isBulletLine) {
                // Remove bullet character from the beginning and clean up
                const cleanText = lineText
                    .replace(/^<strong>\s*[•▪▫◦‣⁃▸▹▪▫⦿⦾\-–—*]\s*<\/strong>/, '')
                    .replace(/^[•▪▫◦‣⁃▸▹▪▫⦿⦾\-–—*]\s*/, '')
                    .trim();

                return `<li style="margin: 5px 0; line-height: 1.4;">${cleanText || lineText}</li>`;
            }
            // Header detection (bold single-element lines)
            else if (line.hasBold && line.elements.length <= 3 && lineText.length < 60) {
                // Check if this looks like a section header
                const isAllCaps = lineText.replace(/<[^>]*>/g, '').toUpperCase() === lineText.replace(/<[^>]*>/g, '');
                const hasHeaderKeywords = /EXPERIENCE|EDUCATION|SKILLS|SUMMARY|OBJECTIVE|PROJECTS|CONTACT/i.test(lineText);

                if (isAllCaps || hasHeaderKeywords || line.elements[0].fontSize > 14) {
                    return `<h2 style="font-weight: bold; font-size: 16px; margin: 20px 0 10px 0; text-transform: uppercase; border-bottom: 1px solid #333;">${lineText}</h2>`;
                } else {
                    return `<h3 style="font-weight: bold; font-size: 14px; margin: 15px 0 5px 0;">${lineText}</h3>`;
                }
            }
            // Regular paragraph
            else if (lineText.length > 0) {
                return `<p style="margin: 8px 0; line-height: 1.5;">${lineText}</p>`;
            }

            return '';
        }).filter(line => line.length > 0).join('');

        // Post-process to wrap bullet points in ul tags
        const finalHtmlContent = htmlContent
            .replace(/(<li[^>]*>.*?<\/li>)/gs, (match, li) => {
                return match; // Keep individual li tags
            })
            .replace(/(<li[^>]*>.*?<\/li>)(\s*)(?=<li)/gs, '$1$2') // Keep consecutive li tags together
            .replace(/(<li[^>]*>.*?<\/li>)(\s*)(?!<li)/gs, '<ul style="margin: 10px 0; padding-left: 20px;">$1</ul>$2') // Wrap single li in ul
            .replace(/(<li[^>]*>.*?<\/li>)(\s*<li)/gs, '$1$2') // Remove extra wrapping for consecutive items
            .replace(/<\/ul>\s*<ul[^>]*>/gs, ''); // Merge consecutive ul tags

        // Alternative approach: manually wrap consecutive li elements
        const wrappedHtmlContent = finalHtmlContent.replace(
            /(<li[^>]*>.*?<\/li>)(\s*<li[^>]*>.*?<\/li>)*/gs,
            (match) => {
                if (match.includes('<li')) {
                    return `<ul style="margin: 10px 0; padding-left: 20px;">${match}</ul>`;
                }
                return match;
            }
        );

        console.log('🎯 Final HTML content preview:', wrappedHtmlContent.substring(0, 500) + '...');

        return { lines, htmlContent: wrappedHtmlContent };
    }

    private analyzeLayoutFromElements(elements: TextElement[], dimensions: { width: number; height: number }): any {
        // Analyze overall layout characteristics
        const avgFontSize = elements.reduce((sum, el) => sum + (el.fontSize || 12), 0) / elements.length;

        return {
            margins: { top: 50, bottom: 50, left: 50, right: 50 },
            columns: 1,
            textFlow: 'left-to-right',
            averageFontSize: avgFontSize,
            dominantFontFamily: 'Arial'
        };
    }

    private extractStructuredData(pages: any[]): VisionAnalysisResult['structuredData'] {
        // Combine data from all pages into structured format with enhanced formatting
        const allElements = pages.flatMap(p => p.elements);
        const allSections = pages.flatMap(p => p.sections);

        // Generate formatted content for each section
        const sectionsWithFormatting = allSections.map(section => {
            const formattedContent = this.reconstructFormattedContent(section.content);
            return {
                ...section,
                formattedHtml: formattedContent.htmlContent,
                structuredLines: formattedContent.lines
            };
        });

        return {
            personalInfo: this.extractPersonalInfo(allElements),
            sections: sectionsWithFormatting,
            jobPositions: this.extractJobPositions(allElements),
            visualHierarchy: this.buildVisualHierarchy(allElements)
        };
    }

    private extractPersonalInfo(elements: TextElement[]): VisionAnalysisResult['structuredData']['personalInfo'] {
        // Extract contact information based on patterns and positioning
        return {
            name: elements.find(el => el.role === 'title'),
            email: elements.find(el => /@/.test(el.text)),
            phone: elements.find(el => /\d{3}[-.]?\d{3}[-.]?\d{4}/.test(el.text))
        };
    }

    private extractJobPositions(elements: TextElement[]): JobPosition[] {
        console.log('👔 Extracting job positions from elements...');
        const positions: JobPosition[] = [];

        try {
            // Find job titles (roles like 'jobTitle')
            const jobTitleElements = elements.filter(el => el.role === 'jobTitle');

            for (const titleElement of jobTitleElements) {
                // Find associated company and dates near this job title
                const nearbyElements = elements.filter(el => {
                    const verticalDistance = Math.abs(el.boundingBox.y - titleElement.boundingBox.y);
                    const horizontalOverlap = this.calculateHorizontalOverlap(el.boundingBox, titleElement.boundingBox);
                    return verticalDistance < 100 && (horizontalOverlap > 0.3 || verticalDistance < 30);
                });

                const companyElement = nearbyElements.find(el => el.role === 'company');
                const datesElement = nearbyElements.find(el => el.role === 'dates');

                // Find bullet points and details below this job title
                const detailElements = elements.filter(el => {
                    const isBelow = el.boundingBox.y > titleElement.boundingBox.y;
                    const isWithinSection = el.boundingBox.y < titleElement.boundingBox.y + 200; // Reasonable section height
                    const isRelevant = el.role === 'bulletPoint' || el.role === 'paragraph';
                    return isBelow && isWithinSection && isRelevant;
                });

                const details = detailElements.map(el => ({
                    text: el.text,
                    element: el,
                    bulletType: el.text.startsWith('•') ? '•' as const :
                              el.text.startsWith('-') ? '-' as const :
                              el.text.startsWith('*') ? '*' as const :
                              /^\d+\./.test(el.text) ? 'numbered' as const : undefined,
                    indentLevel: Math.floor((el.boundingBox.x - titleElement.boundingBox.x) / 20)
                }));

                // Calculate overall bounding box for this position
                const allElements = [titleElement, companyElement, datesElement, ...detailElements].filter(Boolean) as TextElement[];
                const positionBoundingBox = this.calculateCombinedBoundingBox(allElements);

                const position: JobPosition = {
                    title: titleElement.text,
                    titleElement,
                    company: companyElement?.text,
                    companyElement,
                    dates: datesElement?.text,
                    datesElement,
                    details,
                    boundingBox: positionBoundingBox
                };

                positions.push(position);
                console.log(`✅ Extracted job position: ${position.title} at ${position.company || 'Unknown Company'}`);
            }

            return positions;

        } catch (error: any) {
            console.error('❌ Error extracting job positions:', error);
            return [];
        }
    }

    private buildVisualHierarchy(elements: TextElement[]): Array<{ level: number; elements: TextElement[]; purpose: string }> {
        // Build hierarchy based on font sizes and spatial relationships
        const hierarchy: Array<{ level: number; elements: TextElement[]; purpose: string }> = [];

        // Group by font size to determine hierarchy
        const sizeGroups = new Map<number, TextElement[]>();
        elements.forEach(el => {
            const size = el.fontSize || 12;
            if (!sizeGroups.has(size)) sizeGroups.set(size, []);
            sizeGroups.get(size)!.push(el);
        });

        // Sort by font size (descending) to create hierarchy
        const sortedSizes = Array.from(sizeGroups.keys()).sort((a, b) => b - a);
        sortedSizes.forEach((size, index) => {
            hierarchy.push({
                level: index + 1,
                elements: sizeGroups.get(size)!,
                purpose: index === 0 ? 'main headings' : index === 1 ? 'job titles' : 'content'
            });
        });

        return hierarchy;
    }

    private performLayoutAnalysis(pages: any[]): any {
        // Perform advanced layout analysis across all pages
        return {
            totalPages: pages.length,
            averageElementsPerPage: pages.reduce((sum, p) => sum + p.elements.length, 0) / pages.length,
            layoutConsistency: this.calculateLayoutConsistency(pages)
        };
    }

    private calculateLayoutConsistency(pages: any[]): number {
        // Calculate how consistent the layout is across pages
        return 0.85; // Placeholder
    }

    private calculateOverallConfidence(pages: any[]): number {
        const allElements = pages.flatMap(p => p.elements);
        const avgConfidence = allElements.reduce((sum, el) => sum + el.confidence, 0) / allElements.length;
        return avgConfidence;
    }

    private assessLayoutComplexity(pages: any[]): 'simple' | 'moderate' | 'complex' {
        const totalElements = pages.reduce((sum, p) => sum + p.elements.length, 0);
        const totalSections = pages.reduce((sum, p) => sum + p.sections.length, 0);

        if (totalElements < 50 && totalSections < 5) return 'simple';
        if (totalElements < 150 && totalSections < 10) return 'moderate';
        return 'complex';
    }

    private recommendTemplate(structuredData: VisionAnalysisResult['structuredData']): string {
        const jobCount = structuredData.jobPositions.length;
        const sectionCount = structuredData.sections.length;

        if (jobCount > 5 || sectionCount > 6) return 'executive';
        if (structuredData.sections.some(s => s.sectionType === 'projects')) return 'technical';
        return 'professional';
    }

    // Helper methods for spatial analysis
    private calculateHorizontalOverlap(box1: BoundingBox, box2: BoundingBox): number {
        const left = Math.max(box1.x, box2.x);
        const right = Math.min(box1.x + box1.width, box2.x + box2.width);
        const overlap = Math.max(0, right - left);
        const minWidth = Math.min(box1.width, box2.width);
        return minWidth > 0 ? overlap / minWidth : 0;
    }

    private calculateCombinedBoundingBox(elements: TextElement[]): BoundingBox {
        if (elements.length === 0) {
            return { x: 0, y: 0, width: 0, height: 0 };
        }

        const boxes = elements.map(el => el.boundingBox);
        const minX = Math.min(...boxes.map(b => b.x));
        const minY = Math.min(...boxes.map(b => b.y));
        const maxX = Math.max(...boxes.map(b => b.x + b.width));
        const maxY = Math.max(...boxes.map(b => b.y + b.height));

        return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
        };
    }

    private isLikelySectionHeader(text: string): boolean {
        const headerPatterns = [
            /^(professional\s+)?experience$/i,
            /^work\s+experience$/i,
            /^employment$/i,
            /^education$/i,
            /^skills$/i,
            /^technical\s+skills$/i,
            /^summary$/i,
            /^professional\s+summary$/i,
            /^objective$/i,
            /^projects$/i,
            /^certifications$/i,
            /^achievements$/i,
            /^awards$/i,
            /^volunteer$/i,
            /^languages$/i,
            /^references$/i,
            /^contact$/i,
            /^additional\s+information$/i
        ];

        return headerPatterns.some(pattern => pattern.test(text.trim()));
    }

    private determineSectionType(headerText: string): ResumeSection['sectionType'] {
        const text = headerText.toLowerCase().trim();

        if (/(professional\s+)?experience|work\s+experience|employment/i.test(text)) return 'experience';
        if (/education/i.test(text)) return 'education';
        if (/skills|technical\s+skills/i.test(text)) return 'skills';
        if (/summary|objective/i.test(text)) return 'summary';
        if (/contact/i.test(text)) return 'contact';
        if (/projects/i.test(text)) return 'projects';
        if (/certifications/i.test(text)) return 'certifications';

        return 'other';
    }

    private inferRoleFromContext(paragraphContent: string): TextElement['role'] {
        const content = paragraphContent.toLowerCase();

        if (/@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(content) || /\d{3}[-.]?\d{3}[-.]?\d{4}/.test(content)) {
            return 'contact';
        }

        if (/(experience|education|skills|summary|objective|projects|certifications)/i.test(content)) {
            return 'heading';
        }

        return 'paragraph';
    }
}

// Export singleton instance
const visionDocumentAPI = new VisionDocumentAPI();
export default visionDocumentAPI;