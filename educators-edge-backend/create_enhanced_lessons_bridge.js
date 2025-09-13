#!/usr/bin/env node
// Create Enhanced Lessons Bridge - Allow lessons to work with both regular and enhanced courses
require('dotenv').config();
const db = require('./db');

async function createEnhancedLessonsBridge() {
    console.log('🔗 Creating Enhanced Lessons Bridge System...\n');
    
    const client = await db.pool.connect();
    
    try {
        await client.query('BEGIN');
        
        // 1. Add enhanced_course_id column to lessons table
        console.log('📋 Adding enhanced_course_id column to lessons table...');
        await client.query(`
            ALTER TABLE lessons 
            ADD COLUMN IF NOT EXISTS enhanced_course_id UUID REFERENCES enhanced_courses(id) ON DELETE CASCADE;
        `);
        
        // 2. Create index for better performance
        console.log('📊 Creating index on enhanced_course_id...');
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_lessons_enhanced_course_id ON lessons(enhanced_course_id);
        `);
        
        // 3. Modify the constraint to make course_id nullable (since we now have enhanced_course_id)
        console.log('🔧 Making course_id nullable for enhanced courses...');
        await client.query(`
            ALTER TABLE lessons ALTER COLUMN course_id DROP NOT NULL;
        `);
        
        // 4. Add constraint to ensure either course_id or enhanced_course_id is set
        console.log('✅ Adding constraint to ensure proper course reference...');
        await client.query(`
            ALTER TABLE lessons 
            ADD CONSTRAINT check_course_reference 
            CHECK ((course_id IS NOT NULL AND enhanced_course_id IS NULL) OR 
                   (course_id IS NULL AND enhanced_course_id IS NOT NULL));
        `);
        
        await client.query('COMMIT');
        console.log('\n✅ Enhanced Lessons Bridge created successfully!');
        console.log('📝 Lessons can now reference both regular courses (integer ID) and enhanced courses (UUID)');
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        client.release();
    }
    
    process.exit(0);
}

// Run the bridge creation
createEnhancedLessonsBridge();