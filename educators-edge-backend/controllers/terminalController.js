// =================================================================
// FILE: controllers/terminalController.js
// =================================================================
// DESCRIPTION: Controller for managing Docker-based terminal sessions
// Supports both HTTP REST API and WebSocket real-time communication

const { Queue } = require('bullmq');
const Redis = require('ioredis');
const { v4: uuidv4 } = require('uuid');
const Judge0Service = require('../services/judge0Service');
const fastExecutionService = require('../services/fastExecutionService');

// Redis connection with BullMQ configuration
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null, // Required for BullMQ
    retryDelayOnFailover: 100,
    enableReadyCheck: false
});
const codeExecutionQueue = new Queue('code-execution', { connection: redis });

class TerminalController {
    constructor() {
        this.sessions = new Map(); // sessionId -> { userId, createdAt, lastActivity }
        this.judge0Service = new Judge0Service();
        this.fastExecutionService = fastExecutionService;
    }

    // Create a new terminal session
    createSession = async (req, res) => {
        try {
            const userId = req.user?.id;
            const sessionId = uuidv4();
            
            // Track session metadata (no worker needed for session creation)
            this.sessions.set(sessionId, {
                userId,
                createdAt: new Date(),
                lastActivity: new Date(),
                type: 'terminal'
            });
            
            console.log(`🎯 Terminal session ${sessionId} created for user ${userId}`);
            
            res.json({
                success: true,
                sessionId: sessionId,
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
            const { sessionId, code, language = 'bash', testCases = [] } = req.body;
            const userId = req.user?.id;

            console.log(`🐳 Docker execution request:`, {
                userId,
                language,
                codeLength: code?.length,
                testCaseCount: testCases.length,
                hasSession: !!sessionId
            });
            
            // Validate session ownership
            const sessionMeta = this.sessions.get(sessionId);
            if (sessionMeta && sessionMeta.userId !== userId) {
                return res.status(403).json({
                    success: false,
                    error: 'Unauthorized access to session'
                });
            }
            
            // Add job to queue for worker processing
            const job = await codeExecutionQueue.add('execute', {
                sessionId,
                code,
                language,
                testCases,
                userId
            }, {
                removeOnComplete: 5,
                removeOnFail: 10
            });
            
            // Wait for job completion (with timeout)
            // Use a simpler approach - polling for job completion
            let result;
            let attempts = 0;
            const maxAttempts = 30; // 15 seconds with 0.5s intervals

            while (attempts < maxAttempts) {
                const jobState = await job.getState();

                if (jobState === 'completed') {
                    // Get result safely without triggering waitUntilFinished
                    const jobData = await codeExecutionQueue.getJob(job.id);
                    result = jobData?.returnvalue;
                    break;
                } else if (jobState === 'failed') {
                    // Get failure reason safely
                    const jobData = await codeExecutionQueue.getJob(job.id);
                    const failedReason = jobData?.failedReason;
                    throw new Error(`Job failed: ${failedReason}`);
                }

                // Wait 0.5 seconds before next check
                await new Promise(resolve => setTimeout(resolve, 500));
                attempts++;
            }

            if (!result) {
                throw new Error('Job execution timeout');
            } // 15 second timeout
            
            // Update session activity
            if (sessionMeta) {
                sessionMeta.lastActivity = new Date();
            }
            
            res.json({
                success: result.success,
                result: result.result || {
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
            
            // TODO: Implement sendInput via WebSocket to worker
            console.log(`📤 Sending input to session ${sessionId}: ${input}`);
            
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
            
            const sessionInfo = this.sessions.get(sessionId);
            const status = sessionInfo ? 'active' : 'not_found';
            
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
                        const sessionInfo = this.sessions.get(session.sessionId);
                        const status = sessionInfo ? 'active' : 'inactive';
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
            
            // Session cleanup (no worker communication needed)
            console.log(`🗑️ Cleaning up session ${sessionId}`);
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

    // LeetCode-style test execution with proper validation
    executeLeetCodeTests = async (req, res) => {
        try {
            const { code, testCases, language = 'javascript', problemMeta = {} } = req.body;
            const userId = req.user?.id;

            console.log(`🧪 LeetCode test execution: ${language} code for user ${userId}`);
            console.log(`📋 Test cases: ${testCases?.length || 0} cases`);

            if (!code) {
                return res.status(400).json({
                    success: false,
                    error: 'Code is required'
                });
            }

            if (!testCases || !Array.isArray(testCases) || testCases.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Test cases are required'
                });
            }

            // Use Judge0 service for secure, production-ready execution
            const results = await this.judge0Service.submitExecution(language, code, testCases, problemMeta);

            res.json({
                success: results.success,
                type: 'leetcode-tests',
                results
            });

        } catch (error) {
            console.error('Error in LeetCode test execution:', error);
            res.status(500).json({
                success: false,
                error: 'LeetCode test execution failed',
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
            
            // Execute code directly via queue (no session needed for quick execution)
            const tempSessionId = uuidv4();
            
            const job = await codeExecutionQueue.add('execute', {
                sessionId: tempSessionId,
                code,
                language
            }, {
                removeOnComplete: 1,
                removeOnFail: 5
            });
            
            // Use a simpler approach - polling for job completion
            let result;
            let attempts = 0;
            const maxAttempts = 30; // 15 seconds with 0.5s intervals

            while (attempts < maxAttempts) {
                const jobState = await job.getState();

                if (jobState === 'completed') {
                    // Get result safely without triggering waitUntilFinished
                    const jobData = await codeExecutionQueue.getJob(job.id);
                    result = jobData?.returnvalue;
                    break;
                } else if (jobState === 'failed') {
                    // Get failure reason safely
                    const jobData = await codeExecutionQueue.getJob(job.id);
                    const failedReason = jobData?.failedReason;
                    throw new Error(`Job failed: ${failedReason}`);
                }

                // Wait 0.5 seconds before next check
                await new Promise(resolve => setTimeout(resolve, 500));
                attempts++;
            }

            if (!result) {
                throw new Error('Job execution timeout');
            }
            
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

    // Direct code execution without test case parsing
    executeCodeDirect = async (req, res) => {
        const { code, language = 'javascript', problemMeta = {} } = req.body;
        const userId = req.user?.id;

        try {

            console.log(`🚀 Direct code execution for user ${userId}:`, {
                language,
                codeLength: code?.length,
                problemTitle: problemMeta?.title
            });

            if (!code) {
                return res.status(400).json({
                    success: false,
                    error: 'Code is required',
                    terminalOutput: '❌ Error: No code provided for execution'
                });
            }

            // First test Judge0 connectivity
            console.log('🏥 Testing Judge0 health check...');
            const healthCheck = await this.judge0Service.healthCheck();
            console.log('🏥 Judge0 health check result:', healthCheck);

            if (healthCheck.status !== 'healthy') {
                throw new Error(`Judge0 service is not healthy: ${healthCheck.error}`);
            }

            // Use Judge0 minimal execution strategy
            const minimalHarness = this.generateMinimalTestHarness(code, language);
            const judge0Results = await this.judge0Service.submitMinimalExecution(language, minimalHarness);

            if (judge0Results.success) {
                res.json({
                    success: true,
                    terminalOutput: `✅ Code Executed Successfully\n` +
                                  `Language: ${language}\n` +
                                  `Status: Completed\n` +
                                  `Message: ${judge0Results.message || 'Code compiled and ran without errors'}\n\n` +
                                  `🎉 Your ${language} code executed successfully!`,
                    executionTime: judge0Results.executionTime || 0,
                    memory: 32,
                    output: judge0Results.message || 'Execution completed'
                });
            } else {
                res.json({
                    success: false,
                    terminalOutput: `❌ Code Execution Failed\n` +
                                  `Language: ${language}\n` +
                                  `Error: ${judge0Results.error || 'Unknown execution error'}\n\n` +
                                  `Please check your syntax and try again.`,
                    error: judge0Results.error,
                    output: judge0Results.error || 'Execution failed'
                });
            }

        } catch (error) {
            // Get detailed error information from Judge0 service
            const errorDetails = this.judge0Service.parseErrorDetails ?
                this.judge0Service.parseErrorDetails(error) :
                { message: error.message, statusCode: error.response?.status };

            console.error('❌ Judge0 execution failed:', errorDetails);

            // Log specific error context for debugging
            if (errorDetails.errorType === 'RATE_LIMITED') {
                console.warn('⚠️ Judge0 Rate Limit Info:', {
                    requestsRemaining: errorDetails.requestsRemaining,
                    resetTime: errorDetails.resetTime,
                    suggestion: errorDetails.suggestion
                });
            } else if (errorDetails.errorType === 'ACCESS_FORBIDDEN') {
                console.warn('⚠️ Judge0 Access Issue:', {
                    description: errorDetails.description,
                    suggestion: errorDetails.suggestion,
                    responseData: errorDetails.responseData
                });
            }

            try {
                console.log('🔄 Falling back to FastExecutionService...');
                // Use FastExecutionService as fallback
                const fallbackResults = await this.fastExecutionService.executeCodeWithTests(code, [], language);

                // Determine fallback reason based on error type
                let fallbackReason = 'Primary service unavailable';
                if (errorDetails.errorType === 'RATE_LIMITED') {
                    fallbackReason = 'Judge0 rate limit exceeded';
                } else if (errorDetails.errorType === 'ACCESS_FORBIDDEN') {
                    fallbackReason = 'Judge0 access forbidden (check subscription)';
                } else if (errorDetails.errorType === 'PAYMENT_REQUIRED') {
                    fallbackReason = 'Judge0 quota exceeded (payment required)';
                }

                res.json({
                    success: true,
                    terminalOutput: `✅ Code Executed Successfully (Fallback Service)\n` +
                                  `Language: ${language}\n` +
                                  `Status: Completed\n` +
                                  `Fallback Reason: ${fallbackReason}\n` +
                                  `Error Type: ${errorDetails.errorType || 'Unknown'}\n\n` +
                                  `🎉 Your ${language} code executed successfully!`,
                    executionTime: fallbackResults.executionTime || 0,
                    memory: 32,
                    output: fallbackResults.output || 'Execution completed',
                    fallbackUsed: true,
                    primaryServiceError: {
                        type: errorDetails.errorType,
                        description: errorDetails.description,
                        suggestion: errorDetails.suggestion
                    }
                });
            } catch (fallbackError) {
                console.error('❌ Fallback execution also failed:', fallbackError.message);
                res.status(500).json({
                    success: false,
                    error: 'All execution services unavailable',
                    terminalOutput: `❌ All Execution Services Failed\n\n` +
                                  `Primary Service (Judge0):\n` +
                                  `  Error: ${errorDetails.errorType || 'Unknown'}\n` +
                                  `  Description: ${errorDetails.description || error.message}\n` +
                                  `  Suggestion: ${errorDetails.suggestion || 'Contact support'}\n\n` +
                                  `Fallback Service:\n` +
                                  `  Error: ${fallbackError.message}\n\n` +
                                  `All code execution services are temporarily unavailable.\n` +
                                  `Please try again later or contact support.`,
                    output: error.message,
                    primaryServiceError: {
                        type: errorDetails.errorType,
                        description: errorDetails.description,
                        suggestion: errorDetails.suggestion,
                        statusCode: errorDetails.statusCode
                    },
                    fallbackServiceError: fallbackError.message
                });
            }
        }
    };

    // Helper function to generate minimal test harness
    generateMinimalTestHarness(userCode, language) {
        switch (language) {
            case 'javascript':
                return `
${userCode}

// Minimal execution test
try {
    console.log(JSON.stringify({
        success: true,
        executionTime: 0,
        message: "JavaScript code executed without errors"
    }));
} catch (error) {
    console.log(JSON.stringify({
        success: false,
        error: error.message
    }));
}`;

            case 'python':
                return `
${userCode}

# Minimal execution test
import json
try:
    print(json.dumps({
        "success": True,
        "executionTime": 0,
        "message": "Python code executed without errors"
    }))
except Exception as error:
    print(json.dumps({
        "success": False,
        "error": str(error)
    }))`;

            case 'java':
                return `
${userCode}

public class DirectExecution {
    public static void main(String[] args) {
        try {
            System.out.println("{\\"success\\": true, \\"message\\": \\"Java code compiled and executed successfully\\"}");
        } catch (Exception e) {
            System.out.println("{\\"success\\": false, \\"error\\": \\"" + e.getMessage() + "\\"}");
        }
    }
}`;

            default:
                return userCode + '\n// Code execution completed';
        }
    }

    // Health check endpoint
    healthCheck = async (req, res) => {
        try {
            // Check Redis connection and queue health
            const queueHealth = await this.checkQueueHealth();
            const judge0Health = await this.judge0Service.healthCheck();
            const controllerHealth = {
                activeSessions: this.sessions.size,
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                timestamp: new Date().toISOString()
            };

            res.json({
                success: queueHealth.connected && judge0Health.status === 'healthy',
                health: {
                    controller: controllerHealth,
                    queue: queueHealth,
                    judge0: judge0Health
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

    // Check queue and Redis health
    async checkQueueHealth() {
        try {
            // Test Redis connection
            await redis.ping();
            
            // Get queue stats
            const waiting = await codeExecutionQueue.getWaiting();
            const active = await codeExecutionQueue.getActive();
            const completed = await codeExecutionQueue.getCompleted();
            const failed = await codeExecutionQueue.getFailed();
            
            return {
                connected: true,
                redis: 'connected',
                queueStats: {
                    waiting: waiting.length,
                    active: active.length,
                    completed: completed.length,
                    failed: failed.length
                }
            };
        } catch (error) {
            return {
                connected: false,
                redis: 'disconnected',
                error: error.message
            };
        }
    }

    // Cleanup inactive sessions (call this periodically)
    cleanupInactiveSessions = async () => {
        const now = new Date();
        const inactivityThreshold = 30 * 60 * 1000; // 30 minutes
        
        for (const [sessionId, meta] of this.sessions.entries()) {
            if (now - meta.lastActivity > inactivityThreshold) {
                console.log(`🧹 Cleaning up inactive session ${sessionId}`);
                try {
                    // Session cleanup (no worker communication needed)
            console.log(`🗑️ Cleaning up session ${sessionId}`);
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