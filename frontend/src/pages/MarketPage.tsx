import React from 'react';
import { motion } from 'motion/react';
import { TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { useFarmContext } from '../context/FarmContext';
import { PageBanner, SectionTitle } from '../components/game/common';
import { LineChart } from '../components/game/LineChart';
import { CropBadgeArt } from '../components/art/CropSprite';
import { Coin, Sack } from '../components/art/Scenery';
import { CROP_LIST, formatMoney } from '../game/crops';

const MarketStall: React.FC = () => (
  <svg viewBox="0 0 220 150" width="230" height="157" aria-hidden="true">
    <rect x="20" y="40" width="10" height="106" fill="#9a6a3c" stroke="#3b2412" strokeWidth="3" />
    <rect x="190" y="40" width="10" height="106" fill="#9a6a3c" stroke="#3b2412" strokeWidth="3" />
    <path d="M8 44 L24 10 H196 L212 44 Z" fill="#fff6df" stroke="#3b2412" strokeWidth="3" strokeLinejoin="round" />
    {[0, 1, 2, 3, 4].map((i) => (
      <path key={i} d={`M${24 + i * 34.4} 10 H${41 + i * 34.4} L${42 + i * 40.8 - i * 6.4 + 8} 44 H${8 + i * 40.8} Z`} fill="#e2524a" />
    ))}
    <path d="M8 44 Q25 58 42 44 Q59 58 76 44 Q93 58 110 44 Q127 58 144 44 Q161 58 178 44 Q195 58 212 44" fill="#e2524a" stroke="#3b2412" strokeWidth="3" />
    <rect x="16" y="100" width="188" height="46" rx="4" fill="#c99a66" stroke="#3b2412" strokeWidth="3" />
    <path d="M16 116 H204 M16 131 H204" stroke="#9a6a3c" strokeWidth="2" />
    <ellipse cx="60" cy="98" rx="26" ry="10" fill="#f2c043" stroke="#3b2412" strokeWidth="2.5" />
    <ellipse cx="110" cy="96" rx="24" ry="10" fill="#ffd23f" stroke="#3b2412" strokeWidth="2.5" />
    <ellipse cx="160" cy="98" rx="26" ry="10" fill="#f3d98f" stroke="#3b2412" strokeWidth="2.5" />
    <rect x="88" y="62" width="44" height="22" rx="4" fill="#fff6df" stroke="#3b2412" strokeWidth="2.5" />
    <text x="110" y="78" textAnchor="middle" fontSize="13" fontWeight="800" fill="#3b2412" fontFamily="Fredoka, sans-serif">SALE</text>
  </svg>
);

export const MarketPage: React.FC = () => {
  const farm = useFarmContext();
  const { farmState, actions, timeline, isBusy } = farm;
  if (!farmState) return null;
  const shock = farmState.risk_forecasts.price_shock;

  return (
    <div>
      <PageBanner title="Village Market" subtitle="Prices drift every day — sell when the price is right" art={<MarketStall />} />

      {shock && shock !== 'LOW' && (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`mb-5 flex items-center gap-3 rounded-2xl border-[3px] px-4 py-3 ${shock === 'HIGH' ? 'bg-[#fdebe9] border-[#c23a33] text-[#8f2621]' : 'bg-[#fff0c2] border-[#b36f00] text-[#8a5200]'}`}
        >
          <AlertTriangle className="w-6 h-6 shrink-0" />
          <p className="font-bold text-sm">
            {shock} risk of a price shock — prices can suddenly halve or double. Selling now locks in today’s price.
          </p>
        </motion.div>
      )}

      <div className="grid md:grid-cols-3 gap-5">
        {CROP_LIST.map((c, idx) => {
          const price = farmState.market_prices[c.name] ?? c.basePrice;
          const hist = timeline.map((s) => ({ x: s.day, y: s.prices[c.name] ?? c.basePrice }));
          const prev = hist.length > 1 ? hist[hist.length - 2].y : price;
          const change = ((price - prev) / prev) * 100;
          const vsBase = ((price - c.basePrice) / c.basePrice) * 100;
          const qty = farmState.inventory[c.name] ?? 0;
          const sell = actions.find((a) => a.type === 'SELL' && a.crop_name === c.name);
          const up = change >= 0;

          return (
            <motion.div
              key={c.name}
              className="panel overflow-hidden"
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: idx * 0.08, type: 'spring', stiffness: 160, damping: 18 }}
            >
              {/* awning */}
              <div
                className="h-7 border-b-[3px] border-[#3b2412]"
                style={{ background: `repeating-linear-gradient(90deg, ${c.accent} 0 26px, #fff6df 26px 52px)` }}
              />
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl p-1.5 border-[3px] border-[#6b4423] wood">
                    <CropBadgeArt crop={c.name} size={74} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display font-bold text-2xl text-[#3b2412] leading-none">{c.name}</h3>
                    <div className="mt-1 flex items-baseline gap-1">
                      <span className="font-display font-bold text-3xl text-[#3b2412] tabular">₹{price.toFixed(2)}</span>
                      <span className="text-xs font-bold text-[#9a6a3c]">/unit</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-extrabold border-2 ${up ? 'bg-[#e3f5d3] border-[#3f8a2a] text-[#2f6b1f]' : 'bg-[#fdebe9] border-[#c23a33] text-[#8f2621]'}`}>
                        {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {up ? '+' : ''}
                        {change.toFixed(1)}% today
                      </span>
                      <span className="rounded-full px-2 py-0.5 text-[11px] font-extrabold border-2 bg-[#fdf0cf] border-[#c99a66] text-[#6b4f36]">
                        {vsBase >= 0 ? '+' : ''}
                        {vsBase.toFixed(0)}% vs base ₹{c.basePrice}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 panel-inset p-2">
                  <div className="text-[11px] font-extrabold uppercase tracking-wide text-[#9a6a3c] mb-1">{c.name} price this season</div>
                  <LineChart
                    data={hist}
                    height={110}
                    color={c.accent}
                    formatY={(v) => `₹${v.toFixed(1)}`}
                    reference={{ value: c.basePrice, label: 'base' }}
                    ariaLabel={`${c.name} price by day`}
                  />
                </div>

                <div className="mt-4 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Sack size={30} />
                    <div className="leading-tight">
                      <div className="font-display font-bold text-[#3b2412] tabular">{qty} in barn</div>
                      <div className="text-[11px] font-bold text-[#9a6a3c]">worth {formatMoney(qty * price)}</div>
                    </div>
                  </div>
                  <button
                    data-fx-source={`sell-${c.name}`}
                    className="btn btn-gold"
                    disabled={isBusy || !sell?.valid}
                    onClick={() => sell && farm.executeHumanAction(sell.id)}
                    title={qty ? `Sell all ${qty} ${c.name}` : `No ${c.name} to sell`}
                  >
                    <Coin size={20} /> {qty ? `Sell ${formatMoney(qty * price)}` : 'Nothing to sell'}
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-6 panel p-5">
        <SectionTitle>Trader’s tips</SectionTitle>
        <ul className="grid sm:grid-cols-3 gap-3 text-sm font-semibold text-[#6b4f36]">
          <li className="panel-inset p-3">Daily prices drift up to ±5% and stay between 50% and 150% of the base price.</li>
          <li className="panel-inset p-3">Selling sells the whole stack at today’s price, and takes one day.</li>
          <li className="panel-inset p-3">Unsold crops still count toward net wealth at the current price at season end.</li>
        </ul>
      </div>
    </div>
  );
};
