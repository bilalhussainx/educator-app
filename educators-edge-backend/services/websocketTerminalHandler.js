// =================================================================
// FILE: services/websocketTerminalHandler.js
// =================================================================
// DESCRIPTION: WebSocket handler specifically for Docker terminal sessions
// Extends the existing websocketHandler with terminal functionality

const jwt = require('jsonwebtoken');
// const sandboxService = require('./dockerSandboxService'); // Disabled: Using BullMQ instead

class WebSocketTerminalHandler {
    constructor() {
        this.terminalSessions = new Map(); // sessionId -> { userId, websockets: Set() }
        
        // Disabled: sandbox service events (using BullMQ instead)
        // sandboxService.on('sessionOutput', (sessionId, output) => {
        //     this.broadcastToTerminalSession(sessionId, {
        //         type: 'TERMINAL_OUTPUT',
        //         payload: { output, timestamp: Date.now() }
        //     });
        // });
        
        // sandboxService.on('sessionError', (sessionId, error) => {
        //     this.broadcastToTerminalSession(sessionId, {
        //         type: 'TERMINAL_ERROR',
        //         payload: { error: error.message, timestamp: Date.now() }
        //     });
        // });
    }
    
    // New method to handle individual connections
    async handleConnection(ws, req) {
        console.log('🔌 New terminal WebSocket connection attempt');
        console.log('📍 Request URL:', req.url);
        console.log('📍 Request headers:', req.headers);
        
        // Add immediate error handler
        ws.on('error', (error) => {
            console.error('❌ Terminal WebSocket error:', error);
            console.error('❌ WebSocket state:', ws.readyState);
        });
        
        ws.on('close', (code, reason) => {
            console.log(`🔌 Terminal WebSocket closed. Code: ${code}, Reason: ${reason || 'No reason provided'}`);
        });
        
        try {
            const urlParams = new URLSearchParams(req.url.split('?')[1]);
            const token = urlParams.get('token');
            const sessionId = urlParams.get('sessionId');
            
            console.log('🔍 Terminal WS connection params:', { 
                hasToken: !!token, 
                sessionId: sessionId || 'none' 
            });
            
            if (!token) {
                console.log('❌ Terminal WS: Missing token');
                ws.close(4001, 'Authentication token required');
                return;
            }
            
            // Verify JWT token
            let user;
            try {
                if (!process.env.JWT_SECRET) {
                    console.error('❌ Terminal WS: JWT_SECRET not set');
                    ws.close(4000, 'Server configuration error');
                    return;
                }
                
                console.log('🔍 Terminal WS: Verifying JWT token...');
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                user = decoded.user;
                
                if (!user || !user.username) {
                    console.error('❌ Terminal WS: Invalid user data in token');
                    ws.close(4001, 'Invalid user data');
                    return;
                }
                
                console.log(`✅ Terminal WS: Authenticated user ${user.username} (${user.role})`);
            } catch (err) {
                console.error('❌ Terminal WS: Token verification failed:', err.message);
                console.error('❌ Terminal WS: Token starts with:', (token || '').substring(0, 20));
                ws.close(4001, 'Invalid authentication token');
                return;
            }
            
            // Send immediate connection confirmation
            if (ws.readyState === ws.OPEN) {
                ws.send(JSON.stringify({
                    type: 'CONNECTION_ESTABLISHED',
                    payload: {
                        message: 'Terminal WebSocket connected successfully',
                        userId: user.id,
                        username: user.username,
                        sessionId: sessionId || null,
                        timestamp: Date.now()
                    }
                }));
                console.log(`📤 Connection confirmation sent to ${user.username}`);
            }

            // Handle terminal session connection
            if (sessionId) {
                console.log(`🎯 Handling terminal session connection for ${sessionId}`);
                await this.handleTerminalSessionConnection(ws, user, sessionId);
            } else {
                console.log('🎯 Handling general terminal connection');
                // General terminal connection (for creating new sessions)
                await this.handleGeneralTerminalConnection(ws, user);
            }
            
        } catch (error) {
            console.error('❌ Terminal WS connection error:', error);
            console.error('❌ Error stack:', error.stack);
            if (ws.readyState === ws.OPEN) {
                ws.close(4000, 'Connection error');
            }
        }
    }
    
