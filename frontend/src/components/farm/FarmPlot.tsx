import React, { useEffect, useId, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { FieldState, FarmEvent } from '../../types/farm';
import { CropSprite } from '../art/CropSprite';
import { Bug, Combine, SeedBag, Sack } from '../art/Scenery';
import { cropInfo, growthStage, type GrowthStage } from '../../game/crops';

/* Soil geometry in a 200×150 viewBox: a trapezoid seen in gentle perspective. */
const TOP_Y = 34;
const BOTTOM_Y = 140;
const ROWS = [54, 78, 104, 132];
const xLeft = (y: number) => 22 - (22 * (y - TOP_Y)) / (BOTTOM_Y - TOP_Y);

interface PlantSpot {
  x: number;
  y: number;
  scale: number;
  delay: number;
  key: string;
}

function plantSpots(crop: string): PlantSpot[] {
  const perRow = crop === 'Corn' ? 4 : 5;
  const spots: PlantSpot[] = [];
  ROWS.forEach((y, r) => {
    const l = xLeft(y) + 10;
    const w = 200 - 2 * l;
    for (let i = 0; i < perRow; i++) {
      const jitter = ((r * 7 + i * 13) % 5) - 2;
      spots.push({
        x: l + (w * (i + 0.5)) / perRow + jitter,
        y,
        scale: 0.62 + (0.38 * (y - TOP_Y)) / (BOTTOM_Y - TOP_Y),
        delay: -((r * 3 + i * 5) % 9) * 0.4,
        key: `${r}-${i}`,
      });
    }
  });
  return spots;
}

const SPRITE_HEIGHT: Record<string, number> = { Wheat: 44, Rice: 40, Corn: 54 };

export const PlantGrid: React.FC<{ crop: string; stage: GrowthStage; appearDelay?: number; animateIn?: boolean }> = ({
  crop,
  stage,
  appearDelay = 0,
  animateIn = true,
}) => {
  const spots = useMemo(() => plantSpots(crop), [crop]);
  const base = SPRITE_HEIGHT[crop] ?? 44;
  return (
    <>
      {spots.map((s, i) => (
        <motion.div
          key={`${s.key}-${stage}`}
          className="absolute pointer-events-none"
          style={{
            left: `${(s.x / 200) * 100}%`,
            top: `${(s.y / 150) * 100}%`,
            height: `${base * s.scale}%`,
            aspectRatio: '40 / 90',
            translate: '-50% -100%',
            transformOrigin: '50% 100%',
          }}
          initial={animateIn ? { scaleY: 0.3, scaleX: 0.6, opacity: 0 } : false}
          animate={{ scaleY: 1, scaleX: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 220, damping: 14, delay: appearDelay + (i % 7) * 0.035 }}
        >
          <CropSprite
            crop={crop}
            stage={stage}
            className="sway w-full h-full overflow-visible"
            style={{
              ['--sway-delay' as string]: `${s.delay}s`,
              ['--sway-dur' as string]: stage === 'mature' ? '2.6s' : '3.6s',
            }}
          />
        </motion.div>
      ))}
    </>
  );
};

const Soil: React.FC<{ planted: boolean; dry: boolean; paddy: boolean; selected: boolean }> = ({ planted, dry, paddy, selected }) => {
  const top = dry ? '#c9925a' : planted ? '#7a4a24' : '#93592b';
  const bottom = dry ? '#a87443' : planted ? '#5c3519' : '#72421f';
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <svg viewBox="0 0 200 150" className="absolute inset-0 w-full h-full overflow-visible" aria-hidden="true">
      <defs>
        <linearGradient id={`soil-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={top} />
          <stop offset="1" stopColor={bottom} />
        </linearGradient>
        <linearGradient id={`water-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8fd3f4" stopOpacity="0.75" />
          <stop offset="1" stopColor="#3fa3dc" stopOpacity="0.55" />
        </linearGradient>
      </defs>
      {/* grass shadow */}
      <ellipse cx="100" cy="146" rx="104" ry="8" fill="#2f6b1f" opacity="0.35" />
      {/* soil depth edge */}
      <path d={`M0 ${BOTTOM_Y} H200 V${BOTTOM_Y + 8} H0 Z`} fill="#4a2a12" />
      <path
        d={`M22 ${TOP_Y} H178 L200 ${BOTTOM_Y} H0 Z`}
        fill={`url(#soil-${id})`}
        stroke={selected ? '#ffd23f' : '#3b2412'}
        strokeWidth={selected ? 5 : 3}
        strokeLinejoin="round"
      />
      {paddy && (
        <>
          <path d={`M24 ${TOP_Y + 3} H176 L196 ${BOTTOM_Y - 3} H4 Z`} fill={`url(#water-${id})`} />
          {[60, 92, 120].map((y) => (
            <path
              key={y}
              className="ripple"
              d={`M${xLeft(y) + 20} ${y} q10 -3 20 0 t20 0 M${200 - xLeft(y) - 70} ${y + 6} q10 -3 20 0 t20 0`}
              stroke="#fff"
              strokeWidth="1.6"
              fill="none"
              strokeLinecap="round"
            />
          ))}
        </>
      )}
      {!paddy &&
        ROWS.map((y) => (
          <g key={y}>
            <path d={`M${xLeft(y) + 4} ${y + 1} H${200 - xLeft(y) - 4}`} stroke="#3b2412" strokeOpacity="0.35" strokeWidth={3 + (y - TOP_Y) / 40} strokeLinecap="round" />
            <path d={`M${xLeft(y) + 4} ${y - 3} H${200 - xLeft(y) - 4}`} stroke="#fff" strokeOpacity="0.1" strokeWidth="1.5" strokeLinecap="round" />
          </g>
        ))}
      {dry && !paddy && (
        <g stroke="#6b4423" strokeWidth="1.4" fill="none" opacity="0.8">
          <path d="M40 60 l10 8 l-4 10 l12 6" />
          <path d="M120 50 l-6 12 l10 6 l-2 12" />
          <path d="M150 100 l-12 6 l4 12 l-10 8" />
          <path d="M70 110 l8 -8 l12 4" />
        </g>
      )}
    </svg>
  );
};

function FloatText({ text, color, delay = 0 }: { text: string; color: string; delay?: number }) {
  return (
    <motion.div
      className="absolute left-1/2 top-[30%] z-30 font-display font-bold text-lg whitespace-nowrap pointer-events-none"
      style={{ color, translate: '-50% 0', textShadow: '0 2px 0 #fff, 0 -2px 0 #fff, 2px 0 0 #fff, -2px 0 0 #fff' }}
      initial={{ y: 10, opacity: 0, scale: 0.6 }}
      animate={{ y: -46, opacity: [0, 1, 1, 0], scale: 1 }}
      transition={{ duration: 1.8, delay, times: [0, 0.15, 0.75, 1] }}
    >
      {text}
    </motion.div>
  );
}

const PlantFx: React.FC<{ crop: string; cost: number }> = ({ crop, cost }) => {
  const color = cropInfo(crop)?.accent ?? '#58a83a';
  const seeds = useMemo(() => plantSpots(crop), [crop]);
  return (
    <div className="absolute inset-0 z-20 pointer-events-none">
      <motion.div
        className="absolute top-[2%]"
        initial={{ left: '4%', rotate: 0, opacity: 0 }}
        animate={{ left: '78%', rotate: [0, 110, 120, 110], opacity: [0, 1, 1, 0] }}
        transition={{ duration: 1.3, ease: 'easeInOut' }}
      >
        <SeedBag size={34} color={color} />
      </motion.div>
      {seeds.map((s, i) => (
        <motion.span
          key={s.key}
          className="absolute w-1.5 h-1.5 rounded-full bg-[#f3d98f] border border-[#6b4423]"
          style={{ left: `${(s.x / 200) * 100}%` }}
          initial={{ top: '6%', opacity: 0 }}
          animate={{ top: `${(s.y / 150) * 100 - 1}%`, opacity: [0, 1, 1, 0] }}
          transition={{ duration: 0.55, delay: 0.15 + (s.x / 200) * 0.9 + (i % 3) * 0.03, ease: 'easeIn' }}
        />
      ))}
      <FloatText text={`−₹${cost.toLocaleString('en-IN')}`} color="#c23a33" delay={0.2} />
    </div>
  );
};

const HarvestFx: React.FC<{ crop: string; qty: number }> = ({ crop, qty }) => (
  <div className="absolute inset-0 z-20 pointer-events-none">
    <motion.div
      className="absolute inset-0"
      initial={{ clipPath: 'inset(-40% 0% 0% 0%)' }}
      animate={{ clipPath: 'inset(-40% 0% 0% 100%)' }}
      transition={{ duration: 1.5, ease: 'linear', delay: 0.15 }}
    >
      <PlantGrid crop={crop} stage="mature" animateIn={false} />
    </motion.div>
    {/* cut stubble left behind */}
    <motion.div className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 1, 0] }} transition={{ duration: 2.4, times: [0, 0.3, 0.8, 1] }}>
      {ROWS.map((y) => (
        <div
          key={y}
          className="absolute h-[3%] rounded-full"
          style={{ top: `${(y / 150) * 100 - 2}%`, left: `${(xLeft(y) / 200) * 100 + 6}%`, right: `${(xLeft(y) / 200) * 100 + 6}%`, background: 'repeating-linear-gradient(90deg,#d9a521 0 3px, transparent 3px 7px)' }}
        />
      ))}
    </motion.div>
    <motion.div
      className="absolute top-[38%]"
      initial={{ left: '-38%' }}
      animate={{ left: '104%' }}
      transition={{ duration: 1.65, ease: 'linear' }}
    >
      <motion.div animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 0.25 }}>
        <Combine size={96} />
      </motion.div>
    </motion.div>
    {Array.from({ length: 14 }).map((_, i) => (
      <motion.span
        key={i}
        className="absolute w-2 h-1 rounded-sm bg-[#f2c043]"
        style={{ left: `${8 + i * 6.5}%`, top: '60%' }}
        initial={{ opacity: 0, y: 0, rotate: 0 }}
        animate={{ opacity: [0, 1, 0], y: [-4, -38 - (i % 4) * 8, -10], x: [(i % 2 ? 1 : -1) * 4, (i % 2 ? 1 : -1) * 18], rotate: 200 }}
        transition={{ duration: 0.9, delay: 0.15 + i * 0.1 }}
      />
    ))}
    <motion.div
      className="absolute left-1/2 bottom-[8%]"
      style={{ translate: '-50% 0' }}
      initial={{ scale: 0, y: 20 }}
      animate={{ scale: [0, 1.2, 1, 1, 0.4], y: [20, 0, 0, 0, -60], opacity: [1, 1, 1, 1, 0] }}
      transition={{ duration: 2.4, delay: 1.3, times: [0, 0.15, 0.25, 0.7, 1] }}
    >
      <Sack size={46} label={crop.toUpperCase()} />
    </motion.div>
    <FloatText text={`+${qty} ${crop}`} color="#2f6b1f" delay={1.4} />
  </div>
);

