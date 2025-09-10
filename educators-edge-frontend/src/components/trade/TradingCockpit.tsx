import React, { useState, useEffect } from 'react';
import { MarketData, ConnectionStatus } from '../../hooks/useFinnhubWebSocket';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { ArrowUpCircle, ArrowDownCircle, DollarSign, Wallet, AlertTriangle, CheckCircle } from 'lucide-react';

interface TradingCockpitProps {
  activeSymbol: string;
  availableSymbols: string[];
  marketData: Map<string, MarketData>;
  portfolioData: any;
  connectionStatus: ConnectionStatus;
  onSymbolChange: (symbol: string) => void;
  executeOrder: (order: {
    assetSymbol: string;
    orderType: 'BUY' | 'SELL';
    quantity: number;
    orderPrice?: number;
  }) => Promise<{ success: boolean; message?: string }>;
}

export const TradingCockpit: React.FC<TradingCockpitProps> = ({
  activeSymbol,
  availableSymbols,
  marketData,
  portfolioData,
  connectionStatus,
  onSymbolChange,
  executeOrder
}) => {
  const [quantity, setQuantity] = useState(1);
  const [isExecutingOrder, setIsExecutingOrder] = useState(false);
  const [orderMessage, setOrderMessage] = useState<{
    type: 'success' | 'error' | 'warning';
    message: string;
  } | null>(null);

  const currentPrice = marketData[activeSymbol]?.price || 0;
  const userCash = portfolioData?.wallet?.trading_cash_balance || 10000;
  
  // Find holdings for the active symbol from the assets array
  const asset = portfolioData?.portfolio?.assets?.find((a: any) => a.symbol === activeSymbol);
  const userHoldings = asset?.quantity || 0;

  // Debug logging - only when portfolio data changes
  useEffect(() => {
    console.log('[TradingCockpit] Portfolio data updated:', portfolioData);
    console.log('[TradingCockpit] Active symbol:', activeSymbol);
    console.log('[TradingCockpit] User cash:', userCash);
    console.log('[TradingCockpit] User holdings:', userHoldings);
    console.log('[TradingCockpit] Asset found:', asset);
  }, [portfolioData, activeSymbol, userCash, userHoldings, asset]);

  // Calculate order value in real-time
  const orderValue = currentPrice * quantity;
  const canAffordBuy = userCash >= orderValue;
  const canSell = userHoldings >= quantity;

  // Clear messages after 5 seconds
  useEffect(() => {
    if (orderMessage) {
      const timer = setTimeout(() => setOrderMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [orderMessage]);

  const handleExecuteOrder = async (orderType: 'BUY' | 'SELL') => {
    // Connection check
    if (connectionStatus !== 'Connected') {
      setOrderMessage({
        type: 'error',
        message: 'Market data connection required for trading'
      });
      return;
    }

    // Validation checks
    if (orderType === 'BUY' && !canAffordBuy) {
      setOrderMessage({
        type: 'error',
        message: `Insufficient cash. Need ${orderValue.toFixed(2)}, have $${userCash.toFixed(2)}`
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
      const result = await executeOrder({
        assetSymbol: activeSymbol,
        orderType,
        quantity,
        orderPrice: currentPrice
      });

      if (result.success) {
        setOrderMessage({
          type: 'success',
          message: `✅ Successfully ${orderType === 'BUY' ? 'bought' : 'sold'} ${quantity} ${activeSymbol} @ $${currentPrice.toFixed(2)}`
        });
        
        // Reset quantity after successful order
        setQuantity(1);
      } else {
        setOrderMessage({
          type: 'error',
          message: result.message || 'Order execution failed'
        });
      }
    } catch (error: any) {
      console.error('Order execution error:', error);
      setOrderMessage({
        type: 'error',
        message: error.response?.data?.message || error.message || 'Order execution failed'
      });
    } finally {
      setIsExecutingOrder(false);
    }
  };

  const getConnectionWarning = () => {
    if (connectionStatus !== 'Connected') {
      return (
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            <span className="text-red-400 text-sm font-medium">
              Market data {connectionStatus.toLowerCase()}. Trading disabled.
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-full flex flex-col p-4">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-white font-semibold mb-1">Quick Trade</h3>
        <p className="text-xs text-slate-400">Execute trades instantly</p>
      </div>

      {/* Connection Warning */}
      {getConnectionWarning()}

      {/* Current Holdings & Cash */}
      <div className="bg-slate-800/50 rounded-lg p-4 mb-4">
        <div className="space-y-3">
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
              <DollarSign className="h-4 w-4 text-green-400" />
              <span className="text-sm text-slate-400">{activeSymbol} Holdings</span>
            </div>
            <span className="text-white font-bold font-mono">
              {userHoldings} shares
            </span>
          </div>
        </div>
      </div>

      {/* Current Price Display */}
      {currentPrice > 0 && (
        <div className="bg-slate-900/50 rounded-lg p-4 mb-4">
          <div className="text-center">
            <div className="text-sm text-slate-400 mb-1">Current Price</div>
            <div className="text-2xl font-bold text-white font-mono">
              ${currentPrice.toFixed(2)}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Live from Finnhub
            </div>
          </div>
        </div>
      )}

      {/* Quantity Input */}
      <div className="mb-4">
        <label className="text-sm text-slate-400 mb-2 block">Quantity</label>
        <Input
          type="number"
          min="1"
          step="1"
          value={quantity}
          onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
          className="bg-slate-800 border-slate-700 text-white font-mono text-center"
          placeholder="Enter quantity"
        />
      </div>

      {/* Order Value Display */}
      <div className="bg-slate-800/30 rounded-lg p-3 mb-6">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-400">Order Value</span>
          <span className="text-white font-bold font-mono text-lg">
            ${orderValue.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Buy/Sell Buttons */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Button
          onClick={() => handleExecuteOrder('BUY')}
          disabled={isExecutingOrder || !canAffordBuy || connectionStatus !== 'Connected'}
          className="h-14 font-bold text-white bg-green-600 hover:bg-green-700 disabled:bg-green-900/50 disabled:cursor-not-allowed"
          title={!canAffordBuy ? `Need $${orderValue.toFixed(2)}, have $${userCash.toFixed(2)}` : ''}
        >
          <ArrowUpCircle className="w-5 h-5 mr-2" />
          BUY
        </Button>

        <Button
          onClick={() => handleExecuteOrder('SELL')}
          disabled={isExecutingOrder || !canSell || connectionStatus !== 'Connected'}
          className="h-14 font-bold text-white bg-red-600 hover:bg-red-700 disabled:bg-red-900/50 disabled:cursor-not-allowed"
          title={!canSell ? `Need ${quantity} shares, have ${userHoldings}` : ''}
        >
          <ArrowDownCircle className="w-5 h-5 mr-2" />
          SELL
        </Button>
      </div>

      {/* Order Status Messages */}
      {orderMessage && (
        <div className={`rounded-lg p-3 mb-4 border ${
          orderMessage.type === 'success'
            ? 'bg-green-900/30 border-green-700'
            : orderMessage.type === 'warning'
            ? 'bg-yellow-900/30 border-yellow-700'
            : 'bg-red-900/30 border-red-700'
        }`}>
          <div className="flex items-start gap-2">
            {orderMessage.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-green-400 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5" />
            )}
            <span className={`text-sm ${
              orderMessage.type === 'success'
                ? 'text-green-400'
                : orderMessage.type === 'warning'
                ? 'text-yellow-400'
                : 'text-red-400'
            }`}>
              {orderMessage.message}
            </span>
          </div>
        </div>
      )}

      {/* Execution Loading */}
      {isExecutingOrder && (
        <div className="bg-slate-800/50 border border-slate-700 p-3 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="animate-spin h-4 w-4 border-2 border-cyan-500 border-t-transparent rounded-full"></div>
            <span className="text-sm text-slate-400">Executing order...</span>
          </div>
        </div>
      )}

      {/* Trading Tips */}
      <div className="mt-auto pt-4 border-t border-slate-700">
        <div className="text-xs text-slate-500 space-y-1">
          <div>💡 Order value updates in real-time</div>
          <div>⚡ Instant execution when connected</div>
          <div>🔒 Orders disabled when disconnected</div>
        </div>
      </div>
    </div>
  );
};