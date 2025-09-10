import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, PieChart, DollarSign, BarChart3 } from 'lucide-react';
import { MarketDataState } from '../../hooks/useMarketData';

interface PortfolioDashboardProps {
  portfolioData: any;
  marketData: MarketDataState;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  refreshInterval?: number;
}

export const PortfolioDashboard: React.FC<PortfolioDashboardProps> = ({ 
  portfolioData,
  marketData,
  connectionStatus,
  refreshInterval = 1000 
}) => {
  // Calculate portfolio metrics based on current market data
  const portfolioMetrics = useMemo(() => {
    const cash = portfolioData?.cash || 10000;
    const holdings = portfolioData?.holdings || {
      'AAPL': 10,
      'GOOGL': 5,
      'MSFT': 8,
      'NVDA': 3,
      'TSLA': 7
    };

    let totalHoldingsValue = 0;
    let totalPnL = 0;
    const positions = [];

    Object.entries(holdings).forEach(([symbol, shares]: [string, any]) => {
      const currentPrice = marketData[symbol]?.price || 150; // Fallback price
      const value = currentPrice * shares;
      const avgCost = 140; // Simulated average cost
      const pnl = (currentPrice - avgCost) * shares;
      const pnlPercent = ((currentPrice - avgCost) / avgCost) * 100;

      totalHoldingsValue += value;
      totalPnL += pnl;

      positions.push({
        symbol,
        shares,
        currentPrice,
        value,
        avgCost,
        pnl,
        pnlPercent
      });
    });

    const totalValue = cash + totalHoldingsValue;
    const totalPnLPercent = totalHoldingsValue > 0 ? (totalPnL / (totalHoldingsValue - totalPnL)) * 100 : 0;

    return {
      cash,
      totalHoldingsValue,
      totalValue,
      totalPnL,
      totalPnLPercent,
      positions
    };
  }, [portfolioData, marketData]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatPercent = (percent: number) => {
    return `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`;
  };

  return (
    <div className="h-full flex flex-col bg-slate-900/30 rounded-lg border border-slate-700">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <PieChart className="h-4 w-4 text-cyan-500" />
          <span className="text-white text-sm font-medium">Portfolio</span>
        </div>
        <div className={`w-2 h-2 rounded-full ${
          connectionStatus === 'connected' ? 'bg-green-400' : 'bg-red-400'
        }`}></div>
      </div>

      <div className="flex-1 p-3 space-y-3 overflow-y-auto">
        {/* Portfolio Summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-3 w-3 text-green-400" />
              <span className="text-xs text-slate-400">Total Value</span>
            </div>
            <div className="text-lg font-bold text-white font-mono">
              {formatCurrency(portfolioMetrics.totalValue)}
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="h-3 w-3 text-cyan-400" />
              <span className="text-xs text-slate-400">P&L</span>
            </div>
            <div className={`text-lg font-bold font-mono ${
              portfolioMetrics.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              {formatCurrency(portfolioMetrics.totalPnL)}
            </div>
            <div className={`text-xs ${
              portfolioMetrics.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              {formatPercent(portfolioMetrics.totalPnLPercent)}
            </div>
          </div>
        </div>

        {/* Cash and Holdings */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-800/30 rounded p-2">
            <div className="text-xs text-slate-400 mb-1">Cash</div>
            <div className="text-sm font-mono text-white">
              {formatCurrency(portfolioMetrics.cash)}
            </div>
          </div>
          <div className="bg-slate-800/30 rounded p-2">
            <div className="text-xs text-slate-400 mb-1">Holdings</div>
            <div className="text-sm font-mono text-white">
              {formatCurrency(portfolioMetrics.totalHoldingsValue)}
            </div>
          </div>
        </div>

        {/* Positions */}
        <div>
          <div className="text-xs text-slate-400 mb-2">Positions</div>
          <div className="space-y-2">
            {portfolioMetrics.positions.map((position) => (
              <div
                key={position.symbol}
                className="bg-slate-800/50 rounded-lg p-2 border border-slate-700"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-bold text-white">
                    {position.symbol}
                  </span>
                  <div className="text-right">
                    <div className="text-sm font-mono text-white">
                      {formatCurrency(position.currentPrice)}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">
                    {position.shares} shares
                  </span>
                  <div className={`font-mono ${
                    position.pnl >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {formatCurrency(position.pnl)} ({formatPercent(position.pnlPercent)})
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs mt-1">
                  <span className="text-slate-500">
                    Value: {formatCurrency(position.value)}
                  </span>
                  <span className="text-slate-500">
                    Avg: {formatCurrency(position.avgCost)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-slate-700">
        <div className="flex justify-between items-center text-xs text-slate-400">
          <span>{portfolioMetrics.positions.length} positions</span>
          <span className="font-mono">{connectionStatus.toUpperCase()}</span>
        </div>
      </div>
    </div>
  );
};