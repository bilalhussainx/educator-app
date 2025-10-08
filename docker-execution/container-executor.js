/**
 * =================================================================
 * CONTAINER EXECUTION SCRIPT
 * =================================================================
 * Runs inside Docker container to execute user code safely
 */

const fs = require('fs');
const { spawn, execSync } = require('child_process');
const path = require('path');

class ContainerExecutor {
    constructor() {
        this.tempDir = '/app/temp';
        this.timeout = 5000; // 5 second execution timeout
    }

    async execute() {
        try {
            // Read input data
            const inputPath = path.join(this.tempDir, 'input.json');
            const inputData = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

            const { code, testCases, language, problemMeta } = inputData;

            console.log(`Executing ${language} code with ${testCases.length} test cases`);

            // Extract function info
            const functionInfo = this.extractFunctionInfo(code, language);

            // Generate test wrapper
            const testCode = this.generateTestWrapper(code, testCases, language, functionInfo);

            // Write test file
            const fileName = this.getFileName(language);
            const filePath = path.join(this.tempDir, fileName);
            fs.writeFileSync(filePath, testCode);

            // Execute based on language
            const results = await this.executeTestCode(filePath, language, testCases.length);

            // Output results
            console.log(JSON.stringify({
                success: true,
                ...results
            }));

        } catch (error) {
            console.error(JSON.stringify({
                success: false,
                error: error.message,
                stack: error.stack
            }));
        }
    }

    extractFunctionInfo(code, language) {
        const patterns = {
            javascript: /function\s+(\w+)\s*\([^)]*\)|(?:const|let|var)\s+(\w+)\s*=\s*\([^)]*\)\s*=>/,
            python: /def\s+(\w+)\s*\([^)]*\):/,
            java: /public\s+[\w\[\]<>]+\s+(\w+)\s*\([^)]*\)/
        };

        const pattern = patterns[language];
        if (!pattern) return { name: 'solution' };

        const match = code.match(pattern);
        return { name: match ? (match[1] || match[2]) : 'solution' };
    }

    generateTestWrapper(code, testCases, language, functionInfo) {
        switch (language) {
            case 'javascript':
                return this.generateJSTestWrapper(code, testCases, functionInfo);
            case 'python':
                return this.generatePythonTestWrapper(code, testCases, functionInfo);
            case 'java':
                return this.generateJavaTestWrapper(code, testCases, functionInfo);
            default:
                throw new Error(`Unsupported language: ${language}`);
        }
    }

    generateJSTestWrapper(code, testCases, functionInfo) {
        const testCasesStr = testCases.map((tc, i) =>
            `{ input: ${JSON.stringify(tc.input)}, expected: ${JSON.stringify(tc.expected)}, index: ${i + 1} }`
        ).join(',\n    ');

        return `
${code}

const testCases = [${testCasesStr}];
const results = [];
let passed = 0;
const startTime = Date.now();

for (const testCase of testCases) {
    try {
        const input = Array.isArray(testCase.input) ? testCase.input : [testCase.input];
        const result = ${functionInfo.name}(...input);
        const success = JSON.stringify(result) === JSON.stringify(testCase.expected);

        results.push({
            index: testCase.index,
            input: testCase.input,
            expected: testCase.expected,
            actual: result,
            passed: success,
            error: null
        });

        if (success) passed++;
    } catch (error) {
        results.push({
            index: testCase.index,
            input: testCase.input,
            expected: testCase.expected,
            actual: null,
            passed: false,
            error: error.message
        });
    }
}

console.log(JSON.stringify({
    testResults: results,
    passedTests: passed,
    failedTests: testCases.length - passed,
    totalTests: testCases.length,
    executionTime: Date.now() - startTime
}));
`;
    }

    generatePythonTestWrapper(code, testCases, functionInfo) {
        const testCasesStr = testCases.map((tc, i) =>
            `{"input": ${this.formatPythonValue(tc.input)}, "expected": ${this.formatPythonValue(tc.expected)}, "index": ${i + 1}}`
        ).join(',\n    ');

        return `
import json
import time

${code}

test_cases = [${testCasesStr}]
results = []
passed = 0
start_time = time.time()

for test_case in test_cases:
    try:
        input_args = test_case["input"] if isinstance(test_case["input"], list) else [test_case["input"]]
        result = ${functionInfo.name}(*input_args)
        success = result == test_case["expected"]

        results.append({
            "index": test_case["index"],
            "input": test_case["input"],
            "expected": test_case["expected"],
            "actual": result,
            "passed": success,
            "error": None
        })

        if success:
            passed += 1
    except Exception as error:
        results.append({
            "index": test_case["index"],
            "input": test_case["input"],
            "expected": test_case["expected"],
            "actual": None,
            "passed": False,
            "error": str(error)
        })

print(json.dumps({
    "testResults": results,
    "passedTests": passed,
    "failedTests": len(test_cases) - passed,
    "totalTests": len(test_cases),
    "executionTime": int((time.time() - start_time) * 1000)
}))
`;
    }

    generateJavaTestWrapper(code, testCases, functionInfo) {
        // Java implementation would require compilation
        throw new Error('Java execution not yet implemented in container');
    }

    formatPythonValue(value) {
        if (Array.isArray(value)) {
            return '[' + value.map(v => this.formatPythonValue(v)).join(', ') + ']';
        }
        if (typeof value === 'string') {
            return `"${value}"`;
        }
        if (value === null) {
            return 'None';
        }
        if (typeof value === 'boolean') {
            return value ? 'True' : 'False';
        }
        return String(value);
    }

    async executeTestCode(filePath, language, totalTests) {
        return new Promise((resolve, reject) => {
            let command, args;

            switch (language) {
                case 'javascript':
                    command = 'node';
                    args = [filePath];
                    break;
                case 'python':
                    command = 'python';
                    args = [filePath];
                    break;
                default:
                    reject(new Error(`Execution not supported: ${language}`));
                    return;
            }

            const child = spawn(command, args, {
                timeout: this.timeout,
                stdio: ['pipe', 'pipe', 'pipe']
            });

            let stdout = '';
            let stderr = '';

            child.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            child.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            child.on('close', (code) => {
                if (code === 0) {
                    try {
                        const result = JSON.parse(stdout.trim());
                        result.memory = Math.floor(Math.random() * 50) + 25; // Mock memory
                        resolve(result);
                    } catch (parseError) {
                        reject(new Error(`Parse error: ${parseError.message}`));
                    }
                } else {
                    reject(new Error(`Execution failed: ${stderr}`));
                }
            });

            child.on('error', reject);
        });
    }

    getFileName(language) {
        const extensions = {
            javascript: 'js',
            python: 'py',
            java: 'java'
        };
        return `test.${extensions[language] || 'txt'}`;
    }
}

// Execute if run directly
if (require.main === module) {
    const executor = new ContainerExecutor();
    executor.execute().catch(console.error);
}

module.exports = ContainerExecutor;