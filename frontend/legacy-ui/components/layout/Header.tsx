import React from 'react';
import { RotateCcw, Cpu, Wifi, WifiOff, Zap, Sparkles } from 'lucide-react';
import type { FarmState, HealthResponse } from '../../types/farm';

interface HeaderProps {
  farmState: FarmState | null;
  health: HealthResponse | null;
  lastReward: number | null;
  isLoading: boolean;
  onReset: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  farmState,
  health,
  lastReward,
  isLoading,
  onReset,
}) => {
  const currentDay = farmState?.day ?? 1;
  const maxDays = 30;
  const progressPercent = Math.min(100, Math.round((currentDay / maxDays) * 100));

  return (
    <header className="w-full pt-4 pb-2 px-4 sticky top-0 z-50">
      {/* Floating pill navbar — matches flowmaticai.in design pattern */}
      <div className="max-w-[1200px] mx-auto rounded-full bg-[#0a0d14]/95 border border-white/[0.08] px-5 py-2.5 backdrop-blur-2xl flex items-center justify-between shadow-[0_8px_32px_rgba(0,0,0,0.6)]">

        {/* LEFT: Brand */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-full bg-emerald-950/80 border border-emerald-500/50 flex items-center justify-center animate-glow-pulse flex-shrink-0">
            <Cpu className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[13px] font-bold tracking-tight text-white whitespace-nowrap">
              AUTONOMOUS FARM AI
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
              <Zap className="w-2.5 h-2.5" />
              PPO 500K
            </span>
          </div>
        </div>

        {/* CENTER: Season Progress */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="flex items-center gap-2.5 bg-neutral-900/80 border border-white/[0.08] rounded-full px-3.5 py-1.5">
            <span className="text-[11px] font-semibold text-white tracking-tight whitespace-nowrap">
              Season 1
              <span className="text-neutral-500 mx-1.5">·</span>
              Day {currentDay}
              <span className="text-neutral-500 font-normal">/{maxDays}</span>
            </span>
            {/* Progress track */}
            <div className="w-20 bg-neutral-800/80 h-1 rounded-full overflow-hidden hidden sm:block">
              <div
                className="bg-gradient-to-r from-emerald-600 to-emerald-400 h-full rounded-full transition-all duration-700 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-[11px] font-mono font-bold text-emerald-400 hidden sm:inline">
              {progressPercent}%
            </span>
          </div>

          {/* Step reward badge */}
          {lastReward !== null && (
            <div className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-mono font-bold transition-all ${
              lastReward >= 0
                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400'
                : 'bg-rose-950/40 border-rose-500/30 text-rose-400'
            }`}>
              <Sparkles className="w-3 h-3" />
              <span className="text-neutral-400 font-normal">Reward:</span>
              {lastReward > 0 ? `+${lastReward.toFixed(1)}` : lastReward.toFixed(1)}
            </div>
          )}
        </div>

        {/* RIGHT: API status + Reset */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-medium ${
            health
              ? 'bg-emerald-950/30 border-emerald-500/20 text-emerald-300'
              : 'bg-rose-950/30 border-rose-800/30 text-rose-400'
          }`}>
            {health ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#10b981] animate-pulse" />
                <Wifi className="w-3 h-3 hidden sm:inline" />
                <span className="hidden sm:inline">API Online</span>
              </>
            ) : (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                <WifiOff className="w-3 h-3 hidden sm:inline" />
                <span className="hidden sm:inline">Offline</span>
              </>
            )}
          </div>

          <button
            onClick={() => {
              if (window.confirm('Reset farm to Day 1? This starts a fresh simulation episode.')) {
                onReset();
              }
            }}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-900/80 hover:bg-neutral-800 border border-white/[0.08] hover:border-emerald-500/40 text-neutral-300 hover:text-white text-[11px] font-medium transition-all duration-200 cursor-pointer disabled:opacity-40"
            title="Reset simulation to initial state"
          >
            <RotateCcw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Reset</span>
          </button>
        </div>
      </div>
    </header>
  );
};
