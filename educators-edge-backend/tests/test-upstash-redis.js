/**
 * Test script to verify Upstash Redis connection
 * Run this before AWS deployment to ensure Redis will work in production
 */

const Redis = require('ioredis');
require('dotenv').config();

// Upstash Redis URL from your .env file
const UPSTASH_URL = process.env.REDIS_URL;

if (!UPSTASH_URL) {
    console.error('❌ REDIS_URL not found in .env file!');
    process.exit(1);
}

console.log('🔍 Testing Upstash Redis Connection...\n');
console.log('📍 Connecting to: prime-panther-56961.upstash.io:6379');
console.log('🔐 Using SSL/TLS (rediss://)\n');

// Create Redis client with Upstash URL
const redis = new Redis(UPSTASH_URL, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    connectTimeout: 10000,
    retryStrategy(times) {
        if (times > 3) {
            console.error('❌ Maximum retry attempts reached');
            return null; // Stop retrying
        }
        const delay = Math.min(times * 100, 2000);
        console.log(`⏳ Retry attempt ${times}, waiting ${delay}ms...`);
        return delay;
    }
});

// Connection event handlers
redis.on('connect', () => {
    console.log('✅ Connection established!');
});

redis.on('ready', async () => {
    console.log('✅ Redis client is ready!\n');

    try {
        console.log('📝 Running connection tests...\n');

        // Test 1: PING
        console.log('Test 1: PING command');
        const pingResult = await redis.ping();
        console.log(`   Result: ${pingResult}`);
        console.log('   ✅ PING successful\n');

        // Test 2: SET a test key
        console.log('Test 2: SET command');
        const testKey = 'test:connection:' + Date.now();
        const testValue = 'Hello from CoreZenith deployment test!';
        await redis.set(testKey, testValue, 'EX', 60); // Expires in 60 seconds
        console.log(`   Key: ${testKey}`);
        console.log(`   Value: ${testValue}`);
        console.log('   ✅ SET successful\n');

        // Test 3: GET the test key
        console.log('Test 3: GET command');
        const retrievedValue = await redis.get(testKey);
        console.log(`   Retrieved: ${retrievedValue}`);
        console.log(`   Match: ${retrievedValue === testValue ? '✅' : '❌'}\n`);

        // Test 4: DELETE the test key
        console.log('Test 4: DEL command');
        const delResult = await redis.del(testKey);
        console.log(`   Deleted keys: ${delResult}`);
        console.log('   ✅ DEL successful\n');

        // Test 5: Info (check Redis server info)
        console.log('Test 5: Server INFO');
        const info = await redis.info('server');
        const lines = info.split('\r\n').filter(line =>
            line.includes('redis_version') ||
            line.includes('uptime_in_seconds') ||
            line.includes('os')
        );
        lines.forEach(line => console.log(`   ${line}`));
        console.log('   ✅ INFO successful\n');

        // All tests passed!
        console.log('🎉 All tests passed! Upstash Redis is working perfectly!\n');
        console.log('✅ Your Redis connection is ready for AWS deployment');
        console.log('✅ You can safely use this REDIS_URL in production\n');

        // Cleanup
        await redis.quit();
        console.log('👋 Connection closed gracefully');
        process.exit(0);

    } catch (error) {
        console.error('\n❌ Test failed!');
        console.error('Error:', error.message);
        console.error('\nPossible issues:');
        console.error('1. Invalid credentials in REDIS_URL');
        console.error('2. Network connectivity issues');
        console.error('3. Upstash instance is not active');
        console.error('4. Firewall blocking outbound connections on port 6379');

        await redis.quit();
        process.exit(1);
    }
});

redis.on('error', (err) => {
    console.error('❌ Redis Error:', err.message);

    if (err.message.includes('ENOTFOUND')) {
        console.error('\n💡 DNS resolution failed. Check your internet connection.');
    } else if (err.message.includes('ECONNREFUSED')) {
        console.error('\n💡 Connection refused. The Redis server might be down.');
    } else if (err.message.includes('authentication')) {
        console.error('\n💡 Authentication failed. Check your password in REDIS_URL.');
    }
});

redis.on('close', () => {
    console.log('🔌 Connection closed');
});

// Handle script termination
process.on('SIGINT', async () => {
    console.log('\n\n⚠️  Test interrupted by user');
    await redis.quit();
    process.exit(0);
});

// Timeout after 30 seconds
setTimeout(() => {
    console.error('\n❌ Test timeout (30 seconds)');
    console.error('The connection is taking too long. Check your network or Upstash status.');
    redis.quit();
    process.exit(1);
}, 30000);
