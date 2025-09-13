// Test Claude API Integration
require('dotenv').config();
const { AIService, Logger } = require('./services/aiCourseService');

async function testClaudeAPI() {
    console.log('🧪 Testing Claude API Integration...\n');
    
    if (!process.env.ANTHROPIC_API_KEY) {
        console.error('❌ ANTHROPIC_API_KEY not found in .env file');
        console.log('Please add your Claude API key to .env file as:');
        console.log('ANTHROPIC_API_KEY=your_api_key_here');
        process.exit(1);
    }

    const aiService = new AIService();
    
    try {
        console.log('Making test request to Claude API...');
        
        const testPrompt = `
Please respond with a simple JSON object containing a greeting message.

CRITICAL: Return ONLY valid JSON with double quotes. No explanatory text.

Return this JSON:
{
    "status": "success",
    "message": "Hello! Claude API is working correctly.",
    "timestamp": "${new Date().toISOString()}"
}
        `;

        const result = await aiService.generateWithRetries(
            testPrompt, 
            'Claude API Test',
            { maxRetries: 3, timeout: 30000 }
        );

        console.log('✅ Claude API Test Successful!');
        console.log('Response:', JSON.stringify(result, null, 2));
        console.log('\n🎉 Ready to generate courses with Claude API!');

    } catch (error) {
        console.error('❌ Claude API Test Failed:');
        console.error('Error:', error.message);
        
        if (error.message.includes('authentication')) {
            console.log('\n💡 Make sure your ANTHROPIC_API_KEY is valid');
        } else if (error.message.includes('quota') || error.message.includes('rate limit')) {
            console.log('\n💡 Check your API quota/rate limits');
        } else {
            console.log('\n💡 Check your internet connection and API key');
        }
        
        process.exit(1);
    }
}

testClaudeAPI();