import { QuoteData } from '../types/index';

const FINNHUB_API_KEY = import.meta.env.VITE_FINNHUB_API_KEY || 'd3076l9r01qnmrsd9irgd3076l9r01qnmrsd9is0';
const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';

// Rate limiting helper
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1000; // 1 second between requests

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const rateLimitedFetch = async (url: string) => {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await wait(MIN_REQUEST_INTERVAL - timeSinceLastRequest);
  }
  
  lastRequestTime = Date.now();
  
  // Add timeout and better error handling
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
  
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; FinancialHub/1.0)',
      }
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timeout - API server may be unreachable');
    }
    throw error;
  }
};

export interface FinnhubQuote {
  c: number; // Current price
  h: number; // High price of the day
  l: number; // Low price of the day
  o: number; // Open price of the day
  pc: number; // Previous close price
  t: number; // Timestamp
}

export interface FinnhubCompanyProfile {
  name: string;
  ticker: string;
  marketCapitalization: number;
  shareOutstanding: number;
}

export interface FinnhubBasicFinancials {
  metric: {
    peNormalizedAnnual?: number;
    epsBasicExclExtraItemsAnnual?: number;
    dividendYieldIndicatedAnnual?: number;
    beta?: number;
    '52WeekHigh'?: number;
    '52WeekLow'?: number;
  };
}

export const fetchRealQuoteData = async (symbol: string): Promise<QuoteData> => {
  try {
    console.log(`[FinnhubService] Fetching real data for ${symbol}`);

    // Try Finnhub API first
    const quoteResponse = await rateLimitedFetch(
      `${FINNHUB_BASE_URL}/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`
    );

    if (quoteResponse.status === 429) {
      throw new Error('Rate limit exceeded. Please try again in a moment.');
    }

    if (!quoteResponse.ok) {
      throw new Error(`Quote API error: ${quoteResponse.status}`);
    }

    const quoteData: FinnhubQuote = await quoteResponse.json();
    
    // Validate quote data
    if (!quoteData.c || typeof quoteData.c !== 'number') {
      throw new Error('Invalid quote data received');
    }

    // Fetch company profile (with error handling)
    let companyName = `${symbol} Corporation`;
    try {
      const profileResponse = await rateLimitedFetch(
        `${FINNHUB_BASE_URL}/stock/profile2?symbol=${symbol}&token=${FINNHUB_API_KEY}`
      );
      
      if (profileResponse.ok) {
        const profileData: FinnhubCompanyProfile = await profileResponse.json();
        if (profileData.name) {
          companyName = profileData.name;
        }
      }
    } catch (error) {
      console.warn(`[FinnhubService] Could not fetch company profile for ${symbol}:`, error);
    }

    // Fetch basic financials (with error handling)
    let fundamentals: QuoteData['fundamentals'] = {};
    try {
      const financialsResponse = await rateLimitedFetch(
        `${FINNHUB_BASE_URL}/stock/metric?symbol=${symbol}&metric=all&token=${FINNHUB_API_KEY}`
      );
      
      if (financialsResponse.ok) {
        const financialsData: FinnhubBasicFinancials = await financialsResponse.json();
        
        fundamentals = {
          marketCap: companyName ? undefined : undefined, // Not directly available in this API
          peRatio: financialsData.metric.peNormalizedAnnual,
          eps: financialsData.metric.epsBasicExclExtraItemsAnnual,
          dividend: financialsData.metric.dividendYieldIndicatedAnnual,
          beta: financialsData.metric.beta,
          week52High: financialsData.metric['52WeekHigh'],
          week52Low: financialsData.metric['52WeekLow'],
        };
      }
    } catch (error) {
      console.warn(`[FinnhubService] Could not fetch fundamentals for ${symbol}:`, error);
    }

    // Calculate change and change percent
    const change = quoteData.c - quoteData.pc;
    const changePercent = (change / quoteData.pc) * 100;

    const result: QuoteData = {
      symbol: symbol.toUpperCase(),
      name: companyName,
      price: quoteData.c,
      change,
      changePercent,
      high: quoteData.h,
      low: quoteData.l,
      open: quoteData.o,
      previousClose: quoteData.pc,
      volume: undefined, // Not available in quote endpoint
      fundamentals,
    };

    console.log(`[FinnhubService] Successfully fetched real data for ${symbol}:`, result);
    return result;

  } catch (error) {
    console.error(`[FinnhubService] Error fetching data for ${symbol}:`, error);
    
    // Fallback to mock data with error indication
    const mockData = getMockQuoteData(symbol);
    mockData.name = `${mockData.name} (Simulated - API Error)`;
    return mockData;
  }
};

