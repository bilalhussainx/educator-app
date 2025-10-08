/**
 * Resume Template Routes
 * Endpoints for managing resume templates
 */

const express = require('express');
const router = express.Router();
const templateEngine = require('../services/resumeTemplateEngineService');
const exportService = require('../services/resumeExportService');

/**
 * GET /api/resume-templates
 * Get all available industry-standard templates
 */
router.get('/', async (req, res) => {
    try {
        const result = templateEngine.getAllTemplates();
        res.json(result);
    } catch (error) {
        console.error('[TEMPLATE ROUTES] Get templates failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch templates'
        });
    }
});

/**
 * POST /api/resume-templates/recommend
 * Get AI recommendation for best template
 */
router.post('/recommend', async (req, res) => {
    try {
        const { resumeContent, targetRole, targetIndustry } = req.body;

        if (!resumeContent) {
            return res.status(400).json({
                success: false,
                error: 'Resume content is required'
            });
        }

        const result = await templateEngine.recommendTemplate(
            resumeContent,
            targetRole,
            targetIndustry
        );

        res.json(result);

    } catch (error) {
        console.error('[TEMPLATE ROUTES] Recommendation failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to recommend template'
        });
    }
});

/**
 * POST /api/resume-templates/apply
 * Apply a template to resume content
 */
router.post('/apply', async (req, res) => {
    try {
        const { resumeContent, templateKey, customizations } = req.body;

        if (!resumeContent || !templateKey) {
            return res.status(400).json({
                success: false,
                error: 'Resume content and template key are required'
            });
        }

        const result = await templateEngine.applyTemplate(
            resumeContent,
            templateKey,
            customizations
        );

        res.json(result);

    } catch (error) {
        console.error('[TEMPLATE ROUTES] Apply template failed:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to apply template'
        });
    }
});

/**
 * POST /api/resume-templates/save
 * Save current resume as a custom template
 */
router.post('/save', async (req, res) => {
    try {
        const { userId, resumeContent, templateName, templateMetadata } = req.body;

        if (!userId || !resumeContent || !templateName) {
            return res.status(400).json({
                success: false,
                error: 'User ID, resume content, and template name are required'
            });
        }

        const result = await templateEngine.saveAsTemplate(
            userId,
            resumeContent,
            templateName,
            templateMetadata || {}
        );

        res.json(result);

    } catch (error) {
        console.error('[TEMPLATE ROUTES] Save template failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to save template'
        });
    }
});

/**
 * GET /api/resume-templates/user/:userId
 * Get user's saved templates
 */
router.get('/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        const result = await templateEngine.getUserTemplates(userId);
        res.json(result);

    } catch (error) {
        console.error('[TEMPLATE ROUTES] Get user templates failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch user templates'
        });
    }
});

/**
 * GET /api/resume-templates/preview/:templateKey
 * Get template preview
 */
router.get('/preview/:templateKey', async (req, res) => {
    try {
        const { templateKey } = req.params;

        const result = await templateEngine.generateTemplatePreview(templateKey);
        res.json(result);

    } catch (error) {
        console.error('[TEMPLATE ROUTES] Preview failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate preview'
        });
    }
});

/**
 * POST /api/resume-templates/export
 * Export resume to PDF, DOCX, or HTML with full formatting
 */
router.post('/export', async (req, res) => {
    try {
        const { htmlContent, format, templateKey, options } = req.body;

        if (!htmlContent || !format) {
            return res.status(400).json({
                success: false,
                error: 'HTML content and format are required'
            });
        }

        // Validate format
        const validFormats = ['pdf', 'docx', 'html'];
        if (!validFormats.includes(format.toLowerCase())) {
            return res.status(400).json({
                success: false,
                error: `Invalid format. Must be one of: ${validFormats.join(', ')}`
            });
        }

        // Get template if specified
        let template = null;
        if (templateKey && templateEngine.INDUSTRY_TEMPLATES[templateKey]) {
            template = templateEngine.INDUSTRY_TEMPLATES[templateKey];
        }

        // Export the resume
        const result = await exportService.exportResume(
            htmlContent,
            format,
            template,
            options || {}
        );

        if (result.success) {
            // Set appropriate headers
            res.setHeader('Content-Type', result.mimeType);
            res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
            res.setHeader('Content-Length', result.buffer.length);

            // Send the file
            res.send(result.buffer);
        } else {
            res.status(500).json({
                success: false,
                error: 'Export failed'
            });
        }

    } catch (error) {
        console.error('[TEMPLATE ROUTES] Export failed:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to export resume'
        });
    }
});

module.exports = router;