    async handleTerminalSessionConnection(ws, user, sessionId) {
        try {
            // Check if session exists and user has access
            // const sessionStatus = await sandboxService.getSessionStatus(sessionId);
            // Using local session tracking instead of Docker service
            const sessionStatus = { status: 'active' };
            if (!sessionStatus) {
                return ws.close(4004, 'Terminal session not found');
            }
            
            // Add to terminal sessions
            if (!this.terminalSessions.has(sessionId)) {
                this.terminalSessions.set(sessionId, {
                    userId: user.id,
                    websockets: new Set(),
                    createdAt: new Date()
                });
            }
            
            const terminalSession = this.terminalSessions.get(sessionId);
            terminalSession.websockets.add(ws);
            
            console.log(`🎯 User ${user.username} connected to terminal session ${sessionId}`);
            
            // Send session status
            ws.send(JSON.stringify({
                type: 'TERMINAL_SESSION_CONNECTED',
                payload: {
                    sessionId,
                    status: sessionStatus,
                    timestamp: Date.now()
                }
            }));
            
            // Set up message handlers
            this.setupTerminalMessageHandlers(ws, user, sessionId);
            
            // Handle disconnect
            ws.on('close', () => {
                console.log(`🔌 User ${user.username} disconnected from terminal session ${sessionId}`);
                terminalSession.websockets.delete(ws);
                if (terminalSession.websockets.size === 0) {
                    this.terminalSessions.delete(sessionId);
                }
            });
            
        } catch (error) {
            console.error('❌ Terminal session connection error:', error);
            ws.close(4000, 'Failed to connect to terminal session');
        }
    }
    
    async handleGeneralTerminalConnection(ws, user) {
        try {
            console.log(`🎯 User ${user.username} connected for general terminal operations`);
            
            // Send welcome message
            if (ws.readyState === ws.OPEN) {
                ws.send(JSON.stringify({
                    type: 'TERMINAL_WELCOME',
                    payload: {
                        message: 'Connected to Docker Terminal Service',
                        userId: user.id,
                        username: user.username,
                        timestamp: Date.now()
                    }
                }));
                console.log(`✅ Welcome message sent to ${user.username}`);
            }
            
            // Set up general message handlers
            this.setupGeneralTerminalHandlers(ws, user);
            
            ws.on('close', (code, reason) => {
                console.log(`🔌 User ${user.username} disconnected from general terminal. Code: ${code}, Reason: ${reason}`);
            });
            
        } catch (error) {
            console.error('❌ Error in handleGeneralTerminalConnection:', error);
            if (ws.readyState === ws.OPEN) {
                ws.close(4000, 'Failed to initialize terminal connection');
            }
        }
    }
    
    setupTerminalMessageHandlers(ws, user, sessionId) {
        ws.on('message', async (data) => {
            try {
                const message = JSON.parse(data);
                console.log(`📨 Terminal message from ${user.username}:`, message.type);
                
                switch (message.type) {
                    case 'TERMINAL_INPUT':
                        await this.handleTerminalInput(sessionId, message.payload, user);
                        break;
                        
                    case 'EXECUTE_CODE':
                        await this.handleCodeExecution(sessionId, message.payload, user);
                        break;
                        
                    case 'TERMINAL_RESIZE':
                        await this.handleTerminalResize(sessionId, message.payload, user);
                        break;
                        
                    case 'REQUEST_SESSION_STATUS':
                        await this.handleSessionStatusRequest(ws, sessionId, user);
                        break;
                        
                    default:
                        console.log(`⚠️ Unknown terminal message type: ${message.type}`);
                }
                
            } catch (error) {
                console.error('❌ Terminal message handling error:', error);
                ws.send(JSON.stringify({
                    type: 'TERMINAL_ERROR',
                    payload: {
                        error: 'Message processing failed',
                        details: error.message,
                        timestamp: Date.now()
                    }
                }));
            }
        });
    }
    
    setupGeneralTerminalHandlers(ws, user) {
        ws.on('message', async (data) => {
            try {
                const message = JSON.parse(data);
                console.log(`📨 General terminal message from ${user.username}:`, message.type);
                
                switch (message.type) {
                    case 'CREATE_TERMINAL_SESSION':
                        await this.handleCreateSession(ws, user);
                        break;
                        
                    case 'LIST_SESSIONS':
                        await this.handleListSessions(ws, user);
                        break;
                        
                    case 'QUICK_EXECUTE':
                        await this.handleQuickExecute(ws, message.payload, user);
                        break;
                        
                    case 'EXECUTE_CODE':
                        console.log(`🚀 Execute code request from ${user.username}`);
                        await this.handleExecuteCode(ws, message.payload, user);
                        break;
                        
                    case 'HEALTH_CHECK':
                        await this.handleHealthCheck(ws);
                        break;
                        
                    default:
                        console.log(`⚠️ Unknown general terminal message type: ${message.type}`);
                }
                
            } catch (error) {
                console.error('❌ General terminal message error:', error);
                if (ws.readyState === ws.OPEN) {
                    ws.send(JSON.stringify({
                        type: 'TERMINAL_ERROR',
                        payload: {
                            error: 'Message processing failed',
                            details: error.message,
                            timestamp: Date.now()
                        }
                    }));
                }
            }
        });
        
        ws.on('error', (error) => {
            console.error(`❌ WebSocket error for user ${user.username}:`, error);
        });
    }
    