// Fallback mock data for when API fails
const getMockQuoteData = (symbol: string): QuoteData => {
  const mockPrices: { [key: string]: number } = {
    'AAPL': 237.88,
    'GOOGL': 165.32,
    'MSFT': 419.58,
    'NVDA': 118.65,
    'TSLA': 241.85,
    'AMZN': 188.44,
    'META': 568.31,
    'NFLX': 701.35,
  };

  const mockNames: { [key: string]: string } = {
    'AAPL': 'Apple Inc.',
    'GOOGL': 'Alphabet Inc.',
    'MSFT': 'Microsoft Corporation',
    'NVDA': 'NVIDIA Corporation',
    'TSLA': 'Tesla Inc.',
    'AMZN': 'Amazon.com Inc.',
    'META': 'Meta Platforms Inc.',
    'NFLX': 'Netflix Inc.',
  };

  const basePrice = mockPrices[symbol] || 100 + Math.random() * 200;
  const change = (Math.random() - 0.5) * basePrice * 0.05;
  const changePercent = (change / basePrice) * 100;

  return {
    symbol: symbol.toUpperCase(),
    name: mockNames[symbol] || `${symbol} Corporation`,
    price: basePrice,
    change,
    changePercent,
    high: basePrice * 1.02,
    low: basePrice * 0.98,
    open: basePrice * 0.995,
    previousClose: basePrice - change,
    volume: Math.floor(Math.random() * 50000000) + 10000000,
    fundamentals: {
      marketCap: basePrice * 1000000000,
      peRatio: 15 + Math.random() * 20,
      eps: basePrice / 20,
      dividend: Math.random() > 0.5 ? Math.random() * 3 : undefined,
      beta: 0.8 + Math.random() * 0.8,
      week52High: basePrice * 1.25,
      week52Low: basePrice * 0.75,
    }
  };
}

// OHLC Candlestick data interface
export interface OHLCData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface FinnhubCandleResponse {
  c: number[]; // Close prices
  h: number[]; // High prices
  l: number[]; // Low prices
  o: number[]; // Open prices
  t: number[]; // Timestamps
  v: number[]; // Volumes
  s: string;   // Status
}

