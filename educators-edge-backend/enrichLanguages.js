// enrichLanguages.js (Definitive, Bulletproof Version)
require('dotenv').config();
const db = require('./db');

function inferLanguage(lesson) {
    if (lesson.lesson_type === 'frontend-project') return 'javascript';

    // Guard Clause 1: Ensure 'files' is a non-empty array.
    if (!lesson.files || !Array.isArray(lesson.files) || lesson.files.length === 0) {
        return 'unknown';
    }

    // --- THIS IS THE DEFINITIVE FIX ---
    // Guard Clause 2: Ensure that we only process valid file objects that have a 'filename' property.
    // This will filter out any null, undefined, or malformed entries inside the array.
    const fileNames = lesson.files
        .filter(file => file && typeof file.filename === 'string') // Keep only valid file objects
        .map(file => file.filename.toLowerCase()); // Now this map is guaranteed to be safe
    // --- END OF FIX ---
    
    if (fileNames.length === 0) {
        return 'unknown'; // The array might have contained only invalid entries
    }
    
    if (fileNames.some(f => f.endsWith('.js'))) return 'javascript';
    if (fileNames.some(f => f.endsWith('.py'))) return 'python';
    if (fileNames.some(f => f.endsWith('.css'))) return 'css';
    if (fileNames.some(f => f.endsWith('.html'))) return 'html';
    
    return 'unknown';
}

async function main() {
    console.log('--- Starting Language Enrichment for Lesson Library ---');
    const client = await db.pool.connect();
    try {
        const { rows: lessons } = await client.query(
            'SELECT id, files::json, lesson_type FROM ingested_lessons WHERE language IS NULL'
        );

        if (lessons.length === 0) {
            console.log('No lessons to update. All lessons already have a language.');
            return;
        }

        console.log(`Found ${lessons.length} lessons to enrich with language data...`);
        let updatedCount = 0;

        for (const lesson of lessons) {
            const language = inferLanguage(lesson);
            if (language !== 'unknown') {
                await client.query(
                    'UPDATE ingested_lessons SET language = $1 WHERE id = $2',
                    [language, lesson.id]
                );
                updatedCount++;
            }
        }
        console.log(`\nSuccessfully updated ${updatedCount} lessons with a language.`);

    } catch (error) {
        console.error('An error occurred during language enrichment:', error);
    } finally {
        client.release();
        await db.pool.end();
    }
    console.log('--- Enrichment Complete ---');
}

main();