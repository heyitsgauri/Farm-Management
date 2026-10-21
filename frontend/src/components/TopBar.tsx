import React from 'react';
import { Calendar, RefreshCw, Play, Sparkles } from 'lucide-react';
import { useFarmContext } from '../context/FarmContext';

interface TopBarProps {
  title?: string;
  subtitle?: string;
  onAdvanceDay?: () => void;
  isSimulating?: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({
  title,
  subtitle,
  onAdvanceDay,
  isSimulating = false,
}) => {
  const farm = useFarmContext();
  const currentDay = farm.farmState?.day ?? 1;
  const backendOnline = farm.health?.status === 'ok';
  const isPpoLoaded = farm.health?.ppo_model_loaded ?? false;
  const modelStatusLabel = !backendOnline
    ? 'AI Model: backend offline'
    : isPpoLoaded
      ? 'AI Model: PPO loaded'
      : 'AI Model: PPO unavailable';

  const handleReset = async () => {
    if (window.confirm('Reset the farm simulation back to Day 1?')) {
      await farm.resetFarm();
    }
  };

  const handleAdvance = () => {
    if (onAdvanceDay) {
      onAdvanceDay();
    } else {
      const holdAction = farm.actions.find((a) => a.type === 'HOLD');
      if (holdAction) {
        farm.executeHumanAction(holdAction.id);
      }
    }
  };

  return (
    <header className="h-16 px-6 bg-[#071f16]/90 backdrop-blur-md border-b border-[#123827] flex items-center justify-between sticky top-0 z-10 select-none">
      {/* Title & Subtitle */}
      <div>
        {title && <h2 className="text-lg font-bold text-white tracking-tight">{title}</h2>}
        {subtitle && <p className="text-xs text-emerald-400/80">{subtitle}</p>}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Model status pill */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-[#0b291c] border border-[#16422e] text-xs font-medium text-emerald-300">
          <span className={`w-2 h-2 rounded-full ${isPpoLoaded ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
          <span>{modelStatusLabel}</span>
        </div>

        {/* Day Badge */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#0b291c] border border-[#16422e] text-xs font-semibold text-emerald-200">
          <Calendar className="w-3.5 h-3.5 text-emerald-400" />
          <span>Day {currentDay} / 30</span>
        </div>

        {/* Season Badge */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#0b291c] border border-[#16422e] text-xs font-semibold text-emerald-200">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span>Season: Spring</span>
        </div>

        {/* Advance Day / Start Simulation */}
        <button
          onClick={handleAdvance}
          disabled={farm.isLoading || isSimulating || currentDay >= 30}
          className="ag-button-primary text-xs py-1.5 px-3.5"
          title="Advance to next simulation day"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>{currentDay === 1 ? 'Start Simulation' : 'Advance Day'}</span>
        </button>

        {/* Reset Button */}
        <button
          onClick={handleReset}
          disabled={farm.isLoading || isSimulating}
          className="ag-button-secondary text-xs py-1.5 px-3"
          title="Reset simulation"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${farm.isLoading ? 'animate-spin' : ''}`} />
          <span>Reset</span>
        </button>
      </div>
    </header>
  );
};
export default TopBar;
