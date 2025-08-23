// src/controllers/conceptController.js
const db = require('../db');

// Search for existing concepts based on a query string
exports.searchConcepts = async (req, res) => {
    const { query } = req.query;
    try {
        const result = await db.query(
            "SELECT id, name, category FROM concepts WHERE name ILIKE $1 ORDER BY name LIMIT 10",
            [`%${query}%`]
        );
        res.json(result.rows);
    } catch (err) {
        console.error("Error in searchConcepts:", err.message);
        res.status(500).json({ error: 'Server Error' });
    }
};

// src/controllers/conceptController.js

// ... (keep your searchConcepts function as is) ...

// --- CORRECTED: Create a new concept if it doesn't already exist ---
exports.createConcept = async (req, res) => {
    const { name, category = 'General' } = req.body; // Default category is 'General'
    if (!name) {
        return res.status(400).json({ error: 'Concept name is required.' });
    }
    try {
        const result = await db.query(
            // This query uses ON CONFLICT to be robust. If the concept name already exists,
            // it does nothing but still returns the existing concept's data.
            "INSERT INTO concepts (name, category) VALUES ($1, $2) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id, name, category",
            
            // --- KEY FIX: Provide BOTH the name and the category to the query ---
            [name.trim(), category]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error("Error in createConcept:", err.message);
        res.status(500).json({ error: 'Server Error' });
    }
};