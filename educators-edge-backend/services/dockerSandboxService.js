// =================================================================
// FILE: services/dockerSandboxService.js
// =================================================================
// DESCRIPTION: Production-ready Docker-based code execution service
// Compatible with Render deployment and supports real-time terminal

const Docker = require('dockerode');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs').promises;
const path = require('path');
const { EventEmitter } = require('events');

class DockerSandboxService extends EventEmitter {
    constructor() {
        super();
        
        // For Render deployment, Docker daemon runs on the same host
        this.docker = new Docker({
            socketPath: '/var/run/docker.sock' // Standard Docker socket path
        });
        
        this.activeSessions = new Map();
        this.IMAGE_NAME = 'educators-edge-sandbox';
        this.TIMEOUT = 30000; // 30 seconds max execution time
        this.MEMORY_LIMIT = '128m'; // 128MB memory limit
        this.CPU_LIMIT = '0.5'; // 0.5 CPU cores
        
        this.ensureImageExists();
    }
    
    async ensureImageExists() {
        try {
            await this.docker.getImage(this.IMAGE_NAME).inspect();
            console.log(`✅ Docker image ${this.IMAGE_NAME} is available`);
        } catch (error) {
            console.log(`🔄 Building Docker image ${this.IMAGE_NAME}...`);
            await this.buildSandboxImage();
        }
    }
    
    async buildSandboxImage() {
        const dockerfile = `
FROM node:18-alpine

# Install additional runtimes
RUN apk add --no-cache \\
    python3 \\
    py3-pip \\
    openjdk17-jdk \\
    bash

# Create non-root user for security
RUN addgroup -g 1000 sandbox && \\
    adduser -u 1000 -G sandbox -s /bin/bash -D sandbox

# Set working directory
WORKDIR /app
RUN chown sandbox:sandbox /app

# Switch to non-root user
USER sandbox

# Install common Python packages
RUN pip3 install --user numpy pandas matplotlib

# Default command
CMD ["/bin/bash"]
        `;
        
        const buildContext = path.join(__dirname, '../docker-build-context');
        await fs.mkdir(buildContext, { recursive: true });
        await fs.writeFile(path.join(buildContext, 'Dockerfile'), dockerfile);
        
        const stream = await this.docker.buildImage({
            context: buildContext,
            src: ['Dockerfile']
        }, { t: this.IMAGE_NAME });
        
        await new Promise((resolve, reject) => {
            this.docker.modem.followProgress(stream, (err, res) => {
                if (err) reject(err);
                else resolve(res);
            });
        });
        
        console.log(`✅ Docker image ${this.IMAGE_NAME} built successfully`);
        
        // Cleanup build context
        await fs.rm(buildContext, { recursive: true, force: true });
    }
    
    async createSandboxSession(sessionId = null) {
        const id = sessionId || uuidv4();
        
        try {
            const container = await this.docker.createContainer({
                Image: this.IMAGE_NAME,
                Cmd: ['/bin/bash'],
                Tty: true,
                OpenStdin: true,
                StdinOnce: false,
                AttachStdin: true,
                AttachStdout: true,
                AttachStderr: true,
                WorkingDir: '/app',
                HostConfig: {
                    Memory: this.parseMemoryLimit(this.MEMORY_LIMIT),
                    CpuQuota: Math.floor(this.CPU_LIMIT * 100000),
                    CpuPeriod: 100000,
                    NetworkMode: 'none', // No network access for security
                    ReadonlyRootfs: false,
                    Tmpfs: {
                        '/tmp': 'rw,noexec,nosuid,size=50m'
                    }
                },
                Labels: {
                    'educators-edge.session': id,
                    'educators-edge.type': 'sandbox'
                }
            });
            
            await container.start();
            
            const stream = await container.attach({
                stream: true,
                stdin: true,
                stdout: true,
                stderr: true
            });
            
            const session = {
                id,
                container,
                stream,
                createdAt: new Date(),
                lastActivity: new Date()
            };
            
            this.activeSessions.set(id, session);
            this.setupSessionHandlers(session);
            
            // Auto-cleanup after timeout
            setTimeout(() => this.cleanupSession(id), this.TIMEOUT);
            
            console.log(`🚀 Sandbox session ${id} created`);
            return session;
            
        } catch (error) {
            console.error(`❌ Failed to create sandbox session:`, error);
            throw error;
        }
    }
    
    setupSessionHandlers(session) {
        const { id, stream } = session;
        
        stream.on('data', (data) => {
            session.lastActivity = new Date();
            this.emit('sessionOutput', id, data.toString());
        });
        
        stream.on('error', (error) => {
            console.error(`Session ${id} stream error:`, error);
            this.emit('sessionError', id, error);
            this.cleanupSession(id);
        });
        
        stream.on('end', () => {
            console.log(`Session ${id} stream ended`);
            this.cleanupSession(id);
        });
    }
    
