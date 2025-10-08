/**
 * Visual Context Resume Routes
 * API routes for the Visual Context Resume System
 */

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const mammoth = require('mammoth');
const fs = require('fs').promises;
const path = require('path');
const {
    analyzeResumeWithVisualContext,
    getAnalysisById,
    applyRecommendations
} = require('../controllers/visualContextResumeController');

// Middleware to verify JWT token (optional for development)
const authenticateToken = (req, res, next) => {
    console.log('[RESUME-COACH] Auth middleware called - DEVELOPMENT MODE: Allowing all requests');
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        // For development: allow access without token
        console.log('[RESUME-COACH] No token provided - allowing as guest');
        req.user = { id: 'guest', userId: 'guest', email: 'guest@example.com' };
        return next();
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            // For development: allow access with invalid token
            req.user = { id: 'guest', userId: 'guest', email: 'guest@example.com' };
            return next();
        }
        req.user = user;
        next();
    });
};

/**
 * @route   POST /api/resume-coach/analyze
 * @desc    Upload and analyze resume with full visual context pipeline
 * @access  Private
 */
router.post('/analyze', authenticateToken, analyzeResumeWithVisualContext);

/**
 * @route   GET /api/resume-coach/analysis/:analysisId
 * @desc    Get analysis results by ID
 * @access  Private
 */
router.get('/analysis/:analysisId', authenticateToken, getAnalysisById);

/**
 * @route   POST /api/resume-coach/apply-recommendations
 * @desc    Apply AI Coach recommendations automatically
 * @access  Private
 */
router.post('/apply-recommendations', authenticateToken, applyRecommendations);

/**
 * @route   POST /api/resume-coach/export
 * @desc    Export resume to DOCX format
 * @access  Private
 */
router.post('/export', authenticateToken, async (req, res) => {
    try {
        const { content, format = 'docx' } = req.body;

        if (!content) {
            return res.status(400).json({
                success: false,
                error: 'Content is required'
            });
        }

        console.log('[EXPORT] Exporting resume to', format);
        console.log('[EXPORT] Content length:', content.length);
        console.log('[EXPORT] Content preview:', content.substring(0, 200));

        // Simple approach: Create a basic DOCX structure
        const { Document, Packer, Paragraph, TextRun, HeadingLevel } = require('docx');

        // Parse HTML content to extract text
        const cheerio = require('cheerio');
        const $ = cheerio.load(content);

        const sections = [];

        // Extract content from HTML - handle both with and without body tag
        const rootElements = $('body').length > 0 ? $('body').children() : $.root().children();

        console.log('[EXPORT] Found', rootElements.length, 'root elements');

        // Extract content from HTML
        rootElements.each((i, elem) => {
            const tagName = elem.name;
            const text = $(elem).text().trim();

            if (!text) return;

            if (tagName === 'h1') {
                sections.push(new Paragraph({
                    text,
                    heading: HeadingLevel.HEADING_1,
                }));
            } else if (tagName === 'h2') {
                sections.push(new Paragraph({
                    text,
                    heading: HeadingLevel.HEADING_2,
                }));
            } else if (tagName === 'h3') {
                sections.push(new Paragraph({
                    text,
                    heading: HeadingLevel.HEADING_3,
                }));
            } else if (tagName === 'ul' || tagName === 'ol') {
                $(elem).find('li').each((j, li) => {
                    sections.push(new Paragraph({
                        text: `• ${$(li).text().trim()}`,
                    }));
                });
            } else if (tagName === 'p') {
                // Check for bold/strong content
                const children = [];
                $(elem).contents().each((k, node) => {
                    if (node.type === 'text') {
                        children.push(new TextRun($(node).text()));
                    } else if (node.name === 'strong' || node.name === 'b') {
                        children.push(new TextRun({
                            text: $(node).text(),
                            bold: true
                        }));
                    } else if (node.name === 'em' || node.name === 'i') {
                        children.push(new TextRun({
                            text: $(node).text(),
                            italics: true
                        }));
                    }
                });

                if (children.length > 0) {
                    sections.push(new Paragraph({ children }));
                } else {
                    sections.push(new Paragraph({ text }));
                }
            } else {
                sections.push(new Paragraph({ text }));
            }
        });

        console.log('[EXPORT] Created', sections.length, 'sections');

        // If no sections found, add a fallback
        if (sections.length === 0) {
            console.log('[EXPORT] No sections found, using text fallback');
            const textContent = $.text();
            if (textContent) {
                sections.push(new Paragraph({ text: textContent }));
            }
        }

        // Create document
        const doc = new Document({
            sections: [{
                properties: {},
                children: sections
            }]
        });

        // Generate buffer
        const buffer = await Packer.toBuffer(doc);

        console.log('[EXPORT] Buffer size:', buffer.length);

        // Set headers for download
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename=resume-${Date.now()}.docx`);
        res.send(buffer);

        console.log('[EXPORT] Resume exported successfully');

    } catch (error) {
        console.error('[EXPORT] Export failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to export resume'
        });
    }
});

module.exports = router;