const PestFx: React.FC<{ crop: string; ratio: number }> = ({ crop, ratio }) => {
  const days = cropInfo(crop)?.growthDays ?? 5;
  const stage = growthStage(Math.max(1, Math.round(ratio * days)), days, ratio >= 1);
  return (
    <div className="absolute inset-0 z-20 pointer-events-none">
      <motion.div
        className="absolute inset-0"
        style={{ transformOrigin: '50% 100%' }}
        initial={{ filter: 'sepia(0) brightness(1)', opacity: 1, scaleY: 1 }}
        animate={{ filter: 'sepia(1) saturate(0.5) brightness(0.65)', opacity: [1, 1, 0], scaleY: [1, 0.8, 0.25] }}
        transition={{ duration: 2.2, times: [0, 0.6, 1] }}
      >
        <PlantGrid crop={crop} stage={stage} animateIn={false} />
      </motion.div>
      {Array.from({ length: 12 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{ left: `${10 + ((i * 37) % 80)}%`, top: `${20 + ((i * 53) % 60)}%` }}
          initial={{ opacity: 0, scale: 0.3, x: -60 }}
          animate={{ opacity: [0, 1, 1, 0], scale: 1, x: [-60, 0, 0, 80] }}
          transition={{ duration: 2.6, delay: i * 0.05, times: [0, 0.25, 0.8, 1] }}
        >
          <div className="buzz" style={{ ['--buzz-delay' as string]: `${-i * 0.2}s`, ['--buzz-dur' as string]: '0.9s' }}>
            <Bug size={18} />
          </div>
        </motion.div>
      ))}
      <FloatText text="Pests ate the crop!" color="#c23a33" delay={0.3} />
    </div>
  );
};

