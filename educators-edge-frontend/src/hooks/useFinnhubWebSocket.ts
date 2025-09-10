import { useState, useEffect, useRef, useCallback } from 'react';

export interface MarketData {
  price: number;
  volume: number;
  timestamp: number;
  lastUpdated: number;
  change: number;
  changePercent: number;
  previousPrice: number;
}

export interface LatestTrade {
  symbol: string;
  price: number;
  volume: number;
  timestamp: number;
}

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

export interface UseFinnhubWebSocketReturn {
  connectionStatus: ConnectionStatus;
  marketData: Map<string, MarketData>;
  latestTrade: LatestTrade | null;
  reconnect: () => void;
  subscribe: (symbol: string) => void;
  unsubscribe: (symbol: string) => void;
}

// Using your actual Finnhub API key
const FINNHUB_API_KEY = import.meta.env.VITE_FINNHUB_API_KEY || 'd3076l9r01qnmrsd9irgd3076l9r01qnmrsd9is0'; 
const FINNHUB_WS_URL = `wss://ws.finnhub.io?token=${FINNHUB_API_KEY}`;
// Smart market hours detection
const isMarketHours = () => {
  const now = new Date();
  const easternTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
  const hour = easternTime.getHours();
  const day = easternTime.getDay(); // 0 = Sunday, 6 = Saturday
  
  // Market is open Monday-Friday, 9:30 AM - 4:00 PM EST
  const isWeekday = day >= 1 && day <= 5;
  const isDuringMarketHours = (hour > 9 || (hour === 9 && easternTime.getMinutes() >= 30)) && hour < 16;
  
  return isWeekday && isDuringMarketHours;
};

// Check if we should use simulation mode
// Use simulation if markets are closed or if API key is missing
const shouldUseSimulation = !isMarketHours() || !FINNHUB_API_KEY || FINNHUB_API_KEY === 'your-api-key-here';
const USE_SIMULATION = shouldUseSimulation;

// Log market status with more details
console.log(`[Finnhub] Market hours: ${isMarketHours() ? 'OPEN' : 'CLOSED'}`);
console.log(`[Finnhub] API Key: ${FINNHUB_API_KEY ? 'Present' : 'Missing'}`);
console.log(`[Finnhub] Using ${USE_SIMULATION ? 'SIMULATION' : 'REAL'} mode`);

