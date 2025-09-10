import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FinancialLayout } from '../components/layout/FinancialLayout';
import { TrendingUp, TrendingDown, ArrowLeft, DollarSign } from 'lucide-react';
import { fetchRealQuoteData } from '../services/finnhubService';
import type { QuoteData } from '../types/index';
import { TabbedChartContainer } from '../components/trade/TabbedChartContainer';
import { SimulationAnalysisSection } from '../components/trade/SimulationAnalysisSection';

interface TimeInterval {
  id: string;
  label: string;
  resolution: string;
  days: number;
}

const TIME_INTERVALS: TimeInterval[] = [
  { id: '1D', label: '1D', resolution: '5', days: 1 },
  { id: '1W', label: '1W', resolution: '15', days: 7 },
  { id: '1M', label: '1M', resolution: '60', days: 30 },
  { id: '3M', label: '3M', resolution: 'D', days: 90 },
  { id: '1Y', label: '1Y', resolution: 'D', days: 365 },
  { id: '5Y', label: '5Y', resolution: 'W', days: 1825 },
];

interface TimeIntervalSelectorProps {
  selectedInterval: string;
  onIntervalChange: (interval: string) => void;
}

const TimeIntervalSelector: React.FC<TimeIntervalSelectorProps> = ({
  selectedInterval,
  onIntervalChange,
}) => {
  return (
    <div className="flex bg-slate-900/50 border border-slate-700 rounded-lg p-1">
      {TIME_INTERVALS.map((interval) => (
        <button
          key={interval.id}
          onClick={() => onIntervalChange(interval.id)}
          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
            selectedInterval === interval.id
              ? 'bg-cyan-500 text-white'
              : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          {interval.label}
        </button>
      ))}
    </div>
  );
};

interface FundamentalDataGridProps {
  data: QuoteData;
}

