// Check enhanced courses in database
require('dotenv').config();
const db = require('./db');

async function checkEnhancedCourses() {
    console.log('📚 Checking Enhanced Courses in Database...\n');
    
    const result = await db.query(`
        SELECT id, title, course_type, is_published, created_at 
        FROM enhanced_courses 
        ORDER BY created_at DESC 
        LIMIT 5;
    `);
    
    console.log('📊 Recent Enhanced Courses:');
    result.rows.forEach((course, index) => {
        const status = course.is_published ? '🟢 Published' : '🔴 Draft';
        console.log(`   ${index + 1}. ${course.title}`);
        console.log(`      ${status} | Type: ${course.course_type} | ID: ${course.id.substring(0, 8)}...`);
    });
    
    console.log(`\n✅ Total enhanced courses: ${result.rows.length}`);
    console.log('🎯 These courses should appear in: /courses/discover/enhanced');
    
    process.exit(0);
}

checkEnhancedCourses().catch(console.error);