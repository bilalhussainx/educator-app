const vm = require('vm');
const { Worker } = require('worker_threads');
const path = require('path');

/**
 * VM-based code execution service for safe and fast code validation
 */
class VMExecutionService {
    constructor() {
        console.log('🖥️ VM Execution Service initialized');
        this.activeWorkers = new Map();
    }

    /**
     * Execute code with test validation in a secure VM
     * @param {string} userCode - User's code to execute
     * @param {Array} testCases - Test cases to validate against
     * @param {string} language - Programming language
     * @param {Object} options - Execution options
     * @returns {Promise<Object>} - Validation results
     */
    async executeAndValidate(userCode, testCases, language = 'javascript', options = {}) {
        const startTime = Date.now();

        try {
            console.log('🖥️ [VM_EXEC] Starting code validation:', {
                language,
                testCaseCount: testCases.length,
                codeLength: userCode.length,
                timeout: options.timeout || 5000
            });

            // Ensure test cases are properly formatted
            const formattedTestCases = this.formatTestCases(testCases);

            let result;
            switch (language.toLowerCase()) {
                case 'javascript':
                case 'js':
                    result = await this.executeJavaScript(userCode, formattedTestCases, options);
                    break;
                case 'python':
                case 'py':
                    result = await this.executePython(userCode, formattedTestCases, options);
                    break;
                case 'java':
                    result = await this.executeJava(userCode, formattedTestCases, options);
                    break;
                default:
                    result = await this.executeJavaScript(userCode, formattedTestCases, options);
            }

            const totalTime = Date.now() - startTime;
            result.totalExecutionTime = totalTime;

            console.log('✅ [VM_EXEC] Code validation completed:', {
                success: result.success,
                passed: result.passed,
                failed: result.failed,
                totalTime
            });

            return result;

        } catch (error) {
            console.error('❌ [VM_EXEC] Validation failed:', error);
            return this.createErrorResult(testCases, error, Date.now() - startTime);
        }
    }

    /**
     * Execute JavaScript code in a secure VM context
     */
    async executeJavaScript(userCode, testCases, options = {}) {
        const timeout = options.timeout || 5000;
        const results = [];
        let passed = 0;
        let failed = 0;

        // Create a secure execution context
        const context = vm.createContext({
            console: {
                log: () => {}, // Suppress console.log
                error: () => {}
            },
            Math,
            Array,
            Object,
            JSON,
            parseInt,
            parseFloat,
            isNaN,
            isFinite,
            String,
            Number,
            Boolean,
            Date
        });

        try {
            // Execute user code in the VM context
            vm.runInContext(userCode, context, {
                timeout: timeout,
                displayErrors: true,
                filename: 'user-code.js'
            });

            // Find the main function
            const functionNames = Object.keys(context).filter(key =>
                typeof context[key] === 'function' && !key.startsWith('_')
            );

            if (functionNames.length === 0) {
                throw new Error('No function found in the code');
            }

            const mainFunction = context[functionNames[0]];

            // Run each test case
            for (let i = 0; i < testCases.length; i++) {
                const testCase = testCases[i];
                const testStartTime = Date.now();

                try {
                    const result = this.callFunctionWithInput(mainFunction, testCase.input);
                    const executionTime = Date.now() - testStartTime;
                    const isEqual = this.deepEqual(result, testCase.output);

                    if (isEqual) {
                        passed++;
                    } else {
                        failed++;
                    }

                    results.push({
                        testCase: i + 1,
                        passed: isEqual,
                        input: testCase.input,
                        expectedOutput: testCase.output,
                        actualOutput: result,
                        executionTime,
                        explanation: isEqual ?
                            'Test passed successfully' :
                            `Expected ${JSON.stringify(testCase.output)}, got ${JSON.stringify(result)}`
                    });

                } catch (testError) {
                    failed++;
                    const executionTime = Date.now() - testStartTime;

                    results.push({
                        testCase: i + 1,
                        passed: false,
                        input: testCase.input,
                        expectedOutput: testCase.output,
                        actualOutput: null,
                        error: testError.message,
                        executionTime,
                        explanation: `Runtime error: ${testError.message}`
                    });
                }
            }

            return {
                success: failed === 0,
                passed,
                failed,
                total: testCases.length,
                testCaseResults: results,
                language: 'javascript'
            };

        } catch (vmError) {
            return this.createErrorResult(testCases, vmError, 0);
        }
    }

