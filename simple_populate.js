/**
 * Simple market data population script
 * Generates realistic sample data for all historical periods
 */

// Load environment variables from the backend directory
require('dotenv').config({ path: './educators-edge-backend/.env' });

const { pool } = require('./educators-edge-backend/db');

const SYMBOLS = ['AAPL', 'GOOGL', 'MSFT', 'NVDA', 'TSLA', 'AMZN', 'META', 'NFLX'];

// Historical periods with realistic base prices
const HISTORICAL_PERIODS = [
  { 
    id: 'great-depression', 
    name: 'Great Depression',
    startDate: '1929-10-24', 
    endDate: '1932-07-08',
    basePrices: { 'AAPL': 5, 'GOOGL': 8, 'MSFT': 3, 'NVDA': 2, 'TSLA': 4, 'AMZN': 6, 'META': 7, 'NFLX': 5 },
    volatility: 0.08, trend: -0.001
  },
  { 
    id: '2008-crisis', 
    name: '2008 Financial Crisis',
    startDate: '2007-10-09', 
    endDate: '2009-03-09',
    basePrices: { 'AAPL': 90, 'GOOGL': 350, 'MSFT': 28, 'NVDA': 15, 'TSLA': 45, 'AMZN': 85, 'META': 120, 'NFLX': 25 },
    volatility: 0.05, trend: -0.0012
  },
  { 
    id: 'covid-crash', 
    name: 'COVID-19 Market Crash',
    startDate: '2020-02-19', 
    endDate: '2020-05-01',
    basePrices: { 'AAPL': 320, 'GOOGL': 1400, 'MSFT': 190, 'NVDA': 280, 'TSLA': 800, 'AMZN': 2000, 'META': 200, 'NFLX': 380 },
    volatility: 0.12, trend: -0.003
  },
  { 
    id: 'modern-bull', 
    name: 'Modern Bull Run',
    startDate: '2020-01-01', 
    endDate: '2024-01-01',
    basePrices: { 'AAPL': 120, 'GOOGL': 800, 'MSFT': 60, 'NVDA': 40, 'TSLA': 50, 'AMZN': 300, 'META': 80, 'NFLX': 100 },
    volatility: 0.02, trend: 0.0005
  }
];

async function createMarketDataTable() {
  console.log('🏗️  Creating market_data table...');
  
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS market_data (
        id SERIAL PRIMARY KEY,
        symbol VARCHAR(10) NOT NULL,
        timestamp TIMESTAMP NOT NULL,
        timeframe VARCHAR(10) NOT NULL DEFAULT 'daily',
        open_price DECIMAL(10, 2) NOT NULL,
        high_price DECIMAL(10, 2) NOT NULL,
        low_price DECIMAL(10, 2) NOT NULL,
        close_price DECIMAL(10, 2) NOT NULL,
        volume BIGINT NOT NULL,
        adjusted_close DECIMAL(10, 2),
        dividend_amount DECIMAL(10, 4) DEFAULT 0,
        split_coefficient DECIMAL(10, 4) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(symbol, timestamp, timeframe)
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_market_data_symbol_timestamp 
      ON market_data(symbol, timestamp, timeframe);
    `);
    
    console.log('✅ market_data table ready');
  } catch (error) {
    console.error('❌ Error creating table:', error.message);
    throw error;
  }
}

function generatePeriodData(symbol, period) {
  const { startDate, endDate, basePrices, volatility, trend } = period;
  const basePrice = basePrices[symbol] || 50;
  
  const dataPoints = [];
  let currentPrice = basePrice;
  let currentDate = new Date(startDate);
  const endDateObj = new Date(endDate);
  
  while (currentDate <= endDateObj) {
    // Skip weekends
    if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
      const randomFactor = (Math.random() - 0.5) * volatility * 2;
      const dailyChange = randomFactor + trend;
      
      const open = currentPrice;
      const close = currentPrice * (1 + dailyChange);
      const high = Math.max(open, close) * (1 + Math.random() * 0.02);
      const low = Math.min(open, close) * (1 - Math.random() * 0.02);
      const volume = Math.floor(Math.random() * 100000000) + 10000000;

      dataPoints.push({
        symbol: symbol.toUpperCase(),
        timestamp: currentDate.toISOString(),
        timeframe: 'daily',
        open_price: parseFloat(open.toFixed(2)),
        high_price: parseFloat(high.toFixed(2)),
        low_price: parseFloat(low.toFixed(2)),
        close_price: parseFloat(close.toFixed(2)),
        adjusted_close: parseFloat(close.toFixed(2)),
        volume: volume,
        dividend_amount: 0,
        split_coefficient: 1
      });

      currentPrice = close;
    }
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return dataPoints;
}

async function insertDataBatch(dataPoints) {
  if (dataPoints.length === 0) return 0;
  
  const client = await pool.connect();
  let insertedCount = 0;
  
  try {
    await client.query('BEGIN');
    
    for (const point of dataPoints) {
      try {
        await client.query(`
          INSERT INTO market_data (
            symbol, timestamp, timeframe, open_price, high_price, low_price, 
            close_price, volume, adjusted_close, dividend_amount, split_coefficient
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          ON CONFLICT (symbol, timestamp, timeframe) DO NOTHING
        `, [
          point.symbol, point.timestamp, point.timeframe, point.open_price,
          point.high_price, point.low_price, point.close_price, point.volume,
          point.adjusted_close, point.dividend_amount, point.split_coefficient
        ]);
        insertedCount++;
      } catch (error) {
        // Skip conflicts, continue with others
        if (!error.message.includes('duplicate key')) {
          console.error(`Error inserting ${point.symbol} ${point.timestamp}:`, error.message);
        }
      }
    }
    
    await client.query('COMMIT');
    return insertedCount;
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function populateSimplified() {
  console.log('🚀 Starting simplified market data population...\n');
  
  let totalRecords = 0;
  
  try {
    await createMarketDataTable();
    
    for (const period of HISTORICAL_PERIODS) {
      console.log(`\n📈 Processing ${period.name} (${period.startDate} to ${period.endDate})`);
      
      for (const symbol of SYMBOLS) {
        console.log(`  📊 Generating data for ${symbol}...`);
        
        try {
          const dataPoints = generatePeriodData(symbol, period);
          const insertedCount = await insertDataBatch(dataPoints);
          totalRecords += insertedCount;
          
          console.log(`  ✅ Inserted ${insertedCount} records for ${symbol}`);
        } catch (error) {
          console.error(`  ❌ Failed to process ${symbol}:`, error.message);
        }
        
        // Small delay to avoid overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    // Verification
    console.log('\n📊 Verification...');
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
    
    console.log('\n🎉 Population Results:');
    result.rows.forEach(row => {
      console.log(`  ${row.symbol}: ${row.records} records (${row.earliest} to ${row.latest})`);
    });
    
    console.log(`\n✨ Total records: ${totalRecords}`);
    console.log('🚀 Simulation ready! Restart your backend and try the simulation.');
    
  } catch (error) {
    console.error('❌ Population failed:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  populateSimplified()
    .then(() => {
      console.log('\n✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error.message);
      process.exit(1);
    });
}

module.exports = { populateSimplified };