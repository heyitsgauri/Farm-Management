import React, { useState } from 'react';
import { ShieldCheck, Cpu, CheckCircle2, RotateCcw } from 'lucide-react';
import { useFarmContext } from '../context/FarmContext';

export const SettingsPage: React.FC = () => {
  const farm = useFarmContext();
  const [defaultMode, setDefaultMode] = useState<string>('uncertainty_aware');
  const [defaultThreshold, setDefaultThreshold] = useState<number>(0.3);
  const [saved, setSaved] = useState<boolean>(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">System Settings</h1>
        <p className="text-sm text-emerald-300/80">
          Simulation parameters, action mask configuration, and API environment diagnostics.
        </p>
      </div>

      <div className="ag-card p-6 space-y-6">
        {/* Simulation Settings */}
        <div>
          <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Feasibility Filter Preferences</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-emerald-300 block mb-1.5">
                Default Filter Mode
              </label>
              <select
                value={defaultMode}
                onChange={(e) => setDefaultMode(e.target.value)}
                className="w-full bg-[#061811] border border-[#16422e] rounded-xl px-3 py-2 text-xs font-medium text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="uncertainty_aware">Uncertainty-Aware (Chance-Constrained)</option>
                <option value="deterministic">Deterministic Deadline</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-emerald-300 block mb-1.5">
                Risk Threshold (&tau;): {defaultThreshold}
              </label>
              <input
                type="range"
                min="0.05"
                max="0.95"
                step="0.05"
                value={defaultThreshold}
                onChange={(e) => setDefaultThreshold(parseFloat(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer mt-2"
              />
            </div>
          </div>
        </div>

        {/* System & Model Diagnostics */}
        <div className="pt-6 border-t border-[#16422e]">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-emerald-400" />
            <span>Backend Diagnostics &amp; Status</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-[#061811] border border-[#16422e]">
              <span className="text-emerald-400/70 block">FastAPI Server</span>
              <span className="font-mono font-bold text-emerald-400">
                {farm.health?.status === 'ok' ? 'ONLINE (200 OK)' : 'CONNECTING...'}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-[#061811] border border-[#16422e]">
              <span className="text-emerald-400/70 block">PPO Model Checkpoint</span>
              <span className="font-mono font-bold text-white">
                {farm.health?.ppo_model_loaded
                  ? 'PPO checkpoint loaded successfully'
                  : farm.health?.status === 'ok'
                    ? 'PPO model unavailable on backend'
                    : 'Backend unavailable'}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-[#061811] border border-[#16422e]">
              <span className="text-emerald-400/70 block">Active Session ID</span>
              <span className="font-mono text-emerald-300 truncate block">
                {farm.sessionId ? farm.sessionId.slice(0, 8) + '...' : 'None'}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="pt-4 flex items-center justify-between">
          <button
            onClick={() => farm.resetFarm()}
            className="ag-button-secondary text-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Simulation Session</span>
          </button>

          <button onClick={handleSave} className="ag-button-primary text-xs">
            {saved ? <CheckCircle2 className="w-4 h-4" /> : null}
            <span>{saved ? 'Preferences Saved!' : 'Save Preferences'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
export default SettingsPage;
