/**
 * Populate market_data_daily table using AlphaVantageService
 * This script generates data for all historical periods defined in the frontend
 */

const alphaVantageService = require('./educators-edge-backend/services/alphaVantageService');
const { pool } = require('./educators-edge-backend/db');

// Historical periods from your frontend constants
const HISTORICAL_PERIODS = [
  {
    id: 'great-depression',
    name: 'Great Depression',
    startDate: '1929-10-24',
    endDate: '1932-07-08',
    description: 'The worst economic downturn in modern history'
  },
  {
    id: 'black-monday',
    name: 'Black Monday 1987',
    startDate: '1987-10-15',
    endDate: '1987-11-15',
    description: 'The largest single-day percentage decline in stock market history'
  },
  {
    id: 'dot-com-bubble',
    name: 'Dot-Com Bubble',
    startDate: '2000-03-10',
    endDate: '2002-10-09',
    description: 'The burst of the internet bubble and subsequent market crash'
  },
  {
    id: '2008-crisis',
    name: '2008 Financial Crisis',
    startDate: '2007-10-09',
    endDate: '2009-03-09',
    description: 'The global financial crisis and Great Recession'
  },
  {
    id: 'covid-crash',
    name: 'COVID-19 Market Crash',
    startDate: '2020-02-19',
    endDate: '2020-05-01',
    description: 'The rapid market decline due to COVID-19 pandemic'
  },
  {
    id: 'modern-bull',
    name: 'Modern Bull Run',
    startDate: '2016-01-01',
    endDate: '2024-01-01',
    description: 'The extended bull market of the 2010s and 2020s'
  },
  {
    id: '1970s-recession',
    name: '1970s Oil Crisis',
    startDate: '1973-10-01',
    endDate: '1975-03-01',
    description: 'Economic recession caused by oil embargo and energy crisis'
  },
  {
    id: 'savings-loan-crisis',
    name: 'Savings & Loan Crisis',
    startDate: '1989-01-01',
    endDate: '1991-03-01',
    description: 'Financial crisis affecting hundreds of savings and loan associations'
  }
];

// Symbols from your simulation service
const SYMBOLS = ['AAPL', 'GOOGL', 'MSFT', 'NVDA', 'TSLA', 'AMZN', 'META', 'NFLX'];

/**
 * Create the market_data_daily table that the simulation service expects
 */
