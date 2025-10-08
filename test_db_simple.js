// Simple test without SSL issues
const { Pool } = require('pg');
require('dotenv').config({ path: './educators-edge-backend/.env' });

async function testConnection() {
  console.log('Testing database connection...');
  console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });
  
  try {
    const client = await pool.connect();
    console.log('✅ Connection successful!');
    
    // Test if market_data_daily table exists
    try {
      const result = await client.query("SELECT COUNT(*) FROM market_data_daily LIMIT 1");
      console.log('✅ market_data_daily table exists');
      console.log(`Row count: ${result.rows[0].count}`);
    } catch (err) {
      console.log('❌ market_data_daily table does not exist:', err.message);
    }
    
    client.release();
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
    if (err.message.includes('does not support SSL')) {
      console.log('💡 Try connecting without SSL');
    }
    if (err.message.includes('timeout')) {
      console.log('💡 Database might be sleeping (Neon databases auto-pause)');
    }
  } finally {
    await pool.end();
  }
}

testConnection();