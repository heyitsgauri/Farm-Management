import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  ShieldAlert,
  ShieldCheck,
  ArrowRight,
  Sun,
  Bug,
  LineChart,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { useFarmContext } from '../context/FarmContext';
import { farmApi } from '../services/api';
import type { FeasibilityCheckResult } from '../types/farm';

const CROPS = [
  { name: 'Wheat', growthDays: 5, cost: 1000, basePrice: 40, yield: 100, icon: '🌾' },
  { name: 'Rice', growthDays: 8, cost: 1500, basePrice: 35, yield: 150, icon: '🍚' },
  { name: 'Corn', growthDays: 6, cost: 1200, basePrice: 30, yield: 120, icon: '🌽' },
];


export const PlaySimulation: React.FC = () => {
  const farm = useFarmContext();
  const state = farm.farmState;
  const actions = farm.actions;
  const currentDay = state?.day ?? 1;

  const [selectedFieldId, setSelectedFieldId] = useState<number>(0);
  const [selectedActionType, setSelectedActionType] = useState<'PLANT' | 'HARVEST' | 'SELL' | 'HOLD'>('PLANT');
  const [selectedCropName, setSelectedCropName] = useState<string>('Wheat');
  const [filterMode, setFilterMode] = useState<'uncertainty_aware' | 'deterministic'>('uncertainty_aware');
  const [threshold, setThreshold] = useState<number>(0.3);
  const [feasibility, setFeasibility] = useState<FeasibilityCheckResult | null>(null);
  const [lastActionMessage, setLastActionMessage] = useState<string>(
    'Simulation active. Select an action and field, then click Advance Day.'
  );

  const selectedCrop = CROPS.find((c) => c.name === selectedCropName) || CROPS[0];
  const selectedField = state?.fields.find((f) => f.id === selectedFieldId) || state?.fields[0];
  const droughtRisk = state?.risk_forecasts?.drought ?? 'LOW';
  const pestRisk = state?.risk_forecasts?.pest ?? 'LOW';
  const priceRisk = state?.risk_forecasts?.price_shock ?? 'LOW';

  // Evaluate feasibility whenever field, crop, mode, or threshold changes
  useEffect(() => {
    if (!farm.sessionId) return;
    let isCancelled = false;

    async function evaluate() {
      try {
        const res = await farmApi.checkFeasibility(farm.sessionId!, {
          crop_name: selectedCropName,
          field_id: selectedFieldId,
          mode: filterMode,
          threshold,
        });
        if (!isCancelled) {
          setFeasibility(res);
        }
      } catch (err) {
        console.error('Failed to check planting feasibility:', err);
      }
    }

    if (selectedActionType === 'PLANT') {
      evaluate();
    }
    return () => {
      isCancelled = true;
    };
  }, [farm.sessionId, selectedFieldId, selectedCropName, filterMode, threshold, selectedActionType, currentDay]);

  // Find corresponding environment discrete action
  const findActionId = (): number | null => {
    if (selectedActionType === 'HOLD') {
      const a = actions.find((x) => x.type === 'HOLD');
      return a ? a.id : null;
    }
    if (selectedActionType === 'HARVEST') {
      const a = actions.find((x) => x.type === 'HARVEST' && x.field_id === selectedFieldId);
      return a ? a.id : null;
    }
    if (selectedActionType === 'SELL') {
      const a = actions.find((x) => x.type === 'SELL' && x.crop_name === selectedCropName);
      return a ? a.id : null;
    }
    if (selectedActionType === 'PLANT') {
      const a = actions.find(
        (x) => x.type === 'PLANT' && x.field_id === selectedFieldId && x.crop_name === selectedCropName
      );
      return a ? a.id : null;
    }
    return null;
  };

  const actionId = findActionId();
  const currentActionItem = actions.find((a) => a.id === actionId);
  const isActionValid = currentActionItem?.valid ?? false;
  const canExecuteAction =
    actionId !== null &&
    currentActionItem?.valid &&
    (selectedActionType !== 'PLANT' ||
      (feasibility?.feasible && (state?.cash ?? 0) >= selectedCrop.cost));

  const handleExecute = async () => {
    if (actionId === null) {
      setLastActionMessage('No valid action exists for the current selection.');
      return;
    }
    if (!currentActionItem?.valid) {
      setLastActionMessage(`Selected action is invalid under the current farm state.`);
      return;
    }
    if (selectedActionType === 'PLANT' && (!feasibility || !feasibility.feasible)) {
      setLastActionMessage(`Planting is rejected by the feasibility filter for ${selectedCropName}.`);
      return;
    }
    try {
      await farm.executeHumanAction(actionId);
      if (selectedActionType === 'PLANT') {
        setLastActionMessage(
          `Action Confirmed: ${selectedCropName} planted in Field ${selectedFieldId + 1}. Cost: ₹${selectedCrop.cost}. Estimated maturity: Day ${currentDay + selectedCrop.growthDays}.`
        );
      } else if (selectedActionType === 'HARVEST') {
        setLastActionMessage(`Action Confirmed: Field ${selectedFieldId + 1} harvested into barn inventory.`);
      } else if (selectedActionType === 'SELL') {
        setLastActionMessage(`Action Confirmed: Sold ${selectedCropName} at market spot rate.`);
      } else {
        setLastActionMessage(`Action Confirmed: Held position for Day ${currentDay}.`);
      }
    } catch (err: any) {
      setLastActionMessage(`Action error: ${err.message || 'Could not execute action.'}`);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Play the Simulation</h1>
          <p className="text-sm text-emerald-300/80">
            Choose an action, manage your fields and see how your farm evolves.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0b291c] border border-[#16422e] text-xs font-semibold text-emerald-200">
            <Calendar className="w-4 h-4 text-emerald-400" />
            <span>Day {currentDay} / 30 &bull; Spring</span>
          </div>

          <button
            onClick={handleExecute}
            disabled={farm.isLoading || currentDay >= 30 || !canExecuteAction || farm.isBusy}
            className="ag-button-primary text-xs py-2 px-4 shadow-lg shadow-emerald-900/40 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>Advance Day</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 3-Column Interactive Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Column 1: Field & Action Select */}
        <div className="space-y-4">
          {/* Select Field */}
          <div className="ag-card p-5">
            <label className="text-xs font-bold text-emerald-300 uppercase tracking-wider block mb-2.5">
              Select Field
            </label>
            <div className="grid grid-cols-5 gap-1.5">
              {[0, 1, 2, 3, 4].map((id) => {
                const f = state?.fields.find((x) => x.id === id);
                const isFieldPlanted = f && f.state !== 'EMPTY';
                const isFieldMature = f && f.state === 'MATURE';
                return (
                  <button
                    key={id}
                    onClick={() => setSelectedFieldId(id)}
                    className={`py-2 px-1 rounded-xl text-xs font-bold transition flex flex-col items-center justify-center border ${
                      selectedFieldId === id
                        ? 'bg-emerald-500 text-[#041a12] border-emerald-400 shadow-md shadow-emerald-500/20'
                        : isFieldMature
                        ? 'bg-amber-500/10 border-amber-500/40 text-amber-300 hover:bg-amber-500/20'
                        : isFieldPlanted
                        ? 'bg-[#0d2c1f] border-emerald-600/40 text-emerald-300 hover:bg-[#123928]'
                        : 'bg-[#061811] border-[#16422e] text-emerald-400/50 hover:bg-[#0d2c1f]'
                    }`}
                  >
                    <span>F{id + 1}</span>
                    <span className="text-[10px] font-normal truncate max-w-[40px]">
                      {f?.crop || 'Empty'}
                    </span>
                  </button>
                );
              })}
            </div>
            {selectedField && (
              <div className="mt-3 pt-3 border-t border-[#16422e] text-xs text-emerald-300/80 flex items-center justify-between">
                <span>Field {selectedField.id + 1} Status:</span>
                <span className="font-semibold text-white capitalize">
                  {selectedField.state === 'EMPTY'
                    ? 'Empty (Ready)'
                    : `${selectedField.crop} (${selectedField.state})`}
                </span>
              </div>
            )}
          </div>

          {/* Available Actions */}
          <div className="ag-card p-5">
            <label className="text-xs font-bold text-emerald-300 uppercase tracking-wider block mb-3">
              Available Actions
            </label>
            <div className="space-y-2">
              {[
                { type: 'PLANT', label: 'Plant Crop', desc: 'Sow seed on selected field' },
                { type: 'HARVEST', label: 'Harvest Field', desc: 'Reap mature crops into inventory' },
                { type: 'SELL', label: 'Sell Inventory', desc: 'Trade harvested crops at market spot price' },
                { type: 'HOLD', label: 'Hold / Wait', desc: 'Conserve funds and advance one day' },
              ].map((act) => {
                const isSelected = selectedActionType === act.type;
                return (
                  <button
                    key={act.type}
                    onClick={() => setSelectedActionType(act.type as any)}
                    className={`w-full p-3 rounded-xl border text-left transition flex items-center justify-between ${
                      isSelected
                        ? 'bg-emerald-500/15 border-emerald-400 text-emerald-200 shadow-md shadow-emerald-950/60'
                        : 'bg-[#061811] border-[#16422e] text-emerald-100/70 hover:bg-[#0d2c1f] hover:text-white'
                    }`}
                  >
                    <div>
                      <div className="text-sm font-bold flex items-center gap-2">
                        <span>{act.label}</span>
                        {isSelected && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
                      </div>
                      <div className="text-[11px] text-emerald-400/60">{act.desc}</div>
                    </div>
                    {isSelected && (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Column 2: Crop Details or Action Options */}
        <div className="space-y-4">
          {selectedActionType === 'PLANT' ? (
            <>
              {/* Select Crop */}
              <div className="ag-card p-5">
                <label className="text-xs font-bold text-emerald-300 uppercase tracking-wider block mb-2.5">
                  Select Crop
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {CROPS.map((crop) => (
                    <button
                      key={crop.name}
                      onClick={() => setSelectedCropName(crop.name)}
                      className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center gap-1 ${
                        selectedCropName === crop.name
                          ? 'bg-emerald-500/20 border-emerald-400 text-white shadow-md shadow-emerald-500/10'
                          : 'bg-[#061811] border-[#16422e] text-emerald-300/70 hover:bg-[#0d2c1f]'
                      }`}
                    >
                      <span className="text-2xl">{crop.icon}</span>
                      <span className="text-xs font-bold">{crop.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Crop Details */}
              <div className="ag-card p-5">
                <h3 className="text-sm font-bold text-white mb-3 flex items-center justify-between">
                  <span>{selectedCrop.name} Details</span>
                  <span className="text-xs font-mono text-emerald-300">{selectedCrop.icon}</span>
                </h3>
                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-[#16422e]">
                    <span className="text-emerald-400/80">Growth Days</span>
                    <span className="font-mono font-bold text-white">{selectedCrop.growthDays}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-[#16422e]">
                    <span className="text-emerald-400/80">Maturity Day</span>
                    <span className="font-mono font-bold text-white">
                      Day {currentDay + selectedCrop.growthDays}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-[#16422e]">
                    <span className="text-emerald-400/80">Base Market Price</span>
                    <span className="font-mono font-bold text-white">₹{selectedCrop.basePrice}/kg</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-[#16422e]">
                    <span className="text-emerald-400/80">Planting Cost</span>
                    <span className="font-mono font-bold text-white">₹{selectedCrop.cost}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-emerald-400/80">Expected Yield</span>
                    <span className="font-mono font-bold text-white">{selectedCrop.yield} kg</span>
                  </div>
                </div>
              </div>
            </>
          ) : selectedActionType === 'HARVEST' ? (
            <div className="ag-card p-5 space-y-4">
              <h3 className="text-base font-bold text-white">Harvest Field {selectedFieldId + 1}</h3>
              <p className="text-xs text-emerald-300/80 leading-relaxed">
                Reaping mature crops converts field growth into storable barn inventory before spoilage
                or adverse pest outbreaks occur.
              </p>
              <div className="p-4 rounded-xl bg-[#061811] border border-[#16422e] text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-emerald-400/70">Field Status:</span>
                  <span className="font-bold text-white">{selectedField?.state ?? 'EMPTY'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-emerald-400/70">Current Crop:</span>
                  <span className="font-bold text-white">{selectedField?.crop || 'None'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-emerald-400/70">Growth Progress:</span>
                  <span className="font-bold font-mono text-emerald-300">{selectedField?.progress ?? 0} days</span>
                </div>
              </div>
            </div>
          ) : selectedActionType === 'SELL' ? (
            <div className="ag-card p-5 space-y-4">
              <h3 className="text-base font-bold text-white">Market Sell Order</h3>
              <p className="text-xs text-emerald-300/80 leading-relaxed">
                Liquidate harvested crop inventories into cash at current spot market rates.
              </p>
              <div className="p-4 rounded-xl bg-[#061811] border border-[#16422e] space-y-2 text-xs">
                {Object.entries(state?.inventory ?? {}).map(([crop, qty]) => {
                  const price = state?.market_prices[crop] ?? 0;
                  return (
                    <div key={crop} className="flex items-center justify-between py-1 border-b border-[#16422e]/60 last:border-none">
                      <span className="font-medium text-emerald-200">{crop}</span>
                      <span className="font-mono text-white">
                        {qty} kg &bull; ₹{price * qty} (₹{price}/kg)
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="ag-card p-5 space-y-3">
              <h3 className="text-base font-bold text-white">Hold / Conserve Capital</h3>
              <p className="text-xs text-emerald-300/80 leading-relaxed">
                When environmental risks (drought, pests) are excessive or season deadlines are near, holding
                avoids stranded seed investment and preserves liquidity.
              </p>
              <div className="p-3.5 rounded-xl bg-[#061811] border border-[#16422e] text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Always a valid fallback action under any condition.</span>
              </div>
            </div>
          )}
        </div>

        {/* Column 3: Uncertainty-Aware Feasibility Filter */}
        <div className="ag-card p-5 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Uncertainty-Aware Filter</span>
            </h3>
            <span className="ag-pill ag-pill-emerald text-[10px]">Active</span>
          </div>

          {/* Mode Pill Toggle */}
          <div>
            <label className="text-[11px] font-semibold text-emerald-300 uppercase tracking-wider block mb-2">
              Filter Mode
            </label>
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#061811] rounded-xl border border-[#16422e]">
              <button
                type="button"
                onClick={() => setFilterMode('deterministic')}
                className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition ${
                  filterMode === 'deterministic'
                    ? 'bg-emerald-500 text-[#041a12] shadow-sm'
                    : 'text-emerald-300/80 hover:text-white'
                }`}
              >
                Deterministic
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('uncertainty_aware')}
                className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition ${
                  filterMode === 'uncertainty_aware'
                    ? 'bg-emerald-500 text-[#041a12] shadow-sm'
                    : 'text-emerald-300/80 hover:text-white'
                }`}
              >
                Uncertainty-Aware
              </button>
            </div>
          </div>

          {/* Threshold Slider (tau) */}
          {filterMode === 'uncertainty_aware' && (
            <div>
              <div className="flex items-center justify-between text-xs font-medium text-emerald-200 mb-2">
                <span>Threshold (&tau;)</span>
                <span className="font-mono font-bold text-white bg-[#061811] px-2 py-0.5 rounded border border-[#16422e]">
                  {threshold.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min="0.10"
                max="0.90"
                step="0.05"
                value={threshold}
                onChange={(e) => setThreshold(parseFloat(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>
          )}

          {/* Estimated Completion Probability */}
          {selectedActionType === 'PLANT' && (
            <div className="p-4 rounded-xl bg-[#061811] border border-[#16422e] space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-emerald-300 font-medium">Estimated Completion Probability</span>
                <span className="font-mono font-bold text-white">
                  {feasibility ? `${Math.round(feasibility.completion_probability * 100)}%` : '—'}
                </span>
              </div>
              <div className="w-full bg-[#0a2318] h-2 rounded-full overflow-hidden border border-[#16422e]">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    (feasibility?.completion_probability ?? 0) >= threshold
                      ? 'bg-emerald-400'
                      : 'bg-rose-400'
                  }`}
                  style={{
                    width: `${Math.round((feasibility?.completion_probability ?? 0) * 100)}%`,
                  }}
                />
              </div>

              {/* Status Badge */}
              <div className="pt-2">
                {feasibility?.feasible ? (
                  <div className="flex items-start gap-2 text-xs text-emerald-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold">Passes filter</div>
                      <div className="text-[11px] text-emerald-400/80">
                        Action is feasible with current conditions.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2 text-xs text-rose-300">
                    <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold">Filter rejection</div>
                      <div className="text-[11px] text-rose-300/80">
                        {feasibility?.reason || 'Probability below safety threshold.'}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Current Action Validity */}
          <div className="p-3 rounded-xl bg-[#0a2318] border border-[#16422e] flex items-center justify-between text-xs">
            <span className="text-emerald-400/80">Simulation Engine Check:</span>
            <span
              className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                isActionValid
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              }`}
            >
              {isActionValid ? 'VALID' : 'INVALID'}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Notification Bar */}
      <div className="ag-card p-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-emerald-500/30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <p className="text-xs text-emerald-200/90 leading-relaxed font-mono">
            {lastActionMessage}
          </p>
        </div>

        <button
          onClick={handleExecute}
          disabled={farm.isLoading || currentDay >= 30 || !canExecuteAction || farm.isBusy}
          className="ag-button-primary text-xs py-2 px-5 whitespace-nowrap shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span>Advance Day</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Bottom Status Ticker */}
      <div className="p-3 rounded-xl bg-[#071f16] border border-[#123827] flex flex-wrap items-center justify-between gap-3 text-xs text-emerald-400/70 font-mono">
        <div className="flex items-center gap-1.5">
          <Sun className="w-3.5 h-3.5 text-amber-400" />
          <span>Drought Risk: {droughtRisk}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Bug className="w-3.5 h-3.5 text-emerald-400" />
          <span>Pest Risk: {pestRisk}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <LineChart className="w-3.5 h-3.5 text-sky-400" />
          <span>Market: Wheat ₹{state?.market_prices.Wheat ?? 20}/kg</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-emerald-400" />
          <span>Price Shock: {priceRisk}</span>
        </div>
      </div>
    </div>
  );
};
export default PlaySimulation;
