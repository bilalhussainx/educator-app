/**
 * Visual Context Resume Controller
 * Main API controller for the Visual Context Resume System
 * Orchestrates the full pipeline: Azure Vision → Context Builder → HTML Reconstruction → Claude Analysis
 */

const db = require('../db');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const mammoth = require('mammoth');

// Import services
const { callAzureDocumentModel } = require('./azureVisionResumeController');
const { buildFormattingContext } = require('../services/formattingContextBuilder');
const { reconstructHTML, generateSemanticHTML, extractPlainText } = require('../services/htmlReconstructionService');
const { analyzeResumeWithContext, generateImprovementRoadmap, applyCoachingRecommendations } = require('../services/claudeResumeCoachService');

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
        fileSize: 20 * 1024 * 1024, // 20MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/msword'
        ];

        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only PDF and DOCX files are supported.'));
        }
    }
});

/**
 * Azure Document Intelligence configuration
 */
const AZURE_DOCUMENT_INTELLIGENCE_KEY = process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY;
const AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT = process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT;

/**
 * Call Azure Document Intelligence API
 */
const performAzureAnalysis = async (filePath, mimeType) => {
    if (!AZURE_DOCUMENT_INTELLIGENCE_KEY || !AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT) {
        throw new Error('Azure Document Intelligence not configured');
    }

    console.log('[AZURE] Starting document analysis...');
    console.log('[AZURE] File path:', filePath);
    console.log('[AZURE] Original MIME type:', mimeType);
    console.log('[AZURE] Endpoint:', AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT);
    console.log('[AZURE] Key configured:', !!AZURE_DOCUMENT_INTELLIGENCE_KEY);

    // Remove trailing slash from endpoint if present
    const endpoint = AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT.replace(/\/+$/, '');
    const analyzeUrl = `${endpoint}/documentintelligence/documentModels/prebuilt-layout:analyze?api-version=2024-07-31-preview`;

    console.log('[AZURE] Full URL:', analyzeUrl);

    // Read file
    const fileBuffer = await fs.readFile(filePath);
    console.log('[AZURE] File size:', fileBuffer.length, 'bytes');

    // Azure Document Intelligence expects application/octet-stream for binary files
    const contentType = 'application/octet-stream';
    console.log('[AZURE] Using Content-Type:', contentType);

    // Call Azure API - Send raw binary content
    const fetch = require('node-fetch');
    const AbortController = require('abort-controller');
    const controller = new AbortController();
    const timeout = setTimeout(() => {
        controller.abort();
    }, 30000); // 30 second timeout

    try {
        const analyzeResponse = await fetch(analyzeUrl, {
            method: 'POST',
            headers: {
                'Ocp-Apim-Subscription-Key': AZURE_DOCUMENT_INTELLIGENCE_KEY,
                'Content-Type': contentType
            },
            body: fileBuffer,
            signal: controller.signal
        });

        clearTimeout(timeout);

    console.log('[AZURE] Response status:', analyzeResponse.status);

    if (!analyzeResponse.ok) {
        const errorText = await analyzeResponse.text();
        throw new Error(`Azure analysis failed: ${analyzeResponse.status} ${errorText}`);
    }

    const operationLocation = analyzeResponse.headers.get('Operation-Location');
    if (!operationLocation) {
        throw new Error('No operation location returned');
    }

        // Poll for results
        return await pollAzureResults(operationLocation);
    } catch (error) {
        clearTimeout(timeout);
        if (error.name === 'AbortError') {
            console.error('[AZURE] Request timeout after 30 seconds');
            throw new Error('Azure Document Intelligence request timed out');
        }
        throw error;
    }
};

/**
 * Poll Azure for analysis results
 */
