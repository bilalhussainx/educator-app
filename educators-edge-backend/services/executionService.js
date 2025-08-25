// services/executionService.js
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const executeCode = (code, language) => {
    return new Promise((resolve, reject) => {
        const tempDir = path.join(__dirname, 'temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir);
        }

        let fileExtension, command;
        // --- THIS IS THE CORRECTED LOGIC ---
        switch (language.toLowerCase()) {
            case 'javascript':
                fileExtension = 'js';
                command = 'node'; // Use 'node' to execute JavaScript
                break;
            case 'python':
                fileExtension = 'py';
                command = 'python3'; // Use 'python3' to execute Python
                break;
            case 'java':
                // Java execution is more complex and requires compilation first
                fileExtension = 'java';
                command = 'java'; // This would be part of a multi-step process
                break;
            default:
                return reject(new Error(`Unsupported language: ${language}`));
        }
        // --- END OF CORRECTION ---

        const filePath = path.join(tempDir, `temp_run_file.${fileExtension}`);
        fs.writeFileSync(filePath, code);

        // Execute the file using the correct command
        exec(`${command} ${filePath}`, (error, stdout, stderr) => {
            fs.unlinkSync(filePath); // Clean up the temporary file

            if (error) {
                // If there's an execution error, the 'output' is the stderr
                resolve({ success: false, output: stderr });
            } else if (stderr) {
                // Some processes write to stderr for warnings even on success
                resolve({ success: true, output: stderr });
            }
            else {
                // Otherwise, the output is stdout
                resolve({ success: true, output: stdout });
            }
        });
    });
};

module.exports = {
    executeCode
};
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
