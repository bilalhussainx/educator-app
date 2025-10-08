/**
 * Enhanced AI Comment Controller
 * Handles requests for AI comment generation with memory and learning
 */

const enhancedAICommentService = require('../src/services/enhancedAICommentService');
const { broadcastToSession } = require('../services/websocketHandler');

/**
 * Generate AI comments for a document
 */
const generateComments = async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            documentContent,
            documentType = 'essay',
            targetComments = 50,
            promptTemplate = 'Essay Coach - Comprehensive',
            customPrompt = null,
            sessionId = null,
            rememberPrevious = true,
            excludeCommentIds = []
        } = req.body;

        // Validate input
        if (!documentContent || documentContent.trim().length < 50) {
            return res.status(400).json({
                error: 'Document content is required and must be at least 50 characters'
            });
        }

        console.log(`AI Comment Request - User: ${userId}, Type: ${documentType}, Target: ${targetComments}`);

        const result = await enhancedAICommentService.generateComments({
            userId,
            sessionId,
            documentContent,
            documentType,
            targetComments,
            promptTemplate,
            customPrompt,
            rememberPrevious,
            excludeCommentIds
        });

        // Broadcast to all session participants (teacher + students)
        if (sessionId && result.success) {
            broadcastToSession(sessionId, 'ai_comments_generated', {
                userId,
                comments: result.comments,
                metadata: result.metadata,
                promptTemplate,
                timestamp: new Date().toISOString()
            });
            console.log(`Broadcasted ${result.comments.length} comments to session ${sessionId}`);
        }

        res.json(result);

    } catch (error) {
        console.error('Error in generateComments controller:', error);
        res.status(500).json({
            error: 'Failed to generate comments',
            message: error.message
        });
    }
};

/**
 * Get available coaching prompts
 */
const getCoachingPrompts = async (req, res) => {
    try {
        const { category } = req.query;

        const prompts = await enhancedAICommentService.getAvailablePrompts(category);

        res.json({
            success: true,
            prompts: prompts.map(p => ({
                id: p.id,
                name: p.name,
                description: p.description,
                category: p.category,
                focusAreas: p.focus_areas,
                commentTypes: p.comment_types,
                densityTarget: p.density_target,
                usageCount: p.usage_count,
                averageRating: p.average_rating,
                isDefault: p.is_default
            }))
        });

    } catch (error) {
        console.error('Error getting coaching prompts:', error);
        res.status(500).json({
            error: 'Failed to get coaching prompts',
            message: error.message
        });
    }
};

/**
 * Record user feedback on a comment
 */
const recordFeedback = async (req, res) => {
    try {
        const userId = req.user.id;
        const { commentId, action, userModification, timeToAction, sessionId } = req.body;

        if (!commentId || !action) {
            return res.status(400).json({
                error: 'commentId and action are required'
            });
        }

        if (!['applied', 'dismissed', 'liked', 'disliked', 'modified'].includes(action)) {
            return res.status(400).json({
                error: 'Invalid action. Must be: applied, dismissed, liked, disliked, or modified'
            });
        }

        await enhancedAICommentService.recordFeedback(
            userId,
            commentId,
            action,
            userModification,
            timeToAction
        );

        // Broadcast comment action to session participants (real-time sync)
        if (sessionId) {
            broadcastToSession(sessionId, 'comment_action', {
                userId,
                commentId,
                action,
                userModification,
                timestamp: new Date().toISOString()
            });
        }

        res.json({
            success: true,
            message: 'Feedback recorded successfully'
        });

    } catch (error) {
        console.error('Error recording feedback:', error);
        res.status(500).json({
            error: 'Failed to record feedback',
            message: error.message
        });
    }
};

/**
 * Get user's learning patterns
 */
const getLearningPatterns = async (req, res) => {
    try {
        const userId = req.user.id;

        const patterns = await enhancedAICommentService.getUserLearningPatterns(userId);

        res.json({
            success: true,
            patterns: patterns.map(p => ({
                patternType: p.pattern_type,
                patternData: p.pattern_data,
                occurrences: p.occurrences,
                successRate: p.success_rate,
                confidenceScore: p.confidence_score,
                firstSeen: p.first_seen,
                lastSeen: p.last_seen
            }))
        });

    } catch (error) {
        console.error('Error getting learning patterns:', error);
        res.status(500).json({
            error: 'Failed to get learning patterns',
            message: error.message
        });
    }
};

/**
 * Get previous comments for a document
 */
const getPreviousComments = async (req, res) => {
    try {
        const userId = req.user.id;
        const { documentHash, limit = 20 } = req.query;

        if (!documentHash) {
            return res.status(400).json({
                error: 'documentHash is required'
            });
        }

        const comments = await enhancedAICommentService.getPreviousComments(
            userId,
            documentHash,
            []
        );

        res.json({
            success: true,
            comments: comments.slice(0, limit)
        });

    } catch (error) {
        console.error('Error getting previous comments:', error);
        res.status(500).json({
            error: 'Failed to get previous comments',
            message: error.message
        });
    }
};

/**
 * Generate more comments (progressive generation)
 */
const generateMoreComments = async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            documentContent,
            documentType,
            sessionId = null,
            existingCommentIds = [],
            additionalComments = 20,
            promptTemplate,
            customPrompt
        } = req.body;

        if (!documentContent) {
            return res.status(400).json({
                error: 'Document content is required'
            });
        }

        console.log(`Generating ${additionalComments} more comments for user ${userId}`);

        const result = await enhancedAICommentService.generateComments({
            userId,
            sessionId,
            documentContent,
            documentType,
            targetComments: additionalComments,
            promptTemplate,
            customPrompt,
            rememberPrevious: true,
            excludeCommentIds: existingCommentIds
        });

        // Broadcast additional comments to session
        if (sessionId && result.success) {
            broadcastToSession(sessionId, 'ai_comments_added', {
                userId,
                newComments: result.comments,
                totalComments: existingCommentIds.length + result.comments.length,
                timestamp: new Date().toISOString()
            });
        }

        res.json(result);

    } catch (error) {
        console.error('Error generating more comments:', error);
        res.status(500).json({
            error: 'Failed to generate more comments',
            message: error.message
        });
    }
};

module.exports = {
    generateComments,
    getCoachingPrompts,
    recordFeedback,
    getLearningPatterns,
    getPreviousComments,
    generateMoreComments
};