const pollAzureResults = async (operationLocation, maxAttempts = 30, delayMs = 2000) => {
    const fetch = require('node-fetch');

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        console.log(`[AZURE] Polling attempt ${attempt + 1}/${maxAttempts}...`);

        const response = await fetch(operationLocation, {
            headers: {
                'Ocp-Apim-Subscription-Key': AZURE_DOCUMENT_INTELLIGENCE_KEY,
            }
        });

        const result = await response.json();

        if (result.status === 'succeeded') {
            console.log('[AZURE] Analysis completed successfully');
            console.log('[AZURE] Result keys:', Object.keys(result.analyzeResult || {}));
            console.log('[AZURE] Has content:', !!result.analyzeResult?.content);
            console.log('[AZURE] Has paragraphs:', !!result.analyzeResult?.paragraphs);
            console.log('[AZURE] Has pages:', !!result.analyzeResult?.pages);
            if (result.analyzeResult?.content) {
                console.log('[AZURE] Content preview:', result.analyzeResult.content.substring(0, 200));
            }
            return result.analyzeResult;
        } else if (result.status === 'failed') {
            throw new Error(`Azure analysis failed: ${result.error?.message || 'Unknown error'}`);
        }

        await new Promise(resolve => setTimeout(resolve, delayMs));
    }

    throw new Error('Azure analysis timed out');
};

/**
 * Extract text from DOCX file with bullets preserved using Mammoth
 * Azure strips bullets, so we use mammoth for better text extraction
 */
const extractDOCXTextWithBullets = async (filePath) => {
    try {
        console.log('[MAMMOTH] Extracting DOCX text with bullets...');

        const result = await mammoth.convertToHtml({
            path: filePath
        }, {
            styleMap: [
                "p[style-name='List Paragraph'] => li:fresh",
                "p[style-name='ListParagraph'] => li:fresh"
            ]
        });

        // Convert HTML to plain text but keep bullets
        let text = result.value;

        // Replace <li> tags with bullet points
        text = text.replace(/<li>/g, '• ');
        text = text.replace(/<\/li>/g, '\n');

        // Remove other HTML tags
        text = text.replace(/<[^>]*>/g, '');

        // Clean up HTML entities
        text = text.replace(/&nbsp;/g, ' ');
        text = text.replace(/&amp;/g, '&');
        text = text.replace(/&lt;/g, '<');
        text = text.replace(/&gt;/g, '>');

        // Clean up excessive whitespace
        text = text.replace(/\n\s*\n\s*\n/g, '\n\n');

        console.log('[MAMMOTH] Extracted text length:', text.length);
        console.log('[MAMMOTH] Preview:', text.substring(0, 200));

        return text;
    } catch (error) {
        console.error('[MAMMOTH] Extraction failed:', error);
        return null;
    }
};

/**
 * Extract document elements from Azure results
 */
const extractDocumentElements = (azureResults) => {
    console.log('[EXTRACTION] Extracting document elements...');

    const elements = [];
    let elementId = 0;

    if (azureResults.pages) {
        for (const page of azureResults.pages) {
            // Process paragraphs (best for content)
            if (page.paragraphs) {
                for (const paragraph of page.paragraphs) {
                    const element = createDocumentElement(paragraph, page, 'paragraph', elementId++);
                    elements.push(element);
                }
            }

            // Process lines as fallback
            if (page.lines && (!page.paragraphs || page.paragraphs.length === 0)) {
                for (const line of page.lines) {
                    const element = createDocumentElement(line, page, 'line', elementId++);
                    elements.push(element);
                }
            }
        }
    }

    // Sort by position
    elements.sort((a, b) => {
        if (a.boundingBox.page !== b.boundingBox.page) {
            return a.boundingBox.page - b.boundingBox.page;
        }
        if (Math.abs(a.boundingBox.y - b.boundingBox.y) < 5) {
            return a.boundingBox.x - b.boundingBox.x;
        }
        return a.boundingBox.y - b.boundingBox.y;
    });

    console.log(`[EXTRACTION] Extracted ${elements.length} elements`);
    return elements;
};

