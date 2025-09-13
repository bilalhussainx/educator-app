// Run database migrations in the correct order
const fs = require('fs');
const path = require('path');
const db = require('../db');

async function runMigrations() {
    console.log('🚀 Starting database migrations...');
    
    // Order is important - base tables first, then extensions
    const migrationFiles = [
        'create_profiles_system.sql',
        'create_tier_system.sql', 
        'create_user_wallets.sql',
        'create_ascendia_core_tables.sql',
        'create_communication_tables.sql',
        'migrate_to_ascendia_four_pillars.sql',
        'create_ai_bot_system.sql'
    ];
    
    for (const fileName of migrationFiles) {
        const filePath = path.join(__dirname, '..', 'database', fileName);
        
        if (!fs.existsSync(filePath)) {
            console.log(`⚠️  Skipping ${fileName} - file not found`);
            continue;
        }
        
        try {
            console.log(`📄 Running migration: ${fileName}`);
            const sql = fs.readFileSync(filePath, 'utf8');
            
            // Execute the SQL
            await db.query(sql);
            console.log(`✅ Completed: ${fileName}`);
            
        } catch (error) {
            console.error(`❌ Error in ${fileName}:`, error.message);
            
            // Some errors are acceptable (like table already exists)
            if (error.code === '42P07' || error.message.includes('already exists')) {
                console.log(`ℹ️  Table/function already exists in ${fileName} - continuing...`);
                continue;
            } else if (error.code === '42701' || error.message.includes('column') && error.message.includes('already exists')) {
                console.log(`ℹ️  Column already exists in ${fileName} - continuing...`);
                continue;
            } else {
                console.error(`🛑 Critical error in ${fileName}, stopping migrations`);
                throw error;
            }
        }
    }
    
    console.log('🎉 All migrations completed successfully!');
    
    // Test that the required tables exist
    console.log('🔍 Verifying table creation...');
    try {
        const result = await db.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('connections', 'followers', 'user_profiles')
            ORDER BY table_name
        `);
        
        console.log('📋 Created tables:', result.rows.map(r => r.table_name));
        
        // Check for key columns
        const columnCheck = await db.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'user_profiles' 
            AND column_name IN ('ascendia_score_total', 'user_tier', 'score_academic')
            ORDER BY column_name
        `);
        
        console.log('📋 Key columns in user_profiles:', columnCheck.rows.map(r => r.column_name));
        
    } catch (error) {
        console.error('❌ Error verifying tables:', error.message);
    }
    
    process.exit(0);
}

// Handle uncaught errors
process.on('unhandledRejection', (error) => {
    console.error('❌ Unhandled rejection:', error);
    process.exit(1);
});

runMigrations().catch(error => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
});