/**
 * Semantic DOM Controller - Integration point for the complete pipeline
 * Orchestrates the multi-model Azure approach with robust formatting detection
 * Generates rich, semantic JSON Document Object Model (DOM)
 */

const { AzureSemanticDOMService } = require('../services/azureSemanticDOMService');
const { FormattingDetectionService } = require('../services/formattingDetectionService');
const { BulletPointDetectionService } = require('../services/bulletPointDetectionService');
const { VisualHierarchyAnalysisService } = require('../services/visualHierarchyAnalysisService');
const { ContentReconstructionService } = require('../services/contentReconstructionService');

const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');

// Configure multer for document upload
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads/documents');
        try {
            await fs.mkdir(uploadDir, { recursive: true });
            cb(null, uploadDir);
        } catch (error) {
            cb(error);
        }
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname);
        cb(null, `document-${uniqueSuffix}${extension}`);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 25 * 1024 * 1024, // 25MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/msword',
            'image/jpeg',
            'image/png',
            'image/tiff'
        ];

        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Supported: PDF, Word, JPEG, PNG, TIFF'));
        }
    }
});

class SemanticDOMController {
    constructor() {
        this.azureSemanticService = new AzureSemanticDOMService();
        this.formattingService = new FormattingDetectionService();
        this.bulletPointService = new BulletPointDetectionService();
        this.hierarchyService = new VisualHierarchyAnalysisService();
        this.reconstructionService = new ContentReconstructionService();
    }

