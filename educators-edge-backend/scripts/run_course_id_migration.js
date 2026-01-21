const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log('🔄 Starting migration: Add course_id to sessions table...\n');

    // Read migration file
    const migrationPath = path.join(__dirname, 'migrations', 'add_course_id_to_sessions.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Execute migration
    await client.query(migrationSQL);

    console.log('✅ Migration completed successfully!\n');

    // Verify the column was added
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'sessions'
      AND column_name IN ('course_id', 'description', 'session_mode')
      ORDER BY column_name;
    `);

    console.log('📋 Sessions table columns verification:');
    console.table(result.rows);

    // Check indexes
    const indexResult = await client.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'sessions'
      AND indexname LIKE '%course%'
      ORDER BY indexname;
    `);

    if (indexResult.rows.length > 0) {
      console.log('\n📊 Course-related indexes created:');
      console.table(indexResult.rows);
    }

    console.log('\n✨ Sessions table is now ready for course-based notifications!');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
