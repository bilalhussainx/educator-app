const { Pool } = require('pg');
require('dotenv').config();

// Database configuration
const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function checkAIBots() {
    try {
        console.log('Checking AI bots in database...');
        
        // First check ai_bots table structure
        const tableStructure = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'ai_bots'
            ORDER BY ordinal_position
        `);
        
        console.log('\n=== AI_BOTS TABLE STRUCTURE ===');
        tableStructure.rows.forEach(col => {
            console.log(`${col.column_name}: ${col.data_type}`);
        });
        
        // Check ai_bots table
        const aiBotsQuery = await pool.query(`
            SELECT ab.*, u.username, up.display_name as profile_display_name
            FROM ai_bots ab
            LEFT JOIN users u ON ab.user_id = u.id
            LEFT JOIN user_profiles up ON u.id = up.user_id
            ORDER BY ab.id
        `);
        
        console.log('\n=== AI BOTS TABLE ===');
        aiBotsQuery.rows.forEach(bot => {
            console.log(`AI Bot: ${bot.display_name || bot.profile_display_name}`);
            console.log(`  - AI Bot ID: ${bot.id}`);
            console.log(`  - User ID: ${bot.user_id}`);
            console.log(`  - Username: ${bot.username}`);
            console.log(`  - Is Active: ${bot.is_active}`);
            console.log(`  - Personality: ${bot.personality_type}`);
            console.log(`  - Specialization: ${bot.specialization_focus}`);
            console.log('');
        });
        
        // Check the user_profiles for AI bot users
        console.log('\n=== CHECKING USER PROFILES FOR AI BOT USERS ===');
        const aiUserProfiles = await pool.query(`
            SELECT u.id, u.username, up.display_name, up.is_searchable_teacher, up.is_mentor,
                   ab.id as ai_bot_id, ab.bot_name, ab.is_active, ab.personality_type, ab.specialization_focus,
                   CASE WHEN ab.id IS NOT NULL THEN true ELSE false END as is_ai_bot
            FROM users u
            LEFT JOIN user_profiles up ON u.id = up.user_id
            LEFT JOIN ai_bots ab ON u.id = ab.user_id
            WHERE ab.id IS NOT NULL
            ORDER BY ab.bot_name
        `);
        
        aiUserProfiles.rows.forEach(user => {
            console.log(`Bot: ${user.bot_name}`);
            console.log(`  - User ID: ${user.id}`);
            console.log(`  - Username: ${user.username}`);
            console.log(`  - Display Name: ${user.display_name}`);
            console.log(`  - AI Bot ID: ${user.ai_bot_id}`);
            console.log(`  - Is AI Bot: ${user.is_ai_bot}`);
            console.log(`  - Is Active: ${user.is_active}`);
            console.log(`  - Is Mentor: ${user.is_mentor}`);
            console.log(`  - Is Searchable Teacher: ${user.is_searchable_teacher}`);
            console.log(`  - Personality: ${user.personality_type}`);
            console.log(`  - Specialization: ${user.specialization_focus}`);
            console.log('');
        });
        
    } catch (error) {
        console.error('Error checking AI bots:', error);
    } finally {
        await pool.end();
    }
}

checkAIBots();