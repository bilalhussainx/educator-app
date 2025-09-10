// src/context/SimulationContext.tsx
import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { type HistoricalPeriod } from '../constants/simulation';

export interface MarketDataPoint {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface SimulationState {
  currentDate: Date;
  speed: number;
  isActive: boolean;
  historicalPeriod: HistoricalPeriod | null;
  isConnected: boolean;
  marketData: Record<string, MarketDataPoint>;
}

export interface SimulationContextType extends SimulationState {
  play: () => void;
  pause: () => void;
  setSpeed: (speed: number) => void;
  jumpToDate: (date: Date) => void;
  setHistoricalPeriod: (period: HistoricalPeriod) => void;
  reset: () => void;
}

const SimulationContext = createContext<SimulationContextType | undefined>(undefined);

export const SimulationProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<SimulationState>({
    currentDate: new Date('2020-01-01'),
    speed: 2000,
    isActive: false,
    historicalPeriod: null,
    isConnected: false,
    marketData: {}
  });
  
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) return;

    const connect = () => {
      // Use environment variable for WebSocket URL
      const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:10000';
      console.log('[Simulation] Connecting to WebSocket:', `${wsUrl}/ws/simulation`);
      const socket = new WebSocket(`${wsUrl}/ws/simulation?token=${token}`);
      ws.current = socket;

      socket.onopen = () => {
        console.log('[Simulation] WebSocket connected');
        setState(prev => ({ ...prev, isConnected: true }));
      };
      
      socket.onclose = () => {
        console.log('[Simulation] WebSocket disconnected');
        setState(prev => ({ ...prev, isConnected: false }));
        // Implement robust reconnection logic here later
      };
      
      socket.onerror = (err) => {
        console.error('[Simulation] WebSocket error:', err);
      };
      
      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('[Simulation] Message received:', message.type, message);
          
          switch (message.type) {
            case 'MARKET_DATA_UPDATE':
              console.log('[Simulation] Market data update:', Object.keys(message.payload.marketData), 'symbols');
              setState(prev => ({
                ...prev,
                currentDate: new Date(message.payload.date),
                marketData: message.payload.marketData
              }));
              break;
            case 'SIMULATION_STATE_UPDATE':
              console.log('[Simulation] State update:', message.data);
              setState(prev => ({
                ...prev,
                currentDate: new Date(message.data.currentDate),
                isActive: message.data.isActive,
                speed: message.data.speed
              }));
              break;
            case 'SIMULATION_DATE_CHANGED':
              console.log('[Simulation] Date changed:', message.data.currentDate);
              setState(prev => ({
                ...prev,
                currentDate: new Date(message.data.currentDate)
              }));
              break;
          }
        } catch (error) {
          console.error('[Simulation] Error parsing message:', error);
        }
      };
    };
    
    connect();
    return () => ws.current?.close();
  }, []);

  const play = () => {
    console.log('[Simulation] Sending PLAY_SIMULATION');
    ws.current?.send(JSON.stringify({ type: 'PLAY_SIMULATION' }));
  };

  const pause = () => {
    console.log('[Simulation] Sending PAUSE_SIMULATION');
    ws.current?.send(JSON.stringify({ type: 'PAUSE_SIMULATION' }));
  };

  const setSpeed = (speed: number) => {
    console.log('[Simulation] Sending SET_SPEED:', speed);
    ws.current?.send(JSON.stringify({ type: 'SET_SPEED', payload: { speed } }));
  };

  const jumpToDate = (date: Date) => {
    console.log('[Simulation] Sending JUMP_TO_DATE:', date.toISOString());
    ws.current?.send(JSON.stringify({ type: 'JUMP_TO_DATE', payload: { date: date.toISOString() } }));
  };

  const setHistoricalPeriod = (period: HistoricalPeriod) => {
    setState(prev => ({ ...prev, historicalPeriod: period }));
    jumpToDate(new Date(period.startDate));
  };

  const reset = () => {
    setState(prev => ({
      ...prev,
      currentDate: new Date('2020-01-01'),
      speed: 2000,
      isActive: false,
      historicalPeriod: null
    }));
  };

  const contextValue: SimulationContextType = {
    ...state,
    play,
    pause,
    setSpeed,
    jumpToDate,
    setHistoricalPeriod,
    reset
  };

  return (
    <SimulationContext.Provider value={contextValue}>
      {children}
    </SimulationContext.Provider>
  );
};

export const useSimulation = (): SimulationContextType => {
  const context = useContext(SimulationContext);
  if (context === undefined) {
    throw new Error('useSimulation must be used within a SimulationProvider');
  }
  return context;
};

export default SimulationContext;