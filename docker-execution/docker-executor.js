/**
 * =================================================================
 * DOCKER-BASED CODE EXECUTION SERVICE
 * =================================================================
 * Secure, isolated code execution using Docker containers
 * Supports JavaScript, Python, Java with proper resource limits
 */

const Docker = require('dockerode');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs').promises;
const path = require('path');

class DockerExecutor {
    constructor() {
        this.docker = new Docker();
        this.imageName = 'leetcode-executor';
        this.tempDir = path.join(__dirname, 'temp');
        this.ensureTempDir();
    }

    async ensureTempDir() {
        try {
            await fs.mkdir(this.tempDir, { recursive: true });
        } catch (error) {
            console.error('Failed to create temp directory:', error);
        }
    }

    /**
     * Execute code securely in Docker container
     */
    async executeCode(code, testCases, language, problemMeta = {}) {
        const sessionId = uuidv4();
        let container = null;

        try {
            console.log(`🐳 Starting Docker execution for ${language}`);

            // Create container with security settings
            container = await this.docker.createContainer({
                Image: this.imageName,
                Cmd: ['node', '/app/executor.js'],
                Env: [
                    `LANGUAGE=${language}`,
                    `SESSION_ID=${sessionId}`
                ],
                WorkingDir: '/app',
                NetworkMode: 'none', // No network access
                Memory: 128 * 1024 * 1024, // 128MB RAM limit
                NanoCPUs: 0.5 * 1000000000, // 0.5 CPU limit
                AttachStdout: true,
                AttachStderr: true,
                User: 'leetcode:leetcode', // Non-root user
                SecurityOpt: [
                    'no-new-privileges',
                    'apparmor=docker-default'
                ],
                ReadonlyRootfs: true, // Read-only filesystem
                Tmpfs: {
                    '/tmp': 'size=10M,uid=1000,gid=1000', // Writable temp with limits
                    '/app/temp': 'size=10M,uid=1000,gid=1000'
                }
            });

            // Send code and test cases to container
            const executionData = {
                code,
                testCases,
                language,
                problemMeta,
                sessionId
            };

            const dataBuffer = Buffer.from(JSON.stringify(executionData));
            await container.putArchive(dataBuffer, { path: '/app/temp/input.json' });

            // Start container with timeout
            await container.start();

            // Wait for execution with timeout (10 seconds)
            const result = await Promise.race([
                this.waitForResult(container),
                this.timeoutPromise(10000)
            ]);

            return result;

        } catch (error) {
            console.error('Docker execution failed:', error);
            return {
                success: false,
                error: error.message,
                details: 'Container execution failed'
            };
        } finally {
            // Always cleanup container
            if (container) {
                try {
                    await container.remove({ force: true });
                } catch (cleanupError) {
                    console.warn('Container cleanup failed:', cleanupError.message);
                }
            }
        }
    }

    async waitForResult(container) {
        const stream = await container.attach({
            stdout: true,
            stderr: true,
            logs: true
        });

        return new Promise((resolve, reject) => {
            let output = '';
            let errorOutput = '';

            stream.on('data', (chunk) => {
                const data = chunk.toString();
                if (chunk[0] === 1) { // stdout
                    output += data.slice(8); // Remove Docker stream header
                } else if (chunk[0] === 2) { // stderr
                    errorOutput += data.slice(8);
                }
            });

            stream.on('end', () => {
                try {
                    if (errorOutput) {
                        reject(new Error(errorOutput));
                    } else {
                        const result = JSON.parse(output);
                        resolve(result);
                    }
                } catch (parseError) {
                    reject(new Error(`Failed to parse result: ${output}`));
                }
            });

            stream.on('error', reject);
        });
    }

    timeoutPromise(ms) {
        return new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Execution timeout')), ms);
        });
    }

    /**
     * Build the Docker image (run once during deployment)
     */
    async buildImage() {
        console.log('🔨 Building Docker image for code execution...');

        const buildContext = await this.createBuildContext();

        const stream = await this.docker.buildImage(buildContext, {
            t: this.imageName,
            dockerfile: 'Dockerfile.leetcode'
        });

        return new Promise((resolve, reject) => {
            this.docker.modem.followProgress(stream, (err, res) => {
                if (err) reject(err);
                else {
                    console.log('✅ Docker image built successfully');
                    resolve(res);
                }
            }, (event) => {
                if (event.stream) {
                    console.log(event.stream.trim());
                }
            });
        });
    }

    async createBuildContext() {
        // Create tar archive with Dockerfile and execution scripts
        const tar = require('tar');
        const buildContextPath = path.join(__dirname, 'build-context.tar');

        await tar.create(
            {
                file: buildContextPath,
                cwd: __dirname
            },
            [
                'Dockerfile.leetcode',
                'container-executor.js',
                'container-scripts/'
            ]
        );

        return fs.createReadStream(buildContextPath);
    }

    /**
     * Health check for Docker service
     */
    async healthCheck() {
        try {
            const info = await this.docker.info();
            return {
                status: 'healthy',
                containers: info.Containers,
                images: info.Images,
                version: info.ServerVersion
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message
            };
        }
    }
}

module.exports = DockerExecutor;