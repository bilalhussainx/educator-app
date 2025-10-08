/**
 * Gemini-Style Writing Assistant Controller
 */

const geminiAssistantService = require('../services/geminiAssistantService');

/**
 * Handle quick action requests
 */
exports.handleQuickAction = async (req, res) => {
    try {
        const { action, selectedText, documentContext, cursorPosition, customPrompt } = req.body;

        if (!action) {
            return res.status(400).json({
                success: false,
                error: 'Action is required'
            });
        }

        const result = await geminiAssistantService.handleQuickAction({
            action,
            selectedText,
            documentContext,
            cursorPosition,
            customPrompt
        });

        res.json(result);

    } catch (error) {
        console.error('Quick action error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to process action'
        });
    }
};

/**
 * Generate smart suggestions
 */
exports.generateSmartSuggestions = async (req, res) => {
    try {
        const { documentContent, cursorPosition } = req.body;

        if (!documentContent) {
            return res.status(400).json({
                success: false,
                error: 'Document content is required'
            });
        }

        const result = await geminiAssistantService.generateSmartSuggestions(
            documentContent,
            cursorPosition
        );

        res.json(result);

    } catch (error) {
        console.error('Smart suggestions error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate suggestions'
        });
    }
};