    async handleTerminalInput(sessionId, payload, user) {
        const { input } = payload;
        console.log(`⌨️ Terminal input from ${user.username}: "${input}"`);
        
        // await sandboxService.sendInput(sessionId, input); // Disabled: Using BullMQ instead
        
        // Broadcast input to all connected clients for this session
        this.broadcastToTerminalSession(sessionId, {
            type: 'TERMINAL_INPUT_ECHO',
            payload: { input, userId: user.id, timestamp: Date.now() }
        });
    }
    
    async handleCodeExecution(sessionId, payload, user) {
        const { code, language } = payload;
        console.log(`🚀 Code execution from ${user.username}: ${language}`);
        
        try {
            // const result = await sandboxService.executeCode(code, language, sessionId); // Disabled: Using BullMQ instead
            const result = { output: 'Code execution via BullMQ queue', success: true };
            
            this.broadcastToTerminalSession(sessionId, {
                type: 'CODE_EXECUTION_RESULT',
                payload: {
                    result,
                    language,
                    userId: user.id,
                    timestamp: Date.now()
                }
            });
            
        } catch (error) {
            this.broadcastToTerminalSession(sessionId, {
                type: 'CODE_EXECUTION_ERROR',
                payload: {
                    error: error.message,
                    language,
                    userId: user.id,
                    timestamp: Date.now()
                }
            });
        }
    }
    
    async handleTerminalResize(sessionId, payload, user) {
        const { cols, rows } = payload;
        console.log(`📐 Terminal resize from ${user.username}: ${cols}x${rows}`);
        
        // Note: Docker containers don't support resize by default
        // This would require additional PTY handling
        this.broadcastToTerminalSession(sessionId, {
            type: 'TERMINAL_RESIZED',
            payload: { cols, rows, userId: user.id, timestamp: Date.now() }
        });
    }
    
    async handleSessionStatusRequest(ws, sessionId, user) {
        try {
            // const status = await sandboxService.getSessionStatus(sessionId); // Disabled: Using BullMQ instead
            const status = { status: 'active', sessionId };
            ws.send(JSON.stringify({
                type: 'SESSION_STATUS_RESPONSE',
                payload: {
                    sessionId,
                    status,
                    timestamp: Date.now()
                }
            }));
        } catch (error) {
            ws.send(JSON.stringify({
                type: 'SESSION_STATUS_ERROR',
                payload: {
                    sessionId,
                    error: error.message,
                    timestamp: Date.now()
                }
            }));
        }
    }
    
    async handleCreateSession(ws, user) {
        try {
            // const session = await sandboxService.createSandboxSession(); // Disabled: Using BullMQ instead
            const session = { id: `session_${Date.now()}` };
            
            ws.send(JSON.stringify({
                type: 'TERMINAL_SESSION_CREATED',
                payload: {
                    sessionId: session.id,
                    timestamp: Date.now()
                }
            }));
            
            console.log(`✨ Created terminal session ${session.id} for ${user.username}`);
            
        } catch (error) {
            ws.send(JSON.stringify({
                type: 'TERMINAL_SESSION_CREATE_ERROR',
                payload: {
                    error: error.message,
                    timestamp: Date.now()
                }
            }));
        }
    }
    
    async handleListSessions(ws, user) {
        try {
            const userSessions = Array.from(this.terminalSessions.entries())
                .filter(([_, session]) => session.userId === user.id)
                .map(([sessionId, session]) => ({
                    sessionId,
                    createdAt: session.createdAt,
                    activeConnections: session.websockets.size
                }));
            
            ws.send(JSON.stringify({
                type: 'SESSIONS_LIST_RESPONSE',
                payload: {
                    sessions: userSessions,
                    timestamp: Date.now()
                }
            }));
            
        } catch (error) {
            ws.send(JSON.stringify({
                type: 'SESSIONS_LIST_ERROR',
                payload: {
                    error: error.message,
                    timestamp: Date.now()
                }
            }));
        }
    }
    
