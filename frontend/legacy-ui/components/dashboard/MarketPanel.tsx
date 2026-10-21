import React from 'react';
import { TrendingUp, ArrowUpRight, ArrowDownRight, Minus, Banknote } from 'lucide-react';
import type { ActionItem } from '../../types/farm';

interface MarketPanelProps {
  prices: Record<string, number>;
  inventory: Record<string, number>;
  actions: ActionItem[];
  isExecuting: boolean;
  onExecuteAction: (actionId: number) => void;
}

const BASE_PRICES: Record<string, number> = {
  Wheat: 40.0,
  Rice: 35.0,
  Corn: 30.0,
};

const CROP_ACCENTS: Record<string, { badge: string; sell: string; glow: string }> = {
  Wheat: {
    badge: 'bg-amber-950/60 text-amber-400 border-amber-700/30',
    sell: 'hover:border-amber-500/40 hover:text-amber-300',
    glow: '',
  },
  Rice: {
    badge: 'bg-sky-950/60 text-sky-400 border-sky-700/30',
    sell: 'hover:border-sky-500/40 hover:text-sky-300',
    glow: '',
  },
  Corn: {
    badge: 'bg-orange-950/60 text-orange-400 border-orange-700/30',
    sell: 'hover:border-orange-500/40 hover:text-orange-300',
    glow: '',
  },
};

export const MarketPanel: React.FC<MarketPanelProps> = ({
  prices,
  inventory,
  actions,
  isExecuting,
  onExecuteAction,
}) => {
  const cropList = ['Wheat', 'Rice', 'Corn'];

  return (
    <div className="rounded-3xl glass-card relative overflow-hidden shadow-xl p-6">
      <div className="absolute inset-0 dot-grid opacity-30 pointer-events-none" />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-white leading-none">
                Commodity Market
              </h3>
            </div>
          </div>
          <span className="text-[11px] text-neutral-600 font-mono">Dynamic Pricing</span>
        </div>

        {/* Crop price cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {cropList.map((crop) => {
            const currentPrice = prices[crop] || BASE_PRICES[crop] || 0;
            const basePrice = BASE_PRICES[crop] || currentPrice;
            const pctChange = ((currentPrice - basePrice) / basePrice) * 100;
            const stock = inventory[crop] || 0;
            const sellValue = stock * currentPrice;
            const accent = CROP_ACCENTS[crop];

            const sellAction = actions.find(
              (a) => a.type === 'SELL' && a.crop_name === crop
            );

            const priceDir = pctChange > 0.5 ? 'up' : pctChange < -0.5 ? 'down' : 'flat';

            return (
              <div
                key={crop}
                className="p-4 rounded-2xl bg-[#0b0d12] border border-white/[0.06] flex flex-col gap-3 hover:border-emerald-500/20 transition-all duration-200 group"
              >
                {/* Crop name + price direction */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">{crop}</span>
                  <span className={`flex items-center gap-0.5 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md border ${
                    priceDir === 'up'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : priceDir === 'down'
                      ? 'bg-rose-950/60 text-rose-400 border-rose-800/30'
                      : 'bg-neutral-800/60 text-neutral-500 border-white/[0.06]'
                  }`}>
                    {priceDir === 'up' ? (
                      <ArrowUpRight className="w-2.5 h-2.5" />
                    ) : priceDir === 'down' ? (
                      <ArrowDownRight className="w-2.5 h-2.5" />
                    ) : (
                      <Minus className="w-2.5 h-2.5" />
                    )}
                    {pctChange > 0 ? `+${pctChange.toFixed(1)}%` : `${pctChange.toFixed(1)}%`}
                  </span>
                </div>

                {/* Price */}
                <div>
                  <div className="text-2xl font-bold font-mono text-white leading-none">
                    ₹{currentPrice.toFixed(1)}
                    <span className="text-xs text-neutral-600 font-normal ml-1">/ unit</span>
                  </div>
                  <div className="text-[11px] text-neutral-600 mt-1 flex items-center gap-1">
                    <span>Stock:</span>
                    <span className="font-mono text-neutral-300 font-medium">{stock} units</span>
                    {stock > 0 && (
                      <span className="text-emerald-400 font-mono font-semibold">
                        = ₹{sellValue.toFixed(0)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Stock bar */}
                <div className="w-full bg-neutral-800/50 h-0.5 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-emerald-600 to-emerald-400 h-full rounded-full transition-all duration-500"
                    style={{ width: stock > 0 ? `${Math.min(100, stock * 5)}%` : '0%' }}
                  />
                </div>

                {/* Sell button */}
                {sellAction && (
                  <button
                    onClick={() => onExecuteAction(sellAction.id)}
                    disabled={!sellAction.valid || stock <= 0 || isExecuting}
                    className={`w-full py-2 px-3 rounded-xl bg-neutral-900/60 border border-white/[0.08] ${accent.sell} text-neutral-400 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all duration-200 cursor-pointer disabled:opacity-30`}
                    title={stock > 0 ? `Sell all ${stock} units for ₹${sellValue.toFixed(0)}` : 'No stock'}
                  >
                    <Banknote className="w-3.5 h-3.5 text-emerald-400" />
                    Sell All ({stock} units)
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
