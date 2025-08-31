// services/processingService.js
// Service for handling background processing jobs

const { Queue } = require('bullmq');
const Redis = require('ioredis');

// Create Redis connection for job queue
const redisConnection = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
});

// Create job queue
const processingQueue = new Queue('recording-processing', {
    connection: redisConnection,
    defaultJobOptions: {
        removeOnComplete: 10, // Keep last 10 completed jobs
        removeOnFail: 5, // Keep last 5 failed jobs
    }
});

// Add a processing job to the queue
async function addProcessingJob(jobType, data) {
    try {
        const job = await processingQueue.add(jobType, data, {
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 30000, // Start with 30 seconds
            },
        });
        
        console.log(`[PROCESSING] Added ${jobType} job ${job.id} to queue`);
        return job;
    } catch (error) {
        console.error(`[PROCESSING] Error adding ${jobType} job:`, error);
        throw error;
    }
}

// Get queue status
async function getQueueStatus() {
    try {
        const [waiting, active, completed, failed] = await Promise.all([
            processingQueue.getWaiting(),
            processingQueue.getActive(),
            processingQueue.getCompleted(),
            processingQueue.getFailed()
        ]);

        return {
            waiting: waiting.length,
            active: active.length,
            completed: completed.length,
            failed: failed.length
        };
    } catch (error) {
        console.error('[PROCESSING] Error getting queue status:', error);
        return null;
    }
}

module.exports = {
    processingQueue,
    addProcessingJob,
    getQueueStatus,
    redisConnection
};