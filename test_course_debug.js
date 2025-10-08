const pool = require('./educators-edge-backend/db');

async function testQuery() {
  try {
    console.log('Testing course query...');
    const result = await pool.query(
      'SELECT id, title, metadata FROM enhanced_courses WHERE id = $1',
      ['9d51b0bf-e722-4b3c-9f6e-fd1a138972ea']
    );

    if (result.rows.length > 0) {
      const course = result.rows[0];
      console.log('✅ Course found:', course.title);
      console.log('Modules count:', course.metadata?.modules?.length || 0);

      if (course.metadata?.modules?.[0]?.lessons?.lessons?.[0]) {
        const lesson = course.metadata.modules[0].lessons.lessons[0];
        console.log('First lesson:', lesson.title);
        console.log('Available languages:', Object.keys(lesson.languageImplementations || {}));

        // Check if python implementation exists
        if (lesson.languageImplementations?.python) {
          console.log('✅ Python implementation exists');
        } else {
          console.log('❌ Python implementation missing');
        }
      }
    } else {
      console.log('❌ Course not found');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  process.exit();
}

testQuery();