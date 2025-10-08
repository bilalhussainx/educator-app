const { pool } = require('./educators-edge-backend/db');

async function checkMarketData() {
  try {
    console.log('Checking market data availability...');
    
    // Check what dates we have data for
    const dateQuery = `
      SELECT DISTINCT date, COUNT(*) as symbol_count
      FROM market_data_daily 
      WHERE symbol = ANY($1)
      GROUP BY date 
      ORDER BY date DESC 
      LIMIT 10
    `;
    
    const symbols = ['AAPL', 'GOOGL', 'MSFT', 'NVDA', 'TSLA', 'AMZN', 'META', 'NFLX'];
    const dateResult = await pool.query(dateQuery, [symbols]);
    
    console.log('Recent market data dates:');
    dateResult.rows.forEach(row => {
      console.log(`${row.date}: ${row.symbol_count} symbols`);
    });
    
    // Check what symbols we have for 2020-01-01
    const symbolQuery = `
      SELECT symbol, close_price, volume
      FROM market_data_daily 
      WHERE date = '2020-01-01'
      AND symbol = ANY($1)
    `;
    
    const symbolResult = await pool.query(symbolQuery, [symbols]);
    
    console.log('\nMarket data for 2020-01-01:');
    if (symbolResult.rows.length === 0) {
      console.log('No data found for 2020-01-01');
    } else {
      symbolResult.rows.forEach(row => {
        console.log(`${row.symbol}: $${row.close_price} (Vol: ${row.volume})`);
      });
    }
    
  } catch (error) {
    console.error('Error checking market data:', error);
  } finally {
    await pool.end();
  }
}

checkMarketData();