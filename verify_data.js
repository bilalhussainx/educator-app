require('dotenv').config({ path: './educators-edge-backend/.env' });
const { pool } = require('./educators-edge-backend/db');

async function verifyData() {
  try {
    const result = await pool.query(`
      SELECT 
        symbol, 
        COUNT(*) as records,
        MIN(DATE(timestamp)) as earliest,
        MAX(DATE(timestamp)) as latest
      FROM market_data 
      WHERE timeframe = 'daily'
      GROUP BY symbol 
      ORDER BY symbol
    `);
    
    console.log('\n📊 Population Results:');
    result.rows.forEach(row => {
      console.log(`  ${row.symbol}: ${row.records} records (${row.earliest} to ${row.latest})`);
    });
    
    const totalResult = await pool.query('SELECT COUNT(*) as total FROM market_data');
    console.log(`\n✨ Total records: ${totalResult.rows[0].total}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

verifyData();