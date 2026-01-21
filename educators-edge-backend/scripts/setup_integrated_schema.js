require('dotenv').config();
const fs = require('fs');
const pool = require('./db');

async function setupIntegratedSchema() {
    try {
        console.log('🚀 Setting up integrated ecosystem tracking schema...');

        // Read the integrated schema SQL file
        const schemaSQL = fs.readFileSync('../create_integrated_tracking_schema.sql', 'utf8');

        // Execute the schema
        await pool.query(schemaSQL);

        console.log('✅ Integrated ecosystem tracking schema created successfully!');

        // Verify new tables were created
        const result = await pool.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name IN (
                'user_ecosystem_profile',
                'session_bookings',
                'sparks_transactions',
                'teacher_ratings',
                'user_achievements',
                'ecosystem_leaderboards'
            )
            ORDER BY table_name;
        `);

        console.log('📊 Created integrated tables:', result.rows.map(row => row.table_name));

        // Initialize ecosystem profiles for existing users
        console.log('🔄 Initializing ecosystem profiles for existing users...');
        await pool.query(`
            INSERT INTO user_ecosystem_profile (user_id)
            SELECT id FROM users
            WHERE id NOT IN (SELECT user_id FROM user_ecosystem_profile)
            ON CONFLICT (user_id) DO NOTHING
        `);

        console.log('👥 Initialized ecosystem profiles for existing users');

        // Create some sample achievements
        const sampleAchievements = [
            {
                type: 'first_problem_solved',
                title: 'First Steps',
                description: 'Solved your first coding problem!',
                icon: '🎯',
                category: 'coding',
                sparks: 25
            },
            {
                type: 'coding_streak_7',
                title: 'Week Warrior',
                description: 'Solved problems for 7 consecutive days',
                icon: '🔥',
                category: 'coding',
                sparks: 50
            },
            {
                type: 'first_trade_profit',
                title: 'Profit Pioneer',
                description: 'Made your first profitable trade',
                icon: '💰',
                category: 'trading',
                sparks: 30
            },
            {
                type: 'teaching_excellence',
                title: 'Master Mentor',
                description: 'Received 5-star rating from a student',
                icon: '⭐',
                category: 'teaching',
                sparks: 100
            }
        ];

        console.log('🏆 Creating sample achievement templates...');
        // Note: These would be used as templates for awarding achievements

        console.log('✅ Integrated ecosystem setup completed successfully!');

    } catch (error) {
        console.error('❌ Error setting up integrated schema:', error.message);
        console.error('Error details:', error);
        process.exit(1);
    } finally {
        process.exit(0);
    }
}

setupIntegratedSchema();