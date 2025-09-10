import React, { useState, useEffect } from 'react';
import { useSimulationPortfolio } from '../../hooks/useSimulationPortfolio';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  BarChart3, 
  Clock, 
  Calendar,
  PieChart,
  AlertCircle,
  RefreshCw,
  History
} from 'lucide-react';

interface SimulationPortfolioWidgetProps {
  historicalPeriod?: string;
  onTradeRequest?: (symbol: string) => void;
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const percentFormatter = new Intl.NumberFormat('en-US', {
  style: 'percent',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

export const SimulationPortfolioWidget: React.FC<SimulationPortfolioWidgetProps> = ({
  historicalPeriod,
  onTradeRequest
}) => {
  const { 
    portfolioData, 
    currentSession, 
    loading, 
    error, 
    createSession,
    refreshPortfolio,
    executeTrade
  } = useSimulationPortfolio(historicalPeriod);

  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshPortfolio();
    setRefreshing(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading && !portfolioData) {
    return (
      <Card className="bg-slate-900/40 backdrop-blur-lg border border-slate-700/80 text-white">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="animate-spin">
              <RefreshCw className="h-4 w-4" />
            </div>
            <CardTitle className="text-lg">Loading Portfolio...</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-4 bg-slate-700/50 rounded animate-pulse" />
            <div className="h-4 bg-slate-700/50 rounded animate-pulse" />
            <div className="h-4 bg-slate-700/50 rounded animate-pulse" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-red-950/40 border border-red-500/30 text-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-300">
            <AlertCircle className="h-5 w-5" />
            Portfolio Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-300 text-sm">{error}</p>
          {historicalPeriod && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => createSession(historicalPeriod)}
              className="mt-3 border-red-500/30 text-red-300 hover:bg-red-500/20"
            >
              Retry Setup
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  if (!portfolioData || !currentSession) {
    return (
      <Card className="bg-slate-900/40 backdrop-blur-lg border border-slate-700/80 text-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-cyan-400" />
            Simulation Portfolio
          </CardTitle>
          <CardDescription className="text-slate-400">
            No active simulation session
          </CardDescription>
        </CardHeader>
        <CardContent>
          {historicalPeriod && (
            <Button 
              onClick={() => createSession(historicalPeriod)}
              className="w-full bg-cyan-500 hover:bg-cyan-600"
            >
              Start Simulation
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  const { balance, holdings, session } = portfolioData;
  const isPositive = balance.totalReturn >= 0;

  return (
    <Card className="bg-slate-900/40 backdrop-blur-lg border border-slate-700/80 text-white">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-cyan-400" />
            <CardTitle className="text-lg">Simulation Portfolio</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="text-slate-400 hover:text-white"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <CardDescription className="text-slate-400">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4" />
            {formatDate(session.currentDate)} 
            <Badge variant="outline" className="text-xs border-cyan-500/30 text-cyan-400">
              {session.period}
            </Badge>
          </div>
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Portfolio Value Summary */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-slate-400 text-sm">
              <DollarSign className="h-3 w-3" />
              Total Value
            </div>
            <div className="text-xl font-bold text-white">
              {currencyFormatter.format(balance.totalValue)}
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-slate-400 text-sm">
              {isPositive ? (
                <TrendingUp className="h-3 w-3 text-green-400" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-400" />
              )}
              Total Return
            </div>
            <div className={`text-xl font-bold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
              {currencyFormatter.format(balance.totalReturn)}
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div className="text-center p-2 bg-slate-800/50 rounded">
            <div className="text-slate-400">Cash</div>
            <div className="font-semibold text-white">
              {currencyFormatter.format(balance.cash)}
            </div>
          </div>
          
          <div className="text-center p-2 bg-slate-800/50 rounded">
            <div className="text-slate-400">Invested</div>
            <div className="font-semibold text-white">
              {currencyFormatter.format(balance.invested)}
            </div>
          </div>
          
          <div className="text-center p-2 bg-slate-800/50 rounded">
            <div className="text-slate-400">Return %</div>
            <div className={`font-semibold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
              {percentFormatter.format(balance.totalReturnPercent / 100)}
            </div>
          </div>
        </div>

        {/* Holdings Summary */}
        {holdings && holdings.length > 0 ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <PieChart className="h-4 w-4" />
              Current Holdings ({holdings.length})
            </div>
            
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {holdings.slice(0, 5).map((holding) => (
                <div 
                  key={holding.symbol}
                  className="flex items-center justify-between p-2 bg-slate-800/30 rounded hover:bg-slate-800/50 transition-colors cursor-pointer"
                  onClick={() => onTradeRequest?.(holding.symbol)}
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs border-slate-600 text-slate-300">
                      {holding.symbol}
                    </Badge>
                    <span className="text-xs text-slate-400">
                      {holding.quantity} shares
                    </span>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-xs text-white">
                      {currencyFormatter.format(holding.marketValue)}
                    </div>
                    <div className={`text-xs ${holding.unrealizedPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {holding.unrealizedPnL >= 0 ? '+' : ''}
                      {currencyFormatter.format(holding.unrealizedPnL)}
                    </div>
                  </div>
                </div>
              ))}
              
              {holdings.length > 5 && (
                <div className="text-center text-xs text-slate-500 py-1">
                  +{holdings.length - 5} more holdings
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-4 text-slate-500">
            <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <div className="text-sm">No holdings yet</div>
            <div className="text-xs">Start trading to build your portfolio</div>
          </div>
        )}

        {/* Session Progress */}
        <div className="pt-2 border-t border-slate-700/50">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Simulation Period
            </div>
            <div>
              {formatDate(session.startDate)} - {formatDate(session.endDate)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};