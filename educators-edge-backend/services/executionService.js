// services/executionService.js (Definitive, Multi-Language Version)
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const executeCode = (code, language) => {
    return new Promise((resolve) => {
        console.log('🔍 [ExecutionService] Starting code execution');
        console.log('🔍 [ExecutionService] Input validation:');
        console.log('  - Code type:', typeof code);
        console.log('  - Code length:', code ? code.length : 'undefined');
        console.log('  - Language type:', typeof language);
        console.log('  - Language value:', language);
        console.log('  - Code preview:', code ? code.substring(0, 100) + '...' : 'NO CODE PROVIDED');

        // Enhanced input validation
        if (!code) {
            console.error('❌ [ExecutionService] No code provided');
            return resolve({
                success: false,
                output: 'Error: No code provided for execution'
            });
        }

        if (typeof code !== 'string') {
            console.error('❌ [ExecutionService] Code is not a string:', typeof code);
            return resolve({
                success: false,
                output: `Error: Code must be a string, received ${typeof code}`
            });
        }

        if (!language) {
            console.error('❌ [ExecutionService] No language specified');
            return resolve({
                success: false,
                output: 'Error: No programming language specified'
            });
        }

        const tempDir = path.join(__dirname, 'temp_code');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        const uniqueId = crypto.randomUUID();
        let command;
        let filePath;

        switch (language.toLowerCase()) {
            case 'javascript':
                filePath = path.join(tempDir, `${uniqueId}.js`);
                command = `node ${filePath}`;
                break;
            case 'python':
                filePath = path.join(tempDir, `${uniqueId}.py`);
                // Try different Python commands for Windows compatibility
                command = process.platform === 'win32' ? `python ${filePath}` : `python3 ${filePath}`;
                break;
            case 'java':
                // Java is special: it needs a specific class name and a two-step compile/run process.
                const className = "Main"; // Java entrypoint must be a class named Main
                filePath = path.join(tempDir, `${className}.java`);
                const compiledPath = path.join(tempDir, `${className}.class`);

                // Check if Java is available first using synchronous check
                let javacPath = 'javac';
                let javaPath = 'java';

                try {
                    const { execSync } = require('child_process');
                    execSync('javac -version', { stdio: 'ignore' });
                } catch (javaError) {
                    // Try common Windows installation paths
                    const commonPaths = [
                        'C:\\Program Files\\Microsoft\\jdk-17.0.16.8-hotspot\\bin\\javac.exe',
                        'C:\\Program Files\\Java\\jdk-17\\bin\\javac.exe',
                        'C:\\Program Files\\Java\\jdk-11\\bin\\javac.exe',
                        'C:\\Program Files\\Eclipse Adoptium\\jdk-17\\bin\\javac.exe'
                    ];

                    let foundJava = false;
                    for (const javaExePath of commonPaths) {
                        try {
                            if (fs.existsSync(javaExePath)) {
                                javacPath = `"${javaExePath}"`;
                                javaPath = `"${javaExePath.replace('javac.exe', 'java.exe')}"`;
                                foundJava = true;
                                console.log(`✅ Found Java at: ${javaExePath}`);
                                break;
                            }
                        } catch (e) {
                            // Continue to next path
                        }
                    }

                    if (!foundJava) {
                        return resolve({
                            success: false,
                            output: `❌ Java JDK not found in PATH or common installation locations\n\nTried locations:\n${commonPaths.join('\n')}\n\nTo fix this:\n1. Add Java to your PATH environment variable\n2. Or install Java with: winget install Microsoft.OpenJDK.17\n3. Restart your terminal after installation`
                        });
                    }
                }

                // The command is a chain: compile first, then run.
                command = `${javacPath} ${filePath} && ${javaPath} -cp ${tempDir} ${className}`;
                break;
            default:
                // Immediately resolve with an error for unsupported languages.
                return resolve({ success: false, output: `Error: Unsupported language "${language}"` });
        }
        
        try {
            console.log('📝 [ExecutionService] Writing code to file:', filePath);
            fs.writeFileSync(filePath, code);
            console.log('✅ [ExecutionService] File written successfully');
        } catch (writeError) {
            console.error('❌ [ExecutionService] Error writing file:', writeError);
            return resolve({
                success: false,
                output: `Error writing code file: ${writeError.message}`
            });
        }

        console.log('🚀 [ExecutionService] Executing command:', command);
        exec(command, { timeout: 10000 }, (error, stdout, stderr) => {
            console.log('📊 [ExecutionService] Execution completed');
            console.log('  - Error object:', error ? error.message : 'none');
            console.log('  - Stdout length:', stdout ? stdout.length : 0);
            console.log('  - Stderr length:', stderr ? stderr.length : 0);
            console.log('  - Stdout content:', stdout ? stdout.substring(0, 200) : 'empty');
            console.log('  - Stderr content:', stderr ? stderr.substring(0, 200) : 'empty');

            // Clean up all temporary files created
            const filesToDelete = [filePath, path.join(tempDir, 'Main.class')];
            filesToDelete.forEach(file => {
                try {
                    if (fs.existsSync(file)) {
                        fs.unlinkSync(file);
                        console.log('🗑️ [ExecutionService] Cleaned up file:', file);
                    }
                } catch (cleanupError) {
                    console.warn('⚠️ [ExecutionService] Cleanup warning:', cleanupError.message);
                }
            });

            if (error) {
                console.error('❌ [ExecutionService] Execution error:', error.message);
                console.error('❌ [ExecutionService] Error code:', error.code);
                console.error('❌ [ExecutionService] Signal:', error.signal);
                // This catches execution errors (like compile errors or infinite loops)
                const errorOutput = stderr || error.message;
                console.log('📤 [ExecutionService] Returning error result:', errorOutput);
                resolve({ success: false, output: errorOutput });
            } else {
                // If there's no hard error, the execution is considered a "success" from the runner's perspective.
                // The test results are in stdout or stderr.
                const successOutput = stdout || stderr;
                console.log('📤 [ExecutionService] Returning success result:', successOutput);
                resolve({ success: true, output: successOutput });
            }
        });
    });
};

