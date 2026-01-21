// Quick test to check profiles in database
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

async function testProfiles() {
  try {
    console.log('\n=== CHECKING DATABASE CONTENT ===\n');
    
    // Check users
    const usersResult = await pool.query('SELECT COUNT(*) as user_count FROM users');
    console.log('Total users in database:', usersResult.rows[0].user_count);
    
    // Check user profiles
    const profilesResult = await pool.query('SELECT COUNT(*) as profile_count FROM user_profiles');
    console.log('Total user profiles:', profilesResult.rows[0].profile_count);
    
    // Check AI bots
    try {
      const aiBotsResult = await pool.query('SELECT COUNT(*) as ai_bot_count FROM ai_bots');
      console.log('Total AI bots:', aiBotsResult.rows[0].ai_bot_count);
    } catch (error) {
      console.log('AI bots table not found or empty');
    }
    
    // Check for searchable profiles
    const searchableResult = await pool.query(`
      SELECT COUNT(*) as searchable_count 
      FROM user_profiles 
      WHERE is_searchable_teacher = true OR is_mentor = true OR is_counselor = true OR is_essay_editor = true
    `);
    console.log('Searchable profiles (mentors/teachers/counselors/editors):', searchableResult.rows[0].searchable_count);
    
    // Check specific user
    const bilalResult = await pool.query(`
      SELECT u.username, u.email, 
             up.display_name, up.is_mentor, up.is_searchable_teacher, up.is_counselor, up.is_essay_editor
      FROM users u 
      LEFT JOIN user_profiles up ON u.id = up.user_id 
      WHERE u.email LIKE '%bilalhussain%'
    `);
    
    if (bilalResult.rows.length > 0) {
      console.log('\n=== BILAL\'S PROFILE ===');
      console.log(bilalResult.rows[0]);
    } else {
      console.log('\nNo user found with bilalhussain email');
    }
    
    // Check if there are any profiles with AI bot data
    const aiProfilesResult = await pool.query(`
      SELECT u.username, up.display_name, ab.bot_name, ab.personality_type, ab.specialization_focus
      FROM users u 
      JOIN user_profiles up ON u.id = up.user_id 
      LEFT JOIN ai_bots ab ON u.id = ab.user_id
      WHERE ab.id IS NOT NULL AND ab.is_active = true
      LIMIT 5
    `);
    
    if (aiProfilesResult.rows.length > 0) {
      console.log('\n=== AI BOT PROFILES ===');
      aiProfilesResult.rows.forEach(row => {
        console.log(`${row.bot_name} (${row.personality_type}): ${row.specialization_focus}`);
      });
    } else {
      console.log('\nNo active AI bot profiles found');
    }
    
  } catch (error) {
    console.error('Database test error:', error.message);
  } finally {
    await pool.end();
  }
}

testProfiles();