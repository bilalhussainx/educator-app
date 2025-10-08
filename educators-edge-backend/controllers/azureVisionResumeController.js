/**
 * Azure Vision Resume Controller
 * Handles advanced resume parsing using Azure Document Intelligence
 * Provides APIs for document structure detection, formatting preservation, and template generation
 */

const db = require('../db');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const fetch = require('node-fetch');
const FormData = require('form-data');
const { v4: uuidv4 } = require('uuid');

// Azure Document Intelligence configuration
const AZURE_DOCUMENT_INTELLIGENCE_KEY = process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY;
const AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT = process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT;

// Configure multer for resume upload
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads/resumes');
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
        cb(null, `resume-${uniqueSuffix}${extension}`);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 20 * 1024 * 1024, // 20MB limit for high-quality resumes
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
            'application/msword', // .doc
            'image/jpeg',
            'image/png',
            'image/tiff'
        ];

        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Supported formats: PDF, Word documents, JPEG, PNG, TIFF'));
        }
    }
});

/**
 * Call Azure Document Intelligence API
 */
const callAzureDocumentModel = async (modelId, filePath, mimeType) => {
    if (!AZURE_DOCUMENT_INTELLIGENCE_KEY || !AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT) {
        throw new Error('Azure Document Intelligence not configured. Set AZURE_DOCUMENT_INTELLIGENCE_KEY and AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT');
    }

    const analyzeUrl = `${AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT}/formrecognizer/documentModels/${modelId}:analyze?api-version=2023-07-31`;

    // Read file and create form data
    const fileBuffer = await fs.readFile(filePath);
    const formData = new FormData();
    formData.append('file', fileBuffer, {
        filename: path.basename(filePath),
        contentType: mimeType
    });

    console.log(`[AZURE VISION] Calling ${modelId} model for document analysis...`);

    // Start analysis
    const analyzeResponse = await fetch(analyzeUrl, {
        method: 'POST',
        headers: {
            'Ocp-Apim-Subscription-Key': AZURE_DOCUMENT_INTELLIGENCE_KEY,
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
    return await pollAzureResults(operationLocation);
};

/**
 * Poll Azure for analysis results
 */
const pollAzureResults = async (operationLocation, maxAttempts = 30, delayMs = 2000) => {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        console.log(`[AZURE VISION] Polling attempt ${attempt + 1}/${maxAttempts}...`);

        const response = await fetch(operationLocation, {
            headers: {
                'Ocp-Apim-Subscription-Key': AZURE_DOCUMENT_INTELLIGENCE_KEY,
            }
        });

        const result = await response.json();

        if (result.status === 'succeeded') {
            console.log('[AZURE VISION] Analysis completed successfully');
            return result.analyzeResult;
        } else if (result.status === 'failed') {
            throw new Error(`Azure analysis failed: ${result.error?.message || 'Unknown error'}`);
        } else if (result.status === 'running') {
            console.log('[AZURE VISION] Analysis still running, waiting...');
        }

        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, delayMs));
    }

    throw new Error('Azure analysis timed out after maximum attempts');
};

/**
 * Perform multi-model Azure analysis
 */
