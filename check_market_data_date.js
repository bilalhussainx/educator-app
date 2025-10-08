const { pool } = require('./educators-edge-backend/db');

async function checkSpecificDate() {
  try {
    console.log('Checking market data for 2007-10-09...');
    
    const symbols = ['AAPL', 'GOOGL', 'MSFT', 'NVDA', 'TSLA', 'AMZN', 'META', 'NFLX'];
    
    const result = await pool.query(`
      SELECT symbol, close_price, volume, date
      FROM market_data_daily 
      WHERE date = $1 
      AND symbol = ANY($2)
      ORDER BY symbol
    `, ['2007-10-09', symbols]);
    
    if (result.rows.length === 0) {
      console.log('❌ No market data found for 2007-10-09');
      
      // Check what dates we DO have around that time
      console.log('\nChecking nearby dates...');
      const nearbyResult = await pool.query(`
        SELECT DISTINCT date, COUNT(*) as symbol_count
        FROM market_data_daily 
        WHERE date BETWEEN '2007-10-01' AND '2007-10-15'
        AND symbol = ANY($1)
        GROUP BY date 
        ORDER BY date
      `, [symbols]);
      
      if (nearbyResult.rows.length > 0) {
        console.log('Available dates in October 2007:');
        nearbyResult.rows.forEach(row => {
          console.log(`  ${row.date}: ${row.symbol_count} symbols`);
        });
      } else {
        console.log('❌ No market data found for October 2007 at all');
        
        // Check what date ranges we have
        const rangeResult = await pool.query(`
          SELECT MIN(date) as earliest, MAX(date) as latest, COUNT(DISTINCT date) as total_days
          FROM market_data_daily 
          WHERE symbol = ANY($1)
        `, [symbols]);
        
        if (rangeResult.rows[0].earliest) {
          console.log(`\nMarket data available from ${rangeResult.rows[0].earliest} to ${rangeResult.rows[0].latest}`);
          console.log(`Total days with data: ${rangeResult.rows[0].total_days}`);
        }
      }
    } else {
      console.log(`✅ Found market data for ${result.rows.length} symbols on 2007-10-09:`);
      result.rows.forEach(row => {
        console.log(`  ${row.symbol}: $${parseFloat(row.close_price).toFixed(2)}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkSpecificDate();