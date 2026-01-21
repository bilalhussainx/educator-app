// Migration script to add recording_type column to recorded_sessions table
const db = require('./db');
const fs = require('fs');
const path = require('path');

async function runRecordingTypeMigration() {
    try {
        console.log('🔄 Running migration to add recording_type column...');
        
        // Read the migration SQL file
        const migrationPath = path.join(__dirname, 'migrations', 'add_recording_type.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        // Execute the migration
        await db.query(migrationSQL);
        
        console.log('✅ Migration completed successfully!');
        console.log('📝 Changes made:');
        console.log('   - Added recording_type column to recorded_sessions table');
        console.log('   - Set default value to "video" for existing records');
        console.log('   - Added check constraint for valid recording types');
        console.log('   - Created index for faster querying');
        console.log('   - Added column comment for documentation');
        
        // Verify the migration worked
        const testQuery = await db.query('SELECT column_name, data_type FROM information_schema.columns WHERE table_name = \'recorded_sessions\' AND column_name = \'recording_type\'');
        if (testQuery.rows.length > 0) {
            console.log('🎯 Verification: recording_type column exists and is ready for use');
        } else {
            throw new Error('Migration verification failed - column not found');
        }
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error('Full error:', error);
        process.exit(1);
    }
}

// Run the migration
runRecordingTypeMigration();