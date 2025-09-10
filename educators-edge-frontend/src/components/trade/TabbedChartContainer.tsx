import React, { useState, useEffect } from 'react';
import { TrendingUp, BarChart3, Activity, TrendingDown, Volume2, Target } from 'lucide-react';
import { fetchOHLCData } from '../../services/finnhubService';
import { mockMarketDataService } from '../../services/mockMarketDataService';
import { MarketData, LatestTrade, ConnectionStatus } from '../../hooks/useFinnhubWebSocket';
import { OHLCData } from '../../types';

export type ChartType = 'candlestick' | 'line' | 'area' | 'volume';

interface TabbedChartContainerProps {
  symbol: string;
  marketData: Map<string, MarketData>;
  connectionStatus: ConnectionStatus;
  height?: number;
}

interface Tab {
  id: ChartType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const CHART_TABS: Tab[] = [
  { id: 'candlestick', label: 'Candlestick', icon: BarChart3, color: 'text-cyan-400' },
  { id: 'line', label: 'Line Chart', icon: TrendingUp, color: 'text-green-400' },
  { id: 'area', label: 'Area Chart', icon: Activity, color: 'text-blue-400' },
  { id: 'volume', label: 'Volume', icon: Volume2, color: 'text-purple-400' },
];

export const TabbedChartContainer: React.FC<TabbedChartContainerProps> = ({
  symbol,
  marketData,
  connectionStatus,
  height = 400
}) => {
  const [activeTab, setActiveTab] = useState<ChartType>('candlestick');
  const [ohlcData, setOhlcData] = useState<OHLCData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUsingFallbackData, setIsUsingFallbackData] = useState(false);

  const currentMarketData = marketData.get(symbol);

  // Fetch OHLC data when symbol changes
  useEffect(() => {
    const loadOHLCData = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log(`[TabbedChart] Loading OHLC data for ${symbol}`);
        
        // Try to get historical data from mock service first
        const mockData = mockMarketDataService.getHistoricalData(symbol);
        
        if (mockData && mockData.length > 0) {
          // Convert mock data format to OHLC format
          const convertedData: OHLCData[] = mockData.map(item => ({
            timestamp: item.timestamp,
            open: item.open,
            high: item.high,
            low: item.low,
            close: item.close,
            volume: item.volume
          }));
          
          setOhlcData(convertedData);
          setIsUsingFallbackData(true);
          console.log(`[TabbedChart] Loaded ${convertedData.length} data points for ${symbol} (SIMULATED data from mock service)`);
        } else {
          // Fallback to external API
          try {
            const data = await fetchOHLCData(symbol, 'D'); // Daily resolution
            setOhlcData(data);
            setIsUsingFallbackData(false);
            console.log(`[TabbedChart] Loaded ${data.length} data points for ${symbol} (REAL data from API)`);
          } catch (apiError) {
            console.error(`[TabbedChart] API fetch failed, using mock data:`, apiError);
            // Generate some basic mock data if both mock service and API fail
            const basicMockData = generateBasicMockData(symbol);
            setOhlcData(basicMockData);
            setIsUsingFallbackData(true);
            console.log(`[TabbedChart] Generated ${basicMockData.length} basic mock data points for ${symbol}`);
          }
        }
      } catch (err) {
        console.error(`[TabbedChart] Error loading OHLC data for ${symbol}:`, err);
        setError('Failed to load chart data');
      } finally {
        setLoading(false);
      }
    };