module.exports = {
    executeCode
};
// // services/executionService.js (Multi-Language Version)
// const { exec } = require('child_process');
// const fs = require('fs');
// const path = require('path');

// const executeCode = (code, language) => {
//     return new Promise((resolve, reject) => {
//         const tempDir = path.join(__dirname, 'temp');
//         if (!fs.existsSync(tempDir)) {
//             fs.mkdirSync(tempDir, { recursive: true });
//         }

//         const uniqueId = crypto.randomUUID();
//         let fileExtension, command;
//         let filePath = path.join(tempDir, `temp_${uniqueId}`);

//         // This switch statement now knows how to handle all the new languages.
//         switch (language.toLowerCase()) {
//             case 'javascript':
//                 fileExtension = 'js';
//                 filePath += `.${fileExtension}`;
//                 command = `node ${filePath}`;
//                 break;
//             case 'python':
//                 fileExtension = 'py';
//                 filePath += `.${fileExtension}`;
//                 command = `python3 ${filePath}`;
//                 break;
//             case 'java':
//                 fileExtension = 'java';
//                 // Java is special: it needs to be compiled first, then run.
//                 const javaFilePath = path.join(tempDir, 'Main.java'); // Java requires a specific class name
//                 fs.writeFileSync(javaFilePath, code);
//                 // The command is a chain: compile, then run.
//                 command = `javac ${javaFilePath} && java -cp ${tempDir} Main`;
//                 break;
//             case 'ruby':
//                 fileExtension = 'rb';
//                 filePath += `.${fileExtension}`;
//                 command = `ruby ${filePath}`;
//                 break;
//             case 'go':
//                 fileExtension = 'go';
//                 filePath += `.${fileExtension}`;
//                 command = `go run ${filePath}`;
//                 break;
//             default:
//                 return reject(new Error(`Unsupported language: ${language}`));
//         }
        
