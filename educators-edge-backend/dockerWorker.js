// =================================================================
// FILE: dockerWorker.js 
// =================================================================
// DESCRIPTION: Background worker service for Docker container execution
// Runs as separate Render service, communicates with main app via Redis/HTTP

const express = require('express');
const cors = require('cors');
const Docker = require('dockerode');
const { WebSocketServer } = require('ws');
const http = require('http');

const app = express();
const PORT = process.env.PORT || 10001; // Different port from main app

// Middleware
app.use(cors());
app.use(express.json());

// Docker setup
const docker = new Docker({
    socketPath: '/var/run/docker.sock'
});

// Active sessions storage
const activeSessions = new Map();
const IMAGE_NAME = 'educators-edge-sandbox';

// HTTP server for WebSocket
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Session management
class DockerSession {
    constructor(sessionId) {
        this.sessionId = sessionId;
        this.container = null;
        this.websocket = null;
        this.createdAt = new Date();
        this.status = 'initializing';
    }

    async initialize() {
        try {
            // Create container
            this.container = await docker.createContainer({
                Image: IMAGE_NAME,
                Cmd: ['/bin/sh'],
                Tty: true,
                OpenStdin: true,
                StdinOnce: false,
                AttachStdin: true,
                AttachStdout: true,
                AttachStderr: true,
                WorkingDir: '/workspace',
                HostConfig: {
                    Memory: 128 * 1024 * 1024, // 128MB limit
                    CpuQuota: 50000, // 0.5 CPU cores
                    NetworkMode: 'none', // No network access
                    ReadonlyRootfs: false,
                    Tmpfs: {
                        '/tmp': 'rw,noexec,nosuid,size=10m'
                    }
                }
            });

            await this.container.start();
            this.status = 'running';
            console.log(`[DockerWorker] Session ${this.sessionId} initialized successfully`);
            
            return true;
        } catch (error) {
            console.error(`[DockerWorker] Failed to initialize session ${this.sessionId}:`, error);
            this.status = 'error';
            return false;
        }
    }

    async executeCode(code, language) {
        if (!this.container || this.status !== 'running') {
            throw new Error('Container not ready');
        }

        try {
            // Create code file based on language
            const fileExtensions = {
                javascript: 'js',
                python: 'py', 
                java: 'java',
                cpp: 'cpp',
                c: 'c'
            };

            const ext = fileExtensions[language] || 'txt';
            const fileName = `code.${ext}`;
            
            // Write code to container
            const writeExec = await this.container.exec({
                Cmd: ['sh', '-c', `echo '${code.replace(/'/g, "'\''")})' > /workspace/${fileName}`],
                AttachStdout: true,
                AttachStderr: true
            });

            await writeExec.start();

            // Execute code based on language
            let runCommand;
            switch (language) {
                case 'javascript':
                    runCommand = `cd /workspace && node ${fileName}`;
                    break;
                case 'python':
                    runCommand = `cd /workspace && python3 ${fileName}`;
                    break;
                case 'java':
                    const className = 'Code';
                    runCommand = `cd /workspace && javac ${fileName} && java ${className}`;
                    break;
                case 'cpp':
                    runCommand = `cd /workspace && g++ ${fileName} -o code && ./code`;
                    break;
                case 'c':
                    runCommand = `cd /workspace && gcc ${fileName} -o code && ./code`;
                    break;
                default:
                    runCommand = `cd /workspace && cat ${fileName}`;
            }

            // Execute the command
            const exec = await this.container.exec({
                Cmd: ['sh', '-c', runCommand],
                AttachStdout: true,
                AttachStderr: true
            });

            const stream = await exec.start();
            
            return new Promise((resolve, reject) => {
                let output = '';
                let errorOutput = '';
                
                stream.on('data', (chunk) => {
                    const data = chunk.toString();
                    if (chunk[0] === 1) { // stdout
                        output += data.slice(8);
                    } else if (chunk[0] === 2) { // stderr  
                        errorOutput += data.slice(8);
                    }
                });

                stream.on('end', async () => {
                    try {
                        const inspect = await exec.inspect();
                        const success = inspect.ExitCode === 0;
                        
                        resolve({
                            success,
                            output: output || errorOutput,
                            error: success ? null : errorOutput,
                            executionTime: Date.now() - Date.now(), // Simplified
                            language
                        });
                    } catch (err) {
                        reject(err);
                    }
                });

                stream.on('error', reject);
                
                // Timeout after 10 seconds
                setTimeout(() => {
                    reject(new Error('Execution timeout'));
                }, 10000);
            });

        } catch (error) {
            throw new Error(`Execution failed: ${error.message}`);
        }
    }