/**
 * Create document element
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
        sourceType,
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

const extractFormattingDetails = (element, page) => {
    const polygon = element.polygon || element.boundingRegions?.[0]?.polygon;
    const height = polygon && polygon.length >= 6 ? Math.abs(polygon[5] - polygon[1]) : 12;

    let fontWeight = 'normal';
    let fontStyle = 'normal';
    let fontSize = Math.round(height * 0.75) || 12;

    if (element.style) {
        fontWeight = element.style.fontWeight === 'bold' ? 'bold' : 'normal';
        fontStyle = element.style.fontStyle === 'italic' ? 'italic' : 'normal';
    }

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

const classifyElementType = (element, formatting) => {
    const text = (element.content || '').toLowerCase().trim();

    if (formatting.fontSize > 16 && formatting.isBold) return 'title';
    if (isSectionHeader(text) || (formatting.isBold && formatting.fontSize > 12)) return 'section-header';
    if (isContactInfo(text)) return 'contact-info';
    if (isDate(text)) return 'date';
    if (isJobTitle(text)) return 'job-title';
    if (isCompany(text)) return 'company';
    if (isBulletPoint(text)) return 'bullet-point';

    return 'paragraph';
};

const isSectionHeader = (text) => {
    const headers = ['experience', 'education', 'skills', 'summary', 'objective', 'certifications', 'projects', 'awards'];
    return headers.some(h => text.includes(h));
};

const isContactInfo = (text) => {
    return /[@]/.test(text) || /\d{3}[-.]?\d{3}[-.]?\d{4}/.test(text) || /https?:\/\//.test(text);
};

const isDate = (text) => {
    return /\d{4}/.test(text) || /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(text);
};

const isJobTitle = (text) => {
    return /(manager|director|engineer|developer|designer|analyst)/i.test(text);
};

const isCompany = (text) => {
    return /(inc\.|llc|corp\.|ltd\.)/i.test(text);
};

const isBulletPoint = (text) => {
    return /^[•◦▪▫■□★☆\-]/.test(text) || /^\d+\./.test(text);
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

    return Math.max(1, Math.round(level));
};

const calculateIndentLevel = (boundingBox) => {
    return Math.round(boundingBox.x / 36);
};

/**
 * Detect sections
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
    if (titleLower.includes('experience')) return 'experience';
    if (titleLower.includes('education')) return 'education';
    if (titleLower.includes('skills')) return 'skills';
    if (titleLower.includes('summary')) return 'summary';
    if (titleLower.includes('project')) return 'projects';
    return 'other';
};

/**
 * Generate simple HTML from Azure content
 * Fallback when element extraction fails
 * Preserves bullet points, styling, and proper formatting
 */
