// FILE: controllers/libraryController.js
const db = require('../db');

/**
 * Searches the ingested_lessons library for the course editor.
 * This will power the "Discover Lessons" panel for the teacher.
 */
exports.searchIngestedLessons = async (req, res) => {
    try {
        const { language = 'javascript', searchTerm = '' } = req.query;

        // Build the query dynamically
        let query = `
            SELECT id, title, description, lesson_type 
            FROM ingested_lessons 
            WHERE language = $1
        `;
        const queryParams = [language];

        if (searchTerm) {
            query += ' AND (title ILIKE $2 OR description ILIKE $2)';
            queryParams.push(`%${searchTerm}%`);
        }
        query += ' ORDER BY section_name, lesson_name, title LIMIT 100;';

        const lessonsResult = await db.query(query, queryParams);
        res.json(lessonsResult.rows);

    } catch (err) {
        console.error("Error in searchIngestedLessons:", err.message);
        res.status(500).send('Server Error');
    }
};