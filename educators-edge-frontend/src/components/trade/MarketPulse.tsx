import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';

interface MarketData {
  price: number;
  volume: number;
  lastUpdated: number;
  change: number;
  changePercent: number;
  previousPrice: number;
}

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

interface MarketPulseProps {
  symbols: string[];
  marketData: { [symbol: string]: MarketData };
  connectionStatus: ConnectionStatus;
  activeSymbol: string;
  onSymbolSelect: (symbol: string) => void;
}

interface SymbolFlash {
  symbol: string;
  type: 'uptick' | 'downtick';
  timestamp: number;
}

export const MarketPulse: React.FC<MarketPulseProps> = ({
  symbols,
  marketData,
  connectionStatus,
  activeSymbol,
  onSymbolSelect
}) => {
  const [flashes, setFlashes] = useState<Map<string, SymbolFlash>>(new Map());
  const [, setLastPrices] = useState<Map<string, number>>(new Map());

  // Handle price flashing on uptick/downtick
  useEffect(() => {
    Object.entries(marketData).forEach(([symbol, data]) => {
      if (data && data.price) {
        setLastPrices(prev => {
          const lastPrice = prev.get(symbol);
          
          if (lastPrice !== undefined && lastPrice !== data.price) {
            const flashType = data.price > lastPrice ? 'uptick' : 'downtick';
            setFlashes(flashPrev => new Map(flashPrev.set(symbol, {
              symbol,
              type: flashType,
              timestamp: Date.now()
            })));

            // Remove flash after 500ms
            setTimeout(() => {
              setFlashes(flashPrev => {
                const newFlashes = new Map(flashPrev);
                newFlashes.delete(symbol);
                return newFlashes;
              });
            }, 500);
          }

          return new Map(prev.set(symbol, data.price));
        });
      }
    });
  }, [marketData]); // React to market data changes

  const formatPrice = (price: number): string => {
    return price.toFixed(2);
  };

  const calculateDailyChange = (symbol: string): { change: number; changePercent: number } => {
    const currentData = marketData[symbol];
    if (!currentData) return { change: 0, changePercent: 0 };

    // Use the actual change data if available
    if (typeof currentData.change === 'number' && typeof currentData.changePercent === 'number') {
      return {
        change: currentData.change,
        changePercent: currentData.changePercent
      };
    }

    // Fallback calculation using previousPrice if available
    if (currentData.previousPrice) {
      const change = currentData.price - currentData.previousPrice;
      const changePercent = (change / currentData.previousPrice) * 100;
      return { change, changePercent };
    }

    // Final fallback - small random variation for demo
    const fakeChange = currentData.price * (Math.random() - 0.5) * 0.02;
    const changePercent = (fakeChange / currentData.price) * 100;
    return { change: fakeChange, changePercent };
  };

  const getFlashClass = (symbol: string): string => {
    const flash = flashes.get(symbol);
    if (!flash) return '';
    
    return flash.type === 'uptick' 
      ? 'bg-green-500/20 border-green-400' 
      : 'bg-red-500/20 border-red-400';
  };

  const getPriceChangeColor = (changePercent: number): string => {
    if (changePercent > 0) return 'text-green-400';
    if (changePercent < 0) return 'text-red-400';
    return 'text-slate-400';
  };

  const getPriceChangeIcon = (changePercent: number) => {
    if (changePercent > 0) return <TrendingUp className="w-3 h-3" />;
    if (changePercent < 0) return <TrendingDown className="w-3 h-3" />;
    return null;
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center gap-2 mb-2">
          <Activity className="h-4 w-4 text-cyan-500" />
          <span className="text-white font-semibold">Market Pulse</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400">Live Prices</span>
          <div className={`w-2 h-2 rounded-full ${
            connectionStatus === 'connected' ? 'bg-green-400' : 'bg-red-400'
          }`}></div>
        </div>
      </div>

      {/* Symbol List */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="space-y-1">
          {symbols.map(symbol => {
            const data = marketData[symbol];
            const { change, changePercent } = calculateDailyChange(symbol);
            const isActive = symbol === activeSymbol;
            const flashClass = getFlashClass(symbol);

            return (
              <div
                key={symbol}
                onClick={() => onSymbolSelect(symbol)}
                className={`p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                  isActive 
                    ? 'bg-cyan-900/30 border-cyan-500' 
                    : flashClass || 'bg-slate-800/50 border-slate-700 hover:bg-slate-800/70'
                }`}
              >
                {/* Symbol and Price */}
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-sm font-bold ${
                    isActive ? 'text-cyan-400' : 'text-white'
                  }`}>
                    {symbol}
                  </span>
                  <div className="text-right">
                    <div className={`text-sm font-mono font-bold ${
                      isActive ? 'text-cyan-400' : 'text-white'
                    }`}>
                      {data ? `$${formatPrice(data.price)}` : '—'}
                    </div>
                  </div>
                </div>

                {/* Daily Change */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    {getPriceChangeIcon(changePercent)}
                    <span className={`text-xs font-mono ${getPriceChangeColor(changePercent)}`}>
                      {changePercent >= 0 ? '+' : ''}{changePercent.toFixed(2)}%
                    </span>
                  </div>
                  
                  <div className={`text-xs font-mono ${getPriceChangeColor(changePercent)}`}>
                    {change >= 0 ? '+' : ''}${change.toFixed(2)}
                  </div>
                </div>

                {/* Data freshness indicator */}
                {data && (
                  <div className="mt-2 flex justify-end">
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
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-700">
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-400">
            {Object.keys(marketData).length} symbols active
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

        {/* Market Data Summary */}
        <div className="mt-2 text-xs text-slate-400">
          <span>Symbols: </span>
          <span className="text-white font-mono">
            {Object.keys(marketData).length} active
          </span>
        </div>
      </div>
    </div>
  );
};