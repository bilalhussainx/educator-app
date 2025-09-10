import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, Volume2, Wifi, WifiOff } from 'lucide-react';
import { MarketData } from '../../hooks/useMarketData';

interface PriceTickerProps {
  symbols: string[];
  marketData: { [symbol: string]: MarketData };
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  onSymbolClick?: (symbol: string) => void;
  selectedSymbol?: string;
  updateInterval?: number;
}

export const PriceTicker: React.FC<PriceTickerProps> = ({ 
  symbols, 
  marketData,
  connectionStatus,
  onSymbolClick,
  selectedSymbol
}) => {
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

  const getPriceChangeColor = (change: number): string => {
    if (change > 0) return 'text-green-400';
    if (change < 0) return 'text-red-400';
    return 'text-slate-400';
  };

  const getPriceChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="w-3 h-3" />;
    if (change < 0) return <TrendingDown className="w-3 h-3" />;
    return null;
  };

  const sortedSymbols = useMemo(() => {
    return symbols.sort((a, b) => {
      // Put selected symbol first
      if (selectedSymbol) {
        if (a === selectedSymbol) return -1;
        if (b === selectedSymbol) return 1;
      }
      
      // Sort by absolute change percentage (most active first)
      const aData = marketData[a];
      const bData = marketData[b];
      
      if (!aData && !bData) return 0;
      if (!aData) return 1;
      if (!bData) return -1;
      
      return Math.abs(bData.changePercent) - Math.abs(aData.changePercent);
    });
  }, [symbols, marketData, selectedSymbol]);

  if (symbols.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400">
        <p className="text-sm">No symbols in watchlist</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-700">
        <div className="flex items-center gap-2">
          {connectionStatus === 'connected' ? (
            <Wifi className="h-3 w-3 text-green-400" />
          ) : (
            <WifiOff className="h-3 w-3 text-red-400" />
          )}
          <span className="text-xs text-slate-400">Live Prices</span>
        </div>
      </div>

      {/* Price List */}
      <div className="flex-1 space-y-2 overflow-y-auto">
        {sortedSymbols.map(symbol => {
          const data = marketData[symbol];
          const isSelected = selectedSymbol === symbol;
          
          return (
            <div
              key={symbol}
              onClick={() => onSymbolClick?.(symbol)}
              className={`p-2 rounded-lg border transition-all cursor-pointer ${
                isSelected 
                  ? 'bg-cyan-900/30 border-cyan-500/50' 
                  : 'bg-slate-800/50 border-slate-700 hover:bg-slate-800/70'
              }`}
            >
              {/* Symbol and Price */}
              <div className="flex justify-between items-start mb-1">
                <span className={`text-sm font-bold ${
                  isSelected ? 'text-cyan-400' : 'text-white'
                }`}>
                  {symbol}
                </span>
                <div className="text-right">
                  <div className={`text-sm font-mono font-bold ${
                    isSelected ? 'text-cyan-400' : 'text-white'
                  }`}>
                    {data ? `$${formatPrice(data.price)}` : '—'}
                  </div>
                </div>
              </div>

              {/* Change and Volume */}
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1">
                  {data && (
                    <>
                      {getPriceChangeIcon(data.changePercent)}
                      <span className={`text-xs font-mono ${getPriceChangeColor(data.changePercent)}`}>
                        {data.changePercent >= 0 ? '+' : ''}{data.changePercent.toFixed(2)}%
                      </span>
                    </>
                  )}
                </div>
                
                <div className="flex items-center gap-1 text-slate-400">
                  <Volume2 className="w-3 h-3" />
                  <span className="text-xs font-mono">
                    {data ? formatVolume(data.volume) : '—'}
                  </span>
                </div>
              </div>

              {/* Data freshness indicator */}
              {data && (
                <div className="mt-1 flex justify-end">
                  <div className={`w-1 h-1 rounded-full ${
                    Date.now() - data.lastUpdated < 5000 
                      ? 'bg-green-400' 
                      : 'bg-yellow-400'
                  }`}></div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer - Connection Status */}
      <div className="mt-3 pt-2 border-t border-slate-700">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">
            {Object.keys(marketData).length} active
          </span>
          <span className={`font-mono ${
            connectionStatus === 'connected' 
              ? 'text-green-400' 
              : connectionStatus === 'connecting'
              ? 'text-yellow-400'
              : 'text-red-400'
          }`}>
            {connectionStatus.toUpperCase()}
          </span>
        </div>
      </div>
    </div>
  );
};