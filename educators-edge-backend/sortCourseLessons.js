require('dotenv').config();
const db = require('./src/db');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// --- Gemini AI Configuration ---
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

function sanitizeAndParseJson(rawText) {
    const arrayStart = rawText.indexOf('[');
    const arrayEnd = rawText.lastIndexOf(']');
    if (arrayStart !== -1 && arrayEnd !== -1) {
        const jsonText = rawText.substring(arrayStart, arrayEnd + 1);
        return JSON.parse(jsonText);
    }
    throw new Error("No valid JSON array found in the AI response.");
}

/**
 * The main function to sort lessons within a course using AI.
 * @param {string} courseId - The UUID of the course to sort.
 */
async function sortCourse(courseId) {
    if (!courseId) {
        console.error("ERROR: A course ID must be provided.");
        console.log("Usage: node sortCourseLessons.js <course-id>");
        return;
    }
    console.log(`--- Starting AI Curriculum Sorter for Course ID: ${courseId} ---`);

    const client = await db.pool.connect();
    try {
        // 1. Fetch all lessons for the given course
        console.log(`[Step 1/3] Fetching all lessons from the database...`);
        const lessonsResult = await client.query(
            'SELECT id, title, description FROM lessons WHERE course_id = $1',
            [courseId]
        );
        const lessons = lessonsResult.rows;

        if (lessons.length < 2) {
            throw new Error("Course has fewer than 2 lessons. No sorting needed.");
        }
        console.log(` -> Found ${lessons.length} lessons to sort.`);

        // 2. Ask Gemini for the precise order
        console.log(`\n[Step 2/3] Asking Gemini to determine the optimal lesson order...`);
        const prompt = `
            You are an expert computer science curriculum designer with a PhD in pedagogy.
            Your task is to re-order the following list of lessons for a course to create the most effective and logical learning path, from easiest to most difficult.

            CRITICAL PRINCIPLES FOR ORDERING:
            1.  **Foundations First:** Lessons covering fundamental concepts, basic syntax, or definitions MUST come before lessons that apply them.
            2.  **Build Sequentially:** Each lesson should ideally build upon knowledge from the previous ones.
            3.  **Simple to Complex:** Simple, single-concept lessons should come before complex, multi-concept projects.
            4.  **No Gaps:** Ensure the flow is smooth and logical.

            Here is the list of lessons to sort, each with its unique ID, title, and description:
            ${JSON.stringify(lessons, null, 2)}

            Your response MUST be ONLY a single, raw JSON array of the lesson IDs, in the new, correct order.
            Example Response: ["uuid-for-easiest-lesson", "uuid-for-next-lesson", "uuid-for-hardest-lesson"]
        `;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        const sortedIds = sanitizeAndParseJson(responseText);

        if (!Array.isArray(sortedIds) || sortedIds.length !== lessons.length) {
            throw new Error(`AI returned an invalid or incomplete list of sorted IDs. AI Response: ${responseText}`);
        }
        console.log(` -> AI has successfully determined the new lesson order.`);

        // 3. Update the database with the new order
        console.log(`\n[Step 3/3] Updating the database with the new order...`);
        await client.query('BEGIN');

        const updatePromises = sortedIds.map((lessonId, index) => {
            return client.query(
                'UPDATE lessons SET order_index = $1 WHERE id = $2',
                [index, lessonId] // The index in the array is the new order_index
            );
        });

        await Promise.all(updatePromises);
        await client.query('COMMIT');
        console.log(` -> Successfully updated the order for ${sortedIds.length} lessons.`);

        console.log(`\n--- SUCCESS! The course has been re-organized with AI precision. ---`);

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("\n--- FAILED to sort course ---");
        console.error(error.message);
    } finally {
        client.release();
        await db.pool.end();
    }
}

const courseId = process.argv[2];
sortCourse(courseId);