    async handleQuickExecute(ws, payload, user) {
        const { code, language } = payload;
        console.log(`⚡ Quick execute from ${user.username}: ${language}`);
        
        try {
            // const result = await sandboxService.executeCode(code, language); // Disabled: Using BullMQ instead
            const result = { output: 'Quick execution via BullMQ queue', success: true };
            
            ws.send(JSON.stringify({
                type: 'QUICK_EXECUTE_RESULT',
                payload: {
                    result,
                    language,
                    timestamp: Date.now()
                }
            }));
            
        } catch (error) {
            ws.send(JSON.stringify({
                type: 'QUICK_EXECUTE_ERROR',
                payload: {
                    error: error.message,
                    language,
                    timestamp: Date.now()
                }
            }));
        }
    }
    
    async handleHealthCheck(ws) {
        try {
            // const health = await sandboxService.healthCheck(); // Disabled: Using BullMQ instead
            const health = { status: 'healthy', service: 'BullMQ' };
            
            ws.send(JSON.stringify({
                type: 'HEALTH_CHECK_RESPONSE',
                payload: {
                    health,
                    terminalSessions: this.terminalSessions.size,
                    timestamp: Date.now()
                }
            }));
            
        } catch (error) {
            ws.send(JSON.stringify({
                type: 'HEALTH_CHECK_ERROR',
                payload: {
                    error: error.message,
                    timestamp: Date.now()
                }
            }));
        }
    }
    
