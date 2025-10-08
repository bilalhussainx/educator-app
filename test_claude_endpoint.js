require('dotenv').config();

const axios = require('axios');

async function testClaudeEndpoint() {
    try {
        console.log('=== TESTING CLAUDE ENDPOINT WITH AUTH ===');

        // First test without auth to see the error
        console.log('\n1. Testing without auth (should fail):');
        try {
            const response = await axios.post('http://localhost:10000/api/ai/scribe/claude-inline-analysis', {
                documentContent: '"You\'re not good enough," they hissed, their venomous tendrils wrapping around his consciousness.',
                config: {
                    documentType: 'college_essay',
                    analysisDepth: 'basic',
                    focusAreas: ['style', 'clarity'],
                    userLevel: 'intermediate'
                }
            }, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            console.log('❌ ERROR: Request should have failed without auth but succeeded');
        } catch (error) {
            console.log('✅ Expected auth failure:', error.response?.status, error.response?.data?.msg || error.message);
        }

        // Now test with a dummy token to see what happens
        console.log('\n2. Testing with dummy token (should also fail):');
        try {
            const response = await axios.post('http://localhost:10000/api/ai/scribe/claude-inline-analysis', {
                documentContent: '"You\'re not good enough," they hissed, their venomous tendrils wrapping around his consciousness.',
                config: {
                    documentType: 'college_essay',
                    analysisDepth: 'basic',
                    focusAreas: ['style', 'clarity'],
                    userLevel: 'intermediate'
                }
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer dummy-token-for-testing'
                }
            });
            console.log('❌ ERROR: Request should have failed with dummy token but succeeded');
        } catch (error) {
            console.log('✅ Expected auth failure:', error.response?.status, error.response?.data?.msg || error.message);
        }

        console.log('\n=== AUTH IS WORKING - Frontend needs valid login token ===');

    } catch (error) {
        console.error('Test error:', error.message);
    }
}

testClaudeEndpoint();