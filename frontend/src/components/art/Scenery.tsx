import React from 'react';

/* Shared outline colour so every illustration reads as one art set. */
const OL = '#3b2412';

export type SkyMood = 'day' | 'hot' | 'dusk' | 'night';

const SKY: Record<SkyMood, string> = {
  day: 'linear-gradient(180deg, #5ec2f2 0%, #9fdcf7 55%, #d9f3fb 100%)',
  hot: 'linear-gradient(180deg, #f6b45a 0%, #fbd38a 50%, #fde9b8 100%)',
  dusk: 'linear-gradient(180deg, #5b4b9e 0%, #e27d6a 55%, #fbc68a 100%)',
  night: 'linear-gradient(180deg, #0f1a3d 0%, #263a74 60%, #3d5191 100%)',
};

export const Cloud: React.FC<{ className?: string; style?: React.CSSProperties; scale?: number }> = ({
  className,
  style,
  scale = 1,
}) => (
  <svg viewBox="0 0 120 50" width={120 * scale} height={50 * scale} className={className} style={style} aria-hidden="true">
    <path
      d="M18 44 Q2 44 4 32 Q6 22 20 24 Q22 8 42 10 Q56 0 70 12 Q90 6 94 24 Q114 22 116 36 Q116 46 100 44 Z"
      fill="#fff"
      opacity="0.95"
    />
    <path d="M18 44 Q60 50 100 44" stroke="#d6eef8" strokeWidth="3" fill="none" />
  </svg>
);

export const Sun: React.FC<{ size?: number; hot?: boolean }> = ({ size = 90, hot = false }) => (
  <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
    <g className="spin-slow" style={{ transformOrigin: '50px 50px' }}>
      {Array.from({ length: 12 }).map((_, i) => (
        <rect
          key={i}
          x="47"
          y="2"
          width="6"
          height="16"
          rx="3"
          fill={hot ? '#ff8a1f' : '#ffd23f'}
          transform={`rotate(${i * 30} 50 50)`}
        />
      ))}
    </g>
    <circle cx="50" cy="50" r="27" fill={hot ? '#ffb02e' : '#ffe066'} stroke={hot ? '#e0700a' : '#f5ac15'} strokeWidth="4" />
    <circle cx="41" cy="44" r="6" fill="#fff" opacity="0.45" />
  </svg>
);

export const Moon: React.FC<{ size?: number }> = ({ size = 70 }) => (
  <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
    <circle cx="50" cy="50" r="32" fill="#fdf6d8" />
    <circle cx="64" cy="40" r="28" fill="#263a74" />
    <circle cx="38" cy="60" r="4" fill="#e9dfb4" />
  </svg>
);

export const Bird: React.FC<{ style?: React.CSSProperties }> = ({ style }) => (
  <div className="fly-across absolute" style={style} aria-hidden="true">
    <svg viewBox="0 0 30 14" width="26" height="12" className="flap">
      <path d="M1 8 Q8 0 15 8 Q22 0 29 8" stroke="#3b2412" strokeWidth="2.4" fill="none" strokeLinecap="round" />
    </svg>
  </div>
);

export const Sky: React.FC<{
  mood?: SkyMood;
  children?: React.ReactNode;
  className?: string;
  clouds?: number;
  birds?: boolean;
  showSun?: boolean;
}> = ({ mood = 'day', children, className = '', clouds = 4, birds = true, showSun = true }) => (
  <div className={`absolute inset-0 overflow-hidden ${className}`} style={{ background: SKY[mood], transition: 'background 1s ease' }}>
    {mood === 'night' &&
      Array.from({ length: 40 }).map((_, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-white twinkle"
          style={{
            width: 2 + (i % 3),
            height: 2 + (i % 3),
            left: `${(i * 37) % 100}%`,
            top: `${(i * 23) % 60}%`,
            ['--tw-delay' as string]: `${(i % 7) * 0.3}s`,
          }}
        />
      ))}
    {showSun && (
      <div className="absolute right-[8%] top-[8%]">
        {mood === 'night' ? <Moon /> : <Sun hot={mood === 'hot'} size={mood === 'hot' ? 110 : 90} />}
      </div>
    )}
    {Array.from({ length: clouds }).map((_, i) => (
      <div
        key={i}
        className="absolute drift"
        style={{
          top: `${6 + ((i * 17) % 34)}%`,
          left: 0,
          ['--drift-dur' as string]: `${70 + i * 22}s`,
          ['--drift-delay' as string]: `${-i * 23}s`,
          opacity: mood === 'night' ? 0.25 : mood === 'hot' ? 0.55 : 1,
        }}
      >
        <Cloud scale={0.6 + (i % 3) * 0.25} />
      </div>
    ))}
    {birds && mood !== 'night' && (
      <>
        <Bird style={{ top: '18%', ['--fly-dur' as string]: '24s', ['--fly-delay' as string]: '-4s' }} />
        <Bird style={{ top: '24%', ['--fly-dur' as string]: '24s', ['--fly-delay' as string]: '-5s' }} />
        <Bird style={{ top: '12%', ['--fly-dur' as string]: '31s', ['--fly-delay' as string]: '-16s' }} />
      </>
    )}
    {children}
  </div>
);

export const Hills: React.FC<{ className?: string; tone?: 'green' | 'dry' }> = ({ className = '', tone = 'green' }) => {
  const back = tone === 'dry' ? '#b8c46a' : '#8fd06a';
  const mid = tone === 'dry' ? '#a5b453' : '#6dbb4c';
  const front = tone === 'dry' ? '#93a644' : '#58a83a';
  return (
    <svg viewBox="0 0 1200 220" preserveAspectRatio="none" className={`absolute inset-x-0 bottom-0 w-full ${className}`} aria-hidden="true">
      <path d="M0 120 Q150 40 320 100 T640 90 T960 70 T1200 100 V220 H0Z" fill={back} />
      <path d="M0 150 Q200 90 420 140 T860 120 T1200 140 V220 H0Z" fill={mid} />
      <path d="M0 185 Q300 150 600 180 T1200 175 V220 H0Z" fill={front} />
    </svg>
  );
};

export const Tree: React.FC<{ size?: number; className?: string; style?: React.CSSProperties }> = ({ size = 70, className, style }) => (
  <svg viewBox="0 0 60 80" width={size} height={size * 1.33} className={className} style={style} aria-hidden="true">
    <rect x="26" y="50" width="8" height="28" rx="2" fill="#7a4a24" stroke={OL} strokeWidth="2" />
    <g className="sway" style={{ ['--sway-dur' as string]: '5s' }}>
      <circle cx="30" cy="34" r="22" fill="#4f9a33" stroke={OL} strokeWidth="2.5" />
      <circle cx="19" cy="40" r="13" fill="#58a83a" />
      <circle cx="38" cy="26" r="11" fill="#6cc04a" />
      <circle cx="22" cy="24" r="4" fill="#e2524a" />
      <circle cx="40" cy="42" r="4" fill="#e2524a" />
    </g>
  </svg>
);

export const Barn: React.FC<{ size?: number; className?: string; style?: React.CSSProperties }> = ({ size = 160, className, style }) => (
  <svg viewBox="0 0 160 140" width={size} height={size * 0.875} className={className} style={style} aria-hidden="true">
    <path d="M10 62 L80 14 L150 62 Z" fill="#8f2621" stroke={OL} strokeWidth="3" strokeLinejoin="round" />
    <rect x="18" y="58" width="124" height="78" fill="#d9483f" stroke={OL} strokeWidth="3" />
    {[34, 50, 66, 94, 110, 126].map((x) => (
      <line key={x} x1={x} y1="60" x2={x} y2="134" stroke="#b53a32" strokeWidth="2" />
    ))}
    <rect x="56" y="80" width="48" height="56" fill="#fff6df" stroke={OL} strokeWidth="3" />
    <path d="M56 80 L104 136 M104 80 L56 136" stroke="#d9483f" strokeWidth="5" />
    <rect x="66" y="40" width="28" height="20" rx="3" fill="#fff6df" stroke={OL} strokeWidth="3" />
    <path d="M70 48 h20" stroke="#c99a66" strokeWidth="3" />
    <path d="M6 64 L80 10 L154 64" fill="none" stroke="#fff6df" strokeWidth="5" strokeLinecap="round" />
  </svg>
);

export const Silo: React.FC<{ size?: number; className?: string; style?: React.CSSProperties }> = ({ size = 60, className, style }) => (
  <svg viewBox="0 0 50 130" width={size} height={size * 2.6} className={className} style={style} aria-hidden="true">
    <path d="M5 30 Q25 4 45 30 Z" fill="#9aa7b5" stroke={OL} strokeWidth="3" />
    <rect x="5" y="30" width="40" height="96" fill="#cdd6df" stroke={OL} strokeWidth="3" />
    {[48, 66, 84, 102].map((y) => (
      <line key={y} x1="5" y1={y} x2="45" y2={y} stroke="#9aa7b5" strokeWidth="2" />
    ))}
    <rect x="19" y="36" width="12" height="8" rx="2" fill="#5ec2f2" stroke={OL} strokeWidth="2" />
  </svg>
);

export const Windmill: React.FC<{ size?: number; className?: string; style?: React.CSSProperties; fast?: boolean }> = ({
  size = 110,
  className,
  style,
  fast,
}) => (
  <svg viewBox="0 0 100 160" width={size} height={size * 1.6} className={className} style={style} aria-hidden="true">
    <path d="M38 150 L44 60 L56 60 L62 150 Z" fill="#f3e3c3" stroke={OL} strokeWidth="3" strokeLinejoin="round" />
    <path d="M41 100 h18 M40 125 h20" stroke="#c99a66" strokeWidth="2.5" />
    <rect x="45" y="128" width="10" height="22" fill="#7a4a24" stroke={OL} strokeWidth="2" />
    <path d="M40 62 L50 46 L60 62 Z" fill="#d9483f" stroke={OL} strokeWidth="3" strokeLinejoin="round" />
    <g className={fast ? 'spin-fast' : 'spin-slow'} style={{ transformOrigin: '50px 56px' }}>
      {[0, 90, 180, 270].map((r) => (
        <g key={r} transform={`rotate(${r} 50 56)`}>
          <rect x="47" y="12" width="6" height="44" fill="#9a6a3c" stroke={OL} strokeWidth="1.5" />
          <rect x="53" y="14" width="13" height="36" fill="#fff6df" stroke={OL} strokeWidth="2" />
          <path d="M53 26 h13 M53 38 h13" stroke="#c99a66" strokeWidth="1.5" />
        </g>
      ))}
    </g>
    <circle cx="50" cy="56" r="5" fill="#ffd23f" stroke={OL} strokeWidth="2.5" />
  </svg>
);

export const Fence: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg viewBox="0 0 400 40" preserveAspectRatio="none" className={className} aria-hidden="true">
    <rect x="0" y="12" width="400" height="6" fill="#c99a66" stroke={OL} strokeWidth="1.5" />
    <rect x="0" y="26" width="400" height="6" fill="#c99a66" stroke={OL} strokeWidth="1.5" />
    {Array.from({ length: 11 }).map((_, i) => (
      <path key={i} d={`M${i * 40 + 2} 40 V6 l4 -5 l4 5 V40 Z`} fill="#e0b47e" stroke={OL} strokeWidth="1.5" />
    ))}
  </svg>
);

export const Tractor: React.FC<{ size?: number; className?: string; style?: React.CSSProperties; flip?: boolean }> = ({
  size = 110,
  className,
  style,
  flip,
}) => (
  <svg viewBox="0 0 120 90" width={size} height={size * 0.75} className={className} style={{ ...style, transform: flip ? 'scaleX(-1)' : undefined }} aria-hidden="true">
    <circle cx="22" cy="18" r="5" fill="#cfcfcf" className="smoke" opacity="0.6" />
    <circle cx="22" cy="18" r="5" fill="#cfcfcf" className="smoke" style={{ ['--smoke-delay' as string]: '1.1s' }} opacity="0.6" />
    <rect x="20" y="22" width="6" height="22" fill="#555" stroke={OL} strokeWidth="2" />
    <path d="M14 44 H92 L100 60 H14 Z" fill="#43a9e3" stroke={OL} strokeWidth="3" strokeLinejoin="round" />
    <path d="M56 44 V14 H90 L96 44 Z" fill="#43a9e3" stroke={OL} strokeWidth="3" strokeLinejoin="round" />
    <path d="M62 20 H86 L90 40 H62 Z" fill="#d9f3fb" stroke={OL} strokeWidth="2" />
    <g className="spin-fast" style={{ transformOrigin: '82px 66px' }}>
      <circle cx="82" cy="66" r="20" fill="#3b3b3b" stroke={OL} strokeWidth="3" />
      <circle cx="82" cy="66" r="9" fill="#ffd23f" stroke={OL} strokeWidth="2" />
      <path d="M82 48 V84 M64 66 H100" stroke="#222" strokeWidth="3" />
    </g>
    <g className="spin-fast" style={{ transformOrigin: '28px 72px' }}>
      <circle cx="28" cy="72" r="14" fill="#3b3b3b" stroke={OL} strokeWidth="3" />
      <circle cx="28" cy="72" r="6" fill="#ffd23f" stroke={OL} strokeWidth="2" />
      <path d="M28 59 V85 M15 72 H41" stroke="#222" strokeWidth="2.5" />
    </g>
  </svg>
);

/** Combine harvester used by the harvest animation; reel spins while it drives. */
export const Combine: React.FC<{ size?: number; className?: string; style?: React.CSSProperties }> = ({ size = 120, className, style }) => (
  <svg viewBox="0 0 140 100" width={size} height={size * 0.71} className={className} style={style} aria-hidden="true">
    <path d="M10 50 H80 V80 H10 Z" fill="#ffc93a" stroke={OL} strokeWidth="3" />
    <path d="M30 50 V22 H66 L72 50 Z" fill="#ffc93a" stroke={OL} strokeWidth="3" strokeLinejoin="round" />
    <path d="M36 28 H62 L66 46 H36 Z" fill="#d9f3fb" stroke={OL} strokeWidth="2" />
    <path d="M6 44 L-4 30" stroke={OL} strokeWidth="4" />
    <rect x="80" y="58" width="20" height="14" fill="#9a6a3c" stroke={OL} strokeWidth="2.5" />
    <g className="spin-fast" style={{ transformOrigin: '116px 64px' }}>
      <circle cx="116" cy="64" r="18" fill="none" stroke="#d9483f" strokeWidth="4" />
      {[0, 45, 90, 135].map((r) => (
        <line key={r} x1="98" y1="64" x2="134" y2="64" stroke="#d9483f" strokeWidth="3" transform={`rotate(${r} 116 64)`} />
      ))}
    </g>
    <rect x="96" y="80" width="40" height="8" rx="3" fill="#8f2621" stroke={OL} strokeWidth="2" />
    <circle cx="26" cy="84" r="13" fill="#3b3b3b" stroke={OL} strokeWidth="3" />
    <circle cx="26" cy="84" r="5" fill="#ffd23f" />
    <circle cx="66" cy="86" r="10" fill="#3b3b3b" stroke={OL} strokeWidth="3" />
    <circle cx="66" cy="86" r="4" fill="#ffd23f" />
  </svg>
);

export const Robot: React.FC<{ size?: number; thinking?: boolean; className?: string; mood?: 'happy' | 'idle' }> = ({
  size = 140,
  thinking,
  className,
  mood = 'idle',
}) => (
  <svg viewBox="0 0 120 150" width={size} height={size * 1.25} className={className} aria-hidden="true">
    <line x1="60" y1="18" x2="60" y2="6" stroke={OL} strokeWidth="3" />
    <circle cx="60" cy="6" r="5" fill={thinking ? '#ffd23f' : '#e2524a'} stroke={OL} strokeWidth="2">
      {thinking && <animate attributeName="opacity" values="1;0.3;1" dur="0.6s" repeatCount="indefinite" />}
    </circle>
    {/* straw hat */}
    <ellipse cx="60" cy="22" rx="42" ry="8" fill="#f3d98f" stroke={OL} strokeWidth="2.5" />
    <path d="M36 22 Q38 4 60 4 Q82 4 84 22 Z" fill="#f3d98f" stroke={OL} strokeWidth="2.5" />
    <path d="M37 18 Q60 24 83 18" stroke="#d9483f" strokeWidth="4" fill="none" />
    <rect x="28" y="26" width="64" height="48" rx="14" fill="#cdd6df" stroke={OL} strokeWidth="3" />
    <rect x="36" y="34" width="48" height="30" rx="10" fill="#1f3b52" />
    <g className="blink">
      <circle cx="49" cy="48" r="6" fill="#7cf0c4" />
      <circle cx="71" cy="48" r="6" fill="#7cf0c4" />
    </g>
    <path d={mood === 'happy' ? 'M50 57 Q60 64 70 57' : 'M52 58 H68'} stroke="#7cf0c4" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    <rect x="34" y="80" width="52" height="44" rx="10" fill="#43a9e3" stroke={OL} strokeWidth="3" />
    <path d="M44 80 V124 M76 80 V124" stroke="#1d6797" strokeWidth="3" />
    <rect x="48" y="92" width="24" height="14" rx="3" fill="#fff6df" stroke={OL} strokeWidth="2" />
    <text x="60" y="103" textAnchor="middle" fontSize="9" fontWeight="800" fill="#3b2412" fontFamily="Fredoka, sans-serif">PPO</text>
    <g className="sway" style={{ ['--sway-dur' as string]: '2s' }}>
      <rect x="16" y="82" width="14" height="32" rx="7" fill="#cdd6df" stroke={OL} strokeWidth="2.5" />
    </g>
    <rect x="90" y="82" width="14" height="32" rx="7" fill="#cdd6df" stroke={OL} strokeWidth="2.5" />
    <rect x="40" y="124" width="14" height="20" rx="4" fill="#7a8794" stroke={OL} strokeWidth="2.5" />
    <rect x="66" y="124" width="14" height="20" rx="4" fill="#7a8794" stroke={OL} strokeWidth="2.5" />
  </svg>
);

export const Bug: React.FC<{ size?: number; style?: React.CSSProperties; className?: string }> = ({ size = 16, style, className }) => (
  <svg viewBox="0 0 20 20" width={size} height={size} style={style} className={className} aria-hidden="true">
    <ellipse cx="6" cy="6" rx="5" ry="3" fill="#ffffffaa" className="flap" />
    <ellipse cx="14" cy="6" rx="5" ry="3" fill="#ffffffaa" className="flap" />
    <ellipse cx="10" cy="12" rx="5" ry="6" fill="#4a5d1e" stroke={OL} strokeWidth="1.5" />
    <circle cx="10" cy="6" r="3" fill="#2d3a10" />
  </svg>
);

export const Coin: React.FC<{ size?: number; className?: string }> = ({ size = 22, className }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden="true">
    <circle cx="12" cy="12" r="10" fill="#ffd23f" stroke="#b36f00" strokeWidth="2" />
    <circle cx="12" cy="12" r="6.5" fill="none" stroke="#f5ac15" strokeWidth="1.5" />
    <text x="12" y="16" textAnchor="middle" fontSize="10" fontWeight="900" fill="#b36f00" fontFamily="Nunito, sans-serif">₹</text>
  </svg>
);

export const Sack: React.FC<{ size?: number; label?: string; className?: string; fill?: string }> = ({
  size = 30,
  label,
  className,
  fill = '#e8c995',
}) => (
  <svg viewBox="0 0 40 44" width={size} height={size * 1.1} className={className} aria-hidden="true">
    <path d="M12 8 Q20 2 28 8 L26 13 Q36 20 35 32 Q34 42 20 42 Q6 42 5 32 Q4 20 14 13 Z" fill={fill} stroke={OL} strokeWidth="2.5" strokeLinejoin="round" />
    <path d="M13 13 Q20 16 27 13" stroke={OL} strokeWidth="2" fill="none" />
    {label && (
      <text x="20" y="32" textAnchor="middle" fontSize="9" fontWeight="900" fill="#6b4423" fontFamily="Fredoka, sans-serif">
        {label}
      </text>
    )}
  </svg>
);

export const SeedBag: React.FC<{ size?: number; color?: string; className?: string; style?: React.CSSProperties }> = ({
  size = 40,
  color = '#58a83a',
  className,
  style,
}) => (
  <svg viewBox="0 0 40 48" width={size} height={size * 1.2} className={className} style={style} aria-hidden="true">
    <path d="M6 10 H34 L36 44 H4 Z" fill="#fff6df" stroke={OL} strokeWidth="2.5" strokeLinejoin="round" />
    <path d="M6 10 L10 2 H30 L34 10" fill="#e0b47e" stroke={OL} strokeWidth="2.5" strokeLinejoin="round" />
    <circle cx="20" cy="27" r="9" fill={color} stroke={OL} strokeWidth="2" />
    <path d="M20 33 V24 M20 27 Q15 25 15 21 M20 26 Q25 24 25 20" stroke="#fff" strokeWidth="1.8" fill="none" strokeLinecap="round" />
  </svg>
);

export const Scarecrow: React.FC<{ size?: number; className?: string }> = ({ size = 90, className }) => (
  <svg viewBox="0 0 80 120" width={size} height={size * 1.5} className={className} aria-hidden="true">
    <line x1="40" y1="40" x2="40" y2="118" stroke="#7a4a24" strokeWidth="5" />
    <g className="sway" style={{ ['--sway-dur' as string]: '3s' }}>
      <line x1="6" y1="56" x2="74" y2="56" stroke="#7a4a24" strokeWidth="5" />
      <path d="M22 50 H58 L62 92 H18 Z" fill="#43a9e3" stroke={OL} strokeWidth="2.5" />
      <path d="M28 64 h8 v8 h-8z M46 76 h7 v7 h-7z" fill="#e2524a" stroke={OL} strokeWidth="1.5" />
      <circle cx="40" cy="34" r="15" fill="#f3d98f" stroke={OL} strokeWidth="2.5" />
      <circle cx="35" cy="32" r="2" fill={OL} />
      <circle cx="45" cy="32" r="2" fill={OL} />
      <path d="M34 40 Q40 44 46 40" stroke={OL} strokeWidth="2" fill="none" />
      <path d="M18 22 H62 L56 14 Q40 2 24 14 Z" fill="#9a6a3c" stroke={OL} strokeWidth="2.5" />
    </g>
  </svg>
);
