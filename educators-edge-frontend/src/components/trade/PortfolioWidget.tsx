import React from 'react';
import { useNavigate } from 'react-router-dom';
import { usePortfolio } from '../../hooks/usePortfolio';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { AlertCircle, ArrowRight, TrendingUp, TrendingDown } from 'lucide-react';

// A professional currency formatter.
const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

const PortfolioLoadingSkeleton = () => (
    <Card className="bg-slate-900/40 backdrop-blur-lg border border-slate-700/80 text-white">
        <CardHeader>
            <div className="h-6 w-3/5 bg-slate-700 rounded animate-pulse" />
            <div className="h-4 w-4/5 bg-slate-700 mt-1 rounded animate-pulse" />
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
                <div className="h-10 w-full bg-slate-700 rounded animate-pulse" />
                <div className="h-10 w-full bg-slate-700 rounded animate-pulse" />
                <div className="h-10 w-full bg-slate-700 rounded animate-pulse" />
            </div>
            <div className="h-8 w-full bg-slate-700 rounded animate-pulse" />
            <div className="h-8 w-full bg-slate-700 rounded animate-pulse" />
        </CardContent>
    </Card>
);

const PortfolioErrorState = ({ error }: { error: string }) => (
    <Card className="bg-red-950/40 border border-red-500/30 text-white">
        <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-300"><AlertCircle /> Error</CardTitle>
        </CardHeader>
        <CardContent>
            <p className="text-red-300">{error}</p>
        </CardContent>
    </Card>
);


export const PortfolioWidget: React.FC = () => {
  const { portfolioData, loading, error } = usePortfolio();
  const navigate = useNavigate();

  if (loading) return <PortfolioLoadingSkeleton />;
  if (error) return <PortfolioErrorState error={error} />;
  if (!portfolioData) return null;

  const { wallet, portfolio } = portfolioData;
  const totalValue = wallet.trading_cash_balance + (portfolio.totalValue || 0);
  const isProfit = portfolio.unrealizedPnL >= 0;

  const handleGoToTrading = () => {
    navigate('/trading-terminal');
  };

  return (
    <Card className="bg-gradient-to-br from-slate-900/40 to-slate-800/40 backdrop-blur-lg border border-slate-700/80 text-white">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          Zenith Trade Portfolio
          {isProfit ? (
            <TrendingUp className="h-5 w-5 text-green-400" />
          ) : (
            <TrendingDown className="h-5 w-5 text-red-400" />
          )}
        </CardTitle>
        <CardDescription>Your real-time trading performance simulation</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <p className="text-sm text-slate-400">Total Portfolio Value</p>
          <p className="text-4xl font-bold tracking-tighter text-white">
            {currencyFormatter.format(totalValue)}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <p className={`text-sm font-medium ${isProfit ? 'text-green-400' : 'text-red-400'}`}>
              {isProfit ? '+' : ''}{currencyFormatter.format(portfolio.unrealizedPnL || 0)}
            </p>
            <p className={`text-xs ${isProfit ? 'text-green-400' : 'text-red-400'}`}>
              ({isProfit ? '+' : ''}{(portfolio.unrealizedPnLPercent || 0).toFixed(2)}%)
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div>
            <p className="text-xs text-slate-500">Cash Balance</p>
            <p className="text-lg font-medium">{currencyFormatter.format(wallet.trading_cash_balance)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Assets Value</p>
            <p className="text-lg font-medium">{currencyFormatter.format(portfolio.totalValue || 0)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">P-Score</p>
            <p className="text-lg font-medium text-cyan-400">{portfolio.p_score.toFixed(1)}</p>
          </div>
        </div>

        <div>
          <h4 className="font-semibold mb-2">Holdings ({portfolio.assets.length})</h4>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {portfolio.assets.length > 0 ? portfolio.assets.map((asset) => (
              <div key={asset.symbol} className="flex justify-between items-center p-2 bg-slate-800/50 rounded-md">
                <div className="flex flex-col">
                  <span className="font-mono font-bold text-sm">{asset.symbol}</span>
                  <span className="text-xs text-slate-400">{asset.quantity} shares</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-300">{currencyFormatter.format(asset.averageCostBasis)}</span>
                </div>
              </div>
            )) : (
              <p className="text-sm text-slate-500 text-center py-4">No positions yet. Start trading!</p>
            )}
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handleGoToTrading}
          className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-bold"
        >
          Go to Trading Terminal <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
};