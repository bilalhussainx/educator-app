// queues/apeQueue.js
const { Queue } = require('bullmq');
const Redis = require('ioredis');
require('dotenv').config();

console.log("--- BullMQ Queue Initializing ---");

if (!process.env.REDIS_URL) {
    console.error("FATAL ERROR: REDIS_URL is not defined in the environment.");
    process.exit(1);
}

// 1. Create an explicit Redis client instance from the URL.
const redisClient = new Redis(process.env.REDIS_URL, {
    // Recommended options for production environments like Render
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
});

redisClient.on('connect', () => console.log('Redis client for Queue connected.'));
redisClient.on('error', (err) => console.error('Redis client for Queue Error:', err));

// 2. Pass the created client directly to BullMQ.
//    This removes all guesswork.
const apeQueue = new Queue('analyze-submission', {
    connection: redisClient,
    // Some versions of BullMQ might use `client` instead of `connection` for external clients.
    // Providing both is the safest way to ensure compatibility.
    client: redisClient 
});

apeQueue.on('ready', () => {
    console.log('BullMQ Queue is connected and ready.');
});

apeQueue.on('error', (err) => {
    console.error('BullMQ Queue Error:', err.message);
});

module.exports = apeQueue;

// module.exports = apeQueue;```

// **B. Update `apeWorker.js` (for the Background Worker)**

// ```javascript
// const { Worker } = require('bullmq');
// require('dotenv').config();

// console.log("--- BullMQ Worker Initializing ---");
// console.log("NODE_ENV:", process.env.NODE_ENV);
// console.log("Is REDIS_URL present?", !!process.env.REDIS_URL);
// console.log("REDIS_URL value:", process.env.REDIS_URL);


// const connectionOptions = process.env.REDIS_URL 
//     ? { connection: { uri: process.env.REDIS_URL } } 
//     : { connection: { host: '127.0.0.1', port: 6379 } };

// const worker = new Worker('analyze-submission', async job => {
//     // ... your job logic
// }, connectionOptions);

// worker.on('error', (err) => {
//     console.error('BullMQ Worker Error:', err);
// });

// console.log("BullMQ Worker started and waiting for jobs.");
// // // src/queues/apeQueue.js
// // const { Queue } = require('bullmq');
// // const redisConnection = require('../config/redis');

// // const APE_QUEUE_NAME = 'ape-analysis-queue';

// // // A queue is where we add jobs
// // const apeQueue = new Queue(APE_QUEUE_NAME, { connection: redisConnection });

// // module.exports = apeQueue;