//         // Write the file only if it's not the special Java case
//         if (language.toLowerCase() !== 'java') {
//             fs.writeFileSync(filePath, code);
//         }

//         exec(command, (error, stdout, stderr) => {
//             // Clean up all temporary files created
//             const filesToDelete = [filePath, path.join(tempDir, 'Main.java'), path.join(tempDir, 'Main.class')];
//             filesToDelete.forEach(file => {
//                 if (fs.existsSync(file)) fs.unlinkSync(file);
//             });

//             if (error) {
//                 resolve({ success: false, output: stderr || error.message });
//             } else if (stderr) {
//                 // Some languages (like Java compiler warnings) use stderr for non-fatal output
//                 resolve({ success: true, output: stdout || stderr });
//             } else {
//                 resolve({ success: true, output: stdout });
//             }
//         });
//     });
// };

// // We need the crypto module for unique file names
// const crypto = require('crypto');

// module.exports = {
//     executeCode
// };
// /**
//  * @file executionService.js
//  * @description This version is updated to parse test runner output and return a structured list of failed tests.
//  */
// const { exec } = require('child_process');
// const fs = require('fs/promises');
// const path = require('path');
// const crypto = require('crypto');

// /**
//  * --- NEW: Helper function to parse failed test names from output ---
//  * This is a simple parser assuming a format like "FAILED: test_name".
//  * You should adapt the regex to match your specific test runner's output format.
//  * @param {string} output - The stderr or error message from the test runner.
//  * @returns {string[]} - An array of failed test names.
//  */
// const parseFailedTests = (output) => {
//     const failedTests = [];
//     // This regex looks for lines starting with "FAILED:", "AssertionError:", or similar failure indicators,
//     // and then captures the word that follows, assuming it's the test name.
//     const regex = /(?:FAIL|FAILED|AssertionError|Error):?\s*(\w+)/gi;
//     let match;
//     while ((match = regex.exec(output)) !== null) {
//         failedTests.push(match[1]);
//     }
//     // If no specific tests are matched but there was an error, return a generic failure.
//     if (failedTests.length === 0 && output.trim().length > 0) {
//         return ['general_execution_error'];
//     }
//     return failedTests;
// };


// /**
//  * Executes a string of code in a sandboxed environment.
//  * @param {string} code - The code to execute.
//  * @param {string} language - The programming language ('javascript', 'python', or 'java').
//  * @returns {Promise<{success: boolean, output: string, failedTestNames: string[]}>} - A promise that resolves with the result.
//  */
// const executeCode = (code, language) => {
//     return new Promise(async (resolve) => {
//         const tempDir = path.join(__dirname, '..', 'temp');
//         const uniqueId = crypto.randomUUID().replace(/-/g, '');
//         let command;
//         let filePath;
//         let cleanupPaths = [];

//         try {
//             await fs.mkdir(tempDir, { recursive: true });

//             switch (language) {
//                 case 'javascript':
//                     filePath = path.join(tempDir, `${uniqueId}.js`);
//                     command = `node ${filePath}`;
//                     cleanupPaths.push(filePath);
//                     break;
//                 case 'python':
//                     filePath = path.join(tempDir, `${uniqueId}.py`);
//                     command = `py -3 ${filePath}`;
//                     cleanupPaths.push(filePath);
//                     break;
//                 case 'java':
//                     const className = `Main_${uniqueId}`;
//                     filePath = path.join(tempDir, `${className}.java`);
//                     const classPath = path.join(tempDir, `${className}.class`);
//                     code = `public class ${className} { public static void main(String[] args) { ${code} } }`;
//                     command = `javac ${filePath} && java -cp ${tempDir} ${className}`;
//                     cleanupPaths.push(filePath, classPath);
//                     break;
//                 default:
//                     return resolve({ success: false, output: `Error: Unsupported language "${language}".`, failedTestNames: [] });
//             }

