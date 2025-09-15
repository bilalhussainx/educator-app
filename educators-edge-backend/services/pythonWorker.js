const { parentPort, workerData } = require('worker_threads');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

async function executePython() {
    const { userCode, testCases } = workerData;

    try {
        // Create temporary Python file
        const tempDir = os.tmpdir();
        const tempFile = path.join(tempDir, `code_${Date.now()}.py`);

        // Generate Python test execution code
        const pythonCode = generatePythonTestCode(userCode, testCases);

        // Write to temp file
        fs.writeFileSync(tempFile, pythonCode);

        // Execute Python
        const python = spawn('python', [tempFile], {
            timeout: 5000,
            killSignal: 'SIGKILL'
        });

        let stdout = '';
        let stderr = '';

        python.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        python.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        python.on('close', (code) => {
            // Clean up temp file
            try {
                fs.unlinkSync(tempFile);
            } catch (e) {
                // Ignore cleanup errors
            }

            if (code !== 0) {
                parentPort.postMessage({
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
                        error: stderr || `Python process exited with code ${code}`,
                        executionTime: 0,
                        explanation: `Runtime error: ${stderr || 'Process failed'}`
                    })),
                    error: stderr || `Process exited with code ${code}`,
                    executionTime: 0
                });
                return;
            }

            // Parse results from stdout
            try {
                const resultsMatch = stdout.match(/__RESULTS__(.+?)__END_RESULTS__/s);
                if (resultsMatch) {
                    const result = JSON.parse(resultsMatch[1]);
                    parentPort.postMessage(result);
                } else {
                    // Fallback parsing
                    parentPort.postMessage(parsePythonOutput(stdout, testCases));
                }
            } catch (parseError) {
                parentPort.postMessage({
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
                        error: `Parse error: ${parseError.message}`,
                        executionTime: 0,
                        explanation: `Failed to parse results: ${parseError.message}`
                    })),
                    error: `Parse error: ${parseError.message}`,
                    executionTime: 0,
                    output: stdout
                });
            }
        });

        python.on('error', (error) => {
            // Clean up temp file
            try {
                fs.unlinkSync(tempFile);
            } catch (e) {
                // Ignore cleanup errors
            }

            parentPort.postMessage({
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
                    explanation: `Execution error: ${error.message}`
                })),
                error: error.message,
                executionTime: 0
            });
        });

    } catch (error) {
        parentPort.postMessage({
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
                explanation: `Setup error: ${error.message}`
            })),
            error: error.message,
            executionTime: 0
        });
    }
}

function generatePythonTestCode(userCode, testCases) {
    const safeTestCases = Array.isArray(testCases) ? testCases : [];

    return `
import json
import time
import sys
import traceback

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
    result = None

    # Try to find the main function dynamically
    main_functions = [name for name, obj in globals().items() if callable(obj) and not name.startswith('_') and name not in ['json', 'time', 'sys', 'traceback']]

    if main_functions:
        func = globals()[main_functions[0]]

        # Handle different input formats (input is already cleaned by testCaseProcessor)
        if isinstance(input_data, dict):
            # Handle {target: x, nums: []} format
            values = list(input_data.values())
            result = func(*values)
        elif isinstance(input_data, list) and len(input_data) >= 2:
            # Handle [target, nums] format
            result = func(*input_data)
        else:
            # Single parameter
            result = func(input_data)
    else:
        result = None

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
    print(f"Traceback: {traceback.format_exc()}")

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

function parsePythonOutput(output, testCases) {
    // Fallback parser if JSON results aren't found
    const lines = output.split('\n');
    const results = [];
    let passed = 0;
    let failed = 0;

    for (let i = 0; i < testCases.length; i++) {
        const testPassed = output.includes(`Test Case ${i + 1}`) && output.includes('✅ PASS');

        if (testPassed) {
            passed++;
        } else {
            failed++;
        }

        results.push({
            testCase: i + 1,
            passed: testPassed,
            input: testCases[i].input,
            expectedOutput: testCases[i].output,
            actualOutput: null,
            executionTime: 0,
            explanation: testPassed ? 'Test passed' : 'Test failed'
        });
    }

    return {
        success: failed === 0,
        passed,
        failed,
        total: testCases.length,
        testCaseResults: results,
        output
    };
}

// Start execution
executePython();