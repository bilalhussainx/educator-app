import React, { useEffect, useRef, useState } from 'react';
import { BarChart3, Activity } from 'lucide-react';
import { MarketData } from '../../hooks/useFinnhubWebSocket';

interface CandleData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface CandlestickChartProps {
  symbol: string;
  marketData: Map<string, MarketData>;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  timeframe?: string;
  height?: number;
}

export const CandlestickChart: React.FC<CandlestickChartProps> = ({
  symbol,
  marketData,
  connectionStatus,
  timeframe: _ = '1m',
  height = 400
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [candleData, setCandleData] = useState<CandleData[]>([]);
  const [showVolume, setShowVolume] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState(0);

  // Mouse interaction state
  const [isDragging, setIsDragging] = useState(false);
  const [lastMouseX, setLastMouseX] = useState(0);

  // Get current market data for the symbol with safe access
  const currentMarketData = marketData?.get(symbol);

  // Generate simulated historical data and update with real-time ticks
  useEffect(() => {
    // Generate initial historical candles (simulated data)
    const generateHistoricalData = () => {
      const candles: CandleData[] = [];
      const now = Date.now();
      const oneMinute = 60 * 1000;
      let basePrice = 150; // Default base price
      
      // Generate 100 historical candles
      for (let i = 99; i >= 0; i--) {
        const timestamp = now - (i * oneMinute);
        const volatility = 0.02; // 2% volatility
        
        const priceChange = (Math.random() - 0.5) * volatility * basePrice;
        const open = basePrice;
        const close = open + priceChange;
        const high = Math.max(open, close) + Math.random() * 0.01 * basePrice;
        const low = Math.min(open, close) - Math.random() * 0.01 * basePrice;
        const volume = Math.random() * 1000000;
        
        candles.push({
          timestamp,
          open,
          high,
          low,
          close,
          volume
        });
        
        basePrice = close; // Next candle starts where this one ended
      }
      
      return candles;
    };

    setCandleData(generateHistoricalData());
  }, [symbol]); // Only depend on symbol, not currentMarketData

  // Update chart with real-time market data
  useEffect(() => {
    if (!currentMarketData || !currentMarketData.price || !currentMarketData.timestamp) return;

    setCandleData(prev => {
      const newCandles = [...prev];
      const now = Date.now();
      const oneMinute = 60 * 1000;
      
      // Update the most recent candle or create a new one
      if (newCandles.length > 0) {
        const lastCandle = newCandles[newCandles.length - 1];
        const timeSinceLastCandle = now - lastCandle.timestamp;
        
        if (timeSinceLastCandle < oneMinute) {
          // Update existing candle
          lastCandle.close = currentMarketData.price;
          lastCandle.high = Math.max(lastCandle.high, currentMarketData.price);
          lastCandle.low = Math.min(lastCandle.low, currentMarketData.price);
          lastCandle.volume += currentMarketData.volume || 0;
        } else {
          // Create new candle
          newCandles.push({
            timestamp: now,
            open: currentMarketData.price,
            high: currentMarketData.price,
            low: currentMarketData.price,
            close: currentMarketData.price,
            volume: currentMarketData.volume || 0
          });
          
          // Keep only last 100 candles
          if (newCandles.length > 100) {
            newCandles.shift();
          }
        }
      }
      
      return newCandles;
    });
  }, [currentMarketData?.price, currentMarketData?.timestamp]); // Only depend on specific properties that matter

  // Drawing functions
  const drawChart = () => {
    const canvas = canvasRef.current;
    if (!canvas || candleData.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calculate dimensions
    const chartHeight = showVolume ? canvas.height * 0.7 : canvas.height;
    const volumeHeight = showVolume ? canvas.height * 0.3 : 0;
    
    // Calculate price range
    const prices = candleData.flatMap(d => [d.high, d.low]);
    const maxPrice = Math.max(...prices);
    const minPrice = Math.min(...prices);
    const priceRange = maxPrice - minPrice;

    // Calculate visible candles based on zoom and pan
    const visibleCandles = Math.min(candleData.length, Math.floor(50 / zoom));
    const startIndex = Math.max(0, candleData.length - visibleCandles + panOffset);
    const endIndex = Math.min(candleData.length, startIndex + visibleCandles);
    const visibleData = candleData.slice(startIndex, endIndex);

    if (visibleData.length === 0) return;

    const candleWidth = canvas.width / visibleData.length;
    const wickWidth = 2;

    // Draw candles
    visibleData.forEach((candle, index) => {
      const x = index * candleWidth + candleWidth / 2;
      
      // Calculate y positions
      const highY = ((maxPrice - candle.high) / priceRange) * chartHeight;
      const lowY = ((maxPrice - candle.low) / priceRange) * chartHeight;
      const openY = ((maxPrice - candle.open) / priceRange) * chartHeight;
      const closeY = ((maxPrice - candle.close) / priceRange) * chartHeight;

      const isGreen = candle.close > candle.open;
      const color = isGreen ? '#22c55e' : '#ef4444';

      // Draw wick
      ctx.strokeStyle = color;
      ctx.lineWidth = wickWidth;
      ctx.beginPath();
      ctx.moveTo(x, highY);
      ctx.lineTo(x, lowY);
      ctx.stroke();

      // Draw body
      const bodyTop = Math.min(openY, closeY);
      const bodyHeight = Math.abs(closeY - openY);
      const bodyWidth = candleWidth * 0.6;

      ctx.fillStyle = color;
      ctx.fillRect(x - bodyWidth / 2, bodyTop, bodyWidth, bodyHeight);

      // Draw volume bar if enabled
      if (showVolume) {
        const maxVolume = Math.max(...visibleData.map(d => d.volume));
        const volumeBarHeight = (candle.volume / maxVolume) * volumeHeight;
        const volumeY = chartHeight + volumeHeight - volumeBarHeight;

        ctx.fillStyle = `${color}80`; // Semi-transparent
        ctx.fillRect(x - bodyWidth / 2, volumeY, bodyWidth, volumeBarHeight);
      }
    });

    // Draw price levels and current price line
    if (currentMarketData) {
      const currentPriceY = ((maxPrice - currentMarketData.price) / priceRange) * chartHeight;
      
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(0, currentPriceY);
      ctx.lineTo(canvas.width, currentPriceY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw price label
      ctx.fillStyle = '#06b6d4';
      ctx.font = '12px monospace';
      ctx.fillText(`$${currentMarketData.price.toFixed(2)}`, 10, currentPriceY - 5);
    }
  };

  // Mouse event handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setLastMouseX(e.clientX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    
    const deltaX = e.clientX - lastMouseX;
    setPanOffset(prev => Math.max(-candleData.length + 10, Math.min(0, prev + Math.floor(deltaX / 10))));
    setLastMouseX(e.clientX);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => Math.max(0.5, Math.min(5, prev * zoomFactor)));
  };

  useEffect(() => {
    drawChart();
  }, [candleData, zoom, panOffset, showVolume, currentMarketData?.price]);

  // Set canvas size
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    }
  }, [height]);

  const getConnectionIndicator = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Activity className="h-4 w-4 text-green-400" />;
      case 'connecting':
        return <Activity className="h-4 w-4 text-yellow-400 animate-spin" />;
      default:
        return <Activity className="h-4 w-4 text-red-400" />;
    }
  };

  return (
    <div className="h-full w-full bg-slate-900/30 rounded-lg border border-slate-700 overflow-hidden">
      {/* Chart Header */}
      <div className="flex justify-between items-center p-3 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-cyan-500" />
          <span className="text-white font-medium">{symbol}</span>
          {currentMarketData && currentMarketData.changePercent !== undefined && (
            <span className={`text-sm font-mono ${
              currentMarketData.changePercent >= 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              {currentMarketData.changePercent >= 0 ? '+' : ''}{currentMarketData.changePercent.toFixed(2)}%
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {getConnectionIndicator()}
          <button
            onClick={() => setShowVolume(!showVolume)}
            className={`text-xs px-2 py-1 rounded ${
              showVolume ? 'bg-cyan-900/50 text-cyan-400' : 'bg-slate-800 text-slate-400'
            }`}
          >
            Volume
          </button>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="relative h-[calc(100%-60px)]">
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-crosshair"
          style={{ height: `${height}px` }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        />
        
        {/* Loading overlay */}
        {connectionStatus !== 'connected' && (
          <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center">
            <div className="text-center">
              <div className="text-slate-400 mb-2">
                {connectionStatus === 'connecting' ? 'Connecting to market data...' : 'Market data disconnected'}
              </div>
              {candleData.length === 0 && (
                <div className="text-sm text-slate-500">
                  Chart will populate when connection is established
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};