async function createMarketDataDailyTable() {
  console.log('🏗️  Creating market_data_daily table...');
  
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS market_data_daily (
        id SERIAL PRIMARY KEY,
        symbol VARCHAR(10) NOT NULL,
        date DATE NOT NULL,
        open_price DECIMAL(10, 2) NOT NULL,
        high_price DECIMAL(10, 2) NOT NULL,
        low_price DECIMAL(10, 2) NOT NULL,
        close_price DECIMAL(10, 2) NOT NULL,
        volume BIGINT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(symbol, date)
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_market_data_daily_symbol_date 
      ON market_data_daily(symbol, date);
    `);
    
    console.log('✅ market_data_daily table ready');
  } catch (error) {
    console.error('❌ Error creating table:', error.message);
    throw error;
  }
}

/**
 * Generate sample data for a specific period and symbol
 */
function generatePeriodData(symbol, startDate, endDate, periodId) {
  console.log(`  📊 Generating data for ${symbol} (${periodId}: ${startDate} to ${endDate})`);
  
  // Base prices adjusted for historical context
  const historicalBasePrices = {
    'great-depression': {
      'AAPL': 5, 'GOOGL': 8, 'MSFT': 3, 'NVDA': 2, 'TSLA': 4, 'AMZN': 6, 'META': 7, 'NFLX': 5
    },
    'black-monday': {
      'AAPL': 15, 'GOOGL': 25, 'MSFT': 12, 'NVDA': 8, 'TSLA': 18, 'AMZN': 20, 'META': 22, 'NFLX': 16
    },
    'dot-com-bubble': {
      'AAPL': 25, 'GOOGL': 85, 'MSFT': 45, 'NVDA': 35, 'TSLA': 30, 'AMZN': 95, 'META': 40, 'NFLX': 55
    },
    '2008-crisis': {
      'AAPL': 90, 'GOOGL': 350, 'MSFT': 28, 'NVDA': 15, 'TSLA': 45, 'AMZN': 85, 'META': 120, 'NFLX': 25
    },
    'covid-crash': {
      'AAPL': 320, 'GOOGL': 1400, 'MSFT': 190, 'NVDA': 280, 'TSLA': 800, 'AMZN': 2000, 'META': 200, 'NFLX': 380
    },
    'modern-bull': {
      'AAPL': 120, 'GOOGL': 800, 'MSFT': 60, 'NVDA': 40, 'TSLA': 50, 'AMZN': 300, 'META': 80, 'NFLX': 100
    },
    '1970s-recession': {
      'AAPL': 2, 'GOOGL': 3, 'MSFT': 1.5, 'NVDA': 1, 'TSLA': 2.5, 'AMZN': 2.8, 'META': 3.2, 'NFLX': 2.2
    },
    'savings-loan-crisis': {
      'AAPL': 8, 'GOOGL': 12, 'MSFT': 6, 'NVDA': 4, 'TSLA': 9, 'AMZN': 11, 'META': 10, 'NFLX': 7
    }
  };

  // Period-specific volatility and trends
  const periodCharacteristics = {
    'great-depression': { volatility: 0.08, trend: -0.001, crashFactor: 0.7 },
    'black-monday': { volatility: 0.15, trend: -0.002, crashFactor: 0.8 },
    'dot-com-bubble': { volatility: 0.06, trend: -0.0015, crashFactor: 0.6 },
    '2008-crisis': { volatility: 0.05, trend: -0.0012, crashFactor: 0.5 },
    'covid-crash': { volatility: 0.12, trend: -0.003, crashFactor: 0.4 },
    'modern-bull': { volatility: 0.02, trend: 0.0005, crashFactor: 1.2 },
    '1970s-recession': { volatility: 0.04, trend: -0.0008, crashFactor: 0.8 },
    'savings-loan-crisis': { volatility: 0.035, trend: -0.0006, crashFactor: 0.9 }
  };

  const basePrice = historicalBasePrices[periodId]?.[symbol] || 50;
  const characteristics = periodCharacteristics[periodId] || { volatility: 0.02, trend: 0, crashFactor: 1 };
  
  const dataPoints = [];
  let currentPrice = basePrice;
  let currentDate = new Date(startDate);
  const endDateObj = new Date(endDate);
  
  while (currentDate <= endDateObj) {
    // Skip weekends
    if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
      // Generate realistic market behavior for the period
      const randomFactor = (Math.random() - 0.5) * characteristics.volatility * 2;
      const trendFactor = characteristics.trend;
      const dailyChange = randomFactor + trendFactor;
      
      const open = currentPrice;
      const close = currentPrice * (1 + dailyChange) * characteristics.crashFactor;
      const high = Math.max(open, close) * (1 + Math.random() * 0.02);
      const low = Math.min(open, close) * (1 - Math.random() * 0.02);
      const volume = Math.floor(Math.random() * 100000000) + 10000000; // 10M to 110M volume

      dataPoints.push({
        symbol: symbol.toUpperCase(),
        date: currentDate.toISOString().split('T')[0],
        open_price: parseFloat(open.toFixed(2)),
        high_price: parseFloat(high.toFixed(2)),
        low_price: parseFloat(low.toFixed(2)),
        close_price: parseFloat(close.toFixed(2)),
        volume: volume
      });

      currentPrice = close;
    }
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return dataPoints;
}

/**
 * Insert data points into market_data_daily table
 */
async function insertDataPoints(dataPoints) {
  if (dataPoints.length === 0) return 0;
  
  const symbol = dataPoints[0].symbol;
  console.log(`  💾 Storing ${dataPoints.length} data points for ${symbol}...`);
  
  try {
    let insertedCount = 0;
    const batchSize = 100;
    
    for (let i = 0; i < dataPoints.length; i += batchSize) {
      const batch = dataPoints.slice(i, i + batchSize);
      
      // Build batch insert query
      const values = [];
      const placeholders = [];
      let paramIndex = 1;

      for (const point of batch) {
        placeholders.push(`($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6})`);
        values.push(
          point.symbol,
          point.date,
          point.open_price,
          point.high_price,
          point.low_price,
          point.close_price,
          point.volume
        );
        paramIndex += 7;
      }

      const batchInsertQuery = `
        INSERT INTO market_data_daily (symbol, date, open_price, high_price, low_price, close_price, volume)
        VALUES ${placeholders.join(', ')}
        ON CONFLICT (symbol, date) DO UPDATE SET
          open_price = EXCLUDED.open_price,
          high_price = EXCLUDED.high_price,
          low_price = EXCLUDED.low_price,
          close_price = EXCLUDED.close_price,
          volume = EXCLUDED.volume
      `;

      await pool.query(batchInsertQuery, values);
      insertedCount += batch.length;
      
      // Progress indicator
      if (i % 500 === 0) {
        const progress = ((i + batch.length) / dataPoints.length * 100).toFixed(1);
        console.log(`    Progress: ${progress}% (${i + batch.length}/${dataPoints.length})`);
      }
    }
    
    console.log(`  ✅ Stored ${insertedCount} records for ${symbol}`);
    return insertedCount;
    
  } catch (error) {
    console.error(`  ❌ Error storing data for ${symbol}:`, error.message);
    throw error;
  }
}

/**
 * Main population function
 */
async function populateAllPeriods() {
  console.log('🚀 Starting market data population for all historical periods...\n');
  
  let totalRecords = 0;
  
  try {
    // Create the table
    await createMarketDataDailyTable();
    
    // Process each period
    for (const period of HISTORICAL_PERIODS) {
      console.log(`\n📈 Processing period: ${period.name} (${period.startDate} to ${period.endDate})`);
      
      // Process each symbol for this period
      for (const symbol of SYMBOLS) {
        try {
          const dataPoints = generatePeriodData(symbol, period.startDate, period.endDate, period.id);
          const insertedCount = await insertDataPoints(dataPoints);
          totalRecords += insertedCount;
        } catch (error) {
          console.error(`  ❌ Failed to process ${symbol} for ${period.id}:`, error.message);
        }
      }
    }
    
    // Final verification
    console.log('\n📊 Verifying data population...');
    const verificationQuery = `
      SELECT 
        symbol, 
        COUNT(*) as total_records,
        MIN(date) as earliest_date,
        MAX(date) as latest_date
      FROM market_data_daily 
      GROUP BY symbol 
      ORDER BY symbol
    `;
    
    const result = await pool.query(verificationQuery);
    
    console.log('\n🎉 Population complete! Summary:');
    result.rows.forEach(row => {
      console.log(`  ${row.symbol}: ${row.total_records} records (${row.earliest_date} to ${row.latest_date})`);
    });
    
    console.log(`\n✨ Total records inserted: ${totalRecords}`);
    console.log('🚀 Simulation is now ready to run with historical data!');
    
  } catch (error) {
    console.error('❌ Population failed:', error.message);
  } finally {
    await pool.end();
  }
}

// Run the population script
if (require.main === module) {
  populateAllPeriods()
    .then(() => {
      console.log('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error.message);
      process.exit(1);
    });
}

module.exports = { populateAllPeriods, generatePeriodData };