const vm = require('vm');

// Test the function detection logic
const userCode = `
/**
 * @param {string} s
 * @return {number}
 */
var lengthOfLongestSubstring = function(s) {
    const set = new Set();
    let l = 0;
    let max = 0;

    for (let r = 0; r < s.length; r++) {
        while (set.has(s[r])) {
            set.delete(s[l]);
            l++;
        }
        set.add(s[r]);
        max = Math.max(max, set.size);
    }
    return max;
};
`;

const context = {
    console: { log: console.log, error: console.error },
    Math, Array, Object, String, Number, Boolean, JSON, Date, RegExp,
    parseInt, parseFloat, isNaN, isFinite
};

try {
    // Execute user code
    vm.runInNewContext(userCode, context, { timeout: 5000 });

    console.log('Available functions in context:');
    for (const key in context) {
        if (typeof context[key] === 'function' &&
            !['Array', 'Object', 'String', 'Number', 'Boolean', 'Math', 'JSON', 'Date', 'RegExp', 'parseInt', 'parseFloat', 'isNaN', 'isFinite'].includes(key)) {
            console.log('Found function:', key, typeof context[key]);
        }
    }

    // Test the function
    if (typeof context.lengthOfLongestSubstring === 'function') {
        const result = context.lengthOfLongestSubstring("abcabcbb");
        console.log('Test result:', result);
        console.log('Expected: 3, Got:', result, result === 3 ? '✅' : '❌');
    } else {
        console.log('❌ Function not found in context');
    }

} catch (error) {
    console.error('Error:', error.message);
}