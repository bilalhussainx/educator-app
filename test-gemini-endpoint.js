/**
 * Test Gemini Assistant Endpoint
 */

require('dotenv').config({ path: './educators-edge-backend/.env' });
const axios = require('axios');

async function testGeminiEndpoint() {
    console.log('Testing Gemini Assistant endpoint...\n');

    // Check if API key is loaded
    const apiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
    console.log('API Key loaded:', apiKey ? '✓ Yes' : '✗ No');
    console.log('API Key (first 20 chars):', apiKey ? apiKey.substring(0, 20) + '...' : 'N/A');

    if (!apiKey) {
        console.error('\n❌ No API key found in environment variables');
        return;
    }

    // Test direct Claude API call with different models
    console.log('\n1. Testing direct Claude API call...');

    const modelsToTest = [
        'claude-3-5-sonnet-20241022',
        'claude-3-5-sonnet-20240620',
        'claude-3-opus-20240229',
        'claude-3-sonnet-20240229',
        'claude-3-haiku-20240307'
    ];

    for (const model of modelsToTest) {
        try {
            console.log(`\n  Testing model: ${model}...`);
            const response = await axios.post('https://api.anthropic.com/v1/messages', {
                model: model,
                max_tokens: 100,
                messages: [{
                    role: 'user',
                    content: 'Say "Hello" in one word'
                }]
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01'
                },
                timeout: 30000
            });

            console.log(`  ✓ ${model} works!`);
            console.log('  Response:', response.data.content[0].text);
            console.log(`\n✅ Using model: ${model}`);
            break;
        } catch (error) {
            console.error(`  ✗ ${model} failed:`, error.response?.data?.error?.message || error.message);
        }
    }

    // Test backend endpoint (requires server to be running)
    console.log('\n2. Testing backend endpoint...');
    try {
        const response = await axios.post('http://localhost:5000/api/gemini-assistant/quick-action', {
            action: 'rewrite',
            selectedText: 'This is a test sentence.',
            documentContext: '',
            cursorPosition: 0
        }, {
            timeout: 30000
        });

        console.log('✓ Backend endpoint successful');
        console.log('Response:', response.data);
    } catch (error) {
        console.error('✗ Backend endpoint failed');
        if (error.code === 'ECONNREFUSED') {
            console.error('❌ Backend server is not running on port 5000');
        } else {
            console.error('Status:', error.response?.status);
            console.error('Error:', error.response?.data || error.message);
        }
    }
}

testGeminiEndpoint().catch(console.error);