//             await fs.writeFile(filePath, code);

//             exec(command, { timeout: 10000 }, (error, stdout, stderr) => {
//                 Promise.all(cleanupPaths.map(p => fs.unlink(p).catch(e => console.error(`Failed to delete temp file: ${p}`, e))));

//                 const rawOutput = stderr || (error ? error.message : '');
//                 const failedTestNames = parseFailedTests(rawOutput);

//                 if (error || stderr) {
//                     resolve({
//                         success: false,
//                         output: rawOutput,
//                         failedTestNames: failedTestNames
//                     });
//                 } else {
//                     resolve({
//                         success: true,
//                         output: stdout || 'Execution finished with no output.',
//                         failedTestNames: []
//                     });
//                 }
//             });

//         } catch (err) {
//             if (err instanceof Error) {
//                 resolve({ success: false, output: `Server Execution Error: ${err.message}`, failedTestNames: ['server_error'] });
//             } else {
//                 resolve({ success: false, output: 'An unknown server error occurred during execution.', failedTestNames: ['server_error'] });
//             }
//             Promise.all(cleanupPaths.map(p => fs.unlink(p).catch(e => console.error(`Failed to delete temp file: ${p}`, e))));
//         }
//     });
// };

// module.exports = {
//     executeCode,
// };


// MVP
// // =================================================================
// // FILE: services/executionService.js (FINAL FIX)
// // =================================================================
// // DESCRIPTION: This version uses the 'py -3' command to be more
// // compatible with the Windows Python Launcher.

// const { exec } = require('child_process');
// const fs = require('fs/promises');
// const path = require('path');
// const crypto = require('crypto');

// /**
//  * Executes a string of code in a sandboxed environment.
//  * @param {string} code - The code to execute.
//  * @param {string} language - The programming language ('javascript', 'python', or 'java').
//  * @returns {Promise<{success: boolean, output: string}>} - A promise that resolves with an object.
//  */
// const executeCode = (code, language) => {
//     return new Promise(async (resolve) => {
//         const tempDir = path.join(__dirname, '..', 'temp');
//         const uniqueId = crypto.randomUUID().replace(/-/g, '');
//         let command;
//         let filePath;
//         let cleanupPaths = [];

//         try {
//             await fs.mkdir(tempDir, { recursive: true });

//             switch (language) {
//                 case 'javascript':
//                     filePath = path.join(tempDir, `${uniqueId}.js`);
//                     command = `node ${filePath}`;
//                     cleanupPaths.push(filePath);
//                     break;
//                 case 'python':
//                     filePath = path.join(tempDir, `${uniqueId}.py`);
//                     // FIX: Using 'py -3' is the most reliable way to invoke Python 3 on Windows.
//                     command = `py -3 ${filePath}`;
//                     cleanupPaths.push(filePath);
//                     break;
//                 case 'java':
//                     const className = `Main_${uniqueId}`;
//                     filePath = path.join(tempDir, `${className}.java`);
//                     const classPath = path.join(tempDir, `${className}.class`);
//                     code = `public class ${className} { public static void main(String[] args) { ${code} } }`;
//                     command = `javac ${filePath} && java -cp ${tempDir} ${className}`;
//                     cleanupPaths.push(filePath, classPath);
//                     break;
//                 default:
//                     return resolve({ success: false, output: `Error: Unsupported language "${language}".` });
//             }

//             await fs.writeFile(filePath, code);

//             exec(command, { timeout: 10000 }, (error, stdout, stderr) => {
//                 Promise.all(cleanupPaths.map(p => fs.unlink(p).catch(e => console.error(`Failed to delete temp file: ${p}`, e))));

