const { Pool } = require('pg');

// Database configuration
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_AX7NorpK3bLU@ep-calm-dawn-aeeyn1n1-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
});

async function checkAIBots() {
    try {
        console.log('Checking AI bots in database...');
        
        // Check ai_bots table
        const aiBotsQuery = await pool.query(`
            SELECT ab.id, ab.user_id, ab.display_name, ab.personality_type, ab.specialization_focus, ab.is_active,
                   u.username, up.display_name as profile_display_name
            FROM ai_bots ab
            LEFT JOIN users u ON ab.user_id = u.id
            LEFT JOIN user_profiles up ON u.id = up.user_id
            ORDER BY ab.display_name
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
        
        // Check for Mike Rodriguez and Sarah Kim specifically
        console.log('\n=== CHECKING MIKE RODRIGUEZ AND SARAH KIM ===');
        const specificUsers = await pool.query(`
            SELECT u.id, u.username, up.display_name,
                   ab.id as ai_bot_id, ab.is_active, ab.personality_type, ab.specialization_focus,
                   CASE WHEN ab.id IS NOT NULL THEN true ELSE false END as is_ai_bot
            FROM users u
            LEFT JOIN user_profiles up ON u.id = up.user_id
            LEFT JOIN ai_bots ab ON u.id = ab.user_id
            WHERE up.display_name IN ('Mike Rodriguez', 'Sarah Kim')
               OR u.username IN ('Mike Rodriguez', 'Sarah Kim')
        `);
        
        specificUsers.rows.forEach(user => {
            console.log(`User: ${user.display_name || user.username}`);
            console.log(`  - User ID: ${user.id}`);
            console.log(`  - AI Bot ID: ${user.ai_bot_id}`);
            console.log(`  - Is AI Bot: ${user.is_ai_bot}`);
            console.log(`  - Is Active: ${user.is_active}`);
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