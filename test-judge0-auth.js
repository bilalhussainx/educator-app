/**
 * =================================================================
 * TEST JUDGE0 API AUTHENTICATION
 * =================================================================
 * Verify Judge0 API key and connectivity
 */

require('dotenv').config();
const axios = require('axios');

async function testJudge0Auth() {
    console.log('🔐 Testing Judge0 API Authentication...\n');

    const apiKey = process.env.JUDGE0_API_KEY;
    const baseURL = process.env.JUDGE0_API_URL || 'https://judge0-ce.p.rapidapi.com';

    console.log('📋 Configuration:');
    console.log(`   API URL: ${baseURL}`);
    console.log(`   API Key: ${apiKey ? apiKey.substring(0, 10) + '...' : 'NOT SET'}`);
    console.log('');

    if (!apiKey) {
        console.log('❌ JUDGE0_API_KEY not found in environment variables');
        console.log('💡 Please check your .env file');
        return;
    }

    // Test 1: System Info (basic connectivity)
    console.log('🧪 Test 1: System Info (GET /system_info)');
    try {
        const response = await axios.get(`${baseURL}/system_info`, {
            headers: {
                'X-RapidAPI-Key': apiKey,
                'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com'
            }
        });

        console.log('✅ System Info Response:');
        console.log(JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.log('❌ System Info Failed:');
        console.log(`   Status: ${error.response?.status}`);
        console.log(`   Message: ${error.response?.data?.error || error.message}`);
    }

    console.log('\n' + '='.repeat(60));

    // Test 2: Languages List
    console.log('🧪 Test 2: Languages (GET /languages)');
    try {
        const response = await axios.get(`${baseURL}/languages`, {
            headers: {
                'X-RapidAPI-Key': apiKey,
                'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com'
            }
        });

        console.log('✅ Available Languages:');
        const jsLang = response.data.find(lang => lang.id === 93);
        const pyLang = response.data.find(lang => lang.id === 92);
        console.log(`   JavaScript (93): ${jsLang?.name || 'Not found'}`);
        console.log(`   Python (92): ${pyLang?.name || 'Not found'}`);
        console.log(`   Total Languages: ${response.data.length}`);
    } catch (error) {
        console.log('❌ Languages Failed:');
        console.log(`   Status: ${error.response?.status}`);
        console.log(`   Message: ${error.response?.data?.error || error.message}`);
    }

    console.log('\n' + '='.repeat(60));

    // Test 3: Simple Code Submission
    console.log('🧪 Test 3: Simple Submission (POST /submissions?wait=true)');
    try {
        const testCode = 'console.log("Hello from Judge0!");';
        const response = await axios.post(`${baseURL}/submissions?wait=true`, {
            source_code: testCode,
            language_id: 93, // JavaScript
            stdin: '',
            cpu_time_limit: 2,
            memory_limit: 64000
        }, {
            headers: {
                'Content-Type': 'application/json',
                'X-RapidAPI-Key': apiKey,
                'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com'
            }
        });

        console.log('✅ Submission Response:');
        console.log(`   Status: ${response.data.status?.description}`);
        console.log(`   Status ID: ${response.data.status?.id}`);

        if (response.data.stdout) {
            console.log(`   Output: ${response.data.stdout}`);
        }

        if (response.data.stderr) {
            console.log(`   Error: ${response.data.stderr}`);
        }

    } catch (error) {
        console.log('❌ Submission Failed:');
        console.log(`   Status: ${error.response?.status}`);
        console.log(`   Status Text: ${error.response?.statusText}`);
        console.log(`   Data: ${JSON.stringify(error.response?.data, null, 2)}`);

        if (error.response?.status === 401) {
            console.log('\n💡 401 Unauthorized suggests:');
            console.log('   - Invalid API key');
            console.log('   - Expired API key');
            console.log('   - Incorrect headers');
            console.log('   - API key not properly configured');
        }
    }
}

// Test alternative Judge0 endpoints
async function testAlternativeEndpoints() {
    console.log('\n' + '='.repeat(60));
    console.log('🔄 Testing Alternative Judge0 Endpoints...');

    const apiKey = process.env.JUDGE0_API_KEY;

    // Try different base URLs
    const alternativeUrls = [
        'https://judge0-ce.p.rapidapi.com',
        'https://ce.judge0.com',
        'https://api.judge0.com'
    ];

    for (const baseURL of alternativeUrls) {
        console.log(`\n🧪 Testing: ${baseURL}`);

        try {
            const response = await axios.get(`${baseURL}/system_info`, {
                headers: {
                    'X-RapidAPI-Key': apiKey,
                    'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com'
                },
                timeout: 5000
            });

            console.log(`✅ ${baseURL} - Working!`);
            console.log(`   Version: ${response.data?.version}`);
            break;

        } catch (error) {
            console.log(`❌ ${baseURL} - Failed: ${error.response?.status || error.code}`);
        }
    }
}

// Run tests
if (require.main === module) {
    testJudge0Auth()
        .then(() => testAlternativeEndpoints())
        .then(() => {
            console.log('\n🎉 Judge0 authentication tests complete!');
        })
        .catch(console.error);
}

module.exports = { testJudge0Auth };