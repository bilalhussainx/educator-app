const db = require('./db');

(async () => {
    try {
        // Check if session_mode column exists
        const columnCheck = await db.query(`
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'sessions' AND column_name = 'session_mode'
        `);

        console.log('=== SESSION_MODE COLUMN CHECK ===');
        if (columnCheck.rows.length > 0) {
            console.log('✅ session_mode column EXISTS');
            console.log('Details:', columnCheck.rows[0]);
        } else {
            console.log('❌ session_mode column DOES NOT EXIST');
            console.log('\nTo add it, run:');
            console.log('psql $DATABASE_URL -f add_session_mode_column.sql');
        }

        // Check recent sessions
        const sessions = await db.query(`
            SELECT id, session_type, session_mode, status, started_at
            FROM sessions
            ORDER BY created_at DESC
            LIMIT 10
        `);

        console.log('\n=== RECENT SESSIONS ===');
        if (sessions.rows.length > 0) {
            sessions.rows.forEach(s => {
                console.log(`ID: ${s.id}, Type: ${s.session_type}, Mode: ${s.session_mode || 'NULL'}, Status: ${s.status}`);
            });
        } else {
            console.log('No sessions found');
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
})();
