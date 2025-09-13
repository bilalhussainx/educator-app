// Check table schemas to understand the type mismatch
require('dotenv').config();
const db = require('./db');

async function checkSchemas() {
    console.log('🔍 Checking table schemas...\n');
    
    const client = await db.pool.connect();
    
    try {
        // Check enhanced_courses schema
        console.log('📋 Enhanced courses table schema:');
        const ecResult = await client.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'enhanced_courses'
            ORDER BY ordinal_position;
        `);
        ecResult.rows.forEach(row => console.log(`   ${row.column_name}: ${row.data_type}`));
        
        // Check lessons table schema
        console.log('\n📋 Lessons table schema:');
        const lessonsResult = await client.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'lessons'
            ORDER BY ordinal_position;
        `);
        lessonsResult.rows.forEach(row => console.log(`   ${row.column_name}: ${row.data_type}`));
        
        // Check courses table schema for comparison
        console.log('\n📋 Regular courses table schema:');
        const coursesResult = await client.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'courses'
            ORDER BY ordinal_position;
        `);
        coursesResult.rows.forEach(row => console.log(`   ${row.column_name}: ${row.data_type}`));
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        client.release();
    }
    
    process.exit(0);
}

checkSchemas();