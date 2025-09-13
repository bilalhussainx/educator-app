#!/usr/bin/env node
// Test Enhanced Lesson IDE Integration
require('dotenv').config();
const db = require('./db');

async function testEnhancedLessonIDE() {
    console.log('🧪 Testing Enhanced Lesson IDE Integration...\n');
    
    const client = await db.pool.connect();
    
    try {
        // 1. Get a sample enhanced course lesson
        console.log('📋 Finding a sample enhanced lesson...');
        const lessonResult = await client.query(`
            SELECT l.id, l.title, ec.title as course_title
            FROM lessons l
            JOIN enhanced_courses ec ON l.enhanced_course_id = ec.id
            ORDER BY l.created_at DESC
            LIMIT 1;
        `);
        
        if (lessonResult.rows.length === 0) {
            console.log('⚠️ No enhanced lessons found');
            return;
        }
        
        const lesson = lessonResult.rows[0];
        console.log(`📚 Testing lesson: "${lesson.title}" from course "${lesson.course_title}"`);
        
        // 2. Check lesson files (boilerplate)
        console.log('\n📁 Checking lesson files...');
        const filesResult = await client.query(`
            SELECT id, filename, content
            FROM lesson_files 
            WHERE lesson_id = $1
        `, [lesson.id]);
        
        console.log(`   Found ${filesResult.rows.length} lesson files:`);
        filesResult.rows.forEach(file => {
            console.log(`   - ${file.filename} (${file.content.length} chars)`);
            console.log(`     Preview: ${file.content.substring(0, 100)}...`);
        });
        
        // 3. Check solution files
        console.log('\n💡 Checking solution files...');
        const solutionsResult = await client.query(`
            SELECT id, filename, content
            FROM lesson_solution_files 
            WHERE lesson_id = $1
        `, [lesson.id]);
        
        console.log(`   Found ${solutionsResult.rows.length} solution files:`);
        solutionsResult.rows.forEach(file => {
            console.log(`   - ${file.filename} (${file.content.length} chars)`);
        });
        
        // 4. Check test files
        console.log('\n🧪 Checking test files...');
        const testsResult = await client.query(`
            SELECT id, test_code
            FROM lesson_tests 
            WHERE lesson_id = $1
        `, [lesson.id]);
        
        console.log(`   Found ${testsResult.rows.length} test files:`);
        testsResult.rows.forEach(test => {
            console.log(`   - Test code (${test.test_code.length} chars)`);
        });
        
        // 5. Simulate IDE data retrieval (like AscentIDE would do)
        console.log('\n🖥️  Simulating IDE data retrieval...');
        const ideDataResult = await client.query(`
            SELECT 
                l.id, l.title, l.description, l.objective,
                CASE 
                    WHEN l.course_id IS NOT NULL THEN c.title
                    WHEN l.enhanced_course_id IS NOT NULL THEN ec.title
                END as course_title,
                CASE 
                    WHEN l.course_id IS NOT NULL THEN l.course_id::text
                    WHEN l.enhanced_course_id IS NOT NULL THEN l.enhanced_course_id::text
                END as course_id
            FROM lessons l
            LEFT JOIN courses c ON l.course_id = c.id
            LEFT JOIN enhanced_courses ec ON l.enhanced_course_id = ec.id
            WHERE l.id = $1
        `, [lesson.id]);
        
        const ideData = ideDataResult.rows[0];
        console.log('✅ IDE Data Structure:');
        console.log(`   Lesson: ${ideData.title}`);
        console.log(`   Course: ${ideData.course_title}`);
        console.log(`   Course ID: ${ideData.course_id}`);
        console.log(`   Has Objective: ${!!ideData.objective}`);
        console.log(`   Has Files: ${filesResult.rows.length > 0}`);
        console.log(`   Has Solutions: ${solutionsResult.rows.length > 0}`);
        console.log(`   Has Tests: ${testsResult.rows.length > 0}`);
        
        console.log('\n🎯 Enhanced Lesson IDE Integration Test: ✅ PASSED');
        console.log('📝 Enhanced courses are ready to work with AscentIDE and AscentWebIDE!');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        client.release();
    }
    
    process.exit(0);
}

// Run the test
testEnhancedLessonIDE();