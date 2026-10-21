import React from 'react';
import type { GrowthStage } from '../../game/crops';

/**
 * Hand-built SVG crop sprites. viewBox is 40×90 with the soil line at y=88,
 * so every sprite can be anchored at its bottom-centre.
 */

interface CropSpriteProps {
  crop: string;
  stage: GrowthStage;
  className?: string;
  style?: React.CSSProperties;
}

const leaf = (x: number, y: number, dir: 1 | -1, len: number, lift: number) =>
  `M${x} ${y} Q${x + dir * len * 0.45} ${y - lift - 7} ${x + dir * len} ${y - lift} Q${x + dir * len * 0.5} ${y - lift + 3} ${x} ${y + 2} Z`;

const Sprout: React.FC<{ tint?: string }> = ({ tint = '#6cc04a' }) => (
  <g>
    <ellipse cx="20" cy="88" rx="7" ry="2" fill="#5a3a1c" opacity="0.5" />
    <path d="M20 88 Q20 82 20 76" stroke="#4f9a33" strokeWidth="2.2" strokeLinecap="round" fill="none" />
    <path d="M20 80 Q12 77 9 70 Q16 71 20 80Z" fill={tint} />
    <path d="M20 78 Q28 74 31 67 Q23 69 20 78Z" fill="#58a83a" />
  </g>
);

const Seed: React.FC = () => (
  <g>
    <ellipse cx="20" cy="87" rx="9" ry="3" fill="#5a3a1c" opacity="0.6" />
    <ellipse cx="16" cy="85.5" rx="1.6" ry="1.1" fill="#e8c27a" />
    <ellipse cx="22" cy="86" rx="1.6" ry="1.1" fill="#e8c27a" />
    <ellipse cx="19" cy="84" rx="1.4" ry="1" fill="#d8ac5c" />
  </g>
);

/* ─── WHEAT ─────────────────────────────────────────── */
const WheatHead: React.FC<{ x: number; y: number; ripe: boolean; tilt: number }> = ({ x, y, ripe, tilt }) => {
  const head = ripe ? '#f2c043' : '#a9cf55';
  const grain = ripe ? '#d99a1a' : '#86b13e';
  return (
    <g transform={`rotate(${tilt} ${x} ${y + 10})`}>
      {ripe &&
        [-3, -1, 1, 3].map((dx, i) => (
          <line key={i} x1={x + dx * 0.6} y1={y - 6} x2={x + dx * 1.6} y2={y - 15} stroke="#e8b43a" strokeWidth="0.7" />
        ))}
      <ellipse cx={x} cy={y} rx="3.4" ry="9" fill={head} />
      {[-5, -1.5, 2, 5.5].map((dy, i) => (
        <g key={i}>
          <path d={`M${x} ${y + dy} l-3 -2`} stroke={grain} strokeWidth="0.9" />
          <path d={`M${x} ${y + dy} l3 -2`} stroke={grain} strokeWidth="0.9" />
        </g>
      ))}
    </g>
  );
};

const Wheat: React.FC<{ stage: GrowthStage }> = ({ stage }) => {
  if (stage === 'young') {
    return (
      <g fill="none" strokeLinecap="round">
        {[
          ['M20 88 Q14 70 8 56', '#5aa63a'],
          ['M20 88 Q18 66 16 48', '#6cc04a'],
          ['M20 88 Q22 64 24 46', '#58a83a'],
          ['M20 88 Q27 70 33 57', '#6cc04a'],
          ['M20 88 Q20 70 20 52', '#4f9a33'],
        ].map(([d, c], i) => (
          <path key={i} d={d} stroke={c} strokeWidth="2.6" />
        ))}
      </g>
    );
  }
  const ripe = stage === 'mature';
  const stalk = ripe ? '#d9a521' : '#7fb24a';
  const blade = ripe ? '#c9a23a' : '#6cb446';
  return (
    <g strokeLinecap="round">
      <path d="M20 88 Q12 76 6 68" stroke={blade} strokeWidth="2.2" fill="none" />
      <path d="M20 88 Q28 77 34 70" stroke={blade} strokeWidth="2.2" fill="none" />
      <path d="M13 88 Q12 56 11 26" stroke={stalk} strokeWidth="1.8" fill="none" />
      <path d="M20 88 Q20 52 20 18" stroke={stalk} strokeWidth="1.8" fill="none" />
      <path d="M27 88 Q28 58 29 30" stroke={stalk} strokeWidth="1.8" fill="none" />
      <WheatHead x={11} y={20} ripe={ripe} tilt={ripe ? -10 : -4} />
      <WheatHead x={20} y={12} ripe={ripe} tilt={ripe ? 6 : 2} />
      <WheatHead x={29} y={24} ripe={ripe} tilt={ripe ? 14 : 5} />
    </g>
  );
};

