/**
 * Run Essay Collaboration Migration
 *
 * This script creates the database tables for the collaborative
 * essay writing system with LangGraph pipeline integration
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Parse DATABASE_URL to determine if it's a cloud database (same logic as db.js)
const databaseUrl = process.env.DATABASE_URL?.replace(/['"]/g, '');
const isCloudDatabase = databaseUrl && (databaseUrl.includes('neon.tech') || databaseUrl.includes('railway') || databaseUrl.includes('supabase'));

console.log('='.repeat(60));
console.log('ESSAY COLLABORATION SYSTEM - DATABASE MIGRATION');
console.log('='.repeat(60));
console.log('\nDatabase URL configured:', databaseUrl ? 'Yes' : 'No');
console.log('Is Cloud Database:', isCloudDatabase);

if (!databaseUrl) {
  console.error('\n❌ DATABASE_URL is not set in .env file');
  process.exit(1);
}

// Create PostgreSQL connection (same config as db.js)
const pool = new Pool({
  connectionString: databaseUrl,
  ssl: isCloudDatabase ? {
    rejectUnauthorized: false,
  } : false,
  connectionTimeoutMillis: 30000,
});

async function runMigration() {
  console.log('\n🚀 Starting Essay Collaboration Migration...\n');

  try {
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, 'migrations', 'create_essay_collaboration_tables.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration SQL loaded from:', migrationPath);
    console.log('🔗 Connecting to database...\n');

    // Connect to database
    const client = await pool.connect();

    try {
      console.log('✅ Connected to database successfully');
      console.log('⏳ Running migration...\n');

      // Execute migration
      await client.query(migrationSQL);

      console.log('✅ Migration completed successfully!\n');
      console.log('📊 The following tables have been created:\n');
      console.log('   1. essay_collaboration_sessions');
      console.log('      - Main session table linking teacher and student');
      console.log('      - Tracks current stage and LangGraph state\n');

      console.log('   2. essay_stage_states');
      console.log('      - Human-in-the-loop checkpoints');
      console.log('      - Stores agent outputs and approval status\n');

      console.log('   3. essay_drafts');
      console.log('      - Version history of essay content');
      console.log('      - Tracks who made each version\n');

      console.log('   4. essay_inline_comments');
      console.log('      - Inline comments and suggestions');
      console.log('      - Position tracking in text\n');

      console.log('   5. essay_session_messages');
      console.log('      - Chat and system messages');
      console.log('      - Agent status updates\n');

      // Verify the changes
      console.log('🔍 Verifying tables...');
      const result = await client.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_name LIKE 'essay_%'
        AND table_schema = 'public'
        ORDER BY table_name;
      `);

      if (result.rows.length > 0) {
        console.log('✅ Verification successful! Tables created:');
        result.rows.forEach(row => {
          console.log(`   ✓ ${row.table_name}`);
        });
      } else {
        console.log('⚠️  Warning: Could not verify tables. They may already exist.');
      }

      // Verify indexes
      console.log('\n🔍 Verifying indexes...');
      const indexResult = await client.query(`
        SELECT indexname
        FROM pg_indexes
        WHERE indexname LIKE 'idx_essay_%'
        ORDER BY indexname;
      `);

      if (indexResult.rows.length > 0) {
        console.log(`✅ ${indexResult.rows.length} indexes created for optimal performance`);
      }

      console.log('\n🎉 Essay Collaboration System database is ready!');
      console.log('📝 You can now create collaborative essay sessions.\n');

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message);

    if (error.message.includes('already exists')) {
      console.log('\n✓ Tables already exist - migration was previously run');
      console.log('✓ No action needed, system is ready!\n');
    } else if (error.message.includes('does not exist')) {
      console.error('\n🔍 Missing dependency - ensure users table exists');
      console.error('   Run the base migrations first.\n');
      process.exit(1);
    } else {
      console.error('\n🔍 Error details:', error);
      process.exit(1);
    }
  } finally {
    await pool.end();
  }
}

// Run the migration
runMigration();
