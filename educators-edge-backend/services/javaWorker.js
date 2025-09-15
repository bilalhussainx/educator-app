const { parentPort, workerData } = require('worker_threads');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

async function executeJava() {
    const { userCode, testCases } = workerData;

    try {
        // Create temporary directory for Java files
        const tempDir = path.join(os.tmpdir(), `java_${Date.now()}`);
        fs.mkdirSync(tempDir, { recursive: true });

        const javaFile = path.join(tempDir, 'Solution.java');

        // Generate Java test execution code
        const javaCode = generateJavaTestCode(userCode, testCases);

        // Write to temp file
        fs.writeFileSync(javaFile, javaCode);

        // Compile Java
        const javac = spawn('javac', [javaFile], {
            timeout: 10000,
            killSignal: 'SIGKILL',
            cwd: tempDir
        });

        let compileError = '';

        javac.stderr.on('data', (data) => {
            compileError += data.toString();
        });

        javac.on('close', (code) => {
            if (code !== 0) {
                // Compilation failed
                cleanup(tempDir);
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
                        error: compileError || `Compilation failed with code ${code}`,
                        executionTime: 0,
                        explanation: `Compilation error: ${compileError || 'Failed to compile'}`
                    })),
                    error: compileError || `Compilation failed`,
                    executionTime: 0
                });
                return;
            }

            // Run Java
            const java = spawn('java', ['Solution'], {
                timeout: 5000,
                killSignal: 'SIGKILL',
                cwd: tempDir
            });

            let stdout = '';
            let stderr = '';

            java.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            java.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            java.on('close', (runCode) => {
                cleanup(tempDir);

                if (runCode !== 0) {
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
                            error: stderr || `Java process exited with code ${runCode}`,
                            executionTime: 0,
                            explanation: `Runtime error: ${stderr || 'Process failed'}`
                        })),
                        error: stderr || `Process exited with code ${runCode}`,
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
                        parentPort.postMessage(parseJavaOutput(stdout, testCases));
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

            java.on('error', (error) => {
                cleanup(tempDir);
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
        });

        javac.on('error', (error) => {
            cleanup(tempDir);
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
                    explanation: `Compilation error: ${error.message}`
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

function generateJavaTestCode(userCode, testCases) {
    const safeTestCases = Array.isArray(testCases) ? testCases : [];

    return `
import java.util.*;
import java.util.concurrent.TimeUnit;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.JsonProcessingException;

${userCode}

public class TestRunner {
    private static ObjectMapper mapper = new ObjectMapper();

    public static void main(String[] args) {
        List<Map<String, Object>> testResults = new ArrayList<>();

        ${safeTestCases.map((testCase, index) => `
        try {
            System.out.println("\\n=== Test Case ${index + 1} ===");

            // Parse input data
            String inputJson = "${JSON.stringify(testCase.input).replace(/"/g, '\\"')}";
            Object inputData = mapper.readValue(inputJson, Object.class);

            String expectedJson = "${JSON.stringify(testCase.output).replace(/"/g, '\\"')}";
            Object expected = mapper.readValue(expectedJson, Object.class);

            System.out.println("Input: " + inputJson);

            long startTime = System.currentTimeMillis();

            // Try to find and call the main solution method
            Object result = null;
            try {
                // This would need to be customized based on the specific problem
                // For now, this is a placeholder
                result = callSolutionMethod(inputData);
            } catch (Exception e) {
                throw e;
            }

            long executionTime = System.currentTimeMillis() - startTime;

            System.out.println("Output: " + mapper.writeValueAsString(result));
            System.out.println("Expected: " + expectedJson);

            boolean passed = Objects.deepEquals(result, expected);
            System.out.println("Status: " + (passed ? "✅ PASS" : "❌ FAIL"));

            Map<String, Object> testResult = new HashMap<>();
            testResult.put("testCase", ${index + 1});
            testResult.put("passed", passed);
            testResult.put("input", inputData);
            testResult.put("expectedOutput", expected);
            testResult.put("actualOutput", result);
            testResult.put("executionTime", executionTime);
            testResult.put("explanation", passed ? "Test passed successfully" :
                "Expected " + expectedJson + ", got " + mapper.writeValueAsString(result));

            testResults.add(testResult);

        } catch (Exception error) {
            System.out.println("\\n=== Test Case ${index + 1} ===");
            System.out.println("❌ ERROR: " + error.getMessage());
            error.printStackTrace();

            Map<String, Object> testResult = new HashMap<>();
            testResult.put("testCase", ${index + 1});
            testResult.put("passed", false);
            testResult.put("input", "${JSON.stringify(testCase.input).replace(/"/g, '\\"')}");
            testResult.put("expectedOutput", "${JSON.stringify(testCase.output).replace(/"/g, '\\"')}");
            testResult.put("actualOutput", null);
            testResult.put("error", error.getMessage());
            testResult.put("executionTime", 0);
            testResult.put("explanation", "Runtime error: " + error.getMessage());

            testResults.add(testResult);
        }
        `).join('\n')}

        // Summary
        long passed = testResults.stream().mapToLong(r -> (Boolean) r.get("passed") ? 1 : 0).sum();
        long failed = testResults.size() - passed;

        System.out.println("\\n=== SUMMARY ===");
        System.out.println("Passed: " + passed + "/" + testResults.size());
        System.out.println("Failed: " + failed + "/" + testResults.size());

        // Output results in JSON format for parsing
        try {
            Map<String, Object> results = new HashMap<>();
            results.put("success", failed == 0);
            results.put("passed", (int)passed);
            results.put("failed", (int)failed);
            results.put("total", testResults.size());
            results.put("testCaseResults", testResults);

            System.out.println("\\n__RESULTS__" + mapper.writeValueAsString(results) + "__END_RESULTS__");
        } catch (JsonProcessingException e) {
            System.err.println("Failed to serialize results: " + e.getMessage());
        }
    }

    // Placeholder method - would need to be customized for each problem
    private static Object callSolutionMethod(Object inputData) {
        // This would call the actual solution method from the user's code
        // For now, return null to indicate Java execution needs implementation
        throw new RuntimeException("Java method calling not implemented yet");
    }
}
`;
}

function parseJavaOutput(output, testCases) {
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

function cleanup(dir) {
    try {
        if (fs.existsSync(dir)) {
            fs.rmSync(dir, { recursive: true, force: true });
        }
    } catch (e) {
        console.warn('Failed to cleanup temp directory:', e.message);
    }
}

// Start execution
executeJava();