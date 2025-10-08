/**
 * =================================================================
 * TEST DIRECT EXECUTION ENDPOINT
 * =================================================================
 * Test the /api/terminal/execute-code-direct endpoint directly
 */

require('dotenv').config();

// Create a simple test using native HTTP
const http = require('http');

function testEndpoint() {
    console.log('🧪 Testing Direct Execution Endpoint...\n');

    const testData = JSON.stringify({
        code: `
function greet(name) {
    console.log("Hello, " + name + "!");
}

greet("World");
greet("AscentIDE");
`,
        language: 'javascript',
        problemMeta: {
            title: 'Direct Test',
            type: 'direct_execution'
        }
    });

    const options = {
        hostname: 'localhost',
        port: 10000,
        path: '/api/terminal/execute-code-direct',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': testData.length,
            'Authorization': 'Bearer dummy-token-for-test' // Add a dummy token
        }
    };

    console.log('📡 Making request to:', `http://localhost:10000${options.path}`);
    console.log('📝 Payload size:', testData.length, 'bytes');

    const req = http.request(options, (res) => {
        console.log('✅ Response status:', res.statusCode);
        console.log('📋 Response headers:', res.headers);

        let responseData = '';

        res.on('data', (chunk) => {
            responseData += chunk;
        });

        res.on('end', () => {
            console.log('\n📤 Response body:');
            try {
                const parsed = JSON.parse(responseData);
                console.log(JSON.stringify(parsed, null, 2));

                if (parsed.terminalOutput) {
                    console.log('\n📺 Terminal Output:');
                    console.log(parsed.terminalOutput);
                }
            } catch (e) {
                console.log('Raw response:', responseData);
            }
        });
    });

    req.on('error', (error) => {
        console.error('❌ Request failed:', error.message);

        if (error.code === 'ECONNREFUSED') {
            console.log('\n💡 Connection refused suggests:');
            console.log('   - Backend server is not running on port 10000');
            console.log('   - Port is blocked or different');
            console.log('   - Check if server.js is actually listening');
        }
    });

    req.write(testData);
    req.end();
}

// Also test the health endpoint
function testHealthEndpoint() {
    console.log('\n🏥 Testing Health Endpoint...\n');

    const options = {
        hostname: 'localhost',
        port: 10000,
        path: '/api/terminal/health',
        method: 'GET'
    };

    const req = http.request(options, (res) => {
        console.log('✅ Health status:', res.statusCode);

        let responseData = '';
        res.on('data', (chunk) => {
            responseData += chunk;
        });

        res.on('end', () => {
            try {
                const parsed = JSON.parse(responseData);
                console.log('🏥 Health response:', JSON.stringify(parsed, null, 2));
            } catch (e) {
                console.log('Health response:', responseData);
            }
        });
    });

    req.on('error', (error) => {
        console.error('❌ Health check failed:', error.message);
    });

    req.end();
}

// Run tests
if (require.main === module) {
    testHealthEndpoint();

    setTimeout(() => {
        testEndpoint();
    }, 1000);

    setTimeout(() => {
        console.log('\n🎉 Endpoint tests complete!');
        process.exit(0);
    }, 5000);
}

module.exports = { testEndpoint };