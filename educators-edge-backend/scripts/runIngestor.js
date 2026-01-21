// runIngestor.js
const fs = require('fs');
const path = require('path');
const { parseMarkdownFile: parseJsFile } = require('./parsers/freeCodeCampParser.js');
const { findAllMarkdownFiles, parsePythonMarkdownFile } = require('./parsers/pythonParser.js');

const BASE_PATH = path.join(process.cwd(), '..', 'freeCodeCamp', 'curriculum', 'challenges', 'english');
const OUTPUT_DIR = path.join(process.cwd(), 'output');

// Define the correct, verified locations of our different curricula
const CURRICULUM_PATHS = {
    javascript: path.join(BASE_PATH, '15-javascript-algorithms-and-data-structures-22'),
    python: path.join(BASE_PATH, '08-data-analysis-with-python')
};

async function main(language) {
    if (!language || !CURRICULUM_PATHS[language]) {
        console.error("Usage: node runIngestor.js <language>");
        console.error("Available languages: javascript, python");
        return;
    }

    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR);
    }

    const curriculumPath = CURRICULUM_PATHS[language];
    if (!fs.existsSync(curriculumPath)) {
        console.error(`Error: The specified curriculum path does not exist: ${curriculumPath}`);
        console.error("Please ensure you have cloned the freeCodeCamp repository correctly.");
        return;
    }

    console.log(`--- Starting Ingestion for: ${language.toUpperCase()} ---`);
    console.log(`Scanning for all .md challenges in: ${curriculumPath}`);

    const allMdFiles = findAllMarkdownFiles(curriculumPath);
    console.log(`Found ${allMdFiles.length} total markdown files. Parsing valid challenges...`);

    const courses = new Map();

    for (const filePath of allMdFiles) {
        // Use the correct parser based on the chosen language
        const lesson = language === 'python'
            ? parsePythonMarkdownFile(filePath)
            : await parseJsFile(filePath);

        if (lesson) {
            const projectName = path.basename(path.dirname(filePath));
            if (!courses.has(projectName)) {
                courses.set(projectName, {
                    title: projectName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                    description: `A project-based course on ${language} imported from freeCodeCamp.`,
                    // This is the crucial upgrade: stamp the course with its language
                    language: language,
                    lessons: []
                });
            }
            courses.get(projectName).lessons.push(lesson);
        }
    }

    console.log(`\n--- PARSING COMPLETE ---`);
    console.log(`Successfully parsed ${courses.size} total projects for ${language}.`);

    for (const [projectName, courseData] of courses.entries()) {
        const outputFileName = `${projectName}.json`;
        const outputPath = path.join(OUTPUT_DIR, outputFileName);
        fs.writeFileSync(outputPath, JSON.stringify(courseData, null, 2));
        console.log(`  -> SUCCESS: Saved ${courseData.lessons.length} lesson(s) to ${outputPath}`);
    }

    console.log('\n--- BATCH INGESTION COMPLETE ---');
}

// Get the language from the command line argument
const languageToIngest = process.argv[2];
main(languageToIngest).catch(err => console.error(err));
// import fs from 'fs';
// import path from 'path';
// import { parseMarkdownFile } from './parsers/freeCodeCampParser.js';

// // The TOP-LEVEL directory to start scanning from. This will find everything.
// const BASE_CHALLENGES_PATH = path.join(process.cwd(), '..', 'freeCodeCamp', 'curriculum', 'challenges', 'english');
// const OUTPUT_DIR = path.join(process.cwd(), 'output');

// /**
//  * Recursively finds all markdown files in a directory.
//  * @param {string} dir - The directory to search.
//  * @returns {string[]} An array of full file paths to markdown files.
//  */
// function findAllMarkdownFiles(dir) {
//     let results = [];
//     const list = fs.readdirSync(dir, { withFileTypes: true });
//     for (const file of list) {
//         const fullPath = path.join(dir, file.name);
//         if (file.isDirectory()) {
//             results = results.concat(findAllMarkdownFiles(fullPath));
//         } else if (path.extname(file.name) === '.md') {
//             results.push(fullPath);
//         }
//     }
//     return results;
// }

// async function main() {
//     if (!fs.existsSync(OUTPUT_DIR)) {
//         fs.mkdirSync(OUTPUT_DIR);
//     }

//     console.log(`--- STARTING COMPREHENSIVE SCAN ---`);
//     console.log(`Scanning for all .md challenges in: ${BASE_CHALLENGES_PATH}`);

//     const allMdFiles = findAllMarkdownFiles(BASE_CHALLENGES_PATH);
//     console.log(`Found ${allMdFiles.length} total markdown files. Parsing valid challenges...`);

//     const courses = new Map();

//     for (const filePath of allMdFiles) {
//         const lesson = await parseMarkdownFile(filePath);

//         // If the parser returns a valid lesson, add it to its course
//         if (lesson) {
//             const projectName = path.basename(path.dirname(filePath)); // e.g., 'build-a-palindrome-checker-project'
//             if (!courses.has(projectName)) {
//                 courses.set(projectName, {
//                     title: projectName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
//                     description: `A project imported from the freeCodeCamp curriculum.`,
//                     lessons: []
//                 });
//             }
//             courses.get(projectName).lessons.push(lesson);
//         }
//     }

//     console.log(`\n--- PARSING COMPLETE ---`);
//     console.log(`Successfully parsed ${courses.size} total projects/courses.`);

//     // Save each course to its own JSON file
//     for (const [projectName, courseData] of courses.entries()) {
//         const outputFileName = `${projectName}.json`;
//         const outputPath = path.join(OUTPUT_DIR, outputFileName);
//         const jsonContent = JSON.stringify(courseData, null, 2);

//         fs.writeFileSync(outputPath, jsonContent);
//         console.log(`  -> SUCCESS: Saved ${courseData.lessons.length} lesson(s) to ${outputPath}`);
//     }

//     console.log('\n--- BATCH INGESTION COMPLETE ---');
// }

// main().catch(err => console.error(err));