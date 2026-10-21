import React from 'react';
import { motion } from 'motion/react';
import { useFarmContext } from '../context/FarmContext';
import { PageBanner, SectionTitle, StatTile } from '../components/game/common';
import { LineChart } from '../components/game/LineChart';
import { Bug, Coin, Sack, SeedBag, Sun } from '../components/art/Scenery';
import { cropInfo, formatMoney, STARTING_CASH } from '../game/crops';
import type { FarmEvent } from '../types/farm';

const Book: React.FC = () => (
  <svg viewBox="0 0 180 130" width="190" height="137" aria-hidden="true">
    <path d="M90 22 Q50 4 10 16 V118 Q50 106 90 122 Z" fill="#fff6df" stroke="#3b2412" strokeWidth="3.5" strokeLinejoin="round" />
    <path d="M90 22 Q130 4 170 16 V118 Q130 106 90 122 Z" fill="#fffcf2" stroke="#3b2412" strokeWidth="3.5" strokeLinejoin="round" />
    {[38, 52, 66, 80, 94].map((y) => (
      <g key={y}>
        <path d={`M22 ${y} Q50 ${y - 6} 80 ${y + 2}`} stroke="#c99a66" strokeWidth="2" fill="none" />
        <path d={`M100 ${y + 2} Q130 ${y - 6} 158 ${y}`} stroke="#c99a66" strokeWidth="2" fill="none" />
      </g>
    ))}
    <path d="M130 0 V40 l8 -8 l8 8 V0" fill="#e2524a" stroke="#3b2412" strokeWidth="2.5" />
  </svg>
);

function entryIcon(e: FarmEvent) {
  if (e.pestHits.length) return <Bug size={26} />;
  if (e.planted) return <SeedBag size={24} color={cropInfo(e.planted.crop)?.accent} />;
  if (e.harvested) return <Sack size={26} />;
  if (e.sold) return <Coin size={26} />;
  return <Sun size={26} hot={e.droughtFields.length > 0} />;
}

function entryText(e: FarmEvent): string {
  const who = e.actor === 'PPO AI' ? 'The AI farmer' : 'I';
  let s: string;
  if (e.invalid) s = `${who} tried to ${e.actionLabel.toLowerCase()}, but it didn't work out.`;
  else if (e.planted) s = `${who} planted ${e.planted.crop} in Field ${e.planted.fieldId + 1} for ${formatMoney(e.planted.cost)}.`;
  else if (e.harvested) s = `${who} harvested ${e.harvested.qty} ${e.harvested.crop} from Field ${e.harvested.fieldId + 1}.`;
  else if (e.sold) s = `${who} sold ${e.sold.qty} ${e.sold.crop} for ${formatMoney(e.sold.revenue)}.`;
  else s = `${who} rested and watched the crops grow.`;
  if (e.pestHits.length) s += ` Pests destroyed ${e.pestHits.map((p) => `the ${p.crop} in Field ${p.fieldId + 1}`).join(' and ')}.`;
  if (e.droughtFields.length) s += ' A drought stunted the crops.';
  if (e.priceShock) s += e.priceShock === 'UP' ? ' Market prices doubled overnight!' : ' Market prices crashed overnight.';
  return s;
}

export const JournalPage: React.FC = () => {
  const { events, timeline, metrics } = useFarmContext();
  const wealth = timeline.map((s) => ({ x: s.day, y: s.wealth }));
  const harvested = events.reduce((s, e) => s + (e.harvested?.qty ?? 0), 0);
  const income = events.reduce((s, e) => s + (e.sold?.revenue ?? 0), 0);
  const best = events.reduce<FarmEvent | null>((b, e) => (!b || e.reward > b.reward ? e : b), null);
  const profit = metrics?.profit ?? 0;

  return (
    <div>
      <PageBanner title="Farm Journal" subtitle="Your season, day by day" art={<Book />} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatTile label="Season profit" value={formatMoney(profit, { sign: true })} hint={`${((profit / STARTING_CASH) * 100).toFixed(1)}% on ₹10,000`} />
        <StatTile label="Units harvested" value={harvested.toLocaleString('en-IN')} />
        <StatTile label="Sales income" value={formatMoney(income)} />
        <StatTile label="Best day" value={best ? `+${best.reward.toFixed(0)}` : '—'} hint={best ? `Day ${best.dayFrom}: ${best.actionLabel}` : 'No moves yet'} />
      </div>

      <div className="panel p-5 mb-6">
        <SectionTitle>Net wealth by day</SectionTitle>
        {wealth.length < 2 ? (
          <p className="text-[#6b4f36] font-semibold">Play a few days and your wealth curve will grow here.</p>
        ) : (
          <LineChart
            data={wealth}
            height={240}
            color="#3f8a2a"
            formatY={(v) => `₹${Math.round(v).toLocaleString('en-IN')}`}
            reference={{ value: STARTING_CASH, label: 'Starting cash' }}
            ariaLabel="Net wealth by day"
          />
        )}
      </div>

      <div
        className="rounded-[24px] border-[3px] border-[#3b2412] shadow-[0_6px_0_#3b2412] p-5 sm:p-7"
        style={{
          background: 'repeating-linear-gradient(180deg, #fffcf2 0 35px, #e8d9b8 35px 36px), #fffcf2',
          backgroundPosition: '0 14px',
        }}
      >
        <SectionTitle>Diary</SectionTitle>
        {events.length === 0 ? (
          <p className="text-[#6b4f36] font-semibold">The pages are empty. Head to the Farm and make your first move!</p>
        ) : (
          <ol className="space-y-1">
            {events.map((e, i) => (
              <motion.li
                key={e.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(i, 12) * 0.03 }}
                className="flex items-start gap-3 min-h-[36px] py-1"
              >
                <span className="font-display font-bold text-[#c23a33] w-14 shrink-0 pt-0.5">Day {e.dayFrom}</span>
                <span className="shrink-0">{entryIcon(e)}</span>
                <span className="flex-1 font-semibold text-[#3b2412] pt-0.5" style={{ fontFamily: 'Fredoka, sans-serif' }}>
                  {entryText(e)}
                </span>
                <span className={`shrink-0 text-xs font-extrabold tabular pt-1 ${e.reward >= 0 ? 'text-[#2f6b1f]' : 'text-[#8f2621]'}`}>
                  {e.reward >= 0 ? '+' : ''}
                  {e.reward.toFixed(0)}
                </span>
              </motion.li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
};
