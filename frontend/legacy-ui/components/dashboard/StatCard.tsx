import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive?: boolean;
    isNeutral?: boolean;
  };
  highlightGreen?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  highlightGreen = false,
}) => {
  return (
    <div
      className={`relative rounded-2xl p-4 flex flex-col justify-between transition-all duration-300 border overflow-hidden group cursor-default ${
        highlightGreen
          ? 'bg-gradient-to-br from-[#0f1c18] to-[#0b1310] border-emerald-500/35 shadow-[0_0_25px_rgba(16,185,129,0.12)]'
          : 'bg-[#0c0e14] border-white/[0.07] hover:border-white/15 hover:shadow-[0_4px_24px_rgba(0,0,0,0.4)]'
      }`}
    >
      {/* Subtle inner shimmer on highlighted cards */}
      {highlightGreen && (
        <div className="absolute inset-0 shimmer opacity-40 pointer-events-none" />
      )}

      <div className="relative flex items-center justify-between mb-3">
        <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 leading-none">
          {title}
        </span>
        <div
          className={`w-7 h-7 rounded-xl flex items-center justify-center border transition-all duration-300 ${
            highlightGreen
              ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.35)]'
              : 'bg-neutral-900/80 border-white/[0.08] text-neutral-500 group-hover:text-neutral-300'
          }`}
        >
          <Icon className="w-3.5 h-3.5" />
        </div>
      </div>

      <div className="relative">
        <div className={`text-xl font-bold font-mono tracking-tight mb-1 animate-count ${
          highlightGreen ? 'text-white' : 'text-white'
        }`}>
          {value}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {trend && (
            <span
              className={`font-mono font-bold px-1.5 py-0.5 rounded text-[10px] ${
                trend.isNeutral
                  ? 'bg-neutral-800 text-neutral-400'
                  : trend.isPositive
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                  : 'bg-rose-950/60 text-rose-400 border border-rose-800/30'
              }`}
            >
              {trend.value}
            </span>
          )}
          {subtitle && (
            <span className="text-[11px] text-neutral-600 truncate">{subtitle}</span>
          )}
        </div>
      </div>
    </div>
  );
};