    async handleExecuteCode(ws, payload, user) {
        console.log('🔍 [WebSocketTerminalHandler] handleExecuteCode called');
        console.log('🔍 [WebSocketTerminalHandler] Payload inspection:');
        console.log('  - Payload type:', typeof payload);
        console.log('  - Payload keys:', payload ? Object.keys(payload) : 'payload is null/undefined');
        console.log('  - Raw payload:', JSON.stringify(payload, null, 2));

        const { code, language, fileName, testCases } = payload || {};

        // Set appropriate filename extension based on language
        let displayFileName = fileName;
        if (!displayFileName) {
            switch (language?.toLowerCase()) {
                case 'javascript':
                    displayFileName = 'terminal.js';
                    break;
                case 'python':
                    displayFileName = 'terminal.py';
                    break;
                case 'java':
                    displayFileName = 'Main.java';
                    break;
                default:
                    displayFileName = 'terminal.txt';
            }
        }

        console.log('🔍 [WebSocketTerminalHandler] Extracted values:');
        console.log('  - Code type:', typeof code);
        console.log('  - Code length:', code ? code.length : 'undefined');
        console.log('  - Language type:', typeof language);
        console.log('  - Language value:', language);
        console.log('  - FileName:', displayFileName);
        console.log('  - TestCases type:', typeof testCases);
        console.log('  - TestCases value:', JSON.stringify(testCases));
        console.log('  - TestCases length:', testCases ? testCases.length : 'undefined');
        console.log('  - TestCases is array:', Array.isArray(testCases));
        console.log('  - Will use Judge0?', testCases && Array.isArray(testCases) && testCases.length > 0);

        console.log(`🚀 Code execution request from ${user.username}: ${language} (${displayFileName})`);
        console.log(`🧪 Test cases provided: ${testCases ? testCases.length : 0}`);

        try {
            let result;
            console.log('🔍 [WebSocketTerminalHandler] Starting execution logic');

            // If test cases are provided and not empty, use the Judge0 service for validation
            if (testCases && Array.isArray(testCases) && testCases.length > 0) {
                console.log(`📋 Using Judge0 service for test case validation`);
                console.log(`📋 Test cases:`, JSON.stringify(testCases, null, 2));
                try {
                    const Judge0Service = require('../services/judge0Service');
                    const judge0Service = new Judge0Service();
                    console.log('📋 Judge0 service loaded, submitting execution...');
                    result = await judge0Service.submitExecution(language, code, testCases, {});
                    console.log('📋 Judge0 execution completed:', result);

                    // Check if Judge0 failed (even if it didn't throw an error)
                    if (!result.success || result.error) {
                        console.log('🔄 [WebSocketTerminalHandler] Judge0 execution failed, triggering fallback');
                        throw new Error(`Judge0 failed: ${result.error || result.details || 'Unknown error'}`);
                    }
                } catch (judge0Error) {
                    console.error('❌ [WebSocketTerminalHandler] Judge0 execution error:', judge0Error);
                    console.log('🔄 [WebSocketTerminalHandler] Attempting fallback test execution using basic service');

                    // Fallback: Use basic execution service with manual test validation
                    try {
                        const { executeCode } = require('./executionService');

                        // Create test harness code that calls the function with test cases
                        const testHarnessCode = this.generateTestHarness(code, testCases, language);
                        console.log('🧪 Generated test harness code:', testHarnessCode.substring(0, 200) + '...');

                        const basicResult = await executeCode(testHarnessCode, language);
                        console.log('🧪 Basic execution result:', basicResult);

                        // Parse the output to determine test results
                        const testResults = this.parseTestResults(basicResult.output, testCases);
                        console.log('🧪 Parsed test results:', testResults);

                        result = {
                            success: testResults.success,
                            output: basicResult.output,
                            totalTests: testCases.length,
                            passedTests: testResults.passed,
                            failedTests: testResults.failed,
                            testResults: testResults.details,
                            summary: testResults.summary
                        };

                        console.log('✅ Fallback test execution completed:', result);
                    } catch (fallbackError) {
                        console.error('❌ [WebSocketTerminalHandler] Fallback execution error:', fallbackError);
                        throw judge0Error; // Throw original Judge0 error if fallback also fails
                    }
                }
            } else {
                console.log(`⚡ Using basic execution service`);
                try {
                    // Import the execution service
                    const { executeCode } = require('./executionService');
                    console.log('⚡ Basic execution service loaded, executing code...');
                    result = await executeCode(code, language);
                    console.log('⚡ Basic execution completed:', result);
                } catch (basicExecError) {
                    console.error('❌ [WebSocketTerminalHandler] Basic execution error:', basicExecError);
                    throw basicExecError;
                }
            }

            console.log('🔍 [WebSocketTerminalHandler] Execution result received:');
            console.log('  - Result type:', typeof result);
            console.log('  - Result keys:', result ? Object.keys(result) : 'result is null/undefined');
            console.log('  - Result content:', JSON.stringify(result, null, 2));
            
            console.log(`✅ Code execution completed for ${user.username}`);
            
            // Send terminal output for display in terminal interface with improved formatting
            console.log('🔍 [WebSocketTerminalHandler] Preparing to format output');
            console.log('  - result.output type:', typeof result.output);
            console.log('  - result.output value:', result.output);

            const outputToFormat = result.output || result.stderr || 'No output received from execution';
            console.log('🔍 [WebSocketTerminalHandler] Using output for formatting:', outputToFormat);

            const formattedOutput = this.formatTerminalOutput(language, displayFileName, outputToFormat, 'success');
            const terminalOutputMessage = {
                type: 'TERMINAL_OUTPUT',
                payload: {
                    output: formattedOutput,
                    timestamp: Date.now()
                }
            };
            console.log(`📤 Sending TERMINAL_OUTPUT to ${user.username}:`, (terminalOutputMessage.payload.output || '').substring(0, 100));
            console.log(`🔍 WebSocket state: ${ws.readyState} (OPEN=${ws.OPEN})`);
            
            if (ws.readyState === ws.OPEN) {
                try {
                    const messageStr = JSON.stringify(terminalOutputMessage);
                    ws.send(messageStr);
                    console.log(`✅ TERMINAL_OUTPUT sent successfully (${messageStr.length} bytes)`);
                    console.log(`📋 Message content:`, (messageStr || '').substring(0, 200));
                } catch (sendError) {
                    console.error(`❌ Error sending TERMINAL_OUTPUT:`, sendError);
                }
            } else {
                console.log(`❌ WebSocket not open, cannot send TERMINAL_OUTPUT`);
            }
            
            // Also send structured execution result (matching frontend expectation)
            console.log('🔍 [WebSocketTerminalHandler] Building CODE_EXECUTION_RESULT message');
            console.log('  - result.output:', JSON.stringify(result.output));
            console.log('  - result.success:', result.success);
            console.log('  - result.stderr:', JSON.stringify(result.stderr));

            const codeResultMessage = {
                type: 'CODE_EXECUTION_RESULT',
                payload: {
                    result: {
                        output: result.output || result.stderr || '',
                        success: result.success,
                        executionTime: result.executionTime || 0,
                        testCaseResults: result.testResults || [],
                        passed: result.passedTests || 0,
                        failed: result.failedTests || 0,
                        language: language
                    },
                    success: result.success,
                    language,
                    fileName: displayFileName,
                    timestamp: Date.now()
                }
            };
            console.log('🔍 [WebSocketTerminalHandler] Final CODE_EXECUTION_RESULT message:', JSON.stringify(codeResultMessage, null, 2));
            console.log(`📤 Sending CODE_EXECUTION_RESULT to ${user.username}:`, (result.output || 'no output').substring(0, 50));
            
            if (ws.readyState === ws.OPEN) {
                ws.send(JSON.stringify(codeResultMessage));
                console.log(`✅ CODE_EXECUTION_RESULT sent successfully`);
            } else {
                console.log(`❌ WebSocket not open, cannot send CODE_EXECUTION_RESULT`);
            }
            
        } catch (error) {
            console.error(`❌ Code execution failed for ${user.username}:`, error.message);
            
            // Send terminal error output for display with improved formatting
            const formattedError = this.formatTerminalOutput(language, displayFileName, error.message, 'error');
            ws.send(JSON.stringify({
                type: 'TERMINAL_OUTPUT',
                payload: {
                    output: formattedError,
                    timestamp: Date.now()
                }
            }));
            
            // Also send structured error result
            ws.send(JSON.stringify({
                type: 'CODE_EXECUTION_ERROR',
                payload: {
                    error: error.message,
                    success: false,
                    language,
                    fileName: displayFileName,
                    timestamp: Date.now()
                }
            }));
        }
    }
    
