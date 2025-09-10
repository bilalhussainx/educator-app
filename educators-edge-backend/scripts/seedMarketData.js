#!/usr/bin/env node

/**
 * Market Data Seeding Script for Zenith Trade
 * 
 * This script fetches historical market data from Alpha Vantage API
 * and populates the database for simulation purposes.
 * 
 * Usage: node scripts/seedMarketData.js [symbols]
 * Example: node scripts/seedMarketData.js AAPL GOOGL MSFT
 */

require('dotenv').config();
const alphaVantageService = require('../services/alphaVantageService');
const db = require('../db');

// Default symbols to fetch (major market movers across different eras)
const DEFAULT_SYMBOLS = [
  // Modern FAANG+
  'AAPL', 'GOOGL', 'MSFT', 'NVDA', 'TSLA', 'AMZN', 'META', 'NFLX',
  
  // Traditional blue chips (for historical periods)
  'JPM', 'JNJ', 'PG', 'KO', 'XOM', 'GE', 'IBM', 'DIS',
  
  // Financial sector (important for 2008 crisis simulation)
  'BAC', 'WFC', 'C', 'GS',
  
  // Tech stocks (for dot-com bubble)
  'INTC', 'CSCO', 'ORCL', 'CRM'
];

class MarketDataSeeder {
  constructor() {
    this.totalSymbols = 0;
    this.processedSymbols = 0;
    this.successCount = 0;
    this.errorCount = 0;
    this.startTime = Date.now();
  }

  /**
   * Main seeding function
   */
  async seedMarketData(symbols = DEFAULT_SYMBOLS) {
    console.log('🚀 Zenith Trade Market Data Seeder');
    console.log('=====================================');
    console.log(`📊 Fetching data for ${symbols.length} symbols`);
    console.log(`🔑 API Key: ${process.env.ALPHA_VANTAGE_API_KEY ? 'Present ✅' : 'Missing ❌'}`);
    console.log('');

    if (!process.env.ALPHA_VANTAGE_API_KEY) {
      console.error('❌ ALPHA_VANTAGE_API_KEY environment variable is required');
      console.log('💡 Get your free API key at: https://www.alphavantage.co/support/#api-key');
      process.exit(1);
    }

    this.totalSymbols = symbols.length;

    try {
      // Test database connection
      await this.testDatabaseConnection();
      
      // Seed each symbol
      for (let i = 0; i < symbols.length; i++) {
        const symbol = symbols[i].toUpperCase();
        await this.seedSymbol(symbol, i + 1);
      }

      // Final summary
      this.printFinalSummary();

    } catch (error) {
      console.error('💥 Fatal error during seeding:', error.message);
      process.exit(1);
    } finally {
      await db.end();
    }
  }

  /**
   * Test database connection
   */
  async testDatabaseConnection() {
    try {
      console.log('🔍 Testing database connection...');
      await db.query('SELECT 1');
      console.log('✅ Database connection successful');
      console.log('');
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      throw error;
    }
  }

  /**
   * Seed data for a single symbol
   */
  async seedSymbol(symbol, index) {
    const progress = `[${index}/${this.totalSymbols}]`;
    console.log(`${progress} 📈 Processing ${symbol}...`);

    try {
      // Check existing data coverage
      const coverage = await alphaVantageService.checkDataCoverage(
        symbol, 
        '1990-01-01', 
        new Date().toISOString().split('T')[0]
      );

      console.log(`${progress} 📋 ${symbol}: ${coverage.actualDays} days, ${coverage.coverage.toFixed(1)}% coverage`);

      // Only fetch if we have less than 80% coverage
      if (coverage.coverage < 80) {
        console.log(`${progress} 🔄 Fetching fresh data for ${symbol}...`);
        
        // Fetch and store data
        const data = await alphaVantageService.fetchDailyTimeSeries(symbol, 'full');
        await alphaVantageService.storeHistoricalData(data);
        
        console.log(`${progress} ✅ ${symbol}: Fetched ${data.length} records`);
        this.successCount++;
      } else {
        console.log(`${progress} ⚡ ${symbol}: Using existing data (sufficient coverage)`);
        this.successCount++;
      }

      this.processedSymbols++;

    } catch (error) {
      console.error(`${progress} ❌ ${symbol}: ${error.message}`);
      this.errorCount++;
      this.processedSymbols++;
    }

    // Progress update
    const percentComplete = ((this.processedSymbols / this.totalSymbols) * 100).toFixed(1);
    console.log(`${progress} 📊 Progress: ${percentComplete}% complete`);
    console.log('');
  }

