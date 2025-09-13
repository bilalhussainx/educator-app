// Check real profiles and fix bilalhussain.v1@gmail.com
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

async function checkAndFixProfiles() {
  try {
    console.log('\n=== CHECKING REAL PROFILES ===\n');
    
    // Check for bilalhussain.v1@gmail.com specifically
    const bilalV1Result = await pool.query(`
      SELECT u.id, u.username, u.email, 
             up.display_name, up.is_mentor, up.is_searchable_teacher, up.is_counselor, up.is_essay_editor,
             up.bio, up.user_tier
      FROM users u 
      LEFT JOIN user_profiles up ON u.id = up.user_id 
      WHERE u.email = 'bilalhussain.v1@gmail.com'
    `);
    
    if (bilalV1Result.rows.length > 0) {
      console.log('Found bilalhussain.v1@gmail.com:');
      console.log(bilalV1Result.rows[0]);
      
      // Check if searchable
      const user = bilalV1Result.rows[0];
      if (!user.is_mentor && !user.is_searchable_teacher && !user.is_counselor && !user.is_essay_editor) {
        console.log('\n🔧 Making bilalhussain.v1@gmail.com searchable...');
        
        await pool.query(`
          UPDATE user_profiles 
          SET 
            is_searchable_teacher = true,
            is_mentor = true,
            display_name = COALESCE(display_name, 'Bilal Hussain'),
            bio = COALESCE(bio, 'Experienced educator and software developer. Specializing in programming, web development, and academic mentoring.'),
            user_tier = COALESCE(user_tier, 'explorer'),
            updated_at = NOW()
          WHERE user_id = $1
          RETURNING *
        `, [user.id]);
        
        console.log('✅ Updated bilalhussain.v1@gmail.com to be searchable!');
      } else {
        console.log('✅ bilalhussain.v1@gmail.com is already searchable');
      }
    } else {
      console.log('❌ bilalhussain.v1@gmail.com not found in database');
      
      // Check for similar emails
      const similarResult = await pool.query(`
        SELECT u.username, u.email 
        FROM users u 
        WHERE u.email LIKE '%bilalhussain%'
      `);
      
      if (similarResult.rows.length > 0) {
        console.log('\nFound similar emails:');
        similarResult.rows.forEach(row => {
          console.log(`- ${row.email} (${row.username})`);
        });
      }
    }
    
    // Check all real (non-AI) searchable profiles
    console.log('\n=== ALL REAL SEARCHABLE PROFILES ===\n');
    
    const realProfilesResult = await pool.query(`
      SELECT u.id, u.username, u.email, 
             up.display_name, up.is_mentor, up.is_searchable_teacher, up.is_counselor, up.is_essay_editor,
             up.bio, up.user_tier
      FROM users u 
      JOIN user_profiles up ON u.id = up.user_id 
      LEFT JOIN ai_bots ab ON u.id = ab.user_id
      WHERE (up.is_mentor = true OR up.is_searchable_teacher = true OR up.is_counselor = true OR up.is_essay_editor = true)
        AND ab.id IS NULL  -- Exclude AI bots
      ORDER BY up.display_name, u.username
    `);
    
    console.log(`Found ${realProfilesResult.rows.length} real searchable profiles:`);
    realProfilesResult.rows.forEach(profile => {
      console.log(`- ${profile.display_name || profile.username} (${profile.email})`);
      console.log(`  Flags: mentor=${profile.is_mentor}, teacher=${profile.is_searchable_teacher}, counselor=${profile.is_counselor}, editor=${profile.is_essay_editor}`);
      console.log(`  Tier: ${profile.user_tier || 'none'}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('Database check error:', error.message);
  } finally {
    await pool.end();
  }
}

checkAndFixProfiles();