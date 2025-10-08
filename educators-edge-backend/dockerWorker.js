// =================================================================
// FILE: dockerWorker.js 
// =================================================================
// DESCRIPTION: Background worker service for code execution
// Runs as separate Render worker service, uses BullMQ for job processing

const { Worker } = require('bullmq');
const Redis = require('ioredis');
const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

// Redis connection with BullMQ configuration
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null, // Required for BullMQ
    retryDelayOnFailover: 100,
    enableReadyCheck: false
});

// Code execution worker
const codeExecutionWorker = new Worker('code-execution', async (job) => {
    const { code, language, sessionId, testCases = [], userId } = job.data;

    console.log(`🚀 Processing code execution job for session ${sessionId} (${language})`, {
        testCaseCount: testCases.length,
        userId: userId,
        codeLength: code?.length
    });

    try {
        const result = await executeCodeSafely(code, language, testCases);
        
        console.log(`✅ Code execution completed for session ${sessionId}`);
        
        return {
            success: true,
            sessionId,
            result
        };
    } catch (error) {
        console.error(`❌ Code execution failed for session ${sessionId}:`, error);
        
        return {
            success: false,
            sessionId,
            error: error.message,
            result: {
                success: false,
                output: '',
                error: error.message,
                executionTime: 0,
                language
            }
        };
    }
}, {
    connection: redis,
    concurrency: 5, // Process up to 5 jobs concurrently
    removeOnComplete: 10, // Keep last 10 completed jobs
    removeOnFail: 50, // Keep last 50 failed jobs
});

// Safe code execution function
async function executeCodeSafely(code, language, testCases = []) {
    const startTime = Date.now();

    // Create temporary directory for code execution
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'code-exec-'));

    try {
        // Determine file extension and execution command
        const config = getLanguageConfig(language);
        const filename = `code.${config.extension}`;
        const filepath = path.join(tempDir, filename);

        let finalCode = code;
        let testResults = [];

        // If we have test cases, wrap the code with test harness
        if (testCases.length > 0) {
            console.log(`🧪 Processing ${testCases.length} test cases for ${language}`);
            const testHarness = generateTestHarness(code, testCases, language);
            finalCode = testHarness;
        }

        // Write code to temporary file
        await fs.writeFile(filepath, finalCode, 'utf8');

        // Execute code with timeout and resource limits
        const result = await executeWithLimits(config.command, filepath, tempDir);

        const executionTime = Date.now() - startTime;

        // Parse test results if we have test cases
        if (testCases.length > 0) {
            testResults = parseTestResults(result.output, testCases);
        }

        return {
            success: result.success,
            output: result.output,
            error: result.error,
            executionTime,
            language,
            testCaseResults: testResults,
            passed: testResults.filter(t => t.passed).length,
            failed: testResults.filter(t => !t.passed).length
        };
    } finally {
        // Cleanup temporary directory
        try {
            await fs.rmdir(tempDir, { recursive: true });
        } catch (cleanupError) {
            console.warn('Failed to cleanup temp directory:', cleanupError);
        }
    }
}

// Language configuration
function getLanguageConfig(language) {
    const configs = {
        javascript: {
            extension: 'js',
            command: ['node', 'code.js']
        },
        python: {
            extension: 'py', 
            command: ['python3', 'code.py']
        },
        java: {
            extension: 'java',
            command: ['sh', '-c', 'javac code.java && java Code']
        },
        cpp: {
            extension: 'cpp',
            command: ['sh', '-c', 'g++ code.cpp -o code && ./code']
        },
        c: {
            extension: 'c',
            command: ['sh', '-c', 'gcc code.c -o code && ./code']
        }
    };
    
    return configs[language] || configs.javascript;
}

// Execute with resource limits and timeout
function executeWithLimits(command, filepath, workingDir) {
    return new Promise((resolve, reject) => {
        const process = spawn(command[0], command.slice(1), {
            cwd: workingDir,
            stdio: ['pipe', 'pipe', 'pipe'],
            timeout: 10000, // 10 second timeout
            killSignal: 'SIGKILL'
        });
        
        let stdout = '';
        let stderr = '';
        
        process.stdout.on('data', (data) => {
            stdout += data.toString();
        });
        
        process.stderr.on('data', (data) => {
            stderr += data.toString();
        });
        
        process.on('close', (code) => {
            const success = code === 0;
            const output = stdout || stderr;
            
            resolve({
                success,
                output: output.trim(),
                error: success ? null : stderr.trim()
            });
        });
        
        process.on('error', (error) => {
            resolve({
                success: false,
                output: '',
                error: error.message
            });
        });
        
        // Timeout handling
        setTimeout(() => {
            if (!process.killed) {
                process.kill('SIGKILL');
                resolve({
                    success: false,
                    output: '',
                    error: 'Execution timeout (10 seconds exceeded)'
                });
            }
        }, 10000);
    });
}

// Worker event handlers
codeExecutionWorker.on('completed', (job) => {
    console.log(`✅ Job ${job.id} completed successfully`);
});

codeExecutionWorker.on('failed', (job, err) => {
    console.error(`❌ Job ${job.id} failed:`, err);
});

codeExecutionWorker.on('error', (err) => {
    console.error('🔥 Worker error:', err);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('🛑 Received SIGTERM, shutting down worker gracefully...');
    
    await codeExecutionWorker.close();
    await redis.disconnect();
    
    console.log('👋 Worker shutdown complete');
    process.exit(0);
});

