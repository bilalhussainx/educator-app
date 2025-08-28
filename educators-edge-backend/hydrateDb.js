// FILE: hydrateDb.js (Definitive, Corrected for Local Output Folder)
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { pool } = require('./db.js');

// This path is now correct and points to the folder INSIDE your project.
const OUTPUT_DIR = path.join(process.cwd(), 'output');

/**
 * A recursive function to find all files named 'lesson.json' in a directory and its subdirectories.
 */
function findAllLessonFiles(dir) {
    let results = [];
    const list = fs.readdirSync(dir, { withFileTypes: true });
    for (const file of list) {
        const fullPath = path.join(dir, file.name);
        if (file.isDirectory()) {
            results = results.concat(findAllLessonFiles(fullPath));
        } else if (file.name === 'lesson.json') {
            results.push(fullPath);
        }
    }
    return results;
}

function inferLanguage(challenge) {
    const files = challenge.boilerplate || [];
    if (files.some(f => f.language === 'javascript' || f.language === 'js')) return 'javascript';
    if (files.some(f => f.language === 'python' || f.language === 'py')) return 'python';
    if (files.some(f => f.language === 'css')) return 'css';
    if (files.some(f => f.language === 'html')) return 'html';
    if (files.some(f => f.language === 'csharp' || f.language === 'cs')) return 'csharp';
    return 'unknown';
}

function inferLessonType(challenge) {
    const files = challenge.boilerplate || [];
    return files.some(f => f.language === 'html') ? 'frontend-project' : 'algorithmic';
}

async function main() {
    if (!fs.existsSync(OUTPUT_DIR)) {
        console.error(`FATAL ERROR: Output directory not found at the expected path: ${OUTPUT_DIR}`);
        console.error("Please ensure you have copied the 'output' folder from the Python parser into your backend project root directory.");
        return;
    }

    const allLessonFiles = findAllLessonFiles(OUTPUT_DIR);
    if (allLessonFiles.length === 0) {
        console.error("The output directory was found, but it contains no 'lesson.json' files. This is the source of the 'empty' error.");
        console.error("Please re-run the Python parser scripts and copy the generated 'output' folder here again.");
        return;
    }

    console.log(`Found ${allLessonFiles.length} lesson files to process. Populating the content library...`);
    
    const client = await pool.connect();
    let totalChallengesProcessed = 0;

    try {
        await client.query('BEGIN');
        for (const filePath of allLessonFiles) {
            const lessonData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            
            for (const challenge of lessonData.challenges) {
                const language = inferLanguage(challenge);
                if (language === 'unknown') continue;

                const insertQuery = `
                    INSERT INTO ingested_lessons (
                        title, description, files, solution_files, test_code, 
                        section_name, lesson_name, language, source_file, lesson_type
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                    ON CONFLICT (title, language) DO NOTHING;
                `;
                
                await client.query(insertQuery, [
                    challenge.title,
                    `${challenge.description}\n\n${challenge.instructions}`,
                    JSON.stringify(challenge.boilerplate),
                    JSON.stringify(challenge.solution),
                    JSON.stringify(challenge.tests),
                    challenge.section.name,
                    challenge.lesson.name,
                    language,
                    path.relative(OUTPUT_DIR, filePath), // Use a relative path for the source file
                    inferLessonType(challenge)
                ]);
                totalChallengesProcessed++;
            }
        }
        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("A critical error occurred during database hydration:", err);
    } finally {
        client.release();
        await pool.end();
    }
    console.log(`\n--- Lesson Library Hydration Complete ---`);
    console.log(`Successfully processed and inserted ${totalChallengesProcessed} unique challenges.`);
}

main();

// // hydrateDb.js - New purpose: Populate the central lesson library
// const fs = require('fs');
// const path = require('path');
// require('dotenv').config();
// const { query, pool } = require('./db.js'); // Assuming db.js exports pool

// const OUTPUT_DIR = path.join(process.cwd(), 'output');

// // NEW: Gemini-powered classifier function
// async function getLessonTypeFromGemini(lesson) {
//     // This is where you would call your AI classifier from the previous plan
//     // For now, we'll use a simple heuristic based on the files.
//     if (lesson.files && lesson.files.some(f => f.name === 'index.html')) {
//         return 'frontend-project';
//     }
//     return 'algorithmic';
// }

// async function main() {
//   const allFiles = fs.readdirSync(OUTPUT_DIR).filter(f => f.endsWith('.json'));
//   console.log(`Found ${allFiles.length} source files. Populating lesson library...`);

//   const client = await pool.connect();
//   try {
//     for (const fileName of allFiles) {
//       const filePath = path.join(OUTPUT_DIR, fileName);
//       const courseData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

