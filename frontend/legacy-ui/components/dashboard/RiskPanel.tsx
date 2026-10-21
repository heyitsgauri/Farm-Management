import React from 'react';
import { ShieldAlert, Sun, Bug, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface RiskPanelProps {
  forecasts: {
    drought?: string;
    pest?: string;
    price_shock?: string;
    [key: string]: string | undefined;
  };
}

const getRiskConfig = (level?: string) => {
  const l = (level || 'low').toLowerCase();
  if (l === 'high') return {
    label: 'HIGH',
    dot: 'bg-rose-400',
    badge: 'bg-rose-950/70 text-rose-400 border-rose-700/40',
    bar: 'bg-rose-500',
    barWidth: '85%',
    icon: 'text-rose-400',
  };
  if (l === 'medium') return {
    label: 'MEDIUM',
    dot: 'bg-amber-400',
    badge: 'bg-amber-950/70 text-amber-400 border-amber-700/40',
    bar: 'bg-amber-500',
    barWidth: '50%',
    icon: 'text-amber-400',
  };
  return {
    label: 'LOW',
    dot: 'bg-emerald-400',
    badge: 'bg-emerald-950/60 text-emerald-400 border-emerald-500/25',
    bar: 'bg-emerald-500',
    barWidth: '15%',
    icon: 'text-emerald-400',
  };
};

export const RiskPanel: React.FC<RiskPanelProps> = ({ forecasts }) => {
  const risks = [
    {
      name: 'Drought Warning',
      icon: Sun,
      level: forecasts.drought || 'low',
      desc: 'Soil moisture depletion hazard',
    },
    {
      name: 'Pest Infestation',
      icon: Bug,
      level: forecasts.pest || 'low',
      desc: 'Crop yield degradation risk',
    },
    {
      name: 'Market Price Shock',
      icon: AlertTriangle,
      level: forecasts.price_shock || 'low',
      desc: 'Wholesale price volatility',
    },
  ];

  const allLow = risks.every((r) => (r.level || 'low').toLowerCase() === 'low');

  return (
    <div className="rounded-3xl glass-card relative overflow-hidden shadow-xl p-6">
      <div className="absolute inset-0 dot-grid opacity-30 pointer-events-none" />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-center">
              <ShieldAlert className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">
              Environmental Risk Monitor
            </h3>
          </div>
          {allLow ? (
            <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              All Clear
            </span>
          ) : (
            <span className="text-[11px] text-neutral-500 font-mono">Early Warning</span>
          )}
        </div>

        {/* Risk tiles */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {risks.map((risk) => {
            const cfg = getRiskConfig(risk.level);
            const Icon = risk.icon;
            return (
              <div
                key={risk.name}
                className="p-4 rounded-2xl bg-[#0b0d12] border border-white/[0.06] hover:border-emerald-500/20 transition-all duration-200"
              >
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-8 h-8 rounded-xl bg-neutral-900/60 border border-white/[0.07] flex items-center justify-center flex-shrink-0">
                    <Icon className={`w-4 h-4 ${cfg.icon}`} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white leading-none">{risk.name}</h4>
                    <p className="text-[10px] text-neutral-600 mt-0.5">{risk.desc}</p>
                  </div>
                </div>

                {/* Risk meter */}
                <div className="w-full bg-neutral-800/60 h-1 rounded-full overflow-hidden mb-2">
                  <div
                    className={`${cfg.bar} h-full rounded-full transition-all duration-700`}
                    style={{ width: cfg.barWidth }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-neutral-600 font-mono uppercase">Forecast</span>
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${cfg.badge}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} flex-shrink-0`} />
                    {cfg.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
