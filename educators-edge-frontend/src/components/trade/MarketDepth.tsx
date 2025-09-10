import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, TrendingUp, TrendingDown, Activity } from 'lucide-react';

interface OrderBookLevel {
  price: number;
  volume: number;
  total: number;
  orders: number;
}

interface MarketDepthData {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  spread: number;
  spreadPercent: number;
  timestamp: number;
}

interface MarketDepthProps {
  symbol: string;
  levels?: number;
}

export const MarketDepth: React.FC<MarketDepthProps> = ({ 
  symbol, 
  levels = 10 
}) => {
  const [depthData, setDepthData] = useState<MarketDepthData | null>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [maxVolume, setMaxVolume] = useState(0);
  const chartRef = useRef<HTMLCanvasElement>(null);

  const formatPrice = (price: number): string => {
    return price.toFixed(2);
  };

  const formatVolume = (volume: number): string => {
    if (volume >= 1000000) {
      return `${(volume / 1000000).toFixed(2)}M`;
    } else if (volume >= 1000) {
      return `${(volume / 1000).toFixed(1)}K`;
    }
    return volume.toLocaleString();
  };

  const connectWebSocket = () => {
    if (ws) ws.close();

    const websocket = new WebSocket(`ws://localhost:10000/ws`);
    
    websocket.onopen = () => {
      console.log('Connected to market depth WebSocket');
      setIsConnected(true);
      
      websocket.send(JSON.stringify({
        type: 'subscribe_depth',
        symbol: symbol,
        levels: levels
      }));
    };

    websocket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        if (message.type === 'depth_update') {
          const data: MarketDepthData = message.data;
          
          // Calculate cumulative volumes
          let bidTotal = 0;
          let askTotal = 0;
          
          const processedBids = data.bids.map(bid => {
            bidTotal += bid.volume;
            return { ...bid, total: bidTotal };
          });
          
          const processedAsks = data.asks.map(ask => {
            askTotal += ask.volume;
            return { ...ask, total: askTotal };
          });

          const processedData = {
            ...data,
            bids: processedBids,
            asks: processedAsks
          };

          setDepthData(processedData);
          
          // Update max volume for visualization
          const allVolumes = [...processedBids, ...processedAsks].map(level => level.volume);
          setMaxVolume(Math.max(...allVolumes));
        }
      } catch (error) {
        console.error('Error processing depth message:', error);
      }
    };

    websocket.onclose = () => {
      console.log('Market depth WebSocket disconnected');
      setIsConnected(false);
      setTimeout(() => connectWebSocket(), 3000);
    };

    websocket.onerror = (error) => {
      console.error('Market depth WebSocket error:', error);
    };

    setWs(websocket);
  };

  const drawDepthChart = () => {
    const canvas = chartRef.current;
    if (!canvas || !depthData) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const padding = 20;
    const chartWidth = (canvas.width - padding * 3) / 2;
    const chartHeight = canvas.height - padding * 2;

    // Draw bid side (left)
    const bidLevels = depthData.bids.slice(0, levels);
    bidLevels.forEach((bid, index) => {
      const barWidth = (bid.volume / maxVolume) * chartWidth;
      const y = padding + (index * (chartHeight / levels));
      const barHeight = chartHeight / levels - 2;

      // Draw bid bar
      ctx.fillStyle = '#10b98180';
      ctx.fillRect(padding + chartWidth - barWidth, y, barWidth, barHeight);

      // Draw bid border
      ctx.strokeStyle = '#10b981';
      ctx.strokeRect(padding + chartWidth - barWidth, y, barWidth, barHeight);
    });

    // Draw ask side (right)
    const askLevels = depthData.asks.slice(0, levels);
    askLevels.forEach((ask, index) => {
      const barWidth = (ask.volume / maxVolume) * chartWidth;
      const y = padding + (index * (chartHeight / levels));
      const barHeight = chartHeight / levels - 2;
      const x = padding * 2 + chartWidth;

      // Draw ask bar
      ctx.fillStyle = '#ef444480';
      ctx.fillRect(x, y, barWidth, barHeight);

      // Draw ask border
      ctx.strokeStyle = '#ef4444';
      ctx.strokeRect(x, y, barWidth, barHeight);
    });

    // Draw center line
    ctx.strokeStyle = '#6b7280';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding + chartWidth + padding / 2, padding);
    ctx.lineTo(padding + chartWidth + padding / 2, canvas.height - padding);
    ctx.stroke();
  };

  useEffect(() => {
    connectWebSocket();
    return () => {
      if (ws) ws.close();
    };
  }, [symbol]);

  useEffect(() => {
    drawDepthChart();
  }, [depthData, maxVolume]);

  if (!depthData) {
    return (
      <div className="bg-slate-900/50 border-slate-700 rounded-lg p-4 h-full">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="w-5 h-5 text-cyan-500" />
          <h3 className="text-white font-semibold">Market Depth</h3>
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
        </div>
        <div className="flex items-center justify-center h-32">
          <div className="text-center">
            <div className="animate-spin h-6 w-6 border-2 border-cyan-500 border-t-transparent rounded-full mx-auto mb-2"></div>
            <div className="text-slate-400">Loading market depth...</div>
          </div>
        </div>
      </div>
    );
  }

  const bestBid = depthData.bids[0];
  const bestAsk = depthData.asks[0];
  const midPrice = (bestBid.price + bestAsk.price) / 2;

  return (
    <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4 h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-cyan-500" />
          <h3 className="text-white font-semibold">
            Depth - {symbol}
          </h3>
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="text-center">
            <div className="text-slate-400">Spread</div>
            <div className="font-mono font-medium text-white">
              ${formatPrice(depthData.spread)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-slate-400">Mid</div>
            <div className="font-mono font-medium text-cyan-400">
              ${formatPrice(midPrice)}
            </div>
          </div>
        </div>
      </div>

      {/* Visual Chart */}
      <div className="mb-3">
        <canvas
          ref={chartRef}
          width={400}
          height={120}
          className="w-full border border-slate-600 rounded bg-slate-800/50"
        />
        <div className="flex justify-between items-center mt-1 text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-400 rounded"></div>
            <span>Bids</span>
          </span>
          <span className="flex items-center gap-1">
            <span>Asks</span>
            <div className="w-2 h-2 bg-red-400 rounded"></div>
          </span>
        </div>
      </div>

      {/* Order Book Table */}
      <div className="grid grid-cols-2 gap-2">
        {/* Bids */}
        <div>
          <div className="flex items-center gap-1 mb-2">
            <TrendingUp className="w-3 h-3 text-green-500" />
            <h4 className="text-xs font-medium text-green-400">Bids</h4>
          </div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            <div className="grid grid-cols-2 gap-1 text-xs font-medium text-slate-500 pb-1 border-b border-slate-600">
              <div>Price</div>
              <div>Volume</div>
            </div>
            {depthData.bids.slice(0, Math.min(levels, 6)).map((bid, index) => (
              <div
                key={index}
                className="grid grid-cols-2 gap-1 text-xs py-0.5 hover:bg-green-900/20 rounded"
                style={{
                  background: `linear-gradient(to right, transparent ${100 - (bid.volume / maxVolume) * 30}%, rgba(16, 185, 129, 0.1) ${100 - (bid.volume / maxVolume) * 30}%)`
                }}
              >
                <div className="font-mono text-green-400">
                  ${formatPrice(bid.price)}
                </div>
                <div className="text-slate-300">
                  {formatVolume(bid.volume)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Asks */}
        <div>
          <div className="flex items-center gap-1 mb-2">
            <TrendingDown className="w-3 h-3 text-red-500" />
            <h4 className="text-xs font-medium text-red-400">Asks</h4>
          </div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            <div className="grid grid-cols-2 gap-1 text-xs font-medium text-slate-500 pb-1 border-b border-slate-600">
              <div>Price</div>
              <div>Volume</div>
            </div>
            {depthData.asks.slice(0, Math.min(levels, 6)).map((ask, index) => (
              <div
                key={index}
                className="grid grid-cols-2 gap-1 text-xs py-0.5 hover:bg-red-900/20 rounded"
                style={{
                  background: `linear-gradient(to left, transparent ${100 - (ask.volume / maxVolume) * 30}%, rgba(239, 68, 68, 0.1) ${100 - (ask.volume / maxVolume) * 30}%)`
                }}
              >
                <div className="font-mono text-red-400">
                  ${formatPrice(ask.price)}
                </div>
                <div className="text-slate-300">
                  {formatVolume(ask.volume)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Best Bid/Ask Summary */}
      <div className="mt-3 p-2 bg-slate-800/50 rounded grid grid-cols-2 gap-2">
        <div className="text-center">
          <div className="text-xs text-slate-400">Best Bid</div>
          <div className="text-sm font-mono font-bold text-green-400">
            ${formatPrice(bestBid.price)}
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs text-slate-400">Best Ask</div>
          <div className="text-sm font-mono font-bold text-red-400">
            ${formatPrice(bestAsk.price)}
          </div>
        </div>
      </div>
    </div>
  );
};