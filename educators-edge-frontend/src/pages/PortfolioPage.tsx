import React from 'react';
import { Link } from 'react-router-dom';
import { FinancialLayout } from '../components/layout/FinancialLayout';
import { usePortfolio } from '../hooks/usePortfolio';
import { useMarketData } from '../hooks/useMarketData';
import { 
  TrendingUp, TrendingDown, PieChart, DollarSign, 
  BarChart3, Target, Plus, ExternalLink 
} from 'lucide-react';

interface Position {
  symbol: string;
  name: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  totalValue: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  allocation: number;
}

interface PortfolioSummary {
  totalValue: number;
  totalCost: number;
  totalPnL: number;
  totalPnLPercent: number;
  cash: number;
  positions: Position[];
}

const PortfolioSummaryCard: React.FC<{ summary: PortfolioSummary }> = ({ summary }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <div className="bg-slate-900/40 border border-slate-700 rounded-lg p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-slate-400">Total Value</h3>
          <PieChart className="h-5 w-5 text-slate-400" />
        </div>
        <p className="text-2xl font-bold text-white">
          ${summary.totalValue.toLocaleString()}
        </p>
      </div>
      
      <div className="bg-slate-900/40 border border-slate-700 rounded-lg p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-slate-400">Total P&L</h3>
          {summary.totalPnL > 0 ? (
            <TrendingUp className="h-5 w-5 text-green-400" />
          ) : (
            <TrendingDown className="h-5 w-5 text-red-400" />
          )}
        </div>
        <p className={`text-2xl font-bold ${summary.totalPnL > 0 ? 'text-green-400' : 'text-red-400'}`}>
          {summary.totalPnL > 0 ? '+' : ''}${summary.totalPnL.toLocaleString()}
        </p>
        <p className={`text-sm ${summary.totalPnL > 0 ? 'text-green-400' : 'text-red-400'}`}>
          {summary.totalPnLPercent > 0 ? '+' : ''}{summary.totalPnLPercent.toFixed(2)}%
        </p>
      </div>
      
      <div className="bg-slate-900/40 border border-slate-700 rounded-lg p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-slate-400">Cash</h3>
          <DollarSign className="h-5 w-5 text-slate-400" />
        </div>
        <p className="text-2xl font-bold text-white">
          ${summary.cash.toLocaleString()}
        </p>
      </div>
      
      <div className="bg-slate-900/40 border border-slate-700 rounded-lg p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-slate-400">Positions</h3>
          <Target className="h-5 w-5 text-slate-400" />
        </div>
        <p className="text-2xl font-bold text-white">
          {summary.positions.length}
        </p>
      </div>
    </div>
  );
};

