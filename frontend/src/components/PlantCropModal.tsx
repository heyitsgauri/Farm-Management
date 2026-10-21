import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  Info,
  Sprout,
  ArrowRight,
  ShieldAlert,
  AlertCircle,
} from 'lucide-react';

import { useFarmContext } from '../context/FarmContext';
import { farmApi } from '../services/api';
import { CROP_LIST, type CropName, type CropInfo } from '../game/crops';
import type { FeasibilityCheckResult } from '../types/farm';

interface PlantCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  fieldId: number;
}

export const PlantCropModal: React.FC<PlantCropModalProps> = ({
  isOpen,
  onClose,
  fieldId,
}) => {
  const farm = useFarmContext();
  const currentCash = farm.farmState?.cash ?? 0;
  const currentDay = farm.farmState?.day ?? 1;

  // Selection & filter state
  const [selectedCrop, setSelectedCrop] = useState<CropName | null>(null);
  const [filterMode, setFilterMode] = useState<'uncertainty_aware' | 'deterministic'>('uncertainty_aware');
  const [threshold, setThreshold] = useState<number>(0.3);

  // Feasibility & submission state
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [feasibility, setFeasibility] = useState<FeasibilityCheckResult | null>(null);
  const [evalError, setEvalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Reset selected crop when modal opens with a new field
  useEffect(() => {
    if (isOpen) {
      setSelectedCrop(null);
      setFeasibility(null);
      setEvalError(null);
      setSubmitError(null);
      setIsSubmitting(false);
    }
  }, [isOpen, fieldId]);

  // Evaluate feasibility only when a crop is explicitly selected
  useEffect(() => {
    if (!isOpen || !farm.sessionId || !selectedCrop) {
      setFeasibility(null);
      return;
    }

    let isCancelled = false;
    async function evaluate() {
      setIsEvaluating(true);
      setEvalError(null);
      try {
        const res = await farmApi.checkFeasibility(farm.sessionId!, {
          crop_name: selectedCrop!,
          field_id: fieldId,
          mode: filterMode,
          threshold,
        });
        if (!isCancelled) {
          setFeasibility(res);
        }
      } catch (err: any) {
        if (!isCancelled) {
          console.error('Feasibility evaluation error:', err);
          setEvalError(err?.message || 'Could not evaluate feasibility with backend.');
        }
      } finally {
        if (!isCancelled) {
          setIsEvaluating(false);
        }
      }
    }

    evaluate();
    return () => {
      isCancelled = true;
    };
  }, [isOpen, farm.sessionId, fieldId, selectedCrop, filterMode, threshold]);

  if (!isOpen) return null;

  // Selected crop info
  const selectedCropInfo: CropInfo | undefined = selectedCrop
    ? CROP_LIST.find((c) => c.name === selectedCrop)
    : undefined;

  // Check discrete action from farm.actions
  const discreteAction = selectedCrop
    ? farm.actions.find(
        (a) => a.type === 'PLANT' && a.field_id === fieldId && a.crop_name === selectedCrop
      )
    : null;

  const hasEnoughCash = selectedCropInfo ? currentCash >= selectedCropInfo.plantingCost : false;
  const isEngineValid = discreteAction ? discreteAction.valid : false;
  const isFilterFeasible = feasibility ? feasibility.feasible : false;

  // Action is executable ONLY when crop is selected, engine validates it, and feasibility approves
  const canExecute = Boolean(
    selectedCrop &&
      hasEnoughCash &&
      isEngineValid &&
      isFilterFeasible &&
      !isSubmitting &&
      !isEvaluating
  );

  const probPct = feasibility ? Math.round(feasibility.completion_probability * 100) : 0;

  const handleExecute = async () => {
    if (!canExecute || !discreteAction) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await farm.executeHumanAction(discreteAction.id);
      onClose();
    } catch (err: any) {
      setSubmitError(err?.message || 'Failed to plant crop. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div
        className="relative w-full max-w-xl bg-[#0a2318] border border-[#16422e] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-[#071d14] border-b border-[#16422e] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center justify-center">
              <Sprout className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Plant Crop &bull; Field {fieldId + 1}
              </h3>
              <p className="text-xs text-emerald-400/80">
                Select a crop to evaluate feasibility and allocate resources for Day {currentDay}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[#0d2c1f] text-emerald-400 hover:text-white flex items-center justify-center transition border border-[#16422e]"
            title="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Step 1: Crop Selection Cards */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <label className="text-xs font-bold text-emerald-300 uppercase tracking-wider block">
                1. Select Crop to Plant
              </label>
              <span className="text-xs text-emerald-400/80 font-mono">
                Cash Available: <strong className="text-white">₹{Math.round(currentCash).toLocaleString()}</strong>
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {CROP_LIST.map((crop) => {
                const isSelected = selectedCrop === crop.name;
                const canAfford = currentCash >= crop.plantingCost;
                return (
                  <button
                    key={crop.name}
                    type="button"
                    onClick={() => {
                      setSelectedCrop(crop.name);
                      setSubmitError(null);
                    }}
                    className={`p-3 rounded-xl border text-left transition relative flex flex-col justify-between ${
                      isSelected
                        ? 'bg-emerald-500/20 border-emerald-400 ring-2 ring-emerald-400 shadow-md shadow-emerald-950/60'
                        : canAfford
                        ? 'bg-[#061811] border-[#16422e] hover:bg-[#0d2c1f] hover:border-emerald-500/40'
                        : 'bg-[#061811]/60 border-[#16422e] opacity-60 hover:opacity-80'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-white">{crop.name}</span>
                        {isSelected && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        )}
                      </div>
                      <p className="text-[10px] text-emerald-400/70 mt-0.5 line-clamp-1">
                        {crop.tagline}
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-[#16422e] space-y-1 text-[11px] font-mono">
                      <div className="flex items-center justify-between">
                        <span className="text-emerald-400/70">Cost:</span>
                        <span className={`font-bold ${canAfford ? 'text-amber-300' : 'text-rose-400'}`}>
                          ₹{crop.plantingCost}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-emerald-400/70">Growth:</span>
                        <span className="text-emerald-200">{crop.growthDays} days</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-emerald-400/70">Base Price:</span>
                        <span className="text-emerald-200">₹{crop.basePrice}/kg</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Prompt if no crop selected yet */}
          {!selectedCrop && (
            <div className="p-4 rounded-xl bg-[#061811] border border-[#16422e] flex items-center gap-3 text-xs text-emerald-300/80">
              <Info className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                Please select a crop above to calculate growth deadlines and evaluate feasibility.
              </span>
            </div>
          )}

          {/* Step 2: Feasibility & Risk Controls (Active only when crop is selected) */}
          {selectedCrop && selectedCropInfo && (
            <div className="space-y-4 pt-2 border-t border-[#16422e]">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-emerald-300 uppercase tracking-wider block">
                  2. Feasibility Filter Evaluation ({selectedCrop})
                </label>
                {isEvaluating && (
                  <span className="text-[11px] text-emerald-400 animate-pulse font-mono">
                    Evaluating risks...
                  </span>
                )}
              </div>

              {/* Mode Toggle & Threshold Slider */}
              <div className="p-4 rounded-xl bg-[#061811] border border-[#16422e] space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-xs text-emerald-300 font-medium">Filter Algorithm:</span>
                  <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#0a2318] rounded-lg border border-[#16422e]">
                    <button
                      type="button"
                      onClick={() => setFilterMode('uncertainty_aware')}
                      className={`py-1 px-2.5 rounded text-xs font-semibold transition ${
                        filterMode === 'uncertainty_aware'
                          ? 'bg-emerald-500 text-[#041a12] shadow-sm'
                          : 'text-emerald-300/80 hover:text-white'
                      }`}
                    >
                      Uncertainty-Aware
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterMode('deterministic')}
                      className={`py-1 px-2.5 rounded text-xs font-semibold transition ${
                        filterMode === 'deterministic'
                          ? 'bg-emerald-500 text-[#041a12] shadow-sm'
                          : 'text-emerald-300/80 hover:text-white'
                      }`}
                    >
                      Deterministic
                    </button>
                  </div>
                </div>

                {filterMode === 'uncertainty_aware' && (
                  <div>
                    <div className="flex items-center justify-between text-xs font-medium text-emerald-200 mb-1.5">
                      <span>Risk Threshold (&tau;): {threshold.toFixed(2)}</span>
                      <span className="text-[10px] text-emerald-400/60 font-mono">
                        Requires P(complete) &ge; {Math.round(threshold * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.10"
                      max="0.80"
                      step="0.05"
                      value={threshold}
                      onChange={(e) => setThreshold(parseFloat(e.target.value))}
                      className="w-full accent-emerald-500 cursor-pointer"
                    />
                  </div>
                )}
              </div>

              {/* Feasibility Metric Display */}
              {feasibility && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Gauge */}
                  <div className="p-3.5 rounded-xl bg-[#061811] border border-[#16422e] flex flex-col items-center justify-center text-center">
                    <span className="text-[11px] text-emerald-300 font-medium">Completion Prob</span>
                    <div className="my-1.5 relative w-14 h-14 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                        <path
                          className="text-[#0a2318]"
                          strokeWidth="3.8"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        <path
                          className={feasibility.feasible ? 'text-emerald-400' : 'text-rose-400'}
                          strokeDasharray={`${probPct}, 100`}
                          strokeWidth="3.8"
                          strokeLinecap="round"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                      </svg>
                      <span className="absolute font-mono font-bold text-xs text-white">
                        {probPct}%
                      </span>
                    </div>
                    <span className="text-[10px] text-emerald-400/70 font-mono">
                      P = {feasibility.completion_probability.toFixed(2)}
                    </span>
                  </div>

                  {/* Weather Maturation */}
                  <div className="p-3.5 rounded-xl bg-[#061811] border border-[#16422e] flex flex-col justify-center">
                    <span className="text-[11px] text-emerald-300 font-medium">Weather Maturation</span>
                    <span className="text-lg font-bold font-mono text-white mt-1">
                      {Math.round(feasibility.p_maturation * 100)}%
                    </span>
                    <span className="text-[10px] text-emerald-400/60 mt-1">
                      Slack: {feasibility.slack_days} days
                    </span>
                  </div>

                  {/* Pest Survival */}
                  <div className="p-3.5 rounded-xl bg-[#061811] border border-[#16422e] flex flex-col justify-center">
                    <span className="text-[11px] text-emerald-300 font-medium">Pest Survival</span>
                    <span className="text-lg font-bold font-mono text-white mt-1">
                      {Math.round(feasibility.p_pest_survival * 100)}%
                    </span>
                    <span className="text-[10px] text-emerald-400/60 mt-1">
                      Window: {feasibility.available_growth_days}d
                    </span>
                  </div>
                </div>
              )}

              {/* Status / Feasibility Banner */}
              {feasibility && (
                <div
                  className={`p-4 rounded-xl border flex items-start gap-3 ${
                    feasibility.feasible && hasEnoughCash
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                      : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                  }`}
                >
                  {feasibility.feasible && hasEnoughCash ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 text-xs">
                    <div className="font-bold text-sm">
                      {!hasEnoughCash
                        ? 'Insufficient Cash Balance'
                        : feasibility.feasible
                        ? 'Planting Approved by Feasibility Filter'
                        : 'Planting Rejected by Feasibility Filter'}
                    </div>
                    <p className="mt-1 leading-relaxed opacity-90">
                      {!hasEnoughCash
                        ? `Cost of ₹${selectedCropInfo.plantingCost.toLocaleString()} exceeds current cash balance (₹${Math.round(currentCash).toLocaleString()}). Choose a less expensive crop or wait to sell inventory.`
                        : feasibility.reason}
                    </p>
                  </div>
                </div>
              )}

              {/* Evaluation Error Banner */}
              {evalError && (
                <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/50 text-xs text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{evalError}</span>
                </div>
              )}

              {/* Submission Error Banner */}
              {submitError && (
                <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/50 text-xs text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-[#071d14] border-t border-[#16422e] flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="ag-button-secondary text-xs"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleExecute}
            disabled={!canExecute}
            className="ag-button-primary text-xs"
          >
            <span>{isSubmitting ? 'Planting...' : 'Execute Action'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
export default PlantCropModal;
