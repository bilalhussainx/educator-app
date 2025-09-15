/**
 * =================================================================
 * UNIVERSAL TEST CASE NORMALIZER
 * =================================================================
 * Handles all possible test case formats and normalizes them for Judge0
 * Supports: LeetCode, UltimateCourseGenerator, manual formats, etc.
 */

class TestCaseNormalizer {
    constructor() {
        console.log('🔧 TestCaseNormalizer initialized');
    }

    /**
     * Main normalization function - handles any test case format
     * @param {Array|Object|String} rawTestCases - Test cases in any format
     * @param {Object} problemMeta - Problem metadata for context
     * @returns {Array} Normalized test cases for Judge0
     */
    normalizeTestCases(rawTestCases, problemMeta = {}) {
        try {
            console.log('🔄 Normalizing test cases:', {
                type: typeof rawTestCases,
                isArray: Array.isArray(rawTestCases),
                length: rawTestCases?.length,
                sample: Array.isArray(rawTestCases) ? rawTestCases[0] : rawTestCases
            });

            // Step 1: Convert to array if not already
            let testCasesArray = this.ensureArray(rawTestCases);

            // Step 2: Detect and handle different formats
            const detectedFormat = this.detectFormat(testCasesArray);
            console.log('📋 Detected format:', detectedFormat);

            // Step 3: Normalize based on format
            let normalizedCases;
            switch (detectedFormat) {
                case 'leetcode_standard':
                    normalizedCases = this.normalizeLeetCodeStandard(testCasesArray);
                    break;
                case 'input_output_pairs':
                    normalizedCases = this.normalizeInputOutputPairs(testCasesArray);
                    break;
                case 'examples_format':
                    normalizedCases = this.normalizeExamplesFormat(testCasesArray);
                    break;
                case 'string_format':
                    normalizedCases = this.normalizeStringFormat(testCasesArray, problemMeta);
                    break;
                case 'mixed_format':
                    normalizedCases = this.normalizeMixedFormat(testCasesArray);
                    break;
                default:
                    normalizedCases = this.createFallbackTestCases(testCasesArray, problemMeta);
            }

            // Step 4: Validate and clean final result
            const validatedCases = this.validateTestCases(normalizedCases);

            console.log(`✅ Normalized ${validatedCases.length} test cases successfully`);
            return validatedCases;

        } catch (error) {
            console.error('❌ Test case normalization failed:', error);
            return this.createEmergencyFallback(problemMeta);
        }
    }

    /**
     * Ensure input is an array
     */
    ensureArray(input) {
        if (Array.isArray(input)) return input;
        if (typeof input === 'string') {
            try {
                const parsed = JSON.parse(input);
                return Array.isArray(parsed) ? parsed : [parsed];
            } catch {
                return [input];
            }
        }
        if (typeof input === 'object' && input !== null) {
            return [input];
        }
        return [];
    }

    /**
     * Detect the format of test cases
     */
    detectFormat(testCases) {
        if (!testCases.length) return 'empty';

        const firstCase = testCases[0];

        // LeetCode standard: { input: [...], expected: ... }
        if (firstCase && typeof firstCase === 'object' &&
            'input' in firstCase && ('expected' in firstCase || 'output' in firstCase)) {
            return 'leetcode_standard';
        }

        // Input/Output pairs: { input: ..., output: ... }
        if (firstCase && typeof firstCase === 'object' &&
            'input' in firstCase && 'output' in firstCase) {
            return 'input_output_pairs';
        }

        // Examples format: { input: "...", output: "...", explanation: "..." }
        if (firstCase && typeof firstCase === 'object' &&
            'input' in firstCase && 'output' in firstCase && 'explanation' in firstCase) {
            return 'examples_format';
        }

        // String format: ["input1 -> output1", "input2 -> output2"]
        if (typeof firstCase === 'string' &&
            (firstCase.includes('->') || firstCase.includes('=>') || firstCase.includes(':'))) {
            return 'string_format';
        }

        // Mixed format
        if (testCases.some(tc => typeof tc === 'string') &&
            testCases.some(tc => typeof tc === 'object')) {
            return 'mixed_format';
        }

        return 'unknown';
    }