const performMultiModelAnalysis = async (filePath, mimeType) => {
    console.log('[AZURE VISION] Starting multi-model analysis...');

    const analysisPromises = [
        callAzureDocumentModel('prebuilt-layout', filePath, mimeType)
            .catch(error => ({ error: error.message, model: 'layout' })),
        callAzureDocumentModel('prebuilt-read', filePath, mimeType)
            .catch(error => ({ error: error.message, model: 'read' })),
        callAzureDocumentModel('prebuilt-document', filePath, mimeType)
            .catch(error => ({ error: error.message, model: 'document' }))
    ];

    const [layoutResult, readResult, documentResult] = await Promise.allSettled(analysisPromises);

    const results = {
        layout: layoutResult.status === 'fulfilled' && !layoutResult.value.error ? layoutResult.value : null,
        read: readResult.status === 'fulfilled' && !readResult.value.error ? readResult.value : null,
        document: documentResult.status === 'fulfilled' && !documentResult.value.error ? documentResult.value : null,
        timestamp: new Date().toISOString(),
        errors: []
    };

    // Collect any errors
    if (layoutResult.status === 'rejected' || layoutResult.value?.error) {
        results.errors.push(`Layout model: ${layoutResult.reason?.message || layoutResult.value?.error}`);
    }
    if (readResult.status === 'rejected' || readResult.value?.error) {
        results.errors.push(`Read model: ${readResult.reason?.message || readResult.value?.error}`);
    }
    if (documentResult.status === 'rejected' || documentResult.value?.error) {
        results.errors.push(`Document model: ${documentResult.reason?.message || documentResult.value?.error}`);
    }

    console.log('[AZURE VISION] Multi-model analysis complete:', {
        layout: !!results.layout,
        read: !!results.read,
        document: !!results.document,
        errors: results.errors.length
    });

    return results;
};

/**
 * Extract document elements with formatting
 */
const extractDocumentElements = (azureResults) => {
    console.log('[STRUCTURE] Extracting document elements...');

    const elements = [];
    let elementId = 0;

    // Process layout model results (best for formatting)
    if (azureResults.layout?.pages) {
        for (const page of azureResults.layout.pages) {
            // Process words with detailed formatting
            if (page.words) {
                for (const word of page.words) {
                    const element = createDocumentElement(word, page, 'word', elementId++);
                    elements.push(element);
                }
            }

            // Process paragraphs for better grouping
            if (page.paragraphs) {
                for (const paragraph of page.paragraphs) {
                    const element = createDocumentElement(paragraph, page, 'paragraph', elementId++);
                    elements.push(element);
                }
            }

            // Process lines for structural understanding
            if (page.lines) {
                for (const line of page.lines) {
                    const element = createDocumentElement(line, page, 'line', elementId++);
                    elements.push(element);
                }
            }
        }
    }

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

    console.log(`[STRUCTURE] Extracted ${elements.length} document elements`);
    return elements;
};

/**
 * Create a document element from Azure results
 */
const createDocumentElement = (azureElement, page, sourceType, id) => {
    const polygon = azureElement.polygon || azureElement.boundingRegions?.[0]?.polygon;
    const boundingBox = extractBoundingBox(polygon, page.pageNumber || 1);
    const formatting = extractFormattingDetails(azureElement, page);
    const elementType = classifyElementType(azureElement, formatting);

    return {
        id: `element_${id}`,
        text: azureElement.content || '',
        type: elementType,
        sourceType, // 'word', 'paragraph', or 'line'
        boundingBox,
        formatting,
        hierarchy: {
            level: calculateHierarchyLevel(elementType, formatting),
            children: []
        },
        confidence: azureElement.confidence || 0.8,
        spatialRelations: {
            alignedWith: [],
            indentLevel: calculateIndentLevel(boundingBox)
        }
    };
};

/**
 * Extract bounding box from polygon
 */
const extractBoundingBox = (polygon, pageNumber) => {
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
};

/**
 * Extract formatting details from Azure element
 */
