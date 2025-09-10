import React, { useState } from 'react';
import { useFinnhubWebSocket } from '../hooks/useFinnhubWebSocket';
import { usePortfolio } from '../hooks/usePortfolio';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Wifi, WifiOff, Activity, AlertCircle } from 'lucide-react';

// Import our rebuilt components
import { MarketPulse } from '../components/trade/MarketPulse';
import { TabbedChartContainer } from '../components/trade/TabbedChartContainer';
import { LivePortfolio } from '../components/trade/LivePortfolio';
import { TradingCockpit } from '../components/trade/TradingCockpit';

/**
 * Zenith Trade Command Center
 * 
 * Single, definitive trading interface with three-column layout:
 * - Market Pulse (280px): Live price ticker with symbol selection
 * - The Stage (flexible): Chart + Portfolio with real-time updates
 * - The Cockpit (320px): Quick trade execution panel
 */
const TradingTerminalPage: React.FC = () => {
  // Initialize real-time market data connection
  const { 
    connectionStatus, 
    marketData, 
    latestTrade, 
    reconnect
  } = useFinnhubWebSocket();

  // Portfolio data
  const { portfolioData, loading: portfolioLoading, executeOrder } = usePortfolio();

  // Active symbol state
  const [activeSymbol, setActiveSymbol] = useState('AAPL');
  
  // Available symbols for trading
  const availableSymbols = ['AAPL', 'GOOGL', 'MSFT', 'NVDA', 'TSLA', 'AMZN', 'META', 'NFLX'];

  // Connection status indicator
  const getConnectionIndicator = () => {
    switch (connectionStatus) {
      case 'connected':
        return {
          icon: <Wifi className="h-4 w-4" />,
          color: 'text-green-400 border-green-400',
          text: 'Connected'
        };
      case 'connecting':
        return {
          icon: <Activity className="h-4 w-4 animate-spin" />,
          color: 'text-yellow-400 border-yellow-400',
          text: 'Connecting'
        };
      case 'disconnected':
        return {
          icon: <WifiOff className="h-4 w-4" />,
          color: 'text-red-400 border-red-400',
          text: 'Disconnected'
        };
      default:
        return {
          icon: <AlertCircle className="h-4 w-4" />,
          color: 'text-red-400 border-red-400',
          text: 'Error'
        };
    }
  };

  const statusInfo = getConnectionIndicator();

  if (portfolioLoading) {
    return (
      <div className="h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-cyan-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-white">Initializing Zenith Trade Command Center...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-950 overflow-hidden flex flex-col">
      {/* Global Header */}
      <div className="h-16 bg-slate-900 border-b border-slate-700 flex items-center justify-between px-6">
        <div>
          <h1 className="text-xl font-bold text-white">Zenith Trade Command Center</h1>
          <p className="text-xs text-slate-400">Professional Trading Terminal</p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Global Symbol Selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">Active Symbol:</span>
            <Select value={activeSymbol} onValueChange={setActiveSymbol}>
              <SelectTrigger className="w-24 bg-slate-800 border-slate-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableSymbols.map(symbol => (
                  <SelectItem key={symbol} value={symbol}>
                    {symbol}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Current Price Display */}
          {marketData.has(activeSymbol) && (
            <div className="bg-slate-800/50 rounded-lg px-3 py-1">
              <div className="text-white text-lg font-bold font-mono">
                ${marketData.get(activeSymbol)?.price.toFixed(2)}
              </div>
            </div>
          )}

          {/* Global Connection Status */}
          <Badge variant="outline" className={statusInfo.color}>
            <div className="flex items-center gap-1">
              {statusInfo.icon}
              {statusInfo.text}
            </div>
          </Badge>

          {/* Reconnect Button */}
          {connectionStatus === 'disconnected' && (
            <button
              onClick={reconnect}
              className="text-xs px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded"
            >
              Reconnect
            </button>
          )}
        </div>
      </div>

      {/* Three-Column Command Center Layout */}
      <div className="flex-1 grid grid-cols-[280px_1fr_320px] gap-0 overflow-hidden">
        {/* Column 1: Market Pulse (280px) */}
        <div className="bg-slate-900 border-r border-slate-700 overflow-hidden">
          <MarketPulse
            symbols={availableSymbols}
            marketData={Object.fromEntries(marketData)}
            connectionStatus={connectionStatus}
            activeSymbol={activeSymbol}
            onSymbolSelect={setActiveSymbol}
          />
        </div>

        {/* Column 2: The Stage (Flexible) */}
        <div className="bg-slate-950 overflow-hidden flex flex-col">
          {/* Top Half: Chart */}
          <div className="h-2/3 border-b border-slate-700">
            <TabbedChartContainer
              symbol={activeSymbol}
              marketData={marketData}
              connectionStatus={connectionStatus}
              latestTrade={latestTrade}
              height={400}
            />
          </div>

          {/* Bottom Half: Portfolio */}
          <div className="h-1/3">
            <LivePortfolio
              portfolioData={portfolioData}
              marketData={marketData}
              connectionStatus={connectionStatus}
              activeSymbol={activeSymbol}
            />
          </div>
        </div>

        {/* Column 3: The Cockpit (320px) */}
        <div className="bg-slate-900 border-l border-slate-700 overflow-hidden">
          <TradingCockpit
            activeSymbol={activeSymbol}
            availableSymbols={availableSymbols}
            marketData={marketData}
            portfolioData={portfolioData}
            connectionStatus={connectionStatus}
            onSymbolChange={setActiveSymbol}
            executeOrder={executeOrder}
          />
        </div>
      </div>
    </div>
  );
};

export default TradingTerminalPage;