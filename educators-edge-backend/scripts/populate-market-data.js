const alphaVantageService = require('../services/alphaVantageService');
const { pool } = require('../db');

async function populateMarketData() {
  const symbols = ['AAPL', 'GOOGL', 'MSFT', 'NVDA', 'TSLA', 'AMZN', 'META', 'NFLX'];
  
  try {
    console.log('Generating sample data for all symbols...');
    
    for (const symbol of symbols) {
      console.log(`Processing ${symbol}...`);
      const data = alphaVantageService.generateSampleHistoricalData(symbol);
      
      let insertedCount = 0;
      
      // Insert into market_data_daily table
      for (const point of data) {
        try {
          const query = `
            INSERT INTO market_data_daily (
              symbol, date, open_price, high_price, low_price, close_price, 
              adjusted_close_price, volume, dividend_amount, split_coefficient
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT (symbol, date) DO NOTHING
          `;
          
          await pool.query(query, [
            point.symbol, point.date, point.open_price, point.high_price,
            point.low_price, point.close_price, point.adjusted_close_price,
            point.volume, point.dividend_amount, point.split_coefficient
          ]);
          
          insertedCount++;
          
        } catch (insertError) {
          console.error(`Error inserting data point for ${symbol} on ${point.date}:`, insertError.message);
        }
      }
      
      console.log(`✅ Populated ${insertedCount} records for ${symbol}`);
    }
    
    // Check final count
    const result = await pool.query('SELECT COUNT(*) as count FROM market_data_daily');
    console.log(`✅ Total market data records: ${result.rows[0].count}`);
    
    // Show date range
    const rangeResult = await pool.query('SELECT MIN(date) as min_date, MAX(date) as max_date FROM market_data_daily');
    console.log(`✅ Date range: ${rangeResult.rows[0].min_date} to ${rangeResult.rows[0].max_date}`);
    
  } catch (error) {
    console.error('Error:', error);
  }
  
  process.exit(0);
}

populateMarketData();