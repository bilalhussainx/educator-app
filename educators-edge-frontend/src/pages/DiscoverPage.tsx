import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FinancialLayout } from '../components/layout/FinancialLayout';
import { Search, TrendingUp, TrendingDown, Activity, Clock } from 'lucide-react';
import { SimulationDiscoverSection } from '../components/trade/SimulationDiscoverSection';

interface MarketMover {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
}

interface DiscoverTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const DiscoverTabs: React.FC<DiscoverTabsProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'stocks', label: 'Stocks', active: true },
    { id: 'etfs', label: 'ETFs', active: false },
    { id: 'crypto', label: 'Crypto', active: false },
    { id: 'options', label: 'Options', active: false },
  ];

  return (
    <div className="flex border-b border-slate-700 bg-slate-900/30">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          disabled={!tab.active}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${
            activeTab === tab.id
              ? 'text-cyan-400 bg-slate-800/50'
              : tab.active
              ? 'text-slate-300 hover:text-white hover:bg-slate-800/30'
              : 'text-slate-500 cursor-not-allowed'
          }`}
        >
          {tab.label}
          {!tab.active && (
            <span className="absolute top-1 right-1 text-xs text-amber-400">Soon</span>
          )}
          {activeTab === tab.id && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400"></div>
          )}
        </button>
      ))}
    </div>
  );
};

interface MarketWidgetProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  data: MarketMover[];
  isLoading?: boolean;
}

const MarketWidget: React.FC<MarketWidgetProps> = ({ title, icon: Icon, data, isLoading }) => {
  if (isLoading) {
    return (
      <div className="bg-slate-900/40 border border-slate-700 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-4">
          <Icon className="h-5 w-5 text-slate-400" />
          <h3 className="font-semibold text-white">{title}</h3>
        </div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  <div className="h-4 bg-slate-700 rounded w-16"></div>
                  <div className="h-3 bg-slate-700 rounded w-24"></div>
                </div>
                <div className="h-4 bg-slate-700 rounded w-12"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/40 border border-slate-700 rounded-lg p-4 hover:bg-slate-900/60 transition-colors">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="h-5 w-5 text-slate-400" />
        <h3 className="font-semibold text-white">{title}</h3>
      </div>
      <div className="space-y-3">
        {data.slice(0, 5).map((item) => (
          <Link
            key={item.symbol}
            to={`/analysis/${item.symbol}`}
            className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-800/50 transition-colors group"
          >
            <div className="flex flex-col">
              <span className="font-medium text-white group-hover:text-cyan-400 transition-colors">
                {item.symbol}
              </span>
              <span className="text-xs text-slate-400 truncate max-w-[150px]">
                {item.name}
              </span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-sm text-white">${item.price.toFixed(2)}</span>
              <span className={`text-xs flex items-center gap-1 ${
                item.changePercent > 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {item.changePercent > 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {item.changePercent > 0 ? '+' : ''}{item.changePercent.toFixed(2)}%
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default function DiscoverPage() {
  const [activeTab, setActiveTab] = useState('stocks');
  const [searchQuery, setSearchQuery] = useState('');
  const [mostActive, setMostActive] = useState<MarketMover[]>([]);
  const [topGainers, setTopGainers] = useState<MarketMover[]>([]);
  const [topLosers, setTopLosers] = useState<MarketMover[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Mock data for MVP - will be replaced with real API calls
  useEffect(() => {
    const fetchMarketData = async () => {
      setIsLoading(true);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock data
      const mockMostActive: MarketMover[] = [
        { symbol: 'AAPL', name: 'Apple Inc.', price: 237.88, change: 2.45, changePercent: 1.04, volume: 45231000 },
        { symbol: 'NVDA', name: 'NVIDIA Corporation', price: 118.65, change: -3.21, changePercent: -2.63, volume: 78543000 },
        { symbol: 'TSLA', name: 'Tesla Inc.', price: 241.85, change: 5.67, changePercent: 2.40, volume: 67890000 },
        { symbol: 'MSFT', name: 'Microsoft Corporation', price: 419.58, change: 1.23, changePercent: 0.29, volume: 34567000 },
        { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 165.32, change: -2.45, changePercent: -1.46, volume: 23456000 },
      ];

      const mockTopGainers: MarketMover[] = [
        { symbol: 'SMCI', name: 'Super Micro Computer', price: 45.67, change: 8.45, changePercent: 22.70, volume: 12345000 },
        { symbol: 'AMD', name: 'Advanced Micro Devices', price: 134.56, change: 12.34, changePercent: 10.09, volume: 23456000 },
        { symbol: 'COIN', name: 'Coinbase Global Inc.', price: 234.78, change: 18.90, changePercent: 8.76, volume: 8765000 },
        { symbol: 'ROKU', name: 'Roku Inc.', price: 78.90, change: 5.67, changePercent: 7.74, volume: 5432000 },
        { symbol: 'SQ', name: 'Block Inc.', price: 89.12, change: 6.34, changePercent: 7.66, volume: 7654000 },
      ];

      const mockTopLosers: MarketMover[] = [
        { symbol: 'NFLX', name: 'Netflix Inc.', price: 701.35, change: -45.67, changePercent: -6.11, volume: 9876000 },
        { symbol: 'META', name: 'Meta Platforms Inc.', price: 568.31, change: -32.45, changePercent: -5.40, volume: 11234000 },
        { symbol: 'BABA', name: 'Alibaba Group', price: 78.45, change: -4.56, changePercent: -5.50, volume: 8765000 },
        { symbol: 'PYPL', name: 'PayPal Holdings', price: 89.67, change: -4.78, changePercent: -5.07, volume: 6543000 },
        { symbol: 'ZM', name: 'Zoom Video', price: 67.89, change: -3.45, changePercent: -4.84, volume: 5432000 },
      ];

      setMostActive(mockMostActive);
      setTopGainers(mockTopGainers);
      setTopLosers(mockTopLosers);
      setIsLoading(false);
    };

    if (activeTab === 'stocks') {
      fetchMarketData();
    }
  }, [activeTab]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Navigate to analysis page for the searched symbol
      window.location.href = `/analysis/${searchQuery.trim().toUpperCase()}`;
    }
  };

  const renderComingSoon = () => (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="text-center">
        <Clock className="h-16 w-16 text-slate-600 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">Coming Soon</h3>
        <p className="text-slate-400 max-w-md">
          We're working on bringing you comprehensive {activeTab} data and analysis tools. 
          Stay tuned for updates!
        </p>
      </div>
    </div>
  );

  return (
    <FinancialLayout>
      <div className="max-w-7xl mx-auto">
        {/* Search Bar - Sticky */}
        <div className="sticky top-0 z-20 bg-slate-950/95 backdrop-blur-sm border-b border-slate-800 px-4 py-4">
          <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search stocks, ETFs, crypto..."
                className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 px-4 py-1.5 bg-cyan-500 hover:bg-cyan-600 text-white text-sm rounded-md transition-colors"
              >
                Search
              </button>
            </div>
          </form>
        </div>

        {/* Asset Class Tabs */}
        <DiscoverTabs activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Content */}
        <div className="px-4 py-6">
          {activeTab === 'stocks' ? (
            <div className="space-y-6">
              {/* Historical Simulation Discovery */}
              <SimulationDiscoverSection />
              
              {/* Market Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <MarketWidget
                  title="Most Active"
                  icon={Activity}
                  data={mostActive}
                  isLoading={isLoading}
                />
                <MarketWidget
                  title="Top Gainers"
                  icon={TrendingUp}
                  data={topGainers}
                  isLoading={isLoading}
                />
                <MarketWidget
                  title="Top Losers"
                  icon={TrendingDown}
                  data={topLosers}
                  isLoading={isLoading}
                />
              </div>

              {/* Additional Discovery Sections */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
                <div className="bg-slate-900/40 border border-slate-700 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Market Sectors</h3>
                  <div className="space-y-2">
                    {[
                      'Technology', 'Healthcare', 'Financial Services', 'Consumer Cyclical', 
                      'Energy', 'Industrials', 'Real Estate', 'Materials'
                    ].map((sector) => (
                      <button
                        key={sector}
                        className="w-full text-left px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-800/50 rounded-lg transition-colors"
                      >
                        {sector}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-900/40 border border-slate-700 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Popular Watchlists</h3>
                  <div className="space-y-2">
                    {[
                      'S&P 500 Top 10', 'Tech Giants', 'Dividend Aristocrats', 
                      'Growth Stocks', 'Value Picks', 'Small Cap Gems'
                    ].map((list) => (
                      <button
                        key={list}
                        className="w-full text-left px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-800/50 rounded-lg transition-colors"
                      >
                        {list}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            renderComingSoon()
          )}
        </div>
      </div>
    </FinancialLayout>
  );
}