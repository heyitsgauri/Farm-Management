import React from 'react';
import type { FieldState, ActionItem } from '../../types/farm';
import { FieldCard } from './FieldCard';
import { Leaf, Sprout } from 'lucide-react';

interface FieldGridProps {
  fields: FieldState[];
  actions: ActionItem[];
  isExecuting: boolean;
  onExecuteAction: (actionId: number) => void;
}

export const FieldGrid: React.FC<FieldGridProps> = ({
  fields,
  actions,
  isExecuting,
  onExecuteAction,
}) => {
  const plantedCount = fields.filter((f) => f.crop !== null).length;
  const matureCount = fields.filter((f) => f.state === 'MATURE').length;
  const growingCount = fields.filter((f) => f.state === 'GROWING').length;

  return (
    <div className="rounded-3xl glass-card relative overflow-hidden shadow-2xl">
      {/* Dot texture overlay */}
      <div className="absolute inset-0 dot-grid opacity-40 pointer-events-none" />

      {/* Subtle green bloom at top */}
      <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-96 h-40 bg-emerald-500/6 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 p-6 sm:p-8">
        {/* Header row */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center">
              <Leaf className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <span className="text-xs font-bold uppercase tracking-widest text-neutral-500">
              Field Management
            </span>
          </div>

          <div className="flex items-center gap-2">
            {growingCount > 0 && (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-950/40 border border-emerald-500/25 text-emerald-400 text-[11px] font-semibold">
                <Sprout className="w-3 h-3" />
                {growingCount} Growing
              </span>
            )}
            {matureCount > 0 && (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500 text-neutral-950 text-[11px] font-black shadow-[0_0_15px_rgba(16,185,129,0.4)]">
                ✓ {matureCount} Ready to Harvest
              </span>
            )}
          </div>
        </div>

        {/* 5 Field Cards — matching the 5 rounded squares in reference */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-5 justify-items-center mb-10 pb-2">
          {fields.map((field) => (
            <FieldCard
              key={field.id}
              field={field}
              actions={actions}
              isExecuting={isExecuting}
              onExecuteAction={onExecuteAction}
              isSelected={field.state === 'GROWING' || field.state === 'MATURE'}
            />
          ))}
        </div>

        {/* Description footer */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-t border-white/[0.06] pt-6">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Sprout className="w-4 h-4 text-emerald-400" />
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                Design your farm operations visually
              </h2>
            </div>
            <p className="text-[12px] sm:text-sm text-neutral-500 max-w-2xl leading-relaxed">
              Manage Wheat, Rice, and Corn crops across 5 discrete fields. Automated soil telemetry,
              daily maturation progress, and instant harvest triggers in real-time.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="px-3.5 py-1.5 rounded-full bg-neutral-900/80 border border-white/[0.08] text-xs font-mono flex items-center gap-2">
              <span className="text-neutral-500">Planted:</span>
              <span className="text-emerald-400 font-bold">{plantedCount}/5</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
