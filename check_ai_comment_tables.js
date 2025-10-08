const pool = require('./educators-edge-backend/db');

async function checkTables() {
    try {
        const result = await pool.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name LIKE 'ai_%'
            ORDER BY table_name;
        `);

        console.log('AI Comment System Tables:');
        console.log('========================');

        if (result.rows.length === 0) {
            console.log('❌ No AI comment tables found!');
            console.log('\nYou need to run the schema:');
            console.log('psql -U postgres -d educators_db -f educators-edge-backend/db/create_ai_comment_system_schema.sql');
        } else {
            console.log('✅ Found the following tables:');
            result.rows.forEach(row => {
                console.log(`  - ${row.table_name}`);
            });
        }

        await pool.end();
    } catch (error) {
        console.error('Error checking tables:', error.message);
        process.exit(1);
    }
}

checkTables();
