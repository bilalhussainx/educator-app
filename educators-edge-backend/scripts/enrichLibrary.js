// FILE: enrichLibrary.js
require('dotenv').config();
const db = require('./db');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// --- GEMINI AI SETUP ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
const TEACHER_ID = 'eb03e344-252f-42ab-8187-602fc30384fa'; // Replace with your teacher's user ID
const MAX_RETRIES = 3; // The number of times to retry a failed AI call

// --- GEMINI AI SETUP ---
// --- HELPER FUNCTIONS ---
function sanitizeAndParseJson(rawText) {
    if (!rawText || typeof rawText !== 'string') {
        throw new Error("AI response is null, undefined, or not a string.");
    }
    // This regex will find the first JSON object or array in the string, even with markdown/text around it.
    const jsonRegex = /({[\s\S]*}|\[[\s\S]*\])/;
    const match = rawText.match(jsonRegex);

    if (match && match[0]) {
        try {
            return JSON.parse(match[0]);
        } catch (e) {
            console.error("Failed to parse the extracted JSON string:", match[0]);
            throw new Error(`AI response contained malformed JSON. Details: ${e.message}`);
        }
    }
    // If no JSON is found, we log the entire response for debugging.
    console.error("DEBUG: AI Raw Response that failed sanitization:", rawText);
    throw new Error("No valid JSON object or array found in the AI response.");
}

async function generateAiContentWithRetries(prompt, description) {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            console.log(`  -> [Attempt ${attempt}/${MAX_RETRIES}] Calling Gemini for: ${description}`);
            const result = await model.generateContent(prompt);
            const responseText = result.response.text();
            
            if (!responseText || responseText.trim() === '') {
                 throw new Error("AI returned an empty response.");
            }

            return sanitizeAndParseJson(responseText);
        } catch (error) {
            console.warn(`  -> [Attempt ${attempt}/${MAX_RETRIES}] AI call failed for "${description}". Error: ${error.message}`);
            if (attempt === MAX_RETRIES) {
                console.error(`  -> All ${MAX_RETRIES} attempts failed for "${description}". Giving up.`);
                throw error;
            }
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
    // This line should not be reachable, but it satisfies TypeScript.
    throw new Error("AI content generation failed after all retries.");
}

// --- MAIN ORCHESTRATOR ---
async function main() {
    console.log(`--- Starting AI Librarian Enrichment Process ---`);
    const client = await db.pool.connect();
    try {
        // 1. Find all lessons that haven't been enriched yet.
        console.log('[Phase 1/2] Finding unenriched lessons in the library...');
        const lessonsToEnrichResult = await client.query(
            `SELECT id, title, description FROM ingested_lessons WHERE chapter IS NULL AND language = 'javascript' LIMIT 200` // Process in batches
        );
        const lessonsToEnrich = lessonsToEnrichResult.rows;
        
        if (lessonsToEnrich.length === 0) {
            console.log("No new lessons to enrich. The library is up to date.");
            return;
        }
        console.log(` -> Found ${lessonsToEnrich.length} JavaScript lessons to enrich.`);

        // 2. Ask the AI agent to categorize them.
        console.log('\n[Phase 2/2] Asking AI Computer Science Teacher to categorize lessons...');
        const prompt = `
            You are a Computer Science professor with 20+ years of experience designing university-level curricula.
            Your task is to analyze the following list of raw JavaScript lesson titles and descriptions and assign each one to a precise, standardized "chapter" or "concept" category.

            PRINCIPLES:
            - **Be Specific:** Use clear, industry-standard categories (e.g., "Variables and Data Types", "DOM Manipulation", "Asynchronous JavaScript", "ES6 Features", "Algorithmic Thinking").
            - **Be Consistent:** Use the same category name for similar lessons.
            - **Create a "chapter" and a "sub_chapter"** for fine-grained organization.

            Here is the list of lessons to categorize:
            ${JSON.stringify(lessonsToEnrich.map(l => ({ id: l.id, title: l.title, description: l.description })))}

            Respond ONLY with a single, raw JSON object. The root key must be "categorized_lessons", which is an array of objects.
            Each object MUST contain the "id" of the lesson, and the "chapter" and "sub_chapter" you have assigned it.

            Example Response Format:
            {
              "categorized_lessons": [
                {
                  "id": "uuid-for-lesson-1",
                  "chapter": "JavaScript Fundamentals",
                  "sub_chapter": "Variables and Data Types"
                },
                {
                  "id": "uuid-for-lesson-2",
                  "chapter": "DOM Manipulation",
                  "sub_chapter": "Event Handling"
                }
              ]
            }
        `;

        const categorizationResponse = await generateAiContentWithRetries(prompt, "Lesson Categorization");
        const categorizedLessons = categorizationResponse.categorized_lessons;
        
        if (!categorizedLessons || !Array.isArray(categorizedLessons)) {
            throw new Error("AI failed to return a valid list of categorized lessons.");
        }
        console.log(` -> AI has successfully categorized ${categorizedLessons.length} lessons.`);

        // 3. Update the database with the new categories.
        await client.query('BEGIN');
        for (const lesson of categorizedLessons) {
            await client.query(
                'UPDATE ingested_lessons SET chapter = $1, sub_chapter = $2 WHERE id = $3',
                [lesson.chapter, lesson.sub_chapter, lesson.id]
            );
        }
        await client.query('COMMIT');
        console.log('\n--- SUCCESS! The lesson library has been enriched with AI-powered categories. ---');

    } catch (error) {
        if (client) await client.query('ROLLBACK').catch(e => console.error("Rollback failed:", e));
        console.error("\n--- FAILED to enrich library ---", error.message);
    } finally {
        if (client) client.release();
        await db.pool.end();
    }
}

main();