/**
 * Mock Market Data Service
 * Generates realistic stock market data for development and testing
 */

export interface MarketTick {
  price: number;
  volume: number;
  lastUpdated: number;
  change: number;
  changePercent: number;
  previousPrice: number;
}

export interface CandlestickData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface StockProfile {
  symbol: string;
  basePrice: number;
  volatility: number;
  trendDirection: number; // -1 to 1
  volume: number;
}

class MockMarketDataService {
  private stocks: Map<string, StockProfile> = new Map();
  private marketData: Map<string, MarketTick> = new Map();
  private historicalData: Map<string, CandlestickData[]> = new Map();
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;
  private subscribers: Set<(data: Map<string, MarketTick>) => void> = new Set();

  constructor() {
    this.initializeStocks();
    this.generateHistoricalData();
  }

  private initializeStocks() {
    const profiles: StockProfile[] = [
      { symbol: 'AAPL', basePrice: 148.25, volatility: 0.02, trendDirection: 0.3, volume: 2500000 },
      { symbol: 'GOOGL', basePrice: 2743.50, volatility: 0.025, trendDirection: 0.1, volume: 1200000 },
      { symbol: 'MSFT', basePrice: 378.90, volatility: 0.018, trendDirection: 0.2, volume: 1800000 },
      { symbol: 'NVDA', basePrice: 875.30, volatility: 0.035, trendDirection: 0.5, volume: 3200000 },
      { symbol: 'TSLA', basePrice: 245.67, volatility: 0.04, trendDirection: -0.1, volume: 4100000 },
      { symbol: 'AMZN', basePrice: 151.94, volatility: 0.022, trendDirection: 0.15, volume: 2100000 },
      { symbol: 'META', basePrice: 484.20, volatility: 0.028, trendDirection: 0.25, volume: 1600000 },
      { symbol: 'NFLX', basePrice: 598.45, volatility: 0.03, trendDirection: -0.05, volume: 900000 }
    ];

    profiles.forEach(profile => {
      this.stocks.set(profile.symbol, profile);
      
      // Initialize market data
      const previousPrice = profile.basePrice * (0.98 + Math.random() * 0.04);
      const change = profile.basePrice - previousPrice;
      const changePercent = (change / previousPrice) * 100;
      
      this.marketData.set(profile.symbol, {
        price: profile.basePrice,
        volume: profile.volume + Math.floor(Math.random() * profile.volume * 0.5),
        lastUpdated: Date.now(),
        change,
        changePercent,
        previousPrice
      });
    });
  }

  private generateHistoricalData() {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const oneHour = 60 * 60 * 1000;

    this.stocks.forEach((profile, symbol) => {
      const data: CandlestickData[] = [];
      let currentPrice = profile.basePrice * (0.9 + Math.random() * 0.2);
      
      // Generate 30 days of hourly data
      for (let i = 30; i >= 0; i--) {
        for (let hour = 0; hour < 24; hour++) {
          const timestamp = now - (i * oneDay) + (hour * oneHour);
          
          // Generate price movement
          const volatilityFactor = profile.volatility * (0.5 + Math.random());
          const trendFactor = profile.trendDirection * 0.001;
          const randomFactor = (Math.random() - 0.5) * 2;
          
          const priceChange = currentPrice * (trendFactor + volatilityFactor * randomFactor);
          const newPrice = Math.max(currentPrice + priceChange, currentPrice * 0.95);
          
          const open = currentPrice;
          const close = newPrice;
          const high = Math.max(open, close) * (1 + Math.random() * 0.01);
          const low = Math.min(open, close) * (1 - Math.random() * 0.01);
          const volume = profile.volume * (0.5 + Math.random());
          
          data.push({
            timestamp,
            open,
            high,
            low,
            close,
            volume: Math.floor(volume)
          });
          
          currentPrice = newPrice;
        }
      }
      
      this.historicalData.set(symbol, data);
    });
  }

  private updatePrices() {
    this.stocks.forEach((profile, symbol) => {
      const currentData = this.marketData.get(symbol);
      if (!currentData) return;

      // Generate realistic price movement
      const volatilityFactor = profile.volatility * (0.5 + Math.random());
      const trendFactor = profile.trendDirection * 0.0005;
      const randomFactor = (Math.random() - 0.5) * 2;
      
      const priceChange = currentData.price * (trendFactor + volatilityFactor * randomFactor);
      const newPrice = Math.max(currentData.price + priceChange, currentData.price * 0.99);
      
      // Calculate change from previous close (simulated)
      const change = newPrice - currentData.previousPrice;
      const changePercent = (change / currentData.previousPrice) * 100;
      
      // Generate volume
      const volumeVariation = 0.8 + Math.random() * 0.4;
      const newVolume = Math.floor(profile.volume * volumeVariation);

      this.marketData.set(symbol, {
        price: newPrice,
        volume: newVolume,
        lastUpdated: Date.now(),
        change,
        changePercent,
        previousPrice: currentData.previousPrice
      });
    });

    // Notify subscribers
    console.log('[MockMarketData] 🔄 Updated prices, notifying', this.subscribers.size, 'subscribers');
    this.subscribers.forEach(callback => {
      callback(new Map(this.marketData));
    });
  }

  public start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('[MockMarketData] ✅ Starting simulated market data service');
    console.log('[MockMarketData] 📊 Tracking symbols:', Array.from(this.stocks.keys()));
    console.log('[MockMarketData] 💹 Initial market data:', Object.fromEntries(this.marketData));
    
    // Immediately send initial data to subscribers
    this.subscribers.forEach(callback => {
      callback(new Map(this.marketData));
    });
    
    // Update prices every 1-3 seconds
    const updateInterval = () => {
      this.updatePrices();
      const nextUpdate = 1000 + Math.random() * 2000;
      this.intervalId = setTimeout(updateInterval, nextUpdate);
    };
    
    updateInterval();
  }

  public stop() {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    if (this.intervalId) {
      clearTimeout(this.intervalId);
      this.intervalId = null;
    }
    console.log('[MockMarketData] Stopped simulated market data service');
  }

  public subscribe(callback: (data: Map<string, MarketTick>) => void) {
    this.subscribers.add(callback);
    // Immediately send current data
    callback(new Map(this.marketData));
    
    return () => {
      this.subscribers.delete(callback);
    };
  }

  public getCurrentData(): Map<string, MarketTick> {
    return new Map(this.marketData);
  }

  public getHistoricalData(symbol: string): CandlestickData[] {
    return this.historicalData.get(symbol) || [];
  }

  public getSymbolData(symbol: string): MarketTick | null {
    return this.marketData.get(symbol) || null;
  }

  public addWatchSymbol(symbol: string) {
    if (!this.stocks.has(symbol)) {
      // Add new symbol with default profile
      const basePrice = 100 + Math.random() * 400;
      this.stocks.set(symbol, {
        symbol,
        basePrice,
        volatility: 0.02 + Math.random() * 0.02,
        trendDirection: (Math.random() - 0.5) * 0.4,
        volume: 500000 + Math.random() * 2000000
      });
      
      const previousPrice = basePrice * (0.98 + Math.random() * 0.04);
      const change = basePrice - previousPrice;
      const changePercent = (change / previousPrice) * 100;
      
      this.marketData.set(symbol, {
        price: basePrice,
        volume: this.stocks.get(symbol)!.volume,
        lastUpdated: Date.now(),
        change,
        changePercent,
        previousPrice
      });
    }
  }
}

// Export singleton instance
export const mockMarketDataService = new MockMarketDataService();