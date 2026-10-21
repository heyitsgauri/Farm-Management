import React from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Sky, Hills, type SkyMood } from '../art/Scenery';
import { Bug, Coin, Sun } from '../art/Scenery';

export const PageBanner: React.FC<{
  title: string;
  subtitle: string;
  mood?: SkyMood;
  art?: React.ReactNode;
  children?: React.ReactNode;
}> = ({ title, subtitle, mood = 'day', art, children }) => (
  <section className="relative overflow-hidden rounded-[28px] border-[3px] border-[#3b2412] shadow-[0_6px_0_#3b2412] mb-6 min-h-[190px]">
    <Sky mood={mood} clouds={3} />
    <Hills className="h-[46%]" tone={mood === 'hot' ? 'dry' : 'green'} />
    <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 p-5 sm:p-7 min-h-[190px]">
      <motion.div initial={{ x: -30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 160, damping: 18 }}>
        <h1
          className="font-display font-bold text-4xl sm:text-5xl text-[#fff6df] leading-none"
          style={{ textShadow: '0 3px 0 #3b2412, 0 -2px 0 #3b2412, 2px 0 0 #3b2412, -2px 0 0 #3b2412, 0 8px 18px rgba(0,0,0,0.25)' }}
        >
          {title}
        </h1>
        <p className="mt-2 inline-block rounded-xl bg-[#fff8e6]/90 border-2 border-[#6b4423] px-3 py-1 text-sm font-bold text-[#4f3119]">{subtitle}</p>
        {children && <div className="mt-3">{children}</div>}
      </motion.div>
      {art && (
        <motion.div className="self-end hidden sm:block" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1, type: 'spring' }}>
          {art}
        </motion.div>
      )}
    </div>
  </section>
);

export const SectionTitle: React.FC<{ children: React.ReactNode; right?: React.ReactNode }> = ({ children, right }) => (
  <div className="flex items-center justify-between gap-2 mb-3">
    <h2 className="font-display font-bold text-xl text-[#3b2412]">{children}</h2>
    {right}
  </div>
);

const LEVEL_STYLE: Record<string, string> = {
  LOW: 'bg-[#e3f5d3] border-[#3f8a2a] text-[#2f6b1f]',
  MEDIUM: 'bg-[#fff0c2] border-[#b36f00] text-[#8a5200]',
  HIGH: 'bg-[#fdebe9] border-[#c23a33] text-[#8f2621]',
};

export const RiskChips: React.FC<{ risks: Record<string, string | undefined>; compact?: boolean }> = ({ risks, compact }) => {
  const items = [
    { key: 'drought', label: 'Drought', icon: <Sun size={18} hot /> },
    { key: 'pest', label: 'Pests', icon: <Bug size={18} /> },
    { key: 'price_shock', label: 'Price shock', icon: <Coin size={18} /> },
  ];
  return (
    <Link to="/weather" className="flex flex-wrap gap-1.5" title="Open the weather station">
      {items.map((it) => {
        const lvl = risks[it.key] ?? 'LOW';
        return (
          <span key={it.key} className={`flex items-center gap-1 rounded-full border-2 px-2 py-0.5 text-xs font-extrabold ${LEVEL_STYLE[lvl] ?? LEVEL_STYLE.LOW}`}>
            {it.icon}
            {!compact && <span>{it.label}</span>}
            <span>{lvl}</span>
          </span>
        );
      })}
    </Link>
  );
};

export const StatTile: React.FC<{ label: string; value: React.ReactNode; hint?: string; icon?: React.ReactNode }> = ({ label, value, hint, icon }) => (
  <div className="panel px-4 py-3 flex items-center gap-3">
    {icon && <div className="shrink-0">{icon}</div>}
    <div className="min-w-0">
      <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#9a6a3c]">{label}</div>
      <div className="font-display font-bold text-2xl text-[#3b2412] tabular leading-tight truncate">{value}</div>
      {hint && <div className="text-xs font-semibold text-[#6b4f36]">{hint}</div>}
    </div>
  </div>
);
