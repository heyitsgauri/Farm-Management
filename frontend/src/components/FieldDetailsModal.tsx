import React, { useState } from 'react';
import { X, Sprout, CheckCircle2, AlertCircle } from 'lucide-react';
import { useFarmContext } from '../context/FarmContext';
import { cropInfo } from '../game/crops';
import type { FieldState } from '../types/farm';

interface FieldDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  field: FieldState | null;
}

export const FieldDetailsModal: React.FC<FieldDetailsModalProps> = ({
  isOpen,
  onClose,
  field,
}) => {
  const farm = useFarmContext();
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !field) return null;

  const info = cropInfo(field.crop);
  const isMature = field.state === 'MATURE';
  const targetDays = info?.growthDays ?? 5;
  const currentProgress = Math.min(targetDays, field.progress);
  const progressPct = isMature ? 100 : Math.round((currentProgress / targetDays) * 100);

  // Find harvest action if mature
  const harvestAction = isMature
    ? farm.actions.find((a) => a.type === 'HARVEST' && a.field_id === field.id && a.valid)
    : null;

  const handleHarvest = async () => {
    if (!harvestAction) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await farm.executeHumanAction(harvestAction.id);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to harvest field.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div
        className="relative w-full max-w-lg bg-[#0a2318] border border-[#16422e] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
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
                Field {field.id + 1} Details
              </h3>
              <p className="text-xs text-emerald-400/80">
                {field.crop} &bull; {field.state}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[#0d2c1f] text-emerald-400 hover:text-white flex items-center justify-center transition border border-[#16422e]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="p-4 rounded-xl bg-[#061811] border border-[#16422e] space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-emerald-400/70">Current Crop:</span>
              <span className="font-bold text-white text-sm">{field.crop}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-emerald-400/70">Growth Stage:</span>
              <span
                className={`ag-pill text-[11px] ${
                  isMature ? 'ag-pill-amber' : 'ag-pill-emerald'
                }`}
              >
                {field.state}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-emerald-400/70">Growth Progress:</span>
              <span className="font-mono font-bold text-white">
                {currentProgress} / {targetDays} days ({progressPct}%)
              </span>
            </div>
            <div className="w-full bg-[#0a2318] h-2.5 rounded-full overflow-hidden border border-[#16422e]">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  isMature
                    ? 'bg-gradient-to-r from-amber-400 to-amber-500'
                    : 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                }`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {info && (
            <div className="p-4 rounded-xl bg-[#061811] border border-[#16422e] space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-emerald-400/70">Expected Harvest Yield:</span>
                <span className="text-white font-bold">{info.yieldAmount} kg</span>
              </div>
              <div className="flex justify-between">
                <span className="text-emerald-400/70">Base Market Value:</span>
                <span className="text-emerald-300">₹{info.basePrice}/kg</span>
              </div>
              <div className="flex justify-between">
                <span className="text-emerald-400/70">Estimated Gross Revenue:</span>
                <span className="text-amber-300 font-bold">
                  ₹{(info.yieldAmount * info.basePrice).toLocaleString()}
                </span>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/50 text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[#071d14] border-t border-[#16422e] flex items-center justify-between">
          <button onClick={onClose} className="ag-button-secondary text-xs">
            Close
          </button>

          {isMature && (
            <button
              onClick={handleHarvest}
              disabled={isSubmitting || !harvestAction}
              className="ag-button-primary text-xs"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Harvesting...' : 'Harvest Field Now'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
export default FieldDetailsModal;
