import React, { useEffect, useRef, useState } from 'react';
import { BarChart3, ZoomIn, ZoomOut } from 'lucide-react';
import { MarketData, LatestTrade, ConnectionStatus } from '../../hooks/useFinnhubWebSocket';

interface CandleData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface LiveCandlestickChartProps {
  symbol: string;
  marketData: Map<string, MarketData>;
  connectionStatus: ConnectionStatus;
  latestTrade: LatestTrade | null;
}

export const LiveCandlestickChart: React.FC<LiveCandlestickChartProps> = ({
  symbol,
  marketData,
  connectionStatus,
  latestTrade
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [candleData, setCandleData] = useState<CandleData[]>([]);
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [lastMouseX, setLastMouseX] = useState(0);

  const currentSymbolData = marketData.get(symbol);

  // Generate initial historical data
  useEffect(() => {
    console.log(`[LiveChart] Generating historical data for ${symbol}, currentSymbolData:`, currentSymbolData);
    
    const generateHistoricalCandles = () => {
      const candles: CandleData[] = [];
      const now = Date.now();
      const oneMinute = 60 * 1000;
      let basePrice = currentSymbolData?.price || 150 + Math.random() * 50;
      
      console.log(`[LiveChart] Using base price: ${basePrice} for ${symbol}`);

      // Generate 200 historical candles
      for (let i = 199; i >= 0; i--) {
        const timestamp = now - (i * oneMinute);
        const volatility = 0.02;
        
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

        basePrice = close;
      }

      console.log(`[LiveChart] Generated ${candles.length} historical candles for ${symbol}`);
      return candles;
    };

    const newCandles = generateHistoricalCandles();
    setCandleData(newCandles);
    console.log(`[LiveChart] Set ${newCandles.length} candles for ${symbol}`);
  }, [symbol]);

  // Update with real-time data
  useEffect(() => {
    if (latestTrade && latestTrade.symbol === symbol) {
      const now = Date.now();
      const oneMinute = 60 * 1000;

      setCandleData(prev => {
        const newCandles = [...prev];
        
        if (newCandles.length > 0) {
          const lastCandle = newCandles[newCandles.length - 1];
          const timeSinceLastCandle = now - lastCandle.timestamp;

          if (timeSinceLastCandle < oneMinute) {
            // Update existing candle
            lastCandle.close = latestTrade.price;
            lastCandle.high = Math.max(lastCandle.high, latestTrade.price);
            lastCandle.low = Math.min(lastCandle.low, latestTrade.price);
            lastCandle.volume += latestTrade.volume;
          } else {
            // Create new candle
            newCandles.push({
              timestamp: now,
              open: latestTrade.price,
              high: latestTrade.price,
              low: latestTrade.price,
              close: latestTrade.price,
              volume: latestTrade.volume
            });

            // Keep last 200 candles
            if (newCandles.length > 200) {
              newCandles.shift();
            }
          }
        }

        return newCandles;
      });
    }
  }, [latestTrade, symbol]);

  // Drawing function
  const drawChart = () => {
    const canvas = canvasRef.current;
    if (!canvas || candleData.length === 0) {
      console.log(`[LiveChart] Cannot draw: canvas=${!!canvas}, candleData.length=${candleData.length}`);
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.log('[LiveChart] Cannot get canvas context');
      return;
    }
    
    console.log(`[LiveChart] Drawing ${candleData.length} candles for ${symbol}`);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calculate visible candles
    const visibleCandles = Math.min(candleData.length, Math.floor(100 / zoom));
    const startIndex = Math.max(0, candleData.length - visibleCandles + panOffset);
    const endIndex = Math.min(candleData.length, startIndex + visibleCandles);
    const visibleData = candleData.slice(startIndex, endIndex);

    if (visibleData.length === 0) return;

    // Calculate price range
    const prices = visibleData.flatMap(d => [d.high, d.low]);
    const maxPrice = Math.max(...prices);
    const minPrice = Math.min(...prices);
    const priceRange = maxPrice - minPrice;
    const padding = priceRange * 0.1;

    const chartHeight = canvas.height - 60; // Leave space for current price
    const candleWidth = canvas.width / visibleData.length;

    // Draw candles
    visibleData.forEach((candle, index) => {
      const x = index * candleWidth + candleWidth / 2;
      
      const highY = ((maxPrice + padding - candle.high) / (priceRange + padding * 2)) * chartHeight + 20;
      const lowY = ((maxPrice + padding - candle.low) / (priceRange + padding * 2)) * chartHeight + 20;
      const openY = ((maxPrice + padding - candle.open) / (priceRange + padding * 2)) * chartHeight + 20;
      const closeY = ((maxPrice + padding - candle.close) / (priceRange + padding * 2)) * chartHeight + 20;

      const isGreen = candle.close > candle.open;
      const color = isGreen ? '#22c55e' : '#ef4444';

      // Draw wick
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, highY);
      ctx.lineTo(x, lowY);
      ctx.stroke();

      // Draw body
      const bodyTop = Math.min(openY, closeY);
      const bodyHeight = Math.max(Math.abs(closeY - openY), 1);
      const bodyWidth = candleWidth * 0.6;

      ctx.fillStyle = color;
      ctx.fillRect(x - bodyWidth / 2, bodyTop, bodyWidth, bodyHeight);
    });

    // Draw current price line
    if (currentSymbolData) {
      const currentPriceY = ((maxPrice + padding - currentSymbolData.price) / (priceRange + padding * 2)) * chartHeight + 20;
      
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(0, currentPriceY);
      ctx.lineTo(canvas.width, currentPriceY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Price label
      ctx.fillStyle = '#06b6d4';
      ctx.font = '14px monospace';
      ctx.fillText(`$${currentSymbolData.price.toFixed(2)}`, 10, currentPriceY - 5);
    }

    // Draw price scale
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px monospace';
    const steps = 5;
    for (let i = 0; i <= steps; i++) {
      const price = minPrice + (priceRange * i / steps);
      const y = ((maxPrice + padding - price) / (priceRange + padding * 2)) * chartHeight + 20;
      ctx.fillText(`$${price.toFixed(2)}`, canvas.width - 80, y + 4);
    }
  };

  // Mouse handlers
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
  }, [candleData, zoom, panOffset, currentSymbolData]);

  // Set canvas size
  useEffect(() => {
    const resizeCanvas = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const pixelRatio = window.devicePixelRatio || 1;
      
      canvas.width = rect.width * pixelRatio;
      canvas.height = rect.height * pixelRatio;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(pixelRatio, pixelRatio);
      }
      
      // Redraw after resize
      drawChart();
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  return (
    <div className="h-full flex flex-col bg-slate-950">
      {/* Header */}
      <div className="h-12 bg-slate-900 border-b border-slate-700 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-cyan-500" />
          <span className="text-white font-semibold">{symbol} Chart</span>
          {currentSymbolData && (
            <span className="text-sm text-slate-400">
              ${currentSymbolData.price.toFixed(2)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoom(prev => Math.min(5, prev * 1.2))}
            className="p-1 text-slate-400 hover:text-white"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            onClick={() => setZoom(prev => Math.max(0.5, prev * 0.8))}
            className="p-1 text-slate-400 hover:text-white"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <div className={`w-2 h-2 rounded-full ${
            connectionStatus === 'connected' ? 'bg-green-400' : 'bg-red-400'
          }`}></div>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="flex-1 relative bg-slate-900">
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-crosshair"
          style={{ minHeight: '300px' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        />
        
        {/* Debug info */}
        <div className="absolute top-2 left-2 text-xs text-green-400 bg-slate-800/80 p-2 rounded">
          <div>Symbol: {symbol}</div>
          <div>Candles: {candleData.length}</div>
          <div>Status: {connectionStatus}</div>
          <div>Current Price: {currentSymbolData ? `$${currentSymbolData.price.toFixed(2)}` : 'N/A'}</div>
        </div>

        {/* Connection Status Overlay */}
        {connectionStatus !== 'connected' && (
          <div className="absolute inset-0 bg-slate-950/80 flex items-center justify-center">
            <div className="text-center">
              <div className="text-slate-400 mb-2">
                {connectionStatus === 'connecting' ? 'Connecting to market data...' : 'Market data disconnected'}
              </div>
              <div className="text-sm text-slate-500">
                Chart will update when connection is restored
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};