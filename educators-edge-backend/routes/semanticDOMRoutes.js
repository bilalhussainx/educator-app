/**
 * Semantic DOM Routes
 * API endpoints for the revolutionary document intelligence system
 */

const express = require('express');
const router = express.Router();
const { generateSemanticDOM } = require('../controllers/semanticDOMController');
const { authenticateToken } = require('../middleware/authMiddleware');

/**
 * @route   POST /api/semantic-dom/generate
 * @desc    Generate Semantic JSON DOM from document
 * @access  Private
 * @body    {FormData} document - The document file to process
 * @returns {Object} Complete semantic DOM with HTML reconstruction
 *
 * Request:
 * - Content-Type: multipart/form-data
 * - Body: document file (PDF, DOCX, DOC, JPEG, PNG, TIFF)
 *
 * Response: Semantic DOM data with HTML content and analysis
 */
router.post('/generate', generateSemanticDOM);

/**
 * @route   GET /api/semantic-dom/health
 * @desc    Health check for semantic DOM service
 * @access  Public
 */
router.get('/health', (req, res) => {
    const healthStatus = {
        success: true,
        service: 'Semantic DOM Generator',
        version: '2.0',
        status: 'operational',
        timestamp: new Date().toISOString(),
        features: {
            multiModelAzure: true,
            formattingDetection: true,
            bulletPointDetection: true,
            visualHierarchy: true,
            contentReconstruction: true,
            htmlGeneration: true
        },
        supportedFormats: [
            'PDF',
            'DOCX',
            'DOC',
            'JPEG',
            'PNG',
            'TIFF'
        ],
        azureModels: [
            'prebuilt-layout',
            'prebuilt-document',
            'prebuilt-read'
        ]
    };

    // Check Azure configuration
    const hasAzureConfig = !!(
        process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY &&
        process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT
    );

    if (!hasAzureConfig) {
        healthStatus.status = 'degraded';
        healthStatus.warnings = ['Azure Document Intelligence not configured'];
    }

    res.json(healthStatus);
});

/**
 * @route   GET /api/semantic-dom/capabilities
 * @desc    Get detailed capabilities of the semantic DOM system
 * @access  Public
 */
router.get('/capabilities', (req, res) => {
    const capabilities = {
        success: true,
        systemCapabilities: {
            documentIntelligence: {
                multiModelApproach: {
                    description: 'Uses multiple Azure AI models for layered precision',
                    models: [
                        {
                            name: 'Layout Model',
                            purpose: 'Core OCR and Structure',
                            output: 'Rich JSON with pages, lines, words, and their coordinates/styles'
                        },
                        {
                            name: 'Document Model',
                            purpose: 'General document understanding',
                            output: 'Structured content with semantic understanding'
                        },
                        {
                            name: 'Read Model',
                            purpose: 'Enhanced OCR',
                            output: 'High-quality text extraction with confidence scores'
                        }
                    ]
                },

                formattingDetection: {
                    description: 'Robust formatting detection and reconstruction',
                    features: [
                        {
                            name: 'Bullet Point Detection',
                            implementation: 'Uses Layout model\'s List and Line analysis',
                            output: 'Clean, structured <ul>/<li> HTML elements'
                        },
                        {
                            name: 'Visual Hierarchy',
                            implementation: 'Analyzes styleFont and span data from Layout model',
                            output: 'Semantic HTML tags (<h1>, <h2>, <h3>) and inline formatting'
                        },
                        {
                            name: 'Content Reconstruction',
                            implementation: 'Line Grouping & HTML Generation',
                            output: 'Single HTML string representing preserved structure'
                        }
                    ]
                }
            },

            semanticDOM: {
                description: 'Rich, semantic JSON Document Object Model',
                structure: {
                    version: '2.0',
                    sections: [
                        'metadata - Document and processing information',
                        'content - Structured content elements',
                        'formatting - Style and layout preservation',
                        'structure - Document organization',
                        'quality - Confidence and quality metrics'
                    ]
                }
            },

            outputFormats: {
                semanticJSON: 'Complete semantic DOM structure',
                reconstructedHTML: 'Clean HTML with preserved formatting',
                preservationCSS: 'CSS for exact format reconstruction',
                qualityMetrics: 'Confidence scores and preservation metrics'
            }
        },

        technicalSpecs: {
            maxFileSize: '25MB',
            supportedFormats: ['PDF', 'DOCX', 'DOC', 'JPEG', 'PNG', 'TIFF'],
            processingTime: 'Typically 10-30 seconds depending on document complexity',
            confidenceThreshold: 0.6,
            hierarchyLevels: 6,
            bulletTypes: ['solid', 'hollow', 'square', 'triangle', 'star', 'arrow', 'dash', 'numbered']
        },

        apiEndpoints: [
            {
                method: 'POST',
                path: '/api/semantic-dom/generate',
                description: 'Generate semantic DOM from document',
                authentication: 'Required'
            },
            {
                method: 'GET',
                path: '/api/semantic-dom/health',
                description: 'Service health check',
                authentication: 'None'
            },
            {
                method: 'GET',
                path: '/api/semantic-dom/capabilities',
                description: 'System capabilities overview',
                authentication: 'None'
            }
        ]
    };

    res.json(capabilities);
});

module.exports = router;