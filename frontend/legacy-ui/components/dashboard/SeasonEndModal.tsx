import React from 'react';
import { Trophy, Skull, RotateCcw, ArrowRight } from 'lucide-react';
import type { FarmMetrics } from '../../types/farm';

interface SeasonEndModalProps {
  isOpen: boolean;
  metrics: FarmMetrics | null;
  onReset: () => void;
}

export const SeasonEndModal: React.FC<SeasonEndModalProps> = ({
  isOpen,
  metrics,
  onReset,
}) => {
  if (!isOpen || !metrics) return null;

  const isSurvived = metrics.survived;
  const profit = metrics.profit;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="card-base max-w-md w-full p-6 border-[var(--border-green)] shadow-[0_0_50px_rgba(16,185,129,0.25)] text-center relative">
        {/* Status Icon */}
        <div
          className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center border ${
            isSurvived
              ? 'bg-[var(--emerald-950)] border-[var(--border-green)] text-[var(--emerald-400)] shadow-[var(--shadow-emerald)]'
              : 'bg-rose-950/80 border-rose-700/50 text-rose-400'
          }`}
        >
          {isSurvived ? <Trophy className="w-8 h-8" /> : <Skull className="w-8 h-8" />}
        </div>

        <h2 className="text-xl font-bold text-white mb-1">
          {isSurvived ? 'Season 1 Completed!' : 'Farm Insolvent / Terminated'}
        </h2>
        <p className="text-xs text-[var(--text-muted)] mb-6">
          {isSurvived
            ? '30-Day agricultural production cycle finished successfully.'
            : 'Farm funds were depleted during the season.'}
        </p>

        {/* Final Financial Breakdown */}
        <div className="grid grid-cols-2 gap-2.5 mb-6 text-left">
          <div className="p-3 rounded-xl bg-[var(--bg-card-elevated)] border border-[var(--border-subtle)]">
            <span className="text-[10px] text-[var(--text-muted)] uppercase block">Final Cash</span>
            <span className="text-base font-bold font-mono text-white">
              ₹{metrics.cash.toLocaleString('en-IN', { maximumFractionDigits: 1 })}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-[var(--bg-card-elevated)] border border-[var(--border-subtle)]">
            <span className="text-[10px] text-[var(--text-muted)] uppercase block">Inventory Value</span>
            <span className="text-base font-bold font-mono text-white">
              ₹{metrics.inventory_value.toLocaleString('en-IN', { maximumFractionDigits: 1 })}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-[var(--bg-card-elevated)] border border-[var(--border-subtle)]">
            <span className="text-[10px] text-[var(--text-muted)] uppercase block">Total Net Wealth</span>
            <span className="text-base font-bold font-mono text-white">
              ₹{metrics.total_wealth.toLocaleString('en-IN', { maximumFractionDigits: 1 })}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-[var(--bg-card-elevated)] border border-[var(--border-subtle)]">
            <span className="text-[10px] text-[var(--text-muted)] uppercase block">Net Profit</span>
            <span
              className={`text-base font-bold font-mono ${
                profit >= 0 ? 'text-[var(--emerald-400)]' : 'text-rose-400'
              }`}
            >
              {profit >= 0 ? `+₹${profit.toLocaleString('en-IN', { maximumFractionDigits: 1 })}` : `-₹${Math.abs(profit).toLocaleString('en-IN', { maximumFractionDigits: 1 })}`}
            </span>
          </div>
        </div>

        {/* Actions */}
        <button
          onClick={onReset}
          className="w-full btn-primary text-sm !py-3 flex items-center justify-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Start New Season</span>
          <ArrowRight className="w-4 h-4 ml-1" />
        </button>
      </div>
    </div>
  );
};
