const { parentPort, workerData } = require('worker_threads');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

async function executePythonCode() {
    const { userCode, testCases, options } = workerData;

    try {
        // Create temporary Python file
        const tempDir = os.tmpdir();
        const tempFile = path.join(tempDir, `vm_code_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.py`);

        // Generate complete Python execution code
        const pythonCode = generatePythonExecutionCode(userCode, testCases);
        fs.writeFileSync(tempFile, pythonCode);

        // Execute Python with timeout
        const python = spawn('python', [tempFile], {
            timeout: options.timeout || 5000,
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
            // Cleanup
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
                        error: stderr || `Process exited with code ${code}`,
                        executionTime: 0,
                        explanation: `Python error: ${stderr || 'Process failed'}`
                    })),
                    error: stderr || `Process exited with code ${code}`,
                    language: 'python'
                });
                return;
            }

            // Parse results
            try {
                const resultsMatch = stdout.match(/__VM_RESULTS__(.+?)__END_VM_RESULTS__/s);
                if (resultsMatch) {
                    const result = JSON.parse(resultsMatch[1]);
                    result.language = 'python';
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
                    error: parseError.message,
                    language: 'python',
                    debugOutput: stdout
                });
            }
        });

        python.on('error', (error) => {
            // Cleanup
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
                language: 'python'
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
            language: 'python'
        });
    }
}

function generatePythonExecutionCode(userCode, testCases) {
    return `
import json
import time
import sys
import traceback
import inspect

# User's code
${userCode}

# Test execution framework
def run_tests():
    test_results = []

    # Find user's main function
    user_functions = [name for name, obj in globals().items()
                     if callable(obj) and not name.startswith('_')
                     and name not in ['json', 'time', 'sys', 'traceback', 'inspect', 'run_tests', 'call_function_with_input', 'deep_equal']]

    if not user_functions:
        return {
            'success': False,
            'passed': 0,
            'failed': len(${JSON.stringify(testCases)}),
            'total': len(${JSON.stringify(testCases)}),
            'testCaseResults': [{'testCase': i+1, 'passed': False, 'error': 'No function found', 'explanation': 'No callable function found in code'} for i in range(len(${JSON.stringify(testCases)}))],
            'error': 'No function found in user code'
        }

    main_function = globals()[user_functions[0]]
    test_cases = ${JSON.stringify(testCases)}

    for i, test_case in enumerate(test_cases):
        try:
            start_time = time.time()

            # Call function with appropriate input format
            result = call_function_with_input(main_function, test_case['input'])

            execution_time = int((time.time() - start_time) * 1000)
            expected = test_case['output']

            # Check if result matches expected output
            passed = deep_equal(result, expected)

            test_results.append({
                'testCase': i + 1,
                'passed': passed,
                'input': test_case['input'],
                'expectedOutput': expected,
                'actualOutput': result,
                'executionTime': execution_time,
                'explanation': 'Test passed successfully' if passed else f'Expected {json.dumps(expected)}, got {json.dumps(result)}'
            })

        except Exception as e:
            test_results.append({
                'testCase': i + 1,
                'passed': False,
                'input': test_case['input'],
                'expectedOutput': test_case['output'],
                'actualOutput': None,
                'error': str(e),
                'executionTime': 0,
                'explanation': f'Runtime error: {str(e)}'
            })

    passed_count = sum(1 for r in test_results if r['passed'])
    failed_count = len(test_results) - passed_count

    return {
        'success': failed_count == 0,
        'passed': passed_count,
        'failed': failed_count,
        'total': len(test_results),
        'testCaseResults': test_results
    }

def call_function_with_input(func, input_data):
    """Call function with appropriate input format"""
    if isinstance(input_data, dict):
        # Handle object inputs like {target: 7, nums: [2,3,1,2,4,3]}
        return func(**input_data) if len(inspect.signature(func).parameters) > 1 else func(input_data)
    elif isinstance(input_data, list):
        # Handle array inputs like [7, [2,3,1,2,4,3]]
        return func(*input_data) if len(input_data) > 1 else func(input_data[0] if len(input_data) == 1 else input_data)
    else:
        # Single parameter
        return func(input_data)

def deep_equal(a, b):
    """Deep equality check for validation"""
    if a is b:
        return True
    if type(a) != type(b):
        return False
    if isinstance(a, (list, tuple)):
        if len(a) != len(b):
            return False
        return all(deep_equal(x, y) for x, y in zip(a, b))
    if isinstance(a, dict):
        if set(a.keys()) != set(b.keys()):
            return False
        return all(deep_equal(a[k], b[k]) for k in a.keys())
    return a == b

# Run the tests and output results
try:
    results = run_tests()
    print(f"__VM_RESULTS__{json.dumps(results)}__END_VM_RESULTS__")
except Exception as e:
    error_result = {
        'success': False,
        'passed': 0,
        'failed': len(${JSON.stringify(testCases)}),
        'total': len(${JSON.stringify(testCases)}),
        'testCaseResults': [],
        'error': str(e)
    }
    print(f"__VM_RESULTS__{json.dumps(error_result)}__END_VM_RESULTS__")
`;
}

function parsePythonOutput(output, testCases) {
    // Fallback parser
    const lines = output.split('\\n');
    let passed = 0;
    let failed = 0;

    // Simple heuristic parsing
    for (let line of lines) {
        if (line.includes('PASS') || line.includes('✅')) passed++;
        if (line.includes('FAIL') || line.includes('❌')) failed++;
    }

    return {
        success: failed === 0,
        passed,
        failed,
        total: testCases.length,
        testCaseResults: testCases.map((tc, i) => ({
            testCase: i + 1,
            passed: i < passed,
            input: tc.input,
            expectedOutput: tc.output,
            actualOutput: null,
            executionTime: 0,
            explanation: i < passed ? 'Test passed' : 'Test failed'
        })),
        language: 'python',
        debugOutput: output
    };
}

// Start execution
executePythonCode();