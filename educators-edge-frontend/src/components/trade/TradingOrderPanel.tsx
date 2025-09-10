import React, { useState, useEffect } from 'react';
import { usePortfolio } from '../../hooks/usePortfolio';
import { MarketDataState } from '../../hooks/useMarketData';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { 
  ArrowUpCircle, 
  ArrowDownCircle, 
  DollarSign,
  Wallet,
  TrendingUp,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface TradingOrderPanelProps {
  watchlistSymbols: string[];
  selectedSymbol: string;
  onSymbolChange: (symbol: string) => void;
  marketData: MarketDataState;
  portfolioData: any;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
}

export const TradingOrderPanel: React.FC<TradingOrderPanelProps> = ({
  watchlistSymbols,
  selectedSymbol,
  onSymbolChange,
  marketData,
  portfolioData,
  connectionStatus
}) => {
  const { executeOrder } = usePortfolio();
  const [quantity, setQuantity] = useState(1);
  const [isExecutingOrder, setIsExecutingOrder] = useState(false);
  const [orderMessage, setOrderMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Get current market data for selected symbol
  const currentPrice = marketData[selectedSymbol]?.price || 0;
  
  // Get user's cash and holdings (simulated data)
  const userCash = portfolioData?.cash || 10000;
  const userHoldings = portfolioData?.holdings?.[selectedSymbol] || 0;

  // Calculate order value
  const orderValue = currentPrice * quantity;
  const canAffordBuy = userCash >= orderValue;
  const canSell = userHoldings >= quantity;

  // Auto-update selected symbol in form when changed externally
  useEffect(() => {
    // Symbol automatically updates since we're using selectedSymbol prop directly
  }, [selectedSymbol]);

  // Clear messages after 5 seconds
  useEffect(() => {
    if (orderMessage) {
      const timer = setTimeout(() => setOrderMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [orderMessage]);

  const handleExecuteOrder = async (orderType: 'BUY' | 'SELL') => {
    if (connectionStatus !== 'connected') {
      setOrderMessage({
        type: 'error',
        message: 'Market data connection required for trading'
      });
      return;
    }

    if (orderType === 'BUY' && !canAffordBuy) {
      setOrderMessage({
        type: 'error',
        message: `Insufficient cash. Need $${orderValue.toFixed(2)}, have $${userCash.toFixed(2)}`
      });
      return;
    }

    if (orderType === 'SELL' && !canSell) {
      setOrderMessage({
        type: 'error',
        message: `Insufficient shares. Need ${quantity}, have ${userHoldings}`
      });
      return;
    }

    setIsExecutingOrder(true);
    
    try {
      await executeOrder({
        symbol: selectedSymbol,
        orderType,
        quantity,
        price: currentPrice
      });

      setOrderMessage({
        type: 'success',
        message: `Successfully ${orderType === 'BUY' ? 'bought' : 'sold'} ${quantity} ${selectedSymbol} @ $${currentPrice.toFixed(2)}`
      });

      // Reset quantity after successful order
      setQuantity(1);
    } catch (error: any) {
      setOrderMessage({
        type: 'error',
        message: error.message || 'Order execution failed'
      });
    } finally {
      setIsExecutingOrder(false);
    }
  };

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* User's Cash and Holdings */}
      <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-cyan-500" />
              <span className="text-sm text-slate-400">Cash</span>
            </div>
            <span className="text-white font-bold font-mono">
              ${userCash.toLocaleString()}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-400" />
              <span className="text-sm text-slate-400">{selectedSymbol} Holdings</span>
            </div>
            <span className="text-white font-bold font-mono">
              {userHoldings} shares
            </span>
          </div>
        </div>
      </div>

      {/* Symbol Selector */}
      <div>
        <label className="text-sm text-slate-400 mb-2 block">Symbol</label>
        <Select value={selectedSymbol} onValueChange={onSymbolChange}>
          <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {watchlistSymbols.map(symbol => (
              <SelectItem key={symbol} value={symbol}>
                <div className="flex items-center justify-between w-full">
                  <span>{symbol}</span>
                  {marketData[symbol] && (
                    <span className="text-sm text-slate-400 ml-2">
                      ${marketData[symbol].price.toFixed(2)}
                    </span>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Current Price Display */}
      {marketData[selectedSymbol] && (
        <div className="bg-slate-800/30 rounded-lg p-3 border border-slate-700">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">Current Price</span>
            <div className="text-right">
              <div className="text-lg font-bold text-white font-mono">
                ${currentPrice.toFixed(2)}
              </div>
              <div className={`text-sm ${
                marketData[selectedSymbol].changePercent >= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {marketData[selectedSymbol].changePercent >= 0 ? '+' : ''}
                {marketData[selectedSymbol].changePercent.toFixed(2)}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quantity Input */}
      <div>
        <label className="text-sm text-slate-400 mb-2 block">Quantity</label>
        <Input
          type="number"
          min="1"
          value={quantity}
          onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
          className="bg-slate-800 border-slate-700 text-white font-mono"
          placeholder="Enter quantity"
        />
      </div>

      {/* Order Value */}
      <div className="bg-slate-800/30 rounded-lg p-3 border border-slate-700">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-400">Order Value</span>
          <span className="text-white font-bold font-mono">
            ${orderValue.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Buy/Sell Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          onClick={() => handleExecuteOrder('BUY')}
          disabled={isExecutingOrder || !canAffordBuy || connectionStatus !== 'connected'}
          className={`h-12 font-bold text-white ${
            canAffordBuy && connectionStatus === 'connected'
              ? 'bg-green-600 hover:bg-green-700'
              : 'bg-green-900/50 cursor-not-allowed'
          }`}
        >
          <ArrowUpCircle className="w-5 h-5 mr-2" />
          BUY
        </Button>

        <Button
          onClick={() => handleExecuteOrder('SELL')}
          disabled={isExecutingOrder || !canSell || connectionStatus !== 'connected'}
          className={`h-12 font-bold text-white ${
            canSell && connectionStatus === 'connected'
              ? 'bg-red-600 hover:bg-red-700'
              : 'bg-red-900/50 cursor-not-allowed'
          }`}
        >
          <ArrowDownCircle className="w-5 h-5 mr-2" />
          SELL
        </Button>
      </div>

      {/* Order Status Message */}
      {orderMessage && (
        <div className={`p-3 rounded-lg border flex items-center gap-2 ${
          orderMessage.type === 'success'
            ? 'bg-green-900/30 border-green-700 text-green-400'
            : 'bg-red-900/30 border-red-700 text-red-400'
        }`}>
          {orderMessage.type === 'success' ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          <span className="text-sm">{orderMessage.message}</span>
        </div>
      )}

      {/* Connection Status Warning */}
      {connectionStatus !== 'connected' && (
        <div className="bg-yellow-900/30 border border-yellow-700 text-yellow-400 p-3 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">
              Market data {connectionStatus}. Trading disabled.
            </span>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isExecutingOrder && (
        <div className="bg-slate-800/50 border border-slate-700 p-3 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="animate-spin h-4 w-4 border-2 border-cyan-500 border-t-transparent rounded-full"></div>
            <span className="text-sm text-slate-400">Executing order...</span>
          </div>
        </div>
      )}
    </div>
  );
};