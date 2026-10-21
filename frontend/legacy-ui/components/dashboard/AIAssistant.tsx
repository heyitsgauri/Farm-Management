import React, { useState } from 'react';
import { Bot, Sparkles, Play, Brain, ChevronRight } from 'lucide-react';
import type { PPOPredictResponse, HealthResponse, FarmMetrics } from '../../types/farm';

interface AIAssistantProps {
  health: HealthResponse | null;
  metrics: FarmMetrics | null;
  aiRecommendation: PPOPredictResponse | null;
  isPredicting: boolean;
  isStepping: boolean;
  onAskAI: (deterministic?: boolean) => void;
  onExecuteAI: (deterministic?: boolean) => void;
}

export const AIAssistant: React.FC<AIAssistantProps> = ({
  health,
  metrics,
  aiRecommendation,
  isPredicting,
  isStepping,
  onAskAI,
  onExecuteAI,
}) => {
  const [deterministic, setDeterministic] = useState<boolean>(true);
  const isPPOReady = health?.ppo_model_loaded ?? false;

  const wealth = metrics?.total_wealth ?? 10000;
  const profit = metrics?.profit ?? 0;
  const isProfit = profit >= 0;

  return (
    <div className="rounded-3xl glass-card relative overflow-hidden shadow-2xl flex flex-col justify-between min-h-[420px]">
      {/* Background dot texture */}
      <div className="absolute inset-0 dot-grid opacity-35 pointer-events-none" />

      {/* Left green glow */}
      <div className="absolute -left-16 top-1/2 -translate-y-1/2 w-48 h-48 bg-emerald-500/8 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 p-6 sm:p-8 flex flex-col h-full gap-6">

        {/* ── Mini Widget Card (mirrors the "Pro Plan" floating card in reference) ── */}
        <div className="rounded-2xl bg-[#0a0d12] border border-white/[0.07] p-5 shadow-[0_4px_24px_rgba(0,0,0,0.5)] relative overflow-hidden">
          <div className="absolute inset-0 shimmer opacity-20 pointer-events-none" />

          <div className="relative flex items-center justify-between mb-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
              Autonomous Operations Plan
            </span>
            <div className="w-5 h-5 rounded-full bg-emerald-950/80 border border-emerald-500/50 flex items-center justify-center">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
          </div>

          <div className="relative flex items-baseline gap-2 mb-4">
            <span className="text-2xl font-bold font-mono text-emerald-400 text-glow">
              ₹{wealth.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
            <span className="text-xs text-neutral-600 font-mono line-through">₹10,000 start</span>
            <span className={`text-xs font-mono font-bold ml-auto px-2 py-0.5 rounded-full ${
              isProfit
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                : 'bg-rose-950/60 text-rose-400 border border-rose-800/30'
            }`}>
              {isProfit ? `+₹${profit.toFixed(0)}` : `-₹${Math.abs(profit).toFixed(0)}`}
            </span>
          </div>

          {/* Policy decision slot */}
          <div className="relative p-3 rounded-xl bg-[#060810] border border-white/[0.05]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-neutral-500 flex items-center gap-1.5">
                <Bot className="w-3.5 h-3.5 text-emerald-400" />
                Policy Decision
              </span>
              <span className={`text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 rounded ${
                deterministic
                  ? 'text-emerald-400 bg-emerald-500/10'
                  : 'text-sky-400 bg-sky-500/10'
              }`}>
                {deterministic ? 'Exploitation' : 'Sampling'}
              </span>
            </div>

            {aiRecommendation ? (
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <ChevronRight className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  <span className="text-xs font-bold text-white tracking-wide">
                    {aiRecommendation.action_details.label}
                  </span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 font-bold flex-shrink-0">
                  Act #{aiRecommendation.action}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-[11px] text-neutral-600 italic">
                <span className="w-1.5 h-1.5 rounded-full bg-neutral-700 animate-pulse" />
                Awaiting next recommendation query...
              </div>
            )}
          </div>
        </div>

        {/* ── Description + CTA buttons ── */}
        <div className="flex flex-col gap-5 flex-1 justify-end">
          <div>
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-2 leading-tight">
              Let it run, and watch it work.
            </h3>
            <p className="text-[12px] sm:text-sm text-neutral-500 leading-relaxed">
              The PPO agent evaluates a 27-dimensional state tensor, selecting optimal planting,
              harvesting, and market liquidation actions to maximize net wealth.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Ask AI */}
            <button
              onClick={() => onAskAI(deterministic)}
              disabled={!isPPOReady || isPredicting || isStepping}
              className="px-4 py-2.5 rounded-xl bg-neutral-900/80 hover:bg-neutral-800 border border-white/[0.08] hover:border-emerald-500/40 text-xs font-semibold text-white flex items-center gap-2 transition-all duration-200 cursor-pointer disabled:opacity-40"
            >
              <Sparkles className={`w-4 h-4 text-emerald-400 ${isPredicting ? 'animate-spin' : ''}`} />
              {isPredicting ? 'Inferring...' : 'Ask AI'}
            </button>

            {/* Step with PPO — primary CTA */}
            <button
              onClick={() => onExecuteAI(deterministic)}
              disabled={!isPPOReady || isStepping || isPredicting}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-neutral-950 font-bold text-xs flex items-center gap-2 glow-emerald-sm hover:glow-emerald transition-all duration-200 cursor-pointer disabled:opacity-40 btn-hero"
            >
              <Play className={`w-4 h-4 fill-current ${isStepping ? 'animate-pulse' : ''}`} />
              {isStepping ? 'Executing...' : 'Step with PPO'}
            </button>

            {/* Det / Stoch toggle */}
            <div className="ml-auto flex items-center bg-neutral-900/90 border border-white/[0.06] rounded-full p-1 gap-0.5 text-[10px]">
              {[
                { label: 'Det', value: true, title: 'Deterministic (greedy)' },
                { label: 'Stoch', value: false, title: 'Stochastic (sampled)' },
              ].map((opt) => (
                <button
                  key={opt.label}
                  onClick={() => setDeterministic(opt.value)}
                  title={opt.title}
                  className={`px-2.5 py-1 rounded-full font-semibold transition-all duration-200 ${
                    deterministic === opt.value
                      ? 'bg-emerald-500 text-neutral-950 font-bold shadow-sm'
                      : 'text-neutral-500 hover:text-neutral-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {!isPPOReady && (
            <div className="flex items-center gap-2 text-[11px] text-amber-500/80 bg-amber-950/20 border border-amber-800/20 rounded-xl px-3 py-2">
              <Brain className="w-3.5 h-3.5 flex-shrink-0" />
              PPO model not loaded. Start the backend with a trained checkpoint.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
