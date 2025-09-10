import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMarketData } from '../../hooks/useMarketData';
import { useSimulationPortfolio } from '../../hooks/useSimulationPortfolio';
import { historicalDataService } from '../../services/historicalDataService';
import { 
  Brain,
  TrendingUp, 
  TrendingDown, 
  BarChart3,
  AlertTriangle,
  CheckCircle,
  Target,
  Lightbulb,
  BookOpen,
  Calendar,
  Clock,
  Zap,
  Eye,
  ArrowRight,
  DollarSign,
  PieChart,
  Activity,
  Award
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

interface AIInsight {
  id: string;
  type: 'bullish' | 'bearish' | 'neutral' | 'warning';
  symbol: string;
  title: string;
  description: string;
  confidence: number;
  timeframe: string;
  factors: string[];
  historicalContext?: string;
  recommendedAction: string;
}

interface MarketPattern {
  id: string;
  name: string;
  symbol: string;
  patternType: 'bullish' | 'bearish' | 'continuation';
  strength: 'weak' | 'moderate' | 'strong';
  description: string;
  historicalOccurrences: number;
  successRate: number;
  period: string;
  keyLevels: {
    support?: number;
    resistance?: number;
    target?: number;
  };
}

interface RiskAssessment {
  symbol: string;
  overallRisk: 'Low' | 'Medium' | 'High';
  factors: {
    volatility: number;
    liquidityRisk: 'Low' | 'Medium' | 'High';
    sectorRisk: 'Low' | 'Medium' | 'High';
    historicalDrawdown: number;
  };
  recommendations: string[];
  positionSizing: {
    conservative: number;
    moderate: number;
    aggressive: number;
  };
}

interface EducationalTip {
  id: string;
  category: 'Pattern Recognition' | 'Risk Management' | 'Historical Context' | 'Strategy';
  title: string;
  content: string;
  applicableSymbols: string[];
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  estimatedReadTime: string;
}

export const SimulationAnalysisSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState('insights');
  const [selectedSymbol, setSelectedSymbol] = useState('AAPL');
  const [aiInsights, setAIInsights] = useState<AIInsight[]>([]);
  const [marketPatterns, setMarketPatterns] = useState<MarketPattern[]>([]);
  const [riskAssessment, setRiskAssessment] = useState<RiskAssessment | null>(null);
  const [educationalTips, setEducationalTips] = useState<EducationalTip[]>([]);
  const [loading, setLoading] = useState(true);

  const { marketData } = useMarketData();
  const { currentSession, portfolioData, executeTrade } = useSimulationPortfolio();
  const navigate = useNavigate();

  const periods = historicalDataService.getHistoricalPeriods();

  // Generate AI insights based on current simulation and market data
  useEffect(() => {
    const generateInsights = () => {
      if (!marketData || typeof marketData !== 'object') return;

      const insights: AIInsight[] = [];
      const symbols = ['AAPL', 'GOOGL', 'MSFT', 'NVDA', 'TSLA', 'AMZN', 'META', 'NFLX'];

      symbols.forEach(symbol => {
        const data = marketData[symbol];
        if (data) {
          // Generate contextual insights based on historical period
          const periodContext = getPeriodContext(symbol, currentSession?.historical_period);
          
          if (data.changePercent > 5) {
            insights.push({
              id: `bullish-${symbol}`,
              type: 'bullish',
              symbol,
              title: `Strong Upward Momentum in ${symbol}`,
              description: `${symbol} showing significant positive movement (+${data.changePercent.toFixed(2)}%). ${periodContext.context}`,
              confidence: Math.min(95, 60 + Math.abs(data.changePercent)),
              timeframe: 'Short-term',
              factors: periodContext.factors,
              historicalContext: periodContext.historical,
              recommendedAction: periodContext.action
            });
          } else if (data.changePercent < -5) {
            insights.push({
              id: `bearish-${symbol}`,
              type: 'bearish',
              symbol,
              title: `Significant Decline in ${symbol}`,
              description: `${symbol} experiencing notable weakness (${data.changePercent.toFixed(2)}%). ${periodContext.context}`,
              confidence: Math.min(90, 60 + Math.abs(data.changePercent)),
              timeframe: 'Short-term',
              factors: periodContext.factors,
              historicalContext: periodContext.historical,
              recommendedAction: periodContext.action
            });
          } else if (Math.abs(data.changePercent) < 1) {
            insights.push({
              id: `neutral-${symbol}`,
              type: 'neutral',
              symbol,
              title: `${symbol} Trading in Consolidation`,
              description: `${symbol} showing minimal movement, potential for breakout. ${periodContext.context}`,
              confidence: 70,
              timeframe: 'Medium-term',
              factors: ['Low volatility', 'Range-bound trading', 'Awaiting catalyst'],
              historicalContext: periodContext.historical,
              recommendedAction: 'Wait for clear directional move'
            });
          }
        }
      });

      setAIInsights(insights.slice(0, 6)); // Limit to top 6 insights
    };

    const timeoutId = setTimeout(generateInsights, 100);
    return () => clearTimeout(timeoutId);
  }, [JSON.stringify(marketData), currentSession?.historical_period]);

  // Generate market patterns
  useEffect(() => {
    const patterns: MarketPattern[] = [
      {
        id: 'head-shoulders-aapl',
        name: 'Head and Shoulders',
        symbol: 'AAPL',
        patternType: 'bearish',
        strength: 'moderate',
        description: 'Classic reversal pattern forming over the past 3 months',
        historicalOccurrences: 15,
        successRate: 68,
        period: currentSession?.historical_period || 'modern',
        keyLevels: { support: 145, resistance: 155, target: 135 }
      },
      {
        id: 'ascending-triangle-msft',
        name: 'Ascending Triangle',
        symbol: 'MSFT',
        patternType: 'bullish',
        strength: 'strong',
        description: 'Bullish continuation pattern with strong volume confirmation',
        historicalOccurrences: 22,
        successRate: 74,
        period: currentSession?.historical_period || 'modern',
        keyLevels: { resistance: 280, target: 295 }
      }
    ];

    setMarketPatterns(patterns);
  }, [currentSession]);

  // Generate risk assessment for selected symbol
  useEffect(() => {
    if (!selectedSymbol) return;

    const assessment: RiskAssessment = {
      symbol: selectedSymbol,
      overallRisk: calculateOverallRisk(selectedSymbol),
      factors: {
        volatility: calculateVolatility(selectedSymbol),
        liquidityRisk: 'Low',
        sectorRisk: getSectorRisk(selectedSymbol),
        historicalDrawdown: getHistoricalDrawdown(selectedSymbol)
      },
      recommendations: getRiskRecommendations(selectedSymbol),
      positionSizing: {
        conservative: 2,
        moderate: 5,
        aggressive: 10
      }
    };

    setRiskAssessment(assessment);
  }, [selectedSymbol, currentSession]);

  // Generate educational tips
  useEffect(() => {
    const tips: EducationalTip[] = [
      {
        id: 'pattern-recognition',
        category: 'Pattern Recognition',
        title: 'Identifying Market Patterns in Historical Context',
        content: 'Learn to spot recurring price patterns that have historically led to predictable outcomes. During the 2008 crisis, certain patterns had higher success rates due to market conditions.',
        applicableSymbols: ['AAPL', 'MSFT', 'GOOGL'],
        difficulty: 'Intermediate',
        estimatedReadTime: '5 min'
      },
      {
        id: 'risk-management',
        category: 'Risk Management',
        title: 'Position Sizing During Market Volatility',
        content: 'Understanding how to adjust position sizes based on historical volatility. During periods like the Great Depression, smaller positions were crucial for survival.',
        applicableSymbols: ['ALL'],
        difficulty: 'Beginner',
        estimatedReadTime: '7 min'
      },
      {
        id: 'historical-context',
        category: 'Historical Context',
        title: 'Market Cycles and Sector Rotation',
        content: 'How different sectors perform during various economic cycles. Technology stocks behaved differently in the dot-com bubble vs the 2008 crisis.',
        applicableSymbols: ['AAPL', 'MSFT', 'GOOGL'],
        difficulty: 'Advanced',
        estimatedReadTime: '10 min'
      }
    ];

    setEducationalTips(tips);
    setLoading(false);
  }, []);

  const getPeriodContext = (symbol: string, period?: string) => {
    const contexts: Record<string, any> = {
      'great-depression': {
        context: 'During the Great Depression, quality companies often presented exceptional value opportunities.',
        factors: ['Economic uncertainty', 'Deflationary pressure', 'Credit contraction'],
        historical: 'Similar patterns occurred in 1929-1932',
        action: 'Consider gradual accumulation on weakness'
      },
      '2008-crisis': {
        context: 'Financial crisis created opportunities in fundamentally sound companies.',
        factors: ['Credit crisis', 'Systemic risk', 'Flight to quality'],
        historical: 'Banks and financials were most affected',
        action: 'Focus on companies with strong balance sheets'
      },
      'dot-com-bubble': {
        context: 'Tech valuations were disconnected from fundamentals during this period.',
        factors: ['Speculation', 'Growth at any price', 'FOMO investing'],
        historical: 'Revenue-less companies traded at extreme multiples',
        action: 'Look for sustainable business models'
      }
    };

    return contexts[period || 'modern'] || {
      context: 'Current market conditions require careful analysis.',
      factors: ['Market sentiment', 'Economic indicators', 'Technical signals'],
      historical: 'Historical patterns suggest...',
      action: 'Monitor key support/resistance levels'
    };
  };

  const calculateOverallRisk = (symbol: string): 'Low' | 'Medium' | 'High' => {
    const riskLevels: Record<string, 'Low' | 'Medium' | 'High'> = {
      'AAPL': 'Medium',
      'MSFT': 'Low',
      'GOOGL': 'Medium',
      'TSLA': 'High',
      'NVDA': 'High'
    };
    return riskLevels[symbol] || 'Medium';
  };

  const calculateVolatility = (symbol: string): number => {
    const volatilities: Record<string, number> = {
      'AAPL': 25,
      'MSFT': 22,
      'GOOGL': 28,
      'TSLA': 45,
      'NVDA': 40
    };
    return volatilities[symbol] || 30;
  };

  const getSectorRisk = (symbol: string): 'Low' | 'Medium' | 'High' => {
    const sectors: Record<string, 'Low' | 'Medium' | 'High'> = {
      'AAPL': 'Medium',
      'MSFT': 'Low',
      'GOOGL': 'Medium',
      'TSLA': 'High',
      'NVDA': 'High'
    };
    return sectors[symbol] || 'Medium';
  };

  const getHistoricalDrawdown = (symbol: string): number => {
    const drawdowns: Record<string, number> = {
      'AAPL': 35,
      'MSFT': 28,
      'GOOGL': 42,
      'TSLA': 65,
      'NVDA': 58
    };
    return drawdowns[symbol] || 40;
  };

  const getRiskRecommendations = (symbol: string): string[] => {
    return [
      `Monitor ${symbol} volatility closely`,
      'Use stop-loss orders for downside protection',
      'Consider dollar-cost averaging for large positions',
      'Review position size relative to portfolio risk'
    ];
  };

  const handleSymbolSelect = (symbol: string) => {
    setSelectedSymbol(symbol);
  };

  const handleQuickTrade = async (symbol: string, type: 'BUY' | 'SELL') => {
    if (!currentSession || !marketData[symbol]) return;

    const price = marketData[symbol].price;
    const quantity = 10; // Default quantity

    try {
      const result = await executeTrade({
        symbol,
        type,
        quantity,
        price
      });

      if (result.success) {
        console.log(`Trade executed: ${type} ${quantity} ${symbol} @ $${price}`);
      }
    } catch (error) {
      console.error('Trade execution failed:', error);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value);
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'bullish': return <TrendingUp className="h-5 w-5 text-green-400" />;
      case 'bearish': return <TrendingDown className="h-5 w-5 text-red-400" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-400" />;
      default: return <Brain className="h-5 w-5 text-cyan-400" />;
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'bullish': return 'border-green-500/30 bg-green-950/20';
      case 'bearish': return 'border-red-500/30 bg-red-950/20';
      case 'warning': return 'border-yellow-500/30 bg-yellow-950/20';
      default: return 'border-cyan-500/30 bg-cyan-950/20';
    }
  };

  const tabs = [
    { id: 'insights', label: 'AI Insights', icon: Brain },
    { id: 'patterns', label: 'Market Patterns', icon: BarChart3 },
    { id: 'risk', label: 'Risk Analysis', icon: AlertTriangle },
    { id: 'education', label: 'Learn', icon: BookOpen }
  ];

  const symbols = ['AAPL', 'GOOGL', 'MSFT', 'NVDA', 'TSLA', 'AMZN', 'META', 'NFLX'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Market Analysis</h1>
          <p className="text-slate-400">AI-powered insights and historical market analysis</p>
        </div>
        
        {currentSession && (
          <div className="text-right">
            <div className="text-sm text-slate-400">Analyzing Period</div>
            <Badge variant="outline" className="text-cyan-400 border-cyan-400">
              {periods.find(p => p.id === currentSession.historical_period)?.name}
            </Badge>
          </div>
        )}
      </div>

      {/* Symbol Selector */}
      <div className="flex items-center gap-2 overflow-x-auto">
        <span className="text-slate-400 text-sm whitespace-nowrap">Analyze:</span>
        {symbols.map(symbol => (
          <button
            key={symbol}
            onClick={() => handleSymbolSelect(symbol)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              selectedSymbol === symbol
                ? 'bg-cyan-500 text-white'
                : 'bg-slate-800/50 text-slate-300 hover:bg-slate-800'
            }`}
          >
            {symbol}
            {marketData[symbol] && (
              <span className={`ml-2 text-xs ${
                marketData[symbol].change >= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {marketData[symbol].changePercent.toFixed(1)}%
              </span>
            )}
          </button>
        ))}
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
        {activeTab === 'insights' && (
          <div className="grid gap-6 md:grid-cols-2">
            {aiInsights.map((insight) => (
              <Card 
                key={insight.id} 
                className={`text-white border-2 transition-all duration-200 hover:scale-105 ${getInsightColor(insight.type)}`}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getInsightIcon(insight.type)}
                      <CardTitle className="text-lg">{insight.title}</CardTitle>
                    </div>
                    <Badge variant="outline" className="text-xs border-slate-600 text-slate-400">
                      {insight.confidence}% confidence
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <p className="text-sm text-slate-300">
                    {insight.description}
                  </p>
                  
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Clock className="h-3 w-3" />
                    {insight.timeframe}
                  </div>
                  
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-slate-300">Key Factors:</div>
                    <div className="flex flex-wrap gap-1">
                      {insight.factors.map((factor, index) => (
                        <Badge key={index} variant="outline" className="text-xs border-slate-600 text-slate-400">
                          {factor}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {insight.historicalContext && (
                    <div className="pt-3 border-t border-slate-700">
                      <div className="text-xs text-slate-500">
                        <span className="font-semibold">Historical Context:</span> {insight.historicalContext}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => navigate(`/analysis/${insight.symbol}`)}
                      className="flex-1 bg-slate-800 hover:bg-slate-700 border border-slate-600"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Analyze
                    </Button>
                    {currentSession && (
                      <Button
                        size="sm"
                        onClick={() => handleQuickTrade(insight.symbol, insight.type === 'bullish' ? 'BUY' : 'SELL')}
                        className={`flex-1 ${
                          insight.type === 'bullish' 
                            ? 'bg-green-600 hover:bg-green-700' 
                            : insight.type === 'bearish'
                            ? 'bg-red-600 hover:bg-red-700'
                            : 'bg-slate-600 hover:bg-slate-700'
                        }`}
                      >
                        <Zap className="h-4 w-4 mr-1" />
                        {insight.type === 'bullish' ? 'Buy' : insight.type === 'bearish' ? 'Sell' : 'Trade'}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {activeTab === 'patterns' && (
          <div className="grid gap-6 md:grid-cols-2">
            {marketPatterns.map((pattern) => (
              <Card key={pattern.id} className="bg-slate-900/40 border-slate-700 text-white">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <BarChart3 className="h-5 w-5 text-cyan-400" />
                      {pattern.name}
                    </CardTitle>
                    <Badge 
                      variant="outline" 
                      className={`${
                        pattern.strength === 'strong' ? 'border-green-500 text-green-400' :
                        pattern.strength === 'moderate' ? 'border-yellow-500 text-yellow-400' :
                        'border-slate-500 text-slate-400'
                      }`}
                    >
                      {pattern.strength}
                    </Badge>
                  </div>
                  <CardDescription className="flex items-center gap-2 text-slate-400">
                    <Target className="h-4 w-4" />
                    {pattern.symbol} • {pattern.patternType}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <p className="text-sm text-slate-300">
                    {pattern.description}
                  </p>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-slate-400">Success Rate</div>
                      <div className="font-semibold text-white">{pattern.successRate}%</div>
                    </div>
                    <div>
                      <div className="text-slate-400">Historical Count</div>
                      <div className="font-semibold text-white">{pattern.historicalOccurrences}</div>
                    </div>
                  </div>
                  
                  {Object.keys(pattern.keyLevels).length > 0 && (
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-slate-300">Key Levels:</div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {pattern.keyLevels.support && (
                          <div>
                            <span className="text-slate-400">Support: </span>
                            <span className="text-green-400">{formatCurrency(pattern.keyLevels.support)}</span>
                          </div>
                        )}
                        {pattern.keyLevels.resistance && (
                          <div>
                            <span className="text-slate-400">Resistance: </span>
                            <span className="text-red-400">{formatCurrency(pattern.keyLevels.resistance)}</span>
                          </div>
                        )}
                        {pattern.keyLevels.target && (
                          <div className="col-span-2">
                            <span className="text-slate-400">Target: </span>
                            <span className="text-cyan-400 font-semibold">{formatCurrency(pattern.keyLevels.target)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {activeTab === 'risk' && riskAssessment && (
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="bg-slate-900/40 border-slate-700 text-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <AlertTriangle className="h-5 w-5 text-yellow-400" />
                  Risk Assessment - {selectedSymbol}
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Overall Risk Level: 
                  <Badge 
                    variant="outline" 
                    className={`ml-2 ${
                      riskAssessment.overallRisk === 'High' ? 'border-red-500 text-red-400' :
                      riskAssessment.overallRisk === 'Medium' ? 'border-yellow-500 text-yellow-400' :
                      'border-green-500 text-green-400'
                    }`}
                  >
                    {riskAssessment.overallRisk}
                  </Badge>
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-slate-400">Volatility</div>
                    <div className="font-semibold text-white">{riskAssessment.factors.volatility}%</div>
                  </div>
                  <div>
                    <div className="text-slate-400">Max Drawdown</div>
                    <div className="font-semibold text-red-400">{riskAssessment.factors.historicalDrawdown}%</div>
                  </div>
                  <div>
                    <div className="text-slate-400">Liquidity Risk</div>
                    <div className={`font-semibold ${
                      riskAssessment.factors.liquidityRisk === 'High' ? 'text-red-400' :
                      riskAssessment.factors.liquidityRisk === 'Medium' ? 'text-yellow-400' :
                      'text-green-400'
                    }`}>{riskAssessment.factors.liquidityRisk}</div>
                  </div>
                  <div>
                    <div className="text-slate-400">Sector Risk</div>
                    <div className={`font-semibold ${
                      riskAssessment.factors.sectorRisk === 'High' ? 'text-red-400' :
                      riskAssessment.factors.sectorRisk === 'Medium' ? 'text-yellow-400' :
                      'text-green-400'
                    }`}>{riskAssessment.factors.sectorRisk}</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium text-slate-300">Recommendations:</div>
                  <ul className="text-xs text-slate-400 space-y-1">
                    {riskAssessment.recommendations.map((rec, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <CheckCircle className="h-3 w-3 text-green-400 mt-0.5 flex-shrink-0" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/40 border-slate-700 text-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <PieChart className="h-5 w-5 text-cyan-400" />
                  Position Sizing Guide
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Recommended position sizes based on risk tolerance
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-green-950/30 border border-green-500/20 rounded">
                    <div>
                      <div className="text-green-400 font-medium">Conservative</div>
                      <div className="text-xs text-green-300">Low risk, stable returns</div>
                    </div>
                    <div className="text-green-400 font-bold">{riskAssessment.positionSizing.conservative}%</div>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-yellow-950/30 border border-yellow-500/20 rounded">
                    <div>
                      <div className="text-yellow-400 font-medium">Moderate</div>
                      <div className="text-xs text-yellow-300">Balanced risk/reward</div>
                    </div>
                    <div className="text-yellow-400 font-bold">{riskAssessment.positionSizing.moderate}%</div>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-red-950/30 border border-red-500/20 rounded">
                    <div>
                      <div className="text-red-400 font-medium">Aggressive</div>
                      <div className="text-xs text-red-300">High risk, high potential</div>
                    </div>
                    <div className="text-red-400 font-bold">{riskAssessment.positionSizing.aggressive}%</div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-700">
                  <div className="text-xs text-slate-500">
                    Percentages represent portion of total portfolio value. 
                    Adjust based on your risk tolerance and market conditions.
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'education' && (
          <div className="grid gap-6">
            {educationalTips.map((tip) => (
              <Card key={tip.id} className="bg-slate-900/40 border-slate-700 text-white">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <BookOpen className="h-5 w-5 text-cyan-400" />
                      {tip.title}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs border-slate-600 text-slate-400">
                        {tip.difficulty}
                      </Badge>
                      <Badge variant="outline" className="text-xs border-slate-600 text-slate-400">
                        {tip.estimatedReadTime}
                      </Badge>
                    </div>
                  </div>
                  <CardDescription className="text-slate-400">
                    {tip.category}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <p className="text-sm text-slate-300">
                    {tip.content}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">Applies to:</span>
                      {tip.applicableSymbols.includes('ALL') ? (
                        <Badge variant="outline" className="text-xs border-cyan-500 text-cyan-400">
                          All Symbols
                        </Badge>
                      ) : (
                        tip.applicableSymbols.slice(0, 3).map(symbol => (
                          <Badge key={symbol} variant="outline" className="text-xs border-slate-600 text-slate-400">
                            {symbol}
                          </Badge>
                        ))
                      )}
                    </div>
                    
                    <Button size="sm" className="bg-cyan-500 hover:bg-cyan-600">
                      <Lightbulb className="h-4 w-4 mr-2" />
                      Learn More
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};