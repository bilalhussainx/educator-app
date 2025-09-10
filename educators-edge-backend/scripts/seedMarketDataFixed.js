#!/usr/bin/env node

/**
 * Fixed Market Data Seeding Script for Zenith Trade
 * 
 * This script uses the updated Alpha Vantage service with fallback to sample data
 * when API limits are hit or premium endpoints are required.
 * 
 * Usage: node scripts/seedMarketDataFixed.js [symbols]
 * Example: node scripts/seedMarketDataFixed.js AAPL GOOGL MSFT
 */

require('dotenv').config();
const alphaVantageService = require('../services/alphaVantageService');
const db = require('../db');

// Core symbols for Market Replay Engine
const DEFAULT_SYMBOLS = [
  'AAPL', 'GOOGL', 'MSFT', 'NVDA', 'TSLA', 'AMZN', 'META', 'NFLX'
];

class FixedMarketDataSeeder {
  constructor() {
    this.totalSymbols = 0;
    this.processedSymbols = 0;
    this.successCount = 0;
    this.errorCount = 0;
    this.startTime = Date.now();
  }

  async run(symbols = DEFAULT_SYMBOLS) {
    console.log('🚀 Zenith Trade Market Data Seeder (Fixed)');
    console.log('==========================================');
    console.log(`📊 Processing ${symbols.length} symbols`);
    console.log(`🔑 API Key: ${process.env.ALPHA_VANTAGE_API_KEY ? 'Present ✅' : 'Using Demo Key ⚠️'}`);
    console.log('📝 Note: Will generate sample data if API limits are hit\n');

    this.totalSymbols = symbols.length;

    try {
      // Test database connection
      await db.query('SELECT 1');
      console.log('✅ Database connection verified\n');
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      process.exit(1);
    }

    // Process each symbol
    for (let i = 0; i < symbols.length; i++) {
      const symbol = symbols[i];
      await this.processSymbol(symbol, i + 1);
      
      // Add delay between symbols to be respectful to API
      if (i < symbols.length - 1) {
        await this.delay(1000);
      }
    }

    await this.createDemoSimulationSession();
    await this.generateSummaryReport();
    await this.printFinalStats();
  }

  async processSymbol(symbol, index) {
    console.log(`[${index}/${this.totalSymbols}] 📈 Processing ${symbol}...`);
    
    try {
      // Check existing data coverage
      const coverage = await alphaVantageService.checkDataCoverage(symbol, '2020-01-01', '2024-12-31');
      console.log(`[${index}/${this.totalSymbols}] 📋 ${symbol}: ${coverage.actualDays} days, ${coverage.coverage.toFixed(1)}% coverage`);

      let data;
      if (coverage.coverage < 50) {
        console.log(`[${index}/${this.totalSymbols}] 🔄 Fetching fresh data for ${symbol}...`);
        data = await alphaVantageService.fetchDailyTimeSeries(symbol, 'full');
        await alphaVantageService.storeHistoricalData(data);
        console.log(`[${index}/${this.totalSymbols}] ✅ ${symbol}: ${data.length} records stored`);
        this.successCount++;
      } else {
        console.log(`[${index}/${this.totalSymbols}] ✅ ${symbol}: Using existing data (${coverage.coverage.toFixed(1)}% coverage)`);
        this.successCount++;
      }

    } catch (error) {
      console.log(`[${index}/${this.totalSymbols}] ❌ ${symbol}: ${error.message}`);
      this.errorCount++;
    }

    this.processedSymbols++;
    const progress = ((this.processedSymbols / this.totalSymbols) * 100).toFixed(1);
    console.log(`[${index}/${this.totalSymbols}] 📊 Progress: ${progress}% complete\n`);
  }

  async createDemoSimulationSession() {
    try {
      console.log('🎮 Creating demo simulation session...');
      
      const result = await db.query(`
        INSERT INTO simulation_sessions (
          user_id, session_name, start_date, end_date, 
          starting_balance, current_balance, status, created_at
        ) VALUES (1, 'Demo Market Replay', '2024-01-01', '2024-12-31', 100000, 100000, 'active', NOW())
        ON CONFLICT DO NOTHING
        RETURNING id
      `);

      if (result.rows.length > 0) {
        console.log(`✅ Created demo simulation session with ID: ${result.rows[0].id}`);
      } else {
        console.log('ℹ️  Demo simulation session already exists');
      }

    } catch (error) {
      console.log('⚠️  Could not create demo session (table may not exist):', error.message);
    }
  }

