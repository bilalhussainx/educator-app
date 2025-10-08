/**
 * Test script for LeetCode APIs without requiring Claude API key
 */

const axios = require('axios');

async function testLeetCodeAPIs() {
    console.log('🧪 Testing LeetCode APIs...\n');

    const apis = [
        {
            name: 'alfa-leetcode-api (problems list)',
            url: 'https://alfa-leetcode-api.onrender.com/problems?limit=5'
        },
        {
            name: 'alfa-leetcode-api (daily problem)',
            url: 'https://alfa-leetcode-api.onrender.com/daily'
        },
        {
            name: 'leetcode-api-pied (daily)',
            url: 'https://leetcode-api-pied.vercel.app/daily'
        },
        {
            name: 'leetcode-api-pied (problems)',
            url: 'https://leetcode-api-pied.vercel.app/problems'
        }
    ];

    let workingApis = 0;
    const results = [];

    for (const api of apis) {
        try {
            console.log(`🔍 Testing: ${api.name}`);
            const response = await axios.get(api.url, {
                timeout: 15000,
                headers: {
                    'User-Agent': 'LeetCode-Course-Generator/1.0'
                }
            });

            console.log(`✅ ${api.name} - Status: ${response.status}`);

            if (response.data) {
                if (Array.isArray(response.data)) {
                    console.log(`   📊 Response: Array with ${response.data.length} items`);
                    if (response.data.length > 0) {
                        console.log(`   📝 Sample item:`, JSON.stringify(response.data[0], null, 2).substring(0, 200) + '...');
                    }
                } else if (response.data.problems && Array.isArray(response.data.problems)) {
                    console.log(`   📊 Response: Object with ${response.data.problems.length} problems`);
                    if (response.data.problems.length > 0) {
                        console.log(`   📝 Sample problem:`, JSON.stringify(response.data.problems[0], null, 2).substring(0, 200) + '...');
                    }
                } else {
                    console.log(`   📊 Response type: ${typeof response.data}`);
                    console.log(`   📝 Sample data:`, JSON.stringify(response.data, null, 2).substring(0, 200) + '...');
                }
            }

            workingApis++;
            results.push({ ...api, status: 'working', data: response.data });

        } catch (error) {
            console.log(`❌ ${api.name} - Error: ${error.message}`);
            if (error.response) {
                console.log(`   Status: ${error.response.status} ${error.response.statusText}`);
            }
            results.push({ ...api, status: 'failed', error: error.message });
        }
        console.log('');
    }

    console.log('📋 Summary:');
    console.log(`✅ Working APIs: ${workingApis}/${apis.length}`);
    console.log(`❌ Failed APIs: ${apis.length - workingApis}/${apis.length}`);

    if (workingApis > 0) {
        console.log('\n🎉 Good news! At least one API is working.');
        console.log('The enhanced LeetCode generator can fetch real problem data.');
    } else {
        console.log('\n⚠️ No APIs are currently working.');
        console.log('The system will fall back to mock problem data.');
    }

    // Test specific problem fetching if any API worked
    if (workingApis > 0) {
        console.log('\n🔍 Testing specific problem fetching...');
        await testSpecificProblemFetching();
    }

    return results;
}

async function testSpecificProblemFetching() {
    try {
        // Test fetching problems by difficulty
        const response = await axios.get('https://alfa-leetcode-api.onrender.com/problems', {
            params: {
                limit: 3,
                difficulty: 'EASY'
            },
            timeout: 10000
        });

        if (response.data && response.data.problems) {
            console.log(`✅ Fetched ${response.data.problems.length} easy problems:`);
            response.data.problems.forEach((problem, index) => {
                console.log(`   ${index + 1}. ${problem.title} (${problem.difficulty})`);
            });
        }

    } catch (error) {
        console.log(`⚠️ Specific problem fetching failed: ${error.message}`);
    }
}

// Run the test
if (require.main === module) {
    testLeetCodeAPIs().catch(console.error);
}

module.exports = { testLeetCodeAPIs };