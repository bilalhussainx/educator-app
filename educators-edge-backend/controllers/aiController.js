// -----------------------------------------------------------------
// FILE: controllers/aiController.js (NEW FILE)
// -----------------------------------------------------------------
const db = require('../db');

// Ensure fetch is available (for older Node.js versions)
if (typeof fetch === 'undefined') {
    global.fetch = require('node-fetch');
}

// This controller will handle all interactions with the Gemini API.
exports.getHint = async (req, res) => {
    console.log('[HINT] Request received:', { lessonId: req.body.lessonId, codeLength: req.body.selectedCode?.length, hasPromptModifier: !!req.body.promptModifier });

    const { selectedCode, lessonId, promptModifier } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        console.log('[HINT] ERROR: No API key configured');
        return res.status(500).json({ error: 'AI service is not configured.' });
    }
    if (!selectedCode || !lessonId) {
        console.log('[HINT] ERROR: Missing required fields:', { selectedCode: !!selectedCode, lessonId: !!lessonId });
        return res.status(400).json({ error: 'Selected code and lesson ID are required.' });
    }

    try {
        // Parse the lesson ID to handle enhanced courses
        console.log('[HINT] Parsing lesson ID:', lessonId);
        let lesson = { title: 'Unknown', description: 'No description available' };

        // Check if this is an enhanced course lesson (format: courseId-moduleIndex-lessonIndex)
        const lessonIdParts = lessonId.split('-');
        if (lessonIdParts.length >= 3) {
            // This is likely an enhanced course lesson
            const moduleIndex = lessonIdParts[lessonIdParts.length - 2];
            const lessonIndex = lessonIdParts[lessonIdParts.length - 1];
            const courseId = lessonIdParts.slice(0, -2).join('-'); // Rejoin in case courseId has dashes

            console.log('[HINT] Detected enhanced course:', { courseId, moduleIndex, lessonIndex });

            // Fetch enhanced course lesson details
            const enhancedCourseQuery = `
                SELECT title, description, metadata
                FROM enhanced_courses
                WHERE id = $1 AND is_published = true
            `;
            const enhancedResult = await db.query(enhancedCourseQuery, [courseId]);

            if (enhancedResult.rows.length > 0) {
                const course = enhancedResult.rows[0];
                const modules = course.metadata?.modules || [];

                if (moduleIndex < modules.length) {
                    const currentModule = modules[parseInt(moduleIndex)];
                    const lessons = currentModule.lessons?.lessons || [];

                    if (lessonIndex < lessons.length) {
                        const currentLesson = lessons[parseInt(lessonIndex)];
                        lesson = {
                            title: currentLesson.title || `Lesson ${parseInt(lessonIndex) + 1}`,
                            description: currentLesson.description || currentLesson.problem_statement || 'No description available'
                        };
                        console.log('[HINT] Enhanced course lesson found:', { title: lesson.title?.substring(0, 50) });
                    }
                }
            }
        } else {
            // Fallback to regular lessons table
            console.log('[HINT] Falling back to regular lessons table');
            const lessonResult = await db.query('SELECT title, description FROM lessons WHERE id = $1', [lessonId]);

            if (lessonResult.rows.length > 0) {
                lesson = lessonResult.rows[0];
                console.log('[HINT] Regular lesson found:', { title: lesson.title?.substring(0, 50) });
            }
        }

        // --- Construct the Prompt for Gemini ---
        // This is a crucial step. A well-structured prompt gets better results.
        let baseInstruction = "You are an expert programming teaching assistant. A student is working on a lesson and has asked for a hint. Your goal is to provide a helpful, Socratic hint that guides the student toward the answer without giving it away directly.";

        if (promptModifier) {
            baseInstruction = `You are an expert programming teaching assistant. ${promptModifier}`;
        }

        const prompt = `
            ${baseInstruction}

            Lesson Title: "${lesson.title}"
            Lesson Description: "${lesson.description}"

            Here is the student's current code:
            ---
            ${selectedCode}
            ---

            Please provide a short, encouraging hint (no more than 2-3 sentences) to help them solve the problem. Do not write the corrected code.
        `;

        // --- Make the API Call to Gemini ---
        console.log('[HINT] Making Gemini API call...');
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }]
            })
        });

        console.log('[HINT] Gemini API response status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[HINT] Gemini API Error:', response.status, errorText);
            throw new Error(`Failed to get a hint from the AI service: ${response.status} ${errorText}`);
        }

        const data = await response.json();
        console.log('[HINT] Gemini API response received, candidates:', data.candidates?.length || 0);

        // Extract the text from the Gemini response.
        const hint = data.candidates[0].content.parts[0].text;
        console.log('[HINT] Successfully extracted hint, length:', hint?.length);

        res.json({ hint });

    } catch (err) {
        console.error('[HINT] Error occurred:', err.message);
        console.error('[HINT] Full error:', err);
        res.status(500).json({ error: 'Server Error: ' + err.message });
    }
};
/**
 * --- NEW: Generates conceptual feedback for a correct solution ---
 */
exports.getConceptualFeedback = async (req, res) => {
    const { studentCode, lessonId } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'AI service is not configured.' });
    }
    if (!studentCode || !lessonId) {
        return res.status(400).json({ error: 'Student code and lesson ID are required.' });
    }

    try {
        const lessonResult = await db.query('SELECT objective FROM lessons WHERE id = $1', [lessonId]);
        if (lessonResult.rows.length === 0) {
            return res.status(404).json({ error: 'Lesson not found.' });
        }
        const lessonObjective = lessonResult.rows[0].objective;

        if (!lessonObjective) {
            return res.json({ feedback_type: "standard_success" });
        }

        const prompt = `
            You are an expert computer science tutor. Your goal is to analyze a student's functionally correct code to see if it aligns with the pedagogical intent of the lesson. You do not just check for correctness; you check for the application of the target concept.

            Lesson Objective: "${lessonObjective}"
            
            Student's Code:
            \`\`\`
            ${studentCode}
            \`\`\`

            Task:
            1. Analyze the student's code.
            2. Compare the implementation strategy against the lesson objective.
            3. If the code is correct but uses a different concept (e.g., iteration instead of recursion), generate a helpful, Socratic hint. The hint should praise the correct solution but gently guide the student toward the intended concept.
            4. Respond ONLY with a single, raw JSON object. If a hint is needed, the JSON should be: {"feedback_type": "conceptual_hint", "message": "Your hint here."}. If the student's code correctly uses the intended concept, the JSON should be: {"feedback_type": "standard_success"}.
        `;

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        
        const apiResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        if (!apiResponse.ok) {
            const errorText = await apiResponse.text();
            console.error("[AI FEEDBACK ERROR] Gemini API returned an error:", apiResponse.status, errorText);
            return res.json({ feedback_type: "standard_success" });
        }

        const data = await apiResponse.json();
        
        // --- NEW: Robust parsing to prevent server crashes ---
        if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
            console.error("[AI FEEDBACK ERROR] Invalid response structure from Gemini API:", JSON.stringify(data));
            return res.json({ feedback_type: "standard_success" });
        }
        
        const responseText = data.candidates[0].content.parts[0].text;
        console.log("[AI LOG] Raw response text from Gemini:", responseText);

        try {
            // Clean the text in case the AI wraps it in markdown backticks
            const cleanedText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
            const resultJson = JSON.parse(cleanedText);
            res.json(resultJson);
        } catch (parseError) {
            console.error("[AI FEEDBACK ERROR] Failed to parse JSON from Gemini response:", parseError, "Raw text was:", responseText);
            // If parsing fails, default to a standard success to avoid blocking the student.
            res.json({ feedback_type: "standard_success" });
        }

    } catch (err) {
        console.error("Error in getConceptualFeedback:", err.message);
        res.status(500).json({ error: 'Server Error' });
    }
};

/**
 * Get specific edit suggestions for selected text using specialized agent
 */
exports.getEditSuggestions = async (req, res) => {
    try {
        const { selectedText, fullEssay, message, essayType } = req.body;
        const geminiService = require('../services/geminiService');
        
        if (!selectedText) {
            return res.status(400).json({ error: 'Selected text is required for edit suggestions' });
        }
        
        const context = {
            selectedText: selectedText,
            fullEssay: fullEssay,
            essayType: essayType
        };
        
        const request = message || `Please provide specific edit suggestions for the selected text to improve clarity, style, and impact.`;
        
        const result = await geminiService.generateAgentResponse('editSuggestionAgent', request, context);
        
        res.json({
            success: result.success,
            response: result.response,
            agentUsed: result.agentUsed,
            selectedText: selectedText,
            fromFallback: result.fromFallback
        });
        
    } catch (error) {
        console.error("Error in getEditSuggestions:", error.message);
        res.status(500).json({ error: 'Failed to generate edit suggestions' });
    }
};

/**
 * Get general writing feedback using specialized agent
 */
exports.getWritingFeedback = async (req, res) => {
    try {
        const { fullEssay, message, essayType } = req.body;
        const geminiService = require('../services/geminiService');
        
        if (!fullEssay) {
            return res.status(400).json({ error: 'Essay content is required for feedback' });
        }
        
        const context = {
            fullEssay: fullEssay,
            essayType: essayType
        };
        
        const request = message || `Please provide comprehensive feedback on the overall structure, flow, and writing quality of this essay.`;
        
        const result = await geminiService.generateAgentResponse('feedbackAgent', request, context);
        
        res.json({
            success: result.success,
            response: result.response,
            agentUsed: result.agentUsed,
            fromFallback: result.fromFallback
        });
        
    } catch (error) {
        console.error("Error in getWritingFeedback:", error.message);
        res.status(500).json({ error: 'Failed to generate writing feedback' });
    }
};

/**
 * Get contextual comments for selected text using specialized agent
 */
exports.getContextualComments = async (req, res) => {
    try {
        const { selectedText, fullEssay, message, essayType } = req.body;
        const geminiService = require('../services/geminiService');
        
        if (!selectedText) {
            return res.status(400).json({ error: 'Selected text is required for contextual comments' });
        }
        
        const context = {
            selectedText: selectedText,
            fullEssay: fullEssay,
            essayType: essayType
        };
        
        const request = message || `Please provide specific, contextual feedback and suggestions for improvement on the selected text passage.`;
        
        const result = await geminiService.generateAgentResponse('commentAgent', request, context);
        
        res.json({
            success: result.success,
            response: result.response,
            agentUsed: result.agentUsed,
            selectedText: selectedText,
            fromFallback: result.fromFallback
        });
        
    } catch (error) {
        console.error("Error in getContextualComments:", error.message);
        res.status(500).json({ error: 'Failed to generate contextual comments' });
    }
};
