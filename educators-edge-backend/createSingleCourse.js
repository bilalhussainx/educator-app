// FILE: createSingleCourse.js
require('dotenv').config();
const db = require('./db');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// --- CONFIGURATION ---
const TEACHER_ID = 'eb03e344-252f-42ab-8187-602fc30384fa'; // Replace with your teacher's user ID
const MAX_RETRIES = 3;

// --- GEMINI AI SETUP ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });


// --- HELPER FUNCTIONS ---
function sanitizeAndParseJson(rawText) {
    if (!rawText || typeof rawText !== 'string') throw new Error("AI response is null or not a string.");
    const jsonRegex = /({[\s\S]*})/;
    const match = rawText.match(jsonRegex);
    if (match && match[0]) {
        try { return JSON.parse(match[0]); } catch (e) {
            console.error("Failed to parse the extracted JSON string:", match[0]);
            throw new Error(`AI response contained malformed JSON. Details: ${e.message}`);
        }
    }
    console.error("DEBUG: AI Raw Response that failed sanitization:", rawText);
    throw new Error("No valid JSON object found in the AI response.");
}

async function generateAiContentWithRetries(prompt, description) {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            console.log(`  -> [Attempt ${attempt}/${MAX_RETRIES}] Calling Gemini for: ${description}`);
            const result = await model.generateContent(prompt);
            const responseText = result.response.text();
            if (!responseText) throw new Error("AI returned an empty response.");
            return sanitizeAndParseJson(responseText);
        } catch (error) {
            console.warn(`  -> [Attempt ${attempt}/${MAX_RETRIES}] AI call failed for "${description}". Error: ${error.message}`);
            if (attempt === MAX_RETRIES) throw error;
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
    throw new Error("AI content generation failed after all retries.");
}

// THIS IS THE CORRECTED FUNCTION
function inferLanguageFromTopic(topic) {
    const lowerTopic = topic.toLowerCase();
    if (lowerTopic.includes('javascript') || lowerTopic.includes('js')) return 'javascript';
    if (lowerTopic.includes('python')) return 'python';
    if (lowerTopic.includes('css')) return 'css';
    if (lowerTopic.includes('html')) return 'html';
    if (lowerTopic.includes('database') || lowerTopic.includes('sql')) return 'sql';
    return null;
}


