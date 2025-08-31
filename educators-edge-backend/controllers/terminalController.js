// =================================================================
// FILE: controllers/terminalController.js
// =================================================================
// DESCRIPTION: Controller for managing Docker-based terminal sessions
// Supports both HTTP REST API and WebSocket real-time communication

const sandboxService = require('../services/dockerSandboxService');
const { v4: uuidv4 } = require('uuid');

class TerminalController {
    constructor() {
        this.sessions = new Map(); // sessionId -> { userId, createdAt, lastActivity }
    }

    // Create a new terminal session
    createSession = async (req, res) => {
        try {
            const userId = req.user?.id;
            const sessionId = uuidv4();
            
            const sandbox = await sandboxService.createSandboxSession(sessionId);
            
            // Track session metadata
            this.sessions.set(sessionId, {
                userId,
                createdAt: new Date(),
                lastActivity: new Date(),
                type: 'terminal'
            });
            
            console.log(`🎯 Terminal session ${sessionId} created for user ${userId}`);
            
            res.json({
                success: true,
                sessionId: sandbox.id,
                message: 'Terminal session created successfully'
            });
            
        } catch (error) {
            console.error('Error creating terminal session:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to create terminal session',
                details: error.message
            });
        }
    };

    // Execute code in a session
    executeCode = async (req, res) => {
        try {
            const { sessionId, code, language = 'bash' } = req.body;
            const userId = req.user?.id;
            
            // Validate session ownership
            const sessionMeta = this.sessions.get(sessionId);
            if (sessionMeta && sessionMeta.userId !== userId) {
                return res.status(403).json({
                    success: false,
                    error: 'Unauthorized access to session'
                });
            }
            
            const result = await sandboxService.executeCode(code, language, sessionId);
            
            // Update session activity
            if (sessionMeta) {
                sessionMeta.lastActivity = new Date();
            }
            
            res.json({
                success: true,
                result: {
                    output: result.output,
                    error: result.error,
                    executionTime: result.executionTime,
                    language
                }
            });
            
        } catch (error) {
            console.error('Error executing code:', error);
            res.status(500).json({
                success: false,
                error: 'Code execution failed',
                details: error.message
            });
        }
    };

    // Send input to terminal session
    sendInput = async (req, res) => {
        try {
            const { sessionId, input } = req.body;
            const userId = req.user?.id;
            
            // Validate session ownership
            const sessionMeta = this.sessions.get(sessionId);
            if (sessionMeta && sessionMeta.userId !== userId) {
                return res.status(403).json({
                    success: false,
                    error: 'Unauthorized access to session'
                });
            }
            
            await sandboxService.sendInput(sessionId, input);
            
            // Update session activity
            if (sessionMeta) {
                sessionMeta.lastActivity = new Date();
            }
            
            res.json({
                success: true,
                message: 'Input sent successfully'
            });
            
        } catch (error) {
            console.error('Error sending input:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to send input',
                details: error.message
            });
        }
    };

    // Get session status
    getSessionStatus = async (req, res) => {
        try {
            const { sessionId } = req.params;
            const userId = req.user?.id;
            
            // Validate session ownership
            const sessionMeta = this.sessions.get(sessionId);
            if (sessionMeta && sessionMeta.userId !== userId) {
                return res.status(403).json({
                    success: false,
                    error: 'Unauthorized access to session'
                });
            }
            
            const status = await sandboxService.getSessionStatus(sessionId);
            
            if (!status) {
                return res.status(404).json({
                    success: false,
                    error: 'Session not found'
                });
            }
            
            res.json({
                success: true,
                status: {
                    ...status,
                    metadata: sessionMeta
                }
            });
            
        } catch (error) {
            console.error('Error getting session status:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get session status',
                details: error.message
            });
        }
    };

    // List user's active sessions
    listSessions = async (req, res) => {
        try {
            const userId = req.user?.id;
            
            const userSessions = Array.from(this.sessions.entries())
                .filter(([_, meta]) => meta.userId === userId)
                .map(([sessionId, meta]) => ({
                    sessionId,
                    ...meta
                }));
            
            // Get detailed status for each session
            const sessionsWithStatus = await Promise.all(
                userSessions.map(async (session) => {
                    try {
                        const status = await sandboxService.getSessionStatus(session.sessionId);
                        return { ...session, status };
                    } catch (error) {
                        return { ...session, status: 'error', error: error.message };
                    }
                })
            );
            
            res.json({
                success: true,
                sessions: sessionsWithStatus
            });
            
        } catch (error) {
            console.error('Error listing sessions:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to list sessions',
                details: error.message
            });
        }
    };

    // Terminate a session
    terminateSession = async (req, res) => {
        try {
            const { sessionId } = req.params;
            const userId = req.user?.id;
            
            // Validate session ownership
            const sessionMeta = this.sessions.get(sessionId);
            if (sessionMeta && sessionMeta.userId !== userId) {
                return res.status(403).json({
                    success: false,
                    error: 'Unauthorized access to session'
                });
            }
            
            await sandboxService.cleanupSession(sessionId);
            this.sessions.delete(sessionId);
            
            console.log(`🗑️ Terminal session ${sessionId} terminated by user ${userId}`);
            
            res.json({
                success: true,
                message: 'Session terminated successfully'
            });
            
        } catch (error) {
            console.error('Error terminating session:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to terminate session',
                details: error.message
            });
        }
    };

    // Quick code execution (creates temporary session)
    quickExecute = async (req, res) => {
        try {
            const { code, language = 'javascript' } = req.body;
            const userId = req.user?.id;
            
            console.log(`⚡ Quick execute request: ${language} code for user ${userId}`);
            
            const result = await sandboxService.executeCode(code, language);
            
            res.json({
                success: result.success,
                result: {
                    output: result.output,
                    error: result.error,
                    executionTime: result.executionTime,
                    language,
                    type: 'quick-execute'
                }
            });
            
        } catch (error) {
            console.error('Error in quick execute:', error);
            res.status(500).json({
                success: false,
                error: 'Quick execution failed',
                details: error.message
            });
        }
    };

    // Health check endpoint
    healthCheck = async (req, res) => {
        try {
            const serviceHealth = await sandboxService.healthCheck();
            const controllerHealth = {
                activeSessions: this.sessions.size,
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                timestamp: new Date().toISOString()
            };
            
            res.json({
                success: true,
                health: {
                    controller: controllerHealth,
                    sandbox: serviceHealth
                }
            });
            
        } catch (error) {
            console.error('Error in health check:', error);
            res.status(500).json({
                success: false,
                error: 'Health check failed',
                details: error.message
            });
        }
    };

    // Cleanup inactive sessions (call this periodically)
    cleanupInactiveSessions = async () => {
        const now = new Date();
        const inactivityThreshold = 30 * 60 * 1000; // 30 minutes
        
        for (const [sessionId, meta] of this.sessions.entries()) {
            if (now - meta.lastActivity > inactivityThreshold) {
                console.log(`🧹 Cleaning up inactive session ${sessionId}`);
                try {
                    await sandboxService.cleanupSession(sessionId);
                    this.sessions.delete(sessionId);
                } catch (error) {
                    console.error(`Error cleaning up session ${sessionId}:`, error);
                }
            }
        }
    };
}

// Export singleton instance
const terminalController = new TerminalController();

// Start cleanup timer (every 5 minutes)
setInterval(() => {
    terminalController.cleanupInactiveSessions();
}, 5 * 60 * 1000);

module.exports = terminalController;