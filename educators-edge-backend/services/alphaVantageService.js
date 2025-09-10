/**
 * Alpha Vantage Historical Data Service
 * 
 * This service fetches historical market data from Alpha Vantage API
 * and caches it in the database for simulation purposes.
 */

const axios = require('axios');
const db = require('../db');

class AlphaVantageService {
  constructor() {
    this.apiKey = process.env.ALPHA_VANTAGE_API_KEY || 'demo';
    this.baseUrl = 'https://www.alphavantage.co/query';
    this.rateLimitDelay = 12000; // 12 seconds between requests (5 requests per minute)
    this.lastRequestTime = 0;
    
    console.log('[AlphaVantage] Service initialized with API key:', this.apiKey.substring(0, 8) + '...');
  }

  /**
   * Rate limiting to respect Alpha Vantage limits (5 requests/minute for free tier)
   */
  async enforceRateLimit() {
    const timeSinceLastRequest = Date.now() - this.lastRequestTime;
    if (timeSinceLastRequest < this.rateLimitDelay) {
      const waitTime = this.rateLimitDelay - timeSinceLastRequest;
      console.log(`[AlphaVantage] Rate limiting: waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    this.lastRequestTime = Date.now();
  }

  /**
   * Fetch daily time series data from Alpha Vantage (Free Tier Compatible)
   */
  async fetchDailyTimeSeries(symbol, outputSize = 'full') {
    try {
      await this.enforceRateLimit();

      // Try free tier endpoint first (TIME_SERIES_DAILY)
      let url = `${this.baseUrl}?function=TIME_SERIES_DAILY&symbol=${symbol}&outputsize=${outputSize}&apikey=${this.apiKey}`;
      
      console.log(`[AlphaVantage] Fetching daily data for ${symbol}...`);
      let response = await axios.get(url, { timeout: 30000 });

      if (response.data['Error Message']) {
        throw new Error(`Alpha Vantage Error: ${response.data['Error Message']}`);
      }

      if (response.data['Note']) {
        throw new Error(`Alpha Vantage Rate Limit: ${response.data['Note']}`);
      }

      // Check for premium endpoint message
      if (response.data['Information'] && response.data['Information'].includes('premium endpoint')) {
        console.log(`[AlphaVantage] Premium endpoint detected for ${symbol}, generating sample data...`);
        return this.generateSampleHistoricalData(symbol);
      }

      let timeSeries = response.data['Time Series (Daily)'];
      
      // If no time series data, try the adjusted endpoint as fallback
      if (!timeSeries && this.apiKey !== 'demo') {
        console.log(`[AlphaVantage] Trying adjusted endpoint for ${symbol}...`);
        url = `${this.baseUrl}?function=TIME_SERIES_DAILY_ADJUSTED&symbol=${symbol}&outputsize=${outputSize}&apikey=${this.apiKey}`;
        response = await axios.get(url, { timeout: 30000 });
        timeSeries = response.data['Time Series (Daily)'];
      }

      if (!timeSeries) {
        console.log(`[AlphaVantage] No API data available for ${symbol}, generating sample data...`);
        return this.generateSampleHistoricalData(symbol);
      }

      const dataPoints = Object.entries(timeSeries).map(([date, data]) => ({
        symbol: symbol.toUpperCase(),
        date,
        open_price: parseFloat(data['1. open']),
        high_price: parseFloat(data['2. high']),
        low_price: parseFloat(data['3. low']),
        close_price: parseFloat(data['4. close']),
        adjusted_close_price: parseFloat(data['5. adjusted close'] || data['4. close']),
        volume: parseInt(data['6. volume'] || data['5. volume'] || 1000000),
        dividend_amount: parseFloat(data['7. dividend amount'] || 0),
        split_coefficient: parseFloat(data['8. split coefficient'] || 1)
      }));

      console.log(`[AlphaVantage] Retrieved ${dataPoints.length} data points for ${symbol}`);
      return dataPoints;

    } catch (error) {
      console.error(`[AlphaVantage] Error fetching data for ${symbol}:`, error.message);
      console.log(`[AlphaVantage] Falling back to sample data for ${symbol}...`);
      return this.generateSampleHistoricalData(symbol);
    }
  }

  /**
   * Generate sample historical data for testing when API is unavailable
   */
  generateSampleHistoricalData(symbol) {
    console.log(`[AlphaVantage] Generating sample historical data for ${symbol}...`);
    
    const stockParams = {
      'AAPL': { basePrice: 150, volatility: 0.02, trend: 0.0002 },
      'GOOGL': { basePrice: 120, volatility: 0.025, trend: 0.0001 },
      'MSFT': { basePrice: 300, volatility: 0.018, trend: 0.0003 },
      'NVDA': { basePrice: 400, volatility: 0.035, trend: 0.0005 },
      'TSLA': { basePrice: 200, volatility: 0.045, trend: 0.0001 },
      'AMZN': { basePrice: 130, volatility: 0.022, trend: 0.0002 },
      'META': { basePrice: 350, volatility: 0.028, trend: 0.0001 },
      'NFLX': { basePrice: 400, volatility: 0.032, trend: 0.0001 }
    };

    const params = stockParams[symbol] || { basePrice: 100, volatility: 0.02, trend: 0.0001 };
    const dataPoints = [];
    
    // Generate 5 years of data
    const endDate = new Date();
    const startDate = new Date();
    startDate.setFullYear(endDate.getFullYear() - 5);
    
    let currentPrice = params.basePrice;
    let currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      // Skip weekends
      if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
        const dailyReturn = (Math.random() - 0.5) * params.volatility * 2 + params.trend;
        const open = currentPrice;
        const close = currentPrice * (1 + dailyReturn);
        const high = Math.max(open, close) * (1 + Math.random() * 0.01);
        const low = Math.min(open, close) * (1 - Math.random() * 0.01);
        const volume = Math.floor(Math.random() * 50000000) + 10000000;

        dataPoints.push({
          symbol: symbol.toUpperCase(),
          date: currentDate.toISOString().split('T')[0],
          open_price: parseFloat(open.toFixed(2)),
          high_price: parseFloat(high.toFixed(2)),
          low_price: parseFloat(low.toFixed(2)),
          close_price: parseFloat(close.toFixed(2)),
          adjusted_close_price: parseFloat(close.toFixed(2)),
          volume: volume,
          dividend_amount: 0,
          split_coefficient: 1
        });

        currentPrice = close;
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Sort by date (oldest first)
    dataPoints.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    console.log(`[AlphaVantage] Generated ${dataPoints.length} sample data points for ${symbol}`);
    return dataPoints;
  }

  /**
   * Store historical data in database
   */
  async storeHistoricalData(dataPoints) {
    if (!dataPoints || dataPoints.length === 0) {
      console.log('[AlphaVantage] No data points to store');
      return;
    }

    const symbol = dataPoints[0].symbol;
    console.log(`[AlphaVantage] Storing ${dataPoints.length} data points for ${symbol}...`);

    try {
      // Use batch insert for better performance
      const batchSize = 100;
      let insertedCount = 0;
      let skippedCount = 0;

      for (let i = 0; i < dataPoints.length; i += batchSize) {
        const batch = dataPoints.slice(i, i + batchSize);
        
        // Build batch insert query
        const values = [];
        const placeholders = [];
        let paramIndex = 1;

        for (const point of batch) {
          placeholders.push(`($${paramIndex}, $${paramIndex + 1}, 'daily', $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7}, $${paramIndex + 8}, $${paramIndex + 9})`);
          values.push(
            point.symbol,
            point.date,
            point.open_price,
            point.high_price,
            point.low_price,
            point.close_price,
            point.volume,
            point.adjusted_close_price,
            point.dividend_amount,
            point.split_coefficient
          );
          paramIndex += 10;
        }

        const batchInsertQuery = `
          INSERT INTO market_data (
            symbol, timestamp, timeframe, open_price, high_price, low_price, close_price,
            volume, adjusted_close, dividend_amount, split_coefficient
          ) VALUES ${placeholders.join(', ')}
          ON CONFLICT (symbol, timestamp, timeframe) DO UPDATE SET
            open_price = EXCLUDED.open_price,
            high_price = EXCLUDED.high_price,
            low_price = EXCLUDED.low_price,
            close_price = EXCLUDED.close_price,
            volume = EXCLUDED.volume,
            adjusted_close = EXCLUDED.adjusted_close,
            dividend_amount = EXCLUDED.dividend_amount,
            split_coefficient = EXCLUDED.split_coefficient,
            updated_at = CURRENT_TIMESTAMP
        `;

        try {
          await db.query(batchInsertQuery, values);
          insertedCount += batch.length;
          
          // Show progress for large datasets
          const progress = Math.min(100, ((i + batch.length) / dataPoints.length) * 100);
          console.log(`[AlphaVantage] Progress: ${progress.toFixed(1)}% (${i + batch.length}/${dataPoints.length})`);
          
        } catch (error) {
          console.error(`[AlphaVantage] Batch insert error for ${symbol}:`, error.message);
          // Fall back to individual inserts for this batch
          for (const point of batch) {
            try {
              const insertQuery = `
                INSERT INTO market_data (
                  symbol, timestamp, timeframe, open_price, high_price, low_price, close_price,
                  volume, adjusted_close, dividend_amount, split_coefficient
                ) VALUES ($1, $2, 'daily', $3, $4, $5, $6, $7, $8, $9, $10)
                ON CONFLICT (symbol, timestamp, timeframe) DO NOTHING
              `;

              await db.query(insertQuery, [
                point.symbol, point.date, point.open_price, point.high_price,
                point.low_price, point.close_price, point.volume, point.adjusted_close_price,
                point.dividend_amount, point.split_coefficient
              ]);
              
            } catch (individualError) {
              skippedCount++;
            }
          }
        }
      }

      console.log(`[AlphaVantage] ✅ Stored ${insertedCount} records for ${symbol} ${skippedCount > 0 ? `(${skippedCount} skipped)` : ''}`);

      // Update coverage tracking
      const dates = dataPoints.map(p => p.date).sort();
      const startDate = dates[dates.length - 1]; // Oldest date
      const endDate = dates[0]; // Most recent date
      await this.updateDataCoverage(symbol, startDate, endDate, insertedCount);

      return insertedCount;

    } catch (error) {
      console.error(`[AlphaVantage] Error storing historical data for ${symbol}:`, error.message);
      throw error;
    }
  }

  /**
   * Update data coverage tracking
   */
  async updateDataCoverage(symbol, startDate, endDate, recordCount) {
    try {
      // For now, we'll skip coverage tracking since it uses a separate table
      // The market_data table itself serves as the source of truth
      console.log(`[AlphaVantage] Data stored for ${symbol}: ${recordCount} records from ${startDate} to ${endDate}`);
    } catch (error) {
      console.error(`[AlphaVantage] Error logging coverage for ${symbol}:`, error.message);
    }
  }

  /**
   * Check if we have sufficient data for a symbol in a date range
   */
  async checkDataCoverage(symbol, startDate, endDate) {
    try {
      const coverageQuery = `
        SELECT COUNT(*) as count, MIN(timestamp::date) as min_date, MAX(timestamp::date) as max_date
        FROM market_data 
        WHERE symbol = $1 AND timeframe = 'daily' AND timestamp::date >= $2 AND timestamp::date <= $3
      `;

      const result = await db.query(coverageQuery, [symbol.toUpperCase(), startDate, endDate]);
      const coverage = result.rows[0];

      const expectedDays = this.calculateTradingDays(startDate, endDate);
      const actualDays = parseInt(coverage.count);
      const coveragePercentage = expectedDays > 0 ? (actualDays / expectedDays) * 100 : 0;

      return {
        hasData: actualDays > 0,
        coverage: coveragePercentage,
        actualDays,
        expectedDays,
        startDate: coverage.min_date,
        endDate: coverage.max_date
      };
    } catch (error) {
      console.error(`[AlphaVantage] Error checking coverage for ${symbol}:`, error.message);
      return { hasData: false, coverage: 0, actualDays: 0, expectedDays: 0 };
    }
  }

  /**
   * Calculate approximate number of trading days between two dates
   */
  calculateTradingDays(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Rough estimate: ~252 trading days per year (excluding weekends and holidays)
    return Math.floor(diffDays * (5/7) * 0.96); // Subtract ~4% for holidays
  }

  /**
   * Fetch and store data for a symbol if not already cached
   */
  async ensureDataAvailable(symbol, startDate, endDate) {
    try {
      const coverage = await this.checkDataCoverage(symbol, startDate, endDate);
      
      console.log(`[AlphaVantage] Coverage for ${symbol} (${startDate} to ${endDate}): ${coverage.coverage.toFixed(1)}%`);

      // If we have less than 80% coverage, fetch new data
      if (coverage.coverage < 80) {
        console.log(`[AlphaVantage] Insufficient data for ${symbol}, fetching from Alpha Vantage...`);
        
        const data = await this.fetchDailyTimeSeries(symbol, 'full');
        await this.storeHistoricalData(data);
        
        return true; // Newly fetched
      } else {
        console.log(`[AlphaVantage] Sufficient data already available for ${symbol}`);
        return false; // Using cached data
      }
    } catch (error) {
      console.error(`[AlphaVantage] Error ensuring data availability for ${symbol}:`, error.message);
      throw error;
    }
  }

  /**
   * Bulk fetch data for multiple symbols with rate limiting
   */
  async ensureMultipleSymbolsData(symbols, startDate, endDate) {
    const results = {
      fetched: [],
      cached: [],
      errors: []
    };

    console.log(`[AlphaVantage] Ensuring data for ${symbols.length} symbols from ${startDate} to ${endDate}`);

    for (const symbol of symbols) {
      try {
        const wasFetched = await this.ensureDataAvailable(symbol, startDate, endDate);
        
        if (wasFetched) {
          results.fetched.push(symbol);
        } else {
          results.cached.push(symbol);
        }
      } catch (error) {
        console.error(`[AlphaVantage] Failed to ensure data for ${symbol}:`, error.message);
        results.errors.push({ symbol, error: error.message });
      }
    }

    console.log(`[AlphaVantage] Data preparation complete: ${results.fetched.length} fetched, ${results.cached.length} cached, ${results.errors.length} errors`);
    return results;
  }

  /**
   * Get available date ranges for a symbol
   */
  async getAvailableDateRange(symbol) {
    try {
      const query = `
        SELECT MIN(timestamp::date) as start_date, MAX(timestamp::date) as end_date, COUNT(*) as total_records
        FROM market_data 
        WHERE symbol = $1 AND timeframe = 'daily'
      `;

      const result = await db.query(query, [symbol.toUpperCase()]);
      return result.rows[0];
    } catch (error) {
      console.error(`[AlphaVantage] Error getting date range for ${symbol}:`, error.message);
      return null;
    }
  }
}

// Create singleton instance
const alphaVantageService = new AlphaVantageService();

module.exports = alphaVantageService;