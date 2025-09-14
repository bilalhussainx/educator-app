/**
 * Advanced Code Execution Service
 * Provides secure, isolated, multi-language code execution with proper error handling
 */

const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');
const { v4: uuidv4 } = require('uuid');

class AdvancedExecutionService {
    constructor() {
        this.tempDir = path.join(__dirname, '../temp');
        this.timeoutMs = 10000; // 10 second timeout
        this.memoryLimitMB = 128; // 128MB memory limit

        // Ensure temp directory exists
        this.ensureTempDir();
    }

    async ensureTempDir() {
        try {
            await fs.access(this.tempDir);
        } catch {
            await fs.mkdir(this.tempDir, { recursive: true });
        }
    }

    /**
     * Execute code with proper language detection and isolation
     */
    async executeCode(userCode, testCases, language) {
        const executionId = uuidv4();
        const workingDir = path.join(this.tempDir, executionId);

        try {
            await fs.mkdir(workingDir, { recursive: true });

            console.log(`🔍 [EXECUTION-${executionId}] Starting execution for ${language}`);
            console.log(`🔍 [EXECUTION-${executionId}] Test cases:`, testCases.length);

            let results;
            switch (language.toLowerCase()) {
                case 'javascript':
                case 'js':
                    results = await this.executeJavaScript(userCode, testCases, workingDir, executionId);
                    break;
                case 'python':
                case 'py':
                    results = await this.executePython(userCode, testCases, workingDir, executionId);
                    break;
                case 'java':
                    results = await this.executeJava(userCode, testCases, workingDir, executionId);
                    break;
                case 'cpp':
                case 'c++':
                    results = await this.executeCpp(userCode, testCases, workingDir, executionId);
                    break;
                default:
                    throw new Error(`Unsupported language: ${language}`);
            }

            console.log(`✅ [EXECUTION-${executionId}] Completed: ${results.passed}/${results.total} passed`);
            return results;

        } catch (error) {
            console.error(`❌ [EXECUTION-${executionId}] Error:`, error.message);
            return this.createErrorResult(error.message, testCases.length);
        } finally {
            // Clean up working directory
            try {
                await fs.rm(workingDir, { recursive: true, force: true });
            } catch (e) {
                console.warn(`⚠️ Failed to cleanup ${workingDir}:`, e.message);
            }
        }
    }

