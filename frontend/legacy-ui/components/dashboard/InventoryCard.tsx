import React from 'react';
import { Package, Wheat } from 'lucide-react';

interface InventoryCardProps {
  inventory: Record<string, number>;
  marketPrices: Record<string, number>;
}

export const InventoryCard: React.FC<InventoryCardProps> = ({
  inventory,
  marketPrices,
}) => {
  const cropList = ['Wheat', 'Rice', 'Corn'];
  const totalUnits = Object.values(inventory).reduce((a, b) => a + b, 0);
  const totalValuation = cropList.reduce((sum, crop) => {
    const qty = inventory[crop] || 0;
    const price = marketPrices[crop] || 0;
    return sum + qty * price;
  }, 0);

  return (
    <div className="rounded-3xl border border-white/10 bg-[#0c0e12]/90 backdrop-blur-xl p-6 relative overflow-hidden shadow-xl flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-center">
              <Package className="w-4 h-4 text-emerald-400" />
            </div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">
              Silo Stock
            </h3>
          </div>
          <span className="text-[11px] font-mono text-neutral-400">
            Total: <span className="text-white font-bold">{totalUnits} units</span>
          </span>
        </div>

        <div className="space-y-3">
          {cropList.map((crop) => {
            const qty = inventory[crop] || 0;
            const price = marketPrices[crop] || 0;
            const cropValue = qty * price;
            const pct = totalUnits > 0 ? (qty / totalUnits) * 100 : 0;

            return (
              <div key={crop} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-white font-medium">
                    <Wheat className="w-3.5 h-3.5 text-emerald-400" />
                    {crop}
                  </span>
                  <div className="font-mono text-xs">
                    <span className="text-white font-bold">{qty} units</span>
                    <span className="text-neutral-500 ml-1.5">(₹{cropValue.toFixed(0)})</span>
                  </div>
                </div>

                <div className="w-full bg-neutral-900 h-1.5 rounded-full overflow-hidden border border-white/5">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-emerald-400 h-full rounded-full transition-all duration-300"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="pt-3 border-t border-white/10 mt-4 flex items-center justify-between text-xs">
        <span className="text-neutral-400">Inventory Value:</span>
        <span className="font-mono text-sm font-bold text-emerald-400">
          ₹{totalValuation.toLocaleString('en-IN', { maximumFractionDigits: 1 })}
        </span>
      </div>
    </div>
  );
};
