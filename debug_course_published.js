const pool = require('./educators-edge-backend/db');

async function checkCourseStatus() {
  try {
    const result = await pool.query(
      'SELECT id, title, is_published FROM enhanced_courses WHERE id = $1',
      ['9d51b0bf-e722-4b3c-9f6e-fd1a138972ea']
    );

    if (result.rows.length > 0) {
      const course = result.rows[0];
      console.log('Course found:');
      console.log('- ID:', course.id);
      console.log('- Title:', course.title);
      console.log('- Is Published:', course.is_published);
    } else {
      console.log('Course not found');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
  process.exit();
}

checkCourseStatus();