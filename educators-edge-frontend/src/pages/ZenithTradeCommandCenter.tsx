import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSimulation } from '../context/SimulationContext';
import { FinancialLayout } from '../components/layout/FinancialLayout';
import { MarketPulse } from '../components/trade/MarketPulse';
import { TheStage } from '../components/trade/TheStage';
import { TheCockpit } from '../components/trade/TheCockpit';
import { SimulationControls } from '../components/trade/SimulationControls';
import { Badge } from '../components/ui/badge';
import { Activity, Wifi, WifiOff, BarChart3, TrendingUp, PieChart, DollarSign } from 'lucide-react';

type MobileTab = 'chart' | 'market' | 'portfolio' | 'trade';

export const ZenithTradeCommandCenter: React.FC = () => {
  const simulation = useSimulation();
  const [searchParams] = useSearchParams();
  const [selectedSymbol, setSelectedSymbol] = useState('AAPL');
  const [activeMobileTab, setActiveMobileTab] = useState<MobileTab>('chart');
  const [selectedHistoricalPeriod, setSelectedHistoricalPeriod] = useState<any>(null);

  // Transform SimulationContext marketData to MarketPulse format
  const transformedMarketData = useMemo(() => {
    const transformed: { [symbol: string]: any } = {};
    Object.entries(simulation.marketData).forEach(([symbol, data]) => {
      transformed[symbol] = {
        price: data.close,
        volume: data.volume,
        lastUpdated: Date.now(),
        change: data.close - data.open,
        changePercent: ((data.close - data.open) / data.open) * 100,
        previousPrice: data.open
      };
    });
    return transformed;
  }, [simulation.marketData]);

  // Transform for TheCockpit (expects MarketData interface)
  const getSymbolDataForCockpit = (symbol: string) => {
    const data = simulation.marketData[symbol];
    if (!data) return null;
    
    const change = data.close - data.open;
    const changePercent = ((change / data.open) * 100);
    
    return {
      price: data.close,
      volume: data.volume,
      timestamp: Date.now(),
      lastUpdated: Date.now(),
      change: change,
      changePercent: changePercent,
      previousPrice: data.open
    };
  };

  const connectionStatus = simulation.isConnected ? 'Connected' : 'Disconnected';

  // WebSocket connection is now handled by SimulationContext
  
  // Handle symbol parameter from AnalysisPage
  useEffect(() => {
    const symbolParam = searchParams.get('symbol');
    if (symbolParam) {
      setSelectedSymbol(symbolParam.toUpperCase());
    }
  }, [searchParams]);

  const handleHistoricalPeriodChange = (period: any) => {
    setSelectedHistoricalPeriod(period);
    console.log('[ZenithTradeCenter] Historical period changed:', period);
  };

  const getConnectionStatusColor = () => {
    return simulation.isConnected ? 'bg-green-500' : 'bg-red-500';
  };

  const getConnectionStatusText = () => {
    if (selectedHistoricalPeriod) {
      return `Historical Simulation: ${selectedHistoricalPeriod.name}`;
    }
    
    if (simulation.isConnected) {
      const hasData = Object.keys(simulation.marketData).length > 0;
      return hasData ? 'Live Market Simulation' : 'Simulation Connected';
    }
    
    return 'Disconnected';
  };

  return (
    <FinancialLayout>
      {/* Command Center Header */}
      <div className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg">
                  <Activity className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">Zenith Trade Command Center</h1>
                  <p className="text-sm text-slate-400">Professional Trading Interface</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Connection Status */}
              <div className="flex items-center gap-2">
                {simulation.isConnected ? (
                  <Wifi className="h-4 w-4 text-green-400" />
                ) : (
                  <WifiOff className="h-4 w-4 text-red-400" />
                )}
                <Badge 
                  variant="outline" 
                  className={`${
                    simulation.isConnected ? 'text-green-400 border-green-400' : 'text-red-400 border-red-400'
                  } px-3 py-1`}
                >
                  <div className={`w-2 h-2 rounded-full mr-2 ${getConnectionStatusColor()}`}></div>
                  {getConnectionStatusText()}
                </Badge>
              </div>

              {/* Active Symbol */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-400">Active:</span>
                <Badge variant="outline" className="text-cyan-400 border-cyan-400 px-3 py-1">
                  {selectedSymbol}
                </Badge>
              </div>

              {/* Market Count */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-400">Tracking:</span>
                <Badge variant="outline" className="text-blue-400 border-blue-400 px-3 py-1">
                  {Object.keys(simulation.marketData).length} Symbols
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Simulation Controls */}
      <div className="border-b border-slate-700 bg-slate-900/30 p-4">
        <SimulationControls 
          onHistoricalPeriodChange={handleHistoricalPeriodChange}
        />
      </div>

      {/* Desktop Layout - Hidden on Mobile */}
      <div className="hidden lg:flex h-[calc(100vh-88px)]">
        {/* Column 1: Market Pulse (Left - Fixed Width) */}
        <div className="w-64 border-r border-slate-700 bg-slate-900/30 flex-shrink-0">
          <MarketPulse 
            symbols={['AAPL', 'GOOGL', 'MSFT', 'NVDA', 'TSLA', 'AMZN', 'META', 'NFLX']}
            marketData={transformedMarketData}
            connectionStatus={connectionStatus as any}
            activeSymbol={selectedSymbol}
            onSymbolSelect={setSelectedSymbol}
          />
        </div>

        {/* Column 2: The Stage (Center - Flexible) */}
        <div className="flex-1 bg-slate-900/20">
          <TheStage 
            selectedSymbol={selectedSymbol}
            symbolData={getSymbolDataForCockpit(selectedSymbol)}
            marketData={transformedMarketData}
            isConnected={simulation.isConnected}
          />
        </div>

        {/* Column 3: The Cockpit (Right - Fixed Width) */}
        <div className="w-80 border-l border-slate-700 bg-slate-900/30 flex-shrink-0">
          <TheCockpit 
            selectedSymbol={selectedSymbol}
            onSymbolChange={setSelectedSymbol}
            symbolData={getSymbolDataForCockpit(selectedSymbol)}
            isConnected={simulation.isConnected}
          />
        </div>
      </div>

      {/* Mobile Layout - Tabbed Interface */}
      <div className="lg:hidden">
        {/* Mobile Tab Content */}
        <div className="min-h-[calc(100vh-140px)]">
          {activeMobileTab === 'chart' && (
            <div className="p-4">
              <TheStage 
                selectedSymbol={selectedSymbol}
                symbolData={getSymbolDataForCockpit(selectedSymbol)}
                marketData={transformedMarketData}
                isConnected={simulation.isConnected}
              />
            </div>
          )}
          {activeMobileTab === 'market' && (
            <div className="p-4">
              <MarketPulse 
                symbols={['AAPL', 'GOOGL', 'MSFT', 'NVDA', 'TSLA', 'AMZN', 'META', 'NFLX']}
                marketData={transformedMarketData}
                connectionStatus={connectionStatus as any}
                activeSymbol={selectedSymbol}
                onSymbolSelect={setSelectedSymbol}
              />
            </div>
          )}
          {activeMobileTab === 'portfolio' && (
            <div className="p-4">
              <div className="bg-slate-900/40 border border-slate-700 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Portfolio Summary</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Value</span>
                    <span className="text-white font-medium">$67,356</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Day P&L</span>
                    <span className="text-green-400 font-medium">+$1,234 (+1.87%)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Buying Power</span>
                    <span className="text-white font-medium">$15,000</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          {activeMobileTab === 'trade' && (
            <div className="p-4">
              <TheCockpit 
                selectedSymbol={selectedSymbol}
                onSymbolChange={setSelectedSymbol}
                symbolData={getSymbolDataForCockpit(selectedSymbol)}
                isConnected={simulation.isConnected}
              />
            </div>
          )}
        </div>

        {/* Bottom Navigation Bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-slate-950/95 backdrop-blur-sm border-t border-slate-700">
          <div className="flex">
            {[
              { id: 'chart' as MobileTab, label: 'Chart', icon: BarChart3 },
              { id: 'market' as MobileTab, label: 'Market', icon: TrendingUp },
              { id: 'portfolio' as MobileTab, label: 'Portfolio', icon: PieChart },
              { id: 'trade' as MobileTab, label: 'Trade', icon: DollarSign },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveMobileTab(tab.id)}
                className={`flex-1 py-3 px-2 flex flex-col items-center gap-1 transition-colors ${
                  activeMobileTab === tab.id
                    ? 'text-cyan-400 bg-slate-800/50'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <tab.icon className="h-5 w-5" />
                <span className="text-xs font-medium">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </FinancialLayout>
  );
};