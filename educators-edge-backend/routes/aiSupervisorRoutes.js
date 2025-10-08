const express = require('express');
const router = express.Router();
const aiWritingSupervisorService = require('../src/services/aiWritingSupervisorService');
const enhancedMozartStrokeService = require('../src/services/enhancedMozartStrokeService');
const claudeInlineAnalysisService = require('../src/services/claudeInlineAnalysisService');
const { verifyToken } = require('../middleware/authMiddleware');

/**
 * POST /api/ai/scribe/analyze-document
 * Analyze a document using the AI Writing Supervisor multi-pass system
 */
router.post('/analyze-document', verifyToken, async (req, res) => {
    try {
        const { documentContent, sessionId, analysisType = 'comprehensive' } = req.body;
        const userId = req.user.id;

        // Validation
        if (!documentContent) {
            return res.status(400).json({
                success: false,
                error: 'Document content is required'
            });
        }

        if (typeof documentContent !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Document content must be a string'
            });
        }

        if (documentContent.trim().length < 50) {
            return res.status(400).json({
                success: false,
                error: 'Document too short for meaningful analysis (minimum 50 characters)'
            });
        }

        console.log(`AI Supervisor analysis requested by user ${userId} for session ${sessionId}`);
        console.log(`Document length: ${documentContent.length} characters`);

        // Check service status before proceeding
        const serviceStatus = aiWritingSupervisorService.getServiceStatus();
        if (!serviceStatus.ready) {
            return res.status(429).json({
                success: false,
                error: serviceStatus.message,
                serviceStatus,
                retryAfter: Math.ceil(serviceStatus.rateLimiter.minDelay / 1000) // seconds
            });
        }

        // Execute the multi-pass analysis
        const analysisStartTime = Date.now();
        const analysisResult = await aiWritingSupervisorService.analyzeDocument(documentContent);

        if (!analysisResult.success) {
            console.error('Analysis failed:', analysisResult.error);
            return res.status(500).json({
                success: false,
                error: analysisResult.error || 'Analysis failed',
                analysisTime: Date.now() - analysisStartTime
            });
        }

        // Log successful analysis
        console.log(`Analysis completed for user ${userId}:`);
        console.log(`- Total annotations: ${analysisResult.annotations.length}`);
        console.log(`- Analysis time: ${analysisResult.metadata.analysisTime}ms`);
        console.log(`- Severity breakdown:`, analysisResult.metadata.breakdown);

        // Enhance annotations with user context
        const enhancedAnnotations = analysisResult.annotations.map((annotation, index) => ({
            ...annotation,
            userId,
            sessionId,
            documentLength: documentContent.length,
            reviewOrder: index + 1,
            status: 'pending' // pending, accepted, rejected, modified
        }));

        // Prepare response
        const response = {
            success: true,
            annotations: enhancedAnnotations,
            analysis: {
                totalIssues: analysisResult.annotations.length,
                severityBreakdown: analysisResult.metadata.breakdown,
                categoryBreakdown: analysisResult.metadata.categories,
                analysisTime: analysisResult.metadata.analysisTime,
                documentStats: {
                    length: documentContent.length,
                    wordCount: documentContent.split(/\s+/).length,
                    paragraphCount: documentContent.split(/\n\s*\n/).filter(p => p.trim().length > 0).length,
                    sentenceCount: documentContent.split(/[.!?]+/).filter(s => s.trim().length > 0).length
                }
            },
            metadata: {
                userId,
                sessionId,
                analysisType,
                timestamp: analysisResult.timestamp,
                passResults: analysisResult.metadata.passResults
            }
        };

        res.json(response);

    } catch (error) {
        console.error('AI Supervisor API error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error during analysis',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * POST /api/ai/scribe/feedback-log
 * Log user feedback on AI suggestions for learning algorithm
 */
router.post('/feedback-log', verifyToken, async (req, res) => {
    try {
        const { annotationId, action, sessionId, originalText, suggestedText, userModification } = req.body;
        const userId = req.user.id;

        // Validation
        if (!annotationId || !action) {
            return res.status(400).json({
                success: false,
                error: 'Annotation ID and action are required'
            });
        }

        if (!['accepted', 'rejected', 'modified'].includes(action)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid action. Must be: accepted, rejected, or modified'
            });
        }

        // Log the feedback (this would typically go to a database)
        const feedbackLog = {
            userId,
            sessionId,
            annotationId,
            action,
            originalText,
            suggestedText,
            userModification: action === 'modified' ? userModification : null,
            timestamp: new Date().toISOString()
        };

        console.log('User feedback logged:', feedbackLog);

        // TODO: Store in database for machine learning pipeline
        // await db.userFeedback.create(feedbackLog);

        res.json({
            success: true,
            message: 'Feedback logged successfully',
            feedbackId: `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        });

    } catch (error) {
        console.error('Feedback logging error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to log feedback'
        });
    }
});

/**
 * GET /api/ai/scribe/analysis-history/:sessionId
 * Get analysis history for a session
 */
router.get('/analysis-history/:sessionId', verifyToken, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const userId = req.user.id;

        // TODO: Implement database query for analysis history
        // const history = await db.analysisHistory.findAll({
        //     where: { sessionId, userId },
        //     order: [['createdAt', 'DESC']]
        // });

        // For now, return empty history
        res.json({
            success: true,
            history: [],
            message: 'Analysis history feature coming soon'
        });

    } catch (error) {
        console.error('Analysis history error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve analysis history'
        });
    }
});

/**
 * POST /api/ai/scribe/reanalyze
 * Re-analyze a document with updated parameters
 */
router.post('/reanalyze', verifyToken, async (req, res) => {
    try {
        const { documentContent, focusAreas, excludeCategories } = req.body;
        const userId = req.user.id;

        if (!documentContent) {
            return res.status(400).json({
                success: false,
                error: 'Document content is required'
            });
        }

        // TODO: Implement focused re-analysis with specific parameters
        // For now, perform standard analysis
        const analysisResult = await aiWritingSupervisorService.analyzeDocument(documentContent);

        if (!analysisResult.success) {
            return res.status(500).json({
                success: false,
                error: analysisResult.error || 'Re-analysis failed'
            });
        }

        // Filter annotations based on focus areas if specified
        let filteredAnnotations = analysisResult.annotations;

        if (focusAreas && Array.isArray(focusAreas) && focusAreas.length > 0) {
            filteredAnnotations = analysisResult.annotations.filter(annotation =>
                focusAreas.some(area => annotation.category.toLowerCase().includes(area.toLowerCase()))
            );
        }

        if (excludeCategories && Array.isArray(excludeCategories) && excludeCategories.length > 0) {
            filteredAnnotations = filteredAnnotations.filter(annotation =>
                !excludeCategories.some(category => annotation.category.toLowerCase().includes(category.toLowerCase()))
            );
        }

        res.json({
            success: true,
            annotations: filteredAnnotations,
            analysis: {
                totalIssues: filteredAnnotations.length,
                originalTotal: analysisResult.annotations.length,
                filtered: analysisResult.annotations.length - filteredAnnotations.length
            },
            metadata: {
                userId,
                focusAreas,
                excludeCategories,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Re-analysis error:', error);
        res.status(500).json({
            success: false,
            error: 'Re-analysis failed'
        });
    }
});

/**
 * POST /api/ai/scribe/enhanced-analyze
 * Enhanced MozartStroke analysis with requirements and paragraph-by-paragraph feedback
 */
router.post('/enhanced-analyze', verifyToken, async (req, res) => {
    try {
        const {
            documentContent,
            sessionId,
            analysisConfig = {}
        } = req.body;
        const userId = req.user.id;

        // Validation
        if (!documentContent) {
            return res.status(400).json({
                success: false,
                error: 'Document content is required'
            });
        }

        if (typeof documentContent !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Document content must be a string'
            });
        }

        if (documentContent.trim().length < 100) {
            return res.status(400).json({
                success: false,
                error: 'Document too short for enhanced analysis (minimum 100 characters)'
            });
        }

        console.log(`Enhanced MozartStroke analysis requested by user ${userId} for session ${sessionId}`);
        console.log(`Document length: ${documentContent.length} characters`);
        console.log(`Analysis config:`, analysisConfig);

        // Execute enhanced analysis
        const analysisStartTime = Date.now();
        const analysisResult = await enhancedMozartStrokeService.analyzeDocumentEnhanced(
            documentContent,
            analysisConfig
        );

        if (!analysisResult.success) {
            console.error('Enhanced analysis failed:', analysisResult.error);
            return res.status(500).json({
                success: false,
                error: analysisResult.error || 'Enhanced analysis failed',
                analysisTime: Date.now() - analysisStartTime,
                fallbackAnalysis: analysisResult.fallbackAnalysis
            });
        }

        // Log successful analysis
        console.log(`Enhanced analysis completed for user ${userId}:`);
        console.log(`- Document type: ${analysisResult.documentType}`);
        console.log(`- Analysis depth: ${analysisResult.analysisDepth}`);
        console.log(`- Paragraphs analyzed: ${analysisResult.paragraphCount}`);
        console.log(`- Analysis time: ${Date.now() - analysisStartTime}ms`);

        // Prepare response
        const response = {
            success: true,
            analysisType: 'enhanced_mozart_stroke',
            results: analysisResult.results,
            metadata: {
                userId,
                sessionId,
                documentType: analysisResult.documentType,
                requirements: analysisResult.requirements,
                paragraphCount: analysisResult.paragraphCount,
                wordCount: analysisResult.wordCount,
                analysisDepth: analysisResult.analysisDepth,
                analysisTime: Date.now() - analysisStartTime,
                timestamp: analysisResult.timestamp
            }
        };

        res.json(response);

    } catch (error) {
        console.error('Enhanced MozartStroke API error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error during enhanced analysis',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * GET /api/ai/scribe/document-types
 * Get available document types for enhanced analysis
 */
router.get('/document-types', verifyToken, async (req, res) => {
    try {
        const documentTypes = enhancedMozartStrokeService.getDocumentTypes();
        const analysisDepthOptions = enhancedMozartStrokeService.getAnalysisDepthOptions();

        res.json({
            success: true,
            documentTypes,
            analysisDepthOptions
        });

    } catch (error) {
        console.error('Document types error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get document types'
        });
    }
});

/**
 * GET /api/ai/scribe/service-status
 * Get AI Supervisor service status and rate limiter information
 */
router.get('/service-status', verifyToken, async (req, res) => {
    try {
        const serviceStatus = aiWritingSupervisorService.getServiceStatus();

        res.json({
            success: true,
            status: serviceStatus
        });

    } catch (error) {
        console.error('Service status error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get service status'
        });
    }
});

/**
 * POST /api/ai/scribe/generate-trustgraph-tokens
 * Generate TrustGraph tokens based on MozartStroke session analysis
 */
router.post('/generate-trustgraph-tokens', verifyToken, async (req, res) => {
    try {
        const { sessionId, analysisResults, userInteractions, documentMetrics } = req.body;
        const userId = req.user.id;

        // Validation
        if (!sessionId) {
            return res.status(400).json({
                success: false,
                error: 'Session ID is required'
            });
        }

        console.log(`Generating TrustGraph tokens for user ${userId}, session ${sessionId}`);

        // Prepare session data for token generation
        const sessionData = {
            userId,
            sessionId,
            analysisResults: analysisResults || null,
            userInteractions: userInteractions || [],
            documentMetrics: documentMetrics || {}
        };

        // Check service status before proceeding
        const serviceStatus = aiWritingSupervisorService.getServiceStatus();
        if (!serviceStatus.ready) {
            return res.status(429).json({
                success: false,
                error: serviceStatus.message,
                serviceStatus,
                retryAfter: Math.ceil(serviceStatus.rateLimiter.minDelay / 1000)
            });
        }

        // Generate TrustGraph tokens
        const tokenStartTime = Date.now();
        const tokenResults = await aiWritingSupervisorService.generateTrustGraphTokens(sessionData);

        // Log successful token generation
        console.log(`TrustGraph tokens generated for user ${userId}:`);
        console.log(`- Total tokens: ${tokenResults.tokens.length}`);
        console.log(`- Average value: ${tokenResults.session_summary.average_value}`);
        console.log(`- Generation time: ${Date.now() - tokenStartTime}ms`);

        // Prepare response
        const response = {
            success: true,
            tokens: tokenResults.tokens,
            session_summary: tokenResults.session_summary,
            metadata: {
                ...tokenResults.metadata,
                generationTime: Date.now() - tokenStartTime,
                trustgraph_integration: true
            }
        };

        res.json(response);

    } catch (error) {
        console.error('TrustGraph token generation error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate TrustGraph tokens',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * POST /api/ai/scribe/claude-inline-analysis
 * Generate inline comments using Claude API
 */
router.post('/claude-inline-analysis', verifyToken, async (req, res) => {
    try {
        const { documentContent, config = {}, sessionId } = req.body;
        const userId = req.user.id;

        // Validation
        if (!documentContent) {
            return res.status(400).json({
                success: false,
                error: 'Document content is required'
            });
        }

        if (typeof documentContent !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Document content must be a string'
            });
        }

        if (documentContent.trim().length < 50) {
            return res.status(400).json({
                success: false,
                error: 'Document too short for inline analysis (minimum 50 characters)'
            });
        }

        console.log(`Claude inline analysis requested by user ${userId}`);
        console.log(`Document length: ${documentContent.length} characters`);
        console.log(`Config:`, config);

        // Check service status
        const serviceStatus = claudeInlineAnalysisService.getServiceStatus();
        if (!serviceStatus.ready && serviceStatus.hasApiKey) {
            return res.status(429).json({
                success: false,
                error: serviceStatus.message,
                serviceStatus,
                retryAfter: Math.ceil((serviceStatus.nextAvailable - Date.now()) / 1000)
            });
        }

        // Generate inline comments using Claude
        const analysisStartTime = Date.now();
        const analysisResult = await claudeInlineAnalysisService.generateInlineComments(
            documentContent,
            config
        );

        if (!analysisResult.success) {
            console.error('Claude inline analysis failed:', analysisResult.error);
            return res.status(500).json({
                success: false,
                error: analysisResult.error || 'Claude inline analysis failed',
                analysisTime: Date.now() - analysisStartTime
            });
        }

        // Log successful analysis
        console.log(`Claude inline analysis completed for user ${userId}:`);
        console.log(`- Total comments: ${analysisResult.comments.length}`);
        console.log(`- Analysis time: ${Date.now() - analysisStartTime}ms`);
        console.log(`- Comment types:`, analysisResult.analysisMetadata.commentTypes);

        // Prepare response
        const response = {
            success: true,
            comments: analysisResult.comments,
            analysisMetadata: {
                ...analysisResult.analysisMetadata,
                userId,
                sessionId,
                analysisTime: Date.now() - analysisStartTime,
                timestamp: new Date().toISOString(),
                apiProvider: 'claude'
            }
        };

        res.json(response);

    } catch (error) {
        console.error('Claude inline analysis API error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error during Claude inline analysis',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * POST /api/ai/scribe/claude-dense-analysis
 * Generate dense inline comments using Claude API
 */
router.post('/claude-dense-analysis', verifyToken, async (req, res) => {
    try {
        const { documentContent, density = 'dense', sessionId } = req.body;
        const userId = req.user.id;

        // Validation
        if (!documentContent) {
            return res.status(400).json({
                success: false,
                error: 'Document content is required'
            });
        }

        if (documentContent.trim().length < 100) {
            return res.status(400).json({
                success: false,
                error: 'Document too short for dense analysis (minimum 100 characters)'
            });
        }

        console.log(`Claude dense analysis (${density}) requested by user ${userId}`);

        // Check service status
        const serviceStatus = claudeInlineAnalysisService.getServiceStatus();
        if (!serviceStatus.ready && serviceStatus.hasApiKey) {
            return res.status(429).json({
                success: false,
                error: serviceStatus.message,
                serviceStatus,
                retryAfter: Math.ceil((serviceStatus.nextAvailable - Date.now()) / 1000)
            });
        }

        // Generate dense comments
        const analysisStartTime = Date.now();
        const analysisResult = await claudeInlineAnalysisService.generateInlineComments(
            documentContent,
            {
                analysisDepth: density,
                documentType: 'college_essay',
                focusAreas: ['structure', 'clarity', 'style', 'engagement', 'flow'],
                userLevel: 'intermediate'
            }
        );

        console.log(`Claude dense analysis completed: ${analysisResult.comments.length} comments`);

        res.json({
            success: true,
            comments: analysisResult.comments,
            analysisMetadata: {
                ...analysisResult.analysisMetadata,
                userId,
                sessionId,
                density,
                analysisTime: Date.now() - analysisStartTime,
                timestamp: new Date().toISOString(),
                apiProvider: 'claude'
            }
        });

    } catch (error) {
        console.error('Claude dense analysis API error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error during Claude dense analysis',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * POST /api/ai/scribe/claude-paragraph-analysis
 * Generate paragraph-by-paragraph analysis using Claude API
 */
router.post('/claude-paragraph-analysis', verifyToken, async (req, res) => {
    try {
        const { documentContent, requirements = [], sessionId } = req.body;
        const userId = req.user.id;

        console.log(`Claude paragraph analysis requested by user ${userId}`);

        // Check service status
        const serviceStatus = claudeInlineAnalysisService.getServiceStatus();
        if (!serviceStatus.ready && serviceStatus.hasApiKey) {
            return res.status(429).json({
                success: false,
                error: serviceStatus.message,
                serviceStatus,
                retryAfter: Math.ceil((serviceStatus.nextAvailable - Date.now()) / 1000)
            });
        }

        // Generate paragraph-by-paragraph analysis
        const analysisResult = await claudeInlineAnalysisService.generateInlineComments(
            documentContent,
            {
                analysisDepth: 'dense',
                documentType: 'college_essay',
                focusAreas: ['paragraph_development', 'transitions', 'topic_sentences', 'conclusion'],
                userLevel: 'intermediate',
                requirements
            }
        );

        res.json({
            success: true,
            comments: analysisResult.comments,
            analysisMetadata: {
                ...analysisResult.analysisMetadata,
                userId,
                sessionId,
                analysisType: 'paragraph_by_paragraph',
                requirements,
                timestamp: new Date().toISOString(),
                apiProvider: 'claude'
            }
        });

    } catch (error) {
        console.error('Claude paragraph analysis API error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error during Claude paragraph analysis',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * GET /api/ai/scribe/claude-service-status
 * Get Claude service status
 */
router.get('/claude-service-status', verifyToken, async (req, res) => {
    try {
        const serviceStatus = claudeInlineAnalysisService.getServiceStatus();

        res.json({
            success: true,
            status: serviceStatus
        });

    } catch (error) {
        console.error('Claude service status error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get Claude service status'
        });
    }
});

/**
 * POST /api/ai/scribe/reset-rate-limiter
 * Reset rate limiter (admin endpoint)
 */
router.post('/reset-rate-limiter', verifyToken, async (req, res) => {
    try {
        // Optional: Add admin role check here
        // if (req.user.role !== 'admin') {
        //     return res.status(403).json({ success: false, error: 'Admin access required' });
        // }

        aiWritingSupervisorService.resetRateLimiter();

        res.json({
            success: true,
            message: 'Rate limiter reset successfully'
        });

    } catch (error) {
        console.error('Rate limiter reset error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to reset rate limiter'
        });
    }
});

module.exports = router;