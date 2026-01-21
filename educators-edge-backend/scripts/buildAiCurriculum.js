
require('dotenv').config();
const db = require('./db');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// --- CONFIGURATION ---
const TEACHER_ID = 'eb03e344-252f-42ab-8187-602fc30384fa'; // Replace with your teacher's user ID
const MAX_RETRIES = 3; // The number of times to retry a failed AI call

// --- GEMINI AI SETUP ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });


// --- DEFINITIVE HELPER FUNCTIONS ---

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
    console.log(`--- Starting AI Curriculum Architect ---`);
    let client;

    try {
        // Phase 1: Load challenges from the database
        console.log('[Phase 1/4] Loading all challenges from the database...');
        client = await db.pool.connect();
        const libraryResult = await client.query(`SELECT * FROM ingested_lessons`);
        const allChallenges = libraryResult.rows;
        const sectionsResult = await client.query(`SELECT DISTINCT section_name, language FROM ingested_lessons`);
        const availableSections = sectionsResult.rows;
        client.release();
        client = null;
        
        if (allChallenges.length === 0) throw new Error("The 'ingested_lessons' table is empty.");
        console.log(` -> Library built with ${allChallenges.length} challenges across ${availableSections.length} sections.`);

        // Phase 2: AI Curriculum Planner
        console.log('\n[Phase 2/4] Asking AI to design a high-level curriculum plan...');
        const planningPrompt = `
            You are a curriculum director. Your task is to group the following list of FreeCodeCamp sections into a series of logical, high-level courses.
            PRINCIPLES:
            - Group related sections together.
            - Create separate courses for distinct topics like "Python for Data Science" or "Relational Databases".
            - Ignore irrelevant sections like 'a2-english-for-developers'.
            Available Sections (with their language):
            ${JSON.stringify(availableSections)}
            Respond ONLY with a single, raw JSON object. The root key is "curriculum_plan", an array of course objects.
            Each object must have a "course_title", "course_description", and a "source_sections" array containing the exact section_name strings for that course.
        `;
        const planningResponse = await generateAiContentWithRetries(planningPrompt, "Curriculum Plan");
        const curriculumPlan = planningResponse.curriculum_plan;
        
        if (!curriculumPlan || curriculumPlan.length === 0) throw new Error("AI failed to generate a valid curriculum plan.");
        console.log(` -> AI has designed a learning path with ${curriculumPlan.length} courses.`);

        // Phase 3: AI Lesson Sorter
        console.log('\n[Phase 3/4] Asking AI to sort lessons for each course...');
        for (const course of curriculumPlan) {
            const lessonCandidates = allChallenges.filter(c => course.source_sections.includes(c.section_name));
            if (lessonCandidates.length === 0) {
                course.lesson_ids = [];
                continue;
            }

            const sortingPrompt = `
                You are a master educator. Given a list of lessons for a course titled "${course.course_title}", arrange them in the perfect pedagogical order.
                Here are the unsorted lessons with their IDs and titles:
                ${JSON.stringify(lessonCandidates.map(l => ({ id: l.id, title: l.title })))}
                Respond ONLY with a single, raw JSON array of the lesson IDs in the correct order.
            `;
            course.lesson_ids = await generateAiContentWithRetries(sortingPrompt, `Lesson Sorting for "${course.course_title}"`);
            console.log(`  -> AI has sorted ${course.lesson_ids.length} lessons for "${course.course_title}".`);
        }

        // Phase 4: The Builder
        console.log('\n[Phase 4/4] Building and saving the new AI-generated curriculum...');
        client = await db.pool.connect();
        await client.query('BEGIN');

        for (const course of curriculumPlan) {
            if (course.lesson_ids.length === 0) continue;
            const newCourseResult = await client.query(
                `INSERT INTO courses (title, description, teacher_id, is_published) VALUES ($1, $2, $3, false) RETURNING id`,
                [course.course_title, course.course_description, TEACHER_ID]
            );
            const courseId = newCourseResult.rows[0].id;
            console.log(`  -> Created Course: "${course.course_title}"`);

            for (let i = 0; i < course.lesson_ids.length; i++) {
                const lessonId = course.lesson_ids[i];
                const originalChallenge = allChallenges.find(c => c.id === lessonId);
                if (originalChallenge) {
                    const newLessonResult = await client.query(
                        `INSERT INTO lessons (title, description, course_id, teacher_id, lesson_type, language, objective, order_index)
                         VALUES ($1, $2, $3, $4, $5, $6, 'AI Objective Pending', $7) RETURNING id`,
                        [
                            originalChallenge.title,
                            originalChallenge.description,
                            courseId, TEACHER_ID,
                            originalChallenge.lesson_type,
                            originalChallenge.language,
                            i
                        ]
                    );
                    const newLessonId = newLessonResult.rows[0].id;

                    if (originalChallenge.files && Array.isArray(originalChallenge.files)) {
                        for (const file of originalChallenge.files) {
                            await client.query(`INSERT INTO lesson_files (filename, content, lesson_id) VALUES ($1, $2, $3)`, [file.name || file.language, file.content || file.code, newLessonId]);
                        }
                    }
                    if (originalChallenge.solution_files && Array.isArray(originalChallenge.solution_files)) {
                        for (const file of originalChallenge.solution_files) {
                            await client.query(`INSERT INTO lesson_solution_files (filename, content, lesson_id) VALUES ($1, $2, $3)`, [file.name || file.language, file.content || file.code, newLessonId]);
                        }
                    }
                    if (originalChallenge.test_code) {
                        const testCode = Array.isArray(JSON.parse(originalChallenge.test_code)) ? JSON.parse(originalChallenge.test_code).map(t => t.testCode).join('\n') : originalChallenge.test_code;
                        await client.query(`INSERT INTO lesson_tests (test_code, lesson_id) VALUES ($1, $2)`, [testCode, newLessonId]);
                    }
                }
            }
            console.log(`     - Added ${course.lesson_ids.length} ordered lessons.`);
        }
        await client.query('COMMIT');
        console.log(`\n--- SUCCESS! The AI-generated curriculum has been saved. ---`);
    } catch (error) {
        if (client) await client.query('ROLLBACK').catch(e => console.error("Rollback failed:", e));
        console.error("\n--- FAILED to build curriculum ---", error.message, error.stack);
    } finally {
        if (client) client.release();
        await db.pool.end();
    }
}

main();