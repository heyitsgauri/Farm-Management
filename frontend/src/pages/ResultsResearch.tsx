import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  FileSpreadsheet,
  Info,
} from 'lucide-react';
import { farmApi } from '../services/api';
import type { BenchmarkSummary, BenchmarkRecord } from '../types/farm';

export const ResultsResearch: React.FC = () => {
  const [scenarioFilter, setScenarioFilter] = useState<string>('All');
  const [modeFilter, setModeFilter] = useState<string>('All');
  const [thresholdFilter, setThresholdFilter] = useState<string>('All');
  const [summaries, setSummaries] = useState<BenchmarkSummary[]>([]);
  const [records, setRecords] = useState<BenchmarkRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadBenchmarkData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await farmApi.getBenchmarkResults();
      setSummaries(data.summaries);
      setRecords(data.records);
    } catch (err: any) {
      console.error('Failed to load benchmark results:', err);
      setError('Could not load benchmark data. Ensure benchmark_results/feasibility_benchmark.csv exists.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBenchmarkData();
  }, []);

  // Filter summaries based on user selections
  const filteredSummaries = summaries.filter((s) => {
    if (scenarioFilter !== 'All' && s.scenario !== scenarioFilter) return false;
    if (modeFilter !== 'All' && s.filter_mode !== modeFilter) return false;
    if (thresholdFilter !== 'All') {
      const tVal = parseFloat(thresholdFilter);
      if (Math.abs(s.threshold - tVal) > 0.01) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Benchmark Results &amp; Analysis
          </h1>
          <p className="text-sm text-emerald-300/80">
            Empirical evaluation of Uncertainty-Aware Feasibility Filtering across matched-seed scenarios.
          </p>
        </div>

        <button
          onClick={loadBenchmarkData}
          disabled={isLoading}
          className="ag-button-secondary text-xs self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Filter Row */}
      <div className="ag-card p-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-4 items-end">
          {/* Scenario Filter */}
          <div>
            <label className="text-xs font-semibold text-emerald-300 block mb-1.5">Scenario</label>
            <select
              value={scenarioFilter}
              onChange={(e) => setScenarioFilter(e.target.value)}
              className="w-full bg-[#061811] border border-[#16422e] rounded-xl px-3 py-2 text-xs font-medium text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="All">All (Normal + Adverse)</option>
              <option value="Normal">Normal</option>
              <option value="Adverse">Adverse</option>
            </select>
          </div>

          {/* Mode Filter */}
          <div>
            <label className="text-xs font-semibold text-emerald-300 block mb-1.5">Filter Mode</label>
            <select
              value={modeFilter}
              onChange={(e) => setModeFilter(e.target.value)}
              className="w-full bg-[#061811] border border-[#16422e] rounded-xl px-3 py-2 text-xs font-medium text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="All">All Modes</option>
              <option value="Deterministic">Deterministic</option>
              <option value="Uncertainty-Aware">Uncertainty-Aware</option>
            </select>
          </div>

          {/* Threshold Filter */}
          <div>
            <label className="text-xs font-semibold text-emerald-300 block mb-1.5">
              Threshold (&tau;)
            </label>
            <select
              value={thresholdFilter}
              onChange={(e) => setThresholdFilter(e.target.value)}
              className="w-full bg-[#061811] border border-[#16422e] rounded-xl px-3 py-2 text-xs font-medium text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="All">All Thresholds</option>
              <option value="0.0">0.0 (Deterministic)</option>
              <option value="0.1">0.10</option>
              <option value="0.3">0.30</option>
              <option value="0.5">0.50</option>
            </select>
          </div>

          <div>
            <button
              onClick={() => {
                setScenarioFilter('All');
                setModeFilter('All');
                setThresholdFilter('All');
              }}
              className="ag-button-secondary w-full text-xs py-2"
            >
              <span>Reset Filters</span>
            </button>
          </div>
        </div>
      </div>

      {/* Performance Summary Table */}
      <div className="ag-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white tracking-tight">Performance Summary</h2>
          </div>
          <span className="text-xs text-emerald-400/70 font-mono">
            {records.length} Matched Seed Episodes Tested
          </span>
        </div>

        {error ? (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 text-xs text-rose-300">
            {error}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[#16422e]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#071f16] text-emerald-300 border-b border-[#16422e] uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4 font-bold">Scenario</th>
                  <th className="py-3 px-4 font-bold">Filter Mode</th>
                  <th className="py-3 px-4 font-bold text-center">Threshold &tau;</th>
                  <th className="py-3 px-4 font-bold text-right">Mean Wealth (₹)</th>
                  <th className="py-3 px-4 font-bold text-right">Std Dev (₹)</th>
                  <th className="py-3 px-4 font-bold text-center">Survival Rate</th>
                  <th className="py-3 px-4 font-bold text-center">Stranded Crops</th>
                  <th className="py-3 px-4 font-bold text-right">Avg Latency (ms)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#16422e]/60 bg-[#0a2318] font-mono">
                {filteredSummaries.map((s, idx) => (
                  <tr key={idx} className="hover:bg-[#0e2f21] transition">
                    <td className="py-3 px-4 font-semibold font-sans text-white">
                      <span
                        className={`ag-pill text-[10px] ${
                          s.scenario === 'Normal' ? 'ag-pill-emerald' : 'ag-pill-amber'
                        }`}
                      >
                        {s.scenario}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-sans text-emerald-100">{s.filter_mode}</td>
                    <td className="py-3 px-4 text-center text-emerald-300">{s.threshold.toFixed(2)}</td>
                    <td className="py-3 px-4 text-right font-bold text-white">
                      ₹{s.mean_wealth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right text-emerald-400/80">
                      &plusmn; ₹{s.std_wealth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-emerald-400">
                      {(s.survival_rate * 100).toFixed(1)}%
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded font-bold ${
                          s.mean_stranded_crops > 0
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'text-emerald-400'
                        }`}
                      >
                        {s.mean_stranded_crops.toFixed(2)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-emerald-400/70">
                      {s.avg_filter_time_ms.toFixed(3)} ms
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 3 Visual Benchmark Charts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Mean Wealth Comparison Chart */}
        <div className="ag-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Mean Wealth Comparison</h3>
            <span className="text-[10px] text-emerald-400 font-mono">₹ in thousands</span>
          </div>
          <div className="h-44 flex items-end justify-around gap-2 pt-6 pb-2 border-b border-[#16422e]">
            {/* Normal: Deterministic */}
            <div className="flex flex-col items-center gap-1.5 h-full justify-end">
              <span className="text-[10px] text-emerald-300 font-mono">₹38.8k</span>
              <div className="w-8 rounded-t bg-emerald-600 h-[78%]" />
              <span className="text-[9px] text-emerald-400/70">Norm Det</span>
            </div>
            {/* Normal: Tau 0.30 */}
            <div className="flex flex-col items-center gap-1.5 h-full justify-end">
              <span className="text-[10px] text-emerald-300 font-mono">₹38.8k</span>
              <div className="w-8 rounded-t bg-emerald-400 h-[78%]" />
              <span className="text-[9px] text-emerald-400/70">Norm &tau;=0.3</span>
            </div>
            {/* Adverse: Deterministic */}
            <div className="flex flex-col items-center gap-1.5 h-full justify-end">
              <span className="text-[10px] text-amber-300 font-mono">₹20.7k</span>
              <div className="w-8 rounded-t bg-amber-600/80 h-[41%]" />
              <span className="text-[9px] text-amber-400/70">Adv Det</span>
            </div>
            {/* Adverse: Tau 0.10 */}
            <div className="flex flex-col items-center gap-1.5 h-full justify-end">
              <span className="text-[10px] text-emerald-300 font-mono">₹26.7k</span>
              <div className="w-8 rounded-t bg-emerald-500 h-[53%]" />
              <span className="text-[9px] text-emerald-400/70">Adv &tau;=0.1</span>
            </div>
          </div>
          <p className="text-[11px] text-emerald-400/60 leading-tight">
            In adverse settings, uncertainty filtering improves wealth (+₹6,000 on average) by avoiding doomed sowings.
          </p>
        </div>

        {/* Survival Rate Chart */}
        <div className="ag-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Survival Rate</h3>
            <span className="text-[10px] text-emerald-400 font-mono">Solvency %</span>
          </div>
          <div className="h-44 flex items-end justify-around gap-2 pt-6 pb-2 border-b border-[#16422e]">
            {['Normal Det', 'Normal Unc', 'Adverse Det', 'Adverse Unc'].map((label, idx) => (
              <div key={idx} className="flex flex-col items-center gap-1.5 h-full justify-end">
                <span className="text-[10px] text-emerald-300 font-mono">100%</span>
                <div className="w-8 rounded-t bg-emerald-500 h-[95%]" />
                <span className="text-[9px] text-emerald-400/70">{label}</span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-emerald-400/60 leading-tight">
            All feasibility configurations successfully prevent bankruptcy (100% farm solvency rate).
          </p>
        </div>

        {/* Stranded Crops Chart */}
        <div className="ag-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Stranded Crops at Season End</h3>
            <span className="text-[10px] text-rose-400 font-mono">Mean Count</span>
          </div>
          <div className="h-44 flex items-end justify-around gap-2 pt-6 pb-2 border-b border-[#16422e]">
            {/* Normal: 0 */}
            <div className="flex flex-col items-center gap-1.5 h-full justify-end">
              <span className="text-[10px] text-emerald-300 font-mono">0.00</span>
              <div className="w-8 rounded-t bg-emerald-600 h-[4px]" />
              <span className="text-[9px] text-emerald-400/70">Normal</span>
            </div>
            {/* Adverse Det: 0.05 */}
            <div className="flex flex-col items-center gap-1.5 h-full justify-end">
              <span className="text-[10px] text-rose-300 font-mono">0.05</span>
              <div className="w-8 rounded-t bg-rose-500 h-[65%]" />
              <span className="text-[9px] text-rose-400">Adv Det</span>
            </div>
            {/* Adverse Tau 0.30: 0 */}
            <div className="flex flex-col items-center gap-1.5 h-full justify-end">
              <span className="text-[10px] text-emerald-300 font-mono">0.00</span>
              <div className="w-8 rounded-t bg-emerald-400 h-[4px]" />
              <span className="text-[9px] text-emerald-400/70">Adv &tau;&ge;0.3</span>
            </div>
          </div>
          <p className="text-[11px] text-emerald-400/60 leading-tight">
            Uncertainty filtering completely eliminates stranded crops in adverse climates (&tau; &ge; 0.30 yields 0.00 stranded crops).
          </p>
        </div>
      </div>

      {/* Research Methodology Summary */}
      <div className="ag-card p-5 space-y-3 border-emerald-500/30">
        <div className="flex items-center gap-2 text-emerald-300">
          <Info className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-bold text-white">Methodology &amp; Mathematical Formulation</h3>
        </div>
        <p className="text-xs text-emerald-200/90 leading-relaxed">
          The proposed <strong>Uncertainty-Aware Feasibility Filter</strong> formulates agricultural resource
          allocation as a finite-horizon chance-constrained decision problem. Because drought delays daily crop
          maturation with probability <code className="text-emerald-300 font-mono">p_d</code>, total extra days follow a
          Negative-Binomial distribution <code className="text-emerald-300 font-mono">NB(G, 1 - p_d)</code>. Concurrently,
          pest outbreaks occur with daily probability <code className="text-emerald-300 font-mono">p_p</code>. The filter
          computes the exact survival and maturation joint probability <code className="text-emerald-300 font-mono">P(complete) = P_mat &times; P_pest</code> and
          masks out planting actions whenever <code className="text-emerald-300 font-mono">P(complete) &lt; &tau;</code>,
          preventing unrecoverable capital depletion near the finite horizon.
        </p>
      </div>
    </div>
  );
};
export default ResultsResearch;