    async executeCode(code, language, sessionId = null) {
        const session = sessionId ? 
            this.activeSessions.get(sessionId) : 
            await this.createSandboxSession();
        
        if (!session) {
            throw new Error('Invalid or expired session');
        }
        
        return new Promise((resolve, reject) => {
            const executionId = uuidv4();
            let output = '';
            let errorOutput = '';
            let isResolved = false;
            
            const timeout = setTimeout(() => {
                if (!isResolved) {
                    isResolved = true;
                    resolve({
                        success: false,
                        output: 'Execution timeout (30 seconds)',
                        executionTime: 30000
                    });
                }
            }, this.TIMEOUT);
            
            // Listen for output from this execution
            const outputHandler = (id, data) => {
                if (id === session.id) {
                    const text = data.toString();
                    if (text.includes('EXEC_COMPLETE_' + executionId)) {
                        if (!isResolved) {
                            isResolved = true;
                            clearTimeout(timeout);
                            this.removeListener('sessionOutput', outputHandler);
                            
                            const executionTime = Date.now() - startTime;
                            resolve({
                                success: errorOutput.length === 0,
                                output: output || 'Execution completed with no output',
                                error: errorOutput || null,
                                executionTime
                            });
                        }
                    } else {
                        output += text;
                        if (text.includes('Error') || text.includes('Exception')) {
                            errorOutput += text;
                        }
                    }
                }
            };
            
            this.on('sessionOutput', outputHandler);
            
            // Prepare execution command based on language
            const command = this.buildExecutionCommand(code, language, executionId);
            const startTime = Date.now();
            
            // Send command to container
            session.stream.write(command + '\n');
        });
    }
    
    buildExecutionCommand(code, language, executionId) {
        const filename = `exec_${executionId}`;
        let command;
        
        switch (language.toLowerCase()) {
            case 'javascript':
            case 'js':
                command = `cat > ${filename}.js << 'EOF'\n${code}\nEOF\nnode ${filename}.js; echo "EXEC_COMPLETE_${executionId}"; rm -f ${filename}.js`;
                break;
                
            case 'python':
            case 'py':
                command = `cat > ${filename}.py << 'EOF'\n${code}\nEOF\npython3 ${filename}.py; echo "EXEC_COMPLETE_${executionId}"; rm -f ${filename}.py`;
                break;
                
            case 'java':
                // Java needs special handling for class names
                const className = this.extractJavaClassName(code) || 'Main';
                command = `cat > ${className}.java << 'EOF'\n${code}\nEOF\njavac ${className}.java && java ${className}; echo "EXEC_COMPLETE_${executionId}"; rm -f ${className}.java ${className}.class`;
                break;
                
            case 'bash':
            case 'shell':
                command = `cat > ${filename}.sh << 'EOF'\n${code}\nEOF\nbash ${filename}.sh; echo "EXEC_COMPLETE_${executionId}"; rm -f ${filename}.sh`;
                break;
                
            default:
                throw new Error(`Unsupported language: ${language}`);
        }
        
        return command;
    }
    
    extractJavaClassName(code) {
        const classMatch = code.match(/public\s+class\s+(\w+)/);
        return classMatch ? classMatch[1] : null;
    }
    
    async sendInput(sessionId, input) {
        const session = this.activeSessions.get(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }
        
        session.lastActivity = new Date();
        session.stream.write(input + '\n');
    }
    
    async getSessionStatus(sessionId) {
        const session = this.activeSessions.get(sessionId);
        if (!session) {
            return null;
        }
        
        const containerInfo = await session.container.inspect();
        return {
            id: sessionId,
            status: containerInfo.State.Status,
            createdAt: session.createdAt,
            lastActivity: session.lastActivity,
            uptime: Date.now() - session.createdAt.getTime()
        };
    }
    
    async cleanupSession(sessionId) {
        const session = this.activeSessions.get(sessionId);
        if (!session) return;
        
        try {
            await session.container.stop();
            await session.container.remove();
            session.stream.destroy();
            this.activeSessions.delete(sessionId);
            console.log(`🧹 Cleaned up sandbox session ${sessionId}`);
        } catch (error) {
            console.error(`Error cleaning up session ${sessionId}:`, error);
        }
    }
    
    async cleanupAllSessions() {
        const cleanupPromises = Array.from(this.activeSessions.keys()).map(
            sessionId => this.cleanupSession(sessionId)
        );
        await Promise.all(cleanupPromises);
    }
    
    parseMemoryLimit(limit) {
        const match = limit.match(/^(\d+)([kmg]?)$/i);
        if (!match) return 134217728; // 128MB default
        
        const value = parseInt(match[1]);
        const unit = match[2].toLowerCase();
        
        switch (unit) {
            case 'k': return value * 1024;
            case 'm': return value * 1024 * 1024;
            case 'g': return value * 1024 * 1024 * 1024;
            default: return value;
        }
    }
    
    // Health check method
    async healthCheck() {
        try {
            const info = await this.docker.info();
            return {
                status: 'healthy',
                dockerVersion: info.ServerVersion,
                activeSessions: this.activeSessions.size,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }
}

// Export singleton instance
const sandboxService = new DockerSandboxService();

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('🛑 Shutting down sandbox service...');
    await sandboxService.cleanupAllSessions();
    process.exit(0);
});

module.exports = sandboxService;