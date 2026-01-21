// FILE: testCourseGeneration.js
// Simple test for course generation functionality

require('dotenv').config();
const { SmartCourseGenerator } = require('./smartCourseGenerator');
const { UltimateCourseGenerator } = require('./ultimateCourseGenerator');

async function testSmartCourseGeneration() {
    console.log('🧪 Testing Smart Course Generation');
    
    try {
        const generator = new SmartCourseGenerator();
        const courses = await generator.generateCoursesFromFreeCodeCamp({
            targetLanguage: 'javascript',
            maxCourses: 1,
            difficulty: 'easy',
            focusAreas: ['functions'],
            minLessonsPerCourse: 3,
            maxLessonsPerCourse: 5
        });

        console.log('✅ Smart Course Generation: PASS');
        console.log(`   Generated: ${courses.length} course(s)`);
        if (courses.length > 0) {
            console.log(`   Course: "${courses[0].title}"`);
            console.log(`   Lessons: ${courses[0].lessonCount}`);
        }
        return true;

    } catch (error) {
        console.error('❌ Smart Course Generation: FAIL');
        console.error(`   Error: ${error.message}`);
        return false;
    }
}

async function testMinimalPremiumCourse() {
    console.log('\n🧪 Testing Minimal Premium Course Generation');
    
    try {
        const generator = new UltimateCourseGenerator();
        
        // Use a simpler, more controlled approach
        const customTheme = {
            title: 'JavaScript Fundamentals',
            description: 'Learn basic JavaScript programming concepts',
            patterns: ['Variables', 'Functions', 'Loops', 'Arrays']
        };

        const course = await generator.createPremiumCourse('custom', {
            customTheme,
            maxProblems: 5, // Very small for testing
            languages: ['javascript'],
            targetAudience: 'beginner programmers',
            practiceMode: 'guided'
        });

        console.log('✅ Premium Course Generation: PASS');
        console.log(`   Course: "${course.title}"`);
        console.log(`   Lessons: ${course.lessonCount}`);
        console.log(`   Problems: ${course.problemCount}`);
        return true;

    } catch (error) {
        console.error('❌ Premium Course Generation: FAIL');
        console.error(`   Error: ${error.message}`);
        return false;
    }
}

async function runTests() {
    console.log('🚀 Course Generation Test Suite\n');

    const results = {
        smartCourse: await testSmartCourseGeneration(),
        premiumCourse: await testMinimalPremiumCourse()
    };

    const passCount = Object.values(results).filter(Boolean).length;
    const totalTests = Object.keys(results).length;

    console.log(`\n📊 Test Results: ${passCount}/${totalTests} tests passed`);
    
    if (passCount === totalTests) {
        console.log('🎉 All course generation tests passed!');
        console.log('\n✨ Your system is ready to generate courses at scale!');
        console.log('🚀 Try: node ultimateCourseGenerator.js grokking-coding-interview single 20');
    } else {
        console.log('⚠️  Some tests failed. Check the errors above.');
        console.log('💡 The system may still work for some course types.');
    }

    return passCount === totalTests;
}

// Run if called directly
if (require.main === module) {
    runTests().then(success => {
        process.exit(success ? 0 : 1);
    }).catch(error => {
        console.error('💥 Test suite crashed:', error.message);
        process.exit(1);
    });
}

module.exports = { runTests };