/**
 * Historical Data Service
 * 
 * Fetches historical market data for simulation purposes
 * Integrates with our internal Alpha Vantage-powered backend
 */

import apiClient from './apiClient';
import { OHLCData } from '../types';

export interface HistoricalDataRequest {
  symbol: string;
  startDate: string;
  endDate: string;
  resolution?: 'D' | 'W' | 'M'; // Daily, Weekly, Monthly
}

export interface HistoricalDataResponse {
  symbol: string;
  data: OHLCData[];
  period: {
    start: string;
    end: string;
    totalDays: number;
  };
  source: 'simulation' | 'cache';
}

class HistoricalDataService {
  private cache = new Map<string, { data: HistoricalDataResponse; timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Fetch historical OHLC data for a symbol within a date range
   */
  async fetchHistoricalData(request: HistoricalDataRequest): Promise<HistoricalDataResponse> {
    const cacheKey = `${request.symbol}_${request.startDate}_${request.endDate}_${request.resolution || 'D'}`;
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      console.log(`[HistoricalData] Using cached data for ${request.symbol}`);
      return cached.data;
    }

    try {
      console.log(`[HistoricalData] Fetching data for ${request.symbol} (${request.startDate} to ${request.endDate})`);

      const response = await apiClient.post('/api/simulation/historical-data', {
        symbol: request.symbol.toUpperCase(),
        startDate: request.startDate,
        endDate: request.endDate,
        resolution: request.resolution || 'D'
      });

      if (response.data.success) {
        const historicalResponse: HistoricalDataResponse = response.data.data;
        
        // Cache the response
        this.cache.set(cacheKey, {
          data: historicalResponse,
          timestamp: Date.now()
        });

        console.log(`[HistoricalData] Successfully fetched ${historicalResponse.data.length} data points for ${request.symbol}`);
        return historicalResponse;
      } else {
        throw new Error(response.data.error || 'Failed to fetch historical data');
      }
    } catch (error: any) {
      console.error(`[HistoricalData] Error fetching data for ${request.symbol}:`, error);
      
      // Return fallback data to keep charts functional
      return this.generateFallbackData(request);
    }
  }

  /**
   * Fetch data for multiple symbols (batch request)
   */
  async fetchMultipleSymbols(
    symbols: string[], 
    startDate: string, 
    endDate: string,
    resolution: 'D' | 'W' | 'M' = 'D'
  ): Promise<Map<string, HistoricalDataResponse>> {
    const results = new Map<string, HistoricalDataResponse>();

    // Process in chunks to avoid overwhelming the server
    const chunks = this.chunkArray(symbols, 5);
    
    for (const chunk of chunks) {
      const promises = chunk.map(symbol =>
        this.fetchHistoricalData({ symbol, startDate, endDate, resolution })
      );

      const chunkResults = await Promise.allSettled(promises);
      
      chunkResults.forEach((result, index) => {
        const symbol = chunk[index];
        if (result.status === 'fulfilled') {
          results.set(symbol, result.value);
        } else {
          console.warn(`[HistoricalData] Failed to fetch data for ${symbol}:`, result.reason);
          results.set(symbol, this.generateFallbackData({ symbol, startDate, endDate, resolution }));
        }
      });

      // Small delay between chunks to respect rate limits
      if (chunks.length > 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return results;
  }

  /**
   * Get data for a specific historical period
   */
  async fetchPeriodData(symbol: string, periodId: string): Promise<HistoricalDataResponse> {
    try {
      const response = await apiClient.get(`/api/simulation/period-data/${periodId}/${symbol}`);
      
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Failed to fetch period data');
      }
    } catch (error: any) {
      console.error(`[HistoricalData] Error fetching period data:`, error);
      
      // Get period info and generate fallback
      const periods = this.getHistoricalPeriods();
      const period = periods.find(p => p.id === periodId);
      
      if (period) {
        return this.generateFallbackData({
          symbol,
          startDate: period.startDate,
          endDate: period.endDate
        });
      }
      
      throw error;
    }
  }

  /**
   * Generate realistic fallback data when API fails
   */
  private generateFallbackData(request: HistoricalDataRequest): HistoricalDataResponse {
    const startDate = new Date(request.startDate);
    const endDate = new Date(request.endDate);
    const data: OHLCData[] = [];
    
    let currentPrice = this.getBasePrice(request.symbol);
    let currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      // Skip weekends
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        // Generate realistic price movement
        const dailyChange = (Math.random() - 0.5) * currentPrice * 0.04; // ±4% max daily change
        const open = currentPrice;
        const close = currentPrice + dailyChange;
        
        const high = Math.max(open, close) * (1 + Math.random() * 0.02);
        const low = Math.min(open, close) * (1 - Math.random() * 0.02);
        const volume = Math.floor(Math.random() * 5000000) + 1000000;

        data.push({
          timestamp: currentDate.getTime(),
          date: currentDate.toISOString().split('T')[0],
          open,
          high,
          low,
          close,
          volume
        });

        currentPrice = close;
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return {
      symbol: request.symbol,
      data,
      period: {
        start: request.startDate,
        end: request.endDate,
        totalDays: data.length
      },
      source: 'simulation'
    };
  }

  /**
   * Get base price for fallback data generation
   */
  private getBasePrice(symbol: string): number {
    const basePrices: Record<string, number> = {
      'AAPL': 150,
      'GOOGL': 1200,
      'MSFT': 200,
      'NVDA': 300,
      'TSLA': 200,
      'AMZN': 3000,
      'META': 300,
      'NFLX': 400,
      'GM': 50,
      'GE': 30,
      'IBM': 120,
      'XOM': 70,
      'KO': 45,
      'JNJ': 160,
      'PG': 140,
      'MMM': 180
    };

    return basePrices[symbol] || 100;
  }

  /**
   * Utility to chunk arrays
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Get available historical periods
   */
  getHistoricalPeriods() {
    return [
      {
        id: 'great-depression',
        name: 'Great Depression',
        description: 'Stock market crash of 1929 and subsequent economic depression',
        startDate: '1929-01-01',
        endDate: '1933-12-31',
        defaultStart: '1929-09-01'
      },
      {
        id: '2008-crisis',
        name: '2008 Financial Crisis',
        description: 'Global financial crisis triggered by subprime mortgage collapse',
        startDate: '2007-01-01',
        endDate: '2009-12-31',
        defaultStart: '2007-06-01'
      },
      {
        id: 'dot-com-bubble',
        name: 'Dot-Com Bubble',
        description: 'Internet stock speculation and subsequent crash',
        startDate: '1995-01-01',
        endDate: '2002-12-31',
        defaultStart: '1999-01-01'
      },
      {
        id: 'covid-crash',
        name: 'COVID-19 Market Crash',
        description: 'Pandemic-induced market volatility and recovery',
        startDate: '2020-01-01',
        endDate: '2021-12-31',
        defaultStart: '2020-01-01'
      },
      {
        id: 'black-monday',
        name: 'Black Monday 1987',
        description: 'Single-day market crash of October 19, 1987',
        startDate: '1987-01-01',
        endDate: '1988-12-31',
        defaultStart: '1987-08-01'
      },
      {
        id: 'modern-bull',
        name: 'Modern Bull Market',
        description: 'Post-2008 recovery and longest bull market in history',
        startDate: '2009-03-09',
        endDate: '2020-02-19',
        defaultStart: '2009-03-09'
      }
    ];
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
    console.log('[HistoricalData] Cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Export singleton instance
export const historicalDataService = new HistoricalDataService();
export default historicalDataService;