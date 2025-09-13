// Test Claude API integration
require('dotenv').config();
const { AIService } = require('./services/aiCourseService');

async function testClaudeAPI() {
    console.log('🧪 Testing Claude API Integration...\n');
    
    const aiService = new AIService();
    
    try {
        // Simple test prompt with guaranteed valid JSON response
        const prompt = `Create a simple course structure for a JavaScript basics course.

CRITICAL: Return ONLY valid JSON. No explanatory text. Keep it simple.

{
    "course": {
        "title": "JavaScript Fundamentals",
        "description": "Learn the basics of JavaScript programming",
        "modules": [
            {
                "title": "Variables and Data Types",
                "description": "Learn about variables, strings, numbers, and booleans"
            },
            {
                "title": "Functions and Control Flow",
                "description": "Master functions, if statements, and loops"
            }
        ]
    }
}`;

        console.log('📤 Sending test request to Claude...');
        const result = await aiService.generateWithRetries(prompt, 'Claude API Test');
        
        console.log('✅ Claude API Response:');
        console.log(JSON.stringify(result, null, 2));
        
        console.log('\n🎉 SUCCESS! Claude API is working correctly.');
        
    } catch (error) {
        console.error('\n❌ FAILED! Claude API test failed:');
        console.error('Error:', error.message);
        console.error('Stack:', error.stack);
    }
}

testClaudeAPI();