export const useFinnhubWebSocket = (
  initialSymbols: string[] = ['AAPL', 'GOOGL', 'MSFT', 'NVDA', 'TSLA', 'AMZN', 'META', 'NFLX']
): UseFinnhubWebSocketReturn => {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [marketData, setMarketData] = useState<Map<string, MarketData>>(new Map());
  const [latestTrade, setLatestTrade] = useState<LatestTrade | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const subscribedSymbolsRef = useRef<Set<string>>(new Set(initialSymbols));
  const maxReconnectAttempts = 10;

  const subscribe = useCallback((symbol: string) => {
    const upperSymbol = symbol.toUpperCase();
    subscribedSymbolsRef.current.add(upperSymbol);
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const message = JSON.stringify({
        type: 'subscribe',
        symbol: upperSymbol
      });
      wsRef.current.send(message);
      console.log(`[Finnhub] Subscribed to ${upperSymbol}`);
    }
  }, []);

  const unsubscribe = useCallback((symbol: string) => {
    const upperSymbol = symbol.toUpperCase();
    subscribedSymbolsRef.current.delete(upperSymbol);
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const message = JSON.stringify({
        type: 'unsubscribe',
        symbol: upperSymbol
      });
      wsRef.current.send(message);
      console.log(`[Finnhub] Unsubscribed from ${upperSymbol}`);
    }
  }, []);

  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const message = JSON.parse(event.data);
      console.log('[Finnhub] Raw message received:', message);
      
      // Handle ping messages
      if (message.type === 'ping') {
        console.log('[Finnhub] Ping received');
        return;
      }
      
      // Handle trade messages
      if (message.type === 'trade' && message.data && Array.isArray(message.data)) {
        console.log(`[Finnhub] Trade message with ${message.data.length} trades:`, message.data);
        
        message.data.forEach((trade: any) => {
          const { s: symbol, p: price, v: volume, t: timestamp } = trade;
          
          console.log(`[Finnhub] Processing trade:`, { symbol, price, volume, timestamp });
          
          if (symbol && price && typeof price === 'number') {
            // Get previous data to calculate change
            const prevData = marketData.get(symbol);
            const tradeData: MarketData = {
              price,
              volume: volume || 0,
              timestamp: timestamp || Date.now(),
              lastUpdated: Date.now(),
              change: prevData ? price - prevData.price : 0,
              changePercent: prevData && prevData.price ? ((price - prevData.price) / prevData.price) * 100 : 0,
              previousPrice: prevData?.price || price
            };

            // Update market data map
            setMarketData(prev => {
              const newMap = new Map(prev);
              newMap.set(symbol, tradeData);
              console.log(`[Finnhub] Updated market data for ${symbol}:`, tradeData);
              return newMap;
            });

            // Update latest trade
            setLatestTrade({
              symbol,
              price,
              volume: volume || 0,
              timestamp: timestamp || Date.now()
            });

            console.log(`[Finnhub] Trade update: ${symbol} @ $${price}`);
          } else {
            console.warn('[Finnhub] Invalid trade data:', trade);
          }
        });
      } else {
        console.log('[Finnhub] Non-trade message:', message);
      }
    } catch (error) {
      console.error('[Finnhub] Error parsing WebSocket message:', error, 'Raw data:', event.data);
    }
  }, []);

  // Simulation mode for when market is closed
  const startSimulation = useCallback(() => {
    console.log('[Finnhub] Starting simulation mode with realistic market data');
    console.log('[Finnhub] Subscribed symbols:', Array.from(subscribedSymbolsRef.current));
    setConnectionStatus('connected');
    
    // Initialize base prices for symbols (updated with current market prices)
    const basePrices: { [key: string]: number } = {
      'AAPL': 237.88,
      'GOOGL': 165.32,
      'MSFT': 419.58,
      'NVDA': 118.65,
      'TSLA': 241.85,
      'AMZN': 188.44,
      'META': 568.31,
      'NFLX': 701.35
    };

    // Initialize market data for all symbols
    subscribedSymbolsRef.current.forEach(symbol => {
      if (basePrices[symbol]) {
        const marketDataItem: MarketData = {
          price: basePrices[symbol],
          volume: Math.floor(Math.random() * 100000) + 10000,
          timestamp: Date.now(),
          lastUpdated: Date.now(),
          change: 0,
          changePercent: 0,
          previousPrice: basePrices[symbol]
        };
        
        setMarketData(prev => {
          const newMap = new Map(prev);
          newMap.set(symbol, marketDataItem);
          console.log(`[Finnhub Sim] Initialized ${symbol} with price $${marketDataItem.price.toFixed(2)}`);
          return newMap;
        });
      }
    });

    // Store current prices for updates
    let currentPrices = { ...basePrices };

    // Simulate price updates every 2-4 seconds with more realistic behavior
    const simulateUpdates = () => {
      const symbols = Array.from(subscribedSymbolsRef.current);
      if (symbols.length === 0) return;

      // Update multiple symbols per tick for more activity
      const updateCount = Math.min(3, symbols.length);
      for (let i = 0; i < updateCount; i++) {
        const randomSymbol = symbols[Math.floor(Math.random() * symbols.length)];
        
        if (currentPrices[randomSymbol]) {
          const basePrice = currentPrices[randomSymbol];
          const volatility = 0.003 + Math.random() * 0.004; // 0.3-0.7% volatility
          const priceChange = (Math.random() - 0.5) * volatility * basePrice;
          const newPrice = Math.max(0.01, basePrice + priceChange);
          
          // Update stored price
          currentPrices[randomSymbol] = newPrice;
          
          const prevData = marketData.get(randomSymbol);
          const updatedMarketData: MarketData = {
            price: newPrice,
            volume: Math.floor(Math.random() * 100000) + 10000,
            timestamp: Date.now(),
            lastUpdated: Date.now(),
            change: prevData ? newPrice - prevData.price : 0,
            changePercent: prevData && prevData.price ? ((newPrice - prevData.price) / prevData.price) * 100 : 0,
            previousPrice: prevData?.price || newPrice
          };

          setMarketData(prev => {
            const newMap = new Map(prev);
            newMap.set(randomSymbol, updatedMarketData);
            return newMap;
          });

          setLatestTrade({
            symbol: randomSymbol,
            price: newPrice,
            volume: updatedMarketData.volume,
            timestamp: updatedMarketData.timestamp
          });

          console.log(`[Finnhub Sim] ${randomSymbol} @ $${newPrice.toFixed(2)}`);
        }
      }

      // Schedule next update with some randomness
      setTimeout(simulateUpdates, 2000 + Math.random() * 2000);
    };

    // Start simulation after initial data is set
    setTimeout(simulateUpdates, 2000);
  }, []);

  const connect = useCallback(() => {
    if (USE_SIMULATION) {
      startSimulation();
      return;
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    // Clear any existing reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    setConnectionStatus('connecting');
    console.log('[Finnhub] Connecting to WebSocket...');
    console.log('[Finnhub] API Key check:', FINNHUB_API_KEY ? 'Present' : 'Missing');

    try {
      const ws = new WebSocket(FINNHUB_WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[Finnhub] WebSocket connected successfully');
        setConnectionStatus('connected');
        reconnectAttemptsRef.current = 0;

        // Subscribe to all symbols
        subscribedSymbolsRef.current.forEach(symbol => {
          const message = JSON.stringify({
            type: 'subscribe',
            symbol: symbol
          });
          ws.send(message);
          console.log(`[Finnhub] Subscribed to ${symbol}`);
        });

        // Add test message to verify connection
        console.log('[Finnhub] Connection established, waiting for trade messages...');
      };

      ws.onmessage = handleMessage;

      ws.onclose = (event) => {
        console.log(`[Finnhub] WebSocket closed:`, event.code, event.reason);
        setConnectionStatus('disconnected');

        // Only attempt reconnection if it wasn't a clean close and we haven't exceeded max attempts
        if (event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000); // Cap at 30 seconds
          reconnectAttemptsRef.current++;
          
          console.log(`[Finnhub] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          console.error('[Finnhub] Max reconnection attempts reached, switching to simulation mode');
          startSimulation();
        }
      };

      ws.onerror = () => {
        console.warn('[Finnhub] WebSocket connection failed - API may be unavailable');
        setConnectionStatus('disconnected');
        
        // Switch to simulation immediately on connection errors
        console.log('[Finnhub] Switching to simulation mode for reliable data');
        setTimeout(() => {
          startSimulation();
        }, 1000);
      };

    } catch (error) {
      console.error('[Finnhub] Failed to create WebSocket connection:', error);
      setConnectionStatus('disconnected');
    }
  }, [handleMessage]);

  const reconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    reconnectAttemptsRef.current = 0;
    connect();
  }, [connect]);

  // Fetch initial prices from REST API with proper rate limiting
  const fetchInitialPrices = useCallback(async () => {
    try {
      console.log('[Finnhub] Fetching initial prices from REST API...');
      
      for (const symbol of initialSymbols) {
        try {
          const response = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`);
          
          if (response.status === 429) {
            console.warn(`[Finnhub] Rate limit hit for ${symbol}, using fallback data`);
            // Use fallback prices instead of failing
            const fallbackPrices: { [key: string]: number } = {
              'AAPL': 237.88, 'GOOGL': 165.32, 'MSFT': 419.58, 'NVDA': 118.65,
              'TSLA': 241.85, 'AMZN': 188.44, 'META': 568.31, 'NFLX': 701.35
            };
            
            if (fallbackPrices[symbol]) {
              const marketDataItem: MarketData = {
                price: fallbackPrices[symbol],
                volume: Math.floor(Math.random() * 100000) + 10000,
                timestamp: Date.now(),
                lastUpdated: Date.now(),
                change: 0,
                changePercent: 0,
                previousPrice: fallbackPrices[symbol]
              };
              
              setMarketData(prev => {
                const newMap = new Map(prev);
                newMap.set(symbol, marketDataItem);
                return newMap;
              });
              
              console.log(`[Finnhub] Using fallback price for ${symbol}: $${fallbackPrices[symbol]}`);
            }
            continue;
          }
          
          const data = await response.json();
          
          if (data.c && typeof data.c === 'number') {
            const marketDataItem: MarketData = {
              price: data.c, // Current price
              volume: 0, // Volume not available in quote API
              timestamp: Date.now(),
              lastUpdated: Date.now(),
              change: 0,
              changePercent: 0,
              previousPrice: data.c
            };
            
            setMarketData(prev => {
              const newMap = new Map(prev);
              newMap.set(symbol, marketDataItem);
              return newMap;
            });
            
            console.log(`[Finnhub] Initial price for ${symbol}: $${data.c}`);
          }
          
          // Longer delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 300));
        } catch (error) {
          console.error(`[Finnhub] Failed to fetch price for ${symbol}:`, error);
        }
      }
    } catch (error) {
      console.error('[Finnhub] Failed to fetch initial prices:', error);
    }
  }, [initialSymbols]);

  // Initialize connection on mount
  useEffect(() => {
    // Start WebSocket connection first to avoid rate limiting issues
    // If WebSocket fails, it will fall back to simulation with realistic prices
    connect();
    
    // Only fetch REST API prices if WebSocket is successful
    const timeoutId = setTimeout(() => {
      if (connectionStatus === 'connected') {
        fetchInitialPrices();
      }
    }, 5000); // Wait 5 seconds for WebSocket to establish
    
    return () => {
      clearTimeout(timeoutId);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounting');
      }
    };
  }, [connect]);

  // Subscribe to initial symbols when connection is established
  useEffect(() => {
    if (connectionStatus === 'connected') {
      initialSymbols.forEach(symbol => {
        subscribe(symbol);
      });
    }
  }, [connectionStatus, initialSymbols, subscribe]);

  return {
    connectionStatus,
    marketData,
    latestTrade,
    reconnect,
    subscribe,
    unsubscribe
  };
};