const extractFormattingDetails = (element, page) => {
    const polygon = element.polygon || element.boundingRegions?.[0]?.polygon;
    const height = polygon && polygon.length >= 6 ? Math.abs(polygon[5] - polygon[1]) : 12;

    let fontWeight = 'normal';
    let fontStyle = 'normal';
    let fontSize = Math.round(height * 0.75) || 12;

    // Extract style information
    if (element.style) {
        fontWeight = element.style.fontWeight === 'bold' ? 'bold' : 'normal';
        fontStyle = element.style.fontStyle === 'italic' ? 'italic' : 'normal';
    }

    // Check page-level styles
    if (page.styles && element.span) {
        const matchingStyle = page.styles.find(style =>
            style.spans?.some(span =>
                span.offset <= element.span.offset &&
                span.offset + span.length >= element.span.offset + element.span.length
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
        fontFamily: 'Arial, sans-serif',
        color: '#000000',
        alignment: 'left',
        marginTop: 0,
        marginBottom: 0,
        lineHeight: height,
        isBold: fontWeight === 'bold',
        isItalic: fontStyle === 'italic',
        isUnderlined: false
    };
};

/**
 * Classify element type based on content and formatting
 */
const classifyElementType = (element, formatting) => {
    const text = (element.content || '').toLowerCase().trim();

    // Title detection
    if (formatting.fontSize > 16 && formatting.isBold) {
        return 'title';
    }

    // Section header detection
    if (isSectionHeader(text) || (formatting.isBold && formatting.fontSize > 12)) {
        return 'section-header';
    }

    // Contact info detection
    if (isContactInfo(text)) {
        return 'contact-info';
    }

    // Date detection
    if (isDate(text)) {
        return 'date';
    }

    // Job title detection
    if (isJobTitle(text)) {
        return 'job-title';
    }

    // Company detection
    if (isCompany(text)) {
        return 'company';
    }

    // Bullet point detection
    if (isBulletPoint(text)) {
        return 'bullet-point';
    }

    return 'paragraph';
};

/**
 * Text classification helper functions
 */
const isSectionHeader = (text) => {
    const sectionHeaders = [
        'experience', 'education', 'skills', 'summary', 'objective',
        'certifications', 'projects', 'awards', 'publications', 'contact',
        'work experience', 'professional experience', 'employment history',
        'technical skills', 'core competencies', 'achievements'
    ];
    return sectionHeaders.some(header => text.includes(header));
};

const isContactInfo = (text) => {
    const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
    const phonePattern = /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/;
    const urlPattern = /\b(?:https?:\/\/|www\.)\S+\b/;
    return emailPattern.test(text) || phonePattern.test(text) || urlPattern.test(text);
};

const isDate = (text) => {
    const datePatterns = [
        /\b\d{4}\b/,
        /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/i,
        /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/,
        /\b(January|February|March|April|May|June|July|August|September|October|November|December)\b/i
    ];
    return datePatterns.some(pattern => pattern.test(text));
};

const isJobTitle = (text) => {
    const jobTitlePatterns = [
        /\b(manager|director|analyst|engineer|developer|designer|specialist|coordinator|assistant|supervisor|executive|officer|representative|associate|technician|lead|senior|junior|principal|chief)\b/i
    ];
    return jobTitlePatterns.some(pattern => pattern.test(text));
};

const isCompany = (text) => {
    const companyPatterns = [
        /(inc\.|llc|corp\.|ltd\.|company|corporation|industries|solutions|systems|technologies|group|associates)$/i
    ];
    return companyPatterns.some(pattern => pattern.test(text));
};

const isBulletPoint = (text) => {
    const bulletChars = ['•', '◦', '▪', '▫', '■', '□', '★', '☆', '-', '▶'];
    return bulletChars.some(char => text.startsWith(char)) || /^\d+\./.test(text);
};

const calculateHierarchyLevel = (type, formatting) => {
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

    if (formatting.isBold) level -= 0.5;
    if (formatting.fontSize > 14) level -= 0.5;
    if (formatting.fontSize > 18) level -= 1;

    return Math.max(1, Math.round(level));
};

const calculateIndentLevel = (boundingBox) => {
    return Math.round(boundingBox.x / 36);
};

/**
 * Generate preservation data for template reconstruction
 */
const generatePreservationData = (elements, sections) => {
    console.log('[PRESERVATION] Generating template preservation data...');

    // Generate CSS stylesheet
    const styleSheet = generateStyleSheet(elements, sections);

    // Create template mapping
    const templateMapping = {
        sections: sections.map(section => ({
            id: section.id,
            title: section.title,
            type: section.type,
            elementCount: section.elements?.length || 0
        })),
        elementTypes: {
            titles: elements.filter(el => el.type === 'title').length,
            sectionHeaders: elements.filter(el => el.type === 'section-header').length,
            bulletPoints: elements.filter(el => el.type === 'bullet-point').length,
            paragraphs: elements.filter(el => el.type === 'paragraph').length
        }
    };

    // Generate reconstruction instructions
    const reconstructionInstructions = [
        'Document Structure Reconstruction Guide:',
        '1. Apply page margins and layout settings',
        '2. Use font hierarchy levels to maintain visual structure',
        '3. Preserve section spacing and alignment',
        '4. Maintain bullet point indentation and styles',
        '5. Keep contact information formatting consistent'
    ];

    return {
        styleSheet,
        templateMapping,
        reconstructionInstructions
    };
};

const generateStyleSheet = (elements, sections) => {
    let css = `/* Auto-generated stylesheet from Azure Vision analysis */\n\n`;

    // Font hierarchy
    const fontSizes = [...new Set(elements.map(el => el.formatting.fontSize))].sort((a, b) => b - a);
    fontSizes.forEach((size, index) => {
        css += `.font-level-${index + 1} {\n`;
        css += `  font-size: ${size}pt;\n`;
        css += `}\n\n`;
    });

    return css;
};

/**
 * API Endpoints
 */

/**
 * @desc    Analyze resume structure using Azure Vision
 * @route   POST /api/azure-vision/analyze-resume
 * @access  Private
 */
const analyzeResumeStructure = async (req, res) => {
    const startTime = Date.now();

    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({
                success: false,
                error: 'User not authenticated'
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No resume file uploaded'
            });
        }

        const userId = req.user.id;
        const file = req.file;

        console.log(`[AZURE VISION] Starting resume analysis for user ${userId}: ${file.originalname}`);

        // Perform multi-model Azure analysis
        const azureResults = await performMultiModelAnalysis(file.path, file.mimetype);

        // Extract document elements
        const elements = extractDocumentElements(azureResults);

        // Detect sections (simplified for now)
        const sections = detectDocumentSections(elements);

        // Extract personal information
        const personalInfo = extractPersonalInformation(elements);

        // Analyze bullet point structure
        const bulletPoints = analyzeBulletPointStructure(elements);

        // Generate preservation data
        const preservationData = generatePreservationData(elements, sections);

        // Calculate metadata
        const processingTime = Date.now() - startTime;
        const confidence = calculateOverallConfidence(elements);
        const qualityScore = calculateQualityScore(elements, sections);

        // Save analysis results to database
        const analysisId = uuidv4();
        await saveAnalysisResults(analysisId, userId, file, {
            elements,
            sections,
            personalInfo,
            bulletPoints,
            preservationData,
            azureResults,
            metadata: {
                processingTime,
                confidence,
                qualityScore,
                azureModelsUsed: ['prebuilt-layout', 'prebuilt-read', 'prebuilt-document']
            }
        });

        // Prepare response
        const result = {
            success: true,
            analysisId,
            documentInfo: {
                pageCount: azureResults.layout?.pages?.length || 1,
                totalElements: elements.length,
                layoutType: detectLayoutType(elements),
                overallStyle: detectOverallStyle(elements)
            },
            personalInfo,
            sections,
            bulletPoints,
            preservationData,
            metadata: {
                processingTime,
                confidence,
                qualityScore,
                azureModelsUsed: ['prebuilt-layout', 'prebuilt-read', 'prebuilt-document'],
                detectedLanguage: 'en'
            }
        };

        console.log(`[AZURE VISION] Analysis complete for ${file.originalname}:`, {
            elements: elements.length,
            sections: sections.length,
            processingTime: `${processingTime}ms`,
            confidence: Math.round(confidence * 100) + '%'
        });

        res.json(result);

    } catch (error) {
        console.error('[AZURE VISION] Analysis failed:', error);

        // Clean up uploaded file
        if (req.file && req.file.path) {
            try {
                await fs.unlink(req.file.path);
            } catch (cleanupError) {
                console.error('Failed to cleanup uploaded file:', cleanupError);
            }
        }

        res.status(500).json({
            success: false,
            error: error.message || 'Resume analysis failed',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

/**
 * Helper functions for analysis
 */
const detectDocumentSections = (elements) => {
    const sections = [];
    const sectionHeaders = elements.filter(el => el.type === 'section-header');

    sectionHeaders.forEach((header, index) => {
        const nextHeader = sectionHeaders[index + 1];

        const sectionElements = elements.filter(el => {
            const afterCurrentHeader = el.boundingBox.y > header.boundingBox.y;
            const beforeNextHeader = !nextHeader || el.boundingBox.y < nextHeader.boundingBox.y;
            return afterCurrentHeader && beforeNextHeader && el.id !== header.id;
        });

        sections.push({
            id: `section_${index}`,
            title: header.text,
            type: classifySectionType(header.text),
            elements: sectionElements,
            titleElement: header
        });
    });

    return sections;
};

const classifySectionType = (title) => {
    const titleLower = title.toLowerCase();

    if (titleLower.includes('experience') || titleLower.includes('employment')) return 'experience';
    if (titleLower.includes('education') || titleLower.includes('academic')) return 'education';
    if (titleLower.includes('skills') || titleLower.includes('competencies')) return 'skills';
    if (titleLower.includes('summary') || titleLower.includes('objective')) return 'summary';
    if (titleLower.includes('project')) return 'projects';
    if (titleLower.includes('certification')) return 'certifications';
    if (titleLower.includes('award')) return 'awards';
    if (titleLower.includes('contact')) return 'personal-info';

    return 'other';
};

const extractPersonalInformation = (elements) => {
    const personalInfo = {};

    // Find name (usually first large, bold text)
    const nameCandidate = elements.find(el =>
        el.type === 'title' &&
        el.hierarchy.level === 1 &&
        !isContactInfo(el.text)
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
};

const analyzeBulletPointStructure = (elements) => {
    const bulletElements = elements.filter(el => el.type === 'bullet-point');
    return bulletElements.map(bullet => ({
        bulletType: detectBulletType(bullet.text),
        elements: [bullet],
        indentLevel: bullet.spatialRelations.indentLevel,
        subBullets: []
    }));
};

const detectBulletType = (text) => {
    if (text.startsWith('•')) return '•';
    if (text.startsWith('◦')) return '◦';
    if (text.startsWith('-')) return '-';
    if (/^\d+\./.test(text)) return 'numbered';
    return '•';
};

const detectLayoutType = (elements) => {
    const xPositions = elements.map(el => el.boundingBox.x);
    const uniquePositions = [...new Set(xPositions.map(x => Math.round(x / 10) * 10))];

    if (uniquePositions.length <= 2) return 'single-column';
    if (uniquePositions.length <= 4) return 'two-column';
    return 'multi-column';
};

const detectOverallStyle = (elements) => {
    const boldCount = elements.filter(el => el.formatting.isBold).length;
    const italicCount = elements.filter(el => el.formatting.isItalic).length;
    const largeFontCount = elements.filter(el => el.formatting.fontSize > 14).length;

    const boldRatio = boldCount / elements.length;
    const largeFontRatio = largeFontCount / elements.length;

    if (boldRatio > 0.3 && largeFontRatio > 0.2) return 'creative';
    if (boldRatio < 0.1 && largeFontRatio < 0.1) return 'traditional';
    return 'modern';
};

const calculateOverallConfidence = (elements) => {
    if (elements.length === 0) return 0;
    const totalConfidence = elements.reduce((sum, el) => sum + el.confidence, 0);
    return totalConfidence / elements.length;
};

const calculateQualityScore = (elements, sections) => {
    let score = 0;

    if (elements.length > 0) score += 20;
    if (sections.length >= 3) score += 30;

    const bulletPoints = elements.filter(el => el.type === 'bullet-point').length;
    if (bulletPoints > 0) score += 20;

    const contactInfo = elements.filter(el => el.type === 'contact-info').length;
    if (contactInfo > 0) score += 20;

    const avgConfidence = calculateOverallConfidence(elements);
    score += Math.round(avgConfidence * 10);

    return Math.min(100, score);
};

/**
 * Save analysis results to database
 */
const saveAnalysisResults = async (analysisId, userId, file, analysisData) => {
    try {
        // Create table if it doesn't exist
        await db.query(`
            CREATE TABLE IF NOT EXISTS resume_analyses (
                id VARCHAR(36) PRIMARY KEY,
                user_id VARCHAR(36) NOT NULL,
                original_filename VARCHAR(255) NOT NULL,
                file_path VARCHAR(500) NOT NULL,
                file_size INTEGER NOT NULL,
                mime_type VARCHAR(100) NOT NULL,
                analysis_data JSONB NOT NULL,
                processing_time INTEGER NOT NULL,
                confidence_score FLOAT NOT NULL,
                quality_score INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await db.query(`
            INSERT INTO resume_analyses
            (id, user_id, original_filename, file_path, file_size, mime_type, analysis_data, processing_time, confidence_score, quality_score, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
        `, [
            analysisId,
            userId,
            file.originalname,
            file.path,
            file.size,
            file.mimetype,
            JSON.stringify(analysisData),
            analysisData.metadata.processingTime,
            analysisData.metadata.confidence,
            analysisData.metadata.qualityScore
        ]);

        console.log(`[DATABASE] Saved analysis results for ${analysisId}`);
    } catch (error) {
        console.error('[DATABASE] Failed to save analysis results:', error);
        throw error;
    }
};

/**
 * @desc    Get analysis results by ID
 * @route   GET /api/azure-vision/analysis/:analysisId
 * @access  Private
 */
const getAnalysisResults = async (req, res) => {
    try {
        const { analysisId } = req.params;
        const userId = req.user.id;

        const result = await db.query(`
            SELECT * FROM resume_analyses
            WHERE id = $1 AND user_id = $2
        `, [analysisId, userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Analysis not found'
            });
        }

        const analysis = result.rows[0];

        res.json({
            success: true,
            analysis: {
                id: analysis.id,
                filename: analysis.original_filename,
                processingTime: analysis.processing_time,
                confidenceScore: analysis.confidence_score,
                qualityScore: analysis.quality_score,
                createdAt: analysis.created_at,
                data: analysis.analysis_data
            }
        });

    } catch (error) {
        console.error('[AZURE VISION] Failed to get analysis results:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve analysis results'
        });
    }
};

/**
 * @desc    List user's resume analyses
 * @route   GET /api/azure-vision/analyses
 * @access  Private
 */
const listAnalyses = async (req, res) => {
    try {
        const userId = req.user.id;
        const { page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        const result = await db.query(`
            SELECT id, original_filename, processing_time, confidence_score, quality_score, created_at
            FROM resume_analyses
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
        `, [userId, limit, offset]);

        const countResult = await db.query(`
            SELECT COUNT(*) as total FROM resume_analyses WHERE user_id = $1
        `, [userId]);

        res.json({
            success: true,
            analyses: result.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: parseInt(countResult.rows[0].total),
                pages: Math.ceil(countResult.rows[0].total / limit)
            }
        });

    } catch (error) {
        console.error('[AZURE VISION] Failed to list analyses:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve analyses list'
        });
    }
};

module.exports = {
    analyzeResumeStructure: [upload.single('resume'), analyzeResumeStructure],
    getAnalysisResults,
    listAnalyses
};