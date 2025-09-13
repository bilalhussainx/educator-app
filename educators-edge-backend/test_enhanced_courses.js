// Simple test script for enhanced courses
require('dotenv').config();
const { UltimateCourseGenerator } = require('./ultimateCourseGenerator');

async function testEnhancedCourses() {
    console.log('🧪 Testing Enhanced Course Generation...\n');
    
    try {
        const generator = new UltimateCourseGenerator();
        
        // Test with minimal options
        console.log('📚 Creating System Design course...');
        const result = await generator.createPremiumCourse('system-design-interview', {
            maxProblems: 3,
            languages: ['javascript'],
            practiceMode: 'guided'
        });
        
        console.log('✅ SUCCESS! Enhanced course created:');
        console.log(JSON.stringify(result, null, 2));
        
    } catch (error) {
        console.error('❌ FAILED! Error:', error.message);
        console.error('Stack trace:', error.stack);
    }
}

testEnhancedCourses();