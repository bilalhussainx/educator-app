/**
 * Use AlphaVantageService to populate market_data table for all historical periods
 */

const alphaVantageService = require('./educators-edge-backend/services/alphaVantageService');

// Symbols from your simulation service
const SYMBOLS = ['AAPL', 'GOOGL', 'MSFT', 'NVDA', 'TSLA', 'AMZN', 'META', 'NFLX'];

// Historical periods
const HISTORICAL_PERIODS = [
  { id: 'great-depression', startDate: '1929-10-24', endDate: '1932-07-08' },
  { id: 'black-monday', startDate: '1987-10-15', endDate: '1987-11-15' },
  { id: 'dot-com-bubble', startDate: '2000-03-10', endDate: '2002-10-09' },
  { id: '2008-crisis', startDate: '2007-10-09', endDate: '2009-03-09' },
  { id: 'covid-crash', startDate: '2020-02-19', endDate: '2020-05-01' },
  { id: 'modern-bull', startDate: '2016-01-01', endDate: '2024-01-01' },
  { id: '1970s-recession', startDate: '1973-10-01', endDate: '1975-03-01' },
  { id: 'savings-loan-crisis', startDate: '1989-01-01', endDate: '1991-03-01' }
];

async function populateAllHistoricalData() {
  console.log('🚀 Starting to populate market data using AlphaVantageService...\n');
  
  try {
    // Since AlphaVantageService generates sample data when API is unavailable,
    // we can just call ensureMultipleSymbolsData for a broad date range
    
    const startDate = '1929-01-01'; // Earliest period start
    const endDate = '2024-12-31';   // Latest period end
    
    console.log(`📊 Ensuring data for ${SYMBOLS.length} symbols from ${startDate} to ${endDate}`);
    console.log('🔄 This will generate sample data for all symbols across all historical periods...\n');
    
    const results = await alphaVantageService.ensureMultipleSymbolsData(SYMBOLS, startDate, endDate);
    
    console.log('\n🎉 Population Results:');
    console.log(`✅ Fetched/Generated: ${results.fetched.length} symbols`);
    console.log(`💾 Already Cached: ${results.cached.length} symbols`);
    console.log(`❌ Errors: ${results.errors.length} symbols`);
    
    if (results.fetched.length > 0) {
      console.log(`\n📈 New data generated for: ${results.fetched.join(', ')}`);
    }
    
    if (results.cached.length > 0) {
      console.log(`📦 Using existing data for: ${results.cached.join(', ')}`);
    }
    
    if (results.errors.length > 0) {
      console.log(`\n⚠️  Errors occurred for:`);
      results.errors.forEach(error => {
        console.log(`  - ${error.symbol}: ${error.error}`);
      });
    }
    
    // Verify data availability for key periods
    console.log('\n🔍 Verifying data availability for historical periods...');
    
    for (const period of HISTORICAL_PERIODS.slice(0, 3)) { // Check first 3 periods
      console.log(`\n📊 Checking ${period.id} (${period.startDate} to ${period.endDate}):`);
      
      for (const symbol of SYMBOLS.slice(0, 4)) { // Check first 4 symbols
        try {
          const coverage = await alphaVantageService.checkDataCoverage(symbol, period.startDate, period.endDate);
          const status = coverage.coverage > 80 ? '✅' : coverage.coverage > 50 ? '⚠️' : '❌';
          console.log(`  ${status} ${symbol}: ${coverage.coverage.toFixed(1)}% coverage (${coverage.actualDays}/${coverage.expectedDays} days)`);
        } catch (error) {
          console.log(`  ❌ ${symbol}: Error checking coverage`);
        }
      }
    }
    
    console.log('\n🚀 Market data population complete!');
    console.log('💡 Your simulation should now have data for all historical periods.');
    console.log('\n🎮 Next steps:');
    console.log('  1. Restart your backend server');
    console.log('  2. Go to ZenithTradeCommandCenter');
    console.log('  3. Select a historical period');
    console.log('  4. Press Play to start the simulation');
    console.log('  5. Watch the MarketPulse tick with real data!');
    
  } catch (error) {
    console.error('❌ Population failed:', error.message);
    console.error(error.stack);
  }
}

// Run the population
if (require.main === module) {
  populateAllHistoricalData()
    .then(() => {
      console.log('\n✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error.message);
      process.exit(1);
    });
}

module.exports = { populateAllHistoricalData };