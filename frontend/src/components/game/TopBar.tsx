import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'motion/react';
import { Home, Sprout, Store, Warehouse, CloudSun, Bot, BookOpen, RotateCcw, TrendingUp } from 'lucide-react';
import { useFarmContext } from '../../context/FarmContext';
import { useTween } from '../../hooks/useTween';
import { Coin } from '../art/Scenery';
import { SEASON_LENGTH } from '../../game/crops';
import { ConfirmDialog } from './ConfirmDialog';

export const NAV_ITEMS = [
  { to: '/', label: 'Home', icon: Home, fx: 'home' },
  { to: '/farm', label: 'Farm', icon: Sprout, fx: 'farm' },
  { to: '/market', label: 'Market', icon: Store, fx: 'market' },
  { to: '/barn', label: 'Barn', icon: Warehouse, fx: 'barn' },
  { to: '/weather', label: 'Weather', icon: CloudSun, fx: 'weather' },
  { to: '/ai', label: 'AI Farmer', icon: Bot, fx: 'ai' },
  { to: '/journal', label: 'Journal', icon: BookOpen, fx: 'journal' },
] as const;

const DayDial: React.FC<{ day: number }> = ({ day }) => {
  const shown = Math.min(day, SEASON_LENGTH);
  const t = Math.min(1, (shown - 1) / (SEASON_LENGTH - 1));
  // Sun travels along a small arc as the season progresses
  const angle = Math.PI * (1 - t);
  const cx = 30 + 22 * Math.cos(angle);
  const cy = 28 - 18 * Math.sin(angle);
  return (
    <div className="flex items-center gap-2 rounded-2xl bg-[#fff8e6] border-[3px] border-[#6b4423] pl-1 pr-3 py-0.5 shadow-[0_3px_0_#4f3119]" title={`Day ${shown} of ${SEASON_LENGTH}`}>
      <svg viewBox="0 0 60 32" width="52" height="28" aria-hidden="true">
        <path d="M8 28 A22 18 0 0 1 52 28" fill="none" stroke="#e2c48d" strokeWidth="3" strokeDasharray="3 3" />
        <path d="M2 29 H58" stroke="#58a83a" strokeWidth="3" strokeLinecap="round" />
        <motion.circle r="5.5" fill="#ffd23f" stroke="#d68a00" strokeWidth="2" initial={{ cx, cy }} animate={{ cx, cy }} transition={{ type: 'spring', stiffness: 80 }} />
      </svg>
      <div className="leading-none">
        <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#9a6a3c]">Day</div>
        <div className="font-display font-bold text-[#3b2412] tabular">
          {shown}
          <span className="text-[#9a6a3c] text-xs">/{SEASON_LENGTH}</span>
        </div>
      </div>
    </div>
  );
};

const CashChip: React.FC<{ cash: number }> = ({ cash }) => {
  const shown = useTween(cash);
  return (
    <div
      data-fx-target="cash"
      className="flex items-center gap-1.5 rounded-2xl bg-[#fff8e6] border-[3px] border-[#6b4423] pl-1.5 pr-3 py-1 shadow-[0_3px_0_#4f3119]"
      title="Cash in hand"
    >
      <Coin size={24} />
      <span className="font-display font-bold text-[#3b2412] tabular text-[15px]">
        ₹{Math.round(shown).toLocaleString('en-IN')}
      </span>
    </div>
  );
};

const WealthChip: React.FC<{ wealth: number; profit: number }> = ({ wealth, profit }) => {
  const shown = useTween(wealth);
  const up = profit >= 0;
  return (
    <div className="hidden 2xl:flex items-center gap-1.5 rounded-2xl bg-[#fff8e6] border-[3px] border-[#6b4423] px-2.5 py-1 shadow-[0_3px_0_#4f3119]" title="Net wealth (cash + stored crops)">
      <TrendingUp className={`w-4 h-4 ${up ? 'text-[#3f8a2a]' : 'text-[#c23a33] rotate-180'}`} />
      <span className="font-display font-bold text-[#3b2412] tabular text-sm">₹{Math.round(shown).toLocaleString('en-IN')}</span>
      <span className={`text-[11px] font-extrabold tabular ${up ? 'text-[#3f8a2a]' : 'text-[#c23a33]'}`}>
        {up ? '▲' : '▼'} {Math.abs((profit / 10000) * 100).toFixed(1)}%
      </span>
    </div>
  );
};