//                 if (error || stderr) {
//                     resolve({
//                         success: false,
//                         output: stderr || error.message
//                     });
//                 } else {
//                     resolve({
//                         success: true,
//                         output: stdout || 'Execution finished with no output.'
//                     });
//                 }
//             });

//         } catch (err) {
//             if (err instanceof Error) {
//                 resolve({ success: false, output: `Server Execution Error: ${err.message}` });
//             } else {
//                 resolve({ success: false, output: 'An unknown server error occurred during execution.' });
//             }
//             Promise.all(cleanupPaths.map(p => fs.unlink(p).catch(e => console.error(`Failed to delete temp file: ${p}`, e))));
//         }
//     });
// };

// module.exports = {
//     executeCode,
// };

// // =================================================================
// // FILE: services/executionService.js (V2 - Multi-Language)
// // =================================================================
// // DESCRIPTION: This service now supports executing JavaScript, Python,
// // and Java code by creating temporary files and running them in
// // isolated child processes.

// const { exec } = require('child_process');
// const fs = require('fs/promises');
// const path = require('path');
// const crypto = require('crypto');

// /**
//  * Executes a string of code in a sandboxed environment.
//  * @param {string} code - The code to execute.
//  * @param {string} language - The programming language ('javascript', 'python', or 'java').
//  * @returns {Promise<string>} - A promise that resolves with the captured output or error.
//  */
// const executeCode = (code, language) => {
//     return new Promise(async (resolve) => {
//         const tempDir = path.join(__dirname, '..', 'temp');
//         const uniqueId = crypto.randomUUID().replace(/-/g, ''); // Java class names cannot have hyphens
//         let command;
//         let filePath;
//         let cleanupPaths = [];

//         try {
//             // Ensure the temporary directory exists
//             await fs.mkdir(tempDir, { recursive: true });

//             switch (language) {
//                 case 'javascript':
//                     filePath = path.join(tempDir, `${uniqueId}.js`);
//                     command = `node ${filePath}`;
//                     cleanupPaths.push(filePath);
//                     break;
//                 case 'python':
//                     filePath = path.join(tempDir, `${uniqueId}.py`);
//                     command = `python ${filePath}`;
//                     cleanupPaths.push(filePath);
//                     break;
//                 case 'java':
//                     // Java requires a specific class name matching the file name
//                     const className = `Main_${uniqueId}`;
//                     filePath = path.join(tempDir, `${className}.java`);
//                     const classPath = path.join(tempDir, `${className}.class`);
//                     // The code must be wrapped in a class of the same name for execution
//                     code = `public class ${className} { public static void main(String[] args) { ${code} } }`;
//                     command = `javac ${filePath} && java -cp ${tempDir} ${className}`;
//                     cleanupPaths.push(filePath, classPath);
//                     break;
//                 default:
//                     return resolve(`Error: Unsupported language "${language}".`);
//             }

//             await fs.writeFile(filePath, code);

//             exec(command, { timeout: 10000 }, (error, stdout, stderr) => {
//                 // Securely clean up the temporary files after execution
//                 Promise.all(cleanupPaths.map(p => fs.unlink(p).catch(e => console.error(`Failed to delete temp file: ${p}`, e))));

//                 if (error) {
//                     // This includes compilation errors, execution errors, and timeouts
//                     resolve(stderr || error.message);
//                 } else if (stderr) {
//                     // This can include warnings or other non-fatal errors
//                     resolve(stdout || stderr);
//                 } else {
//                     resolve(stdout || 'Execution finished with no output.');
//                 }
//             });

//         } catch (err) {
//             if (err instanceof Error) {
//                 resolve(`Server Execution Error: ${err.message}`);
//             } else {
//                 resolve('An unknown server error occurred during execution.');
//             }
//             // Clean up files even if the initial write fails
//             Promise.all(cleanupPaths.map(p => fs.unlink(p).catch(e => console.error(`Failed to delete temp file: ${p}`, e))));
//         }
//     });
// };

// module.exports = {
//     executeCode,
// };
