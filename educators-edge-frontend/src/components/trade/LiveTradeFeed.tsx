import React, { useState, useEffect } from 'react';
import { Activity, ArrowUpRight, ArrowDownRight, Clock, Volume, DollarSign } from 'lucide-react';
import { MarketDataState } from '../../hooks/useMarketData';

interface TradeData {
  id: string;
  symbol: string;
  price: number;
  volume: number;
  side: 'buy' | 'sell';
  timestamp: number;
}

interface LiveTradeFeedProps {
  symbols: string[];
  marketData: { [symbol: string]: any };
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  maxTrades?: number;
  showVolume?: boolean;
}

export const LiveTradeFeed: React.FC<LiveTradeFeedProps> = ({ 
  symbols, 
  marketData,
  connectionStatus,
  maxTrades = 20,
  showVolume = true 
}) => {
  const [trades, setTrades] = useState<TradeData[]>([]);

  // Generate simulated trades based on market data updates
  useEffect(() => {
    const interval = setInterval(() => {
      if (connectionStatus !== 'connected' || symbols.length === 0) return;

      // Generate a random trade from the symbols
      const randomSymbol = symbols[Math.floor(Math.random() * symbols.length)];
      const symbolData = marketData[randomSymbol];
      
      if (!symbolData) return;

      const newTrade: TradeData = {
        id: `trade_${Date.now()}_${Math.random()}`,
        symbol: randomSymbol,
        price: symbolData.price + (Math.random() - 0.5) * 0.1, // Small price variation
        volume: Math.floor(Math.random() * 1000) + 100,
        side: Math.random() > 0.5 ? 'buy' : 'sell',
        timestamp: Date.now()
      };

      setTrades(prev => [newTrade, ...prev.slice(0, maxTrades - 1)]);
    }, 500 + Math.random() * 1500); // Random interval between 500ms and 2s

    return () => clearInterval(interval);
  }, [symbols, marketData, connectionStatus, maxTrades]);

  const formatPrice = (price: number): string => {
    return price.toFixed(2);
  };

  const formatVolume = (volume: number): string => {
    if (volume >= 1000000) {
      return `${(volume / 1000000).toFixed(1)}M`;
    } else if (volume >= 1000) {
      return `${(volume / 1000).toFixed(1)}K`;
    }
    return volume.toString();
  };

  const formatTimestamp = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 1000) return 'now';
    if (diff < 60000) return `${Math.floor(diff / 1000)}s`;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    return new Date(timestamp).toLocaleTimeString();
  };

  const getTradeIcon = (side: 'buy' | 'sell') => {
    return side === 'buy' 
      ? <ArrowUpRight className="w-4 h-4 text-green-400" />
      : <ArrowDownRight className="w-4 h-4 text-red-400" />;
  };

  const getTradeColor = (side: 'buy' | 'sell') => {
    return side === 'buy' ? 'text-green-400' : 'text-red-400';
  };

  if (symbols.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-slate-400">
        <p className="text-sm">No symbols to track</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-900/30 rounded-lg border border-slate-700">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-green-500" />
          <span className="text-white text-sm font-medium">Live Trades</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            connectionStatus === 'connected' ? 'bg-green-400' : 'bg-red-400'
          }`}></div>
          <span className="text-xs text-slate-400">{trades.length} trades</span>
        </div>
      </div>

      {/* Trade List */}
      <div className="flex-1 overflow-y-auto">
        {trades.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-400">
            <div className="text-center">
              <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">
                {connectionStatus === 'connected' ? 'Waiting for trades...' : 'Disconnected'}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {trades.map((trade, index) => (
              <div
                key={trade.id}
                className={`p-2 rounded border transition-all duration-300 ${
                  index === 0 
                    ? 'bg-slate-800/80 border-slate-600 shadow-md' 
                    : 'bg-slate-800/50 border-slate-700'
                }`}
                style={index === 0 ? {
                  animation: 'fadeInDown 300ms both'
                } : {}}
              >
                <div className="flex items-center justify-between">
                  {/* Symbol and Side */}
                  <div className="flex items-center gap-2">
                    {getTradeIcon(trade.side)}
                    <span className="text-white text-sm font-bold">
                      {trade.symbol}
                    </span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      trade.side === 'buy' 
                        ? 'bg-green-900/50 text-green-400' 
                        : 'bg-red-900/50 text-red-400'
                    }`}>
                      {trade.side.toUpperCase()}
                    </span>
                  </div>

                  {/* Timestamp */}
                  <div className="flex items-center gap-1 text-slate-400">
                    <Clock className="w-3 h-3" />
                    <span className="text-xs font-mono">
                      {formatTimestamp(trade.timestamp)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-1">
                  {/* Price */}
                  <div className="flex items-center gap-1">
                    <DollarSign className="w-3 h-3 text-slate-400" />
                    <span className={`text-sm font-mono font-bold ${getTradeColor(trade.side)}`}>
                      {formatPrice(trade.price)}
                    </span>
                  </div>

                  {/* Volume */}
                  {showVolume && (
                    <div className="flex items-center gap-1 text-slate-400">
                      <Volume className="w-3 h-3" />
                      <span className="text-xs font-mono">
                        {formatVolume(trade.volume)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-slate-700">
        <div className="flex justify-between items-center text-xs text-slate-400">
          <span>Tracking {symbols.join(', ')}</span>
          <span className="font-mono">{connectionStatus.toUpperCase()}</span>
        </div>
      </div>

      <style>{`
        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};