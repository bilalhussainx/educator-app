/**
 * =================================================================
 * JUDGE0 INTEGRATION TEST
 * =================================================================
 * Test the complete Judge0 integration with Test Harness Generation
 */

const Judge0Service = require('./educators-edge-backend/services/judge0Service');

async function testJudge0Integration() {
    console.log('🧪 Testing Judge0 Integration with Test Harness Generation...\n');

    const judge0Service = new Judge0Service();

    // Test case 1: Two Sum problem (JavaScript)
    console.log('📋 Test 1: JavaScript Two Sum Problem');
    console.log('=' .repeat(50));

    const twoSumCode = `
function twoSum(nums, target) {
    const map = new Map();

    for (let i = 0; i < nums.length; i++) {
        const complement = target - nums[i];

        if (map.has(complement)) {
            return [map.get(complement), i];
        }

        map.set(nums[i], i);
    }

    return [];
}`;

    const twoSumTestCases = [
        {
            input: [[2, 7, 11, 15], 9],
            expected: [0, 1]
        },
        {
            input: [[3, 2, 4], 6],
            expected: [1, 2]
        },
        {
            input: [[3, 3], 6],
            expected: [0, 1]
        }
    ];

    try {
        const jsResults = await judge0Service.submitExecution(
            'javascript',
            twoSumCode,
            twoSumTestCases,
            { functionName: 'twoSum' }
        );

        console.log('✅ JavaScript Results:');
        console.log(`   Success: ${jsResults.success}`);
        console.log(`   Passed: ${jsResults.passedTests}/${jsResults.totalTests}`);
        console.log(`   Execution Time: ${jsResults.executionTime}ms`);
        console.log(`   Summary: ${jsResults.summary}`);
        if (jsResults.testResults) {
            jsResults.testResults.forEach(result => {
                const status = result.passed ? '✅' : '❌';
                console.log(`   ${status} Test ${result.index}: Expected ${JSON.stringify(result.expected)}, Got ${JSON.stringify(result.actual)}`);
            });
        }
    } catch (error) {
        console.error('❌ JavaScript test failed:', error.message);
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Test case 2: Valid Parentheses problem (Python)
    console.log('📋 Test 2: Python Valid Parentheses Problem');
    console.log('=' .repeat(50));

    const validParenthesesCode = `
def isValid(s):
    stack = []
    mapping = {')': '(', '}': '{', ']': '['}

    for char in s:
        if char in mapping:
            if not stack or stack.pop() != mapping[char]:
                return False
        else:
            stack.append(char)

    return not stack`;

    const validParenthesesTestCases = [
        {
            input: ["()"],
            expected: true
        },
        {
            input: ["()[]{}"],
            expected: true
        },
        {
            input: ["(]"],
            expected: false
        }
    ];

    try {
        const pythonResults = await judge0Service.submitExecution(
            'python',
            validParenthesesCode,
            validParenthesesTestCases,
            { functionName: 'isValid' }
        );

        console.log('✅ Python Results:');
        console.log(`   Success: ${pythonResults.success}`);
        console.log(`   Passed: ${pythonResults.passedTests}/${pythonResults.totalTests}`);
        console.log(`   Execution Time: ${pythonResults.executionTime}ms`);
        console.log(`   Summary: ${pythonResults.summary}`);
        if (pythonResults.testResults) {
            pythonResults.testResults.forEach(result => {
                const status = result.passed ? '✅' : '❌';
                console.log(`   ${status} Test ${result.index}: Expected ${JSON.stringify(result.expected)}, Got ${JSON.stringify(result.actual)}`);
            });
        }
    } catch (error) {
        console.error('❌ Python test failed:', error.message);
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Test case 3: Error handling (Invalid code)
    console.log('📋 Test 3: Error Handling (Invalid JavaScript Code)');
    console.log('=' .repeat(50));

    const invalidCode = `
function brokenFunction(nums) {
    // This code has syntax errors
    return nums.filter(x => x >
}`;

    const simpleTestCase = [
        {
            input: [[1, 2, 3]],
            expected: [2, 3]
        }
    ];

    try {
        const errorResults = await judge0Service.submitExecution(
            'javascript',
            invalidCode,
            simpleTestCase
        );

        console.log('✅ Error handling Results:');
        console.log(`   Success: ${errorResults.success}`);
        console.log(`   Error: ${errorResults.error}`);
        console.log(`   Details: ${errorResults.details}`);
    } catch (error) {
        console.error('❌ Error handling test failed:', error.message);
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Test case 4: Health check
    console.log('📋 Test 4: Judge0 Health Check');
    console.log('=' .repeat(50));

    try {
        const healthStatus = await judge0Service.healthCheck();
        console.log('✅ Health Check Results:');
        console.log(`   Status: ${healthStatus.status}`);
        console.log(`   Judge0 Version: ${healthStatus.judge0Version || 'Unknown'}`);
        console.log(`   Available Languages: ${healthStatus.availableLanguages}`);
    } catch (error) {
        console.error('❌ Health check failed:', error.message);
    }
}

// Test harness generation specifically
function testHarnessGeneration() {
    console.log('\n🔧 Testing Test Harness Generation...\n');

    const judge0Service = new Judge0Service();

    const sampleCode = `
function add(a, b) {
    return a + b;
}`;

    const sampleTestCases = [
        { input: [2, 3], expected: 5 },
        { input: [0, 0], expected: 0 }
    ];

    const harness = judge0Service.generateTestHarness(
        sampleCode,
        sampleTestCases,
        'javascript',
        { functionName: 'add' }
    );

    console.log('📝 Generated JavaScript Test Harness:');
    console.log('-'.repeat(60));
    console.log(harness);
    console.log('-'.repeat(60));
}

// Run the complete test suite
if (require.main === module) {
    console.log('🚀 Starting Judge0 Integration Test Suite\n');

    Promise.resolve()
        .then(testHarnessGeneration)
        .then(testJudge0Integration)
        .then(() => {
            console.log('\n🎉 Judge0 Integration Test Suite Completed!');
            console.log('\n📋 Next Steps:');
            console.log('   1. Sign up for Judge0 API at: https://rapidapi.com/judge0-official/api/judge0-ce');
            console.log('   2. Add JUDGE0_API_KEY to your environment variables');
            console.log('   3. Deploy to production and test with real API');
        })
        .catch(error => {
            console.error('\n💥 Test suite failed:', error.message);
            console.log('\n⚠️  This is expected if JUDGE0_API_KEY is not configured');
            console.log('   Sign up at: https://rapidapi.com/judge0-official/api/judge0-ce');
        });
}

module.exports = { testJudge0Integration, testHarnessGeneration };