const generateSimpleHTMLFromAzureContent = (azureResults) => {
    const html = [];

    // Add comprehensive styles
    html.push('<style>');
    html.push('.resume-preserved-view {');
    html.push('  font-family: Arial, Helvetica, sans-serif;');
    html.push('  color: #000000;');
    html.push('  background: white;');
    html.push('  max-width: 8.5in;');
    html.push('  margin: 0 auto;');
    html.push('  padding: 0;');
    html.push('  line-height: 1.5;');
    html.push('}');
    html.push('.page {');
    html.push('  min-height: 11in;');
    html.push('  padding: 0.75in;');
    html.push('  background: white;');
    html.push('  box-shadow: 0 0 10px rgba(0,0,0,0.1);');
    html.push('  margin: 20px auto;');
    html.push('}');
    html.push('.paragraph {');
    html.push('  margin-bottom: 6pt;');
    html.push('  line-height: 1.4;');
    html.push('}');
    html.push('.header {');
    html.push('  font-size: 18pt;');
    html.push('  font-weight: bold;');
    html.push('  margin-bottom: 4pt;');
    html.push('  text-align: center;');
    html.push('}');
    html.push('.contact-info {');
    html.push('  font-size: 10pt;');
    html.push('  text-align: center;');
    html.push('  margin-bottom: 12pt;');
    html.push('}');
    html.push('.section-header {');
    html.push('  font-size: 12pt;');
    html.push('  font-weight: bold;');
    html.push('  text-transform: uppercase;');
    html.push('  margin-top: 12pt;');
    html.push('  margin-bottom: 6pt;');
    html.push('  border-bottom: 1.5pt solid #000;');
    html.push('  padding-bottom: 2pt;');
    html.push('}');
    html.push('.bullet-item {');
    html.push('  margin-left: 20pt;');
    html.push('  margin-bottom: 4pt;');
    html.push('  position: relative;');
    html.push('}');
    html.push('.bullet-item:before {');
    html.push('  content: "•";');
    html.push('  position: absolute;');
    html.push('  left: -15pt;');
    html.push('}');
    html.push('.job-header {');
    html.push('  font-weight: bold;');
    html.push('  margin-top: 8pt;');
    html.push('  margin-bottom: 2pt;');
    html.push('}');
    html.push('</style>');

    // Add content
    html.push('<div class="resume-preserved-view">');
    html.push('<div class="page">');

    if (azureResults.paragraphs && azureResults.paragraphs.length > 0) {
        // Process paragraphs with better formatting detection
        azureResults.paragraphs.forEach((para, index) => {
            const content = para.content || '';
            const trimmed = content.trim();

            if (!trimmed) return; // Skip empty paragraphs

            // Detect paragraph type and apply appropriate styling
            let cssClass = 'paragraph';
            let processedContent = escapeHtml(trimmed);

            // First paragraph is likely the name
            if (index === 0 && trimmed.length < 50) {
                cssClass = 'header';
            }
            // Check if it looks like contact info
            else if (trimmed.includes('@') || trimmed.match(/\d{3}[-\s]?\d{3}[-\s]?\d{4}/)) {
                cssClass = 'contact-info';
            }
            // Check if it's an all-caps header
            else if (trimmed === trimmed.toUpperCase() && trimmed.length < 50) {
                cssClass = 'section-header';
            }
            // Check if it's a bullet point
            else if (trimmed.match(/^[•●○◦▪▫-]\s/)) {
                cssClass = 'bullet-item';
                // Remove the bullet marker since CSS adds it
                processedContent = escapeHtml(trimmed.replace(/^[•●○◦▪▫-]\s+/, ''));
            }
            // Check if it looks like a job header (has dates or company indicators)
            else if (trimmed.match(/\d{4}/) && trimmed.length < 100) {
                cssClass = 'job-header';
            }

            html.push(`<div class="${cssClass}">${processedContent}</div>`);
        });
    } else if (azureResults.content) {
        // Fallback to content field with line-by-line processing
        const lines = azureResults.content.split('\n');
        lines.forEach((line, index) => {
            const trimmed = line.trim();
            if (!trimmed) {
                html.push('<div style="margin-bottom: 6pt;"></div>'); // Empty line for spacing
                return;
            }

            let cssClass = 'paragraph';
            let processedContent = escapeHtml(trimmed);

            // Apply same heuristics
            if (index === 0 && trimmed.length < 50) {
                cssClass = 'header';
            } else if (trimmed.includes('@') || trimmed.match(/\d{3}[-\s]?\d{3}[-\s]?\d{4}/)) {
                cssClass = 'contact-info';
            } else if (trimmed === trimmed.toUpperCase() && trimmed.length < 50) {
                cssClass = 'section-header';
            } else if (trimmed.match(/^[•●○◦▪▫-]\s/)) {
                cssClass = 'bullet-item';
                processedContent = escapeHtml(trimmed.replace(/^[•●○◦▪▫-]\s+/, ''));
            } else if (trimmed.match(/\d{4}/) && trimmed.length < 100) {
                cssClass = 'job-header';
            }

            html.push(`<div class="${cssClass}">${processedContent}</div>`);
        });
    }

    html.push('</div>'); // Close page
    html.push('</div>'); // Close container

    console.log('[HTML] Generated HTML length:', html.join('\n').length, 'characters');

    return html.join('\n');
};

/**
 * Escape HTML special characters
 */
const escapeHtml = (text) => {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
};

/**
 * Main endpoint: Analyze resume with full pipeline
 */
