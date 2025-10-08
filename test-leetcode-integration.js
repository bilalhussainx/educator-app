/**
 * =================================================================
 * LEETCODE INTEGRATION TEST
 * =================================================================
 * Test the new LeetCode test runner with a real problem
 */

const LeetCodeTestRunner = require('./educators-edge-backend/services/leetcodeTestRunner');

async function testLeetCodeIntegration() {
    console.log('🧪 Testing LeetCode Integration...\n');

    const testRunner = new LeetCodeTestRunner();

    // Test case 1: Two Sum problem (LeetCode #1)
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
}
`;

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

    console.log('📋 Testing Two Sum Problem:');
    try {
        const results = await testRunner.runTests(
            twoSumCode,
            twoSumTestCases,
            'javascript',
            { functionName: 'twoSum' }
        );

        console.log('✅ Results:', JSON.stringify(results, null, 2));
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Test case 2: Valid Parentheses problem (LeetCode #20)
    const validParenthesesCode = `
function isValid(s) {
    const stack = [];
    const map = {
        ')': '(',
        '}': '{',
        ']': '['
    };

    for (let char of s) {
        if (char in map) {
            if (stack.length === 0 || stack.pop() !== map[char]) {
                return false;
            }
        } else {
            stack.push(char);
        }
    }

    return stack.length === 0;
}
`;

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
        },
        {
            input: ["([)]"],
            expected: false
        }
    ];

    console.log('📋 Testing Valid Parentheses Problem:');
    try {
        const results = await testRunner.runTests(
            validParenthesesCode,
            validParenthesesTestCases,
            'javascript',
            { functionName: 'isValid' }
        );

        console.log('✅ Results:', JSON.stringify(results, null, 2));
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Test case 3: Python test
    const pythonCode = `
def two_sum(nums, target):
    num_map = {}

    for i, num in enumerate(nums):
        complement = target - num

        if complement in num_map:
            return [num_map[complement], i]

        num_map[num] = i

    return []
`;

    const pythonTestCases = [
        {
            input: [[2, 7, 11, 15], 9],
            expected: [0, 1]
        }
    ];

    console.log('📋 Testing Python Two Sum:');
    try {
        const results = await testRunner.runTests(
            pythonCode,
            pythonTestCases,
            'python',
            { functionName: 'two_sum' }
        );

        console.log('✅ Results:', JSON.stringify(results, null, 2));
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Run the test
if (require.main === module) {
    testLeetCodeIntegration()
        .then(() => console.log('\n🎉 LeetCode integration test completed!'))
        .catch(error => console.error('\n💥 Test suite failed:', error));
}

module.exports = testLeetCodeIntegration;