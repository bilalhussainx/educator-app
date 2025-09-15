const vm = require('vm');
const { Worker } = require('worker_threads');
const path = require('path');

class FastExecutionService {
    constructor() {
        console.log('🚀 Fast Execution Service initialized');
    }

    /**
     * Execute code with test cases using direct validation
     * @param {string} userCode - The user's code to execute
     * @param {Array} testCases - Test cases to run against the code
     * @param {string} language - Programming language
     * @returns {Promise<object>} - Execution results with test case outcomes
     */
    async executeCodeWithTests(userCode, testCases, language) {
        try {
            // Ensure testCases is always an array
            if (!Array.isArray(testCases)) {
                console.warn('⚠️ [FAST_EXEC] testCases is not an array, converting:', typeof testCases);
                testCases = testCases ? [testCases] : [];
            }

            console.log('🚀 [FAST_EXEC] Starting execution:', {
                language,
                testCaseCount: testCases.length,
                codeLength: userCode.length
            });

            switch (language.toLowerCase()) {
                case 'javascript':
                    return await this.executeJavaScript(userCode, testCases);
                case 'python':
                    return await this.executePython(userCode, testCases);
                case 'java':
                    return this.executeJava(userCode, testCases);
                case 'cpp':
                    return this.executeCpp(userCode, testCases);
                default:
                    return await this.executeJavaScript(userCode, testCases);
            }

        } catch (error) {
            console.error('❌ [FAST_EXEC] Execution failed:', error);

            const safeTestCases = Array.isArray(testCases) ? testCases : [];

            return {
                success: false,
                passed: 0,
                failed: safeTestCases.length,
                total: safeTestCases.length,
                testCaseResults: safeTestCases.map((tc, i) => ({
                    testCase: i + 1,
                    passed: false,
                    input: tc.input,
                    expectedOutput: tc.output,
                    actualOutput: null,
                    error: error.message,
                    executionTime: 0,
                    explanation: `Execution error: ${error.message}`
                })),
                error: error.message,
                executionTime: 0
            };
        }
    }

    async executeJavaScript(userCode, testCases) {
        const results = [];
        let passed = 0;
        let failed = 0;

        for (let i = 0; i < testCases.length; i++) {
            const testCase = testCases[i];
            const startTime = Date.now();

            try {
                // Create a safe execution context
                const context = {
                    console: {
                        log: () => {}, // Suppress console.log in user code
                        error: () => {}
                    },
                    Math,
                    Array,
                    Object,
                    JSON,
                    parseInt,
                    parseFloat,
                    isNaN,
                    isFinite
                };

                // Execute user code in VM context
                vm.createContext(context);
                vm.runInContext(userCode, context, { timeout: 5000 });

                // Find the main function in the context
                const functionNames = Object.keys(context).filter(key =>
                    typeof context[key] === 'function' && !key.startsWith('_')
                );

                let result = null;
                let error = null;

                if (functionNames.length > 0) {
                    const mainFunction = context[functionNames[0]];

                    // Use cleaned input directly (already processed by testCaseProcessor)
                    let input = testCase.input;

                    // Call function with appropriate parameters based on input structure
                    if (Array.isArray(input)) {
                        // Handle array inputs like [target, nums] or [s, t]
                        result = mainFunction(...input);
                    } else if (typeof input === 'object' && input !== null) {
                        // Handle object inputs (e.g., {target: 7, nums: [2,3,1,2,4,3]})
                        const values = Object.values(input);
                        result = mainFunction(...values);
                    } else {
                        // Handle single parameter
                        result = mainFunction(input);
                    }
                } else {
                    error = 'No function found in submitted code';
                }

                const executionTime = Date.now() - startTime;
                const expected = testCase.output;
                const isEqual = this.deepEqual(result, expected);

                if (isEqual) {
                    passed++;
                } else {
                    failed++;
                }

                results.push({
                    testCase: i + 1,
                    passed: isEqual,
                    input: testCase.input,
                    expectedOutput: expected,
                    actualOutput: result,
                    error: error,
                    executionTime,
                    explanation: isEqual ?
                        'Test passed successfully' :
                        `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(result)}`
                });

            } catch (executeError) {
                failed++;
                const executionTime = Date.now() - startTime;

                results.push({
                    testCase: i + 1,
                    passed: false,
                    input: testCase.input,
                    expectedOutput: testCase.output,
                    actualOutput: null,
                    error: executeError.message,
                    executionTime,
                    explanation: `Runtime error: ${executeError.message}`
                });
            }
        }

        return {
            success: failed === 0,
            passed,
            failed,
            total: testCases.length,
            testCaseResults: results,
            executionTime: results.reduce((sum, r) => sum + r.executionTime, 0)
        };
    }