    loadOHLCData();
  }, [symbol]);

  // Generate basic mock data as last resort
  const generateBasicMockData = (symbol: string): OHLCData[] => {
    const data: OHLCData[] = [];
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    let price = 100 + Math.random() * 300; // Random base price
    
    for (let i = 48; i >= 0; i--) { // 48 hours of data
      const timestamp = now - (i * oneHour);
      const open = price;
      const change = (Math.random() - 0.5) * price * 0.02; // 2% max change
      const close = Math.max(price + change, price * 0.95);
      const high = Math.max(open, close) * (1 + Math.random() * 0.01);
      const low = Math.min(open, close) * (1 - Math.random() * 0.01);
      const volume = Math.floor(1000000 + Math.random() * 2000000);
      
      data.push({ timestamp, open, high, low, close, volume });
      price = close;
    }
    
    return data;
  };

  const renderChart = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-2 border-cyan-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-slate-400">Loading chart data...</p>
          </div>
        </div>
      );
    }

    if (error || ohlcData.length === 0) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <Target className="h-12 w-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 mb-2">{error || 'No chart data available'}</p>
            <p className="text-slate-500 text-sm">Chart will update when data is available</p>
          </div>
        </div>
      );
    }

    switch (activeTab) {
      case 'candlestick':
        return <CandlestickChart data={ohlcData} symbol={symbol} />;
      case 'line':
        return <LineChart data={ohlcData} symbol={symbol} />;
      case 'area':
        return <AreaChart data={ohlcData} symbol={symbol} />;
      case 'volume':
        return <VolumeChart data={ohlcData} symbol={symbol} />;
      default:
        return <CandlestickChart data={ohlcData} symbol={symbol} />;
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-950 border border-slate-700 rounded-lg overflow-hidden">
      {/* Header with Tabs */}
      <div className="bg-slate-900 border-b border-slate-700 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-white">{symbol} Charts</h3>
            {currentMarketData && (
              <div className="flex items-center gap-2">
                <span className="text-xl font-mono font-bold text-white">
                  ${currentMarketData.price.toFixed(2)}
                </span>
                <div className={`flex items-center gap-1 ${
                  (currentMarketData as any).changePercent >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {(currentMarketData as any).changePercent >= 0 ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <TrendingDown className="h-4 w-4" />
                  )}
                  <span className="text-sm font-medium">
                    {(currentMarketData as any).changePercent >= 0 ? '+' : ''}
                    {((currentMarketData as any).changePercent || 0).toFixed(2)}%
                  </span>
                </div>
              </div>
            )}
          </div>
          
          {/* Connection Status */}
          <div className={`flex items-center gap-2 text-sm ${
            connectionStatus === 'Connected' ? 'text-green-400' : 'text-red-400'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              connectionStatus === 'Connected' ? 'bg-green-400' : 'bg-red-400'
            }`}></div>
            {connectionStatus}
          </div>
        </div>

        {/* Chart Type Tabs */}
        <div className="flex bg-slate-800/50 rounded-lg p-1">
          {CHART_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? `bg-slate-700 ${tab.color}`
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Chart Content */}
      <div className="flex-1 relative" style={{ height: `${height - 140}px` }}>
        {renderChart()}
        
        {/* Data Info Overlay */}
        <div className="absolute top-2 right-2 text-xs text-slate-400 bg-slate-800/80 p-2 rounded">
          <div>Data Points: {ohlcData.length}</div>
          <div>Type: {CHART_TABS.find(t => t.id === activeTab)?.label}</div>
          <div>Resolution: Daily</div>
          {isUsingFallbackData && (
            <div className="text-yellow-400 font-medium mt-1">⚠️ Simulated Data</div>
          )}
        </div>
      </div>
    </div>
  );
};

// Individual Chart Components

interface ChartProps {
  data: OHLCData[];
  symbol: string;
}

const CandlestickChart: React.FC<ChartProps> = ({ data, symbol }) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    const pixelRatio = window.devicePixelRatio || 1;
    canvas.width = rect.width * pixelRatio;
    canvas.height = rect.height * pixelRatio;
    ctx.scale(pixelRatio, pixelRatio);

    ctx.clearRect(0, 0, rect.width, rect.height);

    // Calculate price range
    const prices = data.flatMap(d => [d.high, d.low]);
    const maxPrice = Math.max(...prices);
    const minPrice = Math.min(...prices);
    const priceRange = maxPrice - minPrice;
    const padding = priceRange * 0.1;

    const chartHeight = rect.height - 40;
    const chartWidth = rect.width - 80;
    const candleWidth = Math.max(2, chartWidth / data.length - 2);

    // Draw candles
    data.forEach((candle, index) => {
      const x = 40 + (index * chartWidth / data.length);
      
      const highY = 20 + ((maxPrice + padding - candle.high) / (priceRange + padding * 2)) * chartHeight;
      const lowY = 20 + ((maxPrice + padding - candle.low) / (priceRange + padding * 2)) * chartHeight;
      const openY = 20 + ((maxPrice + padding - candle.open) / (priceRange + padding * 2)) * chartHeight;
      const closeY = 20 + ((maxPrice + padding - candle.close) / (priceRange + padding * 2)) * chartHeight;

      const isGreen = candle.close > candle.open;
      const color = isGreen ? '#22c55e' : '#ef4444';

      // Draw wick
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, highY);
      ctx.lineTo(x, lowY);
      ctx.stroke();

      // Draw body
      const bodyTop = Math.min(openY, closeY);
      const bodyHeight = Math.max(Math.abs(closeY - openY), 1);

      ctx.fillStyle = color;
      ctx.fillRect(x - candleWidth / 2, bodyTop, candleWidth, bodyHeight);
    });

    // Draw price axis
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px monospace';
    const steps = 5;
    for (let i = 0; i <= steps; i++) {
      const price = minPrice + (priceRange * i / steps);
      const y = 20 + ((maxPrice + padding - price) / (priceRange + padding * 2)) * chartHeight;
      ctx.fillText(`$${price.toFixed(0)}`, rect.width - 75, y + 4);
    }
  }, [data]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ minHeight: '200px' }}
    />
  );
};

const LineChart: React.FC<ChartProps> = ({ data, symbol }) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    const pixelRatio = window.devicePixelRatio || 1;
    canvas.width = rect.width * pixelRatio;
    canvas.height = rect.height * pixelRatio;
    ctx.scale(pixelRatio, pixelRatio);

    ctx.clearRect(0, 0, rect.width, rect.height);

    // Calculate price range
    const prices = data.map(d => d.close);
    const maxPrice = Math.max(...prices);
    const minPrice = Math.min(...prices);
    const priceRange = maxPrice - minPrice;
    const padding = priceRange * 0.1;

    const chartHeight = rect.height - 40;
    const chartWidth = rect.width - 80;

    // Draw line
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 2;
    ctx.beginPath();

    data.forEach((point, index) => {
      const x = 40 + (index * chartWidth / (data.length - 1));
      const y = 20 + ((maxPrice + padding - point.close) / (priceRange + padding * 2)) * chartHeight;

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Draw price axis
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px monospace';
    const steps = 5;
    for (let i = 0; i <= steps; i++) {
      const price = minPrice + (priceRange * i / steps);
      const y = 20 + ((maxPrice + padding - price) / (priceRange + padding * 2)) * chartHeight;
      ctx.fillText(`$${price.toFixed(0)}`, rect.width - 75, y + 4);
    }
  }, [data]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ minHeight: '200px' }}
    />
  );
};

const AreaChart: React.FC<ChartProps> = ({ data, symbol }) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    const pixelRatio = window.devicePixelRatio || 1;
    canvas.width = rect.width * pixelRatio;
    canvas.height = rect.height * pixelRatio;
    ctx.scale(pixelRatio, pixelRatio);

    ctx.clearRect(0, 0, rect.width, rect.height);

    // Calculate price range
    const prices = data.map(d => d.close);
    const maxPrice = Math.max(...prices);
    const minPrice = Math.min(...prices);
    const priceRange = maxPrice - minPrice;
    const padding = priceRange * 0.1;

    const chartHeight = rect.height - 40;
    const chartWidth = rect.width - 80;

    // Create gradient
    const gradient = ctx.createLinearGradient(0, 20, 0, 20 + chartHeight);
    gradient.addColorStop(0, 'rgba(6, 182, 212, 0.3)');
    gradient.addColorStop(1, 'rgba(6, 182, 212, 0.05)');

    // Draw area
    ctx.fillStyle = gradient;
    ctx.beginPath();

    data.forEach((point, index) => {
      const x = 40 + (index * chartWidth / (data.length - 1));
      const y = 20 + ((maxPrice + padding - point.close) / (priceRange + padding * 2)) * chartHeight;

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    // Close the area to bottom
    const lastX = 40 + ((data.length - 1) * chartWidth / (data.length - 1));
    ctx.lineTo(lastX, 20 + chartHeight);
    ctx.lineTo(40, 20 + chartHeight);
    ctx.closePath();
    ctx.fill();

    // Draw line on top
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 2;
    ctx.beginPath();

    data.forEach((point, index) => {
      const x = 40 + (index * chartWidth / (data.length - 1));
      const y = 20 + ((maxPrice + padding - point.close) / (priceRange + padding * 2)) * chartHeight;

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Draw price axis
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px monospace';
    const steps = 5;
    for (let i = 0; i <= steps; i++) {
      const price = minPrice + (priceRange * i / steps);
      const y = 20 + ((maxPrice + padding - price) / (priceRange + padding * 2)) * chartHeight;
      ctx.fillText(`$${price.toFixed(0)}`, rect.width - 75, y + 4);
    }
  }, [data]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ minHeight: '200px' }}
    />
  );
};

const VolumeChart: React.FC<ChartProps> = ({ data, symbol }) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    const pixelRatio = window.devicePixelRatio || 1;
    canvas.width = rect.width * pixelRatio;
    canvas.height = rect.height * pixelRatio;
    ctx.scale(pixelRatio, pixelRatio);

    ctx.clearRect(0, 0, rect.width, rect.height);

    // Calculate volume range
    const volumes = data.map(d => d.volume);
    const maxVolume = Math.max(...volumes);
    const minVolume = Math.min(...volumes);

    const chartHeight = rect.height - 40;
    const chartWidth = rect.width - 80;
    const barWidth = Math.max(1, chartWidth / data.length - 1);

    // Draw volume bars
    data.forEach((point, index) => {
      const x = 40 + (index * chartWidth / data.length);
      const barHeight = (point.volume / maxVolume) * chartHeight;
      const y = 20 + chartHeight - barHeight;

      const isGreen = point.close > point.open;
      ctx.fillStyle = isGreen ? 'rgba(34, 197, 94, 0.7)' : 'rgba(239, 68, 68, 0.7)';
      ctx.fillRect(x, y, barWidth, barHeight);
    });

    // Draw volume axis
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px monospace';
    const steps = 4;
    for (let i = 0; i <= steps; i++) {
      const volume = (maxVolume * i / steps);
      const y = 20 + chartHeight - (i * chartHeight / steps);
      const volumeText = volume > 1000000 ? `${(volume / 1000000).toFixed(1)}M` : `${(volume / 1000).toFixed(0)}K`;
      ctx.fillText(volumeText, rect.width - 75, y + 4);
    }
  }, [data]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ minHeight: '200px' }}
    />
  );
};