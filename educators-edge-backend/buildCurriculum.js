// FILE: buildCurriculum.js
require('dotenv').config();
const db = require('./src/db');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// --- Gemini AI Configuration ---
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// --- IMPORTANT: CONFIGURE YOUR TEACHER ID ---
const TEACHER_ID = 'eb03e344-252f-42ab-818a-xxxxxxxxxxxx'; // Replace with your teacher's user ID

function sanitizeAndParseJson(rawText) {
    const jsonStart = rawText.indexOf('{');
    const jsonEnd = rawText.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1) {
        const jsonText = rawText.substring(jsonStart, jsonEnd + 1);
        try {
            return JSON.parse(jsonText);
        } catch (e) {
            console.error("Failed to parse sanitized JSON:", jsonText);
            throw new Error("AI response was not valid JSON.");
        }
    }
    throw new Error("No valid JSON object found in the AI response.");
}

/**
 * The main orchestrator function for building a multi-course curriculum.
 * @param {string} curriculumName - The name for the learning path (e.g., "JavaScript Mastery").
 */
async function buildCurriculum(curriculumName) {
    if (!curriculumName) {
        console.error("Usage: node buildCurriculum.js \"<Curriculum Name>\"");
        process.exit(1);
    }
    console.log(`--- Starting AI Curriculum Generation for: "${curriculumName}" ---`);
    
    const client = await db.pool.connect();
    try {
        // 1. THE LIBRARIAN: Fetch ALL available JavaScript lessons with their content
        console.log('[Step 1/3] Gathering all available JavaScript lessons from the library...');
        const libraryResult = await client.query(
            `SELECT id, title, description, lesson_type, files, solution_files, test_code FROM ingested_lessons WHERE language = 'javascript'`
        );
        const allJsLessons = libraryResult.rows;
        if (allJsLessons.length < 10) {
            throw new Error("Not enough JavaScript lessons in the library to build a full curriculum.");
        }
        console.log(` -> Found ${allJsLessons.length} total JavaScript lessons.`);

        // 2. THE CURRICULUM PLANNER: Ask Gemini to design the course structure
        console.log('\n[Step 2/3] Asking AI Curriculum Planner to design the learning path...');
        // To keep the prompt efficient, we only send titles and descriptions
        const lessonSummaries = allJsLessons.map(({ id, title, description }) => ({ id, title, description }));
        let planningPrompt = `
            You are the Head of Curriculum at a world-class coding academy.
            Your task is to design a complete "${curriculumName}" learning path using the provided library of raw JavaScript lessons.
            Group the lessons into 3 to 5 distinct, logically sequenced courses.

            PRINCIPLES:
            - **Progressive Difficulty:** The courses must be ordered from absolute beginner to advanced.
            - **Thematic Cohesion:** Each course should have a clear, focused theme (e.g., "JavaScript Foundations", "DOM Manipulation", "Asynchronous JavaScript").
            - **Comprehensive Coverage:** Use as many lessons as is reasonable. Discard low-quality or redundant ones.

            Here is the library of available lessons with their IDs, titles, and descriptions:
            ${JSON.stringify(lessonSummaries)}

            Respond ONLY with a single, raw JSON object. The root key should be "curriculum_plan", an array of course objects.
            Each course object must have a "suggested_title", a "suggested_description", and a "lesson_ids" array containing the unique IDs of the lessons that belong in that course, in the correct pedagogical order.
        `;

        const planningResult = await model.generateContent(planningPrompt);
        const curriculumPlan = sanitizeAndParseJson(planningResult.response.text()).curriculum_plan;
        
        if (!curriculumPlan || !Array.isArray(curriculumPlan) || curriculumPlan.length === 0) {
            throw new Error("AI failed to generate a valid curriculum plan.");
        }
        console.log(` -> AI has designed a learning path with ${curriculumPlan.length} courses.`);

        // 3. THE BUILDER: Create each course and its lessons in the database
        console.log('\n[Step 3/3] Building and saving the new courses and all their content...');
        for (const course of curriculumPlan) {
            await client.query('BEGIN');
            
            const newCourseResult = await client.query(
                `INSERT INTO courses (title, description, teacher_id, is_published) VALUES ($1, $2, $3, false) RETURNING id`,
                [course.suggested_title, course.suggested_description, TEACHER_ID]
            );
            const courseId = newCourseResult.rows[0].id;
            console.log(`  -> Created Course: "${course.suggested_title}"`);

            for (let i = 0; i < course.lesson_ids.length; i++) {
                const lessonId = course.lesson_ids[i];
                const originalLesson = allJsLessons.find(l => l.id === lessonId);

                if (originalLesson) {
                    const lessonInsertResult = await client.query(
                        `INSERT INTO lessons (title, description, course_id, teacher_id, lesson_type, language, objective, order_index)
                         VALUES ($1, $2, $3, $4, $5, 'javascript', 'AI Objective Pending', $6) RETURNING id`,
                        [
                            originalLesson.title, originalLesson.description, courseId, TEACHER_ID,
                            originalLesson.lesson_type, i
                        ]
                    );
                    const newLessonId = lessonInsertResult.rows[0].id;

                    // Copy the BOILERPLATE files into lesson_files
                    if (originalLesson.files && Array.isArray(originalLesson.files)) {
                        for (const file of originalLesson.files) {
                            await client.query(
                                `INSERT INTO lesson_files (filename, content, lesson_id) VALUES ($1, $2, $3)`,
                                [file.name, file.content, newLessonId]
                            );
                        }
                    }

                    // Copy the SOLUTION files into lesson_solution_files
                    if (originalLesson.solution_files && Array.isArray(originalLesson.solution_files)) {
                        for (const file of originalLesson.solution_files) {
                            await client.query(
                                `INSERT INTO lesson_solution_files (filename, content, lesson_id) VALUES ($1, $2, $3)`,
                                [file.name, file.content, newLessonId]
                            );
                        }
                    }
                    
                    // Copy the TEST code
                    if (originalLesson.test_code) {
                         await client.query(
                             `INSERT INTO lesson_tests (test_code, lesson_id) VALUES ($1, $2)`,
                             [originalLesson.test_code, newLessonId]
                         );
                    }
                }
            }
            await client.query('COMMIT');
            console.log(`     - Added ${course.lesson_ids.length} ordered lessons with full content.`);
        }

        console.log(`\n--- SUCCESS! The "${curriculumName}" curriculum has been generated and saved. ---`);

    } catch (error) {
        await client.query('ROLLBACK').catch(e => console.error("Rollback failed:", e));
        console.error("\n--- FAILED to build curriculum ---");
        console.error(error.message);
    } finally {
        if (client) {
            client.release();
        }
        await db.pool.end();
    }
}

const curriculumName = process.argv[2];
buildCurriculum(curriculumName);