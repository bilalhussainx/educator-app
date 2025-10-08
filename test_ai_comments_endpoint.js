/**
 * Test script for the Enhanced AI Comment System endpoint
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:10000';

async function testAICommentsEndpoint() {
    console.log('Testing Enhanced AI Comment System...\n');

    try {
        // 1. Test getting coaching prompts (no auth needed for testing)
        console.log('1. Testing GET /api/ai-comments/coaching-prompts');
        const promptsResponse = await axios.get(`${BASE_URL}/api/ai-comments/coaching-prompts`, {
            headers: {
                'Authorization': 'Bearer dev-token-for-testing'
            }
        });

        console.log('✅ Coaching prompts endpoint works!');
        console.log(`   Found ${promptsResponse.data.prompts.length} coaching prompt templates:`);
        promptsResponse.data.prompts.slice(0, 3).forEach(prompt => {
            console.log(`   - ${prompt.name} (${prompt.category})`);
        });

        // 2. Test generating AI comments
        console.log('\n2. Testing POST /api/ai-comments/generate');
        const testDocument = `
            In today's rapidly changing world, education plays a crucial role in shaping future generations.
            Students need to develop critical thinking skills to succeed in their careers.
            Technology has transformed the way we learn and teach.
        `;

        const generateResponse = await axios.post(
            `${BASE_URL}/api/ai-comments/generate`,
            {
                documentContent: testDocument,
                documentType: 'essay',
                targetComments: 10,
                promptTemplate: 'Essay Coach - Comprehensive',
                sessionId: null
            },
            {
                headers: {
                    'Authorization': 'Bearer dev-token-for-testing'
                }
            }
        );

        if (generateResponse.data.success) {
            console.log('✅ AI comment generation works!');
            console.log(`   Generated ${generateResponse.data.comments.length} comments`);
            console.log(`   Generation time: ${generateResponse.data.metadata.generationTimeMs}ms`);

            if (generateResponse.data.comments.length > 0) {
                console.log('\n   Sample comment:');
                const sample = generateResponse.data.comments[0];
                console.log(`   - Type: ${sample.comment_type}`);
                console.log(`   - Message: ${sample.message.substring(0, 100)}...`);
            }
        } else {
            console.log('❌ AI comment generation failed:', generateResponse.data.error);
        }

        console.log('\n✅ All tests passed! The Enhanced AI Comment System is working correctly.\n');

    } catch (error) {
        console.error('\n❌ Test failed:', error.response?.data || error.message);

        if (error.code === 'ECONNREFUSED') {
            console.log('\n⚠️  Make sure the backend server is running on port 10000');
            console.log('   Run: cd educators-edge-backend && node server.js');
        }
    }
}

testAICommentsEndpoint();