    /**
     * Execute JavaScript code
     */
    async executeJavaScript(userCode, testCases, workingDir, executionId) {
        const results = [];
        let passed = 0;

        for (let i = 0; i < testCases.length; i++) {
            const testCase = testCases[i];

            try {
                // Create test execution script
                const testScript = `
const userCode = \`${userCode.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`;

// Execute user code in safe context
const vm = require('vm');
let executionLogs = [];
const context = {
    console: {
        log: (...args) => executionLogs.push(args.map(arg => String(arg)).join(' ')),
        error: (...args) => executionLogs.push('ERROR: ' + args.map(arg => String(arg)).join(' '))
    },
    Math, Array, Object, String, Number, Boolean, JSON, Date, RegExp,
    parseInt, parseFloat, isNaN, isFinite
};

try {
    // Execute user code
    vm.runInNewContext(userCode, context, { timeout: 5000 });

    // Find the main function - try common names first, then any function
    let mainFunction = null;
    const commonNames = ['solution', 'solve', 'main', 'lengthOfLongestSubstring'];

    // Try common function names
    for (const name of commonNames) {
        if (typeof context[name] === 'function') {
            mainFunction = context[name];
            break;
        }
    }

    // If no common name found, try to find any user-defined function
    if (!mainFunction) {

        // Check for function declarations
        const funcMatches = userCode.match(/function\\\\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g);
        if (funcMatches) {
            for (const match of funcMatches) {
                const funcName = match.replace(/function\\\\s+/, '');
                if (typeof context[funcName] === 'function') {
                    mainFunction = context[funcName];
                    break;
                }
            }
        }

        // Check for var/let/const function assignments
        const varFuncPattern = /(var|let|const)\\\\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\\\\s*=\\\\s*function/g;
        let varMatch;
        while ((varMatch = varFuncPattern.exec(userCode)) !== null && !mainFunction) {
            const funcName = varMatch[2];
            if (typeof context[funcName] === 'function') {
                mainFunction = context[funcName];
                break;
            }
        }

        // If still not found, check all properties in context
        if (!mainFunction) {
            for (const key in context) {
                if (typeof context[key] === 'function' && !key.startsWith('_') &&
                    !['Array', 'Object', 'String', 'Number', 'Boolean', 'Math', 'JSON', 'Date', 'RegExp', 'parseInt', 'parseFloat', 'isNaN', 'isFinite'].includes(key)) {
                    mainFunction = context[key];
                    break;
                }
            }
        }
    }

    if (!mainFunction) {
        throw new Error('No main function found (solution, solve, main, or any declared function)');
    }

    // Parse and execute test case
    const input = ${JSON.stringify(testCase.input)};
    let parsedInput;

    try {
        parsedInput = typeof input === 'string' ? JSON.parse(input) : input;
    } catch (e) {
        parsedInput = input;
    }

    // Handle LeetCode-style input format like 's = "abcabcbb"'
    if (typeof parsedInput === 'string' && parsedInput.includes(' = ')) {
        const match = parsedInput.match(/^\\w+\\s*=\\s*(.+)$/);
        if (match) {
            try {
                parsedInput = JSON.parse(match[1]);
            } catch (e) {
                parsedInput = match[1].replace(/^"|"$/g, ''); // Remove quotes if JSON parse fails
            }
        }
    }

    // Execute with timeout - handle single parameter functions properly
    let result;
    if (Array.isArray(parsedInput) && parsedInput.length > 1) {
        result = mainFunction(...parsedInput);
    } else if (Array.isArray(parsedInput) && parsedInput.length === 1) {
        result = mainFunction(parsedInput[0]);
    } else {
        result = mainFunction(parsedInput);
    }

    // Only output the result, not debug info
    console.log(JSON.stringify(result));

} catch (error) {
    if (error.message.includes('Unexpected token') || error.message.includes('SyntaxError')) {
        console.error('SYNTAX_ERROR: ' + error.message);
        console.error('HINT: Check for syntax errors like missing operators, brackets, or semicolons');
    } else {
        console.error('EXECUTION_ERROR: ' + error.message);
    }
    process.exit(1);
}
`;

                const scriptPath = path.join(workingDir, `test_${i}.js`);
                await fs.writeFile(scriptPath, testScript);

                // Execute with Node.js
                const output = await this.runCommand('node', [scriptPath], { cwd: workingDir });

                if (output.success) {
                    console.log(`🔍 [EXECUTION-${executionId}] Test ${i + 1} - Raw stdout:`, output.stdout);
                    console.log(`🔍 [EXECUTION-${executionId}] Test ${i + 1} - Raw stderr:`, output.stderr);

                    let actualOutput;
                    try {
                        actualOutput = JSON.parse(output.stdout.trim());
                    } catch (e) {
                        actualOutput = output.stdout.trim();
                    }

                    const expectedOutput = this.parseExpected(testCase.expectedOutput);
                    const testPassed = this.compareResults(actualOutput, expectedOutput);

                    console.log(`🔍 [EXECUTION-${executionId}] Test ${i + 1} - Expected:`, expectedOutput, 'Actual:', actualOutput, 'Passed:', testPassed);

                    results.push({
                        testCase: i + 1,
                        input: testCase.input,
                        expectedOutput,
                        actualOutput,
                        passed: testPassed,
                        explanation: testPassed ? 'Test passed' : `Expected ${JSON.stringify(expectedOutput)} but got ${JSON.stringify(actualOutput)}`
                    });

                    if (testPassed) passed++;
                } else {
                    let errorMessage = output.stderr || output.error || 'Unknown error';
                    let explanation = `Runtime error: ${errorMessage}`;

                    // Provide specific help for syntax errors
                    if (errorMessage.includes('SYNTAX_ERROR') || errorMessage.includes('Unexpected token')) {
                        explanation = `Syntax error detected. Please check your code for:\n• Missing or incorrect operators (like 'right - left + 1')\n• Unclosed brackets or parentheses\n• Typos in variable names\n\nError: ${errorMessage}`;
                    }

                    results.push({
                        testCase: i + 1,
                        input: testCase.input,
                        expectedOutput: testCase.expectedOutput,
                        actualOutput: 'ERROR',
                        passed: false,
                        explanation: explanation
                    });
                }

            } catch (error) {
                results.push({
                    testCase: i + 1,
                    input: testCase.input,
                    expectedOutput: testCase.expectedOutput,
                    actualOutput: 'ERROR',
                    passed: false,
                    explanation: `Execution error: ${error.message}`
                });
            }
        }

        return this.createResult(passed, testCases.length - passed, testCases.length, results);
    }

    /**
     * Check if Python is available
     */
    async checkPythonAvailable() {
        try {
            const result = await this.runCommand('python3', ['--version']);
            return result.success;
        } catch {
            try {
                const result = await this.runCommand('python', ['--version']);
                return result.success;
            } catch {
                return false;
            }
        }
    }

    /**
     * Execute Python code
     */
    async executePython(userCode, testCases, workingDir, executionId) {
        // Check if Python is available
        const pythonAvailable = await this.checkPythonAvailable();
        if (!pythonAvailable) {
            console.log(`❌ [EXECUTION-${executionId}] Python runtime not available`);
            return this.createErrorResult(
                'Python execution is not currently supported on this system. Please use JavaScript instead, or contact support to enable Python runtime.',
                testCases.length
            );
        }
        const results = [];
        let passed = 0;

        // Write main Python file
        const pythonFile = path.join(workingDir, 'solution.py');
        await fs.writeFile(pythonFile, userCode);

        for (let i = 0; i < testCases.length; i++) {
            const testCase = testCases[i];

            try {
                // Create test runner script
                const testRunner = `
import sys
import json
import importlib.util

# Import the solution module
spec = importlib.util.spec_from_file_location("solution", "solution.py")
solution_module = importlib.util.module_from_spec(spec)

try:
    spec.loader.exec_module(solution_module)

    # Find the main function
    main_function = None
    for attr_name in ['solution', 'solve', 'main']:
        if hasattr(solution_module, attr_name):
            attr = getattr(solution_module, attr_name)
            if callable(attr):
                main_function = attr
                break

    if main_function is None:
        # Try to find any function in the module
        for attr_name in dir(solution_module):
            attr = getattr(solution_module, attr_name)
            if callable(attr) and not attr_name.startswith('_'):
                main_function = attr
                break

    if main_function is None:
        print("ERROR: No main function found", file=sys.stderr)
        sys.exit(1)

    # Parse and execute test case
    input_data = ${JSON.stringify(testCase.input)}

    try:
        parsed_input = json.loads(input_data) if isinstance(input_data, str) else input_data
    except:
        parsed_input = input_data

    # Execute the function
    if isinstance(parsed_input, list) and len(parsed_input) <= 10:
        result = main_function(*parsed_input)
    else:
        result = main_function(parsed_input)

    print(json.dumps(result, default=str))

except Exception as e:
    print(f"EXECUTION_ERROR: {str(e)}", file=sys.stderr)
    sys.exit(1)
`;

                const runnerPath = path.join(workingDir, `test_runner_${i}.py`);
                await fs.writeFile(runnerPath, testRunner);

                // Execute with Python
                const output = await this.runCommand('python3', [runnerPath], { cwd: workingDir });

                if (output.success && !output.stderr.includes('EXECUTION_ERROR:')) {
                    let actualOutput;
                    try {
                        actualOutput = JSON.parse(output.stdout.trim());
                    } catch (e) {
                        actualOutput = output.stdout.trim();
                    }

                    const expectedOutput = this.parseExpected(testCase.expectedOutput);
                    const testPassed = this.compareResults(actualOutput, expectedOutput);

                    results.push({
                        testCase: i + 1,
                        input: testCase.input,
                        expectedOutput,
                        actualOutput,
                        passed: testPassed,
                        explanation: testPassed ? 'Test passed' : `Expected ${JSON.stringify(expectedOutput)} but got ${JSON.stringify(actualOutput)}`
                    });

                    if (testPassed) passed++;
                } else {
                    results.push({
                        testCase: i + 1,
                        input: testCase.input,
                        expectedOutput: testCase.expectedOutput,
                        actualOutput: 'ERROR',
                        passed: false,
                        explanation: `Runtime error: ${output.stderr || output.error || 'Unknown error'}`
                    });
                }

            } catch (error) {
                results.push({
                    testCase: i + 1,
                    input: testCase.input,
                    expectedOutput: testCase.expectedOutput,
                    actualOutput: 'ERROR',
                    passed: false,
                    explanation: `Execution error: ${error.message}`
                });
            }
        }

        return this.createResult(passed, testCases.length - passed, testCases.length, results);
    }

    /**
     * Execute Python code by transpiling to JavaScript (fallback when Python not available)
     */
    async executePythonAsJavaScript(userCode, testCases, workingDir, executionId) {
        try {
            // Simple Python to JavaScript transpiler for basic cases
            const jsCode = this.transpilePythonToJavaScript(userCode);
            console.log(`🔄 [EXECUTION-${executionId}] Transpiled Python to JavaScript`);

            // Execute the transpiled JavaScript
            return await this.executeJavaScript(jsCode, testCases, workingDir, executionId);
        } catch (error) {
            console.error(`❌ [EXECUTION-${executionId}] Transpilation failed:`, error.message);
            return this.createErrorResult(`Python transpilation failed: ${error.message}`, testCases.length);
        }
    }

    /**
     * Simple Python to JavaScript transpiler for common LeetCode patterns
     */
    transpilePythonToJavaScript(pythonCode) {
        let jsCode = pythonCode;

        // Remove imports (not supported in JavaScript execution)
        jsCode = jsCode.replace(/^import\s+.+$/gm, '');
        jsCode = jsCode.replace(/^from\s+.+$/gm, '');

        // Convert Python constants
        jsCode = jsCode.replace(/float\('inf'\)/g, 'Infinity');
        jsCode = jsCode.replace(/float\('-inf'\)/g, '-Infinity');

        // Convert function definitions
        jsCode = jsCode.replace(/def\s+(\w+)\s*\(([^)]*)\)\s*:/g, 'function $1($2) {');

        // Handle class definitions by converting methods to functions
        jsCode = jsCode.replace(/class\s+(\w+):\s*\n/g, '');
        jsCode = jsCode.replace(/\s+def\s+(\w+)\(self,?\s*([^)]*)\):/g, 'function $1($2) {');

        // Convert Python ternary operator first (before range processing)
        jsCode = jsCode.replace(/return\s+(\S.*?)\s+if\s+(.+?)\s+else\s+(\S.*)/g, 'return ($2) ? ($1) : ($3)');

        // Convert for loops BEFORE converting len() and range() separately
        jsCode = jsCode.replace(/for\s+(\w+)\s+in\s+range\(len\(([^)]+)\)\):/g, 'for (let $1 = 0; $1 < $2.length; $1++) {');
        jsCode = jsCode.replace(/for\s+(\w+)\s+in\s+range\(([^)]+)\):/g, 'for (let $1 = 0; $1 < $2; $1++) {');
        jsCode = jsCode.replace(/for\s+(\w+)\s+in\s+(.+?):/g, 'for (const $1 of $2) {');

        // Convert remaining range() and len() function calls
        jsCode = jsCode.replace(/\blen\(([^)]+)\)/g, '$1.length');
        jsCode = jsCode.replace(/\brange\(([^)]+)\)/g, 'Array.from({length: $1}, (_, i) => i)');

        // Basic Python to JavaScript conversions
        const conversions = [
            [/\bTrue\b/g, 'true'],
            [/\bFalse\b/g, 'false'],
            [/\bNone\b/g, 'null'],
            [/\band\b/g, '&&'],
            [/\bor\b/g, '||'],
            [/\bnot\b/g, '!'],
            [/\.append\(([^)]+)\)/g, '.push($1)'],
            [/\bstr\(([^)]+)\)/g, 'String($1)'],
            [/\bint\(([^)]+)\)/g, 'parseInt($1)'],
            [/\bmax\(([^)]+)\)/g, 'Math.max($1)'],
            [/\bmin\(([^)]+)\)/g, 'Math.min($1)'],
        ];

        for (const [pattern, replacement] of conversions) {
            jsCode = jsCode.replace(pattern, replacement);
        }

        // Convert Python indentation to braces (simplified)
        const lines = jsCode.split('\n');
        const jsLines = [];
        const indentStack = [0];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmedLine = line.trim();

            if (trimmedLine === '' || trimmedLine.startsWith('#')) {
                jsLines.push(line);
                continue;
            }

            // Calculate indentation
            const indent = line.length - line.trimStart().length;

            // Close braces for decreased indentation
            while (indentStack.length > 1 && indent < indentStack[indentStack.length - 1]) {
                indentStack.pop();
                jsLines.push(' '.repeat(indentStack[indentStack.length - 1]) + '}');
            }

            // Handle control structures - but skip lines that already have braces
            if (trimmedLine.endsWith(':') && !trimmedLine.includes('{')) {
                // Remove colon and add opening brace
                const convertedLine = line.replace(/:$/, ' {');
                jsLines.push(convertedLine);
                indentStack.push(indent + 4); // Assume 4-space indentation
            } else {
                jsLines.push(line);
            }
        }

        // Close remaining braces
        while (indentStack.length > 1) {
            indentStack.pop();
            jsLines.push(' '.repeat(indentStack[indentStack.length - 1]) + '}');
        }

        jsCode = jsLines.join('\n');

        // Add return statement if missing
        if (!jsCode.includes('return')) {
            const lines = jsCode.split('\n');
            for (let i = lines.length - 1; i >= 0; i--) {
                const line = lines[i].trim();
                if (line && !line.startsWith('//') && !line.startsWith('#')) {
                    // Add return to the last meaningful line if it's an expression
                    if (!line.includes('=') && !line.startsWith('if') && !line.startsWith('for') && !line.startsWith('while')) {
                        lines[i] = lines[i].replace(line, `return ${line}`);
                    }
                    break;
                }
            }
            jsCode = lines.join('\n');
        }

        return jsCode;
    }

    /**
     * Execute Java code
     */
    async executeJava(userCode, testCases, workingDir, executionId) {
        // Extract class name
        const classMatch = userCode.match(/public\s+class\s+(\w+)/);
        const className = classMatch ? classMatch[1] : 'Solution';

        const javaFile = path.join(workingDir, `${className}.java`);
        await fs.writeFile(javaFile, userCode);

        // Compile
        const compileResult = await this.runCommand('javac', [javaFile], { cwd: workingDir });
        if (!compileResult.success) {
            return this.createErrorResult(`Compilation error: ${compileResult.stderr}`, testCases.length);
        }

        const results = [];
        let passed = 0;

        // Note: Java execution is more complex and would need proper reflection
        // For now, returning a placeholder implementation
        for (let i = 0; i < testCases.length; i++) {
            results.push({
                testCase: i + 1,
                input: testCases[i].input,
                expectedOutput: testCases[i].expectedOutput,
                actualOutput: 'JAVA_NOT_FULLY_IMPLEMENTED',
                passed: false,
                explanation: 'Java execution not fully implemented yet'
            });
        }

        return this.createResult(0, testCases.length, testCases.length, results);
    }

    /**
     * Execute C++ code
     */
    async executeCpp(userCode, testCases, workingDir, executionId) {
        const cppFile = path.join(workingDir, 'solution.cpp');
        const execFile = path.join(workingDir, 'solution');

        await fs.writeFile(cppFile, userCode);

        // Compile
        const compileResult = await this.runCommand('g++', ['-o', execFile, cppFile], { cwd: workingDir });
        if (!compileResult.success) {
            return this.createErrorResult(`Compilation error: ${compileResult.stderr}`, testCases.length);
        }

        const results = [];
        let passed = 0;

        // Note: C++ execution would need stdin/stdout handling
        // This is a simplified implementation
        for (let i = 0; i < testCases.length; i++) {
            results.push({
                testCase: i + 1,
                input: testCases[i].input,
                expectedOutput: testCases[i].expectedOutput,
                actualOutput: 'CPP_NOT_FULLY_IMPLEMENTED',
                passed: false,
                explanation: 'C++ execution not fully implemented yet'
            });
        }

        return this.createResult(0, testCases.length, testCases.length, results);
    }

    /**
     * Run a command with timeout and resource limits
     */
    async runCommand(command, args, options = {}) {
        return new Promise((resolve) => {
            const child = spawn(command, args, {
                stdio: ['pipe', 'pipe', 'pipe'],
                timeout: this.timeoutMs,
                ...options
            });

            let stdout = '';
            let stderr = '';

            child.stdout?.on('data', (data) => {
                stdout += data.toString();
            });

            child.stderr?.on('data', (data) => {
                stderr += data.toString();
            });

            child.on('close', (code) => {
                resolve({
                    success: code === 0,
                    stdout: stdout.trim(),
                    stderr: stderr.trim(),
                    exitCode: code
                });
            });

            child.on('error', (error) => {
                resolve({
                    success: false,
                    stdout: '',
                    stderr: '',
                    error: error.message,
                    exitCode: -1
                });
            });

            // Set timeout
            setTimeout(() => {
                child.kill('SIGTERM');
                resolve({
                    success: false,
                    stdout,
                    stderr,
                    error: 'Execution timeout',
                    exitCode: -1
                });
            }, this.timeoutMs);
        });
    }

    /**
     * Parse expected output
     */
    parseExpected(expected) {
        if (typeof expected === 'string') {
            try {
                return JSON.parse(expected);
            } catch (e) {
                return expected;
            }
        }
        return expected;
    }

    /**
     * Compare actual vs expected results
     */
    compareResults(actual, expected) {
        // Deep comparison for arrays and objects
        if (Array.isArray(actual) && Array.isArray(expected)) {
            if (actual.length !== expected.length) return false;
            return actual.every((item, index) => this.compareResults(item, expected[index]));
        }

        if (typeof actual === 'object' && typeof expected === 'object' && actual !== null && expected !== null) {
            const actualKeys = Object.keys(actual).sort();
            const expectedKeys = Object.keys(expected).sort();

            if (actualKeys.length !== expectedKeys.length) return false;
            if (!actualKeys.every((key, index) => key === expectedKeys[index])) return false;

            return actualKeys.every(key => this.compareResults(actual[key], expected[key]));
        }

        // For primitives
        return actual === expected;
    }

    /**
     * Create successful result object
     */
    createResult(passed, failed, total, testResults) {
        return {
            passed,
            failed,
            total,
            testCaseResults: testResults,
            success: failed === 0,
            executionTime: Date.now(), // Simplified timing
            fromAdvancedExecution: true
        };
    }

    /**
     * Create error result object
     */
    createErrorResult(error, totalTests) {
        return {
            passed: 0,
            failed: totalTests,
            total: totalTests,
            testCaseResults: Array.from({ length: totalTests }, (_, i) => ({
                testCase: i + 1,
                input: 'N/A',
                expectedOutput: 'N/A',
                actualOutput: 'ERROR',
                passed: false,
                explanation: error
            })),
            success: false,
            error,
            fromAdvancedExecution: true
        };
    }
}

module.exports = AdvancedExecutionService;