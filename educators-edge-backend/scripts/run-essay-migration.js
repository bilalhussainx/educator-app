/**
 * Run Essay Subscription Migration
 *
 * This script adds essay subscription fields to the PostgreSQL users table
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Parse DATABASE_URL to determine if it's a cloud database (same logic as db.js)
const databaseUrl = process.env.DATABASE_URL?.replace(/['"]/g, '');
const isCloudDatabase = databaseUrl && (databaseUrl.includes('neon.tech') || databaseUrl.includes('railway') || databaseUrl.includes('supabase'));

console.log('Database URL configured:', databaseUrl ? 'Yes' : 'No');
console.log('Is Cloud Database:', isCloudDatabase);

if (!databaseUrl) {
  console.error('❌ DATABASE_URL is not set in .env file');
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
  console.log('🚀 Starting Essay Subscription Migration...\n');

  try {
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, 'migrations', 'add_essay_subscription_fields.sql');
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
      console.log('📊 The following fields have been added to the users table:');
      console.log('   - subscription_tier (VARCHAR)');
      console.log('   - free_essays_used (INTEGER)');
      console.log('   - essays_generated (INTEGER)');
      console.log('   - subscription_ends_at (TIMESTAMP)');
      console.log('   - student_profile (JSONB)\n');

      // Verify the changes
      console.log('🔍 Verifying changes...');
      const result = await client.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'users'
        AND column_name IN ('subscription_tier', 'free_essays_used', 'essays_generated', 'subscription_ends_at', 'student_profile')
        ORDER BY column_name;
      `);

      if (result.rows.length > 0) {
        console.log('✅ Verification successful! New columns:');
        result.rows.forEach(row => {
          console.log(`   ✓ ${row.column_name} (${row.data_type})`);
        });
      } else {
        console.log('⚠️  Warning: Could not verify columns. They may already exist.');
      }

      console.log('\n🎉 Essay subscription system is ready!');
      console.log('📝 Users can now generate college essays with quota tracking.\n');

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message);

    if (error.message.includes('already exists')) {
      console.log('\n✓ Fields already exist - migration was previously run');
      console.log('✓ No action needed, system is ready!\n');
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
