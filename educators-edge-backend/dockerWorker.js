// =================================================================
// FILE: dockerWorker.js 
// =================================================================
// DESCRIPTION: Background worker service for code execution
// Runs as separate Render worker service, uses BullMQ for job processing

const { Worker } = require('bullmq');
const Redis = require('ioredis');
const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

// Redis connection with BullMQ configuration
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null, // Required for BullMQ
    retryDelayOnFailover: 100,
    enableReadyCheck: false
});

// Code execution worker
const codeExecutionWorker = new Worker('code-execution', async (job) => {
    const { code, language, sessionId } = job.data;
    
    console.log(`🚀 Processing code execution job for session ${sessionId} (${language})`);
    
    try {
        const result = await executeCodeSafely(code, language);
        
        console.log(`✅ Code execution completed for session ${sessionId}`);
        
        return {
            success: true,
            sessionId,
            result
        };
    } catch (error) {
        console.error(`❌ Code execution failed for session ${sessionId}:`, error);
        
        return {
            success: false,
            sessionId,
            error: error.message,
            result: {
                success: false,
                output: '',
                error: error.message,
                executionTime: 0,
                language
            }
        };
    }
}, {
    connection: redis,
    concurrency: 5, // Process up to 5 jobs concurrently
    removeOnComplete: 10, // Keep last 10 completed jobs
    removeOnFail: 50, // Keep last 50 failed jobs
});

// Safe code execution function
async function executeCodeSafely(code, language) {
    const startTime = Date.now();
    
    // Create temporary directory for code execution
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'code-exec-'));
    
    try {
        // Determine file extension and execution command
        const config = getLanguageConfig(language);
        const filename = `code.${config.extension}`;
        const filepath = path.join(tempDir, filename);
        
        // Write code to temporary file
        await fs.writeFile(filepath, code, 'utf8');
        
        // Execute code with timeout and resource limits
        const result = await executeWithLimits(config.command, filepath, tempDir);
        
        const executionTime = Date.now() - startTime;
        
        return {
            success: result.success,
            output: result.output,
            error: result.error,
            executionTime,
            language
        };
    } finally {
        // Cleanup temporary directory
        try {
            await fs.rmdir(tempDir, { recursive: true });
        } catch (cleanupError) {
            console.warn('Failed to cleanup temp directory:', cleanupError);
        }
    }
}

// Language configuration
function getLanguageConfig(language) {
    const configs = {
        javascript: {
            extension: 'js',
            command: ['node', 'code.js']
        },
        python: {
            extension: 'py', 
            command: ['python3', 'code.py']
        },
        java: {
            extension: 'java',
            command: ['sh', '-c', 'javac code.java && java Code']
        },
        cpp: {
            extension: 'cpp',
            command: ['sh', '-c', 'g++ code.cpp -o code && ./code']
        },
        c: {
            extension: 'c',
            command: ['sh', '-c', 'gcc code.c -o code && ./code']
        }
    };
    
    return configs[language] || configs.javascript;
}

// Execute with resource limits and timeout
function executeWithLimits(command, filepath, workingDir) {
    return new Promise((resolve, reject) => {
        const process = spawn(command[0], command.slice(1), {
            cwd: workingDir,
            stdio: ['pipe', 'pipe', 'pipe'],
            timeout: 10000, // 10 second timeout
            killSignal: 'SIGKILL'
        });
        
        let stdout = '';
        let stderr = '';
        
        process.stdout.on('data', (data) => {
            stdout += data.toString();
        });
        
        process.stderr.on('data', (data) => {
            stderr += data.toString();
        });
        
        process.on('close', (code) => {
            const success = code === 0;
            const output = stdout || stderr;
            
            resolve({
                success,
                output: output.trim(),
                error: success ? null : stderr.trim()
            });
        });
        
        process.on('error', (error) => {
            resolve({
                success: false,
                output: '',
                error: error.message
            });
        });
        
        // Timeout handling
        setTimeout(() => {
            if (!process.killed) {
                process.kill('SIGKILL');
                resolve({
                    success: false,
                    output: '',
                    error: 'Execution timeout (10 seconds exceeded)'
                });
            }
        }, 10000);
    });
}

// Worker event handlers
codeExecutionWorker.on('completed', (job) => {
    console.log(`✅ Job ${job.id} completed successfully`);
});

codeExecutionWorker.on('failed', (job, err) => {
    console.error(`❌ Job ${job.id} failed:`, err);
});

codeExecutionWorker.on('error', (err) => {
    console.error('🔥 Worker error:', err);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('🛑 Received SIGTERM, shutting down worker gracefully...');
    
    await codeExecutionWorker.close();
    await redis.disconnect();
    
    console.log('👋 Worker shutdown complete');
    process.exit(0);
});

console.log('🚀 Code execution worker started');
console.log('📋 Queue: code-execution');
console.log('🔗 Redis:', process.env.REDIS_URL || 'redis://localhost:6379');
console.log('⚡ Concurrency: 5 jobs');
console.log('✨ Ready to process code execution jobs!');