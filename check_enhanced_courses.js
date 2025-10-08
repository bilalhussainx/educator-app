const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:bilalmalik@localhost:5432/educators_edge_db'
});

async function checkCourses() {
  try {
    const result = await pool.query('SELECT id, title, metadata FROM enhanced_courses ORDER BY created_at DESC');
    console.log('Enhanced Courses:');
    result.rows.forEach((course, index) => {
      const modules = course.metadata?.modules || [];
      console.log(`${index + 1}. ${course.title} (ID: ${course.id})`);
      console.log(`   Modules: ${modules.length}`);
      modules.forEach((module, modIndex) => {
        const lessons = module.lessons?.lessons || [];
        console.log(`   Module ${modIndex + 1}: ${module.title} - ${lessons.length} lessons`);
      });
      console.log('');
    });
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkCourses();