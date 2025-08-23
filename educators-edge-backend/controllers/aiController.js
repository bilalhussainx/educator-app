// -----------------------------------------------------------------
// FILE: controllers/aiController.js (NEW FILE)
// -----------------------------------------------------------------
const db = require('../db');

// This controller will handle all interactions with the Gemini API.
exports.getHint = async (req, res) => {
    const { selectedCode, lessonId } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'AI service is not configured.' });
    }
    if (!selectedCode || !lessonId) {
        return res.status(400).json({ error: 'Selected code and lesson ID are required.' });
    }

    try {
        // First, fetch the lesson details to provide context to the AI.
        const lessonResult = await db.query('SELECT title, description FROM lessons WHERE id = $1', [lessonId]);
        if (lessonResult.rows.length === 0) {
            return res.status(404).json({ error: 'Lesson not found.' });
        }
        const lesson = lessonResult.rows[0];

        // --- Construct the Prompt for Gemini ---
        // This is a crucial step. A well-structured prompt gets better results.
        const prompt = `
            You are an expert programming teaching assistant. A student is working on a lesson and has asked for a hint.
            Your goal is to provide a helpful, Socratic hint that guides the student toward the answer without giving it away directly.

            Lesson Title: "${lesson.title}"
            Lesson Description: "${lesson.description}"

            Here is the piece of code the student has selected for a hint:
            ---
            ${selectedCode}
            ---

            Please provide a short, encouraging hint (no more than 2-3 sentences) to help them solve the problem. Do not write the corrected code.
        `;

        // --- Make the API Call to Gemini ---
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

        if (!response.ok) {
            const errorData = await response.json();
            console.error("Gemini API Error:", errorData);
            throw new Error('Failed to get a hint from the AI service.');
        }

        const data = await response.json();
        
        // Extract the text from the Gemini response.
        const hint = data.candidates[0].content.parts[0].text;

        res.json({ hint });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
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
