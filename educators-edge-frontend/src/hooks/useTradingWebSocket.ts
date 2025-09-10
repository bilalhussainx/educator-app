import { useState, useEffect, useRef, useCallback } from 'react';

interface WebSocketConfig {
  url: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

interface MarketData {
  symbol: string;
  price: number;
  volume: number;
  timestamp: number;
  previousPrice: number;
  change: number;
  changePercent: number;
}

interface TradeData {
  id: string;
  symbol: string;
  price: number;
  volume: number;
  timestamp: number;
  side: 'BUY' | 'SELL';
  conditions: string[];
}

interface CandleData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface DepthData {
  bids: Array<{ price: number; volume: number; total: number; orders: number }>;
  asks: Array<{ price: number; volume: number; total: number; orders: number }>;
  spread: number;
  spreadPercent: number;
  timestamp: number;
}

interface TradingWebSocketData {
  marketData: Record<string, MarketData>;
  trades: TradeData[];
  candles: Record<string, CandleData[]>;
  depth: Record<string, DepthData>;
  isConnected: boolean;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  subscribedSymbols: string[];
}

interface TradingWebSocketActions {
  subscribe: (symbol: string) => void;
  unsubscribe: (symbol: string) => void;
  subscribeToTrades: (symbol: string) => void;
  subscribeToCandles: (symbol: string, timeframe?: string) => void;
  subscribeToDepth: (symbol: string, levels?: number) => void;
  connect: () => void;
  disconnect: () => void;
}

export const useTradingWebSocket = (
  config: WebSocketConfig = { url: 'ws://localhost:10000/ws' }
): [TradingWebSocketData, TradingWebSocketActions] => {
  const [data, setData] = useState<TradingWebSocketData>({
    marketData: {},
    trades: [],
    candles: {},
    depth: {},
    isConnected: false,
    connectionStatus: 'disconnected',
    subscribedSymbols: []
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const subscriptionsRef = useRef<Set<string>>(new Set());

  const maxReconnectAttempts = config.maxReconnectAttempts || 5;
  const reconnectInterval = config.reconnectInterval || 3000;

  const updateConnectionStatus = useCallback((status: typeof data.connectionStatus) => {
    setData(prev => ({ ...prev, connectionStatus: status, isConnected: status === 'connected' }));
  }, []);

  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const message = JSON.parse(event.data);

      switch (message.type) {
        case 'ticker_update':
          setData(prev => ({
            ...prev,
            marketData: {
              ...prev.marketData,
              [message.data.symbol]: {
                ...message.data,
                change: message.data.price - (prev.marketData[message.data.symbol]?.price || message.data.price),
                changePercent: prev.marketData[message.data.symbol]?.price 
                  ? ((message.data.price - prev.marketData[message.data.symbol].price) / prev.marketData[message.data.symbol].price) * 100
                  : 0
              }
            }
          }));
          break;

        case 'trade_update':
          setData(prev => ({
            ...prev,
            trades: [message.data, ...prev.trades].slice(0, 1000) // Keep last 1000 trades
          }));
          break;

        case 'candle_update':
          setData(prev => {
            const symbol = message.data.symbol;
            const existingCandles = prev.candles[symbol] || [];
            const candleIndex = existingCandles.findIndex(
              c => c.timestamp === message.data.timestamp
            );
            
            let updatedCandles;
            if (candleIndex >= 0) {
              updatedCandles = [...existingCandles];
              updatedCandles[candleIndex] = message.data;
            } else {
              updatedCandles = [...existingCandles, message.data].slice(-500); // Keep last 500 candles
            }
            
            return {
              ...prev,
              candles: {
                ...prev.candles,
                [symbol]: updatedCandles
              }
            };
          });
          break;

        case 'depth_update':
          setData(prev => ({
            ...prev,
            depth: {
              ...prev.depth,
              [message.data.symbol]: message.data
            }
          }));
          break;

        case 'subscription_confirmed':
          console.log(`Subscription confirmed for ${message.symbol}`);
          break;

        case 'error':
          console.error('WebSocket error:', message.error);
          break;

        default:
          console.log('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    updateConnectionStatus('connecting');
    
    try {
      wsRef.current = new WebSocket(config.url);

      wsRef.current.onopen = () => {
        console.log('Trading WebSocket connected');
        updateConnectionStatus('connected');
        reconnectAttemptsRef.current = 0;

        // Re-subscribe to all symbols
        subscriptionsRef.current.forEach(subscription => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(subscription);
          }
        });
      };

      wsRef.current.onmessage = handleMessage;

      wsRef.current.onclose = (event) => {
        console.log('Trading WebSocket disconnected:', event.code, event.reason);
        updateConnectionStatus('disconnected');
        
        // Auto-reconnect logic
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          console.log(`Attempting to reconnect (${reconnectAttemptsRef.current}/${maxReconnectAttempts})...`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval * Math.pow(1.5, reconnectAttemptsRef.current - 1));
        } else {
          console.log('Max reconnection attempts reached');
          updateConnectionStatus('error');
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('Trading WebSocket error:', error);
        updateConnectionStatus('error');
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      updateConnectionStatus('error');
    }
  }, [config.url, handleMessage, updateConnectionStatus, maxReconnectAttempts, reconnectInterval]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    updateConnectionStatus('disconnected');
    subscriptionsRef.current.clear();
    setData(prev => ({ ...prev, subscribedSymbols: [] }));
  }, [updateConnectionStatus]);

  const sendMessage = useCallback((message: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const messageStr = JSON.stringify(message);
      wsRef.current.send(messageStr);
      subscriptionsRef.current.add(messageStr);
      return true;
    }
    return false;
  }, []);

  const subscribe = useCallback((symbol: string) => {
    const message = { type: 'subscribe_ticker', symbol: symbol.toUpperCase() };
    if (sendMessage(message)) {
      setData(prev => ({
        ...prev,
        subscribedSymbols: [...new Set([...prev.subscribedSymbols, symbol.toUpperCase()])]
      }));
    }
  }, [sendMessage]);

  const unsubscribe = useCallback((symbol: string) => {
    const message = { type: 'unsubscribe_ticker', symbol: symbol.toUpperCase() };
    if (sendMessage(message)) {
      setData(prev => ({
        ...prev,
        subscribedSymbols: prev.subscribedSymbols.filter(s => s !== symbol.toUpperCase())
      }));
    }
  }, [sendMessage]);

  const subscribeToTrades = useCallback((symbol: string) => {
    const message = { type: 'subscribe_trades', symbol: symbol.toUpperCase() };
    sendMessage(message);
  }, [sendMessage]);

  const subscribeToCandles = useCallback((symbol: string, timeframe: string = '1m') => {
    const message = { type: 'subscribe_candles', symbol: symbol.toUpperCase(), timeframe };
    sendMessage(message);
  }, [sendMessage]);

  const subscribeToDepth = useCallback((symbol: string, levels: number = 10) => {
    const message = { type: 'subscribe_depth', symbol: symbol.toUpperCase(), levels };
    sendMessage(message);
  }, [sendMessage]);

  // Auto-connect on hook initialization
  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  const actions: TradingWebSocketActions = {
    subscribe,
    unsubscribe,
    subscribeToTrades,
    subscribeToCandles,
    subscribeToDepth,
    connect,
    disconnect
  };

  return [data, actions];
};