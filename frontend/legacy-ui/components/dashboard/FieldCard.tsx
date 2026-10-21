import React from 'react';
import { Sprout, CheckCircle2, Scissors, Leaf } from 'lucide-react';
import type { FieldState, ActionItem } from '../../types/farm';

interface FieldCardProps {
  field: FieldState;
  actions: ActionItem[];
  isExecuting: boolean;
  onExecuteAction: (actionId: number) => void;
  isSelected?: boolean;
}

const CROP_MAX_DAYS: Record<string, number> = {
  Wheat: 5,
  Rice: 8,
  Corn: 6,
};

const CROP_COLORS: Record<string, { bg: string; text: string; border: string; icon: string }> = {
  Wheat: {
    bg: 'from-amber-950/40 to-yellow-950/30',
    text: 'text-amber-400',
    border: 'border-amber-500/40',
    icon: 'text-amber-400',
  },
  Rice: {
    bg: 'from-sky-950/40 to-blue-950/30',
    text: 'text-sky-400',
    border: 'border-sky-500/40',
    icon: 'text-sky-400',
  },
  Corn: {
    bg: 'from-orange-950/40 to-yellow-950/30',
    text: 'text-orange-400',
    border: 'border-orange-500/40',
    icon: 'text-orange-400',
  },
};

