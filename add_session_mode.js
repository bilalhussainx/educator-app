const db = require('./educators-edge-backend/db');

async function addSessionModeColumn() {
    try {
        console.log('Adding session_mode column to sessions table...');

        await db.query(`
            ALTER TABLE sessions
            ADD COLUMN IF NOT EXISTS session_mode VARCHAR(20) CHECK (session_mode IN ('code', 'essay'))
        `);

        console.log('✅ Column added successfully');

        await db.query(`
            CREATE INDEX IF NOT EXISTS idx_sessions_mode ON sessions(session_mode)
        `);

        console.log('✅ Index created successfully');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

addSessionModeColumn();
