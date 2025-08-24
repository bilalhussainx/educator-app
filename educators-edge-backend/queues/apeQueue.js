// queues/apeQueue.js
const { Queue } = require('bullmq');
require('dotenv').config();

// --- ADD THIS DEBUGGING BLOCK ---
console.log("--- BullMQ Queue Initializing ---");
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("Is REDIS_URL present?", !!process.env.REDIS_URL);
// Be careful not to log the full URL if it contains a password in sensitive logs,
// but for debugging this is okay.
console.log("REDIS_URL value:", process.env.REDIS_URL);
// --- END DEBUGGING BLOCK ---

const connectionOptions = process.env.REDIS_URL 
    ? { connection: { uri: process.env.REDIS_URL } } // Use the 'uri' property for direct URL connection
    : { connection: { host: '127.0.0.1', port: 6379 } };

const apeQueue = new Queue('analyze-submission', connectionOptions);

apeQueue.on('error', (err) => {
    console.error('BullMQ Queue Error:', err);
});

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