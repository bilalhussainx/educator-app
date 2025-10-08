/**
 * Comprehensive AI Writing Coach Controller
 */

const comprehensiveAICoachService = require('../services/comprehensiveAICoachService');

/**
 * Perform comprehensive document analysis
 */
exports.comprehensiveAnalysis = async (req, res) => {
    try {
        const { documentContent, sessionId, analysisType } = req.body;

        if (!documentContent) {
            return res.status(400).json({
                success: false,
                error: 'Document content is required'
            });
        }

        if (documentContent.length < 50) {
            return res.status(400).json({
                success: false,
                error: 'Document must be at least 50 characters long'
            });
        }

        console.log(`Comprehensive analysis requested for session ${sessionId || 'unknown'}`);

        // Perform comprehensive analysis
        const result = await comprehensiveAICoachService.analyzeDocument(
            documentContent,
            sessionId
        );

        res.json(result);

    } catch (error) {
        console.error('Comprehensive analysis error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to analyze document',
            message: error.message
        });
    }
};

/**
 * Get analysis history (future feature)
 */
exports.getAnalysisHistory = async (req, res) => {
    try {
        const { sessionId } = req.params;

        // Placeholder for future implementation
        res.json({
            success: true,
            history: [],
            message: 'Analysis history feature coming soon'
        });

    } catch (error) {
        console.error('Error fetching analysis history:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch analysis history'
        });
    }
};

/**
 * Get AI coach capabilities/info
 */
exports.getCapabilities = async (req, res) => {
    try {
        res.json({
            success: true,
            capabilities: {
                fullDocumentAnalysis: true,
                comprehensiveComments: true,
                targetCommentCount: '30-50+',
                categories: [
                    'Word Choice',
                    'Structure',
                    'Clarity',
                    'Grammar',
                    'Flow',
                    'Engagement',
                    'Style'
                ],
                severityLevels: [
                    'critical',
                    'important',
                    'suggestion',
                    'positive'
                ],
                features: [
                    'Full document analysis from start to finish',
                    'Beautiful inline comment rendering',
                    'One-click suggestion application',
                    'Detailed explanations for each comment',
                    'Overall document assessment',
                    'Structural analysis',
                    'Tone analysis (clarity, engagement, professionalism)'
                ]
            }
        });
    } catch (error) {
        console.error('Error fetching capabilities:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch capabilities'
        });
    }
};
