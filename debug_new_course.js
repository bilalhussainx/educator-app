const pool = require('./educators-edge-backend/db');

async function checkCourse() {
  try {
    const courseId = '44efe8ea-08e5-4c50-be40-f1afa2615ab2';
    const moduleIndex = 0;
    const lessonIndex = 3;

    const result = await pool.query(
      'SELECT id, title, metadata FROM enhanced_courses WHERE id = $1',
      [courseId]
    );

    if (result.rows.length > 0) {
      const course = result.rows[0];
      console.log('Course found:', course.title);

      const modules = course.metadata?.modules || [];
      if (moduleIndex < modules.length) {
        const currentModule = modules[moduleIndex];
        console.log('Module:', currentModule.title);

        const lessons = currentModule.lessons?.lessons || [];
        if (lessonIndex < lessons.length) {
          const currentLesson = lessons[lessonIndex];
          console.log('Lesson:', currentLesson.title);

          const availableLanguages = Object.keys(currentLesson.languageImplementations || {});
          console.log('Available languages:', availableLanguages);

          if (currentLesson.languageImplementations?.python) {
            console.log('✅ Python implementation exists');
            console.log('Python starter code length:', currentLesson.languageImplementations.python.starterCode?.length || 0);
          } else {
            console.log('❌ Python implementation missing');
          }
        } else {
          console.log('❌ Lesson index out of bounds');
        }
      } else {
        console.log('❌ Module index out of bounds');
      }
    } else {
      console.log('❌ Course not found');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
  process.exit();
}

checkCourse();