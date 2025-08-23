// -----------------------------------------------------------------
// FILE: controllers/executeController.js (UPDATED)
// -----------------------------------------------------------------
const { getQuickJS } = require("quickjs-emscripten");

// This controller now handles multiple languages and file extensions.
exports.runCode = async (req, res) => {
    let { code, language } = req.body;

    // NEW: Map common file extensions to the language names our services expect.
    const languageMap = {
        js: 'javascript',
        py: 'python',
        ts: 'typescript'
    };
    
    // Normalize the language name.
    const executionLanguage = languageMap[language] || language;

    // --- JavaScript / TypeScript Execution (Local Sandbox) ---
    if (executionLanguage === 'javascript' || executionLanguage === 'typescript') {
        try {
            const quickjs = await getQuickJS();
            const vm = quickjs.newContext();
            let output = [];
            
            const logHandle = vm.newFunction("log", (...args) => {
                const marshalledArgs = args.map(argHandle => vm.dump(argHandle));
                output.push(marshalledArgs.map(arg => JSON.stringify(arg)).join(' '));
            });
            
            const consoleHandle = vm.newObject();
            vm.setProp(consoleHandle, "log", logHandle);
            vm.setProp(vm.global, "console", consoleHandle);
            logHandle.dispose();
            consoleHandle.dispose();

            const result = vm.evalCode(code);

            if (result.error) {
                const error = vm.dump(result.error);
                result.error.dispose();
                return res.json({ output: `Error: ${error.message}` });
            } else {
                result.value.dispose();
                return res.json({ output: output.join('\n') });
            }
        } catch (err) {
            return res.status(500).json({ output: `Server Execution Error: ${err.message}` });
        }
    }

    // --- Python & Java Execution (Remote API) ---
    if (executionLanguage === 'python' || executionLanguage === 'java') {
        const apiKey = process.env.GLOT_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ output: 'Execution service for this language is not configured.' });
        }

        try {
            const response = await fetch(`https://glot.io/api/run/${executionLanguage}/latest`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Token ${apiKey}`
                },
                body: JSON.stringify({
                    files: [{
                        name: executionLanguage === 'java' ? 'Main.java' : 'main.py',
                        content: code
                    }]
                })
            });

            const data = await response.json();
            const output = data.stdout || data.stderr || 'No output.';
            return res.json({ output });

        } catch (err) {
            return res.status(500).json({ output: `API Error: ${err.message}` });
        }
    }

    // Fallback for unsupported languages
    return res.status(400).json({ output: `Execution for ${language} is not supported.` });
};


// // -----------------------------------------------------------------
// // FILE: controllers/executeController.js (UPDATED)
// // -----------------------------------------------------------------
// const { getQuickJS } = require("quickjs-emscripten");

// // This controller now handles multiple languages.
// exports.runCode = async (req, res) => {
//     const { code, language } = req.body;

//     // --- JavaScript Execution (Local Sandbox) ---
//     if (language === 'javascript') {
//         try {
//             const quickjs = await getQuickJS();
//             const vm = quickjs.newContext();
//             let output = [];
            
//             const logHandle = vm.newFunction("log", (...args) => {
//                 const marshalledArgs = args.map(argHandle => vm.dump(argHandle));
//                 output.push(marshalledArgs.map(arg => JSON.stringify(arg)).join(' '));
//             });
            
//             const consoleHandle = vm.newObject();
//             vm.setProp(consoleHandle, "log", logHandle);
//             vm.setProp(vm.global, "console", consoleHandle);
//             logHandle.dispose();
//             consoleHandle.dispose();

//             const result = vm.evalCode(code);

//             if (result.error) {
//                 const error = vm.dump(result.error);
//                 result.error.dispose();
//                 return res.json({ output: `Error: ${error.message}` });
//             } else {
//                 result.value.dispose();
//                 return res.json({ output: output.join('\n') });
//             }
//         } catch (err) {
//             return res.status(500).json({ output: `Server Execution Error: ${err.message}` });
//         }
//     }

//     // --- Python & Java Execution (Remote API) ---
//     if (language === 'python' || language === 'java') {
//         const apiKey = process.env.GLOT_API_KEY;
//         if (!apiKey) {
//             return res.status(500).json({ output: 'Execution service for this language is not configured.' });
//         }

//         try {
//             const response = await fetch(`https://glot.io/api/run/${language}/latest`, {
//                 method: 'POST',
//                 headers: {
//                     'Content-Type': 'application/json',
//                     'Authorization': `Token ${apiKey}`
//                 },
//                 body: JSON.stringify({
//                     files: [{
//                         // For Java, the main class name must match the filename.
//                         name: language === 'java' ? 'Main.java' : 'main.py',
//                         content: code
//                     }]
//                 })
//             });

//             const data = await response.json();
//             // The glot.io API returns output in `stdout` and errors in `stderr`.
//             const output = data.stdout || data.stderr || 'No output.';
//             return res.json({ output });

//         } catch (err) {
//             return res.status(500).json({ output: `API Error: ${err.message}` });
//         }
//     }

//     // Fallback for unsupported languages
//     return res.status(400).json({ output: `Execution for ${language} is not supported.` });
// };


// const { getQuickJS } = require("quickjs-emscripten");

// exports.runCode = async (req, res) => {
//     const { code, language } = req.body;

//     if (language !== 'javascript') {
//         return res.status(400).json({ output: `Execution for ${language} is not supported.` });
//     }

//     try {
//         // Initialize the QuickJS WebAssembly module
//         const quickjs = await getQuickJS();
//         const vm = quickjs.newContext();

//         let output = [];
        
//         // Create a log function inside the sandbox
//         const logHandle = vm.newFunction("log", (...args) => {
//             const marshalledArgs = args.map(argHandle => vm.dump(argHandle));
//             output.push(marshalledArgs.map(arg => JSON.stringify(arg)).join(' '));
//         });
        
//         const consoleHandle = vm.newObject();
//         vm.setProp(consoleHandle, "log", logHandle);
//         vm.setProp(vm.global, "console", consoleHandle);
//         logHandle.dispose();
//         consoleHandle.dispose();

//         // Execute the code
//         const result = vm.evalCode(code, {
//             memoryLimitBytes: 100 * 1024 * 1024, // 100 MB
//             stackSizeBytes: 1 * 1024 * 1024, // 1 MB
//         });

//         if (result.error) {
//             // If there's an error, dump it and send it as output
//             const error = vm.dump(result.error);
//             result.error.dispose();
//             res.json({ output: `Error: ${error.message}` });
//         } else {
//             // Otherwise, send the captured console output
//             result.value.dispose();
//             res.json({ output: output.join('\n') });
//         }

//         // Clean up the VM
//         vm.dispose();

//     } catch (err) {
//         console.error("Execution Error:", err);
//         res.status(500).json({ output: `Server Error: ${err.message}` });
//     }
// };