  /**
   * Print final summary
   */
  printFinalSummary() {
    const elapsedTime = Math.round((Date.now() - this.startTime) / 1000);
    const minutes = Math.floor(elapsedTime / 60);
    const seconds = elapsedTime % 60;

    console.log('🎉 Market Data Seeding Complete!');
    console.log('=================================');
    console.log(`✅ Successful: ${this.successCount} symbols`);
    console.log(`❌ Errors: ${this.errorCount} symbols`);
    console.log(`⏱️  Total time: ${minutes}m ${seconds}s`);
    console.log('');

    if (this.successCount > 0) {
      console.log('🚀 Your Market Replay Engine is ready!');
      console.log('📝 Next steps:');
      console.log('   1. Start your backend server');
      console.log('   2. Enable USE_SIMULATION in frontend');
      console.log('   3. Select a historical period in the trading terminal');
      console.log('');
    }

    if (this.errorCount > 0) {
      console.log('⚠️  Some symbols failed to fetch. This is normal due to:');
      console.log('   • API rate limits (5 requests/minute)');
      console.log('   • Invalid/delisted symbols');
      console.log('   • Temporary API issues');
      console.log('   Run the script again to retry failed symbols.');
      console.log('');
    }
  }

  /**
   * Seed specific historical periods with targeted symbols
   */
  async seedHistoricalPeriod(periodId) {
    const periodSymbols = {
      'great-depression': ['GM', 'GE', 'IBM', 'XOM', 'KO', 'JNJ', 'PG', 'MMM'],
      '2008-crisis': ['AAPL', 'MSFT', 'GE', 'C', 'BAC', 'JPM', 'GS', 'XOM'],
      'dot-com-bubble': ['AAPL', 'MSFT', 'INTC', 'CSCO', 'ORCL', 'IBM'],
      'covid-crash': ['AAPL', 'MSFT', 'AMZN', 'GOOGL', 'TSLA', 'NVDA', 'META', 'NFLX'],
      'black-monday': ['IBM', 'GE', 'XOM', 'GM', 'KO', 'JNJ', 'PG', 'MMM'],
      'modern-bull': ['AAPL', 'MSFT', 'AMZN', 'GOOGL', 'TSLA', 'NVDA', 'META', 'NFLX']
    };

    const symbols = periodSymbols[periodId];
    if (!symbols) {
      console.error(`❌ Unknown historical period: ${periodId}`);
      return;
    }

    console.log(`🎯 Seeding data for ${periodId} period`);
    await this.seedMarketData(symbols);
  }
}

/**
 * CLI Interface
 */
async function main() {
  const seeder = new MarketDataSeeder();
  const args = process.argv.slice(2);

  if (args.length === 0) {
    // Seed default symbols
    await seeder.seedMarketData();
  } else if (args[0] === '--period' && args[1]) {
    // Seed specific historical period
    await seeder.seedHistoricalPeriod(args[1]);
  } else if (args[0] === '--help' || args[0] === '-h') {
    // Show help
    console.log('Zenith Trade Market Data Seeder');
    console.log('Usage:');
    console.log('  node scripts/seedMarketData.js                    # Seed default symbols');
    console.log('  node scripts/seedMarketData.js AAPL GOOGL MSFT    # Seed specific symbols');
    console.log('  node scripts/seedMarketData.js --period covid-crash # Seed period-specific symbols');
    console.log('');
    console.log('Available periods:');
    console.log('  great-depression, 2008-crisis, dot-com-bubble,');
    console.log('  covid-crash, black-monday, modern-bull');
  } else {
    // Seed specified symbols
    await seeder.seedMarketData(args);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n⚠️  Interrupted! Cleaning up...');
  process.exit(0);
});

process.on('unhandledRejection', (error) => {
  console.error('💥 Unhandled promise rejection:', error);
  process.exit(1);
});

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
}

module.exports = MarketDataSeeder;