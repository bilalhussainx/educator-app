import React from 'react';
import { CandlestickChart } from './CandlestickChart';
import { BarChart3 } from 'lucide-react';

interface MarketData {
  price: number;
  volume: number;
  timestamp: number;
  lastUpdated: number;
  change: number;
  changePercent: number;
  previousPrice: number;
}

interface TheStageProps {
  selectedSymbol: string;
  symbolData: MarketData | null;
  marketData: { [symbol: string]: MarketData };
  isConnected: boolean;
}

export const TheStage: React.FC<TheStageProps> = ({
  selectedSymbol,
  symbolData,
  marketData,
  isConnected,
}) => {
  const formatPrice = (price: number | undefined) => {
    return price ? `$${price.toFixed(2)}` : '$0.00';
  };

  const formatVolume = (volume: number | undefined) => {
    if (!volume) return '0';
    if (volume >= 1000000) return `${(volume / 1000000).toFixed(1)}M`;
    if (volume >= 1000) return `${(volume / 1000).toFixed(1)}K`;
    return volume.toString();
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header with Symbol Info */}
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold text-white">{selectedSymbol}</h2>
          <div className={`flex items-center gap-2 ${
            isConnected ? 'text-green-400' : 'text-red-400'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-green-400' : 'bg-red-400'
            }`}></div>
            <span className="text-sm">
              {isConnected ? 'Live' : 'Disconnected'}
            </span>
          </div>
        </div>
        
        {symbolData && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-slate-400">Price</span>
              <div className="text-white font-medium">
                {formatPrice(symbolData.price)}
              </div>
            </div>
            <div>
              <span className="text-slate-400">Volume</span>
              <div className="text-white font-medium">
                {formatVolume(symbolData.volume)}
              </div>
            </div>
            <div>
              <span className="text-slate-400">Updated</span>
              <div className="text-white font-medium">
                {symbolData.lastUpdated ? new Date(symbolData.lastUpdated).toLocaleTimeString() : 'Unknown'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Chart Area */}
      <div className="flex-1 p-4">
        {symbolData ? (
          <CandlestickChart 
            symbol={selectedSymbol}
            marketData={new Map(Object.entries(marketData))}
            connectionStatus={isConnected ? 'connected' : 'disconnected'}
            height={400}
            timeframe="1m"
          />
        ) : (
          <div className="h-full flex items-center justify-center bg-slate-800/50 rounded-lg border border-slate-600">
            <div className="text-center">
              <BarChart3 className="h-16 w-16 text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-300 mb-2">
                {isConnected ? 'Loading Chart Data' : 'No Connection'}
              </h3>
              <p className="text-slate-500">
                {isConnected 
                  ? `Waiting for ${selectedSymbol} data...`
                  : 'Please check your connection'
                }
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Quick Stats Footer */}
      <div className="p-4 border-t border-slate-700 bg-slate-900/30">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="text-center">
            <div className="text-slate-400">Symbols</div>
            <div className="text-white font-medium">{Object.keys(marketData).length}</div>
          </div>
          <div className="text-center">
            <div className="text-slate-400">Active</div>
            <div className="text-green-400 font-medium">
              {Object.values(marketData).filter(data => 
                Date.now() - data.lastUpdated < 60000
              ).length}
            </div>
          </div>
          <div className="text-center">
            <div className="text-slate-400">Avg Volume</div>
            <div className="text-white font-medium">
              {formatVolume(
                Object.values(marketData)
                  .reduce((sum, data) => sum + data.volume, 0) / Object.keys(marketData).length || 0
              )}
            </div>
          </div>
          <div className="text-center">
            <div className="text-slate-400">Status</div>
            <div className={`font-medium ${
              isConnected ? 'text-green-400' : 'text-red-400'
            }`}>
              {isConnected ? 'Online' : 'Offline'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};