    async terminate() {
        try {
            if (this.container) {
                await this.container.kill();
                await this.container.remove();
                this.container = null;
            }
            this.status = 'terminated';
            console.log(`[DockerWorker] Session ${this.sessionId} terminated`);
        } catch (error) {
            console.error(`[DockerWorker] Error terminating session ${this.sessionId}:`, error);
        }
    }
}

// API Routes
app.get('/health', async (req, res) => {
    try {
        // Check Docker daemon
        const info = await docker.info();
        
        res.json({
            success: true,
            health: {
                dockerRunning: true,
                activeSessions: activeSessions.size,
                uptime: process.uptime(),
                dockerInfo: {
                    containers: info.Containers,
                    images: info.Images
                }
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            health: {
                dockerRunning: false,
                activeSessions: activeSessions.size,
                uptime: process.uptime()
            }
        });
    }
});

app.post('/sessions', async (req, res) => {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
        const session = new DockerSession(sessionId);
        const initialized = await session.initialize();
        
        if (initialized) {
            activeSessions.set(sessionId, session);
            res.json({
                success: true,
                sessionId,
                status: session.status
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Failed to initialize session'
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.post('/sessions/:sessionId/execute', async (req, res) => {
    const { sessionId } = req.params;
    const { code, language } = req.body;
    
    const session = activeSessions.get(sessionId);
    if (!session) {
        return res.status(404).json({
            success: false,
            error: 'Session not found'
        });
    }

    try {
        const result = await session.executeCode(code, language);
        res.json({
            success: true,
            result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.delete('/sessions/:sessionId', async (req, res) => {
    const { sessionId } = req.params;
    
    const session = activeSessions.get(sessionId);
    if (!session) {
        return res.status(404).json({
            success: false,
            error: 'Session not found'
        });
    }

    try {
        await session.terminate();
        activeSessions.delete(sessionId);
        res.json({
            success: true,
            message: 'Session terminated'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// WebSocket for real-time terminal communication
wss.on('connection', (ws, req) => {
    console.log('[DockerWorker] WebSocket connection established');
    
    ws.on('message', async (data) => {
        try {
            const message = JSON.parse(data);
            
            switch (message.type) {
                case 'TERMINAL_INPUT':
                    const { sessionId, input } = message;
                    const session = activeSessions.get(sessionId);
                    
                    if (session && session.container) {
                        // Send input to container (simplified for this example)
                        ws.send(JSON.stringify({
                            type: 'TERMINAL_OUTPUT',
                            sessionId,
                            output: `$ ${input}\n`
                        }));
                    }
                    break;
                    
                default:
                    console.log('[DockerWorker] Unknown message type:', message.type);
            }
        } catch (error) {
            console.error('[DockerWorker] WebSocket error:', error);
        }
    });
    
    ws.on('close', () => {
        console.log('[DockerWorker] WebSocket connection closed');
    });
});

// Cleanup on exit
process.on('SIGTERM', async () => {
    console.log('[DockerWorker] Received SIGTERM, cleaning up...');
    
    // Terminate all active sessions
    for (const [sessionId, session] of activeSessions.entries()) {
        await session.terminate();
    }
    
    process.exit(0);
});

// Ensure Docker image exists
async function ensureDockerImage() {
    try {
        await docker.getImage(IMAGE_NAME).inspect();
        console.log(`[DockerWorker] Docker image ${IMAGE_NAME} found`);
    } catch (error) {
        console.log(`[DockerWorker] Building Docker image ${IMAGE_NAME}...`);
        
        // Build sandbox image
        const buildContext = `
FROM node:18-alpine
RUN apk add --no-cache python3 py3-pip openjdk17-jdk gcc g++ musl-dev
RUN mkdir -p /workspace
WORKDIR /workspace
CMD ["/bin/sh"]
`;
        
        const stream = await docker.buildImage(
            Buffer.from(buildContext),
            { t: IMAGE_NAME }
        );
        
        // Wait for build to complete
        await new Promise((resolve, reject) => {
            docker.modem.followProgress(stream, (err, res) => {
                if (err) reject(err);
                else resolve(res);
            });
        });
        
        console.log(`[DockerWorker] Docker image ${IMAGE_NAME} built successfully`);
    }
}

// Start server
async function start() {
    try {
        await ensureDockerImage();
        
        server.listen(PORT, '0.0.0.0', () => {
            console.log(`[DockerWorker] Worker service running on port ${PORT}`);
            console.log(`[DockerWorker] Health check: http://localhost:${PORT}/health`);
            console.log(`[DockerWorker] WebSocket server ready`);
        });
    } catch (error) {
        console.error('[DockerWorker] Failed to start:', error);
        process.exit(1);
    }
}

start();