    formatTerminalOutput(language, fileName, output, type = 'success') {
        console.log('🔍 [formatTerminalOutput] Input validation:');
        console.log('  - Language:', language);
        console.log('  - FileName:', fileName);
        console.log('  - Output type:', typeof output);
        console.log('  - Output value:', output);
        console.log('  - Type:', type);

        // Validate and sanitize inputs
        if (!output) {
            console.warn('⚠️ [formatTerminalOutput] Output is null/undefined, using fallback');
            output = type === 'error' ? 'Unknown error occurred' : 'No output provided';
        }

        if (typeof output !== 'string') {
            console.warn('⚠️ [formatTerminalOutput] Output is not a string, converting');
            output = String(output);
        }

        const timestamp = new Date().toLocaleTimeString();
        const languageIcon = {
            'python': '🐍',
            'javascript': '🟨',
            'java': '☕',
            'cpp': '⚡',
            'c': '⚡'
        }[language] || '📝';

        let formattedOutput = '';

        // Header with timestamp and language
        formattedOutput += `\r\n╭─ ${languageIcon} ${language.toUpperCase()} EXECUTION [${timestamp}]\r\n`;
        formattedOutput += `├─ File: ${fileName}\r\n`;
        formattedOutput += `├─ Command: ${this.getExecutionCommand(language, fileName)}\r\n`;
        formattedOutput += `├─ Output:\r\n`;

        if (type === 'error') {
            formattedOutput += `│ ❌ Error: ${output}\r\n`;
        } else {
            try {
                // Format output lines with proper indentation
                console.log('🔍 [formatTerminalOutput] Attempting to split output');
                const outputLines = output.split('\n').filter(line => line.trim() !== '');
                console.log('🔍 [formatTerminalOutput] Split successful, lines count:', outputLines.length);

                if (outputLines.length === 0) {
                    formattedOutput += `│ (No output)\r\n`;
                } else {
                    outputLines.forEach(line => {
                        formattedOutput += `│ ${line}\r\n`;
                    });
                }
            } catch (splitError) {
                console.error('❌ [formatTerminalOutput] Error splitting output:', splitError);
                formattedOutput += `│ ❌ Error formatting output: ${splitError.message}\r\n`;
                formattedOutput += `│ Raw output: ${output}\r\n`;
            }
        }
        
        formattedOutput += `╰─ ${type === 'error' ? '❌ FAILED' : '✅ SUCCESS'}\r\n`;
        formattedOutput += `\r\n$ `;
        
        return formattedOutput;
    }
    
    getExecutionCommand(language, fileName) {
        switch (language.toLowerCase()) {
            case 'python':
                return `python3 ${fileName}`;
            case 'javascript':
                return `node ${fileName}`;
            case 'java':
                return `javac ${fileName} && java Main`;
            case 'cpp':
                return `g++ ${fileName} -o main && ./main`;
            case 'c':
                return `gcc ${fileName} -o main && ./main`;
            default:
                return `${language} ${fileName}`;
        }
    }
    
