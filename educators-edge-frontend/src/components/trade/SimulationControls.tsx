import React, { useState } from 'react';
import { Play, Pause, RotateCcw, Calendar, Clock, TrendingUp, Settings } from 'lucide-react';
import { useSimulation } from '../../context/SimulationContext';
import { HISTORICAL_PERIODS } from '../../constants/simulation';

interface SimulationControlsProps {
  onHistoricalPeriodChange?: (period: any) => void;
}

export const SimulationControls: React.FC<SimulationControlsProps> = ({
  onHistoricalPeriodChange
}) => {
  const simulation = useSimulation();
  const [showPeriodSelector, setShowPeriodSelector] = useState(false);
  const [selectedSpeed, setSelectedSpeed] = useState(2000);

  const handleHistoricalPeriodClick = (period: any) => {
    // THE DEFINITIVE FIX: Call jumpToDate from useSimulation hook
    simulation.jumpToDate(new Date(period.startDate));
    simulation.setHistoricalPeriod(period);
    
    // Also call the callback if provided
    if (onHistoricalPeriodChange) {
      onHistoricalPeriodChange(period);
    }
    
    setShowPeriodSelector(false);
  };

  const handleSpeedChange = (speed: number) => {
    setSelectedSpeed(speed);
    simulation.setSpeed(speed);
  };

  return (
    <div className="flex items-center justify-between w-full">
      {/* Left: Playback Controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={simulation.isActive ? simulation.pause : simulation.play}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
            simulation.isActive
              ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30'
              : 'bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30'
          }`}
        >
          {simulation.isActive ? (
            <><Pause className="h-4 w-4" /> Pause</>
          ) : (
            <><Play className="h-4 w-4" /> Play</>
          )}
        </button>

        <button
          onClick={simulation.reset}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-700/50 text-slate-300 hover:bg-slate-700 hover:text-white transition-all border border-slate-600"
        >
          <RotateCcw className="h-4 w-4" />
          Reset
        </button>
      </div>

      {/* Center: Current Date & Speed */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4 text-cyan-400" />
          <span className="text-white font-mono">
            {simulation.currentDate.toISOString().split('T')[0]}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-cyan-400" />
          <select
            value={selectedSpeed}
            onChange={(e) => handleSpeedChange(parseInt(e.target.value))}
            className="bg-slate-800 border border-slate-600 text-white text-sm rounded px-2 py-1"
          >
            <option value={500}>4x Speed</option>
            <option value={1000}>2x Speed</option>
            <option value={2000}>1x Speed</option>
            <option value={4000}>0.5x Speed</option>
          </select>
        </div>
      </div>

      {/* Right: Historical Periods */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <button
            onClick={() => setShowPeriodSelector(!showPeriodSelector)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-all border border-blue-500/30"
          >
            <TrendingUp className="h-4 w-4" />
            Historical Events
          </button>

          {showPeriodSelector && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-50">
              <div className="p-4">
                <h3 className="text-white font-semibold mb-3">Select Historical Period</h3>
                <div className="space-y-2">
                  {HISTORICAL_PERIODS.map((period) => (
                    <button
                      key={period.id}
                      onClick={() => handleHistoricalPeriodClick(period)}
                      className="w-full text-left p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-all border border-slate-700 hover:border-slate-600"
                    >
                      <div className="text-white font-medium">{period.name}</div>
                      <div className="text-slate-400 text-sm">
                        {period.startDate} to {period.endDate}
                      </div>
                      <div className="text-slate-500 text-xs mt-1">
                        {period.description}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Connection Status */}
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              simulation.isConnected ? 'bg-green-400' : 'bg-red-400'
            }`}
          />
          <span className="text-xs text-slate-400">
            {simulation.isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>
    </div>
  );
};