  async generateSummaryReport() {
    try {
      console.log('📈 Generating summary report...');
      
      const symbolStats = await db.query(`
        SELECT 
          symbol,
          timeframe,
          COUNT(*) as record_count,
          MIN(timestamp) as earliest_date,
          MAX(timestamp) as latest_date,
          MIN(low_price) as min_price,
          MAX(high_price) as max_price
        FROM market_data 
        GROUP BY symbol, timeframe
        ORDER BY symbol, timeframe
      `);

      console.log('\n📊 Market Data Summary:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('Symbol   | Timeframe | Records | Date Range              | Price Range');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      for (const stat of symbolStats.rows) {
        const symbol = stat.symbol.padEnd(8);
        const timeframe = stat.timeframe.padEnd(9);
        const records = stat.record_count.toString().padStart(7);
        const dateRange = `${stat.earliest_date.toISOString().split('T')[0]} to ${stat.latest_date.toISOString().split('T')[0]}`;
        const priceRange = `$${parseFloat(stat.min_price).toFixed(2)} - $${parseFloat(stat.max_price).toFixed(2)}`;
        
        console.log(`${symbol} | ${timeframe} | ${records} | ${dateRange} | ${priceRange}`);
      }
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      const totalStats = await db.query(`
        SELECT 
          COUNT(DISTINCT symbol) as unique_symbols,
          COUNT(*) as total_records,
          SUM(CASE WHEN timeframe = 'daily' THEN 1 ELSE 0 END) as daily_records,
          SUM(CASE WHEN timeframe = 'minute' THEN 1 ELSE 0 END) as minute_records
        FROM market_data
      `);

      if (totalStats.rows.length > 0) {
        const stats = totalStats.rows[0];
        console.log(`\n📊 Total Statistics:`);
        console.log(`   • Unique Symbols: ${stats.unique_symbols}`);
        console.log(`   • Total Records: ${parseInt(stats.total_records).toLocaleString()}`);
        console.log(`   • Daily Records: ${parseInt(stats.daily_records).toLocaleString()}`);
        console.log(`   • Minute Records: ${parseInt(stats.minute_records).toLocaleString()}`);
      }

    } catch (error) {
      console.error('❌ Failed to generate summary report:', error.message);
    }
  }

  async printFinalStats() {
    const duration = (Date.now() - this.startTime) / 1000;
    
    console.log('\n🎉 Market Data Seeding Complete!');
    console.log('================================');
    console.log(`⏱️  Duration: ${duration.toFixed(1)} seconds`);
    console.log(`✅ Successful: ${this.successCount}/${this.totalSymbols} symbols`);
    console.log(`❌ Errors: ${this.errorCount}/${this.totalSymbols} symbols`);
    console.log(`📊 Success Rate: ${((this.successCount/this.totalSymbols)*100).toFixed(1)}%`);
    
    if (this.errorCount === 0) {
      console.log('\n🚀 Ready to start Market Replay Engine!');
      console.log('   Use ZenithTradeCommandCenter to begin trading simulations');
    } else if (this.successCount > 0) {
      console.log('\n⚠️  Partial Success - Some data available for simulation');
      console.log('   You can still use the Market Replay Engine with available symbols');
    } else {
      console.log('\n❌ No data was successfully loaded');
      console.log('   Check your Alpha Vantage API key and database connection');
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const symbols = args.length > 0 ? args : DEFAULT_SYMBOLS;
  
  const seeder = new FixedMarketDataSeeder();
  
  try {
    await seeder.run(symbols);
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding process failed:', error.message);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n⚠️  Process interrupted. Exiting gracefully...');
  process.exit(0);
});

if (require.main === module) {
  main();
}

module.exports = FixedMarketDataSeeder;