const FundamentalDataGrid: React.FC<FundamentalDataGridProps> = ({ data }) => {
  const formatNumber = (num: number | undefined, isPrice = false, isCurrency = false) => {
    if (num === undefined || num === null) return 'N/A';
    
    if (isCurrency && num > 1000000000) {
      return `$${(num / 1000000000).toFixed(2)}B`;
    }
    if (isCurrency && num > 1000000) {
      return `$${(num / 1000000).toFixed(2)}M`;
    }
    if (isPrice) {
      return `$${num.toFixed(2)}`;
    }
    return num.toFixed(2);
  };

  const fundamentalData = [
    { label: 'Open', value: formatNumber(data.open, true) },
    { label: 'High', value: formatNumber(data.high, true) },
    { label: 'Low', value: formatNumber(data.low, true) },
    { label: 'Previous Close', value: formatNumber(data.previousClose, true) },
    { label: 'Market Cap', value: formatNumber(data.fundamentals?.marketCap, false, true) },
    { label: 'P/E Ratio', value: formatNumber(data.fundamentals?.peRatio) },
    { label: 'EPS', value: formatNumber(data.fundamentals?.eps, true) },
    { label: 'Dividend Yield', value: data.fundamentals?.dividend ? `${data.fundamentals.dividend.toFixed(2)}%` : 'N/A' },
    { label: 'Beta', value: formatNumber(data.fundamentals?.beta) },
    { label: '52W High', value: formatNumber(data.fundamentals?.week52High, true) },
    { label: '52W Low', value: formatNumber(data.fundamentals?.week52Low, true) },
    { label: 'Volume', value: data.volume ? data.volume.toLocaleString() : 'N/A' },
  ];

  return (
    <div className="bg-slate-900/40 border border-slate-700 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Fundamentals</h3>
      <div className="grid grid-cols-2 gap-4">
        {fundamentalData.map((item, index) => (
          <div key={index} className="flex justify-between items-center py-2 border-b border-slate-800 last:border-b-0">
            <span className="text-slate-400 text-sm">{item.label}</span>
            <span className="text-white font-medium">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function AnalysisPage() {
  const { symbol } = useParams<{ symbol: string }>();
  const navigate = useNavigate();
  const [quoteData, setQuoteData] = useState<QuoteData | null>(null);
  const [selectedInterval, setSelectedInterval] = useState('1Y');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentSymbol = symbol?.toUpperCase() || 'AAPL';

  useEffect(() => {
    const fetchQuoteData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log(`[AnalysisPage] Fetching real market data for ${currentSymbol}`);
        
        // Fetch real data from Finnhub API
        const realData = await fetchRealQuoteData(currentSymbol);
        
        setQuoteData(realData);
        console.log(`[AnalysisPage] Successfully loaded real data for ${currentSymbol}:`, realData);
      } catch (err) {
        console.error(`[AnalysisPage] Error fetching data for ${currentSymbol}:`, err);
        setError('Failed to fetch real-time quote data');
      } finally {
        setLoading(false);
      }
    };

    fetchQuoteData();
  }, [currentSymbol]);

  // Helper functions removed - now using real API data

  const handleTradeClick = () => {
    navigate(`/trading-terminal?symbol=${currentSymbol}`);
  };

  const handleBack = () => {
    navigate(-1);
  };

  if (loading) {
    return (
      <FinancialLayout>
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-slate-700 rounded w-64"></div>
            <div className="h-64 bg-slate-700 rounded"></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="h-96 bg-slate-700 rounded"></div>
              <div className="h-96 bg-slate-700 rounded"></div>
            </div>
          </div>
        </div>
      </FinancialLayout>
    );
  }

  if (error || !quoteData) {
    return (
      <FinancialLayout>
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="text-center py-16">
            <h2 className="text-2xl font-bold text-white mb-4">Error Loading Data</h2>
            <p className="text-slate-400 mb-6">{error || 'Failed to load symbol data'}</p>
            <button
              onClick={handleBack}
              className="px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </FinancialLayout>
    );
  }

  return (
    <FinancialLayout>
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Back Button */}
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        {/* Header with Symbol Info */}
        <div className="bg-slate-900/40 border border-slate-700 rounded-lg p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-white">{quoteData.symbol}</h1>
                <span className="text-lg text-slate-400">{quoteData.name}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-2xl font-bold text-white">
                  ${quoteData.price.toFixed(2)}
                </span>
                <div className={`flex items-center gap-1 ${
                  quoteData.changePercent > 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {quoteData.changePercent > 0 ? (
                    <TrendingUp className="h-5 w-5" />
                  ) : (
                    <TrendingDown className="h-5 w-5" />
                  )}
                  <span className="font-medium">
                    {quoteData.changePercent > 0 ? '+' : ''}{quoteData.change.toFixed(2)} 
                    ({quoteData.changePercent > 0 ? '+' : ''}{quoteData.changePercent.toFixed(2)}%)
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={handleTradeClick}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold rounded-lg transition-all transform hover:scale-105"
            >
              <DollarSign className="h-5 w-5" />
              Trade {quoteData.symbol}
            </button>
          </div>
        </div>

        {/* Chart Section */}
        <div className="bg-slate-900/40 border border-slate-700 rounded-lg p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <h2 className="text-xl font-semibold text-white">Price Chart</h2>
            <TimeIntervalSelector
              selectedInterval={selectedInterval}
              onIntervalChange={setSelectedInterval}
            />
          </div>
          
          {/* Live Chart with Multiple Views */}
          <div className="h-96">
            <TabbedChartContainer
              symbol={currentSymbol}
              marketData={new Map()} // Analysis page doesn't use live market data
              connectionStatus="connected" // Always show as connected for OHLC data
              height={384}
            />
          </div>
        </div>

        {/* Fundamental Data and Simulation Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <FundamentalDataGrid data={quoteData} />
          
          {/* Simulation-Powered Analysis Section */}
          <SimulationAnalysisSection />
        </div>
      </div>
    </FinancialLayout>
  );
}