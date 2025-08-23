// src/config/redis.js
const Redis = require('ioredis');

// It's crucial to use environment variables for your Redis connection string
// Get this from your Redis provider (e.g., Upstash)
const redisConnection = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null // Recommended setting for BullMQ
});

module.exports = redisConnection;