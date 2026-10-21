import React from 'react';
import { History, Sparkles, Bot, User } from 'lucide-react';
import type { ActionHistoryEntry } from '../../types/farm';

interface ActionHistoryProps {
  history: ActionHistoryEntry[];
}

const ACTION_TYPE_COLORS: Record<string, string> = {
  HOLD: 'text-neutral-400',
  PLANT: 'text-emerald-400',
  HARVEST: 'text-amber-400',
  SELL: 'text-sky-400',
};

export const ActionHistory: React.FC<ActionHistoryProps> = ({ history }) => {
  return (
    <div className="rounded-3xl glass-card relative overflow-hidden shadow-xl p-6">
      <div className="absolute inset-0 dot-grid opacity-30 pointer-events-none" />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-xl bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-center">
              <History className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-white leading-none mb-0.5">
                Decision &amp; Step History
              </h3>
              <p className="text-[11px] text-neutral-600">
                Chronological log of human player and PPO actions
              </p>
            </div>
          </div>
          <span className="text-[11px] font-mono text-neutral-600">
            {history.length} events
          </span>
        </div>

        {/* Log entries */}
        {history.length === 0 ? (
          <div className="py-10 text-center border border-dashed border-white/[0.07] rounded-2xl">
            <History className="w-8 h-8 text-neutral-700 mx-auto mb-2" />
            <p className="text-xs text-neutral-600">
              No actions recorded yet. Take an action or ask PPO AI to begin.
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {history.map((entry) => {
              const isHuman = entry.actor === 'HUMAN';
              const isPositive = entry.reward >= 0;
              const typeColor = ACTION_TYPE_COLORS[entry.actionType] ?? 'text-neutral-300';

              return (
                <div
                  key={entry.id}
                  className="p-3 rounded-xl bg-[#0b0d12] border border-white/[0.06] hover:border-emerald-500/20 flex items-center justify-between gap-3 transition-all duration-200 group"
                >
                  {/* Left: Day + Actor + Action */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-lg bg-neutral-900/80 text-neutral-400 border border-white/[0.06] flex-shrink-0">
                      Day {entry.day}
                    </span>

                    <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                      isHuman
                        ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-500/30'
                        : 'bg-sky-950/50 text-sky-400 border border-sky-500/30'
                    }`}>
                      {isHuman ? <User className="w-2.5 h-2.5" /> : <Bot className="w-2.5 h-2.5" />}
                      {isHuman ? 'YOU' : 'PPO AI'}
                    </span>

                    <div className="min-w-0 flex items-center gap-1.5 overflow-hidden">
                      <span className={`text-[10px] font-mono font-bold flex-shrink-0 ${typeColor}`}>
                        {entry.actionType}
                      </span>
                      <span className="text-xs font-semibold text-white truncate">
                        {entry.actionLabel}
                      </span>
                    </div>
                  </div>

                  {/* Right: Reward + Timestamp */}
                  <div className="flex items-center gap-2.5 flex-shrink-0">
                    <div className="flex items-center gap-1 font-mono text-xs">
                      <Sparkles className="w-3 h-3 text-emerald-500" />
                      <span className={`font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {entry.reward > 0 ? `+${entry.reward.toFixed(1)}` : entry.reward.toFixed(1)}
                      </span>
                    </div>
                    <span className="font-mono text-[10px] text-neutral-700 hidden sm:inline">
                      {entry.time}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
