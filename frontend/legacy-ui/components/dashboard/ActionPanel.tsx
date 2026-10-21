import React, { useState } from 'react';
import { Play, MousePointer2, ChevronRight } from 'lucide-react';
import type { ActionItem } from '../../types/farm';

interface ActionPanelProps {
  actions: ActionItem[];
  isExecuting: boolean;
  onExecuteAction: (actionId: number) => void;
}

const ACTION_TYPE_COLORS: Record<string, string> = {
  HOLD: 'text-neutral-300',
  PLANT: 'text-emerald-400',
  HARVEST: 'text-amber-400',
  SELL: 'text-sky-400',
};

export const ActionPanel: React.FC<ActionPanelProps> = ({
  actions,
  isExecuting,
  onExecuteAction,
}) => {
  const [selectedActionId, setSelectedActionId] = useState<number>(0);

  const holdAction = actions.find((a) => a.id === 0);
  const currentAction = actions.find((a) => a.id === selectedActionId) || holdAction;

  const validActions = actions.filter((a) => a.valid);

  const handleSelect = (action: ActionItem) => {
    setSelectedActionId(action.id);
  };

  const handleExecute = () => {
    if (currentAction) onExecuteAction(currentAction.id);
  };

  return (
    <div className="rounded-3xl glass-card relative overflow-hidden shadow-2xl flex flex-col min-h-[420px]">
      {/* Dot texture */}
      <div className="absolute inset-0 dot-grid opacity-35 pointer-events-none" />

      {/* Right green glow */}
      <div className="absolute -right-16 top-1/3 w-48 h-48 bg-emerald-500/8 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 p-6 sm:p-8 flex flex-col h-full gap-6">

        {/* ── Hero Trigger Button (the large glowing action button from reference) ── */}
        <div className="flex flex-col items-center justify-center py-4">
          <div className="relative">
            <button
              onClick={handleExecute}
              disabled={!currentAction?.valid || isExecuting}
              className="w-52 sm:w-60 h-16 sm:h-20 rounded-2xl bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-600 text-neutral-950 font-extrabold text-lg sm:text-xl flex items-center justify-center gap-3 glow-emerald-lg hover:glow-emerald-xl transition-all duration-300 cursor-pointer disabled:opacity-40 btn-hero shadow-[0_0_50px_rgba(16,185,129,0.35)]"
            >
              <Play className={`w-6 h-6 fill-current flex-shrink-0 ${isExecuting ? 'animate-pulse' : ''}`} />
              <span className="leading-tight">
                {currentAction?.id === 0
                  ? 'Hold / Step'
                  : currentAction
                  ? `${currentAction.type}`
                  : 'Hold / Step'}
              </span>
            </button>

            {/* Floating "You" cursor pill — exact flowmaticai.in reference */}
            <div className="absolute -bottom-3.5 -right-4 bg-gradient-to-r from-emerald-300 to-emerald-400 text-neutral-950 text-[11px] font-black px-3 py-1 rounded-full shadow-[0_4px_20px_rgba(16,185,129,0.65)] flex items-center gap-1.5 z-20 badge-float">
              <MousePointer2 className="w-3 h-3 fill-current" />
              <span>You</span>
            </div>
          </div>

          <div className="mt-5 text-center">
            <span className="text-[11px] font-mono text-neutral-500">
              Active:{' '}
              <span className={`font-bold ${ACTION_TYPE_COLORS[currentAction?.type ?? 'HOLD'] ?? 'text-white'}`}>
                {currentAction?.label || 'HOLD'}
              </span>
            </span>
          </div>
        </div>

        {/* ── Description text ── */}
        <div className="flex flex-col gap-5 flex-1 justify-end">
          <div>
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-2 leading-tight">
              Start with what matters.<br className="hidden sm:block" /> Trigger your way.
            </h3>
            <p className="text-[12px] sm:text-sm text-neutral-500 leading-relaxed">
              Kick off a farm action from an event, a manual schedule, or hold step.
              Select any valid agronomic action and execute with a trigger you control.
            </p>
          </div>

          {/* ── Action selector grid ── */}
          <div className="border-t border-white/[0.06] pt-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] text-neutral-500 font-medium">Select Action Target:</span>
              <span className="text-[11px] font-mono text-emerald-400 font-semibold">
                {validActions.length} available
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 max-h-36 overflow-y-auto pr-1">
              {actions.slice(0, 16).map((a) => (
                <button
                  key={a.id}
                  onClick={() => handleSelect(a)}
                  disabled={!a.valid || isExecuting}
                  className={`p-2 rounded-xl border text-left text-xs transition-all duration-200 cursor-pointer group ${
                    selectedActionId === a.id && a.valid
                      ? 'bg-emerald-950/60 border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                      : a.valid
                      ? 'bg-neutral-900/60 border-white/[0.06] hover:border-emerald-500/30 hover:bg-neutral-800/50'
                      : 'bg-neutral-950/30 border-white/[0.03] opacity-30 cursor-not-allowed'
                  }`}
                >
                  <div className={`text-[9px] font-mono uppercase font-bold mb-0.5 ${ACTION_TYPE_COLORS[a.type] ?? 'text-neutral-500'}`}>
                    {a.type}
                  </div>
                  <div className={`truncate font-medium text-[11px] ${
                    selectedActionId === a.id ? 'text-white' : 'text-neutral-400 group-hover:text-neutral-200'
                  }`}>
                    {a.label}
                  </div>
                  {selectedActionId === a.id && a.valid && (
                    <ChevronRight className="w-2.5 h-2.5 text-emerald-400 mt-0.5" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