/* ─── RICE ──────────────────────────────────────────── */
const Rice: React.FC<{ stage: GrowthStage }> = ({ stage }) => {
  const tall = stage === 'ripening' || stage === 'mature';
  const ripe = stage === 'mature';
  const top = tall ? 26 : 44;
  const bladeA = ripe ? '#b8bf45' : '#5cb646';
  const bladeB = ripe ? '#a7b03c' : '#47a03a';
  const blades = [
    [6, top + 22],
    [11, top + 6],
    [16, top - 2],
    [20, top - 6],
    [24, top - 1],
    [29, top + 7],
    [34, top + 20],
  ];
  return (
    <g strokeLinecap="round" fill="none">
      {blades.map(([x, y], i) => (
        <path key={i} d={`M20 88 Q${(20 + x) / 2} ${(88 + y) / 2 - 4} ${x} ${y}`} stroke={i % 2 ? bladeA : bladeB} strokeWidth="2.3" />
      ))}
      {tall &&
        [
          { sx: 17, sy: top + 4, ex: 7, ey: top + 22 },
          { sx: 22, sy: top + 2, ex: 33, ey: top + 18 },
          { sx: 20, sy: top - 2, ex: 26, ey: top + 24 },
        ].map((p, i) => {
          const d = `M${p.sx} ${p.sy} Q${(p.sx + p.ex) / 2} ${p.sy - 8} ${p.ex} ${p.ey}`;
          const grain = ripe ? '#e9b93a' : '#9ccc5a';
          return (
            <g key={i}>
              <path d={d} stroke={ripe ? '#c99a2e' : '#7fb24a'} strokeWidth="1.2" />
              {[0.35, 0.5, 0.65, 0.8, 0.95].map((t) => {
                const mx = (p.sx + p.ex) / 2;
                const my = p.sy - 8;
                const x = (1 - t) * (1 - t) * p.sx + 2 * (1 - t) * t * mx + t * t * p.ex;
                const y = (1 - t) * (1 - t) * p.sy + 2 * (1 - t) * t * my + t * t * p.ey;
                return <ellipse key={t} cx={x} cy={y} rx="1.5" ry="2.3" fill={grain} />;
              })}
            </g>
          );
        })}
    </g>
  );
};

/* ─── CORN ──────────────────────────────────────────── */
const Corn: React.FC<{ stage: GrowthStage }> = ({ stage }) => {
  if (stage === 'young') {
    return (
      <g>
        <path d="M20 88 L20 52" stroke="#4f9a33" strokeWidth="3" strokeLinecap="round" />
        <path d={leaf(20, 80, -1, 17, 6)} fill="#58a83a" />
        <path d={leaf(20, 72, 1, 17, 8)} fill="#6cc04a" />
        <path d={leaf(20, 62, -1, 14, 8)} fill="#6cc04a" />
        <path d="M20 54 Q18 46 20 40 Q22 46 20 54Z" fill="#7cc451" />
      </g>
    );
  }
  const ripe = stage === 'mature';
  const stalk = ripe ? '#8fae3c' : '#4f9a33';
  const l1 = ripe ? '#a5b84a' : '#58a83a';
  const l2 = ripe ? '#b7c157' : '#6cc04a';
  return (
    <g>
      <path d="M20 88 L20 12" stroke={stalk} strokeWidth="3.4" strokeLinecap="round" />
      <path d={leaf(20, 82, -1, 18, 5)} fill={l1} />
      <path d={leaf(20, 70, 1, 19, 7)} fill={l2} />
      <path d={leaf(20, 56, -1, 18, 8)} fill={l2} />
      <path d={leaf(20, 42, 1, 16, 8)} fill={l1} />
      <path d={leaf(20, 28, -1, 13, 7)} fill={l2} />
      {/* tassel */}
      <g stroke={ripe ? '#e3b23c' : '#a9cf55'} strokeWidth="1.3" strokeLinecap="round">
        <path d="M20 14 L20 3" />
        <path d="M20 9 L15 4" />
        <path d="M20 9 L25 4" />
        <path d="M20 12 L13 9" />
        <path d="M20 12 L27 9" />
      </g>
      {/* cob */}
      <g transform="rotate(-18 24 52)">
        <ellipse cx="25" cy="50" rx={ripe ? 4.4 : 3.2} ry={ripe ? 10 : 7.5} fill={ripe ? '#ffd23f' : '#cfe28a'} />
        {ripe &&
          [-6, -3, 0, 3, 6].map((dy) => (
            <path key={dy} d={`M21.5 ${50 + dy} L28.5 ${50 + dy}`} stroke="#e8a817" strokeWidth="0.6" />
          ))}
        <path d="M20 60 Q19 48 22 40 Q22 52 25 61Z" fill={ripe ? '#7fa83a' : '#5aa63a'} />
        <path d="M30 60 Q31 50 28 41 Q28 52 25 61Z" fill={ripe ? '#93b648' : '#6cb446'} />
        {ripe && <path d="M25 40 Q24 34 22 31 M25 40 Q26 34 28 32" stroke="#a5651d" strokeWidth="0.8" fill="none" />}
      </g>
    </g>
  );
};

export const CropSprite: React.FC<CropSpriteProps> = ({ crop, stage, className, style }) => {
  let body: React.ReactNode;
  if (stage === 'seed') body = <Seed />;
  else if (stage === 'sprout') body = <Sprout tint={crop === 'Rice' ? '#7cd05a' : '#6cc04a'} />;
  else if (crop === 'Wheat') body = <Wheat stage={stage} />;
  else if (crop === 'Rice') body = <Rice stage={stage} />;
  else body = <Corn stage={stage} />;

  return (
    <svg viewBox="0 0 40 90" className={className} style={style} aria-hidden="true">
      {body}
    </svg>
  );
};

/** Bigger standalone crop illustration for cards and almanac entries. */
export const CropBadgeArt: React.FC<{ crop: string; size?: number; stage?: GrowthStage; animated?: boolean }> = ({
  crop,
  size = 72,
  stage = 'mature',
  animated = true,
}) => (
  <div className="relative flex items-end justify-center" style={{ width: size, height: size }}>
    {[-0.28, 0, 0.28].map((off, i) => (
      <CropSprite
        key={i}
        crop={crop}
        stage={stage}
        className={animated ? 'sway absolute bottom-0' : 'absolute bottom-0'}
        style={{
          height: size * (i === 1 ? 1 : 0.82),
          left: `${50 + off * 100}%`,
          translate: '-50% 0',
          ['--sway-delay' as string]: `${i * -0.7}s`,
          zIndex: i === 1 ? 2 : 1,
        }}
      />
    ))}
  </div>
);