    /**
     * Main endpoint: Generate Semantic JSON DOM
     * POST /api/semantic-dom/generate
     */
    async generateSemanticDOM(req, res) {
        const startTime = Date.now();
        const processingId = uuidv4();

        try {
            console.log(`🚀 [${processingId}] Starting Semantic DOM generation...`);

            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    error: 'No document file uploaded'
                });
            }

            const file = req.file;
            const userId = req.user?.id || 'anonymous';

            console.log(`📄 [${processingId}] Processing: ${file.originalname} (${file.size} bytes)`);

            // Step 1: Multi-Model Azure Document Intelligence
            console.log(`🔍 [${processingId}] Step 1: Multi-Model Azure Analysis`);
            const azureResults = await this.performMultiModelAnalysis(file.path, file.mimetype);

            // Step 2: Post-Processing with Formatting Detection
            console.log(`🔧 [${processingId}] Step 2: Formatting Detection & Post-Processing`);
            const formattingResults = await this.formattingService.processAzureResults(azureResults);

            // Step 3: Enhanced Bullet Point Detection
            console.log(`🎯 [${processingId}] Step 3: Enhanced Bullet Point Detection`);
            const bulletResults = await this.bulletPointService.detectBulletPoints(azureResults);

            // Step 4: Visual Hierarchy Analysis
            console.log(`📊 [${processingId}] Step 4: Visual Hierarchy Analysis`);
            const hierarchyResults = await this.hierarchyService.analyzeVisualHierarchy(azureResults);

            // Step 5: Semantic JSON DOM Construction
            console.log(`🏗️ [${processingId}] Step 5: Semantic JSON DOM Construction`);
            const semanticDOM = await this.buildSemanticDOM(
                azureResults,
                formattingResults,
                bulletResults,
                hierarchyResults
            );

            // Step 6: Formatted Content Reconstruction
            console.log(`🎨 [${processingId}] Step 6: HTML Content Reconstruction`);
            const reconstructionResults = await this.reconstructionService.reconstructFormattedContent(
                bulletResults.bulletPoints,
                hierarchyResults.hierarchyElements,
                azureResults,
                { generateFullHTML: false, includeMetadata: true }
            );

            // Step 7: Generate Final Results
            const processingTime = Date.now() - startTime;
            const finalResults = this.generateFinalResults(
                semanticDOM,
                reconstructionResults,
                azureResults,
                formattingResults,
                bulletResults,
                hierarchyResults,
                processingTime,
                processingId
            );

            // Clean up uploaded file
            try {
                await fs.unlink(file.path);
            } catch (cleanupError) {
                console.warn(`⚠️ [${processingId}] Failed to cleanup file:`, cleanupError.message);
            }

            console.log(`✅ [${processingId}] Semantic DOM generation complete in ${processingTime}ms`);

            res.json(finalResults);

        } catch (error) {
            console.error(`❌ [${processingId}] Semantic DOM generation failed:`, error);

            // Clean up uploaded file
            if (req.file && req.file.path) {
                try {
                    await fs.unlink(req.file.path);
                } catch (cleanupError) {
                    console.error(`Failed to cleanup file after error:`, cleanupError);
                }
            }

            res.status(500).json({
                success: false,
                error: error.message || 'Semantic DOM generation failed',
                processingId,
                details: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
    }

    /**
     * Multi-Model Azure Analysis
     */
    async performMultiModelAnalysis(filePath, mimeType) {
        console.log('🔍 Performing multi-model Azure Document Intelligence analysis...');

        const results = {
            layout: null,
            custom: null,
            composed: null,
            modelsUsed: [],
            timestamp: new Date().toISOString()
        };

        try {
            // Primary: Layout Model for structure and formatting
            results.layout = await this.callAzureModel('prebuilt-layout', filePath, mimeType);
            results.modelsUsed.push('prebuilt-layout');
            console.log('✅ Layout model completed');
        } catch (error) {
            console.warn('⚠️ Layout model failed:', error.message);
        }

        try {
            // Secondary: Document Model for general content
            results.custom = await this.callAzureModel('prebuilt-document', filePath, mimeType);
            results.modelsUsed.push('prebuilt-document');
            console.log('✅ Document model completed');
        } catch (error) {
            console.warn('⚠️ Document model failed:', error.message);
        }

        try {
            // Tertiary: Read Model for OCR enhancement
            results.read = await this.callAzureModel('prebuilt-read', filePath, mimeType);
            results.modelsUsed.push('prebuilt-read');
            console.log('✅ Read model completed');
        } catch (error) {
            console.warn('⚠️ Read model failed:', error.message);
        }

        if (results.modelsUsed.length === 0) {
            throw new Error('All Azure models failed. Check Azure configuration and credentials.');
        }

        return results;
    }

    /**
     * Call individual Azure model
     */
    async callAzureModel(modelId, filePath, mimeType) {
        const fetch = require('node-fetch');
        const FormData = require('form-data');

        const AZURE_KEY = process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY;
        const AZURE_ENDPOINT = process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT;

        if (!AZURE_KEY || !AZURE_ENDPOINT) {
            throw new Error('Azure Document Intelligence not configured');
        }

        const analyzeUrl = `${AZURE_ENDPOINT}/formrecognizer/documentModels/${modelId}:analyze?api-version=2024-07-31-preview&features=styleFont,ocrHighResolution`;

        // Read file and create form data
        const fileBuffer = await fs.readFile(filePath);
        const formData = new FormData();
        formData.append('file', fileBuffer, {
            filename: path.basename(filePath),
            contentType: mimeType
        });

        // Start analysis
        const analyzeResponse = await fetch(analyzeUrl, {
            method: 'POST',
            headers: {
                'Ocp-Apim-Subscription-Key': AZURE_KEY,
                ...formData.getHeaders()
            },
            body: formData
        });

        if (!analyzeResponse.ok) {
            const errorText = await analyzeResponse.text();
            throw new Error(`Azure ${modelId} analysis failed: ${analyzeResponse.status} ${errorText}`);
        }

        const operationLocation = analyzeResponse.headers.get('Operation-Location');
        if (!operationLocation) {
            throw new Error(`No operation location returned for ${modelId}`);
        }

        // Poll for results
        return await this.pollAzureResults(operationLocation, AZURE_KEY);
    }

    /**
     * Poll Azure for analysis results
     */
    async pollAzureResults(operationLocation, azureKey, maxAttempts = 30, delayMs = 2000) {
        const fetch = require('node-fetch');

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const response = await fetch(operationLocation, {
                headers: {
                    'Ocp-Apim-Subscription-Key': azureKey,
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

        throw new Error('Analysis timed out after maximum attempts');
    }

    /**
     * Build Semantic JSON DOM from all analysis results
     */
    async buildSemanticDOM(azureResults, formattingResults, bulletResults, hierarchyResults) {
        console.log('🏗️ Building comprehensive Semantic JSON DOM...');

        const semanticDOM = {
            version: '2.0',
            type: 'semantic-document-dom',
            metadata: {
                generation: {
                    timestamp: new Date().toISOString(),
                    version: '2.0',
                    modelsUsed: azureResults.modelsUsed
                },
                document: {
                    pageCount: azureResults.layout?.pages?.length || 1,
                    totalElements: 0,
                    layoutType: this.detectLayoutType(azureResults),
                    confidence: this.calculateOverallConfidence(formattingResults, bulletResults, hierarchyResults)
                }
            },

            // Core content structure
            content: {
                hierarchy: this.processHierarchyElements(hierarchyResults.hierarchyElements),
                bulletPoints: this.processBulletPoints(bulletResults.bulletPoints),
                paragraphs: this.extractParagraphs(azureResults),
                tables: azureResults.layout?.tables || [],
                keyValuePairs: azureResults.custom?.keyValuePairs || []
            },

            // Formatting preservation
            formatting: {
                fonts: this.extractFontInformation(hierarchyResults.fontAnalysis),
                styles: this.extractStyleInformation(azureResults),
                layout: this.extractLayoutInformation(azureResults),
                colors: this.extractColorInformation(azureResults)
            },

            // Structure analysis
            structure: {
                sections: this.identifyDocumentSections(hierarchyResults.hierarchyElements, bulletResults.bulletPoints),
                listStructures: bulletResults.listStructures,
                relationships: this.buildElementRelationships(hierarchyResults.hierarchyElements, bulletResults.bulletPoints)
            },

            // Quality metrics
            quality: {
                formatting: formattingResults.confidence,
                bulletDetection: bulletResults.metadata.totalConfidence,
                hierarchy: hierarchyResults.metadata.confidence,
                overall: this.calculateOverallConfidence(formattingResults, bulletResults, hierarchyResults)
            }
        };

        semanticDOM.metadata.document.totalElements =
            semanticDOM.content.hierarchy.length +
            semanticDOM.content.bulletPoints.length +
            semanticDOM.content.paragraphs.length;

        console.log(`🏗️ Semantic DOM built with ${semanticDOM.metadata.document.totalElements} elements`);

        return semanticDOM;
    }

    /**
     * Generate final comprehensive results
     */
    generateFinalResults(semanticDOM, reconstructionResults, azureResults, formattingResults, bulletResults, hierarchyResults, processingTime, processingId) {
        return {
            success: true,
            processingId,

            // Main outputs
            semanticDOM,
            htmlContent: reconstructionResults.html,
            cssStyles: reconstructionResults.css,

            // Analysis results
            analysis: {
                formatting: {
                    bulletPoints: formattingResults.bulletPoints,
                    visualHierarchy: formattingResults.visualHierarchy,
                    confidence: formattingResults.confidence
                },
                bullets: {
                    total: bulletResults.bulletPoints.length,
                    listStructures: bulletResults.listStructures.length,
                    statistics: bulletResults.metadata.statistics,
                    confidence: bulletResults.metadata.totalConfidence
                },
                hierarchy: {
                    levels: hierarchyResults.metadata.hierarchyLevels,
                    elements: hierarchyResults.hierarchyElements.length,
                    fontAnalysis: hierarchyResults.fontAnalysis,
                    confidence: hierarchyResults.metadata.confidence
                }
            },

            // Preservation metrics
            preservation: {
                formatPreservation: reconstructionResults.metadata.preservationScore,
                qualityScore: reconstructionResults.metadata.qualityScore,
                confidenceScore: semanticDOM.quality.overall,
                completeness: this.calculateCompletenessScore(semanticDOM)
            },

            // Processing metadata
            metadata: {
                processingTime,
                azureModelsUsed: azureResults.modelsUsed,
                processingSteps: [
                    'multi-model-azure-analysis',
                    'formatting-detection',
                    'bullet-point-detection',
                    'visual-hierarchy-analysis',
                    'semantic-dom-construction',
                    'content-reconstruction'
                ],
                statistics: {
                    totalElements: semanticDOM.metadata.document.totalElements,
                    hierarchyElements: semanticDOM.content.hierarchy.length,
                    bulletPoints: semanticDOM.content.bulletPoints.length,
                    paragraphs: semanticDOM.content.paragraphs.length,
                    listStructures: semanticDOM.structure.listStructures.length
                }
            }
        };
    }

    // Utility methods for DOM processing

    processHierarchyElements(hierarchyElements) {
        return hierarchyElements.map(element => ({
            id: element.id,
            level: element.level,
            tag: element.semanticTag,
            text: element.content?.text || '',
            confidence: element.confidence,
            position: element.position,
            style: element.style,
            cssClass: element.cssClass
        }));
    }

    processBulletPoints(bulletPoints) {
        return bulletPoints.map(bullet => ({
            id: bullet.id,
            text: bullet.cleanText,
            bulletType: bullet.formatting?.bulletType,
            level: bullet.formatting?.level || 0,
            confidence: bullet.confidence,
            position: bullet.position,
            listContext: bullet.listContext
        }));
    }

    extractParagraphs(azureResults) {
        const paragraphs = [];

        if (azureResults.layout?.pages) {
            for (const page of azureResults.layout.pages) {
                if (page.paragraphs) {
                    for (const paragraph of page.paragraphs) {
                        paragraphs.push({
                            id: `paragraph_${paragraphs.length}`,
                            text: paragraph.content,
                            confidence: paragraph.confidence || 0.8,
                            page: page.pageNumber || 1,
                            boundingBox: this.extractBoundingBox(paragraph)
                        });
                    }
                }
            }
        }

        return paragraphs;
    }

    extractFontInformation(fontAnalysis) {
        return {
            sizes: Array.from(fontAnalysis?.fontSizes?.keys() || []),
            families: Array.from(fontAnalysis?.fontFamilies?.keys() || []),
            weights: Array.from(fontAnalysis?.fontWeights?.keys() || []),
            statistics: fontAnalysis?.statistics || {}
        };
    }

    extractStyleInformation(azureResults) {
        const styles = [];

        if (azureResults.layout?.pages) {
            for (const page of azureResults.layout.pages) {
                if (page.styles) {
                    styles.push(...page.styles);
                }
            }
        }

        return styles;
    }

    extractLayoutInformation(azureResults) {
        const firstPage = azureResults.layout?.pages?.[0];

        return {
            pageSize: {
                width: firstPage?.width || 612,
                height: firstPage?.height || 792
            },
            orientation: this.detectOrientation(firstPage),
            columns: this.detectColumnCount(azureResults),
            margins: this.estimateMargins(azureResults)
        };
    }

    extractColorInformation(azureResults) {
        const colors = new Set();

        if (azureResults.layout?.pages) {
            for (const page of azureResults.layout.pages) {
                if (page.styles) {
                    for (const style of page.styles) {
                        if (style.color) {
                            colors.add(style.color);
                        }
                        if (style.backgroundColor) {
                            colors.add(style.backgroundColor);
                        }
                    }
                }
            }
        }

        return Array.from(colors);
    }

    identifyDocumentSections(hierarchyElements, bulletPoints) {
        const sections = [];
        const headerElements = hierarchyElements.filter(h => h.level <= 2);

        for (let i = 0; i < headerElements.length; i++) {
            const header = headerElements[i];
            const nextHeader = headerElements[i + 1];

            sections.push({
                id: `section_${i}`,
                title: header.content?.text || '',
                titleElement: header.id,
                type: this.classifySectionType(header.content?.text || ''),
                startY: header.position?.y || 0,
                endY: nextHeader?.position?.y || Infinity
            });
        }

        return sections;
    }

    buildElementRelationships(hierarchyElements, bulletPoints) {
        const relationships = [];

        // Build hierarchy relationships
        for (const element of hierarchyElements) {
            const children = hierarchyElements.filter(other =>
                other.level === element.level + 1 &&
                other.position?.y > element.position?.y
            );

            if (children.length > 0) {
                relationships.push({
                    type: 'hierarchy',
                    parent: element.id,
                    children: children.map(c => c.id)
                });
            }
        }

        // Build list relationships
        const listGroups = this.groupBulletsByProximity(bulletPoints);
        for (const group of listGroups) {
            if (group.length > 1) {
                relationships.push({
                    type: 'list',
                    items: group.map(b => b.id)
                });
            }
        }

        return relationships;
    }

    // Helper methods

    detectLayoutType(azureResults) {
        const firstPage = azureResults.layout?.pages?.[0];
        if (!firstPage || !firstPage.words) return 'single-column';

        const xPositions = firstPage.words.map(w => w.polygon?.[0] || 0);
        const uniqueXPositions = [...new Set(xPositions.map(x => Math.round(x / 20) * 20))];

        if (uniqueXPositions.length <= 3) return 'single-column';
        if (uniqueXPositions.length <= 6) return 'two-column';
        return 'multi-column';
    }

    detectOrientation(page) {
        if (!page) return 'portrait';
        return page.width > page.height ? 'landscape' : 'portrait';
    }

    detectColumnCount(azureResults) {
        // Simplified column detection
        return 1;
    }

    estimateMargins(azureResults) {
        // Simplified margin estimation
        return { top: 72, right: 72, bottom: 72, left: 72 };
    }

    classifySectionType(title) {
        const titleLower = title.toLowerCase();

        if (titleLower.includes('experience') || titleLower.includes('work')) return 'experience';
        if (titleLower.includes('education') || titleLower.includes('school')) return 'education';
        if (titleLower.includes('skill')) return 'skills';
        if (titleLower.includes('summary') || titleLower.includes('objective')) return 'summary';
        if (titleLower.includes('project')) return 'projects';
        if (titleLower.includes('certification')) return 'certifications';

        return 'other';
    }

    groupBulletsByProximity(bulletPoints) {
        // Simplified grouping by proximity
        const groups = [];
        const processed = new Set();

        for (const bullet of bulletPoints) {
            if (processed.has(bullet.id)) continue;

            const group = [bullet];
            processed.add(bullet.id);

            // Find nearby bullets
            for (const other of bulletPoints) {
                if (processed.has(other.id)) continue;

                const distance = Math.abs((bullet.position?.y || 0) - (other.position?.y || 0));
                if (distance < 50) { // Within 50 points
                    group.push(other);
                    processed.add(other.id);
                }
            }

            groups.push(group);
        }

        return groups;
    }

    calculateOverallConfidence(formattingResults, bulletResults, hierarchyResults) {
        const weights = {
            formatting: 0.3,
            bullets: 0.35,
            hierarchy: 0.35
        };

        return (
            (formattingResults.confidence || 0) * weights.formatting +
            (bulletResults.metadata?.totalConfidence || 0) * weights.bullets +
            (hierarchyResults.metadata?.confidence || 0) * weights.hierarchy
        );
    }

    calculateCompletenessScore(semanticDOM) {
        let score = 0;

        // Content completeness
        if (semanticDOM.content.hierarchy.length > 0) score += 25;
        if (semanticDOM.content.bulletPoints.length > 0) score += 25;
        if (semanticDOM.content.paragraphs.length > 0) score += 25;

        // Structure completeness
        if (semanticDOM.structure.sections.length > 0) score += 15;
        if (semanticDOM.structure.listStructures.length > 0) score += 10;

        return score;
    }

    extractBoundingBox(element) {
        const polygon = element.polygon || element.boundingRegions?.[0]?.polygon;
        if (!polygon || polygon.length < 6) {
            return { x: 0, y: 0, width: 0, height: 0 };
        }
        return {
            x: polygon[0],
            y: polygon[1],
            width: polygon[4] - polygon[0],
            height: polygon[5] - polygon[1]
        };
    }
}

// Create controller instance
const semanticDOMController = new SemanticDOMController();

// Export endpoints
module.exports = {
    generateSemanticDOM: [upload.single('document'), semanticDOMController.generateSemanticDOM.bind(semanticDOMController)]
};