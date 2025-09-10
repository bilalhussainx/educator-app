const axios = require('axios');
const cache = require('node-cache');

// Cache for 5 minutes
const marketCache = new cache({ stdTTL: 300 });

class MarketDataController {
  constructor() {
    this.finnhubApiKey = process.env.FINNHUB_API_KEY;
    this.baseUrl = 'https://finnhub.io/api/v1';
  }

  // Get most active stocks
  getMostActive = async (req, res) => {
    try {
      const cacheKey = 'most-active';
      const cached = marketCache.get(cacheKey);
      
      if (cached) {
        return res.json(cached);
      }

      // Fetch most active stocks from Finnhub
      const response = await axios.get(`${this.baseUrl}/stock/symbol`, {
        params: {
          exchange: 'US',
          token: this.finnhubApiKey
        }
      });

      // Get quotes for top symbols
      const topSymbols = ['AAPL', 'NVDA', 'TSLA', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NFLX', 'AMD', 'COIN'];
      const quotes = await Promise.allSettled(
        topSymbols.map(symbol => this.getQuote(symbol))
      );

      const mostActive = quotes
        .filter(result => result.status === 'fulfilled' && result.value)
        .map(result => result.value)
        .slice(0, 10);

      marketCache.set(cacheKey, mostActive);
      res.json(mostActive);
    } catch (error) {
      console.error('Error fetching most active stocks:', error);
      res.status(500).json({ error: 'Failed to fetch most active stocks' });
    }
  };

  // Get top gainers
  getTopGainers = async (req, res) => {
    try {
      const cacheKey = 'top-gainers';
      const cached = marketCache.get(cacheKey);
      
      if (cached) {
        return res.json(cached);
      }

      // For MVP, return mock data with realistic values
      const mockGainers = [
        { symbol: 'SMCI', name: 'Super Micro Computer', price: 45.67, change: 8.45, changePercent: 22.70, volume: 12345000 },
        { symbol: 'AMD', name: 'Advanced Micro Devices', price: 134.56, change: 12.34, changePercent: 10.09, volume: 23456000 },
        { symbol: 'COIN', name: 'Coinbase Global Inc.', price: 234.78, change: 18.90, changePercent: 8.76, volume: 8765000 },
        { symbol: 'ROKU', name: 'Roku Inc.', price: 78.90, change: 5.67, changePercent: 7.74, volume: 5432000 },
        { symbol: 'SQ', name: 'Block Inc.', price: 89.12, change: 6.34, changePercent: 7.66, volume: 7654000 },
      ];

      marketCache.set(cacheKey, mockGainers);
      res.json(mockGainers);
    } catch (error) {
      console.error('Error fetching top gainers:', error);
      res.status(500).json({ error: 'Failed to fetch top gainers' });
    }
  };

  // Get top losers
  getTopLosers = async (req, res) => {
    try {
      const cacheKey = 'top-losers';
      const cached = marketCache.get(cacheKey);
      
      if (cached) {
        return res.json(cached);
      }

      // For MVP, return mock data with realistic values
      const mockLosers = [
        { symbol: 'NFLX', name: 'Netflix Inc.', price: 701.35, change: -45.67, changePercent: -6.11, volume: 9876000 },
        { symbol: 'META', name: 'Meta Platforms Inc.', price: 568.31, change: -32.45, changePercent: -5.40, volume: 11234000 },
        { symbol: 'BABA', name: 'Alibaba Group', price: 78.45, change: -4.56, changePercent: -5.50, volume: 8765000 },
        { symbol: 'PYPL', name: 'PayPal Holdings', price: 89.67, change: -4.78, changePercent: -5.07, volume: 6543000 },
        { symbol: 'ZM', name: 'Zoom Video', price: 67.89, change: -3.45, changePercent: -4.84, volume: 5432000 },
      ];

      marketCache.set(cacheKey, mockLosers);
      res.json(mockLosers);
    } catch (error) {
      console.error('Error fetching top losers:', error);
      res.status(500).json({ error: 'Failed to fetch top losers' });
    }
  };

  // Get quote for a specific symbol
  getQuote = async (symbol) => {
    try {
      const response = await axios.get(`${this.baseUrl}/quote`, {
        params: {
          symbol: symbol,
          token: this.finnhubApiKey
        }
      });

      const quote = response.data;
      if (!quote.c) return null;

      // Get company profile for name
      const profileResponse = await axios.get(`${this.baseUrl}/stock/profile2`, {
        params: {
          symbol: symbol,
          token: this.finnhubApiKey
        }
      });

      const profile = profileResponse.data;

      return {
        symbol: symbol,
        name: profile.name || symbol,
        price: quote.c, // current price
        change: quote.d, // change
        changePercent: quote.dp, // change percent
        volume: 0, // volume not available in basic quote
        high: quote.h,
        low: quote.l,
        open: quote.o,
        previousClose: quote.pc
      };
    } catch (error) {
      console.error(`Error fetching quote for ${symbol}:`, error);
      return null;
    }
  };

  // Get detailed quote with company info
  getDetailedQuote = async (req, res) => {
    try {
      const { symbol } = req.params;
      const cacheKey = `quote-${symbol}`;
      const cached = marketCache.get(cacheKey);
      
      if (cached) {
        return res.json(cached);
      }

      const quote = await this.getQuote(symbol);
      if (!quote) {
        return res.status(404).json({ error: 'Symbol not found' });
      }

      // Get additional fundamental data
      const fundamentalResponse = await axios.get(`${this.baseUrl}/stock/metric`, {
        params: {
          symbol: symbol,
          metric: 'all',
          token: this.finnhubApiKey
        }
      });

      const fundamental = fundamentalResponse.data;

      const detailedQuote = {
        ...quote,
        fundamentals: {
          marketCap: fundamental.metric?.marketCapitalization,
          peRatio: fundamental.metric?.peBasicExclExtraTTM,
          eps: fundamental.metric?.epsBasicExclExtraAnnual,
          dividend: fundamental.metric?.dividendYield,
          beta: fundamental.metric?.beta,
          week52High: fundamental.metric?.['52WeekHigh'],
          week52Low: fundamental.metric?.['52WeekLow'],
        }
      };

      marketCache.set(cacheKey, detailedQuote);
      res.json(detailedQuote);
    } catch (error) {
      console.error('Error fetching detailed quote:', error);
      res.status(500).json({ error: 'Failed to fetch quote data' });
    }
  };

  // Get historical candles
  getHistoricalCandles = async (req, res) => {
    try {
      const { symbol } = req.params;
      const { resolution = 'D', from, to } = req.query;

      if (!from || !to) {
        return res.status(400).json({ error: 'from and to parameters are required' });
      }

      const cacheKey = `candles-${symbol}-${resolution}-${from}-${to}`;
      const cached = marketCache.get(cacheKey);
      
      if (cached) {
        return res.json(cached);
      }

      const response = await axios.get(`${this.baseUrl}/stock/candle`, {
        params: {
          symbol: symbol,
          resolution: resolution,
          from: from,
          to: to,
          token: this.finnhubApiKey
        }
      });

      const candles = response.data;
      
      if (candles.s === 'no_data') {
        return res.status(404).json({ error: 'No data found for the specified period' });
      }

      // Format candles for frontend
      const formattedCandles = {
        symbol: symbol,
        resolution: resolution,
        candles: candles.t?.map((time, index) => ({
          time: time,
          open: candles.o[index],
          high: candles.h[index],
          low: candles.l[index],
          close: candles.c[index],
          volume: candles.v[index]
        })) || []
      };

      marketCache.set(cacheKey, formattedCandles);
      res.json(formattedCandles);
    } catch (error) {
      console.error('Error fetching historical candles:', error);
      res.status(500).json({ error: 'Failed to fetch historical data' });
    }
  };

  // Search symbols
  searchSymbols = async (req, res) => {
    try {
      const { query } = req.query;
      
      if (!query || query.length < 2) {
        return res.status(400).json({ error: 'Query must be at least 2 characters' });
      }

      const response = await axios.get(`${this.baseUrl}/search`, {
        params: {
          q: query,
          token: this.finnhubApiKey
        }
      });

      const results = response.data.result?.slice(0, 10) || [];
      
      res.json(results.map(item => ({
        symbol: item.symbol,
        description: item.description,
        displaySymbol: item.displaySymbol,
        type: item.type
      })));
    } catch (error) {
      console.error('Error searching symbols:', error);
      res.status(500).json({ error: 'Failed to search symbols' });
    }
  };
}

module.exports = new MarketDataController();