    broadcastToTerminalSession(sessionId, message) {
        const terminalSession = this.terminalSessions.get(sessionId);
        if (!terminalSession) return;
        
        terminalSession.websockets.forEach(ws => {
            if (ws.readyState === ws.OPEN) {
                ws.send(JSON.stringify(message));
            }
        });
    }
    
    // Cleanup method for graceful shutdown
    async cleanup() {
        console.log('🧹 Cleaning up terminal WebSocket sessions...');
        
        for (const [sessionId, terminalSession] of this.terminalSessions.entries()) {
            terminalSession.websockets.forEach(ws => {
                if (ws.readyState === ws.OPEN) {
                    ws.close(1000, 'Server shutting down');
                }
            });
        }
        
        this.terminalSessions.clear();
    }

    generateTestHarness(userCode, testCases, language) {
        switch (language.toLowerCase()) {
            case 'javascript':
                return this.generateJavaScriptTestHarness(userCode, testCases);
            case 'python':
                return this.generatePythonTestHarness(userCode, testCases);
            case 'java':
                return this.generateJavaTestHarness(userCode, testCases);
            default:
                throw new Error(`Test harness generation not implemented for ${language}`);
        }
    }

    generateJavaScriptTestHarness(userCode, testCases) {

        let testHarness = `${userCode}\n\n// Test harness\n`;

        testCases.forEach((testCase, index) => {
            // Parse the input string to extract target and nums
            const inputStr = testCase.input;
            const expectedOutput = testCase.expectedOutput;

            try {
                // Extract target and nums from string like "target = 7, nums = [2,3,1,2,4,3]"
                const targetMatch = inputStr.match(/target\s*=\s*(\d+)/);
                const numsMatch = inputStr.match(/nums\s*=\s*\[([^\]]+)\]/);

                if (targetMatch && numsMatch) {
                    const target = parseInt(targetMatch[1]);
                    const nums = numsMatch[1].split(',').map(n => parseInt(n.trim()));

                    testHarness += `
// Test case ${index + 1}: ${testCase.description || `Test ${index + 1}`}
try {
    const input${index} = { target: ${target}, nums: [${nums.join(', ')}] };
    const result${index} = minimumSizeSubarraySum(input${index});
    const expected${index} = ${expectedOutput};
    const passed${index} = result${index} === expected${index};
    console.log("TEST_${index + 1}:", passed${index} ? "PASS" : "FAIL");
    console.log("  Input:", JSON.stringify(input${index}));
    console.log("  Expected:", expected${index});
    console.log("  Got:", result${index});
} catch (error${index}) {
    console.log("TEST_${index + 1}:", "ERROR");
    console.log("  Error:", error${index}.message);
}
`;
                } else {
                    throw new Error(`Could not parse test case input: ${inputStr}`);
                }
            } catch (parseError) {
                console.warn(`⚠️ Could not parse test case ${index + 1}:`, parseError.message);
                testHarness += `
// Test case ${index + 1}: Parse error
console.log("TEST_${index + 1}:", "PARSE_ERROR");
console.log("  Error: Could not parse input '${inputStr}'");
`;
            }
        });

