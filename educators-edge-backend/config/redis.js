// src/config/redis.js
const Redis = require('ioredis');

// It's crucial to use environment variables for your Redis connection string
// Get this from your Redis provider (e.g., Upstash)
let redisConnection;

try {
    redisConnection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
        maxRetriesPerRequest: null, // Recommended setting for BullMQ
        enableReadyCheck: false,
        lazyConnect: true
    });

    redisConnection.on('connect', () => {
        console.log('✅ Redis connected successfully');
    });

    redisConnection.on('error', (err) => {
        console.error('❌ Redis connection error:', err.message);
        // Fallback to local Redis if remote fails
        if (err.message.includes('ENOTFOUND') && process.env.REDIS_URL) {
            console.log('🔄 Falling back to local Redis...');
            redisConnection = new Redis('redis://localhost:6379', {
                maxRetriesPerRequest: null,
                enableReadyCheck: false,
                lazyConnect: true
            });
        }
    });
} catch (error) {
    console.error('❌ Failed to create Redis connection:', error);
    // Use local Redis as fallback
    redisConnection = new Redis('redis://localhost:6379', {
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        lazyConnect: true
    });
}

module.exports = redisConnection;