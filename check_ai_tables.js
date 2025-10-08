require('dotenv').config();
const db = require('./educators-edge-backend/db');

async function checkTables() {
    try {
        const result = await db.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name LIKE 'ai_%'
            ORDER BY table_name
        `);

        console.log('AI-related tables:');
        if (result.rows.length === 0) {
            console.log('❌ NO AI TABLES FOUND!');
        } else {
            result.rows.forEach(row => {
                console.log(`✓ ${row.table_name}`);
            });
        }

        process.exit(0);
    } catch (error) {
        console.error('Error checking tables:', error.message);
        process.exit(1);
    }
}

checkTables();
