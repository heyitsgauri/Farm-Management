import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Coins,
  ShieldCheck,
  Package,
  TrendingUp,
  Sun,
  Bug,
  LineChart,
  Calendar,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { useFarmContext } from '../context/FarmContext';
import { FieldCard } from '../components/FieldCard';
import { PlantCropModal } from '../components/PlantCropModal';
import { FieldDetailsModal } from '../components/FieldDetailsModal';

export const FarmDashboard: React.FC = () => {
  const navigate = useNavigate();
  const farm = useFarmContext();

  const [selectedFieldId, setSelectedFieldId] = useState<number | null>(null);
  const [plantingFieldId, setPlantingFieldId] = useState<number | null>(null);
  const [inspectingFieldId, setInspectingFieldId] = useState<number | null>(null);

  const state = farm.farmState;
  const metrics = farm.metrics;

  const currentCash = state?.cash ?? 10000;
  const startingCash = 10000;
  const inventoryItemsCount = state?.inventory
    ? Object.values(state.inventory).reduce((acc, qty) => acc + qty, 0)
    : 0;
  const totalWealth = metrics?.total_wealth ?? currentCash;
  const currentDay = state?.day ?? 1;

  // Weather & Risk
  const weatherRisk = state?.risk_forecasts?.drought ?? 'Low';
  const pestRisk = state?.risk_forecasts?.pest ?? 'Low';

  const marketPrices = state?.market_prices ?? {
    Wheat: 40,
    Rice: 35,
    Corn: 30,
  };

  const handleCardSelect = (fieldId: number) => {
    setSelectedFieldId(fieldId);
  };

  const handlePlantClick = (fieldId: number) => {
    setSelectedFieldId(fieldId);
    setPlantingFieldId(fieldId);
  };

  const handleViewDetailsClick = (fieldId: number) => {
    setSelectedFieldId(fieldId);
    setInspectingFieldId(fieldId);
  };

  const inspectingField = state?.fields.find((f) => f.id === inspectingFieldId) ?? null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Farm Dashboard</h1>
          <p className="text-sm text-emerald-300/80">
            Manage your fields, monitor conditions and make strategic decisions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/play')}
            className="ag-button-primary text-xs py-2 px-4 shadow-lg shadow-emerald-900/30"
          >
            <span>Play Simulation</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Top 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Starting Cash */}
        <div className="ag-card p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center shrink-0">
            <Coins className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-emerald-400/80 block">Starting Cash</span>
            <span className="text-xl font-bold font-mono text-white tracking-tight">
              ₹{startingCash.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Current Cash */}
        <div className="ag-card p-4 flex items-center gap-4 border-emerald-500/30 bg-emerald-950/20">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-emerald-400/80 block">Current Cash</span>
            <span className="text-xl font-bold font-mono text-white tracking-tight">
              ₹{Math.round(currentCash).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Inventory */}
        <div className="ag-card p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center justify-center shrink-0">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-emerald-400/80 block">Inventory</span>
            <span className="text-xl font-bold font-mono text-white tracking-tight">
              {inventoryItemsCount} <span className="text-xs text-emerald-400/60 font-normal">items</span>
            </span>
          </div>
        </div>

        {/* Total Wealth */}
        <div className="ag-card p-4 flex items-center gap-4 border-blue-500/30 bg-blue-950/20">
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-300 border border-blue-500/40 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-emerald-400/80 block">Total Wealth</span>
            <span className="text-xl font-bold font-mono text-white tracking-tight">
              ₹{Math.round(totalWealth).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Secondary Conditions Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Weather */}
        <div className="ag-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/15 text-amber-300 flex items-center justify-center">
              <Sun className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-emerald-400/70 block">Weather</span>
              <span className="text-sm font-bold text-white">Clear</span>
            </div>
          </div>
          <p className="text-[11px] text-emerald-400/60 mt-2 font-mono">
            Drought Risk: {weatherRisk} | 22°C
          </p>
        </div>

        {/* Pest Risk */}
        <div className="ag-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/15 text-emerald-300 flex items-center justify-center">
              <Bug className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-emerald-400/70 block">Pest Risk</span>
              <span className="text-sm font-bold text-white capitalize">{pestRisk}</span>
            </div>
          </div>
          <p className="text-[11px] text-emerald-400/60 mt-2 font-mono">
            ~8% chance of outbreak
          </p>
        </div>

        {/* Market Prices */}
        <div className="ag-card p-4">
          <div className="flex items-center gap-3 mb-1.5">
            <div className="w-9 h-9 rounded-lg bg-sky-500/15 text-sky-300 flex items-center justify-center">
              <LineChart className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-emerald-400/70 block">Market Prices</span>
              <span className="text-xs font-semibold text-emerald-200">Current Spot Rates</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-mono text-emerald-200/90 mt-1">
            <span>Wheat: ₹{marketPrices.Wheat ?? 40}/kg</span>
            <span>Rice: ₹{marketPrices.Rice ?? 35}/kg</span>
            <span>Corn: ₹{marketPrices.Corn ?? 30}/kg</span>
          </div>
        </div>

        {/* Season Countdown */}
        <div className="ag-card p-4">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-semibold text-emerald-300">Season Countdown</span>
            </div>
            <span className="text-xs font-mono font-bold text-white">Day {currentDay} of 30</span>
          </div>
          <div className="w-full bg-[#061811] h-2 rounded-full overflow-hidden mt-3 border border-[#16422e]">
            <div
              className="bg-emerald-400 h-full rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, Math.round((currentDay / 30) * 100))}%` }}
            />
          </div>
          <div className="text-[10px] text-emerald-400/60 mt-1.5 text-right font-mono">
            {Math.round((currentDay / 30) * 100)}% season elapsed
          </div>
        </div>
      </div>

      {/* Your Farm Fields (5) Section */}
      <div>
        <div className="flex items-center justify-between mb-3.5">
          <h2 className="text-lg font-bold text-white tracking-tight">Your Farm Fields (5)</h2>
          <span className="text-xs text-emerald-400/70">
            Click &ldquo;Plant Crop&rdquo; on any empty field to open the feasibility-aware sowing dialog
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {(state?.fields ?? [
            { id: 0, state: 'EMPTY', crop: null, progress: 0 },
            { id: 1, state: 'EMPTY', crop: null, progress: 0 },
            { id: 2, state: 'EMPTY', crop: null, progress: 0 },
            { id: 3, state: 'EMPTY', crop: null, progress: 0 },
            { id: 4, state: 'EMPTY', crop: null, progress: 0 },
          ]).map((field) => (
            <FieldCard
              key={field.id}
              field={field}
              isSelected={selectedFieldId === field.id}
              onSelect={handleCardSelect}
              onPlant={handlePlantClick}
              onViewDetails={handleViewDetailsClick}
            />
          ))}
        </div>
      </div>

      {/* Hero Banner Callout */}
      <div className="ag-card p-6 relative overflow-hidden bg-gradient-to-r from-[#0a271c] via-[#0d3424] to-[#071f16] border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="relative z-10 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold mb-2 border border-emerald-500/30">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Uncertainty-Aware Allocation</span>
          </div>
          <h3 className="text-xl font-extrabold text-white tracking-tight">
            Build a highly profitable, sustainable farm
          </h3>
          <p className="text-xs text-emerald-200/80 mt-1.5 leading-relaxed">
            Our finite-horizon feasibility filter dynamically models drought delays and pest risk
            distributions to eliminate stranded investments before the 30-day season closes.
          </p>
        </div>

        <div className="relative z-10 flex gap-3 shrink-0">
          <button
            onClick={() => navigate('/comparison')}
            className="ag-button-secondary text-xs"
          >
            <span>Compare with AI</span>
          </button>
          <button
            onClick={() => navigate('/research')}
            className="ag-button-primary text-xs"
          >
            <span>View Benchmark Data</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="absolute -right-10 -bottom-10 w-64 h-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
      </div>

      {/* Plant Crop Modal (only opens on empty fields when Plant Crop is clicked) */}
      {plantingFieldId !== null && (
        <PlantCropModal
          isOpen={plantingFieldId !== null}
          onClose={() => setPlantingFieldId(null)}
          fieldId={plantingFieldId}
        />
      )}

      {/* Field Details Modal (opens on planted fields) */}
      {inspectingFieldId !== null && (
        <FieldDetailsModal
          isOpen={inspectingFieldId !== null}
          onClose={() => setInspectingFieldId(null)}
          field={inspectingField}
        />
      )}
    </div>
  );
};
export default FarmDashboard;
