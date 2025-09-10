import { useState, useEffect, useCallback } from 'react';
import apiClient from '../services/apiClient';

interface SimulationSession {
  id: string;
  session_name: string;
  historical_period: string;
  start_date: string;
  current_date: string;
  end_date: string;
  portfolio_value: number;
  cash_balance: number;
  is_active: boolean;
}

interface SimulationHolding {
  symbol: string;
  quantity: number;
  avgCost: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPnL: number;
}

interface SimulationTransaction {
  id: string;
  symbol: string;
  transaction_type: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  total_amount: number;
  commission: number;
  simulation_date: string;
  created_at: string;
}

interface SimulationPortfolioData {
  session: {
    id: string;
    period: string;
    currentDate: string;
    startDate: string;
    endDate: string;
  };
  balance: {
    cash: number;
    totalValue: number;
    invested: number;
    totalReturn: number;
    totalReturnPercent: number;
  };
  holdings: SimulationHolding[];
  recentTransactions: SimulationTransaction[];
}

interface UseSimulationPortfolioReturn {
  portfolioData: SimulationPortfolioData | null;
  currentSession: SimulationSession | null;
  loading: boolean;
  error: string | null;
  createSession: (historicalPeriod: string) => Promise<SimulationSession | null>;
  refreshPortfolio: () => Promise<void>;
  executeTrade: (trade: {
    symbol: string;
    type: 'BUY' | 'SELL';
    quantity: number;
    price: number;
    simulationDate?: string;
  }) => Promise<{ success: boolean; message?: string }>;
  getUserSessions: () => Promise<SimulationSession[]>;
  closeSession: (sessionId: string) => Promise<void>;
}

export const useSimulationPortfolio = (historicalPeriod?: string): UseSimulationPortfolioReturn => {
  const [portfolioData, setPortfolioData] = useState<SimulationPortfolioData | null>(null);
  const [currentSession, setCurrentSession] = useState<SimulationSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const createSession = useCallback(async (period: string): Promise<SimulationSession | null> => {
    try {
      setLoading(true);
      setError(null);

      console.log(`[useSimulationPortfolio] Creating session for period: ${period}`);

      const response = await apiClient.post('/api/simulation/session', {
        historicalPeriod: period
      });

      if (response.data.success) {
        const session = response.data.session;
        setCurrentSession(session);
        console.log(`[useSimulationPortfolio] Session created: ${session.id}`);
        return session;
      } else {
        throw new Error(response.data.error || 'Failed to create session');
      }
    } catch (error: any) {
      console.error('[useSimulationPortfolio] Error creating session:', error);
      setError(error.response?.data?.error || error.message || 'Failed to create session');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshPortfolio = useCallback(async (): Promise<void> => {
    if (!currentSession?.id) {
      console.warn('[useSimulationPortfolio] No current session for portfolio refresh');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log(`[useSimulationPortfolio] Refreshing portfolio for session: ${currentSession.id}`);

      const response = await apiClient.get(`/api/simulation/portfolio/${currentSession.id}`);

      if (response.data.success) {
        setPortfolioData(response.data.portfolio);
        console.log(`[useSimulationPortfolio] Portfolio refreshed successfully`);
      } else {
        throw new Error(response.data.error || 'Failed to refresh portfolio');
      }
    } catch (error: any) {
      console.error('[useSimulationPortfolio] Error refreshing portfolio:', error);
      setError(error.response?.data?.error || error.message || 'Failed to refresh portfolio');
    } finally {
      setLoading(false);
    }
  }, [currentSession?.id]);

  const executeTrade = useCallback(async (trade: {
    symbol: string;
    type: 'BUY' | 'SELL';
    quantity: number;
    price: number;
    simulationDate?: string;
  }): Promise<{ success: boolean; message?: string }> => {
    if (!currentSession?.id) {
      return { success: false, message: 'No active simulation session' };
    }

    try {
      setError(null);

      console.log(`[useSimulationPortfolio] Executing trade:`, trade);

      const response = await apiClient.post('/api/simulation/trade', {
        sessionId: currentSession.id,
        symbol: trade.symbol.toUpperCase(),
        type: trade.type,
        quantity: trade.quantity,
        price: trade.price,
        simulationDate: trade.simulationDate || new Date().toISOString()
      });

      if (response.data.success) {
        // Refresh portfolio after successful trade
        await refreshPortfolio();
        return { 
          success: true, 
          message: response.data.result.message || 'Trade executed successfully' 
        };
      } else {
        return { 
          success: false, 
          message: response.data.error || 'Trade execution failed' 
        };
      }
    } catch (error: any) {
      console.error('[useSimulationPortfolio] Error executing trade:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Trade execution failed';
      setError(errorMessage);
      return { success: false, message: errorMessage };
    }
  }, [currentSession?.id, refreshPortfolio]);

  const getUserSessions = useCallback(async (): Promise<SimulationSession[]> => {
    try {
      const response = await apiClient.get('/api/simulation/sessions');

      if (response.data.success) {
        return response.data.sessions;
      } else {
        throw new Error(response.data.error || 'Failed to get sessions');
      }
    } catch (error: any) {
      console.error('[useSimulationPortfolio] Error getting sessions:', error);
      setError(error.response?.data?.error || error.message || 'Failed to get sessions');
      return [];
    }
  }, []);

  const closeSession = useCallback(async (sessionId: string): Promise<void> => {
    try {
      const response = await apiClient.delete(`/api/simulation/session/${sessionId}`);

      if (response.data.success) {
        if (currentSession?.id === sessionId) {
          setCurrentSession(null);
          setPortfolioData(null);
        }
        console.log(`[useSimulationPortfolio] Session ${sessionId} closed`);
      } else {
        throw new Error(response.data.error || 'Failed to close session');
      }
    } catch (error: any) {
      console.error('[useSimulationPortfolio] Error closing session:', error);
      setError(error.response?.data?.error || error.message || 'Failed to close session');
    }
  }, [currentSession?.id]);

  // Auto-create session when historical period is provided
  useEffect(() => {
    if (historicalPeriod && !currentSession) {
      createSession(historicalPeriod);
    }
  }, [historicalPeriod, currentSession, createSession]);

  // Auto-refresh portfolio when session changes
  useEffect(() => {
    if (currentSession?.id) {
      refreshPortfolio();
    }
  }, [currentSession?.id, refreshPortfolio]);

  return {
    portfolioData,
    currentSession,
    loading,
    error,
    createSession,
    refreshPortfolio,
    executeTrade,
    getUserSessions,
    closeSession
  };
};