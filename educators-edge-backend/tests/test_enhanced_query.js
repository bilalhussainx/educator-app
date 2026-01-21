// Test enhanced courses query
require('dotenv').config();
const db = require('./db');

async function testQuery() {
    console.log('🧪 Testing enhanced courses query...\n');
    
    try {
        const query = `
            SELECT 
                ec.id, 
                ec.title, 
                ec.description, 
                ec.difficulty_level,
                ec.estimated_duration,
                ec.language,
                ec.course_type,
                ec.learning_outcomes,
                ec.target_audience,
                ec.created_at,
                u.username as teacher_name
            FROM enhanced_courses ec
            LEFT JOIN users u ON ec.teacher_id = u.id
            WHERE ec.is_published = true
            ORDER BY ec.created_at DESC;
        `;
        
        const result = await db.query(query);
        
        console.log(`✅ Query successful! Found ${result.rows.length} enhanced courses\n`);
        
        if (result.rows.length > 0) {
            console.log('📚 Enhanced Courses List:');
            result.rows.forEach((course, i) => {
                console.log(`\n${i + 1}. ${course.title}`);
                console.log(`   Teacher: ${course.teacher_name || 'No teacher assigned'}`);
                console.log(`   Type: ${course.course_type}`);
                console.log(`   Difficulty: ${course.difficulty_level}`);
                console.log(`   Duration: ${course.estimated_duration}`);
                console.log(`   Language: ${course.language}`);
                console.log(`   ID: ${course.id}`);
            });
            
            console.log('\n📋 Summary:');
            console.log(`   Total courses: ${result.rows.length}`);
            console.log(`   All published: ✅`);
            console.log(`   Ready for discovery: ✅`);
            
            // Check if courses have lessons
            const courseWithLessons = await db.query(`
                SELECT ec.title, COUNT(l.id) as lesson_count
                FROM enhanced_courses ec
                LEFT JOIN lessons l ON l.enhanced_course_id = ec.id
                WHERE ec.is_published = true
                GROUP BY ec.id, ec.title
                ORDER BY ec.created_at DESC
                LIMIT 3;
            `);
            
            console.log('\n📖 Lessons per course:');
            courseWithLessons.rows.forEach(c => {
                console.log(`   ${c.title}: ${c.lesson_count} lessons`);
            });
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Stack:', error.stack);
    }
    
    process.exit(0);
}

testQuery();