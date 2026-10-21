import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, Info, Sprout, ArrowRight, ShieldCheck, ShieldAlert } from 'lucide-react';
import { farmApi } from '../services/api';
import type { FeasibilityCheckResult } from '../types/farm';

interface FeasibilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  fieldId: number;
  cropName: string;
  onExecute?: () => void;
}

export const FeasibilityModal: React.FC<FeasibilityModalProps> = ({
  isOpen,
  onClose,
  sessionId,
  fieldId,
  cropName,
  onExecute,
}) => {
  const [mode, setMode] = useState<'uncertainty_aware' | 'deterministic'>('uncertainty_aware');
  const [threshold, setThreshold] = useState<number>(0.3);
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<FeasibilityCheckResult | null>(null);

  useEffect(() => {
    if (!isOpen || !sessionId) return;
    let cancelled = false;

    async function evaluate() {
      setLoading(true);
      try {
        const res = await farmApi.checkFeasibility(sessionId, {
          crop_name: cropName,
          field_id: fieldId,
          mode,
          threshold,
        });
        if (!cancelled) {
          setResult(res);
        }
      } catch (err) {
        console.error('Feasibility evaluation failed:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    evaluate();
    return () => {
      cancelled = true;
    };
  }, [isOpen, sessionId, fieldId, cropName, mode, threshold]);

  if (!isOpen) return null;

  const probPct = result ? Math.round(result.completion_probability * 100) : 0;
  const isFeasible = result?.feasible ?? false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-xl bg-[#0a2318] border border-[#16422e] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-[#071d14] border-b border-[#16422e] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center justify-center">
              <Sprout className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Action & Feasibility Details
              </h3>
              <p className="text-xs text-emerald-400/80">
                Plant {cropName} on Field {fieldId + 1}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[#0d2c1f] text-emerald-400 hover:text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[80vh]">
          {/* Mode Switcher */}
          <div>
            <label className="text-xs font-semibold text-emerald-300 uppercase tracking-wider block mb-2">
              Feasibility Filter Mode
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-[#061811] rounded-xl border border-[#16422e]">
              <button
                type="button"
                onClick={() => setMode('uncertainty_aware')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition ${
                  mode === 'uncertainty_aware'
                    ? 'bg-emerald-500 text-[#041a12] shadow-sm'
                    : 'text-emerald-300/80 hover:text-white'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Uncertainty-Aware</span>
              </button>
              <button
                type="button"
                onClick={() => setMode('deterministic')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition ${
                  mode === 'deterministic'
                    ? 'bg-emerald-500 text-[#041a12] shadow-sm'
                    : 'text-emerald-300/80 hover:text-white'
                }`}
              >
                <span>Deterministic</span>
              </button>
            </div>
          </div>

          {/* Threshold Slider (only for uncertainty-aware) */}
          {mode === 'uncertainty_aware' && (
            <div className="p-4 rounded-xl bg-[#0d2c1f] border border-[#16422e]">
              <div className="flex items-center justify-between text-xs font-medium text-emerald-200 mb-2">
                <span>Risk Acceptance Threshold (&tau;)</span>
                <span className="font-mono font-bold text-white bg-emerald-950/60 px-2 py-0.5 rounded border border-[#16422e]">
                  {threshold.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.95"
                step="0.05"
                value={threshold}
                onChange={(e) => setThreshold(parseFloat(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-emerald-400/60 mt-1">
                <span>0.05 (High Risk / Aggressive)</span>
                <span>0.50 (Balanced)</span>
                <span>0.95 (Ultra-Conservative)</span>
              </div>
            </div>
          )}

          {/* Probability Gauge & Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Completion Gauge */}
            <div className="p-4 rounded-xl bg-[#0d2c1f] border border-[#16422e] flex flex-col items-center justify-center text-center">
              <span className="text-[11px] text-emerald-300 font-medium">Completion Prob.</span>
              <div className="my-2 relative w-16 h-16 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-[#061811]"
                    strokeWidth="3.8"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className={isFeasible ? 'text-emerald-400' : 'text-rose-400'}
                    strokeDasharray={`${probPct}, 100`}
                    strokeWidth="3.8"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <span className="absolute font-mono font-bold text-sm text-white">
                  {probPct}%
                </span>
              </div>
              <span className="text-[10px] text-emerald-400/70 font-mono">
                P(complete) = {(result?.completion_probability ?? 0).toFixed(2)}
              </span>
            </div>

            {/* Maturation Survival */}
            <div className="p-4 rounded-xl bg-[#0d2c1f] border border-[#16422e] flex flex-col justify-center">
              <span className="text-[11px] text-emerald-300 font-medium">Weather Maturation</span>
              <span className="text-xl font-bold font-mono text-white mt-1">
                {result ? `${Math.round(result.p_maturation * 100)}%` : '—'}
              </span>
              <span className="text-[10px] text-emerald-400/60 mt-1">
                Slack: {result?.slack_days ?? 0} days
              </span>
            </div>

            {/* Pest Survival */}
            <div className="p-4 rounded-xl bg-[#0d2c1f] border border-[#16422e] flex flex-col justify-center">
              <span className="text-[11px] text-emerald-300 font-medium">Pest Survival</span>
              <span className="text-xl font-bold font-mono text-white mt-1">
                {result ? `${Math.round(result.p_pest_survival * 100)}%` : '—'}
              </span>
              <span className="text-[10px] text-emerald-400/60 mt-1">
                Forecast: {result?.available_growth_days ?? 0}d window
              </span>
            </div>
          </div>

          {/* Validation Status Banner */}
          <div
            className={`p-4 rounded-xl border flex items-start gap-3.5 ${
              isFeasible
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
            }`}
          >
            {isFeasible ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            )}
            <div>
              <div className="text-sm font-bold">
                {isFeasible ? 'Action Validated' : 'Action Rejected by Feasibility Filter'}
              </div>
              <p className="text-xs mt-1 text-emerald-100/80 leading-relaxed">
                {result?.reason ||
                  (isFeasible
                    ? `The completion probability (${probPct}%) satisfies the threshold requirement.`
                    : `The completion probability (${probPct}%) is below the configured threshold (${threshold}).`)}
              </p>
            </div>
          </div>

          {/* Advice / Next Steps */}
          <div className="p-3.5 rounded-xl bg-[#061811] border border-[#16422e] flex items-start gap-2.5 text-xs text-emerald-300/80">
            <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              {isFeasible
                ? 'Planting approved: The environmental forecast indicates healthy maturation before the season closes.'
                : 'Consider selecting an empty field or a crop with shorter growth duration to avoid stranded inventory.'}
            </span>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-[#071d14] border-t border-[#16422e] flex items-center justify-between">
          <button onClick={onClose} className="ag-button-secondary text-xs">
            Close
          </button>
          {onExecute && (
            <button
              onClick={() => {
                onExecute();
                onClose();
              }}
              disabled={!isFeasible || loading}
              className="ag-button-primary text-xs"
            >
              <span>Execute Action</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
export default FeasibilityModal;
