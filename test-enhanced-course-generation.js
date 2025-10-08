/**
 * =================================================================
 * TEST ENHANCED COURSE GENERATION SYSTEM
 * =================================================================
 * Tests the new Claude API-powered course generation system
 */

require('dotenv').config();
const UltimateCourseGenerator = require('./ultimateCourseGenerator');

async function testCourseGeneration() {
    console.log('🧪 Testing Enhanced Course Generation System...\n');
    
    try {
        const generator = new UltimateCourseGenerator();
        
        // Test single course generation
        console.log('📚 Generating a test course...');
        
        const testCourseSpec = {
            title: "Two Pointers & Sliding Window Mastery",
            difficulty: "intermediate",
            focusAreas: ["two-pointers", "sliding-window", "algorithms"],
            moduleCount: 2,
            lessonsPerModule: 3
        };
        
        const result = await generator.generateCompleteCourse(testCourseSpec);
        
        console.log('\n✅ Course generation completed!');
        console.log('Course ID:', result.courseId);
        console.log('Title:', result.courseData.title);
        console.log('Modules:', result.courseData.modules.length);
        
        // Show language implementations for first lesson
        const firstLesson = result.courseData.modules[0].lessons.lessons[0];
        console.log('\n🔍 Language implementations for first lesson:');
        console.log('- JavaScript:', !!firstLesson.languageImplementations?.javascript);
        console.log('- Python:', !!firstLesson.languageImplementations?.python);
        console.log('- Java:', !!firstLesson.languageImplementations?.java);
        
        console.log('\n🎉 Test completed successfully!');
        console.log('\nYou can now:');
        console.log('1. Navigate to the enhanced courses page');
        console.log('2. Select the newly generated course');
        console.log('3. Switch between JavaScript, Python, and Java');
        console.log('4. See language-specific boilerplate code and test cases');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('\nMake sure you have:');
        console.error('1. CLAUDE_API_KEY set in your .env file');
        console.error('2. Database connection working');
        console.error('3. Backend server running');
    }
}

testCourseGeneration();