// createAiCourse.js
require('dotenv').config();
const db = require('./db');
const { selectLessons, generateCourseStructure } = require('./services/aiCourseGenerator.js');

// IMPORTANT: Replace this with a valid teacher ID from your 'users' table.
const TEACHER_ID = 'eb03e344-252f-42ab-8187-602fc30384fa';

/**
 * Infers the primary programming language from a course topic string.
 * @param {string} topic - The topic for the course (e.g., "JavaScript Arrays").
 * @returns {string|null} The inferred language in lowercase (e.g., 'javascript') or null.
 */
function inferLanguageFromTopic(topic) {
    const lowerTopic = topic.toLowerCase();
    if (lowerTopic.includes('javascript') || lowerTopic.includes('js')) return 'javascript';
    if (lowerTopic.includes('python')) return 'python';
    if (lowerTopic.includes('css')) return 'css';
    if (lowerTopic.includes('html')) return 'html';
    return null; // Return null if no language is obvious
}

function inferLanguageFromTopic(topic) {
    const lowerTopic = topic.toLowerCase();
    if (lowerTopic.includes('javascript') || lowerTopic.includes('js')) return 'javascript';
    if (lowerTopic.includes('python')) return 'python';
    if (lowerTopic.includes('css')) return 'css';
    if (lowerTopic.includes('html')) return 'html';
    return null;
}

/**
 * The main orchestrator function for generating an AI-powered course.
 */
