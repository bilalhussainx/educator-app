require('dotenv').config();
const fs = require('fs');
const { Pool } = require('pg');

// Create database connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('ssl=true') ? { rejectUnauthorized: false } : false
});

async function setupSchema() {
    try {
        console.log('🚀 Setting up submissions tracking schema...');

        // Read the SQL file
        const schemaSQL = fs.readFileSync('./create_submissions_tracking_schema.sql', 'utf8');

        // Execute the schema
        await pool.query(schemaSQL);

        console.log('✅ Submissions tracking schema created successfully!');

        // Verify tables were created
        const result = await pool.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name IN ('user_submissions', 'user_progress', 'problem_metadata')
            ORDER BY table_name;
        `);

        console.log('📊 Created tables:', result.rows.map(row => row.table_name));

    } catch (error) {
        console.error('❌ Error setting up schema:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

setupSchema();