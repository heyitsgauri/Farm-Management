import React from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Store } from 'lucide-react';
import { useFarmContext } from '../context/FarmContext';
import { PageBanner, SectionTitle, StatTile } from '../components/game/common';
import { Barn, Sack, Coin } from '../components/art/Scenery';
import { CropBadgeArt } from '../components/art/CropSprite';
import { CROP_LIST, formatMoney } from '../game/crops';

const GRAIN: Record<string, [string, string]> = {
  Wheat: ['#f6cf5a', '#d99a1a'],
  Rice: ['#f7efd2', '#d8c48f'],
  Corn: ['#ffd23f', '#e8a817'],
};

/** A storage bin whose grain level fills with an animated wave. */
const StorageBin: React.FC<{ crop: string; fill: number }> = ({ crop, fill }) => {
  const [light, dark] = GRAIN[crop] ?? GRAIN.Wheat;
  const level = 162 - 130 * fill;
  return (
    <svg viewBox="0 0 120 170" className="w-full max-w-[150px] mx-auto" aria-hidden="true">
      <defs>
        <clipPath id={`bin-${crop}`}>
          <path d="M14 32 Q60 6 106 32 V156 Q60 168 14 156 Z" />
        </clipPath>
      </defs>
      <path d="M14 32 Q60 6 106 32 V156 Q60 168 14 156 Z" fill="#e6ecf1" />
      <g clipPath={`url(#bin-${crop})`}>
        <motion.g initial={{ y: 150 }} animate={{ y: level }} transition={{ type: 'spring', stiffness: 40, damping: 12 }}>
          <motion.path
            d="M-60 4 Q-45 -4 -30 4 T0 4 T30 4 T60 4 T90 4 T120 4 T150 4 T180 4 V200 H-60 Z"
            fill={light}
            animate={{ x: [0, 60] }}
            transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
          />
          {Array.from({ length: 22 }).map((_, i) => (
            <ellipse key={i} cx={10 + ((i * 23) % 100)} cy={14 + ((i * 17) % 120)} rx="2.2" ry="1.4" fill={dark} />
          ))}
        </motion.g>
      </g>
      <path d="M14 32 Q60 6 106 32 V156 Q60 168 14 156 Z" fill="none" stroke="#3b2412" strokeWidth="4" />
      {[60, 92, 124].map((y) => (
        <path key={y} d={`M14 ${y} Q60 ${y + 10} 106 ${y}`} stroke="#9aa7b5" strokeWidth="2" fill="none" opacity="0.6" />
      ))}
      <path d="M8 34 Q60 0 112 34" stroke="#8f2621" strokeWidth="8" fill="none" strokeLinecap="round" />
    </svg>
  );
};

export const BarnPage: React.FC = () => {
  const { farmState, metrics, events } = useFarmContext();
  if (!farmState) return null;

  const total = CROP_LIST.reduce((s, c) => s + (farmState.inventory[c.name] ?? 0), 0);
  const value = metrics?.inventory_value ?? 0;
  const harvests = events.filter((e) => e.harvested);
  const capacity = Math.max(300, ...CROP_LIST.map((c) => farmState.inventory[c.name] ?? 0));

  return (
    <div>
      <PageBanner title="The Big Red Barn" subtitle="Everything you harvest is stored here until you sell it" art={<Barn size={190} />} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatTile label="Units stored" value={total.toLocaleString('en-IN')} icon={<Sack size={36} />} />
        <StatTile label="Barn value today" value={formatMoney(value)} icon={<Coin size={36} />} hint="At current market prices" />
        <StatTile label="Harvests this season" value={harvests.length} icon={<CropBadgeArt crop="Wheat" size={40} />} />
      </div>

      <div className="wood rounded-[28px] p-4 sm:p-6 shadow-[0_6px_0_#3b2412]">
        <div className="grid sm:grid-cols-3 gap-4">
          {CROP_LIST.map((c, i) => {
            const qty = farmState.inventory[c.name] ?? 0;
            const price = farmState.market_prices[c.name] ?? c.basePrice;
            return (
              <motion.div
                key={c.name}
                className="panel p-4 text-center"
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: i * 0.1 }}
              >
                <div className="flex items-center justify-center gap-2 mb-1">
                  <CropBadgeArt crop={c.name} size={36} />
                  <h3 className="font-display font-bold text-2xl text-[#3b2412]">{c.name}</h3>
                </div>
                <StorageBin crop={c.name} fill={Math.min(1, qty / capacity)} />
                <div className="font-display font-bold text-3xl text-[#3b2412] tabular mt-1">{qty}</div>
                <div className="text-xs font-bold text-[#9a6a3c]">units · worth {formatMoney(qty * price)}</div>
              </motion.div>
            );
          })}
        </div>
        <div className="flex justify-center mt-5">
          <Link to="/market" className="btn btn-gold btn-lg">
            <Store className="w-5 h-5" /> Take crops to market
          </Link>
        </div>
      </div>

      <div className="panel p-5 mt-6">
        <SectionTitle>Harvest log</SectionTitle>
        {harvests.length === 0 ? (
          <p className="text-[#6b4f36] font-semibold">No harvests yet. Grow a crop to full size, then use the sickle on the Farm page.</p>
        ) : (
          <ul className="divide-y-2 divide-dashed divide-[#e2c48d]">
            {harvests.map((e) => (
              <li key={e.id} className="flex items-center gap-3 py-2">
                <Sack size={26} />
                <span className="font-bold text-[#3b2412] flex-1">
                  {e.harvested!.qty} {e.harvested!.crop} from Field {e.harvested!.fieldId + 1}
                </span>
                <span className="text-xs font-extrabold text-[#9a6a3c]">Day {e.dayFrom}</span>
                <span className={`text-xs font-extrabold rounded-full px-2 py-0.5 ${e.actor === 'PPO AI' ? 'bg-[#efe9ff] text-[#4b33a6]' : 'bg-[#e3f5d3] text-[#2f6b1f]'}`}>
                  {e.actor === 'PPO AI' ? 'AI' : 'You'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
