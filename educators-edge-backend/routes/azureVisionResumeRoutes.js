/**
 * Azure Vision Resume Routes
 * Handles routing for advanced resume parsing and structure detection using Azure Document Intelligence
 */

const express = require('express');
const router = express.Router();
const {
    analyzeResumeStructure,
    getAnalysisResults,
    listAnalyses
} = require('../controllers/azureVisionResumeController');
const { verifyToken } = require('../middleware/authMiddleware');

// Middleware to verify authentication for all routes
router.use(verifyToken);

/**
 * @route   POST /api/azure-vision/analyze-resume
 * @desc    Analyze resume structure using Azure Document Intelligence
 * @access  Private
 * @body    multipart/form-data with 'resume' file field
 * @returns {Object} Complete document structure analysis with formatting preservation
 */
router.post('/analyze-resume', analyzeResumeStructure);

/**
 * @route   GET /api/azure-vision/analysis/:analysisId
 * @desc    Get specific analysis results by ID
 * @access  Private
 * @params  analysisId - UUID of the analysis
 * @returns {Object} Analysis results with document structure and preservation data
 */
router.get('/analysis/:analysisId', getAnalysisResults);

/**
 * @route   GET /api/azure-vision/analyses
 * @desc    List all user's resume analyses with pagination
 * @access  Private
 * @query   page - Page number (default: 1)
 * @query   limit - Items per page (default: 10)
 * @returns {Object} Paginated list of user's analyses
 */
router.get('/analyses', listAnalyses);

/**
 * @route   GET /api/azure-vision/health
 * @desc    Health check for Azure Vision service
 * @access  Private
 * @returns {Object} Service status and configuration check
 */
router.get('/health', (req, res) => {
    const azureKey = process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY;
    const azureEndpoint = process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT;

    res.json({
        success: true,
        service: 'Azure Vision Resume Analysis',
        status: 'operational',
        configuration: {
            azureKeyConfigured: !!azureKey,
            azureEndpointConfigured: !!azureEndpoint,
            azureEndpoint: azureEndpoint ? azureEndpoint.replace(/\/+$/, '') : 'Not configured',
            supportedFormats: [
                'application/pdf',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/msword',
                'image/jpeg',
                'image/png',
                'image/tiff'
            ],
            maxFileSize: '20MB',
            features: [
                'Document structure detection',
                'Formatting preservation',
                'Bullet point analysis',
                'Section identification',
                'Template generation',
                'Multi-model Azure analysis'
            ]
        },
        timestamp: new Date().toISOString()
    });
});

/**
 * Error handling middleware for Azure Vision routes
 */
router.use((error, req, res, next) => {
    console.error('[AZURE VISION ROUTES] Error:', error);

    // Handle multer file upload errors
    if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
            success: false,
            error: 'File too large. Maximum size is 20MB.',
            code: 'FILE_TOO_LARGE'
        });
    }

    if (error.message.includes('Invalid file type')) {
        return res.status(400).json({
            success: false,
            error: error.message,
            code: 'INVALID_FILE_TYPE'
        });
    }

    // Handle Azure API errors
    if (error.message.includes('Azure')) {
        return res.status(502).json({
            success: false,
            error: 'Azure Document Intelligence service error',
            details: process.env.NODE_ENV === 'development' ? error.message : 'External service unavailable',
            code: 'AZURE_SERVICE_ERROR'
        });
    }

    // Handle authentication errors
    if (error.message.includes('not authenticated') || error.message.includes('Unauthorized')) {
        return res.status(401).json({
            success: false,
            error: 'Authentication required',
            code: 'AUTHENTICATION_REQUIRED'
        });
    }

    // Default error response
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
});

module.exports = router;