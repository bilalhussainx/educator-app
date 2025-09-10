import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, Target, ArrowUpCircle, ArrowDownCircle, CheckCircle, AlertTriangle } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { usePortfolio } from '../../hooks/usePortfolio';
import apiClient from '../../services/apiClient';

interface MarketData {
  price: number;
  volume: number;
  lastUpdated: number;
  change?: number;
  changePercent?: number;
  previousPrice?: number;
}

interface TheCockpitProps {
  selectedSymbol: string;
  onSymbolChange: (symbol: string) => void;
  symbolData: MarketData | null;
  isConnected: boolean;
}

export const TheCockpit: React.FC<TheCockpitProps> = ({
  selectedSymbol,
  onSymbolChange,
  symbolData,
  isConnected,
}) => {
  const { portfolioData, refreshPortfolio } = usePortfolio();
  const watchlistSymbols = ['AAPL', 'GOOGL', 'MSFT', 'NVDA', 'TSLA', 'AMZN', 'META', 'NFLX'];
  const [orderType, setOrderType] = useState<'buy' | 'sell'>('buy');
  const [quantity, setQuantity] = useState(1);
  const [orderPrice, setOrderPrice] = useState('');
  const [isExecutingOrder, setIsExecutingOrder] = useState(false);
  const [orderMessage, setOrderMessage] = useState<{
    type: 'success' | 'error' | 'warning';
    message: string;
  } | null>(null);

  // Clear messages after 5 seconds
  useEffect(() => {
    if (orderMessage) {
      const timer = setTimeout(() => setOrderMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [orderMessage]);

  // THE DEFINITIVE TRADE EXECUTION FUNCTION
  const handleSubmitOrder = async () => {
    if (!isConnected) {
      setOrderMessage({
        type: 'error',
        message: 'Market data connection required for trading'
      });
      return;
    }

    if (!symbolData) {
      setOrderMessage({
        type: 'error',
        message: 'No market data available for this symbol'
      });
      return;
    }

    // Get portfolio data for validation
    const orderValue = symbolData.price * quantity;
    const userCash = portfolioData?.wallet?.trading_cash_balance || 0;
    const asset = portfolioData?.portfolio?.assets?.find((a: any) => a.symbol === selectedSymbol);
    const userHoldings = asset?.quantity || 0;

    // Validation checks
    if (orderType === 'buy' && userCash < orderValue) {
      setOrderMessage({
        type: 'error',
        message: `Insufficient cash. Need $${orderValue.toFixed(2)}, have $${userCash.toFixed(2)}`
      });
      return;
    }

    if (orderType === 'sell' && userHoldings < quantity) {
      setOrderMessage({
        type: 'error',
        message: `Insufficient shares. Need ${quantity}, have ${userHoldings}`
      });
      return;
    }

    setIsExecutingOrder(true);
    setOrderMessage(null);

    try {
      const response = await apiClient.post('/api/trade/execute', {
        symbol: selectedSymbol,
        quantity: quantity,
        tradeType: orderType.toUpperCase()
      });

      const result = response.data;

      if (result.success) {
        setOrderMessage({
          type: 'success',
          message: result.message
        });
        
        // Trigger portfolio refresh to update UI
        await refreshPortfolio();
        
        // Reset form
        setQuantity(1);
        setOrderPrice('');
      } else {
        setOrderMessage({
          type: 'error',
          message: result.message
        });
      }
    } catch (error: any) {
      console.error('Trade execution error:', error);
      console.error('Error response data:', error.response?.data);
      let errorMessage = 'Failed to execute trade. Please try again.';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data) {
        errorMessage = `Server error: ${JSON.stringify(error.response.data)}`;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setOrderMessage({
        type: 'error',
        message: errorMessage
      });
    } finally {
      setIsExecutingOrder(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-900/20">
      {/* Header */}
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center gap-2 mb-2">
          <Target className="h-5 w-5 text-cyan-400" />
          <h3 className="font-semibold text-white">Trading Cockpit</h3>
        </div>
        <p className="text-xs text-slate-400">
          Execute trades and manage positions
        </p>
      </div>

      {/* Trading Panel */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          {/* Quick Symbol Selector */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Quick Select
            </label>
            <div className="grid grid-cols-2 gap-2">
              {watchlistSymbols.slice(0, 8).map((symbol) => (
                <button
                  key={symbol}
                  onClick={() => onSymbolChange(symbol)}
                  className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                    selectedSymbol === symbol
                      ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400'
                      : 'bg-slate-800/50 border-slate-600 text-slate-300 hover:border-slate-500 hover:text-white'
                  }`}
                >
                  {symbol}
                </button>
              ))}
            </div>
          </div>

          {/* Current Price Display */}
          {symbolData && (
            <div className="mb-4 p-3 bg-slate-800/50 rounded-lg border border-slate-600">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-slate-400">Current Price</span>
                <div className={`flex items-center gap-1 ${
                  isConnected ? 'text-green-400' : 'text-slate-500'
                }`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    isConnected ? 'bg-green-400' : 'bg-slate-500'
                  }`}></div>
                  <span className="text-xs">
                    {isConnected ? 'Live' : 'Offline'}
                  </span>
                </div>
              </div>
              <div className="text-xl font-bold text-white">
                ${symbolData.price.toFixed(2)}
              </div>
              <div className="text-xs text-slate-400">
                Vol: {symbolData.volume.toLocaleString()}
              </div>
            </div>
          )}

          {/* Simple Order Panel */}
          <div className="mb-4 p-4 bg-slate-800/30 border border-slate-600 rounded-lg">
            <h4 className="text-sm font-medium text-white mb-3">Quick Order</h4>
            
            {/* Order Type Toggle */}
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setOrderType('buy')}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                  orderType === 'buy'
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'bg-slate-700/50 text-slate-300 border border-slate-600 hover:text-white'
                }`}
              >
                <ArrowUpCircle className="h-4 w-4 inline mr-1" />
                Buy
              </button>
              <button
                onClick={() => setOrderType('sell')}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                  orderType === 'sell'
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : 'bg-slate-700/50 text-slate-300 border border-slate-600 hover:text-white'
                }`}
              >
                <ArrowDownCircle className="h-4 w-4 inline mr-1" />
                Sell
              </button>
            </div>

            {/* Quantity Input */}
            <div className="mb-3">
              <label className="block text-xs text-slate-400 mb-1">Quantity</label>
              <Input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                min="1"
                className="bg-slate-700/50 border-slate-600 text-white"
              />
            </div>

            {/* Price Input (Optional) */}
            <div className="mb-4">
              <label className="block text-xs text-slate-400 mb-1">Price (Leave empty for market order)</label>
              <Input
                type="number"
                step="0.01"
                value={orderPrice}
                onChange={(e) => setOrderPrice(e.target.value)}
                placeholder="Market price"
                className="bg-slate-700/50 border-slate-600 text-white"
              />
            </div>

            {/* Order Message */}
            {orderMessage && (
              <div className={`mb-3 p-3 rounded-lg border text-sm ${
                orderMessage.type === 'success'
                  ? 'bg-green-900/30 border-green-600 text-green-400'
                  : orderMessage.type === 'error'
                  ? 'bg-red-900/30 border-red-600 text-red-400'
                  : 'bg-yellow-900/30 border-yellow-600 text-yellow-400'
              }`}>
                <div className="flex items-center gap-2">
                  {orderMessage.type === 'success' && <CheckCircle className="h-4 w-4" />}
                  {orderMessage.type === 'error' && <AlertTriangle className="h-4 w-4" />}
                  <span>{orderMessage.message}</span>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <Button
              onClick={handleSubmitOrder}
              disabled={isExecutingOrder || !isConnected || !symbolData}
              className={`w-full ${
                orderType === 'buy'
                  ? 'bg-green-500 hover:bg-green-600 disabled:bg-green-500/50 text-white'
                  : 'bg-red-500 hover:bg-red-600 disabled:bg-red-500/50 text-white'
              }`}
            >
              {isExecutingOrder
                ? 'Executing...'
                : `${orderType === 'buy' ? 'Buy' : 'Sell'} ${selectedSymbol}`
              }
            </Button>
          </div>
        </div>
      </div>

      {/* Portfolio Summary */}
      <div className="border-t border-slate-700 bg-slate-900/30">
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-green-400" />
            <span className="text-sm font-medium text-white">Portfolio</span>
          </div>
          
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <div className="text-slate-400">Cash Balance</div>
              <div className="text-white font-medium">
                ${portfolioData?.wallet?.trading_cash_balance?.toFixed(2) || '0.00'}
              </div>
            </div>
            <div>
              <div className="text-slate-400">Portfolio Value</div>
              <div className="text-white font-medium">
                ${portfolioData?.portfolio?.totalValue?.toFixed(2) || '0.00'}
              </div>
            </div>
            <div>
              <div className="text-slate-400">Total P&L</div>
              <div className={`font-medium ${
                (portfolioData?.portfolio?.totalPnl || 0) >= 0 
                  ? 'text-green-400' 
                  : 'text-red-400'
              }`}>
                ${portfolioData?.portfolio?.totalPnl?.toFixed(2) || '0.00'}
              </div>
            </div>
            <div>
              <div className="text-slate-400">Positions</div>
              <div className="text-white font-medium">
                {portfolioData?.portfolio?.assets?.length || 0} Active
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};