const DroughtFx: React.FC = () => (
  <div className="absolute inset-0 z-20 pointer-events-none">
    <motion.div
      className="absolute inset-[10%_0_0_0] rounded-3xl"
      style={{ background: 'radial-gradient(ellipse at 50% 60%, rgba(255,140,30,0.55), transparent 70%)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 1, 0.6, 1, 0] }}
      transition={{ duration: 2.2 }}
    />
    <FloatText text="Drought! Growth −1 day" color="#c25e00" delay={0.1} />
  </div>
);

interface FarmPlotProps {
  field: FieldState;
  event: FarmEvent | null;
  selected: boolean;
  dry: boolean;
  aiTarget?: boolean;
  cursor?: string;
  onClick?: () => void;
  compact?: boolean;
}

export const FarmPlot: React.FC<FarmPlotProps> = ({ field, event, selected, dry, aiTarget, cursor = 'pointer', onClick, compact }) => {
  const [fx, setFx] = useState<FarmEvent | null>(null);

  useEffect(() => {
    if (!event) return;
    const touches =
      event.planted?.fieldId === field.id ||
      event.harvested?.fieldId === field.id ||
      event.pestHits.some((p) => p.fieldId === field.id) ||
      event.droughtFields.includes(field.id);
    if (!touches) return;
    setFx(event);
    const t = window.setTimeout(() => setFx(null), 3000);
    return () => window.clearTimeout(t);
  }, [event, field.id]);

  const info = cropInfo(field.crop);
  const isMature = field.state === 'MATURE';
  const stage = info ? growthStage(field.progress, info.growthDays, isMature) : null;
  const pct = info ? Math.min(100, Math.round((field.progress / info.growthDays) * 100)) : 0;
  const pest = fx?.pestHits.find((p) => p.fieldId === field.id);
  const justPlanted = fx?.planted?.fieldId === field.id;

  return (
    <motion.button
      type="button"
      onClick={onClick}
      className="relative w-full aspect-[4/3] block focus:outline-none group"
      style={{ cursor }}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.97 }}
      aria-label={`Field ${field.id + 1}: ${field.crop ? `${field.crop}, ${stage}` : 'empty'}`}
    >
      <Soil planted={!!field.crop} dry={dry} paddy={field.crop === 'Rice'} selected={selected} />

      {field.crop && stage && <PlantGrid crop={field.crop} stage={stage} appearDelay={justPlanted ? 1.05 : 0} />}

      {isMature &&
        [12, 38, 64, 84].map((l, i) => (
          <span
            key={l}
            className="absolute twinkle text-[#fff6b0] pointer-events-none z-10"
            style={{ left: `${l}%`, top: `${18 + (i % 2) * 14}%`, ['--tw-delay' as string]: `${i * 0.45}s`, fontSize: compact ? 10 : 16 }}
          >
            ✦
          </span>
        ))}

      <AnimatePresence>
        {fx && justPlanted && fx.planted && <PlantFx key={`p${fx.id}`} crop={fx.planted.crop} cost={fx.planted.cost} />}
        {fx?.harvested?.fieldId === field.id && <HarvestFx key={`h${fx.id}`} crop={fx.harvested.crop} qty={fx.harvested.qty} />}
        {pest && <PestFx key={`x${fx!.id}`} crop={pest.crop} ratio={pest.ratio} />}
        {fx?.droughtFields.includes(field.id) && <DroughtFx key={`d${fx.id}`} />}
      </AnimatePresence>

      {/* wooden field sign */}
      <div className="absolute left-[2%] bottom-[2%] z-10 pointer-events-none" aria-hidden="true">
        <div className="wood rounded-md px-1.5 py-0.5 font-display font-bold text-[#fff6df] leading-none shadow" style={{ fontSize: compact ? 10 : 13 }}>
          {field.id + 1}
        </div>
        <div className="mx-auto w-1 h-2 bg-[#4f3119]" />
      </div>

      {/* status badge */}
      {!compact && (
        <div className="absolute left-1/2 -top-1 -translate-x-1/2 z-20 pointer-events-none">
          {isMature ? (
            <motion.div
              className="ribbon rounded-full px-3 py-0.5 font-display font-bold text-[#4f3119] text-sm whitespace-nowrap"
              animate={{ y: [0, -5, 0] }}
              transition={{ repeat: Infinity, duration: 1.2 }}
            >
              Ready! ✂
            </motion.div>
          ) : field.crop && info ? (
            <div className="rounded-full bg-[#fff8e6] border-2 border-[#6b4423] px-2.5 py-0.5 shadow-[0_2px_0_#6b4423] flex items-center gap-2 whitespace-nowrap">
              <span className="font-display font-semibold text-xs" style={{ color: info.accent }}>
                {field.crop}
              </span>
              <span className="w-12 h-2 rounded-full bg-[#e9d8b4] overflow-hidden border border-[#c99a66]">
                <span className="block h-full bg-[#58a83a] progress-stripes transition-[width] duration-700" style={{ width: `${pct}%` }} />
              </span>
              <span className="text-[11px] font-bold text-[#6b4f36] tabular">
                {field.progress}/{info.growthDays}d
              </span>
            </div>
          ) : (
            <div className="rounded-full bg-[#fff8e6]/90 border-2 border-dashed border-[#9a6a3c] px-2.5 py-0.5 text-xs font-bold text-[#6b4f36] whitespace-nowrap">
              Empty · plant seeds
            </div>
          )}
        </div>
      )}

      {aiTarget && (
        <motion.div
          className="absolute -right-2 top-[18%] z-30 rounded-full bg-[#8b6cf0] text-white text-[11px] font-bold px-2 py-0.5 border-2 border-[#4b33a6] shadow pointer-events-none"
          animate={{ scale: [1, 1.12, 1] }}
          transition={{ repeat: Infinity, duration: 1 }}
        >
          AI pick
        </motion.div>
      )}
    </motion.button>
  );
};