//       for (const lesson of courseData.lessons) {
//         const lessonType = await getLessonTypeFromGemini(lesson);

//         const insertQuery = `
//           INSERT INTO ingested_lessons (title, description, files, test_code, lesson_type, source_file)
//           VALUES ($1, $2, $3, $4, $5, $6)
//           ON CONFLICT (title) DO NOTHING; -- Avoid duplicates if you run it multiple times
//         `;
//         await client.query(insertQuery, [
//           lesson.title,
//           lesson.description,
//           JSON.stringify(lesson.files),
//           lesson.testCode,
//           lessonType,
//           fileName
//         ]);
//       }
//       console.log(`  -> Processed ${courseData.lessons.length} lesson(s) from ${fileName}`);
//     }
//   } catch (err) {
//       console.error("A critical error occurred:", err);
//   } finally {
//       client.release();
//       await pool.end();
//   }
//   console.log('\n--- Lesson Library Hydration Complete ---');
// }

// main();
// import fs from 'fs';
// import path from 'path';
// import 'dotenv/config';
// import { query } from './db.js'; // This import will now work correctly

// // --- Environment Variable Check ---
// if (!process.env.DATABASE_URL) {
//   console.error('ERROR: DATABASE_URL environment variable not found.');
//   console.error('Please make sure you have a .env file with the correct connection string.');
//   process.exit(1);
// }
// // --------------------------------

// const OUTPUT_DIR = path.join(process.cwd(), 'output');
// const FILE_TO_PROCESS = 'build-a-palindrome-checker-project.json';
// const TEACHER_ID = 'eb03e344-252f-42ab-8187-602fc30384fa'; // <--- REMINDER: REPLACE THIS

// async function main() {
//   const client = await query.pool.connect(); // This line was failing but will now succeed

//   try {
//     console.log(`Processing file: ${FILE_TO_PROCESS}`);
//     const filePath = path.join(OUTPUT_DIR, FILE_TO_PROCESS);
//     if (!fs.existsSync(filePath)) {
//       throw new Error(`File not found: ${filePath}`);
//     }

//     const fileContent = fs.readFileSync(filePath, 'utf8');
//     const courseData = JSON.parse(fileContent);

//     await client.query('BEGIN');

//     const courseInsertQuery = `
//     INSERT INTO courses (title, description, teacher_id, is_published)
//     VALUES ($1, $2, $3, false)
//     RETURNING id;
//     `;
//     const courseResult = await client.query(courseInsertQuery, [courseData.title, courseData.description, TEACHER_ID]);

//     const courseId = courseResult.rows[0].id;
//     console.log(`  -> Created course "${courseData.title}" with ID: ${courseId}`);

//     for (const lesson of courseData.lessons) {
//         const lessonType = courseData.challenge_type || 'algorithmic'; // Default to algorithmic

//         const lessonInsertQuery = `
//         INSERT INTO lessons (title, description, course_id, teacher_id, lesson_type)
//         VALUES ($1, $2, $3, $4, $5)
//         RETURNING id;
//     `;
//   // Add TEACHER_ID as the fourth parameter
//   const lessonResult = await client.query(lessonInsertQuery, [lesson.title, lesson.description, courseId, TEACHER_ID, lessonType]);
//   const lessonId = lessonResult.rows[0].id;
//       console.log(`    -> Created lesson "${lesson.title}" with ID: ${lessonId}`);

//       if (lesson.files && lesson.files.length > 0) {
//         for (const file of lesson.files) {
//           const fileInsertQuery = `
//             INSERT INTO lesson_files (filename, content, lesson_id)
//             VALUES ($1, $2, $3);
//           `;
//           await client.query(fileInsertQuery, [file.name, file.content, lessonId]);
//         }
//         console.log(`      -> Inserted ${lesson.files.length} boilerplate file(s).`);
//       }

//       const testInsertQuery = `
//         INSERT INTO lesson_tests (test_code, lesson_id)
//         VALUES ($1, $2);
//       `;
//       await client.query(testInsertQuery, [lesson.testCode, lessonId]);
//       console.log(`      -> Inserted tests.`);
//     }

//     await client.query('COMMIT');
//     console.log('\n--- SUCCESS! ---');
//     console.log('Database hydration for one course complete.');

//   } catch (error) {
//     await client.query('ROLLBACK');
//     console.error('\n--- TRANSACTION FAILED ---');
//     console.error('An error occurred during database hydration:', error.message);
//   } finally {
//     client.release();
//     await query.pool.end();
//   }
// }

// main().catch(err => {
//   console.error("A critical error occurred:", err);
//   process.exit(1);
// });