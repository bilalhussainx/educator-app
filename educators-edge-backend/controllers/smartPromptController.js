/**
 * Smart Prompt Controller
 * Handles smart prompt-driven AI comment generation
 */

const enhancedAICommentService = require('../src/services/enhancedAICommentService');

/**
 * Generate inline comments based on a smart writing prompt
 */
const generateCommentsFromPrompt = async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            prompt,
            documentContent,
            documentType = 'essay',
            wordCount,
            requirements,
            sessionId = null
        } = req.body;

        // Validate input
        if (!prompt || !documentContent) {
            return res.status(400).json({
                error: 'Prompt and document content are required'
            });
        }

        if (documentContent.trim().length < 50) {
            return res.status(400).json({
                error: 'Document content must be at least 50 characters'
            });
        }

        console.log(`Smart Prompt Request - User: ${userId}, Prompt: ${prompt.substring(0, 100)}...`);

        // Create a custom prompt that focuses on the user's specific request
        const customPrompt = `
You are an expert writing coach. A student has specifically asked for help with this:

"${prompt}"

Please provide TARGETED inline comments that directly address this specific request.
Generate 10-20 actionable comments focused ONLY on what the student asked for.

Document Type: ${documentType}
Word Count: ${wordCount}
Requirements: ${JSON.stringify(requirements)}

For each comment, provide:
1. The exact text to highlight
2. Specific feedback related to the prompt: "${prompt}"
3. Concrete suggestions or replacements
4. Clear explanation of how this addresses their request

Format your response as a JSON object with a "comments" array. Each comment should have:
{
    "highlightedText": "exact text from document",
    "startOffset": number (character position),
    "endOffset": number (character position),
    "commentType": "thematic_insight" | "stylistic_craft" | "rhetorical_strategy" | "structural_coherence" | "reader_engagement",
    "severity": "positive" | "minor" | "moderate" | "major",
    "category": string (e.g., "Narrative Engagement", "Character Development", "Theme"),
    "message": "brief comment related to their prompt",
    "suggestion": "specific actionable suggestion",
    "explanation": "why this helps with their specific request",
    "replacementText": "optional improved version",
    "alternatives": ["optional", "alternative", "suggestions"],
    "confidence": number 0-1
}

Document:
${documentContent}
        `.trim();

        // Use the enhanced AI comment service with the custom prompt
        const result = await enhancedAICommentService.generateComments({
            userId,
            sessionId,
            documentContent,
            documentType,
            targetComments: 15, // Focused set of comments
            promptTemplate: null, // Use custom prompt instead
            customPrompt,
            rememberPrevious: false, // Don't use memory for prompt-specific requests
            excludeCommentIds: []
        });

        // Add the original prompt to the metadata
        if (result.success) {
            result.metadata = {
                ...result.metadata,
                originalPrompt: prompt,
                promptDriven: true,
                requirements
            };
        }

        res.json(result);

    } catch (error) {
        console.error('Error in generateCommentsFromPrompt:', error);
        res.status(500).json({
            error: 'Failed to generate comments from prompt',
            message: error.message
        });
    }
};

module.exports = {
    generateCommentsFromPrompt
};
