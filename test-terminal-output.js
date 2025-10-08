/**
 * =================================================================
 * TEST TERMINAL OUTPUT FORMAT
 * =================================================================
 * Verify Judge0 service returns proper terminalOutput format
 */

require('dotenv').config();
const Judge0Service = require('./educators-edge-backend/services/judge0Service');

async function testTerminalOutputFormat() {
    console.log('🖥️ Testing Judge0 Terminal Output Format...\n');

    const judge0Service = new Judge0Service();

    const testCode = `
function minSubArrayLen(target, nums) {
    let left = 0;
    let sum = 0;
    let minLen = Infinity;

    for (let right = 0; right < nums.length; right++) {
        sum += nums[right];

        while (sum >= target) {
            minLen = Math.min(minLen, right - left + 1);
            sum -= nums[left];
            left++;
        }
    }

    return minLen === Infinity ? 0 : minLen;
}`;

    const testCases = [
        {
            input: [7, [2,3,1,2,4,3,1]],
            expected: 2
        },
        {
            input: [4, [1,4,4]],
            expected: 1
        }
    ];

    try {
        console.log('📤 Calling Judge0 service...');
        const results = await judge0Service.submitExecution('javascript', testCode, testCases);

        console.log('✅ Judge0 Service Response:');
        console.log(JSON.stringify(results, null, 2));

        console.log('\n🖥️ Terminal Output that AscentIDE would receive:');
        console.log('=' .repeat(60));

        // This simulates what AscentIDE does
        const terminalOutput = `🏛️ Judge0 Execution Results\n` +
                             `Language: javascript\n` +
                             `Total Tests: ${results.totalTests}\n` +
                             `Passed: ${results.passedTests}\n` +
                             `Failed: ${results.failedTests}\n` +
                             `Execution Time: ${results.executionTime}ms\n` +
                             `Memory Usage: ${results.memory}KB\n\n` +
                             results.summary;

        console.log(terminalOutput);
        console.log('=' .repeat(60));

        if (results.testResults && results.testResults.length > 0) {
            console.log('\n📋 Detailed Test Results:');
            results.testResults.forEach(result => {
                const status = result.passed ? '✅' : '❌';
                console.log(`${status} Test ${result.index}: Expected ${JSON.stringify(result.expected)}, Got ${JSON.stringify(result.actual)}`);
            });
        }

    } catch (error) {
        console.error('❌ Test failed:', error.message);

        if (error.message.includes('401') || error.message.includes('Unauthorized')) {
            console.log('\n💡 API Key issue detected');
            console.log('   Make sure JUDGE0_API_KEY is set in your .env file');
        }
    }
}

// Test what happens when AscentIDE processes the response
function simulateAscentIDEProcessing(judge0Results) {
    console.log('\n🎨 Simulating AscentIDE Response Processing...');

    // This is exactly what AscentIDE does
    const responseData = {
        success: judge0Results.success,
        passed: judge0Results.passedTests,
        failed: judge0Results.failedTests,
        total: judge0Results.totalTests,
        executionTime: judge0Results.executionTime,
        memory: judge0Results.memory,
        summary: judge0Results.summary,
        testCaseResults: judge0Results.testResults?.map((result) => ({
            testCase: result.index,
            passed: result.passed,
            input: Array.isArray(result.input) ? result.input.join(', ') : String(result.input),
            expectedOutput: String(result.expected),
            predictedOutput: String(result.actual),
            explanation: result.error || (result.passed ? 'Test passed!' : 'Output does not match expected result'),
            error: result.error
        })) || [],
        terminalOutput: `🏛️ Judge0 Execution Results\n` +
                       `Language: javascript\n` +
                       `Total Tests: ${judge0Results.totalTests}\n` +
                       `Passed: ${judge0Results.passedTests}\n` +
                       `Failed: ${judge0Results.failedTests}\n` +
                       `Execution Time: ${judge0Results.executionTime}ms\n` +
                       `Memory Usage: ${judge0Results.memory}KB\n\n` +
                       judge0Results.summary
    };

    console.log('📺 Terminal Output for AscentIDE:');
    console.log(responseData.terminalOutput);

    return responseData;
}

// Run the test
if (require.main === module) {
    testTerminalOutputFormat()
        .then(() => {
            console.log('\n🎉 Terminal output format test complete!');
            console.log('\n📋 Next steps:');
            console.log('   1. Run your AscentIDE');
            console.log('   2. Execute minimum subarray sum code');
            console.log('   3. Check browser console for terminal output logs');
            console.log('   4. Verify terminal tab shows Judge0 results');
        })
        .catch(console.error);
}

module.exports = { testTerminalOutputFormat, simulateAscentIDEProcessing };