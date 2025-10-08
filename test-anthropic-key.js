require('dotenv').config({ path: './educators-edge-backend/.env' });

const apiKey = process.env.ANTHROPIC_API_KEY;

console.log('ANTHROPIC_API_KEY exists:', !!apiKey);
if (apiKey) {
    console.log('Key starts with:', apiKey.substring(0, 15) + '...');
    console.log('Key length:', apiKey.length);
}

// Test the API
const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
    apiKey: apiKey
});

async function testAPI() {
    try {
        console.log('\nTesting Claude API...');
        const message = await anthropic.messages.create({
            model: 'claude-3-7-sonnet-20250219',
            max_tokens: 100,
            messages: [{ role: 'user', content: 'Say "API is working" in JSON format: {"status": "working"}' }]
        });

        console.log('✓ API Response received');
        console.log('Response:', message.content[0].text);
    } catch (error) {
        console.error('✗ API Error:', error.message);
        if (error.status) {
            console.error('Status:', error.status);
        }
    }
}

testAPI();
