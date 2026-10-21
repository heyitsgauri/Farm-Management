import React from 'react';
import { motion } from 'motion/react';
import { useFarmContext } from '../context/FarmContext';
import { PageBanner, SectionTitle } from '../components/game/common';
import { Bug, Coin, Sun } from '../components/art/Scenery';

const LEVELS = ['LOW', 'MEDIUM', 'HIGH'] as const;
const ANGLE: Record<string, number> = { LOW: -60, MEDIUM: 0, HIGH: 60 };
const LEVEL_UI: Record<string, { bg: string; ink: string; border: string; label: string }> = {
  LOW: { bg: '#e3f5d3', ink: '#2f6b1f', border: '#3f8a2a', label: 'Low' },
  MEDIUM: { bg: '#fff0c2', ink: '#8a5200', border: '#b36f00', label: 'Medium' },
  HIGH: { bg: '#fdebe9', ink: '#8f2621', border: '#c23a33', label: 'High' },
};

const Anemometer: React.FC = () => (
  <svg viewBox="0 0 140 170" width="150" height="182" aria-hidden="true">
    <rect x="66" y="60" width="8" height="106" fill="#9aa7b5" stroke="#3b2412" strokeWidth="3" />
    <rect x="44" y="150" width="52" height="16" rx="4" fill="#9a6a3c" stroke="#3b2412" strokeWidth="3" />
    <g className="spin-fast" style={{ transformOrigin: '70px 56px' }}>
      {[0, 120, 240].map((r) => (
        <g key={r} transform={`rotate(${r} 70 56)`}>
          <line x1="70" y1="56" x2="70" y2="16" stroke="#3b2412" strokeWidth="3" />
          <path d="M70 12 a10 10 0 0 1 16 8 h-16 z" fill="#e2524a" stroke="#3b2412" strokeWidth="2.5" />
        </g>
      ))}
    </g>
    <circle cx="70" cy="56" r="7" fill="#ffd23f" stroke="#3b2412" strokeWidth="3" />
    <rect x="80" y="96" width="44" height="30" rx="6" fill="#fff6df" stroke="#3b2412" strokeWidth="3" />
    <path d="M86 116 l8 -8 l8 6 l12 -10" stroke="#3fa3dc" strokeWidth="3" fill="none" strokeLinecap="round" />
  </svg>
);

const Gauge: React.FC<{ level: string }> = ({ level }) => (
  <svg viewBox="0 0 160 96" className="w-full max-w-[220px] mx-auto" aria-hidden="true">
    <path d="M14 86 A66 66 0 0 1 47 29" stroke="#7cc451" strokeWidth="16" fill="none" />
    <path d="M51 27 A66 66 0 0 1 109 27" stroke="#ffcb3d" strokeWidth="16" fill="none" />
    <path d="M113 29 A66 66 0 0 1 146 86" stroke="#e2524a" strokeWidth="16" fill="none" />
    <path d="M6 86 A74 74 0 0 1 154 86" stroke="#3b2412" strokeWidth="3" fill="none" />
    <motion.g
      style={{ transformOrigin: '80px 86px' }}
      initial={{ rotate: -90 }}
      animate={{ rotate: ANGLE[level] ?? -60 }}
      transition={{ type: 'spring', stiffness: 60, damping: 7 }}
    >
      <path d="M80 86 L76 82 L80 30 L84 82 Z" fill="#3b2412" />
    </motion.g>
    <circle cx="80" cy="86" r="8" fill="#ffd23f" stroke="#3b2412" strokeWidth="3" />
  </svg>
);

const RISKS = [
  {
    key: 'drought',
    title: 'Drought',
    icon: <Sun size={44} hot />,
    effect: 'When a drought hits, every planted field loses one day of growth progress.',
    advice: 'Prefer fast crops like Wheat when the forecast is high.',
  },
  {
    key: 'pest',
    title: 'Pest outbreak',
    icon: <Bug size={44} />,
    effect: 'An outbreak wipes out one random planted field — growing or ready.',
    advice: 'Harvest ripe fields quickly; spread risk across fields.',
  },
  {
    key: 'price_shock',
    title: 'Price shock',
    icon: <Coin size={44} />,
    effect: 'A shock instantly halves or doubles every crop price at the market.',
    advice: 'High forecast? Decide whether to lock in today’s price.',
  },
];