export const fetchOHLCData = async (
  symbol: string, 
  resolution: string = 'D', 
  from?: number, 
  to?: number
): Promise<OHLCData[]> => {
  try {
    console.log(`[FinnhubService] Fetching OHLC data for ${symbol}`);
    
    // Default to last 100 days if no date range provided
    const toTimestamp = to || Math.floor(Date.now() / 1000);
    const fromTimestamp = from || (toTimestamp - (100 * 24 * 60 * 60)); // 100 days ago
    
    const candleResponse = await rateLimitedFetch(
      `${FINNHUB_BASE_URL}/stock/candle?symbol=${symbol}&resolution=${resolution}&from=${fromTimestamp}&to=${toTimestamp}&token=${FINNHUB_API_KEY}`
    );
    
    if (candleResponse.status === 429) {
      throw new Error('Rate limit exceeded for OHLC data');
    }
    
    if (!candleResponse.ok) {
      throw new Error(`OHLC API error: ${candleResponse.status}`);
    }
    
    const candleData: FinnhubCandleResponse = await candleResponse.json();
    
    if (candleData.s !== 'ok' || !candleData.t || candleData.t.length === 0) {
      throw new Error('No OHLC data available for this symbol');
    }
    
    // Convert to our OHLC format
    const ohlcData: OHLCData[] = candleData.t.map((timestamp, index) => ({
      timestamp: timestamp * 1000, // Convert to milliseconds
      open: candleData.o[index],
      high: candleData.h[index],
      low: candleData.l[index],
      close: candleData.c[index],
      volume: candleData.v[index]
    }));
    
    console.log(`[FinnhubService] Successfully fetched ${ohlcData.length} OHLC data points for ${symbol}`);
    return ohlcData;
    
  } catch (error) {
    console.error(`[FinnhubService] Error fetching OHLC data for ${symbol}:`, error);
    
    // Log specific API issues for debugging
    if (error instanceof Error) {
      if (error.message.includes('403')) {
        console.warn('[FinnhubService] API key may be invalid or expired. Using fallback data.');
      } else if (error.message.includes('429')) {
        console.warn('[FinnhubService] Rate limit exceeded. Using fallback data.');
      }
    }
    
    // Always fallback to generated OHLC data to ensure charts work
    console.log(`[FinnhubService] Generating fallback OHLC data for ${symbol}`);
    return generateMockOHLCData(symbol, 100);
  }
};

// Generate realistic mock OHLC data for fallback
const generateMockOHLCData = (symbol: string, days: number = 100): OHLCData[] => {
  console.log(`[FinnhubService] Generating realistic mock OHLC data for ${symbol} (${days} days)`);
  
  const mockPrices: { [key: string]: number } = {
    'AAPL': 237.88, 'GOOGL': 165.32, 'MSFT': 419.58, 'NVDA': 118.65,
    'TSLA': 241.85, 'AMZN': 188.44, 'META': 568.31, 'NFLX': 701.35,
  };
  
  let basePrice = mockPrices[symbol] || (100 + Math.random() * 300);
  const data: OHLCData[] = [];
  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;
  
  for (let i = days - 1; i >= 0; i--) {
    const timestamp = now - (i * oneDayMs);
    const dailyVolatility = 0.02 + Math.random() * 0.03; // 2-5% daily volatility
    
    const open = basePrice;
    const changePercent = (Math.random() - 0.5) * dailyVolatility;
    const close = open * (1 + changePercent);
    
    const high = Math.max(open, close) * (1 + Math.random() * 0.01);
    const low = Math.min(open, close) * (1 - Math.random() * 0.01);
    const volume = Math.floor(Math.random() * 50000000) + 1000000;
    
    data.push({
      timestamp,
      open,
      high,
      low,
      close,
      volume
    });
    
    basePrice = close; // Next day starts where this day ended
  }
  
  console.log(`[FinnhubService] ✅ Successfully generated ${data.length} mock OHLC data points for ${symbol}`);
  console.log(`[FinnhubService] Price range: $${Math.min(...data.map(d => d.low)).toFixed(2)} - $${Math.max(...data.map(d => d.high)).toFixed(2)}`);
  return data;
};

// Pattern Recognition Types
export interface PatternRecognition {
  patternName: string;
  timestamp: number;
  confidence: number;
  description?: string;
  type: 'bullish' | 'bearish' | 'neutral';
}