    async executePython(userCode, testCases) {
        return new Promise((resolve) => {
            // Create a worker thread for Python execution
            const workerPath = path.join(__dirname, 'pythonWorker.js');
            const worker = new Worker(workerPath, {
                workerData: { userCode, testCases }
            });

            const timeout = setTimeout(() => {
                worker.terminate();
                resolve({
                    success: false,
                    passed: 0,
                    failed: testCases.length,
                    total: testCases.length,
                    testCaseResults: testCases.map((tc, i) => ({
                        testCase: i + 1,
                        passed: false,
                        input: tc.input,
                        expectedOutput: tc.output,
                        actualOutput: null,
                        error: 'Execution timeout',
                        executionTime: 5000,
                        explanation: 'Code execution timed out after 5 seconds'
                    })),
                    error: 'Execution timeout',
                    executionTime: 5000
                });
            }, 5000);

            worker.on('message', (result) => {
                clearTimeout(timeout);
                resolve(result);
            });

            worker.on('error', (error) => {
                clearTimeout(timeout);
                resolve({
                    success: false,
                    passed: 0,
                    failed: testCases.length,
                    total: testCases.length,
                    testCaseResults: testCases.map((tc, i) => ({
                        testCase: i + 1,
                        passed: false,
                        input: tc.input,
                        expectedOutput: tc.output,
                        actualOutput: null,
                        error: error.message,
                        executionTime: 0,
                        explanation: `Worker error: ${error.message}`
                    })),
                    error: error.message,
                    executionTime: 0
                });
            });
        });
    }

    async executeJava(userCode, testCases) {
        return new Promise((resolve) => {
            // Create a worker thread for Java execution
            const workerPath = path.join(__dirname, 'javaWorker.js');
            const worker = new Worker(workerPath, {
                workerData: { userCode, testCases }
            });

            const timeout = setTimeout(() => {
                worker.terminate();
                resolve({
                    success: false,
                    passed: 0,
                    failed: testCases.length,
                    total: testCases.length,
                    testCaseResults: testCases.map((tc, i) => ({
                        testCase: i + 1,
                        passed: false,
                        input: tc.input,
                        expectedOutput: tc.output,
                        actualOutput: null,
                        error: 'Execution timeout',
                        executionTime: 15000,
                        explanation: 'Java code execution timed out after 15 seconds'
                    })),
                    error: 'Execution timeout',
                    executionTime: 15000
                });
            }, 15000); // Longer timeout for compilation

            worker.on('message', (result) => {
                clearTimeout(timeout);
                resolve(result);
            });

            worker.on('error', (error) => {
                clearTimeout(timeout);
                resolve({
                    success: false,
                    passed: 0,
                    failed: testCases.length,
                    total: testCases.length,
                    testCaseResults: testCases.map((tc, i) => ({
                        testCase: i + 1,
                        passed: false,
                        input: tc.input,
                        expectedOutput: tc.output,
                        actualOutput: null,
                        error: error.message,
                        executionTime: 0,
                        explanation: `Java worker error: ${error.message}`
                    })),
                    error: error.message,
                    executionTime: 0
                });
            });
        });
    }

    executeCpp(userCode, testCases) {
        // Placeholder for C++ execution
        return {
            success: false,
            passed: 0,
            failed: testCases.length,
            total: testCases.length,
            testCaseResults: testCases.map((tc, i) => ({
                testCase: i + 1,
                passed: false,
                input: tc.input,
                expectedOutput: tc.output,
                actualOutput: null,
                error: 'C++ execution not implemented',
                executionTime: 0,
                explanation: 'C++ execution not yet implemented in fast mode'
            })),
            error: 'C++ execution not implemented',
            executionTime: 0
        };
    }

    deepEqual(a, b) {
        if (a === b) return true;

        if (a == null || b == null) return a === b;

        if (typeof a !== typeof b) return false;

        if (typeof a !== 'object') return a === b;

        if (Array.isArray(a) !== Array.isArray(b)) return false;

        if (Array.isArray(a)) {
            if (a.length !== b.length) return false;
            for (let i = 0; i < a.length; i++) {
                if (!this.deepEqual(a[i], b[i])) return false;
            }
            return true;
        }

        const keysA = Object.keys(a);
        const keysB = Object.keys(b);

        if (keysA.length !== keysB.length) return false;

        for (let key of keysA) {
            if (!keysB.includes(key)) return false;
            if (!this.deepEqual(a[key], b[key])) return false;
        }

        return true;
    }

    /**
     * Health check for the service
     */
    async healthCheck() {
        return {
            status: 'healthy',
            service: 'FastExecutionService',
            timestamp: new Date().toISOString()
        };
    }
}

// Export singleton instance
const fastExecutionService = new FastExecutionService();
module.exports = fastExecutionService;