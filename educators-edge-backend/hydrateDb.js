// hydrateDb.js
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { query, pool } = require('./db.js'); // Assuming db.js exports pool

const OUTPUT_DIR = path.join(process.cwd(), 'output');

/**
 * The main function to populate the central lesson library from the JSON files.
 */
async function main() {
  const allFiles = fs.readdirSync(OUTPUT_DIR).filter(f => f.endsWith('.json'));
  if (allFiles.length === 0) {
      console.log("Output directory is empty. Run 'node runIngestor.js <language>' first.");
      return;
  }

  console.log(`Found ${allFiles.length} source files. Populating lesson library...`);

  const client = await pool.connect();
  try {
    for (const fileName of allFiles) {
      const filePath = path.join(OUTPUT_DIR, fileName);
      const courseData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      // Get the language directly from the JSON file, which was stamped by the ingestor.
      const language = courseData.language || 'unknown';

      if (courseData.lessons && Array.isArray(courseData.lessons)) {
        for (const lesson of courseData.lessons) {
          // This query uses the composite key (title, language) for conflict resolution.
          // This is the key to allowing lessons with the same title but different languages.
          const insertQuery = `
            INSERT INTO ingested_lessons (
              title,
              description,
              files,
              test_code,
              lesson_type,
              source_file,
              language
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (title, language) DO NOTHING;
          `;

          // Infer lesson_type for insertion if it doesn't exist on the lesson object
          const lessonType = (lesson.files && lesson.files.some(f => f.name === 'index.html'))
            ? 'frontend-project'
            : 'algorithmic';
          
          await client.query(insertQuery, [
            lesson.title,
            lesson.description,
            JSON.stringify(lesson.files),
            lesson.testCode,
            lessonType,
            fileName,
            language
          ]);
        }
        console.log(`  -> Processed ${courseData.lessons.length} lesson(s) from ${fileName}`);
      }
    }
  } catch (err) {
      console.error("A critical error occurred during database hydration:", err);
  } finally {
      client.release();
      await pool.end();
  }
  console.log('\n--- Lesson Library Hydration Complete ---');
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