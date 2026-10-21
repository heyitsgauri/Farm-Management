import React, { useId, useMemo, useRef, useState } from 'react';

export interface Point {
  x: number;
  y: number;
}

interface LineChartProps {
  data: Point[];
  height?: number;
  color: string;
  formatY: (v: number) => string;
  formatX?: (v: number) => string;
  /** Dashed horizontal reference (e.g. starting cash or base price). */
  reference?: { value: number; label: string };
  axes?: boolean;
  ariaLabel: string;
}

/** Single-series line/area chart with a hover crosshair. Values stay in ink colours; the line carries identity. */
export const LineChart: React.FC<LineChartProps> = ({
  data,
  height = 180,
  color,
  formatY,
  formatX = (v) => `Day ${v}`,
  reference,
  axes = true,
  ariaLabel,
}) => {
  const gid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const wrap = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const W = 600;
  const H = height;
  const pad = axes ? { l: 54, r: 14, t: 12, b: 26 } : { l: 4, r: 4, t: 6, b: 6 };

  const { xs, ys, yTicks, minX, maxX } = useMemo(() => {
    const vals = data.map((d) => d.y).concat(reference ? [reference.value] : []);
    let lo = Math.min(...vals);
    let hi = Math.max(...vals);
    if (hi - lo < 1e-6) {
      lo -= 1;
      hi += 1;
    }
    const span = hi - lo;
    lo -= span * 0.12;
    hi += span * 0.12;
    const minX = data[0]?.x ?? 0;
    const maxX = Math.max(minX + 1, data[data.length - 1]?.x ?? 1);
    const xs = (x: number) => pad.l + ((x - minX) / (maxX - minX)) * (W - pad.l - pad.r);
    const ys = (y: number) => pad.t + (1 - (y - lo) / (hi - lo)) * (H - pad.t - pad.b);
    const yTicks = [0, 0.5, 1].map((t) => lo + (hi - lo) * (0.1 + t * 0.8));
    return { xs, ys, yTicks, minX, maxX };
  }, [data, reference, H, pad.l, pad.r, pad.t, pad.b]);

  if (data.length === 0) return null;

  const line = data.map((d, i) => `${i ? 'L' : 'M'}${xs(d.x).toFixed(1)} ${ys(d.y).toFixed(1)}`).join(' ');
  const area = `${line} L${xs(data[data.length - 1].x)} ${H - pad.b} L${xs(data[0].x)} ${H - pad.b} Z`;
  const hp = hover != null ? data[hover] : null;

  const onMove = (e: React.PointerEvent) => {
    const r = wrap.current?.getBoundingClientRect();
    if (!r) return;
    const vx = ((e.clientX - r.left) / r.width) * W;
    let best = 0;
    data.forEach((d, i) => {
      if (Math.abs(xs(d.x) - vx) < Math.abs(xs(data[best].x) - vx)) best = i;
    });
    setHover(best);
  };

  return (
    <div ref={wrap} className="relative w-full select-none" onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full block" style={{ height }} preserveAspectRatio="none" role="img" aria-label={ariaLabel}>
        <defs>
          <linearGradient id={`fill-${gid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={color} stopOpacity="0.28" />
            <stop offset="1" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {axes &&
          yTicks.map((t) => (
            <g key={t}>
              <line x1={pad.l} x2={W - pad.r} y1={ys(t)} y2={ys(t)} stroke="#e2c48d" strokeWidth="1" vectorEffect="non-scaling-stroke" />
            </g>
          ))}
        {reference && (
          <line
            x1={pad.l}
            x2={W - pad.r}
            y1={ys(reference.value)}
            y2={ys(reference.value)}
            stroke="#9a6a3c"
            strokeWidth="1.5"
            strokeDasharray="5 5"
            vectorEffect="non-scaling-stroke"
          />
        )}
        <path d={area} fill={`url(#fill-${gid})`} />
        <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        {hp && (
          <line x1={xs(hp.x)} x2={xs(hp.x)} y1={pad.t} y2={H - pad.b} stroke="#6b4f36" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        )}
      </svg>

      {/* HTML overlay keeps text crisp despite the stretched SVG */}
      {axes && (
        <>
          {yTicks.map((t) => (
            <span key={t} className="absolute left-0 text-[10px] font-bold text-[#9a6a3c] tabular -translate-y-1/2" style={{ top: ys(t) }}>
              {formatY(t)}
            </span>
          ))}
          <span className="absolute left-[54px] bottom-0 text-[10px] font-bold text-[#9a6a3c]">{formatX(minX)}</span>
          <span className="absolute right-3 bottom-0 text-[10px] font-bold text-[#9a6a3c]">{formatX(maxX)}</span>
          {reference && (
            <span className="absolute right-3 text-[10px] font-extrabold text-[#6b4f36] -translate-y-full" style={{ top: ys(reference.value) - 2 }}>
              {reference.label}
            </span>
          )}
        </>
      )}

      {/* last-point marker */}
      {!hp && (
        <span
          className="absolute w-2.5 h-2.5 rounded-full border-2 border-[#fff8e6] -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${(xs(data[data.length - 1].x) / W) * 100}%`, top: ys(data[data.length - 1].y), background: color }}
        />
      )}

      {hp && (
        <>
          <span
            className="absolute w-3 h-3 rounded-full border-2 border-[#fff8e6] -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            style={{ left: `${(xs(hp.x) / W) * 100}%`, top: ys(hp.y), background: color }}
          />
          <div
            className="absolute z-10 pointer-events-none rounded-lg bg-[#3b2412] text-[#fff6df] px-2 py-1 text-xs font-bold whitespace-nowrap -translate-x-1/2"
            style={{ left: `${Math.min(88, Math.max(12, (xs(hp.x) / W) * 100))}%`, top: Math.max(0, ys(hp.y) - 40) }}
          >
            <span className="opacity-75">{formatX(hp.x)}</span> · <span className="tabular">{formatY(hp.y)}</span>
          </div>
        </>
      )}
    </div>
  );
};