const analyzeResumeWithVisualContext = async (req, res) => {
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
        const analysisId = uuidv4();

        console.log(`[PIPELINE] Starting full analysis for user ${userId}: ${file.originalname}`);

        // Step 1: Azure Vision Analysis (with fallback)
        console.log('[PIPELINE] Step 1: Azure Vision Analysis');
        let azureResults = null;
        try {
            azureResults = await performAzureAnalysis(file.path, file.mimetype);
            console.log('[PIPELINE] ✅ Azure analysis completed successfully');
        } catch (azureError) {
            console.warn('[PIPELINE] ⚠️  Azure analysis failed:', azureError.message);
            console.log('[PIPELINE] Continuing with Mammoth-only text extraction...');
            // Don't fail the whole pipeline - we'll use Mammoth as fallback
        }

        // Step 2: Extract Elements and Plain Text
        console.log('[PIPELINE] Step 2: Extract Elements');

        let elements = [];
        let sections = [];

        if (azureResults) {
            console.log('[PIPELINE] Azure result has content:', !!azureResults.content);
            console.log('[PIPELINE] Azure result has paragraphs:', !!azureResults.paragraphs);
            console.log('[PIPELINE] Azure result has pages:', !!azureResults.pages);

            elements = extractDocumentElements(azureResults);
            sections = detectDocumentSections(elements);
        } else {
            console.log('[PIPELINE] Skipping Azure element extraction - using text-based fallback');
        }

        // Extract plain text with bullets preserved
        // For DOCX files, use mammoth to preserve bullets (Azure strips them)
        let editableContent = '';

        const isDOCX = file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                       file.originalname.toLowerCase().endsWith('.docx');

        if (isDOCX) {
            // Use mammoth for DOCX to preserve bullets
            console.log('[PIPELINE] Using Mammoth for DOCX text extraction (preserves bullets)');
            const mammothText = await extractDOCXTextWithBullets(file.path);
            if (mammothText) {
                editableContent = mammothText;
                console.log('[PIPELINE] ✅ Mammoth extracted text with bullets, length:', editableContent.length);
                console.log('[PIPELINE] Text preview:', editableContent.substring(0, 200));
            }
        }

        // Fallback to Azure content if mammoth failed or for PDF files
        if (!editableContent && azureResults && azureResults.content) {
            editableContent = azureResults.content;
            console.log('[PIPELINE] ✅ Extracted text from Azure content field, length:', editableContent.length);
            console.log('[PIPELINE] Text preview:', editableContent.substring(0, 200));
        } else if (!editableContent && azureResults && azureResults.paragraphs) {
            editableContent = azureResults.paragraphs.map(p => p.content).join('\n\n');
            console.log('[PIPELINE] ✅ Extracted text from Azure paragraphs, length:', editableContent.length);
            console.log('[PIPELINE] Text preview:', editableContent.substring(0, 200));
        } else if (!editableContent) {
            // Final fallback to extractPlainText function
            editableContent = extractPlainText(elements, sections);
            console.log('[PIPELINE] ⚠️  Fallback extraction, length:', editableContent.length);
            if (editableContent) {
                console.log('[PIPELINE] Text preview:', editableContent.substring(0, 200));
            } else {
                console.log('[PIPELINE] ❌ No text extracted!');
            }
        }

        // Step 3: Build Formatting Context
        console.log('[PIPELINE] Step 3: Build Formatting Context');
        const formattingContext = buildFormattingContext(elements, sections, azureResults);

        // Step 4: Reconstruct HTML
        console.log('[PIPELINE] Step 4: Reconstruct HTML');
        let preservedHTML;

        // If we have no elements but have content (with bullets from mammoth), generate HTML
        if (elements.length === 0 && editableContent) {
            console.log('[PIPELINE] No elements extracted - generating HTML from extracted content');
            // Create a mock azureResults object with our bullet-preserved content
            const contentForHTML = {
                content: editableContent,
                paragraphs: null  // Don't use paragraphs since they don't have bullets
            };
            preservedHTML = generateSimpleHTMLFromAzureContent(contentForHTML);
        } else {
            preservedHTML = reconstructHTML(elements, sections, formattingContext);
        }

        // Step 5: Claude Analysis
        console.log('[PIPELINE] Step 5: Claude AI Analysis');
        const claudeAnalysis = await analyzeResumeWithContext(editableContent, formattingContext, sections);

        // Step 6: Generate Roadmap
        console.log('[PIPELINE] Step 6: Generate Improvement Roadmap');
        const roadmap = generateImprovementRoadmap(claudeAnalysis.analysis, formattingContext);

        // Calculate metrics
        const processingTime = Date.now() - startTime;

        // Save to database
        await saveAnalysisToDatabase(analysisId, userId, file, {
            elements,
            sections,
            formattingContext,
            preservedHTML,
            editableContent,
            claudeAnalysis,
            roadmap,
            processingTime
        });

        // Prepare response
        const response = {
            success: true,
            analysisId,
            preservedHTML,
            editableContent,
            formattingContext,
            claudeAnalysis,
            sections: sections.map(s => ({
                id: s.id,
                title: s.title,
                type: s.type,
                elementCount: s.elements.length
            })),
            roadmap,
            metadata: {
                processingTime,
                pageCount: azureResults?.pages?.length || 1,
                elementCount: elements.length,
                sectionCount: sections.length
            }
        };

        console.log(`[PIPELINE] Analysis complete in ${processingTime}ms`);

        res.json(response);

    } catch (error) {
        console.error('[PIPELINE] Analysis failed:', error);

        // Cleanup
        if (req.file && req.file.path) {
            try {
                await fs.unlink(req.file.path);
            } catch (cleanupError) {
                console.error('Cleanup failed:', cleanupError);
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
 * Save analysis to database
 */
const saveAnalysisToDatabase = async (analysisId, userId, file, data) => {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS visual_context_resume_analyses (
                id VARCHAR(36) PRIMARY KEY,
                user_id VARCHAR(36) NOT NULL,
                original_filename VARCHAR(255) NOT NULL,
                file_path VARCHAR(500) NOT NULL,
                preserved_html TEXT,
                editable_content TEXT,
                formatting_context JSONB,
                claude_analysis JSONB,
                roadmap JSONB,
                processing_time INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await db.query(`
            INSERT INTO visual_context_resume_analyses
            (id, user_id, original_filename, file_path, preserved_html, editable_content, formatting_context, claude_analysis, roadmap, processing_time)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [
            analysisId,
            userId,
            file.originalname,
            file.path,
            data.preservedHTML,
            data.editableContent,
            JSON.stringify(data.formattingContext),
            JSON.stringify(data.claudeAnalysis),
            JSON.stringify(data.roadmap),
            data.processingTime
        ]);

        console.log('[DATABASE] Analysis saved');
    } catch (error) {
        console.error('[DATABASE] Save failed:', error);
        throw error;
    }
};

/**
 * Get analysis by ID
 */
const getAnalysisById = async (req, res) => {
    try {
        const { analysisId } = req.params;
        const userId = req.user.id;

        const result = await db.query(`
            SELECT * FROM visual_context_resume_analyses
            WHERE id = $1 AND user_id = $2
        `, [analysisId, userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Analysis not found'
            });
        }

        res.json({
            success: true,
            analysis: result.rows[0]
        });

    } catch (error) {
        console.error('Get analysis failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve analysis'
        });
    }
};

/**
 * Apply AI Coach recommendations to resume
 */
const applyRecommendations = async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({
                success: false,
                error: 'User not authenticated'
            });
        }

        const { currentHTML, plainText, coachingFeedback, formattingContext } = req.body;

        if (!currentHTML || !coachingFeedback) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: currentHTML and coachingFeedback'
            });
        }

        console.log('[APPLY RECOMMENDATIONS] Processing request...');

        const result = await applyCoachingRecommendations(
            currentHTML,
            plainText || '',
            coachingFeedback,
            formattingContext || {}
        );

        res.json(result);

    } catch (error) {
        console.error('[APPLY RECOMMENDATIONS] Failed:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to apply recommendations'
        });
    }
};

module.exports = {
    analyzeResumeWithVisualContext: [upload.single('resume'), analyzeResumeWithVisualContext],
    getAnalysisById,
    applyRecommendations
};