export const WeatherPage: React.FC = () => {
  const { farmState, timeline, events } = useFarmContext();
  if (!farmState) return null;
  const risks = farmState.risk_forecasts;
  const hot = risks.drought === 'HIGH';
  const happenings = events.filter((e) => e.pestHits.length || e.droughtFields.length || e.priceShock);

  return (
    <div>
      <PageBanner title="Weather Station" subtitle="Tomorrow’s forecast for drought, pests and the market" mood={hot ? 'hot' : 'day'} art={<Anemometer />} />

      <div className="grid md:grid-cols-3 gap-5">
        {RISKS.map((r, i) => {
          const lvl = risks[r.key] ?? 'LOW';
          const ui = LEVEL_UI[lvl] ?? LEVEL_UI.LOW;
          return (
            <motion.div key={r.key} className="panel p-5" initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: i * 0.1 }}>
              <div className="flex items-center gap-3 mb-2">
                <motion.div animate={lvl === 'HIGH' ? { rotate: [-8, 8, -8] } : {}} transition={{ repeat: Infinity, duration: 0.6 }}>
                  {r.icon}
                </motion.div>
                <h3 className="font-display font-bold text-2xl text-[#3b2412]">{r.title}</h3>
              </div>
              <Gauge level={lvl} />
              <div className="flex justify-center -mt-1 mb-3">
                <span className="rounded-full border-[3px] px-4 py-1 font-display font-bold text-lg" style={{ background: ui.bg, color: ui.ink, borderColor: ui.border }}>
                  {ui.label} risk
                </span>
              </div>
              <p className="text-sm font-semibold text-[#6b4f36]">{r.effect}</p>
              <p className="text-sm font-bold text-[#3b2412] mt-2">Tip: {r.advice}</p>
            </motion.div>
          );
        })}
      </div>

      {/* forecast history strip */}
      <div className="panel p-5 mt-6">
        <SectionTitle
          right={
            <div className="flex gap-3 text-xs font-bold text-[#6b4f36]">
              {LEVELS.map((l) => (
                <span key={l} className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-sm border-2" style={{ background: LEVEL_UI[l].bg, borderColor: LEVEL_UI[l].border }} />
                  {LEVEL_UI[l].label}
                </span>
              ))}
            </div>
          }
        >
          Forecast history
        </SectionTitle>
        <div className="overflow-x-auto no-scrollbar">
          <table className="border-separate border-spacing-1 text-xs font-bold text-[#6b4f36]">
            <tbody>
              {RISKS.map((r) => (
                <tr key={r.key}>
                  <th className="text-left pr-2 whitespace-nowrap font-extrabold text-[#3b2412]">{r.title}</th>
                  {timeline.map((s) => {
                    const lvl = s.risks[r.key] ?? 'LOW';
                    const ui = LEVEL_UI[lvl] ?? LEVEL_UI.LOW;
                    return (
                      <td
                        key={s.day}
                        title={`Day ${s.day}: ${ui.label}`}
                        className="w-6 h-6 min-w-6 rounded-md border-2 text-center text-[9px]"
                        style={{ background: ui.bg, borderColor: ui.border, color: ui.ink }}
                      >
                        {lvl[0]}
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr>
                <th />
                {timeline.map((s) => (
                  <td key={s.day} className="text-center text-[10px] text-[#9a6a3c]">
                    {s.day}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel p-5 mt-6">
        <SectionTitle>What actually happened</SectionTitle>
        {happenings.length === 0 ? (
          <p className="text-[#6b4f36] font-semibold">Clear skies so far — no droughts, pests or market shocks have hit your farm.</p>
        ) : (
          <ul className="space-y-2">
            {happenings.map((e) => (
              <li key={e.id} className="panel-inset flex flex-wrap items-center gap-2 px-3 py-2 text-sm font-bold text-[#3b2412]">
                <span className="text-xs font-extrabold text-[#9a6a3c] w-14">Day {e.dayFrom}</span>
                {e.pestHits.map((p) => (
                  <span key={p.fieldId} className="flex items-center gap-1">
                    <Bug size={18} /> Pests destroyed {p.crop} in Field {p.fieldId + 1}
                  </span>
                ))}
                {e.droughtFields.length > 0 && (
                  <span className="flex items-center gap-1">
                    <Sun size={18} hot /> Drought slowed fields {e.droughtFields.map((f) => f + 1).join(', ')}
                  </span>
                )}
                {e.priceShock && (
                  <span className="flex items-center gap-1">
                    <Coin size={18} /> Prices {e.priceShock === 'UP' ? 'doubled' : 'halved'}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
