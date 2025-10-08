require('dotenv').config();
const Judge0Service = require('./educators-edge-backend/services/judge0Service');

async function testSimple() {
    console.log('🧪 Testing Judge0 with API key:', process.env.JUDGE0_API_KEY ? 'Found' : 'Missing');

    const judge0Service = new Judge0Service();

    const code = `
function twoSum(nums, target) {
    for (let i = 0; i < nums.length; i++) {
        for (let j = i + 1; j < nums.length; j++) {
            if (nums[i] + nums[j] === target) {
                return [i, j];
            }
        }
    }
    return [];
}`;

    const testCases = [
        { input: [[2, 7, 11, 15], 9], expected: [0, 1] }
    ];

    try {
        const result = await judge0Service.submitExecution('javascript', code, testCases);
        console.log('✅ Result:', JSON.stringify(result, null, 2));
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testSimple();