const PositionsTable: React.FC<{ positions: Position[] }> = ({ positions }) => {
  return (
    <div className="bg-slate-900/40 border border-slate-700 rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-700">
        <h2 className="text-xl font-semibold text-white">Positions</h2>
        <p className="text-sm text-slate-400 mt-1">Positions are created by executing trades in the Command Center</p>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-3 px-6 text-sm font-medium text-slate-400">Symbol</th>
              <th className="text-left py-3 px-6 text-sm font-medium text-slate-400">Quantity</th>
              <th className="text-left py-3 px-6 text-sm font-medium text-slate-400">Avg Price</th>
              <th className="text-left py-3 px-6 text-sm font-medium text-slate-400">Current Price</th>
              <th className="text-left py-3 px-6 text-sm font-medium text-slate-400">Total Value</th>
              <th className="text-left py-3 px-6 text-sm font-medium text-slate-400">P&L</th>
              <th className="text-left py-3 px-6 text-sm font-medium text-slate-400">Allocation</th>
              <th className="text-left py-3 px-6 text-sm font-medium text-slate-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            {positions.map((position) => (
              <tr key={position.symbol} className="border-b border-slate-700 hover:bg-slate-800/30">
                <td className="py-4 px-6">
                  <div className="flex flex-col">
                    <span className="font-medium text-white">{position.symbol}</span>
                    <span className="text-xs text-slate-400 truncate max-w-[120px]">
                      {position.name}
                    </span>
                  </div>
                </td>
                <td className="py-4 px-6 text-white">{position.quantity}</td>
                <td className="py-4 px-6 text-white">${position.averagePrice.toFixed(2)}</td>
                <td className="py-4 px-6 text-white">${position.currentPrice.toFixed(2)}</td>
                <td className="py-4 px-6 text-white">${position.totalValue.toLocaleString()}</td>
                <td className="py-4 px-6">
                  <div className="flex flex-col">
                    <span className={`font-medium ${
                      position.unrealizedPnL > 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {position.unrealizedPnL > 0 ? '+' : ''}${position.unrealizedPnL.toLocaleString()}
                    </span>
                    <span className={`text-xs ${
                      position.unrealizedPnL > 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {position.unrealizedPnLPercent > 0 ? '+' : ''}{position.unrealizedPnLPercent.toFixed(2)}%
                    </span>
                  </div>
                </td>
                <td className="py-4 px-6 text-white">{position.allocation.toFixed(1)}%</td>
                <td className="py-4 px-6">
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/analysis/${position.symbol}`}
                      className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                      title="Analyze"
                    >
                      <BarChart3 className="h-4 w-4" />
                    </Link>
                    <Link
                      to={`/trading-terminal?symbol=${position.symbol}`}
                      className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                      title="Trade"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const AllocationChart: React.FC<{ positions: Position[] }> = ({ positions }) => {
  const topPositions = positions
    .sort((a, b) => b.allocation - a.allocation)
    .slice(0, 5);
  
  const otherAllocation = positions
    .slice(5)
    .reduce((sum, pos) => sum + pos.allocation, 0);

  const chartData = [...topPositions];
  if (otherAllocation > 0) {
    chartData.push({
      symbol: 'OTHER',
      name: 'Other Positions',
      allocation: otherAllocation,
      quantity: 0,
      averagePrice: 0,
      currentPrice: 0,
      totalValue: 0,
      unrealizedPnL: 0,
      unrealizedPnLPercent: 0,
    });
  }

  const colors = ['#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#64748b'];

  return (
    <div className="bg-slate-900/40 border border-slate-700 rounded-lg p-6">
      <h2 className="text-xl font-semibold text-white mb-6">Portfolio Allocation</h2>
      
      {/* Simple bar chart representation */}
      <div className="space-y-4">
        {chartData.map((position, index) => (
          <div key={position.symbol} className="flex items-center gap-4">
            <div className="w-16 text-sm font-medium text-slate-300">
              {position.symbol}
            </div>
            <div className="flex-1 bg-slate-800 rounded-full h-3 overflow-hidden">
              <div
                className="h-full transition-all duration-300"
                style={{
                  width: `${position.allocation}%`,
                  backgroundColor: colors[index % colors.length],
                }}
              ></div>
            </div>
            <div className="w-16 text-sm text-slate-300 text-right">
              {position.allocation.toFixed(1)}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function PortfolioPage() {
  // Get real portfolio data from the usePortfolio hook
  const { portfolioData, loading, error } = usePortfolio();
  const { marketData } = useMarketData();

  // Convert portfolio data to the expected format
  const portfolio: PortfolioSummary | null = portfolioData ? {
    totalValue: portfolioData.portfolio.totalValue,
    totalCost: portfolioData.portfolio.totalValue - portfolioData.portfolio.unrealizedPnL,
    totalPnL: portfolioData.portfolio.unrealizedPnL,
    totalPnLPercent: portfolioData.portfolio.unrealizedPnLPercent,
    cash: portfolioData.wallet.trading_cash_balance,
    positions: portfolioData.portfolio.assets.map((asset) => {
      const currentPrice = portfolioData.marketPrices[asset.symbol] || asset.averageCostBasis;
      const totalValue = asset.quantity * currentPrice;
      const totalCost = asset.quantity * asset.averageCostBasis;
      const unrealizedPnL = totalValue - totalCost;
      const unrealizedPnLPercent = totalCost > 0 ? (unrealizedPnL / totalCost) * 100 : 0;
      const allocation = portfolioData.portfolio.totalValue > 0 ? (totalValue / portfolioData.portfolio.totalValue) * 100 : 0;

      return {
        symbol: asset.symbol,
        name: getCompanyName(asset.symbol),
        quantity: asset.quantity,
        averagePrice: asset.averageCostBasis,
        currentPrice,
        totalValue,
        unrealizedPnL,
        unrealizedPnLPercent,
        allocation
      };
    })
  } : null;

  // Helper function to get company names
  function getCompanyName(symbol: string): string {
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
    return names[symbol] || `${symbol} Inc.`;
  }

  if (loading) {
    return (
      <FinancialLayout>
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-slate-700 rounded w-64"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 bg-slate-700 rounded"></div>
              ))}
            </div>
            <div className="h-96 bg-slate-700 rounded"></div>
          </div>
        </div>
      </FinancialLayout>
    );
  }

  if (error) {
    return (
      <FinancialLayout>
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="text-center py-16">
            <h2 className="text-2xl font-bold text-white mb-4">Error Loading Portfolio</h2>
            <p className="text-slate-400">{error}</p>
          </div>
        </div>
      </FinancialLayout>
    );
  }

  if (!portfolio) {
    return (
      <FinancialLayout>
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="text-center py-16">
            <h2 className="text-2xl font-bold text-white mb-4">No Portfolio Data</h2>
            <p className="text-slate-400">Start trading to build your portfolio</p>
            <Link 
              to="/trading-terminal" 
              className="inline-block mt-4 px-6 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors"
            >
              Start Trading
            </Link>
          </div>
        </div>
      </FinancialLayout>
    );
  }

  return (
    <FinancialLayout>
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Portfolio</h1>
          <p className="text-slate-400">Track your investments and performance</p>
        </div>

        {/* Portfolio Summary */}
        <PortfolioSummaryCard summary={portfolio} />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Positions Table - Takes 2 columns on large screens */}
          <div className="lg:col-span-2">
            <PositionsTable positions={portfolio.positions} />
          </div>

          {/* Allocation Chart - Takes 1 column on large screens */}
          <div className="lg:col-span-1">
            <AllocationChart positions={portfolio.positions} />
            
            {/* Performance Metrics */}
            {portfolio.positions.length > 0 && (
              <div className="mt-6 bg-slate-900/40 border border-slate-700 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Performance Metrics</h3>
                <div className="space-y-3">
                  {(() => {
                    const bestPerformer = portfolio.positions.reduce((best, pos) => 
                      pos.unrealizedPnLPercent > best.unrealizedPnLPercent ? pos : best
                    );
                    const worstPerformer = portfolio.positions.reduce((worst, pos) => 
                      pos.unrealizedPnLPercent < worst.unrealizedPnLPercent ? pos : worst
                    );
                    const largestPosition = portfolio.positions.reduce((largest, pos) => 
                      pos.allocation > largest.allocation ? pos : largest
                    );

                    return (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Best Performer</span>
                          <span className={`font-medium ${bestPerformer.unrealizedPnLPercent > 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {bestPerformer.symbol} ({bestPerformer.unrealizedPnLPercent > 0 ? '+' : ''}{bestPerformer.unrealizedPnLPercent.toFixed(2)}%)
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Worst Performer</span>
                          <span className={`font-medium ${worstPerformer.unrealizedPnLPercent > 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {worstPerformer.symbol} ({worstPerformer.unrealizedPnLPercent > 0 ? '+' : ''}{worstPerformer.unrealizedPnLPercent.toFixed(2)}%)
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Largest Position</span>
                          <span className="text-white font-medium">
                            {largestPosition.symbol} ({largestPosition.allocation.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Diversification</span>
                          <span className="text-white font-medium">{portfolio.positions.length} Position{portfolio.positions.length !== 1 ? 's' : ''}</span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </FinancialLayout>
  );
}