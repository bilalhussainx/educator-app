// Fix Bilal's profile to be searchable
const { Pool } = require('pg');
require('dotenv').config();

const databaseUrl = process.env.DATABASE_URL?.replace(/['"]/g, '');
const isCloudDatabase = databaseUrl && (databaseUrl.includes('neon.tech') || databaseUrl.includes('railway') || databaseUrl.includes('supabase'));

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: isCloudDatabase ? {
    rejectUnauthorized: false,
  } : false,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

async function fixBilalProfile() {
  try {
    console.log('Fixing Bilal\'s profile...');
    
    // Update Bilal's profile to be a searchable teacher and mentor
    const result = await pool.query(`
      UPDATE user_profiles 
      SET 
        is_searchable_teacher = true,
        is_mentor = true,
        display_name = COALESCE(display_name, 'Bilal Hussain'),
        bio = COALESCE(bio, 'Experienced software developer and educator passionate about teaching programming and technology.'),
        updated_at = NOW()
      WHERE user_id = (
        SELECT id FROM users WHERE email LIKE '%bilalhussain%' LIMIT 1
      )
      RETURNING *
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ Successfully updated Bilal\'s profile:');
      console.log({
        display_name: result.rows[0].display_name,
        is_mentor: result.rows[0].is_mentor,
        is_searchable_teacher: result.rows[0].is_searchable_teacher,
        bio: result.rows[0].bio
      });
    } else {
      console.log('❌ No profile found to update');
    }
    
    // Check total searchable profiles now
    const searchableResult = await pool.query(`
      SELECT COUNT(*) as searchable_count 
      FROM user_profiles 
      WHERE is_searchable_teacher = true OR is_mentor = true OR is_counselor = true OR is_essay_editor = true
    `);
    console.log('\\nTotal searchable profiles now:', searchableResult.rows[0].searchable_count);
    
  } catch (error) {
    console.error('Error fixing profile:', error.message);
  } finally {
    await pool.end();
  }
}

fixBilalProfile();