    /**
     * Execute Python code using a worker thread
     */
    async executePython(userCode, testCases, options = {}) {
        return new Promise((resolve, reject) => {
            const workerId = Date.now().toString();
            const worker = new Worker(path.join(__dirname, 'vmPythonWorker.js'), {
                workerData: {
                    userCode,
                    testCases,
                    options
                }
            });

            this.activeWorkers.set(workerId, worker);

            const timeout = setTimeout(() => {
                worker.terminate();
                this.activeWorkers.delete(workerId);
                resolve(this.createTimeoutResult(testCases, options.timeout || 5000));
            }, options.timeout || 5000);

            worker.on('message', (result) => {
                clearTimeout(timeout);
                this.activeWorkers.delete(workerId);
                resolve(result);
            });

            worker.on('error', (error) => {
                clearTimeout(timeout);
                this.activeWorkers.delete(workerId);
                resolve(this.createErrorResult(testCases, error, 0));
            });

            worker.on('exit', (code) => {
                clearTimeout(timeout);
                this.activeWorkers.delete(workerId);
                if (code !== 0) {
                    resolve(this.createErrorResult(testCases, new Error(`Worker exited with code ${code}`), 0));
                }
            });
        });
    }

    /**
     * Execute Java code (placeholder - requires proper Java setup)
     */
    async executeJava(userCode, testCases, options = {}) {
        // For now, return a placeholder result
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
                error: 'Java execution not implemented yet',
                executionTime: 0,
                explanation: 'Java support coming soon'
            })),
            language: 'java'
        };
    }

    /**
     * Call function with appropriate input format
     */
    callFunctionWithInput(func, input) {
        if (Array.isArray(input)) {
            return func(...input);
        } else if (typeof input === 'object' && input !== null) {
            return func(...Object.values(input));
        } else {
            return func(input);
        }
    }

    /**
     * Format and validate test cases
     */
    formatTestCases(rawTestCases) {
        if (!Array.isArray(rawTestCases)) {
            console.warn('Test cases is not an array, converting:', typeof rawTestCases);
            return [];
        }

        return rawTestCases.map((tc, index) => {
            if (!tc || typeof tc !== 'object') {
                console.warn(`Test case ${index + 1} is invalid:`, tc);
                return {
                    input: tc,
                    output: null,
                    description: `Test case ${index + 1}`
                };
            }

            return {
                input: tc.input,
                output: tc.output || tc.expected || tc.expectedOutput,
                description: tc.description || `Test case ${index + 1}`
            };
        }).filter(tc => tc.input !== undefined && tc.output !== undefined);
    }

    /**
     * Deep equality check for test validation
     */
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
     * Create error result when execution fails
     */
    createErrorResult(testCases, error, executionTime) {
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
                error: error.message,
                executionTime: 0,
                explanation: `Execution failed: ${error.message}`
            })),
            error: error.message,
            totalExecutionTime: executionTime
        };
    }

    /**
     * Create timeout result
     */
    createTimeoutResult(testCases, timeout) {
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
                error: 'Execution timeout',
                executionTime: timeout,
                explanation: `Code execution timed out after ${timeout}ms`
            })),
            error: 'Execution timeout',
            totalExecutionTime: timeout
        };
    }

    /**
     * Clean up all active workers
     */
    cleanup() {
        console.log(`🧹 Cleaning up ${this.activeWorkers.size} active workers`);
        for (const [workerId, worker] of this.activeWorkers) {
            try {
                worker.terminate();
            } catch (error) {
                console.warn(`Failed to terminate worker ${workerId}:`, error.message);
            }
        }
        this.activeWorkers.clear();
    }

    /**
     * Health check
     */
    healthCheck() {
        return {
            status: 'healthy',
            service: 'VMExecutionService',
            activeWorkers: this.activeWorkers.size,
            timestamp: new Date().toISOString()
        };
    }
}

// Export singleton instance
const vmExecutionService = new VMExecutionService();

// Cleanup on process exit
process.on('exit', () => vmExecutionService.cleanup());
process.on('SIGINT', () => {
    vmExecutionService.cleanup();
    process.exit(0);
});
process.on('SIGTERM', () => {
    vmExecutionService.cleanup();
    process.exit(0);
});

module.exports = vmExecutionService;