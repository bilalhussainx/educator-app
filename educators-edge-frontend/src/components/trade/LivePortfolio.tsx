import React, { useMemo } from 'react';
import { PieChart, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { MarketData, ConnectionStatus } from '../../hooks/useFinnhubWebSocket';

interface LivePortfolioProps {
  portfolioData: any;
  marketData: Map<string, MarketData>;
  connectionStatus: ConnectionStatus;
  activeSymbol: string;
}

export const LivePortfolio: React.FC<LivePortfolioProps> = ({
  portfolioData,
  marketData,
  connectionStatus,
  activeSymbol
}) => {
  // Calculate live portfolio metrics
  const portfolioMetrics = useMemo(() => {
    const cash = portfolioData?.cash || 10000;
    const holdings = portfolioData?.holdings || {
      'AAPL': 10,
      'GOOGL': 5,
      'MSFT': 8,
      'NVDA': 3,
      'TSLA': 7,
      'AMZN': 2,
      'META': 4,
      'NFLX': 6
    };

    let totalHoldingsValue = 0;
    let totalPnL = 0;
    const positions = [];

    Object.entries(holdings).forEach(([symbol, shares]: [string, any]) => {
      const currentPrice = marketData[symbol]?.price || 150; // Fallback
      const avgCost = 140 + Math.random() * 20; // Simulated average cost
      const value = currentPrice * shares;
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
        pnlPercent,
        isActive: symbol === activeSymbol
      });
    });

    const totalValue = cash + totalHoldingsValue;
    const totalPnLPercent = totalHoldingsValue > 0 ? (totalPnL / (totalHoldingsValue - totalPnL)) * 100 : 0;

    // Sort positions with active symbol first, then by value
    positions.sort((a, b) => {
      if (a.isActive) return -1;
      if (b.isActive) return 1;
      return b.value - a.value;
    });

    return {
      cash,
      totalHoldingsValue,
      totalValue,
      totalPnL,
      totalPnLPercent,
      positions
    };
  }, [portfolioData, marketData, activeSymbol]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatPercent = (percent: number) => {
    return `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`;
  };

  return (
    <div className="h-full flex bg-slate-950">
      {/* Portfolio Summary */}
      <div className="w-1/3 p-4 border-r border-slate-700">
        <div className="flex items-center gap-2 mb-4">
          <PieChart className="h-4 w-4 text-cyan-500" />
          <span className="text-white font-semibold">Portfolio</span>
          <div className={`w-2 h-2 rounded-full ml-auto ${
            connectionStatus === 'Connected' ? 'bg-green-400' : 'bg-red-400'
          }`}></div>
        </div>

        {/* Total Value */}
        <div className="bg-slate-900/50 rounded-lg p-3 mb-3">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="h-3 w-3 text-green-400" />
            <span className="text-xs text-slate-400">Total Value</span>
          </div>
          <div className="text-lg font-bold text-white font-mono">
            {formatCurrency(portfolioMetrics.totalValue)}
          </div>
        </div>

        {/* P&L */}
        <div className="bg-slate-900/50 rounded-lg p-3 mb-3">
          <div className="flex items-center gap-2 mb-1">
            {portfolioMetrics.totalPnL >= 0 ? (
              <TrendingUp className="h-3 w-3 text-green-400" />
            ) : (
              <TrendingDown className="h-3 w-3 text-red-400" />
            )}
            <span className="text-xs text-slate-400">Total P&L</span>
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

        {/* Cash & Holdings */}
        <div className="grid grid-cols-1 gap-2">
          <div className="bg-slate-800/30 rounded p-2">
            <div className="text-xs text-slate-400">Cash</div>
            <div className="text-sm font-mono text-white">
              {formatCurrency(portfolioMetrics.cash)}
            </div>
          </div>
          <div className="bg-slate-800/30 rounded p-2">
            <div className="text-xs text-slate-400">Holdings</div>
            <div className="text-sm font-mono text-white">
              {formatCurrency(portfolioMetrics.totalHoldingsValue)}
            </div>
          </div>
        </div>
      </div>

      {/* Live Positions */}
      <div className="flex-1 p-4">
        <div className="flex items-center justify-between mb-4">
          <span className="text-white font-semibold">Live Positions</span>
          <span className="text-xs text-slate-400">
            {portfolioMetrics.positions.length} holdings
          </span>
        </div>

        <div className="space-y-2 max-h-[calc(100%-2rem)] overflow-y-auto">
          {portfolioMetrics.positions.map((position) => (
            <div
              key={position.symbol}
              className={`p-3 rounded-lg border transition-all ${
                position.isActive
                  ? 'bg-cyan-900/30 border-cyan-500'
                  : 'bg-slate-900/50 border-slate-700'
              }`}
            >
              {/* Symbol and Current Price */}
              <div className="flex items-center justify-between mb-2">
                <span className={`font-bold ${
                  position.isActive ? 'text-cyan-400' : 'text-white'
                }`}>
                  {position.symbol}
                </span>
                <div className="text-right">
                  <div className={`text-sm font-mono font-bold ${
                    position.isActive ? 'text-cyan-400' : 'text-white'
                  }`}>
                    {formatCurrency(position.currentPrice)}
                  </div>
                  <div className="text-xs text-slate-400">
                    {position.shares} shares
                  </div>
                </div>
              </div>

              {/* Value and P&L */}
              <div className="flex items-center justify-between text-sm">
                <div>
                  <div className="text-slate-400">Value</div>
                  <div className="font-mono text-white">
                    {formatCurrency(position.value)}
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-mono ${
                    position.pnl >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {formatCurrency(position.pnl)}
                  </div>
                  <div className={`text-xs ${
                    position.pnl >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {formatPercent(position.pnlPercent)}
                  </div>
                </div>
              </div>

              {/* Average Cost */}
              <div className="mt-1 text-xs text-slate-500">
                Avg Cost: {formatCurrency(position.avgCost)}
              </div>

              {/* Real-time update indicator */}
              {connectionStatus === 'Connected' && (
                <div className="mt-2 flex justify-end">
                  <div className="w-1 h-1 bg-green-400 rounded-full animate-pulse"></div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};