    /**
     * Normalize LeetCode standard format
     */
    normalizeLeetCodeStandard(testCases) {
        return testCases.map((tc, index) => ({
            input: tc.input,
            expected: tc.expected || tc.output,
            description: tc.description || `Test case ${index + 1}`
        }));
    }

    /**
     * Normalize input/output pairs
     */
    normalizeInputOutputPairs(testCases) {
        return testCases.map((tc, index) => ({
            input: tc.input,
            expected: tc.output,
            description: tc.description || `Test case ${index + 1}`
        }));
    }

    /**
     * Normalize examples format (from UltimateCourseGenerator)
     */
    normalizeExamplesFormat(testCases) {
        return testCases.map((example, index) => {
            // Parse input and output from example strings
            let input, expected;

            try {
                // Try to extract from explanation or parse directly
                if (typeof example.input === 'string') {
                    input = this.parseComplexInput(example.input);
                } else {
                    input = example.input;
                }

                if (typeof example.output === 'string') {
                    expected = this.parseComplexOutput(example.output);
                } else {
                    expected = example.output;
                }
            } catch (parseError) {
                console.warn(`⚠️ Failed to parse example ${index + 1}:`, parseError.message);
                input = example.input;
                expected = example.output;
            }

            return {
                input,
                expected,
                description: example.explanation || `Example ${index + 1}`
            };
        });
    }

    /**
     * Normalize string format
     */
    normalizeStringFormat(testCases, problemMeta) {
        return testCases.map((testString, index) => {
            const parts = testString.split(/->|=>|:/);

            if (parts.length >= 2) {
                return {
                    input: this.parseValue(parts[0].trim()),
                    expected: this.parseValue(parts[1].trim()),
                    description: `Test case ${index + 1}`
                };
            }

            // Fallback for complex string format
            return {
                input: testString,
                expected: "unknown",
                description: `String test case ${index + 1}`
            };
        });
    }

    /**
     * Handle mixed formats
     */
    normalizeMixedFormat(testCases) {
        return testCases.map((tc, index) => {
            if (typeof tc === 'string') {
                // Handle string test case
                const parts = tc.split(/->|=>|:/);
                if (parts.length >= 2) {
                    return {
                        input: this.parseValue(parts[0].trim()),
                        expected: this.parseValue(parts[1].trim()),
                        description: `Mixed test case ${index + 1}`
                    };
                }
                return {
                    input: tc,
                    expected: "unknown",
                    description: `String test case ${index + 1}`
                };
            } else if (typeof tc === 'object') {
                // Handle object test case
                return {
                    input: tc.input,
                    expected: tc.expected || tc.output || tc.result,
                    description: tc.description || `Object test case ${index + 1}`
                };
            }

            return {
                input: tc,
                expected: "unknown",
                description: `Unknown test case ${index + 1}`
            };
        });
    }

    /**
     * Parse complex input strings like "nums = [2,7,11,15], target = 9"
     */
    parseComplexInput(inputString) {
        try {
            // Handle various input formats
            if (inputString.includes('=')) {
                // Format: "nums = [2,7,11,15], target = 9"
                const assignments = inputString.split(',').map(s => s.trim());
                const values = [];

                for (const assignment of assignments) {
                    const [_, value] = assignment.split('=').map(s => s.trim());
                    values.push(this.parseValue(value));
                }

                return values.length === 1 ? values[0] : values;
            } else {
                // Direct value: "[2,7,11,15]" or "9"
                return this.parseValue(inputString);
            }
        } catch (error) {
            console.warn('⚠️ Complex input parsing failed:', error.message);
            return inputString;
        }
    }

    /**
     * Parse complex output strings
     */
    parseComplexOutput(outputString) {
        return this.parseValue(outputString);
    }

    /**
     * Parse individual values
     */
    parseValue(valueString) {
        if (typeof valueString !== 'string') return valueString;

        const trimmed = valueString.trim();

        // Handle arrays
        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
            try {
                return JSON.parse(trimmed);
            } catch {
                return trimmed;
            }
        }