async function createCourse(initialTopic, lessonCount) {
    if (!initialTopic || !lessonCount) {
        console.error("Usage: node createAiCourse.js \"<Topic Name>\" <Number of Lessons>");
        process.exit(1);
    }
    console.log(`--- Starting AI Course Generation for: "${initialTopic}" ---`);

    const client = await db.pool.connect();
    try {
        let currentTopic = initialTopic;
        let chosenLessonsInfo = [];
        let candidateLessons = [];

        // --- FIX #1: THE AI QUALITY FIX (Fallback Strategy) ---
        // We will try the specific topic first. If it fails, we broaden the search.
        for (let attempt = 1; attempt <= 2; attempt++) {
            console.log(`\n[Attempt ${attempt}] Searching for lessons related to "${currentTopic}"...`);
            
            const language = inferLanguageFromTopic(currentTopic);
            if (!language) throw new Error(`Could not determine language from topic "${currentTopic}".`);
            console.log(` -> Inferred language: ${language}`);

            const searchKeyword = currentTopic.split(' ')[1] || currentTopic.split(' ')[0];
            const candidateResult = await client.query(
                `SELECT id, title, description, files, test_code, lesson_type, language FROM ingested_lessons
                 WHERE (title ILIKE $1 OR description ILIKE $1) AND language = $2 LIMIT 100`,
                [`%${searchKeyword}%`, language]
            );
            candidateLessons = candidateResult.rows;
            console.log(` -> Found ${candidateLessons.length} candidate lessons.`);

            if (candidateLessons.length > 0) {
                console.log(` -> Asking AI Scout to select the best ${lessonCount} lessons...`);
                chosenLessonsInfo = await selectLessons(currentTopic, lessonCount, candidateLessons);
            }

            // If the AI found enough lessons, break the loop and proceed.
            if (chosenLessonsInfo.length >= lessonCount) {
                console.log(` -> Scout successful on attempt ${attempt}. Proceeding to Architect.`);
                break;
            }

            // If we are on the first attempt and it failed, broaden the topic.
            if (attempt === 1) {
                console.log(` -> Scout returned too few lessons (${chosenLessonsInfo.length}). Broadening topic...`);
                currentTopic = `Introduction to ${language}`; // Fallback to a broader topic
            }
        }

        if (chosenLessonsInfo.length === 0) {
            throw new Error(`The AI Scout failed even with a broader topic. Check the quality of ingested lessons for this language.`);
        }
        
        const candidateMap = new Map(candidateLessons.map(l => [l.id, l]));
        const chosenLessonIds = chosenLessonsInfo.map(info => info.id);
        const chosenLessons = chosenLessonIds.map(id => candidateMap.get(id)).filter(Boolean);

        console.log(`\n[Step 3/4] Asking AI Architect to generate the course structure...`);
        const courseStructure = await generateCourseStructure(currentTopic, chosenLessons);

        console.log(`\n[Step 4/4] Saving the new course to the database...`);
        await client.query('BEGIN');

        const courseInsertResult = await client.query(
            `INSERT INTO courses (title, description, teacher_id, is_published) VALUES ($1, $2, $3, false) RETURNING id`,
            [courseStructure.course_title, courseStructure.course_description, TEACHER_ID]
        );
        const courseId = courseInsertResult.rows[0].id;
        console.log(` -> Created course "${courseStructure.course_title}" with ID: ${courseId}`);

        let insertedLessonsCount = 0;
        for (const lessonInfo of courseStructure.lesson_sequence) {
            const originalLesson = chosenLessons.find(l => l.id === lessonInfo.id);
            if (originalLesson) {
                const lessonInsertResult = await client.query(
                    `INSERT INTO lessons (title, description, course_id, teacher_id, lesson_type, objective, language)
                     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
                    [
                        originalLesson.title, originalLesson.description, courseId,
                        TEACHER_ID, originalLesson.lesson_type,
                        lessonInfo.ai_generated_objective, originalLesson.language
                    ]
                );
                const newLessonId = lessonInsertResult.rows[0].id;

                if (originalLesson.files && Array.isArray(originalLesson.files)) {
                    for (const file of originalLesson.files) {
                        // --- FIX #2: THE DATA INTEGRITY FIX ---
                        // Use file.name, which is what our parser actually creates.
                        await client.query(
                            `INSERT INTO lesson_files (filename, content, lesson_id) VALUES ($1, $2, $3)`,
                            [file.name, file.content, newLessonId]
                        );
                    }
                }

                if (originalLesson.test_code) {
                    await client.query(
                        `INSERT INTO lesson_tests (test_code, lesson_id) VALUES ($1, $2)`,
                        [originalLesson.test_code, newLessonId]
                    );
                }
                insertedLessonsCount++;
            }
        }
        
        console.log(` -> Inserted ${insertedLessonsCount} complete lessons into the new course.`);
        await client.query('COMMIT');
        console.log(`\n--- SUCCESS! AI course created and saved. ---`);

    } catch (error) {
        if (client) await client.query('ROLLBACK').catch(e => console.error("Rollback failed:", e));
        console.error("\n--- FAILED to create AI course ---");
        console.error(error.message);
    } finally {
        if (client) client.release();
        await db.pool.end();
    }
}

const topic = process.argv[2];
const lessonCount = parseInt(process.argv[3], 10);
createCourse(topic, lessonCount);

// /**
//  * Infers the primary programming language from a course topic string.
//  * @param {string} topic - The topic for the course (e.g., "JavaScript Arrays").
//  * @returns {string|null} The inferred language in lowercase (e.g., 'javascript') or null.
//  */
// function inferLanguageFromTopic(topic) {
//     const lowerTopic = topic.toLowerCase();
//     if (lowerTopic.includes('javascript') || lowerTopic.includes('js')) return 'javascript';
//     if (lowerTopic.includes('python')) return 'python';
//     if (lowerTopic.includes('css')) return 'css';
//     if (lowerTopic.includes('html')) return 'html';
//     return null; // Return null if no language is obvious
// }

// /**
//  * The main orchestrator function for generating an AI-powered course.
//  * @param {string} topic - The topic for the course.
//  * @param {number} lessonCount - The number of lessons to include.
//  */
// // async function createCourse(topic, lessonCount) {
// //     if (!topic || !lessonCount) {
// //         console.error("Usage: node createAiCourse.js \"<Topic Name>\" <Number of Lessons>");
// //         process.exit(1);
// //     }
// //     console.log(`--- Starting AI Course Generation for: "${topic}" ---`);

// //     const client = await db.pool.connect();
// //     try {
// //         // STEP 1: PRE-FILTERING - Find relevant candidates from the database
// //         console.log(`[Step 1/4] Searching for candidate lessons...`);
// //         const language = inferLanguageFromTopic(topic);
// //         if (!language) {
// //             throw new Error(`Could not determine the programming language from the topic "${topic}". Please be more specific (e.g., "JavaScript Arrays").`);
// //         }
// //         console.log(` -> Inferred language: ${language}`);
        
// //         const searchKeyword = topic.split(' ')[1] || topic.split(' ')[0];
// //         const candidateResult = await client.query(
// //             `SELECT id, title, description, files, test_code, lesson_type FROM ingested_lessons
// //              WHERE (title ILIKE $1 OR description ILIKE $1) AND language = $2
// //              LIMIT 100`,
// //             [`%${searchKeyword}%`, language]
// //         );
// //         const candidateLessons = candidateResult.rows;

// //         if (candidateLessons.length < lessonCount) {
// //             throw new Error(`Not enough candidate lessons found (${candidateLessons.length}) for topic "${topic}" in language "${language}".`);
// //         }
// //         console.log(` -> Found ${candidateLessons.length} relevant candidate lessons.`);

// //         // STEP 2: AI SCOUT - Select and order the best lessons
// //         console.log(`\n[Step 2/4] Asking AI Scout to select the best ${lessonCount} lessons...`);
// //         const chosenTitles = await selectLessons(topic, lessonCount, candidateLessons);
        
// //         const candidateMap = new Map(candidateLessons.map(l => [l.title, l]));
// //         const chosenLessons = chosenTitles.map(title => candidateMap.get(title)).filter(Boolean);

// //         // STEP 3: AI ARCHITECT - Generate the course narrative and objectives
// //         console.log(`\n[Step 3/4] Asking AI Architect to generate the course structure...`);
// //         const courseStructure = await generateCourseStructure(topic, chosenLessons);

// //         // STEP 4: DATABASE INSERTION - Save the complete course in a transaction
// //         console.log(`\n[Step 4/4] Saving the new course to the database...`);
// //         await client.query('BEGIN');

// //         const courseInsertResult = await client.query(
// //             `INSERT INTO courses (title, description, teacher_id, is_published) VALUES ($1, $2, $3, false) RETURNING id`,
// //             [courseStructure.course_title, courseStructure.course_description, TEACHER_ID]
// //         );
// //         const courseId = courseInsertResult.rows[0].id;
// //         console.log(` -> Created course "${courseStructure.course_title}" with ID: ${courseId}`);

// //         for (const lessonInfo of courseStructure.lesson_sequence) {
// //             const originalLesson = chosenLessons.find(l => l.title === lessonInfo.lesson_title);
// //             if (originalLesson) {
// //                 const lessonInsertResult = await client.query(
// //                     `INSERT INTO lessons (title, description, course_id, teacher_id, lesson_type, objective, language)
// //                      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
// //                     [
// //                         originalLesson.title,
// //                         originalLesson.description,
// //                         courseId,
// //                         TEACHER_ID,
// //                         originalLesson.lesson_type,
// //                         lessonInfo.ai_generated_objective,
// //                         language
// //                     ]
// //                 );
// //                 const newLessonId = lessonInsertResult.rows[0].id;

// //                 // Copy over the boilerplate files
// //                 if (originalLesson.files && Array.isArray(originalLesson.files)) {
// //                     for (const file of originalLesson.files) {
// //                         await client.query(
// //                             `INSERT INTO lesson_files (filename, content, lesson_id) VALUES ($1, $2, $3)`,
// //                             [file.filename, file.content, newLessonId]
// //                         );
// //                     }
// //                 }

// //                 // Copy over the test code
// //                 if (originalLesson.test_code) {
// //                     await client.query(
// //                         `INSERT INTO lesson_tests (test_code, lesson_id) VALUES ($1, $2)`,
// //                         [originalLesson.test_code, newLessonId]
// //                     );
// //                 }
// //             }
// //         }
// //         console.log(` -> Inserted ${courseStructure.lesson_sequence.length} complete lessons into the new course.`);

// //         await client.query('COMMIT');
// //         console.log(`\n--- SUCCESS! AI course created and saved. ---`);

// //     } catch (error) {
// //         await client.query('ROLLBACK');
// //         console.error("\n--- FAILED to create AI course ---");
// //         console.error(error.message);
// //     } finally {
// //         client.release();
// //         await db.pool.end();
// //     }
// // }
// async function createCourse(topic, lessonCount) {
//     if (!topic || !lessonCount) {
//         console.error("Usage: node createAiCourse.js \"<Topic Name>\" <Number of Lessons>");
//         process.exit(1);
//     }
//     console.log(`--- Starting AI Course Generation for: "${topic}" ---`);

//     const client = await db.pool.connect();
//     try {
//         // STEP 1: PRE-FILTERING (No changes needed here)
//         console.log(`[Step 1/4] Searching for candidate lessons...`);
//         const language = inferLanguageFromTopic(topic);
//         if (!language) {
//             throw new Error(`Could not determine the programming language from the topic "${topic}".`);
//         }
//         console.log(` -> Inferred language: ${language}`);
        
//         const searchKeyword = topic.split(' ')[1] || topic.split(' ')[0];
//         const candidateResult = await client.query(
//             `SELECT id, title, description, files, test_code, lesson_type, language FROM ingested_lessons
//              WHERE (title ILIKE $1 OR description ILIKE $1) AND language = $2
//              LIMIT 100`,
//             [`%${searchKeyword}%`, language]
//         );
//         const candidateLessons = candidateResult.rows;

//         if (candidateLessons.length === 0) {
//             // New check for zero candidates
//             throw new Error(`No candidate lessons found for topic "${topic}" and language "${language}". Please try a different topic.`);
//         }
//         console.log(` -> Found ${candidateLessons.length} relevant candidate lessons.`);

//         // STEP 2: AI SCOUT (No changes needed here)
//         console.log(`\n[Step 2/4] Asking AI Scout to select the best ${lessonCount} lessons...`);
//         const chosenTitles = await selectLessons(topic, lessonCount, candidateLessons);
        
//         // --- THIS IS THE CRITICAL FIX ---
//         // "FAIL-FAST" LOGIC: If the AI returns no lessons, stop immediately.
//         if (!chosenTitles || chosenTitles.length === 0) {
//             throw new Error(`The AI Scout reviewed ${candidateLessons.length} candidates but could not form a quality course. Try a different topic or check the quality of ingested lessons.`);
//         }
//         // --- END OF FIX ---

//         const candidateMap = new Map(candidateLessons.map(l => [l.title, l]));
//         const chosenLessons = chosenTitles.map(title => candidateMap.get(title)).filter(Boolean);

//         // STEP 3: AI ARCHITECT (No changes needed here)
//         console.log(`\n[Step 3/4] Asking AI Architect to generate the course structure...`);
//         const courseStructure = await generateCourseStructure(topic, chosenLessons);

//         // STEP 4: DATABASE INSERTION (Logging fixed)
//         console.log(`\n[Step 4/4] Saving the new course to the database...`);
//         await client.query('BEGIN');

//         const courseInsertResult = await client.query(
//             `INSERT INTO courses (title, description, teacher_id, is_published) VALUES ($1, $2, $3, false) RETURNING id`,
//             [courseStructure.course_title, courseStructure.course_description, TEACHER_ID]
//         );
//         const courseId = courseInsertResult.rows[0].id;
//         console.log(` -> Created course "${courseStructure.course_title}" with ID: ${courseId}`);

//         let insertedLessonsCount = 0;
//         for (const lessonInfo of courseStructure.lesson_sequence) {
//             const originalLesson = chosenLessons.find(l => l.title === lessonInfo.lesson_title);
//             if (originalLesson) {
//                 // ... (database insertion logic is the same)
//                 insertedLessonsCount++; // Increment our counter
//             }
//         }
        
//         // --- LOGGING FIX ---
//         // The log message now reports the ACTUAL number of inserted lessons.
//         console.log(` -> Inserted ${insertedLessonsCount} complete lessons into the new course.`);
//         // --- END OF FIX ---

//         await client.query('COMMIT');
//         console.log(`\n--- SUCCESS! AI course created and saved. ---`);

//     } catch (error) {
//         // Rollback is not strictly needed if BEGIN failed, but it's safe to have.
//         if (client) await client.query('ROLLBACK').catch(e => console.error("Rollback failed:", e));
//         console.error("\n--- FAILED to create AI course ---");
//         console.error(error.message);
//     } finally {
//         if (client) {
//             client.release();
//         }
//         await db.pool.end();
//     }
// }

// // Get topic and count from command line arguments
// const topic = process.argv[2];
// const lessonCount = parseInt(process.argv[3], 10);

// createCourse(topic, lessonCount);

// // createAiCourse.js
// require('dotenv').config();
// const db = require('./db');
// const { selectLessons, generateCourseStructure } = require('./services/aiCourseGenerator.js');

// const TEACHER_ID = 'eb03e344-252f-42ab-8187-602fc30384fa'; // <--- IMPORTANT: REPLACE THIS

// /**
//  * The main orchestrator function for generating an AI-powered course.
//  * @param {string} topic - The topic for the course.
//  * @param {number} lessonCount - The number of lessons to include.
//  */
// async function createCourse(topic, lessonCount) {
//     if (!topic || !lessonCount) {
//         console.error("Usage: node createAiCourse.js \"<Topic Name>\" <Number of Lessons>");
//         return;
//     }
//     console.log(`--- Starting AI Course Generation for: "${topic}" ---`);

//     const client = await db.pool.connect();
//     try {
//         // 1. Keyword Search for Candidate Lessons (from our library)
//         console.log(`[Step 1/4] Searching for candidate lessons in the local database...`);
//         const searchKeyword = topic.split(' ')[1] || topic.split(' ')[0]; // Use a keyword from the topic
//         const candidateResult = await client.query(
//             `SELECT id, title, description, files, test_code, lesson_type FROM ingested_lessons
//              WHERE title ILIKE $1 OR description ILIKE $1 LIMIT 100`,
//             [`%${searchKeyword}%`]
//         );
//         const candidateLessons = candidateResult.rows;
//         if (candidateLessons.length < lessonCount) {
//             throw new Error(`Not enough candidate lessons found (${candidateLessons.length}) for topic "${topic}". Try a broader topic.`);
//         }
//         console.log(` -> Found ${candidateLessons.length} candidate lessons.`);

//         // 2. Use Gemini "Scout" to select the best lessons
//         console.log(`[Step 2/4] Asking AI Scout to select the best ${lessonCount} lessons...`);
//         const chosenTitles = await selectLessons(topic, lessonCount, candidateLessons);
        
//         // Create a map for quick lookup of full lesson data by title
//         const candidateMap = new Map(candidateLessons.map(l => [l.title, l]));
//         const chosenLessons = chosenTitles.map(title => candidateMap.get(title)).filter(Boolean); // .filter(Boolean) removes any nulls

//         // 3. Use Gemini "Architect" to build the course narrative
//         console.log(`[Step 3/4] Asking AI Architect to generate the course structure...`);
//         const courseStructure = await generateCourseStructure(topic, chosenLessons);

//         // 4. Save the new course to the main database tables
//         console.log(`[Step 4/4] Saving the new course to the database...`);
//         await client.query('BEGIN'); // Start transaction

//         // Insert the main course
//         const courseInsertResult = await client.query(
//             `INSERT INTO courses (title, description, teacher_id, is_published) VALUES ($1, $2, $3, false) RETURNING id`,
//             [courseStructure.course_title, courseStructure.course_description, TEACHER_ID]
//         );
//         const courseId = courseInsertResult.rows[0].id;
//         console.log(` -> Created course "${courseStructure.course_title}" with ID: ${courseId}`);

//         // Insert the lessons in the order Gemini specified
//         for (const lessonInfo of courseStructure.lesson_sequence) {
//             const originalLesson = chosenLessons.find(l => l.title === lessonInfo.lesson_title);
//             if (originalLesson) {
//                 await client.query(
//                     `INSERT INTO lessons (title, description, course_id, teacher_id, lesson_type, objective)
//                      VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
//                     [
//                         originalLesson.title,
//                         originalLesson.description,
//                         courseId,
//                         TEACHER_ID,
//                         originalLesson.lesson_type,
//                         lessonInfo.ai_generated_objective
//                     ]
//                 );
//                 // In a full implementation, you'd also copy files and tests here.
//             }
//         }
//         console.log(` -> Inserted ${courseStructure.lesson_sequence.length} lessons into the new course.`);

//         await client.query('COMMIT'); // Commit transaction
//         console.log(`\n--- SUCCESS! AI course created and saved. ---`);

//     } catch (error) {
//         await client.query('ROLLBACK');
//         console.error("\n--- FAILED to create AI course ---");
//         console.error(error.message);
//     } finally {
//         client.release();
//         await db.pool.end();
//     }
// }

// // Get topic and count from command line arguments
// const topic = process.argv[2];
// const lessonCount = parseInt(process.argv[3], 10);

// createCourse(topic, lessonCount);