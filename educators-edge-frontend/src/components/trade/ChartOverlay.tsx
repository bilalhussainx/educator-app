import React, { useState, useEffect, useRef } from 'react';
import { TrendingUp, TrendingDown, Minus, AlertCircle, X, Info } from 'lucide-react';
import { getPatternRecognition, PatternRecognition } from '../../services/finnhubService';
import { OHLCData } from '../../types/index';

interface ChartOverlayProps {
  symbol: string;
  ohlcData: OHLCData[];
  canvasRef: React.RefObject<HTMLCanvasElement>;
  chartHeight: number;
  resolution?: string;
}

interface PatternTooltip {
  pattern: PatternRecognition;
  x: number;
  y: number;
  visible: boolean;
}

interface PatternModal {
  pattern: PatternRecognition | null;
  visible: boolean;
}

export const ChartOverlay: React.FC<ChartOverlayProps> = ({
  symbol,
  ohlcData,
  canvasRef,
  chartHeight,
  resolution = 'D'
}) => {
  const [patterns, setPatterns] = useState<PatternRecognition[]>([]);
  const [loading, setLoading] = useState(false);
  const [tooltip, setTooltip] = useState<PatternTooltip>({
    pattern: null as any,
    x: 0,
    y: 0,
    visible: false
  });
  const [modal, setModal] = useState<PatternModal>({
    pattern: null,
    visible: false
  });
  
  const overlayRef = useRef<HTMLDivElement>(null);

  // Fetch patterns when symbol or data changes
  useEffect(() => {
    const fetchPatterns = async () => {
      if (ohlcData.length < 10) return;
      
      try {
        setLoading(true);
        console.log(`[ChartOverlay] Fetching patterns for ${symbol}`);
        
        const detectedPatterns = await getPatternRecognition(symbol, resolution);
        setPatterns(detectedPatterns);
        
        console.log(`[ChartOverlay] Loaded ${detectedPatterns.length} patterns for ${symbol}`);
      } catch (error) {
        console.error(`[ChartOverlay] Error fetching patterns for ${symbol}:`, error);
        setPatterns([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPatterns();
  }, [symbol, ohlcData.length, resolution]);

  // Calculate pattern positions on the chart
  const getPatternPosition = (pattern: PatternRecognition) => {
    if (!canvasRef.current || ohlcData.length === 0) return null;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    // Find the index of the pattern in the OHLC data
    const patternIndex = ohlcData.findIndex(data => 
      Math.abs(data.timestamp - pattern.timestamp) < 24 * 60 * 60 * 1000 // Within 1 day
    );

    if (patternIndex === -1) return null;

    // Calculate position based on chart dimensions
    const chartWidth = rect.width - 80; // Account for price axis
    const x = 40 + (patternIndex * chartWidth / ohlcData.length);
    
    // Position at the top of the chart for visibility
    const y = 30;

    return { x, y };
  };

  // Get icon for pattern type
  const getPatternIcon = (pattern: PatternRecognition) => {
    switch (pattern.type) {
      case 'bullish':
        return <TrendingUp className="h-4 w-4 text-green-400" />;
      case 'bearish':
        return <TrendingDown className="h-4 w-4 text-red-400" />;
      case 'neutral':
        return <Minus className="h-4 w-4 text-yellow-400" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  // Get color for pattern type
  const getPatternColor = (pattern: PatternRecognition) => {
    switch (pattern.type) {
      case 'bullish':
        return 'bg-green-500/20 border-green-400 hover:bg-green-500/30';
      case 'bearish':
        return 'bg-red-500/20 border-red-400 hover:bg-red-500/30';
      case 'neutral':
        return 'bg-yellow-500/20 border-yellow-400 hover:bg-yellow-500/30';
      default:
        return 'bg-gray-500/20 border-gray-400 hover:bg-gray-500/30';
    }
  };

  // Handle pattern click
  const handlePatternClick = (pattern: PatternRecognition) => {
    setModal({ pattern, visible: true });
    setTooltip({ ...tooltip, visible: false });
  };

  // Handle pattern hover
  const handlePatternHover = (pattern: PatternRecognition, event: React.MouseEvent) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setTooltip({
      pattern,
      x: rect.left + rect.width / 2,
      y: rect.top - 10,
      visible: true
    });
  };

  // Handle mouse leave
  const handleMouseLeave = () => {
    setTooltip({ ...tooltip, visible: false });
  };

  // Close modal
  const closeModal = () => {
    setModal({ pattern: null, visible: false });
  };

  if (loading) {
    return (
      <div className="absolute top-2 left-2 text-xs text-cyan-400 bg-slate-800/80 p-2 rounded">
        <div className="flex items-center gap-2">
          <div className="animate-spin h-3 w-3 border-2 border-cyan-500 border-t-transparent rounded-full"></div>
          Analyzing patterns...
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Pattern Markers Overlay */}
      <div 
        ref={overlayRef}
        className="absolute inset-0 pointer-events-none"
        style={{ height: chartHeight }}
      >
        {patterns.map((pattern, index) => {
          const position = getPatternPosition(pattern);
          if (!position) return null;

          return (
            <div
              key={`${pattern.patternName}-${pattern.timestamp}-${index}`}
              className={`absolute pointer-events-auto cursor-pointer rounded-full border-2 p-1 transition-all duration-200 ${getPatternColor(pattern)}`}
              style={{
                left: position.x - 12,
                top: position.y,
                transform: 'translate(-50%, -50%)'
              }}
              onClick={() => handlePatternClick(pattern)}
              onMouseEnter={(e) => handlePatternHover(pattern, e)}
              onMouseLeave={handleMouseLeave}
              title={`${pattern.patternName} (${Math.round(pattern.confidence * 100)}%)`}
            >
              {getPatternIcon(pattern)}
            </div>
          );
        })}
      </div>

      {/* Tooltip */}
      {tooltip.visible && tooltip.pattern && (
        <div
          className="fixed z-50 bg-slate-800 text-white text-sm p-2 rounded shadow-lg border border-slate-600 pointer-events-none"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: 'translate(-50%, -100%)'
          }}
        >
          <div className="font-semibold">{tooltip.pattern.patternName}</div>
          <div className="text-slate-300">
            Confidence: {Math.round(tooltip.pattern.confidence * 100)}%
          </div>
        </div>
      )}

      {/* Pattern Education Modal */}
      {modal.visible && modal.pattern && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {getPatternIcon(modal.pattern)}
                <h3 className="text-lg font-semibold text-white">
                  {modal.pattern.patternName}
                </h3>
              </div>
              <button
                onClick={closeModal}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-400">Pattern Type</span>
                  <span className={`text-sm font-medium ${
                    modal.pattern.type === 'bullish' ? 'text-green-400' : 
                    modal.pattern.type === 'bearish' ? 'text-red-400' : 'text-yellow-400'
                  }`}>
                    {modal.pattern.type.charAt(0).toUpperCase() + modal.pattern.type.slice(1)}
                  </span>
                </div>
                
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-400">Confidence</span>
                  <span className="text-sm font-medium text-white">
                    {Math.round(modal.pattern.confidence * 100)}%
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Detected On</span>
                  <span className="text-sm font-medium text-white">
                    {new Date(modal.pattern.timestamp).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="border-t border-slate-700 pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="h-4 w-4 text-cyan-400" />
                  <span className="text-sm font-medium text-cyan-400">What this means</span>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {modal.pattern.description}
                </p>
              </div>

              <div className="border-t border-slate-700 pt-4">
                <p className="text-xs text-slate-500 italic">
                  Pattern recognition powered by AI. This is educational content and should not be considered as financial advice.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={closeModal}
                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pattern Count Indicator */}
      {patterns.length > 0 && (
        <div className="absolute top-2 right-12 text-xs text-cyan-400 bg-slate-800/80 p-2 rounded">
          <div className="flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {patterns.length} pattern{patterns.length !== 1 ? 's' : ''} detected
          </div>
        </div>
      )}
    </>
  );
};