// Compatibility shim for useMarketData - now uses SimulationContext
import { useSimulation } from '../context/SimulationContext';

export interface MarketData {
  price: number;
  volume: number;
  lastUpdated: number;
  change: number;
  changePercent: number;
  previousPrice: number;
}

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export const useMarketData = () => {
  const { marketData, isConnected } = useSimulation();

  // Transform SimulationContext data to match old interface
  const transformedMarketData = new Map<string, MarketData>();
  
  Object.entries(marketData).forEach(([symbol, data]) => {
    transformedMarketData.set(symbol, {
      price: data.close,
      volume: data.volume,
      lastUpdated: Date.now(),
      change: data.close - data.open,
      changePercent: ((data.close - data.open) / data.open) * 100,
      previousPrice: data.open
    });
  });

  const connectionStatus: ConnectionStatus = isConnected ? 'connected' : 'disconnected';

  return {
    marketData: transformedMarketData,
    connectionStatus,
    isConnected,
    subscribe: (symbol: string) => {}, // No-op, subscription handled by SimulationContext
    unsubscribe: (symbol: string) => {}, // No-op
    getSymbolData: (symbol: string) => transformedMarketData.get(symbol) || null
  };
};