// =================================================================
// FILE: services/dockerWorkerClient.js
// =================================================================
// DESCRIPTION: Client service for communicating with Docker worker
// Replaces dockerSandboxService.js in multi-service architecture

const axios = require('axios');
const { EventEmitter } = require('events');
const WebSocket = require('ws');

class DockerWorkerClient extends EventEmitter {
    constructor() {
        super();
        
        // Get worker URL from environment (set by Render automatically)
        this.workerUrl = process.env.DOCKER_WORKER_URL || 'http://localhost:10001';
        this.activeSessions = new Map();
        
        console.log(`[DockerWorkerClient] Worker URL: ${this.workerUrl}`);
        
        // Test connection to worker (non-blocking)
        this.testConnection().catch(() => {
            // Worker not available at startup - this is OK, will retry on first use
            console.log('🔄 Worker connection will be attempted when first needed');
        });
    }
    
    async testConnection() {
        try {
            const response = await axios.get(`${this.workerUrl}/health`, {
                timeout: 5000
            });
            
            if (response.data.success) {
                console.log('✅ Connected to Docker worker service');
                console.log(`📊 Worker health:`, response.data.health);
            } else {
                console.warn('⚠️ Docker worker service health check failed');
            }
        } catch (error) {
            console.error('❌ Failed to connect to Docker worker service:', error.message);
            console.error('🔧 Make sure the Docker worker service is running');
        }
    }
    
    async createSession() {
        try {
            const response = await axios.post(`${this.workerUrl}/sessions`, {}, {
                timeout: 30000 // Container creation can take time
            });
            
            if (response.data.success) {
                const sessionId = response.data.sessionId;
                this.activeSessions.set(sessionId, {
                    id: sessionId,
                    status: response.data.status,
                    createdAt: new Date()
                });
                
                console.log(`✅ Created Docker session: ${sessionId}`);
                this.emit('sessionCreated', sessionId);
                
                return sessionId;
            } else {
                throw new Error(response.data.error || 'Failed to create session');
            }
        } catch (error) {
            if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
                console.error('🔄 Docker worker service is not available. This is normal during startup.');
                throw new Error('Docker worker service is temporarily unavailable. Please try again in a moment.');
            } else {
                console.error('❌ Failed to create Docker session:', error.message);
                this.emit('error', error);
                throw error;
            }
        }
    }
    
    async executeCode(sessionId, code, language) {
        if (!this.activeSessions.has(sessionId)) {
            throw new Error(`Session ${sessionId} not found`);
        }
        
        try {
            console.log(`🚀 Executing ${language} code in session ${sessionId}`);
            
            const response = await axios.post(`${this.workerUrl}/sessions/${sessionId}/execute`, {
                code,
                language
            }, {
                timeout: 15000 // Code execution timeout
            });
            
            if (response.data.success) {
                const result = response.data.result;
                console.log(`✅ Code execution completed for session ${sessionId}`);
                
                this.emit('codeExecuted', {
                    sessionId,
                    language,
                    code,
                    result
                });
                
                return result;
            } else {
                throw new Error(response.data.error || 'Code execution failed');
            }
        } catch (error) {
            console.error(`❌ Code execution failed for session ${sessionId}:`, error.message);
            
            const errorResult = {
                success: false,
                output: '',
                error: error.message,
                executionTime: 0,
                language
            };
            
            this.emit('executionError', {
                sessionId,
                language,
                code,
                error: errorResult
            });
            
            return errorResult;
        }
    }
    
    async terminateSession(sessionId) {
        if (!this.activeSessions.has(sessionId)) {
            console.warn(`⚠️ Attempted to terminate non-existent session: ${sessionId}`);
            return;
        }
        
        try {
            const response = await axios.delete(`${this.workerUrl}/sessions/${sessionId}`, {
                timeout: 10000
            });
            
            if (response.data.success) {
                this.activeSessions.delete(sessionId);
                console.log(`✅ Terminated Docker session: ${sessionId}`);
                this.emit('sessionTerminated', sessionId);
            } else {
                console.warn(`⚠️ Failed to terminate session ${sessionId}:`, response.data.error);
            }
        } catch (error) {
            console.error(`❌ Error terminating session ${sessionId}:`, error.message);
            // Still remove from local tracking
            this.activeSessions.delete(sessionId);
        }
    }
    
    async getSessionHealth(sessionId) {
        try {
            const response = await axios.get(`${this.workerUrl}/health`);
            return response.data;
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    getActiveSessions() {
        return Array.from(this.activeSessions.keys());
    }
    
    getSessionInfo(sessionId) {
        return this.activeSessions.get(sessionId) || null;
    }
    
    // Create WebSocket connection to worker for real-time terminal
    createTerminalWebSocket(sessionId) {
        try {
            const wsUrl = this.workerUrl.replace(/^https?/, 'ws');
            const ws = new WebSocket(wsUrl);
            
            ws.on('open', () => {
                console.log(`🔗 WebSocket connected to worker for session ${sessionId}`);
                this.emit('terminalConnected', sessionId);
            });
            
            ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data);
                    this.emit('terminalMessage', {
                        sessionId,
                        message
                    });
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                }
            });
            
            ws.on('error', (error) => {
                console.error(`❌ WebSocket error for session ${sessionId}:`, error);
                this.emit('terminalError', { sessionId, error });
            });
            
            ws.on('close', () => {
                console.log(`🔌 WebSocket disconnected for session ${sessionId}`);
                this.emit('terminalDisconnected', sessionId);
            });
            
            return ws;
        } catch (error) {
            console.error(`❌ Failed to create WebSocket for session ${sessionId}:`, error);
            this.emit('terminalError', { sessionId, error });
            return null;
        }
    }
    
    // Cleanup all sessions (called on server shutdown)
    async cleanup() {
        console.log(`🧹 Cleaning up ${this.activeSessions.size} active Docker sessions...`);
        
        const cleanupPromises = Array.from(this.activeSessions.keys()).map(
            sessionId => this.terminateSession(sessionId)
        );
        
        await Promise.allSettled(cleanupPromises);
        console.log('✅ Docker session cleanup completed');
    }
}

module.exports = DockerWorkerClient;