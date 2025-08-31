import React from 'react';
import { usePortfolio } from '../../hooks/usePortfolio';
// src/components/trade/PortfolioWidget.tsx

// [FIX #1] The import path is corrected to use a standard, project-aliased path.
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
// [PREREQUISITE] This import will now work correctly after you run `npx shadcn-ui@latest add skeleton`.
import { Skeleton } from '@/components/ui/skeleton'; 
import { AlertCircle, ArrowRight } from 'lucide-react';
import type { PortfolioAsset } from '@/types/trade'; // Import the type for explicit typing

// A professional currency formatter.
const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

// --- SUB-COMPONENTS for clean state handling ---

const PortfolioLoadingSkeleton = () => (
    <Card className="bg-slate-900/40 backdrop-blur-lg border border-slate-700/80 text-white">
        <CardHeader>
            <Skeleton className="h-6 w-3/5 bg-slate-700" />
            <Skeleton className="h-4 w-4/5 bg-slate-700 mt-1" />
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <Skeleton className="h-10 w-full bg-slate-700" />
                <Skeleton className="h-10 w-full bg-slate-700" />
            </div>
            <Skeleton className="h-8 w-full bg-slate-700" />
            <Skeleton className="h-8 w-full bg-slate-700" />
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


// --- MAIN WIDGET COMPONENT ---

export const PortfolioWidget: React.FC = () => {
  const { portfolio, isLoading, error } = usePortfolio();

  if (isLoading) return <PortfolioLoadingSkeleton />;
  if (error) return <PortfolioErrorState error={error} />;
  if (!portfolio) return null;

  const MOCK_ASSET_PRICE = 150.75; 

  const cashBalance = parseFloat(portfolio.cash_balance);

  // [FIX #2] Explicit types are provided for the `reduce` function's accumulator and current value,
  // resolving all 'implicitly has an any type' errors.
  const assetsValue = portfolio.assets.reduce((total: number, asset: PortfolioAsset) => {
    return total + (parseFloat(asset.quantity) * MOCK_ASSET_PRICE);
  }, 0);

  const totalValue = cashBalance + assetsValue;

  return (
    <Card className="bg-slate-900/40 backdrop-blur-lg border border-slate-700/80 text-white">
      <CardHeader>
        <CardTitle className="text-xl">Zenith Trade Portfolio</CardTitle>
        <CardDescription>Your real-time paper trading performance.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <p className="text-sm text-slate-400">Total Portfolio Value</p>
          <p className="text-4xl font-bold tracking-tighter text-white">{currencyFormatter.format(totalValue)}</p>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
                <p className="text-xs text-slate-500">Cash Balance</p>
                <p className="text-lg font-medium">{currencyFormatter.format(cashBalance)}</p>
            </div>
             <div>
                <p className="text-xs text-slate-500">Assets Value</p>
                <p className="text-lg font-medium">{currencyFormatter.format(assetsValue)}</p>
            </div>
        </div>

        <div>
            <h4 className="font-semibold mb-2">Your Holdings</h4>
            <div className="space-y-2">
                {portfolio.assets.length > 0 ? portfolio.assets.map((asset: PortfolioAsset) => ( // [FIX #3] Explicit type for asset in map
                    <div key={asset.asset_symbol} className="flex justify-between items-center p-2 bg-slate-800/50 rounded-md">
                        <span className="font-mono font-bold">{asset.asset_symbol}</span>
                        <span className="text-slate-300">{parseFloat(asset.quantity).toFixed(2)} Shares</span>
                    </div>
                )) : (
                    <p className="text-sm text-slate-500 text-center py-4">You do not own any assets.</p>
                )}
            </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold">
            Go to Trading Terminal <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
};