// Generate test harness for different languages
function generateTestHarness(userCode, testCases, language) {
    switch (language) {
        case 'javascript':
            return `
${userCode}

// Test harness
const testResults = [];
${testCases.map((tc, index) => `
try {
    const input = ${JSON.stringify(tc.input)};
    const expectedOutput = ${JSON.stringify(tc.expectedOutput)};
    const actualOutput = JSON.stringify(main ? main(${tc.input}) : eval(${JSON.stringify(tc.input)}));
    const passed = actualOutput === JSON.stringify(expectedOutput);
    testResults.push({
        testCase: ${index + 1},
        input: input,
        expectedOutput: expectedOutput,
        actualOutput: actualOutput,
        passed: passed,
        description: ${JSON.stringify(tc.description)}
    });
    console.log(\`TEST_RESULT_\${${index + 1}}: \${JSON.stringify({passed, expected: expectedOutput, actual: actualOutput})}\`);
} catch (error) {
    testResults.push({
        testCase: ${index + 1},
        input: ${JSON.stringify(tc.input)},
        expectedOutput: ${JSON.stringify(tc.expectedOutput)},
        actualOutput: error.message,
        passed: false,
        description: ${JSON.stringify(tc.description)},
        error: error.message
    });
    console.log(\`TEST_RESULT_\${${index + 1}}: \${JSON.stringify({passed: false, expected: ${JSON.stringify(tc.expectedOutput)}, actual: error.message, error: true})}\`);
}
`).join('')}

console.log('TEST_SUMMARY:', JSON.stringify({
    totalTests: ${testCases.length},
    passed: testResults.filter(t => t.passed).length,
    failed: testResults.filter(t => !t.passed).length,
    results: testResults
}));
`;

        case 'python':
            return `
${userCode}

import json
import sys

# Test harness
test_results = []
${testCases.map((tc, index) => `
try:
    input_val = ${JSON.stringify(tc.input)}
    expected_output = ${JSON.stringify(tc.expectedOutput)}
    actual_output = main(${tc.input}) if 'main' in locals() else eval(${JSON.stringify(tc.input)})
    passed = json.dumps(actual_output) == json.dumps(expected_output)
    test_results.append({
        "testCase": ${index + 1},
        "input": input_val,
        "expectedOutput": expected_output,
        "actualOutput": actual_output,
        "passed": passed,
        "description": ${JSON.stringify(tc.description)}
    })
    print(f"TEST_RESULT_${index + 1}: {json.dumps({'passed': passed, 'expected': expected_output, 'actual': actual_output})}")
except Exception as error:
    test_results.append({
        "testCase": ${index + 1},
        "input": ${JSON.stringify(tc.input)},
        "expectedOutput": ${JSON.stringify(tc.expectedOutput)},
        "actualOutput": str(error),
        "passed": False,
        "description": ${JSON.stringify(tc.description)},
        "error": str(error)
    })
    print(f"TEST_RESULT_${index + 1}: {json.dumps({'passed': False, 'expected': ${JSON.stringify(tc.expectedOutput)}, 'actual': str(error), 'error': True})}")
`).join('')}

print('TEST_SUMMARY:', json.dumps({
    "totalTests": ${testCases.length},
    "passed": len([t for t in test_results if t["passed"]]),
    "failed": len([t for t in test_results if not t["passed"]]),
    "results": test_results
}))
`;

        default:
            // For unsupported languages, just run the code without test validation
            return userCode;
    }
}

// Parse test results from execution output
function parseTestResults(output, testCases) {
    const results = [];

    try {
        // Look for test result markers in output
        const lines = output.split('\n');

        for (let i = 0; i < testCases.length; i++) {
            const testNum = i + 1;
            const resultLine = lines.find(line => line.includes(`TEST_RESULT_${testNum}:`));

            if (resultLine) {
                try {
                    const jsonStr = resultLine.split(`TEST_RESULT_${testNum}: `)[1];
                    const testResult = JSON.parse(jsonStr);

                    results.push({
                        testCase: testNum,
                        description: testCases[i].description,
                        input: testCases[i].input,
                        expectedOutput: testResult.expected,
                        actualOutput: testResult.actual,
                        passed: testResult.passed,
                        error: testResult.error || null
                    });
                } catch (parseError) {
                    // If parsing fails, mark as failed
                    results.push({
                        testCase: testNum,
                        description: testCases[i].description,
                        input: testCases[i].input,
                        expectedOutput: testCases[i].expectedOutput,
                        actualOutput: 'Parse error',
                        passed: false,
                        error: 'Failed to parse test result'
                    });
                }
            } else {
                // If no result found, mark as failed
                results.push({
                    testCase: testNum,
                    description: testCases[i].description,
                    input: testCases[i].input,
                    expectedOutput: testCases[i].expectedOutput,
                    actualOutput: 'No output',
                    passed: false,
                    error: 'No test result found'
                });
            }
        }
    } catch (error) {
        console.error('Failed to parse test results:', error);
        // Return failed results for all test cases
        return testCases.map((tc, index) => ({
            testCase: index + 1,
            description: tc.description,
            input: tc.input,
            expectedOutput: tc.expectedOutput,
            actualOutput: 'Parse error',
            passed: false,
            error: 'Failed to parse test results'
        }));
    }

    return results;
}

console.log('🚀 Code execution worker started');
console.log('📋 Queue: code-execution');
console.log('🔗 Redis:', process.env.REDIS_URL || 'redis://localhost:6379');
console.log('⚡ Concurrency: 5 jobs');
console.log('✨ Ready to process code execution jobs!');