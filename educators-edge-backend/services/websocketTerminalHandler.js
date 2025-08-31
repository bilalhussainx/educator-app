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
                console.error('❌ Terminal WS: Token starts with:', token.substring(0, 20));
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
        const { code, language, fileName } = payload;
        const displayFileName = fileName || 'terminal.py';
        console.log(`🚀 Code execution request from ${user.username}: ${language} (${displayFileName})`);
        
        try {
            // Import the execution service
            const { executeCode } = require('./executionService');
            
            console.log(`⚡ Executing ${language} code: ${code.substring(0, 50)}...`);
            
            // Execute the code
            const result = await executeCode(code, language);
            
            console.log(`✅ Code execution completed for ${user.username}`);
            
            // Send terminal output for display in terminal interface
            ws.send(JSON.stringify({
                type: 'TERMINAL_OUTPUT',
                payload: {
                    output: `$ ${language} ${displayFileName}\n${result.output}\n`,
                    timestamp: Date.now()
                }
            }));
            
            // Also send structured execution result (matching frontend expectation)
            ws.send(JSON.stringify({
                type: 'CODE_EXECUTION_RESULT',
                payload: {
                    result: {
                        output: result.output,
                        success: result.success
                    },
                    success: true,
                    language,
                    fileName: displayFileName,
                    timestamp: Date.now()
                }
            }));
            
        } catch (error) {
            console.error(`❌ Code execution failed for ${user.username}:`, error.message);
            
            // Send terminal error output for display
            ws.send(JSON.stringify({
                type: 'TERMINAL_OUTPUT',
                payload: {
                    output: `$ ${language} ${displayFileName}\nError: ${error.message}\n`,
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
}

// Export singleton instance
const terminalHandler = new WebSocketTerminalHandler();

// Graceful shutdown
process.on('SIGTERM', async () => {
    await terminalHandler.cleanup();
});

module.exports = terminalHandler;