// --- MAIN ORCHESTRATOR ---
async function createCourse(topic, lessonCount) {
    console.log("[DEBUG] Entered createCourse function.");
    if (!topic || !lessonCount || isNaN(lessonCount)) {
        console.error("FATAL ERROR: Topic or lesson count is missing or invalid.");
        console.error("Usage: node createSingleCourse.js \"<Topic Name>\" <Number of Lessons>");
        return;
    }
    console.log(`--- Starting AI Course Generation for: "${topic}" ---`);
    
    let client;
    try {
        console.log("[DEBUG] Attempting to connect to database pool...");
        client = await db.pool.connect();
        console.log("[DEBUG] Database client connected successfully.");

        // 1. THE LIBRARIAN
        console.log('[Phase 1/3] Searching for candidate lessons in the library...');
        const language = inferLanguageFromTopic(topic);
        if (!language) {
            throw new Error(`Could not determine language from topic "${topic}". Please be more specific (e.g., "JavaScript Arrays").`);
        }
        console.log(` -> Inferred language: ${language}`);
        
        const searchKeyword = topic.split(' ')[0].toLowerCase();
        const candidateResult = await client.query(
            `SELECT * FROM ingested_lessons WHERE (title ILIKE $1 OR description ILIKE $1) AND language = $2 LIMIT 150`,
            [`%${searchKeyword}%`, language]
        );
        const candidateLessons = candidateResult.rows;
        if (candidateLessons.length < lessonCount) {
            throw new Error(`Found only ${candidateLessons.length} candidate lessons for topic "${topic}". Please try a broader topic.`);
        }
        console.log(` -> Found ${candidateLessons.length} potential candidate lessons.`);

        // 2. THE AI COURSE ARCHITECT
        const architectPrompt = `
            You are a world-class computer science professor with 20+ years of experience designing curricula for a top university.
            Your task is to design a single, cohesive course about "${topic}" using the provided library of raw lessons.

            PRINCIPLES:
            1.  **Select the BEST ${lessonCount} lessons** from the candidates that are most relevant to the topic.
            2.  **Sort them in perfect pedagogical order**, from the most fundamental concept to the most advanced.
            3.  **Write a professional, compelling course title and description.**
            4.  **For EACH selected lesson, write a concise, one-sentence learning objective.**
            5.  **Quality Control:** If you cannot find ${lessonCount} high-quality, relevant lessons, select fewer. Do not include irrelevant lessons.

            Here is the library of candidate lessons:
            ${JSON.stringify(candidateLessons.map(l => ({ id: l.id, title: l.title, description: l.description })))}

            Respond ONLY with a single, raw JSON object. The structure must be:
            {
              "course_title": "...",
              "course_description": "...",
              "lesson_sequence": [
                {
                  "id": "uuid-of-first-lesson",
                  "title": "Title of First Lesson",
                  "ai_generated_objective": "The student will be able to..."
                }
              ]
            }
        `;
        const coursePlan = await generateAiContentWithRetries(architectPrompt, "Course Architecture");
        if (!coursePlan || !coursePlan.lesson_sequence || coursePlan.lesson_sequence.length === 0) {
            throw new Error("AI failed to generate a valid course plan.");
        }
        console.log(` -> AI has designed a course titled "${coursePlan.course_title}" with ${coursePlan.lesson_sequence.length} lessons.`);

        // 3. THE BUILDER
        console.log(`\n[Phase 3/3] Building and saving the new course to the database...`);
        await client.query('BEGIN');
        const newCourseResult = await client.query(
            `INSERT INTO courses (title, description, teacher_id, is_published) VALUES ($1, $2, $3, false) RETURNING id`,
            [coursePlan.course_title, coursePlan.course_description, TEACHER_ID]
        );
        const courseId = newCourseResult.rows[0].id;
        console.log(`  -> Created Course record with ID: ${courseId}`);

        let insertedLessonsCount = 0;
        for (let i = 0; i < coursePlan.lesson_sequence.length; i++) {
            const lessonInfo = coursePlan.lesson_sequence[i];
            const originalChallenge = candidateLessons.find(c => c.id === lessonInfo.id);

            if (originalChallenge) {
                const newLessonResult = await client.query(
                    `INSERT INTO lessons (title, description, course_id, teacher_id, lesson_type, language, objective, order_index)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
                    [
                        originalChallenge.title,
                        originalChallenge.description,
                        courseId, TEACHER_ID,
                        originalChallenge.lesson_type,
                        originalChallenge.language,
                        lessonInfo.ai_generated_objective,
                        i
                    ]
                );
                const newLessonId = newLessonResult.rows[0].id;

                if (originalChallenge.files) {
                    for (const file of originalChallenge.files) {
                        await client.query(`INSERT INTO lesson_files (filename, content, lesson_id) VALUES ($1, $2, $3)`, [file.name || file.language, file.content || file.code, newLessonId]);
                    }
                }
                if (originalChallenge.solution_files) {
                    for (const file of originalChallenge.solution_files) {
                        await client.query(`INSERT INTO lesson_solution_files (filename, content, lesson_id) VALUES ($1, $2, $3)`, [file.name || file.language, file.content || file.code, newLessonId]);
                    }
                }
                if (originalChallenge.test_code) {
                    const testCode = Array.isArray(JSON.parse(originalChallenge.test_code)) ? JSON.parse(originalChallenge.test_code).map(t => t.testCode).join('\n') : originalChallenge.test_code;
                    await client.query(`INSERT INTO lesson_tests (test_code, lesson_id) VALUES ($1, $2)`, [testCode, newLessonId]);
                }
                insertedLessonsCount++;
            }
        }
        
        console.log(` -> Inserted ${insertedLessonsCount} complete lessons into the new course.`);
        await client.query('COMMIT');
        console.log(`\n--- SUCCESS! The new course has been saved to your database. ---`);
    } catch (error) {
        if (client) await client.query('ROLLBACK').catch(e => console.error("Rollback failed:", e));
        console.error("\n--- FAILED to create AI course ---", error.message);
        console.error(error.stack);
    } finally {
        if (client) {
            console.log("[DEBUG] Releasing database client.");
            client.release();
        }
        console.log("[DEBUG] Ending database pool.");
        await db.pool.end();
        console.log("[DEBUG] Script finished.");
    }
}

const topic = process.argv[2];
const lessonCount = parseInt(process.argv[3], 10);

console.log(`[DEBUG] Topic received: ${topic}`);
console.log(`[DEBUG] Lesson count received: ${lessonCount}`);

createCourse(topic, lessonCount);