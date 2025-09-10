import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMarketData } from '../../hooks/useMarketData';
import { useSimulationPortfolio } from '../../hooks/useSimulationPortfolio';
import { historicalDataService } from '../../services/historicalDataService';
import { 
  Search, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Clock, 
  Calendar,
  Eye,
  Zap,
  Target,
  Award,
  BookOpen,
  ArrowRight,
  BarChart3,
  DollarSign,
  Briefcase
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

interface MarketMover {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  period?: string;
  historicalContext?: string;
}

interface HistoricalOpportunity {
  symbol: string;
  name: string;
  period: string;
  periodName: string;
  opportunity: string;
  potentialReturn: number;
  riskLevel: 'Low' | 'Medium' | 'High';
  context: string;
  keyDates: Array<{
    date: string;
    event: string;
  }>;
}

interface EducationalInsight {
  id: string;
  title: string;
  description: string;
  period: string;
  lesson: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  estimatedTime: string;
}

export const SimulationDiscoverSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState('opportunities');
  const [marketMovers, setMarketMovers] = useState<MarketMover[]>([]);
  const [historicalOpportunities, setHistoricalOpportunities] = useState<HistoricalOpportunity[]>([]);
  const [educationalInsights, setEducationalInsights] = useState<EducationalInsight[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  const { marketData } = useMarketData();
  const { currentSession, createSession } = useSimulationPortfolio();
  const navigate = useNavigate();

  const periods = historicalDataService.getHistoricalPeriods();

  // Generate market movers based on historical simulation data
  useEffect(() => {
    const generateMarketMovers = () => {
      if (!marketData || typeof marketData !== 'object') return;

      const movers: MarketMover[] = [];
      const symbols = ['AAPL', 'GOOGL', 'MSFT', 'NVDA', 'TSLA', 'AMZN', 'META', 'NFLX'];

      symbols.forEach(symbol => {
        const data = marketData[symbol];
        if (data) {
          movers.push({
            symbol,
            name: getCompanyName(symbol),
            price: data.price,
            change: data.change || 0,
            changePercent: data.changePercent || 0,
            volume: data.volume || 0,
            period: currentSession?.historical_period,
            historicalContext: getHistoricalContext(symbol, currentSession?.historical_period)
          });
        }
      });

      // Sort by absolute change percentage
      movers.sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));
      setMarketMovers(movers);
    };

    generateMarketMovers();
  }, [marketData, currentSession]);

  // Generate historical opportunities
  useEffect(() => {
    const generateOpportunities = () => {
      const opportunities: HistoricalOpportunity[] = [
        {
          symbol: 'AAPL',
          name: 'Apple Inc.',
          period: 'dot-com-bubble',
          periodName: 'Dot-Com Bubble',
          opportunity: 'Post-crash value investing opportunity',
          potentialReturn: 15000,
          riskLevel: 'Medium',
          context: 'Apple trading at historic lows after dot-com crash, before iPod revolution',
          keyDates: [
            { date: '2001-04-01', event: 'Stock hits $1.19 low' },
            { date: '2001-10-23', event: 'iPod announcement' }
          ]
        },
        {
          symbol: 'MSFT',
          name: 'Microsoft Corporation',
          period: 'great-depression',
          periodName: 'Great Depression Era',
          opportunity: 'Foundation investment in emerging technology',
          potentialReturn: 25000,
          riskLevel: 'High',
          context: 'Early technology company with strong fundamentals during market turmoil',
          keyDates: [
            { date: '1929-10-29', event: 'Black Tuesday market crash' },
            { date: '1932-03-01', event: 'Market bottom opportunity' }
          ]
        },
        {
          symbol: 'AMZN',
          name: 'Amazon.com Inc.',
          period: '2008-crisis',
          periodName: '2008 Financial Crisis',
          opportunity: 'E-commerce disruption during recession',
          potentialReturn: 3500,
          riskLevel: 'High',
          context: 'Amazon trading at $35, before becoming e-commerce giant',
          keyDates: [
            { date: '2008-11-20', event: 'Stock hits crisis low at $35' },
            { date: '2009-03-09', event: 'Market begins recovery' }
          ]
        },
        {
          symbol: 'TSLA',
          name: 'Tesla Inc.',
          period: 'covid-crash',
          periodName: 'COVID-19 Market Crash',
          opportunity: 'EV revolution during market volatility',
          potentialReturn: 800,
          riskLevel: 'High',
          context: 'Tesla stock volatile during pandemic, before massive EV adoption',
          keyDates: [
            { date: '2020-03-18', event: 'Stock hits COVID low at $70' },
            { date: '2020-12-21', event: 'S&P 500 inclusion announcement' }
          ]
        }
      ];

      setHistoricalOpportunities(
        selectedPeriod === 'all' 
          ? opportunities 
          : opportunities.filter(opp => opp.period === selectedPeriod)
      );
    };

    generateOpportunities();
  }, [selectedPeriod]);

  // Generate educational insights
  useEffect(() => {
    const insights: EducationalInsight[] = [
      {
        id: 'value-investing-depression',
        title: 'Value Investing During Market Crashes',
        description: 'Learn how to identify undervalued companies during economic downturns',
        period: 'Great Depression',
        lesson: 'Benjamin Graham\'s approach to finding bargains in the 1929 crash',
        difficulty: 'Intermediate',
        estimatedTime: '15 min'
      },
      {
        id: 'tech-speculation-bubble',
        title: 'Identifying Technology Bubbles',
        description: 'Understanding the signs of speculative bubbles in emerging sectors',
        period: 'Dot-Com Bubble',
        lesson: 'Analyzing P/E ratios and growth sustainability in tech stocks',
        difficulty: 'Advanced',
        estimatedTime: '20 min'
      },
      {
        id: 'crisis-diversification',
        title: 'Portfolio Diversification in Financial Crises',
        description: 'How proper asset allocation can protect your portfolio',
        period: '2008 Financial Crisis',
        lesson: 'Sector rotation and defensive strategies during market stress',
        difficulty: 'Beginner',
        estimatedTime: '12 min'
      },
      {
        id: 'volatility-trading',
        title: 'Trading High Volatility Markets',
        description: 'Strategies for navigating extreme market movements',
        period: 'COVID-19 Crash',
        lesson: 'Risk management and position sizing during uncertain times',
        difficulty: 'Advanced',
        estimatedTime: '18 min'
      }
    ];

    setEducationalInsights(insights);
    setLoading(false);
  }, []);

  const handleSymbolClick = (symbol: string) => {
    navigate(`/analysis/${symbol}`);
  };

  const handleCreateSession = async (periodId: string) => {
    await createSession(periodId);
    navigate('/trading-terminal');
  };

  const getCompanyName = (symbol: string): string => {
    const names: Record<string, string> = {
      'AAPL': 'Apple Inc.',
      'GOOGL': 'Alphabet Inc.',
      'MSFT': 'Microsoft Corporation',
      'NVDA': 'NVIDIA Corporation',
      'TSLA': 'Tesla Inc.',
      'AMZN': 'Amazon.com Inc.',
      'META': 'Meta Platforms Inc.',
      'NFLX': 'Netflix Inc.'
    };
    return names[symbol] || symbol;
  };

  const getHistoricalContext = (symbol: string, period?: string): string => {
    if (!period) return '';
    
    const contexts: Record<string, Record<string, string>> = {
      'great-depression': {
        'AAPL': 'Founded in 1976, Apple was not public during the Great Depression',
        'MSFT': 'Microsoft founded in 1975, showing early promise in personal computing'
      },
      'dot-com-bubble': {
        'AAPL': 'Trading near all-time lows before the iPod revolution',
        'MSFT': 'Facing antitrust issues but maintaining strong enterprise position'
      }
    };

    return contexts[period]?.[symbol] || '';
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const tabs = [
    { id: 'opportunities', label: 'Historical Opportunities', icon: Target },
    { id: 'movers', label: 'Market Movers', icon: Activity },
    { id: 'education', label: 'Educational Insights', icon: BookOpen },
    { id: 'periods', label: 'Time Periods', icon: Calendar }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Market Discovery</h1>
          <p className="text-slate-400">Explore historical market opportunities and learn from the past</p>
        </div>
        
        {currentSession && (
          <div className="text-right">
            <div className="text-sm text-slate-400">Current Simulation</div>
            <Badge variant="outline" className="text-cyan-400 border-cyan-400">
              {periods.find(p => p.id === currentSession.historical_period)?.name}
            </Badge>
          </div>
        )}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Search symbols, companies, or opportunities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
          />
        </div>
        
        <select
          value={selectedPeriod}
          onChange={(e) => setSelectedPeriod(e.target.value)}
          className="px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-400"
        >
          <option value="all">All Periods</option>
          {periods.map(period => (
            <option key={period.id} value={period.id}>
              {period.name}
            </option>
          ))}
        </select>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-700">
        <div className="flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-cyan-400 text-cyan-400'
                    : 'border-transparent text-slate-400 hover:text-slate-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'opportunities' && (
          <div className="grid gap-6 md:grid-cols-2">
            {historicalOpportunities.map((opportunity, index) => (
              <Card key={index} className="bg-slate-900/40 border-slate-700 text-white hover:bg-slate-900/60 transition-colors">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Target className="h-5 w-5 text-cyan-400" />
                        {opportunity.symbol}
                      </CardTitle>
                      <CardDescription className="text-slate-400">
                        {opportunity.name}
                      </CardDescription>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={`${
                        opportunity.riskLevel === 'High' ? 'border-red-500 text-red-400' :
                        opportunity.riskLevel === 'Medium' ? 'border-yellow-500 text-yellow-400' :
                        'border-green-500 text-green-400'
                      }`}
                    >
                      {opportunity.riskLevel} Risk
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Calendar className="h-4 w-4" />
                    {opportunity.periodName}
                  </div>
                  
                  <p className="text-sm text-slate-300">
                    {opportunity.context}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-slate-400">Potential Return</div>
                      <div className="text-lg font-bold text-green-400">
                        +{opportunity.potentialReturn}%
                      </div>
                    </div>
                    
                    <Button
                      onClick={() => handleCreateSession(opportunity.period)}
                      size="sm"
                      className="bg-cyan-500 hover:bg-cyan-600"
                    >
                      <Zap className="h-4 w-4 mr-1" />
                      Simulate
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {activeTab === 'movers' && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {marketMovers.slice(0, 9).map((mover, index) => (
              <Card 
                key={mover.symbol} 
                className="bg-slate-900/40 border-slate-700 text-white hover:bg-slate-900/60 transition-colors cursor-pointer"
                onClick={() => handleSymbolClick(mover.symbol)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="font-bold text-lg">{mover.symbol}</div>
                      <div className="text-sm text-slate-400 truncate">{mover.name}</div>
                    </div>
                    <div className={`flex items-center gap-1 ${mover.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {mover.change >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Price</span>
                      <span className="font-semibold">{formatCurrency(mover.price)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Change</span>
                      <span className={mover.change >= 0 ? 'text-green-400' : 'text-red-400'}>
                        {formatPercent(mover.changePercent)}
                      </span>
                    </div>
                  </div>

                  {mover.historicalContext && (
                    <div className="mt-3 pt-3 border-t border-slate-700">
                      <div className="text-xs text-slate-500 line-clamp-2">
                        {mover.historicalContext}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {activeTab === 'education' && (
          <div className="grid gap-6 md:grid-cols-2">
            {educationalInsights.map((insight) => (
              <Card key={insight.id} className="bg-slate-900/40 border-slate-700 text-white">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <BookOpen className="h-5 w-5 text-cyan-400" />
                      {insight.title}
                    </CardTitle>
                    <Badge variant="outline" className="text-xs border-slate-600 text-slate-400">
                      {insight.difficulty}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <p className="text-sm text-slate-300">
                    {insight.description}
                  </p>
                  
                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {insight.estimatedTime}
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {insight.period}
                    </div>
                  </div>
                  
                  <div className="pt-3 border-t border-slate-700">
                    <div className="text-sm text-slate-300 mb-3">
                      <span className="font-semibold">Key Learning:</span> {insight.lesson}
                    </div>
                    
                    <Button size="sm" variant="outline" className="w-full border-slate-600 text-slate-300 hover:bg-slate-800">
                      <Eye className="h-4 w-4 mr-2" />
                      Start Learning
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {activeTab === 'periods' && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {periods.map((period) => (
              <Card key={period.id} className="bg-slate-900/40 border-slate-700 text-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Calendar className="h-5 w-5 text-cyan-400" />
                    {period.name}
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    {period.description}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="text-sm text-slate-400">
                    <div className="flex items-center justify-between">
                      <span>Period:</span>
                      <span>{new Date(period.startDate).getFullYear()} - {new Date(period.endDate).getFullYear()}</span>
                    </div>
                  </div>
                  
                  <Button
                    onClick={() => handleCreateSession(period.id)}
                    className="w-full bg-cyan-500 hover:bg-cyan-600"
                  >
                    <Briefcase className="h-4 w-4 mr-2" />
                    Start Simulation
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};