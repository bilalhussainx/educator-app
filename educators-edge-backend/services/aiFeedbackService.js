/**
 * @file aiFeedbackService.js
 * @description This version uses a direct fetch call with robust error handling
 * to prevent server crashes when interacting with the Gemini API.
 */
const db = require('../db');

/**
 * Generates a conceptual hint by analyzing student code against a lesson objective using the Gemini API.
 *
 * @param {string} lessonObjective - The pedagogical goal of the lesson.
 * @param {string} studentCode - The student's functionally correct code.
 * @returns {Promise<object>} A promise resolving to an object with a feedback_type and optional message.
 */
// async function getConceptualHint(lessonObjective, studentCode) {
//     const apiKey = process.env.GEMINI_API_KEY;

//     if (!apiKey) {
//         console.error("[AI SERVICE ERROR] GEMINI_API_KEY is not configured.");
//         return { feedback_type: "standard_success" };
//     }

//     const prompt = `
//         You are an expert computer science tutor. Your goal is to analyze a student's functionally correct code to see if it aligns with the pedagogical intent of the lesson. You do not just check for correctness; you check for the application of the target concept.

//         Lesson Objective: "${lessonObjective}"
        
//         Student's Code:
//         \`\`\`
//         ${studentCode}
//         \`\`\`

//         Task:
//         1. Analyze the student's code.
//         2. Compare the implementation strategy against the lesson objective.
//         3. If the code is correct but uses a different concept (e.g., iteration instead of recursion), generate a helpful, Socratic hint. The hint should praise the correct solution but gently guide the student toward the intended concept.
//         4. Respond ONLY with a single, raw JSON object. If a hint is needed, the JSON should be: {"feedback_type": "conceptual_hint", "message": "Your hint here."}. If the student's code correctly uses the intended concept, the JSON should be: {"feedback_type": "standard_success"}.
//     `;

//     try {
//         const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;
        
//         const apiResponse = await fetch(apiUrl, {
//             method: 'POST',
//             headers: { 'Content-Type': 'application/json' },
//             body: JSON.stringify({
//                 contents: [{ parts: [{ text: prompt }] }]
//             })
//         });

//         if (!apiResponse.ok) {
//             // Log the error but don't crash the server
//             const errorText = await apiResponse.text();
//             console.error("[AI SERVICE ERROR] Gemini API returned an error:", apiResponse.status, errorText);
//             // Return a standard success to avoid blocking the student
//             return { feedback_type: "standard_success" };
//         }

//         const data = await apiResponse.json();
        
//         // Defensive check to ensure the response structure is what we expect
//         if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0].text) {
//              console.error("[AI SERVICE ERROR] Invalid response structure from Gemini API:", JSON.stringify(data));
//              return { feedback_type: "standard_success" };
//         }

//         const responseText = data.candidates[0].content.parts[0].text;
//         console.log("[AI LOG] Raw response text from Gemini:", responseText);

//         // Safely parse the JSON from the response text
//         try {
//             const resultJson = JSON.parse(responseText);
//             return resultJson;
//         } catch (parseError) {
//             console.error("[AI SERVICE ERROR] Failed to parse JSON from Gemini response:", parseError);
//             return { feedback_type: "standard_success" };
//         }

//     } catch (error) {
//         console.error("A critical error occurred in getConceptualHint:", error);
//         return { feedback_type: "standard_success" };
//     }
// }

exports.getConceptualHint = async (objective, studentCode) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        // Return a default success object if the service isn't configured.
        return { feedback_type: "standard_success" };
    }
    if (!objective || !studentCode) {
        return { feedback_type: "standard_success" };
    }

    const prompt = `
        You are an expert computer science tutor. Your goal is to analyze a student's functionally correct code to see if it aligns with the pedagogical intent of the lesson. You do not just check for correctness; you check for the application of the target concept.

        Lesson Objective: "${objective}"
        
        Student's Code:
        \`\`\`javascript
        ${studentCode}
        \`\`\`

        Task:
        1. Analyze the student's code.
        2. Compare the implementation strategy against the lesson objective.
        3. If the code is correct but uses a different concept (e.g., using a 'for' loop instead of the required '.map()' method), generate a helpful, Socratic hint. The hint should praise the correct solution but gently guide the student toward the intended concept.
        4. Respond ONLY with a single, raw JSON object. Your entire response must be ONLY the JSON. If a hint is needed, the JSON should be: {"feedback_type": "conceptual_hint", "message": "Your hint here."}. If the student's code correctly uses the intended concept, the JSON should be: {"feedback_type": "standard_success"}.
    `;

    try {
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
        
        const apiResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    responseMimeType: "application/json",
                }
            })
        });

        if (!apiResponse.ok) {
            const errorText = await apiResponse.text();
            console.error("[AI FEEDBACK ERROR] Gemini API returned an error:", apiResponse.status, errorText);
            return { feedback_type: "standard_success" };
        }

        const data = await apiResponse.json();
        
        if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
            console.error("[AI FEEDBACK ERROR] Invalid response structure from Gemini API:", JSON.stringify(data));
            return { feedback_type: "standard_success" };
        }
        
        const responseText = data.candidates[0].content.parts[0].text;
        console.log("[AI LOG] Raw response text from Gemini:", responseText);

        // --- KEY FIX: More robust cleaning logic ---
        // This regex finds a JSON object that might be wrapped in markdown backticks
        // and extracts just the JSON part.
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error("No valid JSON object found in the AI's response.");
        }
        const cleanedText = jsonMatch[0];
        // --- END FIX ---
        
        const resultJson = JSON.parse(cleanedText);
        return resultJson;

    } catch (err) {
        console.error("[AI FEEDBACK ERROR] An error occurred in getConceptualHint:", err);
        // If anything fails (API call, parsing, etc.), default to a standard success
        // to ensure the student is never blocked by an AI issue.
        return { feedback_type: "standard_success" };
    }
};