export const TopBar: React.FC = () => {
  const farm = useFarmContext();
  const [confirmReset, setConfirmReset] = useState(false);
  const cash = farm.metrics?.cash ?? farm.farmState?.cash ?? 10000;
  const wealth = farm.metrics?.total_wealth ?? cash;
  const profit = farm.metrics?.profit ?? 0;

  return (
    <header className="sticky top-0 z-40 px-2 sm:px-4 pt-2">
      <div className="wood rounded-[22px] shadow-[0_6px_0_#3b2412,0_16px_30px_-10px_rgba(0,0,0,0.5)] px-2 sm:px-3 py-2 flex items-center gap-2 max-w-[1400px] mx-auto">
        {/* Brand */}
        <NavLink to="/" className="flex items-center gap-2 shrink-0 pr-1">
          <span className="w-10 h-10 rounded-xl bg-[#fff6df] border-[3px] border-[#3b2412] grid place-items-center shadow-[0_3px_0_#3b2412]">
            <Sprout className="w-6 h-6 text-[#3f8a2a]" strokeWidth={2.6} />
          </span>
          <span className="hidden sm:block leading-none">
            <span className="block font-display font-bold text-[#fff6df] text-lg tracking-wide" style={{ textShadow: '0 2px 0 #3b2412' }}>
              Autonomous Farm
            </span>
            <span className="block text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#ffd65c]">AI Valley</span>
          </span>
        </NavLink>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-1 mx-auto">
          {NAV_ITEMS.map(({ to, label, icon: Icon, fx }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              data-fx-target={fx}
              className={({ isActive }) =>
                `relative flex items-center gap-1.5 px-2.5 py-2 rounded-xl whitespace-nowrap font-display font-semibold text-[15px] transition-colors ${
                  isActive ? 'text-[#3b2412]' : 'text-[#fff6df] hover:bg-black/10'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span
                      layoutId="nav-pill"
                      className="absolute inset-0 rounded-xl bg-[#ffd65c] border-[3px] border-[#3b2412] shadow-[0_3px_0_#3b2412]"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                  <Icon className="relative w-4 h-4" strokeWidth={2.6} />
                  <span className="relative">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Resources */}
        <div className="flex items-center gap-1.5 sm:gap-2 ml-auto lg:ml-0 shrink-0">
          {farm.autopilot && (
            <NavLink to="/ai" className="hidden md:flex items-center gap-1 rounded-full bg-[#8b6cf0] border-[3px] border-[#3b2412] text-white text-xs font-extrabold px-2 py-1">
              <Bot className="w-3.5 h-3.5 animate-bounce" /> AUTO
            </NavLink>
          )}
          <WealthChip wealth={wealth} profit={profit} />
          <CashChip cash={cash} />
          <DayDial day={farm.farmState?.day ?? 1} />
          <span
            className={`w-3 h-3 rounded-full border-2 border-[#3b2412] ${farm.health ? 'bg-[#7cc451]' : 'bg-[#e2524a] animate-pulse'}`}
            title={farm.health ? 'Backend online' : 'Backend offline'}
          />
          <button
            className="btn btn-cream btn-sm !px-2"
            onClick={() => setConfirmReset(true)}
            disabled={farm.isLoading}
            title="Start a new season"
            aria-label="Start a new season"
          >
            <RotateCcw className={`w-4 h-4 ${farm.isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmReset}
        title="Start a new season?"
        body="Your fields, barn and coins reset to Day 1 with ₹10,000."
        confirmLabel="New season"
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          setConfirmReset(false);
          farm.resetFarm();
        }}
      />
    </header>
  );
};

export const MobileNav: React.FC = () => (
  <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 px-2 pb-2">
    <div className="wood rounded-[20px] shadow-[0_-4px_20px_rgba(0,0,0,0.25)] flex justify-around px-1 py-1.5">
      {NAV_ITEMS.map(({ to, label, icon: Icon, fx }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          data-fx-target={`${fx}-m`}
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 rounded-xl px-1.5 py-1 min-w-[44px] text-[10px] font-extrabold ${
              isActive ? 'bg-[#ffd65c] text-[#3b2412] border-2 border-[#3b2412]' : 'text-[#fff6df] border-2 border-transparent'
            }`
          }
        >
          <Icon className="w-5 h-5" strokeWidth={2.4} />
          <span className="hidden min-[380px]:block">{label.split(' ')[0]}</span>
        </NavLink>
      ))}
    </div>
  </nav>
);