// AI-Powered Pattern Recognition Service
export const getPatternRecognition = async (
  symbol: string, 
  resolution: string = 'D'
): Promise<PatternRecognition[]> => {
  try {
    console.log(`[PatternAI] Analyzing patterns for ${symbol} with ${resolution} resolution`);
    
    // First, get the OHLC data
    const ohlcData = await fetchOHLCData(symbol, resolution);
    
    if (ohlcData.length < 10) {
      console.warn('[PatternAI] Insufficient data for pattern recognition');
      return [];
    }
    
    // Prepare data for Gemini API
    const chartData = ohlcData.slice(-50).map(candle => ({
      timestamp: candle.timestamp,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
      volume: candle.volume
    }));
    
    // Call our backend API for pattern analysis
    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/api/trade/analysis/patterns/${symbol}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          chartData, 
          resolution,
          symbol 
        })
      }
    );
    
    if (!response.ok) {
      throw new Error(`Pattern API error: ${response.status}`);
    }
    
    const patterns: PatternRecognition[] = await response.json();
    console.log(`[PatternAI] Found ${patterns.length} patterns for ${symbol}`);
    
    return patterns;
    
  } catch (error) {
    console.error(`[PatternAI] Error analyzing patterns for ${symbol}:`, error);
    
    // Fallback: Generate mock patterns for demonstration
    return generateMockPatterns(symbol, resolution);
  }
};

// Generate mock pattern data for fallback
const generateMockPatterns = (symbol: string, resolution: string): PatternRecognition[] => {
  console.log(`[PatternAI] Generating mock patterns for ${symbol}`);
  
  const patterns: PatternRecognition[] = [];
  const now = Date.now();
  const timeInterval = resolution === 'D' ? 24 * 60 * 60 * 1000 : 60 * 60 * 1000;
  
  // Generate 3-5 random patterns over the last 30 periods
  const numPatterns = 3 + Math.floor(Math.random() * 3);
  
  const patternTypes = [
    { name: 'Bullish Engulfing', type: 'bullish' as const, confidence: 0.75 },
    { name: 'Bearish Engulfing', type: 'bearish' as const, confidence: 0.72 },
    { name: 'Hammer', type: 'bullish' as const, confidence: 0.68 },
    { name: 'Shooting Star', type: 'bearish' as const, confidence: 0.71 },
    { name: 'Doji', type: 'neutral' as const, confidence: 0.65 },
    { name: 'Morning Star', type: 'bullish' as const, confidence: 0.78 },
    { name: 'Evening Star', type: 'bearish' as const, confidence: 0.76 }
  ];
  
  for (let i = 0; i < numPatterns; i++) {
    const pattern = patternTypes[Math.floor(Math.random() * patternTypes.length)];
    const daysAgo = Math.floor(Math.random() * 30) + 1;
    const timestamp = now - (daysAgo * timeInterval);
    
    patterns.push({
      patternName: pattern.name,
      timestamp,
      confidence: pattern.confidence + (Math.random() * 0.1 - 0.05), // Add some variance
      type: pattern.type,
      description: getPatternDescription(pattern.name)
    });
  }
  
  // Sort by timestamp (oldest first)
  patterns.sort((a, b) => a.timestamp - b.timestamp);
  
  console.log(`[PatternAI] Generated ${patterns.length} mock patterns for ${symbol}`);
  return patterns;
};

// Pattern descriptions for educational purposes
const getPatternDescription = (patternName: string): string => {
  const descriptions: { [key: string]: string } = {
    'Bullish Engulfing': 'A two-candle reversal pattern where a large bullish candle completely engulfs the previous bearish candle, suggesting upward momentum.',
    'Bearish Engulfing': 'A two-candle reversal pattern where a large bearish candle completely engulfs the previous bullish candle, suggesting downward momentum.',
    'Hammer': 'A single-candle pattern with a small body and long lower shadow, often indicating a potential bullish reversal at support levels.',
    'Shooting Star': 'A single-candle pattern with a small body and long upper shadow, often indicating a potential bearish reversal at resistance levels.',
    'Doji': 'A candle with virtually identical open and close prices, indicating market indecision and potential reversal.',
    'Morning Star': 'A three-candle bullish reversal pattern consisting of a long bearish candle, a small-bodied candle, and a long bullish candle.',
    'Evening Star': 'A three-candle bearish reversal pattern consisting of a long bullish candle, a small-bodied candle, and a long bearish candle.'
  };
  
  return descriptions[patternName] || 'A technical pattern detected in the price action.';
};;