import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { RotateCcw, Star, X } from 'lucide-react';
import { useFarmContext } from '../../context/FarmContext';
import type { FarmEvent } from '../../types/farm';
import { Bug, Coin, Moon, Sack, Scarecrow, SeedBag, Sun } from '../art/Scenery';
import { CropSprite } from '../art/CropSprite';
import { cropInfo, formatMoney, SEASON_LENGTH, STARTING_CASH } from '../../game/crops';

/* ─── DAY TRANSITION ─────────────────────────────────── */
export const DayTransition: React.FC = () => {
  const { farmState, autopilot, autopilotSpeed } = useFarmContext();
  const day = farmState?.day ?? null;
  const prev = useRef<number | null>(null);
  const [show, setShow] = useState<{ key: number; label: string; sub: string } | null>(null);

  useEffect(() => {
    if (day == null) return;
    const before = prev.current;
    prev.current = day;
    if (before == null || day === before) return;
    const label = day > SEASON_LENGTH ? 'Harvest Festival!' : day < before ? 'A new season begins' : `Day ${day}`;
    const sub = day > SEASON_LENGTH ? 'The season is over' : day < before ? 'Fresh soil, ₹10,000 in the purse' : 'The sun rises over the valley';
    setShow({ key: Date.now(), label, sub });
    const t = window.setTimeout(() => setShow(null), 1500);
    return () => window.clearTimeout(t);
  }, [day]);

  const quiet = autopilot && autopilotSpeed === 'fast';

  return (
    <AnimatePresence>
      {show && (
        <motion.div key={show.key} className="fixed inset-0 z-[60] pointer-events-none" initial={{ opacity: 1 }} exit={{ opacity: 0 }}>
          {!quiet && (
            <motion.div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(180deg, #0f1a3d 0%, #263a74 60%, #e27d6a 100%)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.45, 0.15, 0] }}
              transition={{ duration: 1.4, times: [0, 0.35, 0.7, 1] }}
            />
          )}
          <motion.div
            className="absolute left-1/2 top-24 -translate-x-1/2"
            initial={{ y: -80, opacity: 0, scale: 0.8 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -60, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 18 }}
          >
            <div className="panel flex items-center gap-3 px-5 py-2.5">
              <div className="relative w-12 h-12">
                <motion.div className="absolute inset-0" initial={{ opacity: 1, rotate: 0 }} animate={{ opacity: 0, rotate: -60 }} transition={{ duration: 0.6 }}>
                  <Moon size={48} />
                </motion.div>
                <motion.div className="absolute inset-0" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.35 }}>
                  <Sun size={48} />
                </motion.div>
              </div>
              <div>
                <div className="font-display font-bold text-2xl text-[#3b2412] leading-none">{show.label}</div>
                <div className="text-xs font-bold text-[#9a6a3c]">{show.sub}</div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/* ─── EVENT TOASTS ───────────────────────────────────── */
interface Toast {
  id: string;
  ai: boolean;
  icon: React.ReactNode;
  title: string;
  detail?: string;
  tone: 'good' | 'bad' | 'info';
}

function toastsFor(e: FarmEvent): Toast[] {
  const out: Toast[] = [];
  const t = (suffix: string, rest: Omit<Toast, 'id' | 'ai'>) => out.push({ id: `${e.id}-${suffix}`, ai: e.actor === 'PPO AI', ...rest });

  if (e.planted)
    t('plant', {
      icon: <SeedBag size={26} color={cropInfo(e.planted.crop)?.accent} />,
      title: `Planted ${e.planted.crop} in Field ${e.planted.fieldId + 1}`,
      detail: `Seeds cost ${formatMoney(e.planted.cost)}`,
      tone: 'info',
    });
  if (e.harvested)
    t('harvest', {
      icon: <Sack size={26} />,
      title: `Harvested ${e.harvested.qty} ${e.harvested.crop}`,
      detail: `From Field ${e.harvested.fieldId + 1}, now stored in the barn`,
      tone: 'good',
    });
  if (e.sold)
    t('sell', {
      icon: <Coin size={26} />,
      title: `Sold ${e.sold.qty} ${e.sold.crop}`,
      detail: `Earned ${formatMoney(e.sold.revenue)}`,
      tone: 'good',
    });
  if (e.invalid)
    t('invalid', { icon: <X className="w-6 h-6 text-[#c23a33]" />, title: `That move didn't work`, detail: `${e.actionLabel} — the day still passed`, tone: 'bad' });
  e.pestHits.forEach((p) =>
    t(`pest${p.fieldId}`, { icon: <Bug size={26} />, title: `Pests destroyed Field ${p.fieldId + 1}`, detail: `The ${p.crop} crop was lost`, tone: 'bad' })
  );
  if (e.droughtFields.length)
    t('drought', {
      icon: <Sun size={26} hot />,
      title: 'Drought stalled your crops',
      detail: `Fields ${e.droughtFields.map((f) => f + 1).join(', ')} lost a day of growth`,
      tone: 'bad',
    });
  if (e.priceShock)
    t('shock', {
      icon: <Coin size={26} />,
      title: e.priceShock === 'UP' ? 'Market boom! Prices doubled' : 'Market crash! Prices halved',
      detail: 'Check the Market before you sell',
      tone: e.priceShock === 'UP' ? 'good' : 'bad',
    });
  return out;
}

export const EventToasts: React.FC = () => {
  const { lastEvent } = useFarmContext();
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    if (!lastEvent) return;
    const fresh = toastsFor(lastEvent);
    if (!fresh.length) return;
    setToasts((list) => {
      const titles = new Set(fresh.map((f) => f.title));
      return [...fresh, ...list.filter((x) => !titles.has(x.title))].slice(0, 3);
    });
    const ids = fresh.map((f) => f.id);
    const timer = window.setTimeout(() => setToasts((list) => list.filter((x) => !ids.includes(x.id))), 3600);
    return () => window.clearTimeout(timer);
  }, [lastEvent]);

  const tone = { good: 'border-[#3f8a2a] bg-[#effae3]', bad: 'border-[#c23a33] bg-[#fdebe9]', info: 'border-[#6b4423] bg-[#fff8e6]' };

  return (
    <div className="fixed right-3 bottom-24 lg:bottom-5 z-[55] flex flex-col-reverse gap-2 w-[300px] max-w-[calc(100vw-24px)] pointer-events-none" aria-live="polite">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ x: 340, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 340, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            className={`flex items-center gap-3 rounded-2xl border-[3px] px-3 py-2 shadow-[0_4px_0_rgba(59,36,18,0.6)] ${tone[t.tone]}`}
          >
            <div className="shrink-0 w-8 grid place-items-center">{t.icon}</div>
            <div className="min-w-0">
              <div className="font-display font-semibold text-[15px] leading-tight text-[#3b2412]">
                {t.ai && <span className="mr-1.5 align-middle rounded-full bg-[#8b6cf0] px-1.5 py-px text-[10px] font-extrabold text-white">AI</span>}
                {t.title}
              </div>
              {t.detail && <div className="text-xs font-semibold text-[#6b4f36] leading-snug">{t.detail}</div>}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

/* ─── FLYING ITEMS (coins → purse, sacks → barn) ─────── */
interface Flyer {
  id: string;
  kind: 'coin' | 'sack';
  from: { x: number; y: number };
  to: { x: number; y: number };
  delay: number;
  lift: number;
  spread: number;
}

function centerOf(selectors: string[]): { x: number; y: number } | null {
  for (const sel of selectors) {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>(sel));
    for (const el of nodes) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }
  }
  return null;
}

export const FlyerLayer: React.FC = () => {
  const { lastEvent } = useFarmContext();
  const [flyers, setFlyers] = useState<Flyer[]>([]);

  useEffect(() => {
    if (!lastEvent) return;
    const mid = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const cash = centerOf(['[data-fx-target="cash"]']) ?? { x: window.innerWidth - 120, y: 30 };
    const barn = centerOf(['[data-fx-target="barn"]', '[data-fx-target="barn-m"]']) ?? cash;
    const add: Flyer[] = [];
    const e = lastEvent;
    const arc = () => ({ lift: 90 + Math.random() * 40, spread: (Math.random() - 0.5) * 60 });

    if (e.harvested) {
      const from = centerOf([`[data-plot="${e.harvested.fieldId}"]`]) ?? mid;
      for (let i = 0; i < 4; i++) add.push({ id: `${e.id}-s${i}`, kind: 'sack', from, to: barn, delay: 1.7 + i * 0.12, ...arc() });
    }
    if (e.sold) {
      const from = centerOf([`[data-fx-source="sell-${e.sold.crop}"]`]) ?? mid;
      for (let i = 0; i < 10; i++) add.push({ id: `${e.id}-c${i}`, kind: 'coin', from, to: cash, delay: i * 0.06, ...arc() });
    }
    if (e.planted) {
      const to = centerOf([`[data-plot="${e.planted.fieldId}"]`]) ?? mid;
      for (let i = 0; i < 4; i++) add.push({ id: `${e.id}-p${i}`, kind: 'coin', from: cash, to, delay: i * 0.08, ...arc() });
    }
    if (!add.length) return;
    setFlyers((f) => [...f, ...add]);
    const t = window.setTimeout(() => setFlyers((f) => f.filter((x) => !add.includes(x))), 3500);
    return () => window.clearTimeout(t);
  }, [lastEvent]);

  return (
    <div className="fixed inset-0 z-[70] pointer-events-none">
      {flyers.map((f) => {
        const peak = Math.min(f.from.y, f.to.y) - f.lift;
        const spread = f.spread;
        return (
          <motion.div
            key={f.id}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            initial={{ left: f.from.x, top: f.from.y, scale: 0.4, opacity: 0 }}
            animate={{
              left: [f.from.x, (f.from.x + f.to.x) / 2 + spread, f.to.x],
              top: [f.from.y, peak, f.to.y],
              scale: [0.6, 1.25, 0.6],
              opacity: [0, 1, 1, 0],
            }}
            transition={{ duration: 0.95, delay: f.delay, ease: 'easeInOut', opacity: { times: [0, 0.1, 0.85, 1], duration: 0.95, delay: f.delay } }}
          >
            {f.kind === 'coin' ? <Coin size={26} /> : <Sack size={30} />}
          </motion.div>
        );
      })}
    </div>
  );
};

/* ─── SEASON END ─────────────────────────────────────── */
const CONFETTI = ['#ffd23f', '#e2524a', '#58a83a', '#43a9e3', '#8b6cf0', '#f5ac15'];

export const SeasonEndModal: React.FC = () => {
  const { isSeasonComplete, metrics, resetFarm, events } = useFarmContext();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!isSeasonComplete) setDismissed(false);
  }, [isSeasonComplete]);

  const open = isSeasonComplete && !!metrics && !dismissed;
  const profit = metrics?.profit ?? 0;
  const pct = (profit / STARTING_CASH) * 100;
  const stars = pct >= 20 ? 3 : pct >= 5 ? 2 : pct > 0 ? 1 : 0;
  const harvests = events.filter((e) => e.harvested).length;
  const sales = events.reduce((s, e) => s + (e.sold?.revenue ?? 0), 0);

  return (
    <AnimatePresence>
      {open && metrics && (
        <motion.div className="fixed inset-0 z-[90] bg-[#3b2412]/60 backdrop-blur-sm grid place-items-center p-4 overflow-hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          {stars > 0 &&
            Array.from({ length: 48 }).map((_, i) => (
              <motion.span
                key={i}
                className="absolute top-0 w-2.5 h-4 rounded-sm"
                style={{ left: `${(i * 21) % 100}%`, background: CONFETTI[i % CONFETTI.length] }}
                initial={{ y: -40, rotate: 0 }}
                animate={{ y: '110vh', rotate: 720, x: [0, (i % 2 ? 40 : -40), 0] }}
                transition={{ duration: 3 + (i % 5) * 0.5, delay: (i % 12) * 0.12, repeat: Infinity, ease: 'linear' }}
              />
            ))}
          <motion.div
            role="dialog"
            aria-modal="true"
            className="panel relative max-w-md w-full p-6 text-center"
            initial={{ scale: 0.5, rotate: -6 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 14 }}
          >
            <button className="absolute right-3 top-3 text-[#9a6a3c] hover:text-[#3b2412]" onClick={() => setDismissed(true)} aria-label="Close">
              <X className="w-5 h-5" />
            </button>
            <div className="ribbon inline-block rounded-xl px-5 py-1 font-display font-bold text-xl text-[#4f3119] -mt-10 mb-3">
              {metrics.survived ? 'Season Complete!' : 'Farm Bankrupt'}
            </div>
            <div className="flex justify-center gap-2 mb-2">
              {[0, 1, 2].map((i) => (
                <motion.div key={i} initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 0.4 + i * 0.25, type: 'spring' }}>
                  <Star className={`w-11 h-11 ${i < stars ? 'fill-[#ffd23f] text-[#b36f00]' : 'fill-[#e9d8b4] text-[#c99a66]'}`} strokeWidth={2} />
                </motion.div>
              ))}
            </div>
            <p className="text-[#6b4f36] font-semibold mb-4">
              {stars === 3 ? 'A legendary harvest — the valley is talking about you!' : stars === 2 ? 'A fine, profitable season.' : stars === 1 ? 'You turned a small profit.' : 'A tough season. Try a new strategy!'}
            </p>
            <div className="grid grid-cols-2 gap-2 mb-5 text-left">
              {[
                ['Final cash', formatMoney(metrics.cash)],
                ['Crops in barn', formatMoney(metrics.inventory_value)],
                ['Net wealth', formatMoney(metrics.total_wealth)],
                ['Profit', formatMoney(profit, { sign: true })],
                ['Harvests', String(harvests)],
                ['Sales income', formatMoney(sales)],
              ].map(([k, v]) => (
                <div key={k} className="panel-inset px-3 py-2">
                  <div className="text-[11px] font-extrabold uppercase tracking-wide text-[#9a6a3c]">{k}</div>
                  <div className="font-display font-bold text-lg text-[#3b2412] tabular">{v}</div>
                </div>
              ))}
            </div>
            <div className="flex gap-2 justify-center flex-wrap">
              <Link to="/journal" className="btn btn-cream" onClick={() => setDismissed(true)}>
                Read journal
              </Link>
              <button className="btn btn-lg" onClick={() => resetFarm()}>
                <RotateCcw className="w-5 h-5" /> New season
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/* ─── LOADING & OFFLINE ──────────────────────────────── */
export const LoadingScreen: React.FC<{ message?: string }> = ({ message = 'Preparing your farm…' }) => (
  <div className="min-h-[70vh] grid place-items-center">
    <div className="text-center">
      <div className="relative mx-auto w-32 h-32">
        <motion.div className="absolute left-1/2 bottom-6 -translate-x-1/2 origin-bottom" animate={{ scaleY: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}>
          <CropSprite crop="Corn" stage="young" className="h-24 w-auto" />
        </motion.div>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-28 h-9 rounded-b-[30px] rounded-t-md bg-[#c25e00] border-[3px] border-[#3b2412]" />
      </div>
      <p className="font-display font-semibold text-xl text-[#3b2412] mt-3">{message}</p>
    </div>
  </div>
);

export const OfflineScreen: React.FC<{ message: string; onRetry: () => void }> = ({ message, onRetry }) => (
  <div className="min-h-[70vh] grid place-items-center p-4">
    <div className="panel max-w-md w-full p-6 text-center">
      <div className="flex justify-center -mt-16 mb-2">
        <Scarecrow size={90} />
      </div>
      <h2 className="font-display font-bold text-2xl text-[#3b2412] mb-1">The farm gate is locked</h2>
      <p className="text-[#6b4f36] mb-1">{message}</p>
      <p className="text-sm text-[#9a6a3c] mb-5">
        Start the backend with <code className="px-1.5 py-0.5 rounded bg-[#fdf0cf] font-mono text-xs">python scripts/run_api.py</code>
      </p>
      <button className="btn btn-lg" onClick={onRetry}>
        <RotateCcw className="w-5 h-5" /> Try again
      </button>
    </div>
  </div>
);

export const ErrorToast: React.FC = () => {
  const { error, dismissError, farmState } = useFarmContext();
  if (!error || !farmState) return null;
  return (
    <div className="fixed left-1/2 -translate-x-1/2 bottom-24 lg:bottom-6 z-[75] w-[min(92vw,460px)]">
      <div className="flex items-start gap-3 rounded-2xl border-[3px] border-[#8f2621] bg-[#fdebe9] px-4 py-3 shadow-[0_4px_0_#8f2621]">
        <Bug size={26} />
        <p className="flex-1 text-sm font-bold text-[#8f2621]">{error}</p>
        <button onClick={dismissError} className="text-[#8f2621]" aria-label="Dismiss">
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
