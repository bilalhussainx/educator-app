// src/queues/apeQueue.js
const { Queue } = require('bullmq');
const redisConnection = require('../config/redis');

const APE_QUEUE_NAME = 'ape-analysis-queue';

// A queue is where we add jobs
const apeQueue = new Queue(APE_QUEUE_NAME, { connection: redisConnection });

module.exports = apeQueue;