        // Handle objects
        if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
            try {
                return JSON.parse(trimmed);
            } catch {
                return trimmed;
            }
        }

        // Handle numbers
        if (/^-?\d+\.?\d*$/.test(trimmed)) {
            return parseFloat(trimmed);
        }

        // Handle booleans
        if (trimmed.toLowerCase() === 'true') return true;
        if (trimmed.toLowerCase() === 'false') return false;

        // Handle null/undefined
        if (trimmed.toLowerCase() === 'null') return null;
        if (trimmed.toLowerCase() === 'undefined') return undefined;

        // Return as string if no other format matches
        return trimmed;
    }

    /**
     * Create fallback test cases when format is unrecognized
     */
    createFallbackTestCases(testCases, problemMeta) {
        console.log('⚠️ Creating fallback test cases');

        if (testCases.length === 0) {
            return this.createEmergencyFallback(problemMeta);
        }

        return testCases.map((tc, index) => ({
            input: tc,
            expected: "Please check your implementation",
            description: `Fallback test case ${index + 1}`
        }));
    }

    /**
     * Emergency fallback when everything else fails
     */
    createEmergencyFallback(problemMeta) {
        console.log('🚨 Creating emergency fallback test case');

        return [{
            input: [],
            expected: "Test execution completed",
            description: "Emergency test case - Please add proper test cases to this problem"
        }];
    }

    /**
     * Validate final test cases
     */
    validateTestCases(testCases) {
        return testCases.filter((tc, index) => {
            // Ensure required fields exist
            if (!tc || typeof tc !== 'object') {
                console.warn(`⚠️ Removing invalid test case ${index + 1}: not an object`);
                return false;
            }

            if (tc.input === undefined) {
                console.warn(`⚠️ Removing test case ${index + 1}: missing input`);
                return false;
            }

            if (tc.expected === undefined) {
                console.warn(`⚠️ Removing test case ${index + 1}: missing expected output`);
                return false;
            }

            return true;
        });
    }

    /**
     * Create test cases from function signature when no test cases exist
     */
    createTestCasesFromSignature(code, language, problemMeta) {
        console.log('🔍 Creating test cases from function signature');

        try {
            const functionInfo = this.extractFunctionSignature(code, language);

            if (functionInfo.parameters.length === 0) {
                return [{
                    input: [],
                    expected: "Function executed",
                    description: "No-parameter function test"
                }];
            }

            // Generate simple test cases based on parameter types
            const testInput = functionInfo.parameters.map(param => {
                switch (param.type) {
                    case 'number': return 5;
                    case 'string': return "test";
                    case 'array': return [1, 2, 3];
                    case 'boolean': return true;
                    default: return null;
                }
            });

            return [{
                input: testInput.length === 1 ? testInput[0] : testInput,
                expected: "Implementation result",
                description: "Generated test case from function signature"
            }];

        } catch (error) {
            console.warn('⚠️ Failed to create test cases from signature:', error.message);
            return this.createEmergencyFallback(problemMeta);
        }
    }

    /**
     * Extract function signature info
     */
    extractFunctionSignature(code, language) {
        // Simple extraction - can be enhanced
        const patterns = {
            javascript: /function\s+(\w+)\s*\(([^)]*)\)/,
            python: /def\s+(\w+)\s*\(([^)]*)\):/,
            java: /public\s+[\w\[\]<>]+\s+(\w+)\s*\(([^)]*)\)/
        };

        const pattern = patterns[language];
        if (!pattern) return { name: 'unknown', parameters: [] };

        const match = code.match(pattern);
        if (!match) return { name: 'unknown', parameters: [] };

        const [, functionName, paramString] = match;
        const parameters = paramString.split(',').map(p => p.trim()).filter(p => p);

        return {
            name: functionName,
            parameters: parameters.map(param => ({
                name: param.split(' ').pop(),
                type: this.inferType(param)
            }))
        };
    }

    /**
     * Infer parameter type from signature
     */
    inferType(paramString) {
        if (paramString.includes('[]') || paramString.includes('Array')) return 'array';
        if (paramString.includes('string') || paramString.includes('String')) return 'string';
        if (paramString.includes('int') || paramString.includes('number')) return 'number';
        if (paramString.includes('boolean') || paramString.includes('bool')) return 'boolean';
        return 'unknown';
    }
}

module.exports = TestCaseNormalizer;