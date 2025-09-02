// Migration script to fix recorded_sessions.course_id type mismatch
const db = require('./db');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    try {
        console.log('🔄 Running migration to fix recorded_sessions.course_id type...');
        
        // Read the migration SQL file
        const migrationPath = path.join(__dirname, 'migrations', 'fix_recorded_sessions_course_id.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        // Execute the migration
        await db.query(migrationSQL);
        
        console.log('✅ Migration completed successfully!');
        console.log('📝 Changes made:');
        console.log('   - Changed recorded_sessions.course_id from UUID to INTEGER');
        console.log('   - Added foreign key constraint to courses table');
        console.log('   - Updated column comments');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error('Full error:', error);
        process.exit(1);
    }
}

// Run the migration
runMigration();