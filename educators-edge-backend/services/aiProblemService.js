// src/services/aiProblemService.js (Gemini Version)
const db = require('../db');
const { GoogleAuth } = require('google-auth-library'); // Using Google Auth Library is a good practice if you deploy on Google Cloud

/**
 * Generates a bespoke micro-problem using Google's Gemini model and saves it to the database.
 * @param {object} sourceConcept - The concept the student understands.
 * @param {object} targetConcept - The concept the student is weak in.
 * @returns {Promise<number|null>} The ID of the newly generated problem, or null if failed.
 */
async function generateMicroProblem(sourceConcept, targetConcept) {
    console.log(`[GEMINI SERVICE] Generating problem to bridge '${sourceConcept.name}' to '${targetConcept.name}'`);
    
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("GEMINI_API_KEY is not configured.");
        return null;
    }

    // This system prompt is the "magic." It's heavily structured to force Gemini
    // into returning clean, parsable JSON that matches our database schema.
    const systemPrompt = `
        You are an expert computer science curriculum designer. Your task is to generate a single, self-contained micro-problem for a learning platform. This problem must be solvable in under 10 minutes and should help a student bridge a specific knowledge gap. The generated problem MUST be in JavaScript.

        The student is comfortable with the concept of "${sourceConcept.name}".
        The student needs practice with the concept of "${targetConcept.name}".
        
        You MUST respond with ONLY a single, raw JSON object. Do not include markdown formatting like \`\`\`json, comments, or any explanatory text outside of the JSON structure itself.
        
        The JSON object must have this exact structure:
        {
          "prompt": "A clear, concise problem description in Markdown format. This should explain the task to the student.",
          "boilerplate_code": {
            "index.js": "The starting JavaScript code for the student. For example: 'function solve(arr) {\\n  // Your code here\\n}'"
          },
          "test_cases": "A string of JavaScript code containing one or more 'console.assert()' statements to verify the solution. This will be appended to the user's code for execution."
        }

        Example of a valid response for bridging 'for loops' to 'array.map':
        {"prompt":"Given an array of numbers called 'nums', return a new array where each number is multiplied by 3. You **must** use the '.map()' method.","boilerplate_code":{"index.js":"function multiplyByThree(nums) {\\n  // Your code here\\n  return nums;\\n}"},"test_cases":"console.assert(JSON.stringify(multiplyByThree([1, 2, 3])) === JSON.stringify([3, 6, 9]));\\nconsole.assert(JSON.stringify(multiplyByThree([])) === JSON.stringify([]));\\nconsole.assert(JSON.stringify(multiplyByThree([10, -5, 0])) === JSON.stringify([30, -15, 0]));"}
    `;

    try {
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{ parts: [{ text: systemPrompt }] }],
                // Add safety settings to reduce the chance of the model refusing to answer
                safetySettings: [
                    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
                ],
                // Instruct Gemini to output JSON directly
                generationConfig: {
                    responseMimeType: "application/json",
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("[GEMINI SERVICE ERROR] Gemini API returned an error:", JSON.stringify(errorData));
            throw new Error('Failed to generate problem from the AI service.');
        }

        const data = await response.json();

        if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
            console.error("[GEMINI SERVICE ERROR] Invalid response structure from Gemini API:", JSON.stringify(data));
            throw new Error("Gemini returned an unexpected data structure.");
        }

        const responseText = data.candidates[0].content.parts[0].text;
        const problemJson = JSON.parse(responseText);

        // Validate the JSON from the LLM to ensure it has the fields we need
        if (!problemJson.prompt || !problemJson.boilerplate_code || !problemJson.test_cases) {
            throw new Error("LLM returned incomplete JSON object.");
        }
        
        // Save the newly generated problem to our database
        const dbRes = await db.query(
            `INSERT INTO generated_problems (prompt, boilerplate_code, test_cases, difficulty, source_concept_id, target_concept_id)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
            [
                problemJson.prompt,
                JSON.stringify(problemJson.boilerplate_code), // Ensure boilerplate is a JSON string
                problemJson.test_cases,
                5, // Default difficulty, can be made dynamic later
                sourceConcept.id,
                targetConcept.id
            ]
        );
        
        const newProblemId = dbRes.rows[0].id;
        console.log(`[GEMINI SERVICE] Successfully generated and saved new problem with ID: ${newProblemId}`);
        return newProblemId;

    } catch (error) {
        console.error("CRITICAL ERROR in generateMicroProblem (Gemini):", error);
        return null; // Return null on failure so the worker can handle it gracefully
    }
}

/**
 * --- NEW: Generates and saves a DYNAMIC REFRESHER fragment ---
 * This is called by the ApeWorker when it detects a student is struggling.
 * @param {object} lesson - The full lesson object from the database.
 * @param {object} weakConcept - The concept object the student has low mastery in.
 * @returns {Promise<number|null>} The ID of the newly created content_fragment, or null.
 */
async function generateAndSaveDynamicRefresher(lesson, weakConcept) {
    console.log(`[GEMINI SERVICE] Generating dynamic refresher for concept '${weakConcept.name}'`);
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || !lesson.objective) return null;

    const prompt = `
        You are an expert, encouraging computer science tutor. A student has just successfully completed a lesson, but their performance metrics indicate they struggled. Your goal is to generate a short, custom refresher to solidify their understanding of a key concept.

        Lesson Title: "${lesson.title}"
        Lesson Objective: "${lesson.objective}"
        
        The specific concept the student is weak in is: "${weakConcept.name}" (Category: ${weakConcept.category})

        Task:
        1. Write a short, clear, and encouraging refresher on the concept of "${weakConcept.name}" as it applies to the lesson they just finished.
        2. Use Markdown for formatting. Include a small, perfect code example if it helps illustrate the point.
        3. The tone should be positive and reinforcing, like "Great job getting the tests to pass! Let's quickly review a key idea...".
        4. The entire refresher should be concise (3-5 sentences).
        5. Respond ONLY with a single, raw JSON object in the format: 
           {"title": "A Quick Refresher on ${weakConcept.name}", "content": "Your 3-5 sentence Markdown refresher here."}
    `;

    try {
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
        
        const apiResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { responseMimeType: "application/json" }
            })
        });

        if (!apiResponse.ok) {
            console.error("[GEMINI SERVICE ERROR] Refresher generation failed with status:", apiResponse.status);
            return null;
        }

        const data = await apiResponse.json();
        const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!responseText) return null;
        
        const resultJson = JSON.parse(responseText);
        if (!resultJson.content) return null;

        const fragmentRes = await db.query(
            `INSERT INTO content_fragments (title, content, concept_id, is_dynamic) 
             VALUES ($1, $2, $3, TRUE) RETURNING id`,
            [resultJson.title, resultJson.content, weakConcept.id]
        );
        
        const newFragmentId = fragmentRes.rows[0].id;
        console.log(`[GEMINI SERVICE] Successfully generated and saved new refresher fragment with ID: ${newFragmentId}`);
        return newFragmentId;

    } catch (err) {
        console.error("CRITICAL ERROR in generateAndSaveDynamicRefresher:", err.message);
        return null;
    }
}

module.exports = { generateMicroProblem, generateAndSaveDynamicRefresher  };