export const FieldCard: React.FC<FieldCardProps> = ({
  field,
  actions,
  isExecuting,
  onExecuteAction,
  isSelected = false,
}) => {
  const maxDays = field.crop ? CROP_MAX_DAYS[field.crop] || 5 : 5;
  const progressPercent = Math.min(100, Math.round((field.progress / maxDays) * 100));

  const harvestAction = actions.find(
    (a) => a.type === 'HARVEST' && a.field_id === field.id
  );
  const plantWheat = actions.find(
    (a) => a.type === 'PLANT' && a.field_id === field.id && a.crop_name === 'Wheat'
  );
  const plantRice = actions.find(
    (a) => a.type === 'PLANT' && a.field_id === field.id && a.crop_name === 'Rice'
  );
  const plantCorn = actions.find(
    (a) => a.type === 'PLANT' && a.field_id === field.id && a.crop_name === 'Corn'
  );

  const isMature = field.state === 'MATURE';
  const isGrowing = field.state === 'GROWING';
  const isEmpty = field.state === 'EMPTY';

  const cropColors = field.crop ? CROP_COLORS[field.crop] : null;

  return (
    <div className="relative flex flex-col items-center w-full">
      {/* Main Card */}
      <div
        className={`w-full min-h-[200px] max-w-[210px] rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden border transition-all duration-300 ${
          isMature
            ? `bg-gradient-to-br from-[#0e1e17] to-[#0a1610] border-emerald-500/60 shadow-[0_0_30px_rgba(16,185,129,0.3),inset_0_0_20px_rgba(16,185,129,0.04)]`
            : isGrowing && cropColors
            ? `bg-gradient-to-br ${cropColors.bg} ${cropColors.border} shadow-[0_0_15px_rgba(16,185,129,0.1)]`
            : isSelected
            ? 'bg-[#111520] border-emerald-500/40'
            : 'bg-[#0e1018] border-white/[0.08] hover:border-emerald-500/30'
        }`}
      >
        {/* Background dot texture */}
        <div className="absolute inset-0 dot-grid opacity-30 pointer-events-none" />

        {/* Mature glow overlay */}
        {isMature && (
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none rounded-2xl" />
        )}

        {/* TOP: Field number + status badge */}
        <div className="relative flex items-center justify-between w-full z-10 mb-1">
          <span className="font-mono text-xs font-bold text-neutral-400 tracking-wide">
            #{String(field.id + 1).padStart(2, '0')}
          </span>

          {isMature ? (
            <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/50">
              <CheckCircle2 className="w-2.5 h-2.5" /> Ready
            </span>
          ) : isGrowing ? (
            <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-emerald-950/60 text-emerald-400 border-emerald-500/30">
              <Sprout className="w-2.5 h-2.5 animate-pulse" />
              {field.progress}/{maxDays}d
            </span>
          ) : (
            <span className="text-[10px] text-neutral-500 uppercase font-mono tracking-wide font-semibold">Empty</span>
          )}
        </div>

        {/* CENTER: Crop icon + label */}
        <div className="relative z-10 flex flex-col items-center justify-center my-1.5 text-center">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center mb-1.5 transition-all duration-300 ${
              isMature
                ? 'bg-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.45)]'
                : isGrowing && cropColors
                ? `bg-neutral-800/60`
                : 'bg-neutral-800/40'
            }`}
          >
            {isGrowing || isMature ? (
              <Leaf
                className={`w-6 h-6 ${
                  isMature
                    ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.7)]'
                    : cropColors?.icon ?? 'text-emerald-400'
                }`}
              />
            ) : (
              <Sprout className="w-6 h-6 text-neutral-600" />
            )}
          </div>
          <span className="text-sm font-bold text-white tracking-wide leading-tight">
            {field.crop || 'Unseeded'}
          </span>
          {isGrowing && (
            <span className="text-[11px] font-mono text-neutral-400 mt-0.5">
              {progressPercent}% grown
            </span>
          )}
        </div>

        {/* BOTTOM: Direct Actions / Progress */}
        <div className="relative z-10 w-full mt-1">
          {isGrowing && (
            <div className="w-full bg-neutral-800/80 h-1.5 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-emerald-600 to-emerald-400"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          )}

          {isMature && harvestAction && (
            <button
              onClick={() => onExecuteAction(harvestAction.id)}
              disabled={!harvestAction.valid || isExecuting}
              className="w-full py-2 px-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-neutral-950 font-bold text-[11px] flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.35)] transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <Scissors className="w-3.5 h-3.5" /> Harvest Now
            </button>
          )}

          {isEmpty && (
            <div className="flex flex-col gap-1 w-full">
              <div className="text-[9px] uppercase font-bold text-neutral-500 text-center tracking-wider">
                Quick Plant:
              </div>
              <div className="grid grid-cols-3 gap-1">
                {[
                  { name: 'Wheat', label: 'Wheat', cost: '₹1k', action: plantWheat, color: 'bg-amber-950/40 border-amber-500/30 text-amber-300 hover:bg-amber-500/20 hover:border-amber-400' },
                  { name: 'Rice', label: 'Rice', cost: '₹1.5k', action: plantRice, color: 'bg-sky-950/40 border-sky-500/30 text-sky-300 hover:bg-sky-500/20 hover:border-sky-400' },
                  { name: 'Corn', label: 'Corn', cost: '₹1.2k', action: plantCorn, color: 'bg-orange-950/40 border-orange-500/30 text-orange-300 hover:bg-orange-500/20 hover:border-orange-400' },
                ].map(({ label, cost, action, color }) => (
                  <button
                    key={label}
                    onClick={() => action && onExecuteAction(action.id)}
                    disabled={!action?.valid || isExecuting}
                    className={`py-1.5 px-1 rounded-lg border text-[10px] font-bold ${color} transition-all cursor-pointer disabled:opacity-25 flex flex-col items-center justify-center active:scale-95`}
                    title={`Plant ${label} (${cost})`}
                  >
                    <span>{label}</span>
                    <span className="text-[8px] opacity-75 font-mono">{cost}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating status pill badge */}
      {(isMature || isGrowing) && (
        <div className={`absolute -bottom-3 badge-float px-2.5 py-1 rounded-full text-[10px] font-black flex items-center gap-1 z-20 shadow-lg ${
          isMature
            ? 'bg-gradient-to-r from-emerald-400 to-emerald-500 text-neutral-950 shadow-[0_4px_15px_rgba(16,185,129,0.55)]'
            : 'bg-gradient-to-r from-emerald-950 to-emerald-900 text-emerald-300 border border-emerald-500/40 shadow-[0_4px_10px_rgba(16,185,129,0.2)]'
        }`}>
          {isMature ? '✓ Ready' : '↑ Growing'}
        </div>
      )}
    </div>
  );
};
