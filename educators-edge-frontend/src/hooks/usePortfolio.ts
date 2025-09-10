import { useState, useEffect, useCallback } from 'react';
import apiClient from '../services/apiClient';

interface PortfolioAsset {
  symbol: string;
  quantity: number;
  averageCostBasis: number;
}

interface Portfolio {
  id: string;
  p_score: number;
  assets: PortfolioAsset[];
  totalValue: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
}

interface Wallet {
  spark_balance: number;
  trading_cash_balance: number;
}

interface Trade {
  id: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  quantity: number;
  fillPrice: number;
  executedAt: string;
}

interface PortfolioData {
  wallet: Wallet;
  portfolio: Portfolio;
  recentTrades: Trade[];
  marketPrices: Record<string, number>;
}

interface UsePortfolioReturn {
  portfolioData: PortfolioData | null;
  loading: boolean;
  error: string | null;
  refreshPortfolio: () => Promise<void>;
  executeOrder: (order: {
    assetSymbol: string;
    orderType: 'BUY' | 'SELL';
    quantity: number;
    orderPrice?: number;
  }) => Promise<{ success: boolean; message?: string }>;
}

export const usePortfolio = (): UsePortfolioReturn => {
  const [portfolioData, setPortfolioData] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshPortfolio = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('[usePortfolio] Fetching portfolio data...');
      const response = await apiClient.get('/api/trade/portfolio');
      console.log('[usePortfolio] Portfolio response:', response.data);
      
      if (response.data.success) {
        setPortfolioData(response.data.data);
        console.log('[usePortfolio] Portfolio data set:', response.data.data);
      } else {
        console.error('[usePortfolio] Portfolio fetch failed:', response.data.message);
        setError(response.data.message || 'Failed to fetch portfolio data');
      }
    } catch (err: any) {
      console.error('[usePortfolio] Portfolio fetch error:', err);
      console.error('[usePortfolio] Error details:', {
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data,
        message: err.message
      });
      setError(err.response?.data?.message || 'Failed to fetch portfolio data');
    } finally {
      setLoading(false);
    }
  }, []);

  const executeOrder = useCallback(async (order: {
    assetSymbol: string;
    orderType: 'BUY' | 'SELL';
    quantity: number;
    orderPrice?: number;
  }) => {
    try {
      console.log('[usePortfolio] Executing order:', order);
      const response = await apiClient.post('/api/trade/orders/execute', order);
      console.log('[usePortfolio] Order response:', response.data);
      
      if (response.data.success) {
        console.log('[usePortfolio] Order successful, refreshing portfolio...');
        await refreshPortfolio();
        return { success: true };
      } else {
        console.error('[usePortfolio] Order failed:', response.data.message);
        return { 
          success: false, 
          message: response.data.message || 'Order execution failed' 
        };
      }
    } catch (err: any) {
      console.error('[usePortfolio] Order execution error:', err);
      console.error('[usePortfolio] Error details:', {
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data,
        message: err.message
      });
      return { 
        success: false, 
        message: err.response?.data?.message || err.message || 'Trade execution failed due to system error'
      };
    }
  }, [refreshPortfolio]);

  useEffect(() => {
    refreshPortfolio();
  }, [refreshPortfolio]);

  return {
    portfolioData,
    loading,
    error,
    refreshPortfolio,
    executeOrder
  };
};