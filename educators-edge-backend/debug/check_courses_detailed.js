const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:bilalmalik@localhost:5432/educators_edge_db'
});

async function checkCourses() {
  try {
    const result = await pool.query(`
      SELECT id, title, metadata, language, difficulty_level 
      FROM enhanced_courses 
      ORDER BY created_at DESC
    `);
    
    console.log('🔍 Enhanced Courses Detailed Analysis:');
    console.log('=' .repeat(50));
    
    result.rows.forEach((course, index) => {
      console.log(`\n${index + 1}. ${course.title}`);
      console.log(`   ID: ${course.id.substring(0, 8)}...`);
      console.log(`   Language: ${course.language || 'N/A'}`);
      console.log(`   Difficulty: ${course.difficulty_level || 'N/A'}`);
      
      const modules = course.metadata?.modules || [];
      console.log(`   📚 Modules: ${modules.length}`);
      
      if (modules.length === 0) {
        console.log('   ❌ NO MODULES FOUND - Course needs module generation');
      } else {
        modules.forEach((module, modIndex) => {
          const lessons = module.lessons?.lessons || [];
          console.log(`   📖 Module ${modIndex + 1}: "${module.title}" (${lessons.length} lessons)`);
          
          if (lessons.length === 0) {
            console.log('      ❌ NO LESSONS FOUND - Module needs lesson generation');
          } else {
            lessons.forEach((lesson, lessonIndex) => {
              console.log(`      ✏️  Lesson ${lessonIndex + 1}: "${lesson.title}" (${lesson.difficulty || 'No difficulty'})`);
            });
          }
        });
      }
      
      console.log('-'.repeat(30));
    });
    
    // Summary
    const coursesWithoutModules = result.rows.filter(course => !course.metadata?.modules?.length);
    const coursesWithEmptyModules = result.rows.filter(course => {
      const modules = course.metadata?.modules || [];
      return modules.some(module => !module.lessons?.lessons?.length);
    });
    
    console.log('\n📊 SUMMARY:');
    console.log(`Total Enhanced Courses: ${result.rows.length}`);
    console.log(`Courses without modules: ${coursesWithoutModules.length}`);
    console.log(`Courses with empty modules: ${coursesWithEmptyModules.length}`);
    
    if (coursesWithoutModules.length > 0) {
      console.log('\n❌ Courses needing module generation:');
      coursesWithoutModules.forEach(course => {
        console.log(`   - ${course.title} (${course.id.substring(0, 8)}...)`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkCourses();