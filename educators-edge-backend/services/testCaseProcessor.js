class TestCaseProcessor {
    constructor() {
        console.log('🧹 Test Case Processor initialized');
    }

    /**
     * Process and clean test cases for LeetCode-style problems
     * @param {Array} rawTestCases - Raw test cases from the lesson
     * @param {string} problemType - Type of problem to determine parsing strategy
     * @param {string} language - Programming language for type conversions
     * @returns {Array} - Cleaned and validated test cases
     */
    processTestCases(rawTestCases, problemType = 'generic', language = 'javascript') {
        try {
            console.log('🔍 [DEBUG] Raw input to processTestCases:', {
                type: typeof rawTestCases,
                isArray: Array.isArray(rawTestCases),
                length: rawTestCases?.length,
                content: rawTestCases
            });

            if (!Array.isArray(rawTestCases)) {
                console.warn('⚠️ Raw test cases is not an array:', typeof rawTestCases);
                return [];
            }

            if (rawTestCases.length === 0) {
                console.warn('⚠️ Raw test cases array is empty');
                return [];
            }

            console.log(`🧹 Processing ${rawTestCases.length} test cases for ${problemType} (${language})`);
            console.log('📋 First test case sample:', rawTestCases[0]);

            const cleanedTestCases = rawTestCases.map((testCase, index) => {
                try {
                    console.log(`🔄 Processing test case ${index + 1}:`, testCase);
                    const cleaned = this.cleanTestCase(testCase, index, problemType, language);
                    console.log(`✅ Cleaned test case ${index + 1}:`, cleaned);
                    return cleaned;
                } catch (error) {
                    console.error(`❌ Failed to clean test case ${index + 1}:`, error.message);
                    console.error('📄 Original test case:', testCase);
                    return this.createErrorTestCase(testCase, index, error);
                }
            });

            const validTestCases = cleanedTestCases.filter(tc => tc !== null && typeof tc === 'object');
            console.log(`✅ Successfully processed ${validTestCases.length}/${rawTestCases.length} test cases`);
            console.log('📋 Final processed test cases:', validTestCases);

            // Ensure we always return an array
            if (!Array.isArray(validTestCases)) {
                console.error('❌ validTestCases is not an array!', typeof validTestCases, validTestCases);
                return [];
            }

            return validTestCases;

        } catch (error) {
            console.error('❌ Test case processing failed:', error);
            console.error('📄 Raw test cases that caused error:', rawTestCases);
            return [];
        }
    }

    /**
     * Clean and validate a single test case
     * @param {Object} testCase - Raw test case
     * @param {number} index - Test case index
     * @param {string} problemType - Problem type
     * @param {string} language - Programming language
     * @returns {Object} - Cleaned test case
     */
    cleanTestCase(testCase, index, problemType, language) {
        console.log(`🔍 Cleaning test case ${index + 1}:`, testCase);

        // Ensure test case has required structure
        if (!testCase || typeof testCase !== 'object') {
            console.error(`❌ Test case ${index + 1} is not an object:`, typeof testCase, testCase);
            throw new Error(`Test case must be an object, got ${typeof testCase}`);
        }

        // Extract input and output with detailed logging
        let input = testCase.input;
        let output = testCase.output || testCase.expected || testCase.expectedOutput;

        console.log(`🔍 Test case ${index + 1} fields:`, {
            hasInput: 'input' in testCase,
            hasOutput: 'output' in testCase,
            hasExpected: 'expected' in testCase,
            hasExpectedOutput: 'expectedOutput' in testCase,
            inputValue: input,
            outputValue: output,
            allKeys: Object.keys(testCase)
        });

        if (input === undefined) {
            console.error(`❌ Test case ${index + 1} missing input field`);
            throw new Error('Test case missing input field');
        }

        if (output === undefined) {
            console.error(`❌ Test case ${index + 1} missing output field`);
            throw new Error('Test case missing output field (tried: output, expected, expectedOutput)');
        }

        // Clean and parse input
        const cleanedInput = this.cleanInput(input, problemType, language);

        // Clean and parse output
        const cleanedOutput = this.cleanOutput(output, problemType, language);

        // Validate the cleaned data
        this.validateTestCase(cleanedInput, cleanedOutput, problemType);

        return {
            input: cleanedInput,
            output: cleanedOutput,
            description: testCase.description || `Test case ${index + 1}`,
            originalInput: input,
            originalOutput: output
        };
    }

    /**
     * Clean and parse input data
     * @param {any} input - Raw input
     * @param {string} problemType - Problem type
     * @param {string} language - Programming language
     * @returns {any} - Cleaned input
     */
    cleanInput(input, problemType, language) {
        // Handle string inputs that need parsing
        if (typeof input === 'string') {
            try {
                // Try to parse as JSON first
                const parsed = JSON.parse(input);
                return this.cleanInput(parsed, problemType, language);
            } catch (e) {
                // Handle special string formats
                return this.parseSpecialStringFormats(input, language);
            }
        }

        // Handle arrays
        if (Array.isArray(input)) {
            return input.map(item => this.cleanValue(item, language));
        }

        // Handle objects
        if (typeof input === 'object' && input !== null) {
            const cleaned = {};
            for (const [key, value] of Object.entries(input)) {
                cleaned[key] = this.cleanValue(value, language);
            }
            return cleaned;
        }

        // Handle primitive values
        return this.cleanValue(input, language);
    }

    /**
     * Clean and parse output data
     * @param {any} output - Raw output
     * @param {string} problemType - Problem type
     * @param {string} language - Programming language
     * @returns {any} - Cleaned output
     */
    cleanOutput(output, problemType, language) {
        // Same cleaning logic as input
        return this.cleanInput(output, problemType, language);
    }

    /**
     * Clean individual values based on language requirements
     * @param {any} value - Raw value
     * @param {string} language - Programming language
     * @returns {any} - Cleaned value
     */
    cleanValue(value, language) {
        if (value === null || value === undefined) {
            return null;
        }

        // Handle numbers
        if (typeof value === 'string' && /^-?\d+(\.\d+)?$/.test(value.trim())) {
            const num = parseFloat(value);
            return Number.isInteger(num) ? parseInt(value) : num;
        }

        // Handle booleans
        if (typeof value === 'string') {
            const lowered = value.toLowerCase().trim();
            if (lowered === 'true') return true;
            if (lowered === 'false') return false;
            if (lowered === 'null') return null;
        }

        // Handle arrays represented as strings
        if (typeof value === 'string' && value.trim().startsWith('[') && value.trim().endsWith(']')) {
            try {
                const parsed = JSON.parse(value);
                if (Array.isArray(parsed)) {
                    return parsed.map(item => this.cleanValue(item, language));
                }
            } catch (e) {
                // Try manual parsing for malformed arrays
                return this.parseArrayString(value, language);
            }
        }

        // Handle objects represented as strings
        if (typeof value === 'string' && value.trim().startsWith('{') && value.trim().endsWith('}')) {
            try {
                const parsed = JSON.parse(value);
                const cleaned = {};
                for (const [key, val] of Object.entries(parsed)) {
                    cleaned[key] = this.cleanValue(val, language);
                }
                return cleaned;
            } catch (e) {
                console.warn('Failed to parse object string:', value);
            }
        }

        // Language-specific cleaning
        switch (language.toLowerCase()) {
            case 'python':
                return this.cleanValueForPython(value);
            case 'java':
                return this.cleanValueForJava(value);
            case 'javascript':
                return this.cleanValueForJavaScript(value);
            default:
                return value;
        }
    }

    /**
     * Parse special string formats commonly used in LeetCode
     * @param {string} input - String input
     * @param {string} language - Programming language
     * @returns {any} - Parsed value
     */
    parseSpecialStringFormats(input, language) {
        const trimmed = input.trim();

        // Handle ranges like "1-100"
        if (/^\d+-\d+$/.test(trimmed)) {
            const [start, end] = trimmed.split('-').map(n => parseInt(n));
            return { start, end };
        }

        // Handle coordinate pairs like "(1,2)"
        if (/^\(\s*-?\d+\s*,\s*-?\d+\s*\)$/.test(trimmed)) {
            const match = trimmed.match(/\(\s*(-?\d+)\s*,\s*(-?\d+)\s*\)/);
            return [parseInt(match[1]), parseInt(match[2])];
        }

        // Handle quoted strings
        if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
            (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
            return trimmed.slice(1, -1);
        }

        return trimmed;
    }

    /**
     * Parse array strings manually for malformed JSON
     * @param {string} arrayStr - Array string
     * @param {string} language - Programming language
     * @returns {Array} - Parsed array
     */
    parseArrayString(arrayStr, language) {
        try {
            // Remove brackets and split by comma
            const content = arrayStr.trim().slice(1, -1);
            if (!content.trim()) return [];

            const items = [];
            let current = '';
            let depth = 0;
            let inString = false;
            let stringChar = '';

            for (let i = 0; i < content.length; i++) {
                const char = content[i];

                if (!inString && (char === '"' || char === "'")) {
                    inString = true;
                    stringChar = char;
                    current += char;
                } else if (inString && char === stringChar) {
                    inString = false;
                    current += char;
                } else if (!inString && (char === '[' || char === '{')) {
                    depth++;
                    current += char;
                } else if (!inString && (char === ']' || char === '}')) {
                    depth--;
                    current += char;
                } else if (!inString && char === ',' && depth === 0) {
                    items.push(this.cleanValue(current.trim(), language));
                    current = '';
                } else {
                    current += char;
                }
            }

            if (current.trim()) {
                items.push(this.cleanValue(current.trim(), language));
            }

            return items;

        } catch (error) {
            console.warn('Failed to manually parse array string:', arrayStr);
            return [];
        }
    }

    /**
     * Python-specific value cleaning
     * @param {any} value - Raw value
     * @returns {any} - Python-compatible value
     */
    cleanValueForPython(value) {
        if (typeof value === 'string') {
            // Handle Python None
            if (value.toLowerCase() === 'none') return null;

            // Handle Python True/False
            if (value === 'True') return true;
            if (value === 'False') return false;
        }
        return value;
    }

    /**
     * Java-specific value cleaning
     * @param {any} value - Raw value
     * @returns {any} - Java-compatible value
     */
    cleanValueForJava(value) {
        if (typeof value === 'string') {
            // Handle Java null
            if (value.toLowerCase() === 'null') return null;
        }
        return value;
    }

    /**
     * JavaScript-specific value cleaning
     * @param {any} value - Raw value
     * @returns {any} - JavaScript-compatible value
     */
    cleanValueForJavaScript(value) {
        if (typeof value === 'string') {
            // Handle JavaScript undefined
            if (value.toLowerCase() === 'undefined') return undefined;
        }
        return value;
    }

    /**
     * Validate cleaned test case data
     * @param {any} input - Cleaned input
     * @param {any} output - Cleaned output
     * @param {string} problemType - Problem type
     */
    validateTestCase(input, output, problemType) {
        // Basic validation
        if (input === undefined) {
            throw new Error('Input cannot be undefined after cleaning');
        }

        // Problem-specific validation could be added here
        switch (problemType.toLowerCase()) {
            case 'array':
                this.validateArrayProblem(input, output);
                break;
            case 'string':
                this.validateStringProblem(input, output);
                break;
            case 'number':
                this.validateNumberProblem(input, output);
                break;
            case 'tree':
                this.validateTreeProblem(input, output);
                break;
            case 'graph':
                this.validateGraphProblem(input, output);
                break;
            // Add more problem types as needed
        }
    }

    validateArrayProblem(input, output) {
        // Validate array problem inputs
        if (Array.isArray(input)) {
            if (input.some(item => typeof item === 'object' && item === null)) {
                console.warn('Array contains null values, might cause issues');
            }
        }
    }

    validateStringProblem(input, output) {
        // Validate string problem inputs
        if (typeof input === 'string' && input.includes('\\n')) {
            console.warn('String contains literal newline characters');
        }
    }

    validateNumberProblem(input, output) {
        // Validate number problem inputs
        if (Array.isArray(input)) {
            const hasNonNumbers = input.some(item =>
                typeof item !== 'number' && !Number.isInteger(parseFloat(item))
            );
            if (hasNonNumbers) {
                console.warn('Number problem contains non-numeric values');
            }
        }
    }

    validateTreeProblem(input, output) {
        // Validate tree problem inputs (usually arrays representing trees)
        if (Array.isArray(input) && input.some(item => item === null || item === undefined)) {
            console.log('Tree problem contains null nodes (expected for tree representation)');
        }
    }

    validateGraphProblem(input, output) {
        // Validate graph problem inputs
        if (Array.isArray(input) && input.length > 0 && Array.isArray(input[0])) {
            console.log('Graph problem detected (adjacency list/matrix format)');
        }
    }

    /**
     * Create error test case when cleaning fails
     * @param {Object} testCase - Original test case
     * @param {number} index - Test case index
     * @param {Error} error - Error that occurred
     * @returns {Object} - Error test case
     */
    createErrorTestCase(testCase, index, error) {
        return {
            input: testCase.input || null,
            output: testCase.output || null,
            description: `Test case ${index + 1} (PARSING ERROR)`,
            error: error.message,
            originalInput: testCase.input,
            originalOutput: testCase.output,
            isError: true
        };
    }

    /**
     * Infer problem type from test cases
     * @param {Array} testCases - Test cases to analyze
     * @returns {string} - Inferred problem type
     */
    inferProblemType(testCases) {
        if (!Array.isArray(testCases) || testCases.length === 0) {
            return 'generic';
        }

        const firstInput = testCases[0].input;

        // Analyze first test case input to infer problem type
        if (Array.isArray(firstInput)) {
            if (firstInput.every(item => typeof item === 'number')) {
                return 'array';
            }
            if (firstInput.every(item => Array.isArray(item))) {
                return 'graph';
            }
            return 'array';
        }

        if (typeof firstInput === 'string') {
            return 'string';
        }

        if (typeof firstInput === 'number') {
            return 'number';
        }

        if (typeof firstInput === 'object' && firstInput !== null) {
            if ('target' in firstInput && 'nums' in firstInput) {
                return 'array'; // Common LeetCode pattern
            }
            return 'object';
        }

        return 'generic';
    }
}

// Export singleton instance
const testCaseProcessor = new TestCaseProcessor();
module.exports = testCaseProcessor;