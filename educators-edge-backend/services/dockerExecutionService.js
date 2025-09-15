// =================================================================
// FILE: services/dockerExecutionService.js
// =================================================================
// DESCRIPTION: Enhanced Docker-based code execution service
// Integrates with BullMQ for scalable, secure code execution in AscentIDE

const { Queue } = require('bullmq');
const Redis = require('ioredis');

class DockerExecutionService {
    constructor() {
        // Initialize Redis and BullMQ queue for code execution
        this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
            maxRetriesPerRequest: null,
            retryDelayOnFailover: 100,
            enableReadyCheck: false
        });

        this.codeExecutionQueue = new Queue('code-execution', {
            connection: this.redis
        });

        console.log('🐳 Docker Execution Service initialized with BullMQ');
    }

    /**
     * Execute code with test cases using Docker/BullMQ system
     * @param {string} userCode - The user's code to execute
     * @param {Array} testCases - Test cases to run against the code
     * @param {string} language - Programming language
     * @returns {Promise<object>} - Execution results with test case outcomes
     */
    async executeCodeWithTests(userCode, testCases, language) {
        try {
            // Ensure testCases is always an array
            if (!Array.isArray(testCases)) {
                console.warn('⚠️ [DOCKER_EXEC] testCases is not an array, converting:', typeof testCases);
                testCases = testCases ? [testCases] : [];
            }

            console.log('🚀 [DOCKER_EXEC] Starting execution:', {
                language,
                testCaseCount: testCases.length,
                codeLength: userCode.length
            });

            // Generate test execution code
            const testCode = this.generateTestExecutionCode(userCode, testCases, language);

            // Submit job to BullMQ queue
            const job = await this.codeExecutionQueue.add('execute-with-tests', {
                code: testCode,
                language,
                testCases,
                metadata: {
                    originalCode: userCode,
                    timestamp: Date.now()
                }
            }, {
                removeOnComplete: 5,
                removeOnFail: 10,
                attempts: 2,
                backoff: {
                    type: 'exponential',
                    delay: 1000
                }
            });

            console.log(`🎯 Job ${job.id} submitted to queue`);

            // Wait for job completion with timeout
            const result = await this.waitForJobCompletion(job.id, 30000);

            console.log('✅ [DOCKER_EXEC] Execution completed:', result);

            return result;

        } catch (error) {
            console.error('❌ [DOCKER_EXEC] Execution failed:', error);

            // Ensure testCases is an array for error response
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
                    actualOutput: '',
                    error: error.message,
                    explanation: 'Execution failed due to system error'
                })),
                output: '',
                error: error.message,
                executionTime: 0
            };
        }
    }

    /**
     * Quick code execution without test cases
     * @param {string} code - Code to execute
     * @param {string} language - Programming language
     * @returns {Promise<object>} - Execution result
     */
    async quickExecute(code, language) {
        try {
            const job = await this.codeExecutionQueue.add('quick-execute', {
                code,
                language,
                metadata: { timestamp: Date.now() }
            }, {
                removeOnComplete: 3,
                removeOnFail: 5,
                attempts: 1
            });

            const result = await this.waitForJobCompletion(job.id, 15000);

            return {
                success: result.success,
                output: result.output || result.result?.output || '',
                error: result.error || result.result?.error,
                executionTime: result.executionTime || result.result?.executionTime || 0,
                language
            };

        } catch (error) {
            console.error('❌ Quick execution failed:', error);

            return {
                success: false,
                output: '',
                error: error.message,
                executionTime: 0,
                language
            };
        }
    }

    /**
     * Generate language-specific test execution code
     * @param {string} userCode - User's code
     * @param {Array} testCases - Test cases
     * @param {string} language - Programming language
     * @returns {string} - Complete test execution code
     */
    generateTestExecutionCode(userCode, testCases, language) {
        switch (language) {
            case 'javascript':
                return this.generateJavaScriptTestCode(userCode, testCases);
            case 'python':
                return this.generatePythonTestCode(userCode, testCases);
            case 'java':
                return this.generateJavaTestCode(userCode, testCases);
            case 'cpp':
                return this.generateCppTestCode(userCode, testCases);
            default:
                return this.generateJavaScriptTestCode(userCode, testCases);
        }
    }

    generateJavaScriptTestCode(userCode, testCases) {
        // Ensure testCases is an array
        const safeTestCases = Array.isArray(testCases) ? testCases : [];

        return `
// User's submitted code
${userCode}

// Test execution framework
const testResults = [];

${safeTestCases.map((testCase, index) => `
try {
    const input = ${JSON.stringify(testCase.input)};
    const expected = ${JSON.stringify(testCase.output)};

    console.log(\`\\n=== Test Case \${${index + 1}} ===\`);
    console.log(\`Input: \${JSON.stringify(input)}\`);

    const startTime = Date.now();
    const result = typeof lengthOfLongestSubstring === 'function'
        ? lengthOfLongestSubstring(input)
        : eval(\`(\${arguments[0]})\`)(input);
    const executionTime = Date.now() - startTime;

    console.log(\`Output: \${JSON.stringify(result)}\`);
    console.log(\`Expected: \${JSON.stringify(expected)}\`);

    const passed = JSON.stringify(result) === JSON.stringify(expected);
    console.log(\`Status: \${passed ? '✅ PASS' : '❌ FAIL'}\`);

    testResults.push({
        testCase: ${index + 1},
        passed,
        input,
        expectedOutput: expected,
        actualOutput: result,
        executionTime,
        explanation: passed ? 'Test passed successfully' : \`Expected \${JSON.stringify(expected)}, got \${JSON.stringify(result)}\`
    });

} catch (error) {
    console.log(\`\\n=== Test Case \${${index + 1}} ===\`);
    console.log(\`❌ ERROR: \${error.message}\`);

    testResults.push({
        testCase: ${index + 1},
        passed: false,
        input: ${JSON.stringify(testCase.input)},
        expectedOutput: ${JSON.stringify(testCase.output)},
        actualOutput: null,
        error: error.message,
        executionTime: 0,
        explanation: \`Runtime error: \${error.message}\`
    });
}
`).join('\n')}

// Summary
const passed = testResults.filter(r => r.passed).length;
const failed = testResults.length - passed;

console.log(\`\\n=== SUMMARY ===\`);
console.log(\`Passed: \${passed}/\${testResults.length}\`);
console.log(\`Failed: \${failed}/\${testResults.length}\`);

// Output results in JSON format for parsing
console.log(\`\\n__RESULTS__\${JSON.stringify({
    success: failed === 0,
    passed,
    failed,
    total: testResults.length,
    testCaseResults: testResults
})}__END_RESULTS__\`);
`;
    }

    generatePythonTestCode(userCode, testCases) {
        // Ensure testCases is an array
        const safeTestCases = Array.isArray(testCases) ? testCases : [];

        return `
import json
import time
import sys

# User's submitted code
${userCode}

# Test execution framework
test_results = []

${safeTestCases.map((testCase, index) => `
try:
    input_data = ${JSON.stringify(testCase.input)}
    expected = ${JSON.stringify(testCase.output)}

    print(f"\\n=== Test Case ${index + 1} ===")
    print(f"Input: {json.dumps(input_data)}")

    start_time = time.time()
    result = length_of_longest_substring(input_data) if 'length_of_longest_substring' in globals() else None
    execution_time = int((time.time() - start_time) * 1000)

    print(f"Output: {json.dumps(result)}")
    print(f"Expected: {json.dumps(expected)}")

    passed = result == expected
    print(f"Status: {'✅ PASS' if passed else '❌ FAIL'}")

    test_results.append({
        'testCase': ${index + 1},
        'passed': passed,
        'input': input_data,
        'expectedOutput': expected,
        'actualOutput': result,
        'executionTime': execution_time,
        'explanation': 'Test passed successfully' if passed else f'Expected {json.dumps(expected)}, got {json.dumps(result)}'
    })

except Exception as error:
    print(f"\\n=== Test Case ${index + 1} ===")
    print(f"❌ ERROR: {str(error)}")

    test_results.append({
        'testCase': ${index + 1},
        'passed': False,
        'input': ${JSON.stringify(testCase.input)},
        'expectedOutput': ${JSON.stringify(testCase.output)},
        'actualOutput': None,
        'error': str(error),
        'executionTime': 0,
        'explanation': f'Runtime error: {str(error)}'
    })
`).join('\n')}

# Summary
passed = len([r for r in test_results if r['passed']])
failed = len(test_results) - passed

print(f"\\n=== SUMMARY ===")
print(f"Passed: {passed}/{len(test_results)}")
print(f"Failed: {failed}/{len(test_results)}")

# Output results in JSON format for parsing
results = {
    'success': failed == 0,
    'passed': passed,
    'failed': failed,
    'total': len(test_results),
    'testCaseResults': test_results
}
print(f"\\n__RESULTS__{json.dumps(results)}__END_RESULTS__")
`;
    }

    generateJavaTestCode(userCode, testCases) {
        // Ensure testCases is an array
        const safeTestCases = Array.isArray(testCases) ? testCases : [];

        return `
// Java test code - placeholder implementation
// User's submitted code
${userCode}

// TODO: Implement proper Java test execution framework
public class TestRunner {
    public static void main(String[] args) {
        System.out.println("__RESULTS__{\\"success\\": false, \\"error\\": \\"Java execution not implemented\\"}__END_RESULTS__");
    }
}
`;
    }

    generateCppTestCode(userCode, testCases) {
        // Ensure testCases is an array
        const safeTestCases = Array.isArray(testCases) ? testCases : [];

        return `
// C++ test code - placeholder implementation
#include <iostream>
#include <string>

// User's submitted code
${userCode}

int main() {
    std::cout << "__RESULTS__{\\"success\\": false, \\"error\\": \\"C++ execution not implemented\\"}__END_RESULTS__" << std::endl;
    return 0;
}
`;
    }

    /**
     * Wait for BullMQ job completion with timeout
     * @param {string} jobId - Job ID to wait for
     * @param {number} timeout - Timeout in milliseconds
     * @returns {Promise<object>} - Job result
     */
    async waitForJobCompletion(jobId, timeout = 30000) {
        const startTime = Date.now();
        const pollInterval = 500;

        while (Date.now() - startTime < timeout) {
            try {
                const job = await this.codeExecutionQueue.getJob(jobId);

                if (!job) {
                    throw new Error(`Job ${jobId} not found`);
                }

                const state = await job.getState();

                if (state === 'completed') {
                    const result = job.returnvalue;
                    console.log(`✅ Job ${jobId} completed successfully`);

                    // Parse execution results if needed
                    return this.parseExecutionResult(result);
                }

                if (state === 'failed') {
                    const error = job.failedReason || 'Unknown error';
                    console.error(`❌ Job ${jobId} failed: ${error}`);
                    throw new Error(`Job failed: ${error}`);
                }

                // Wait before next poll
                await new Promise(resolve => setTimeout(resolve, pollInterval));

            } catch (error) {
                if (Date.now() - startTime >= timeout) {
                    throw new Error(`Job ${jobId} timed out after ${timeout}ms`);
                }
                throw error;
            }
        }

        throw new Error(`Job ${jobId} timed out after ${timeout}ms`);
    }

    /**
     * Parse execution result from Docker worker
     * @param {object} result - Raw result from worker
     * @returns {object} - Parsed result
     */
    parseExecutionResult(result) {
        try {
            // If result contains structured data, return it
            if (result && typeof result === 'object' && result.testCaseResults) {
                return result;
            }

            // If result contains output, try to parse JSON results
            const output = result?.result?.output || result?.output || '';

            // Look for __RESULTS__....__END_RESULTS__ pattern
            const resultsMatch = output.match(/__RESULTS__(.+?)__END_RESULTS__/s);
            if (resultsMatch) {
                const parsedResults = JSON.parse(resultsMatch[1]);
                return {
                    ...parsedResults,
                    output,
                    executionTime: result?.executionTime || result?.result?.executionTime || 0
                };
            }

            // Fallback: return basic result structure
            return {
                success: result?.success || result?.result?.success || false,
                passed: 0,
                failed: 1,
                total: 1,
                testCaseResults: [],
                output,
                error: result?.error || result?.result?.error,
                executionTime: result?.executionTime || result?.result?.executionTime || 0
            };

        } catch (parseError) {
            console.error('Failed to parse execution result:', parseError);

            return {
                success: false,
                passed: 0,
                failed: 1,
                total: 1,
                testCaseResults: [],
                output: result?.output || result?.result?.output || '',
                error: `Parse error: ${parseError.message}`,
                executionTime: 0
            };
        }
    }

    /**
     * Health check for the service
     * @returns {Promise<object>} - Health status
     */
    async healthCheck() {
        try {
            // Check Redis connection
            await this.redis.ping();

            // Check queue status
            const waiting = await this.codeExecutionQueue.getWaiting();
            const active = await this.codeExecutionQueue.getActive();
            const completed = await this.codeExecutionQueue.getCompleted();
            const failed = await this.codeExecutionQueue.getFailed();

            return {
                status: 'healthy',
                service: 'DockerExecutionService',
                redis: 'connected',
                queue: {
                    waiting: waiting.length,
                    active: active.length,
                    completed: completed.length,
                    failed: failed.length
                },
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            return {
                status: 'unhealthy',
                service: 'DockerExecutionService',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }
}

// Export singleton instance
const dockerExecutionService = new DockerExecutionService();
module.exports = dockerExecutionService;