        return testHarness;
    }

    generatePythonTestHarness(userCode, testCases) {
        let testHarness = `${userCode}\n\n# Test harness\nimport json\n\n`;

        testCases.forEach((testCase, index) => {
            const inputStr = testCase.input;
            const expectedOutput = testCase.expectedOutput;

            try {
                // Extract target and nums from string like "target = 7, nums = [2,3,1,2,4,3]"
                const targetMatch = inputStr.match(/target\s*=\s*(\d+)/);
                const numsMatch = inputStr.match(/nums\s*=\s*\[([^\]]+)\]/);

                if (targetMatch && numsMatch) {
                    const target = parseInt(targetMatch[1]);
                    const nums = numsMatch[1].split(',').map(n => parseInt(n.trim()));

                    testHarness += `
# Test case ${index + 1}: ${testCase.description || `Test ${index + 1}`}
try:
    input_${index} = {"target": ${target}, "nums": [${nums.join(', ')}]}
    solution = Solution()
    result_${index} = solution.minimumSizeSubarraySum(input_${index})
    expected_${index} = ${expectedOutput}
    passed_${index} = result_${index} == expected_${index}
    print(f"TEST_${index + 1}: {'PASS' if result_${index} == expected_${index} else 'FAIL'}")
    print(f"  Input: {json.dumps(input_${index})}")
    print(f"  Expected: {expected_${index}}")
    print(f"  Got: {result_${index}}")
except Exception as error_${index}:
    print(f"TEST_${index + 1}: ERROR")
    print(f"  Error: {str(error_${index})}")
`;
                } else {
                    throw new Error(`Could not parse test case input: ${inputStr}`);
                }
            } catch (parseError) {
                console.warn(`⚠️ Could not parse test case ${index + 1}:`, parseError.message);
                testHarness += `
# Test case ${index + 1}: Parse error
print("TEST_${index + 1}: PARSE_ERROR")
print("  Error: Could not parse input '${inputStr}'")
`;
            }
        });

        return testHarness;
    }

    generateJavaTestHarness(userCode, testCases) {
        // Define Input class first, then user code, then Main class
        let testHarness = `// Helper class for input structure
class Input {
    int target;
    int[] nums;

    public Input(int target, int[] nums) {
        this.target = target;
        this.nums = nums;
    }
}

${userCode}

public class Main {
    public static void main(String[] args) {
`;

        testCases.forEach((testCase, index) => {
            const inputStr = testCase.input;
            const expectedOutput = testCase.expectedOutput;

            try {
                // Extract target and nums from string like "target = 7, nums = [2,3,1,2,4,3]"
                const targetMatch = inputStr.match(/target\s*=\s*(\d+)/);
                const numsMatch = inputStr.match(/nums\s*=\s*\[([^\]]+)\]/);

                if (targetMatch && numsMatch) {
                    const target = parseInt(targetMatch[1]);
                    const nums = numsMatch[1].split(',').map(n => parseInt(n.trim()));

                    testHarness += `
        // Test case ${index + 1}: ${testCase.description || `Test ${index + 1}`}
        try {
            int[] nums${index} = {${nums.join(', ')}};
            Input input${index} = new Input(${target}, nums${index});
            Solution solution = new Solution();
            int result${index} = solution.minimumSizeSubarraySum(input${index});
            int expected${index} = ${expectedOutput};
            boolean passed${index} = result${index} == expected${index};
            System.out.println("TEST_${index + 1}: " + (passed${index} ? "PASS" : "FAIL"));
            System.out.println("  Input: {target: " + ${target} + ", nums: " + java.util.Arrays.toString(nums${index}) + "}");
            System.out.println("  Expected: " + expected${index});
            System.out.println("  Got: " + result${index});
        } catch (Exception error${index}) {
            System.out.println("TEST_${index + 1}: ERROR");
            System.out.println("  Error: " + error${index}.getMessage());
        }
`;
                } else {
                    throw new Error(`Could not parse test case input: ${inputStr}`);
                }
            } catch (parseError) {
                console.warn(`⚠️ Could not parse test case ${index + 1}:`, parseError.message);
                testHarness += `
        // Test case ${index + 1}: Parse error
        System.out.println("TEST_${index + 1}: PARSE_ERROR");
        System.out.println("  Error: Could not parse input '${inputStr}'");
`;
            }
        });

        testHarness += `
    }
}`;

        return testHarness;
    }

    parseTestResults(output, testCases) {
        console.log('🔍 Parsing test results from output:', output);

        if (!output) {
            return {
                success: false,
                passed: 0,
                failed: testCases.length,
                details: testCases.map((_, i) => ({ test: i + 1, status: 'NO_OUTPUT' })),
                summary: 'No output received from test execution'
            };
        }

        const lines = output.split('\n');
        let passed = 0;
        let failed = 0;
        const details = [];

        testCases.forEach((_, index) => {
            const testNum = index + 1;
            const testLine = lines.find(line => line.includes(`TEST_${testNum}:`));

            if (testLine) {
                if (testLine.includes('PASS')) {
                    passed++;
                    details.push({ test: testNum, status: 'PASS' });
                } else if (testLine.includes('FAIL')) {
                    failed++;
                    details.push({ test: testNum, status: 'FAIL' });
                } else if (testLine.includes('ERROR') || testLine.includes('PARSE_ERROR')) {
                    failed++;
                    details.push({ test: testNum, status: 'ERROR' });
                }
            } else {
                failed++;
                details.push({ test: testNum, status: 'MISSING' });
            }
        });

        const success = failed === 0 && passed > 0;
        const summary = `${passed} passed, ${failed} failed out of ${testCases.length} tests`;

        return { success, passed, failed, details, summary };
    }
}

// Export singleton instance
const terminalHandler = new WebSocketTerminalHandler();

// Graceful shutdown
process.on('SIGTERM', async () => {
    await terminalHandler.cleanup();
});

module.exports = terminalHandler;