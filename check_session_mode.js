const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function checkSessionMode() {
    try {
        // Check if session_mode column exists
        const columnCheck = await pool.query(`
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'sessions' AND column_name = 'session_mode'
        `);

        console.log('=== SESSION_MODE COLUMN CHECK ===');
        if (columnCheck.rows.length > 0) {
            console.log('✅ session_mode column EXISTS');
            console.log('Column details:', columnCheck.rows[0]);
        } else {
            console.log('❌ session_mode column DOES NOT EXIST');
            console.log('Need to run migration: educators-edge-backend/add_session_mode_column.sql');
        }

        // Check recent sessions and their session_mode values
        const recentSessions = await pool.query(`
            SELECT id, session_type, session_mode, status, started_at, created_at
            FROM sessions
            ORDER BY created_at DESC
            LIMIT 10
        `);

        console.log('\n=== RECENT SESSIONS ===');
        if (recentSessions.rows.length > 0) {
            recentSessions.rows.forEach(session => {
                console.log(`ID: ${session.id}`);
                console.log(`  Type: ${session.session_type}`);
                console.log(`  Mode: ${session.session_mode || 'NULL'}`);
                console.log(`  Status: ${session.status}`);
                console.log(`  Started: ${session.started_at || 'Not started'}`);
                console.log('---');
            });
        } else {
            console.log('No sessions found in database');
        }

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await pool.end();
    }
}

checkSessionMode();
