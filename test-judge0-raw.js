/**
 * =================================================================
 * RAW JUDGE0 API TEST
 * =================================================================
 * Test Judge0 API directly without our service layer
 */

require('dotenv').config();

// Use the same axios that Judge0Service uses
const Judge0Service = require('./educators-edge-backend/services/judge0Service');

async function testRawJudge0() {
    console.log('🔬 Raw Judge0 API Test\n');

    // Get the configured client from Judge0Service
    const service = new Judge0Service();

    // Simple test code
    const simpleCode = `console.log("Hello World!");`;
    console.log('📝 Test Code:', simpleCode);

    console.log('\n🧪 Test 1: Plain text submission');
    try {
        const response = await service.client.post('/submissions?wait=true', {
            source_code: simpleCode,  // Plain text (no Base64)
            language_id: 93,  // JavaScript
            cpu_time_limit: 2,
            memory_limit: 64000
        });

        console.log('✅ Response Status:', response.data.status);
        console.log('📋 Raw Response:');
        console.log(JSON.stringify(response.data, null, 2));

        if (response.data.stdout) {
            console.log('\n📤 Raw stdout:', response.data.stdout);

            // Try to decode Base64
            try {
                const decoded = Buffer.from(response.data.stdout, 'base64').toString('utf8');
                console.log('📤 Decoded stdout:', decoded);
            } catch (e) {
                console.log('❌ Base64 decode failed:', e.message);
            }
        }

    } catch (error) {
        console.log('❌ Plain text submission failed:');
        console.log(`   Status: ${error.response?.status}`);
        console.log(`   Error: ${JSON.stringify(error.response?.data, null, 2)}`);
    }

    console.log('\n' + '='.repeat(60));

    console.log('\n🧪 Test 2: Base64 encoded submission');
    try {
        const encodedCode = Buffer.from(simpleCode).toString('base64');
        console.log('🔐 Encoded code:', encodedCode);

        const response = await service.client.post('/submissions?wait=true', {
            source_code: encodedCode,  // Base64 encoded
            language_id: 93,
            cpu_time_limit: 2,
            memory_limit: 64000
        });

        console.log('✅ Base64 Response Status:', response.data.status);

        if (response.data.stdout) {
            console.log('\n📤 Raw stdout:', response.data.stdout);

            try {
                const decoded = Buffer.from(response.data.stdout, 'base64').toString('utf8');
                console.log('📤 Decoded stdout:', decoded);
            } catch (e) {
                console.log('❌ Base64 decode failed:', e.message);
            }
        }

    } catch (error) {
        console.log('❌ Base64 submission failed:');
        console.log(`   Status: ${error.response?.status}`);
        console.log(`   Error: ${JSON.stringify(error.response?.data, null, 2)}`);
    }
}

// Test health check first
async function testHealth() {
    console.log('🏥 Testing Judge0 Health...');

    const service = new Judge0Service();

    try {
        const health = await service.healthCheck();
        console.log('✅ Health Check:', health);
        return true;
    } catch (error) {
        console.log('❌ Health Check Failed:', error.message);
        return false;
    }
}

// Run all tests
if (require.main === module) {
    testHealth()
        .then(healthy => {
            if (healthy) {
                return testRawJudge0();
            } else {
                console.log('❌ Skipping raw tests due to health check failure');
            }
        })
        .then(() => {
            console.log('\n🎉 Raw Judge0 test complete!');
        })
        .catch(console.error);
}

module.exports = { testRawJudge0 };