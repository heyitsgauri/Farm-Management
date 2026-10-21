import React from 'react';
import type { FarmEvent, FieldState } from '../../types/farm';
import { Sky, Hills, Barn, Silo, Windmill, Tree, Tractor, Scarecrow, Bug, Fence } from '../art/Scenery';
import { FarmPlot } from './FarmPlot';

interface FarmSceneProps {
  fields: FieldState[];
  risks: Record<string, string | undefined>;
  lastEvent: FarmEvent | null;
  selectedId?: number | null;
  aiFieldId?: number | null;
  cursor?: string;
  onPlotClick?: (field: FieldState) => void;
  compact?: boolean;
  /** Extra content pinned to the top of the sky (e.g. risk chips). */
  overlay?: React.ReactNode;
}

/** The illustrated farm: sky, horizon buildings and five living field plots. */
export const FarmScene: React.FC<FarmSceneProps> = ({
  fields,
  risks,
  lastEvent,
  selectedId,
  aiFieldId,
  cursor,
  onPlotClick,
  compact,
  overlay,
}) => {
  const hot = risks.drought === 'HIGH';
  const bugs = risks.pest === 'HIGH' ? 6 : risks.pest === 'MEDIUM' ? 2 : 0;
  const horizon = compact ? 120 : 175;

  return (
    <div className="relative overflow-hidden rounded-[28px] border-[3px] border-[#3b2412] shadow-[0_6px_0_#3b2412]">
      {/* Sky + horizon */}
      <div className="relative" style={{ height: horizon }}>
        <Sky mood={hot ? 'hot' : 'day'} clouds={compact ? 2 : 4} birds={!compact} />
        {hot && <div className="absolute inset-x-0 bottom-0 h-1/2 heat" style={{ background: 'linear-gradient(0deg, rgba(255,170,60,0.35), transparent)' }} />}
        <Hills className="h-[55%]" tone={hot ? 'dry' : 'green'} />
        <Barn size={compact ? 90 : 150} className="absolute bottom-0 left-[4%]" />
        <Silo size={compact ? 28 : 46} className="absolute bottom-0 left-[calc(4%_+_150px)] hidden sm:block" />
        <Tree size={compact ? 40 : 62} className="absolute bottom-0 left-[38%] hidden sm:block" />
        <Tree size={compact ? 34 : 50} className="absolute bottom-0 left-[46%]" />
        <Windmill size={compact ? 60 : 96} className="absolute bottom-0 right-[6%]" fast={!hot} />
        {!compact && <Scarecrow size={52} className="absolute bottom-0 right-[24%] hidden md:block" />}
        {/* tractor puttering along the farm road */}
        <div className="absolute bottom-[-4px] left-0 drift" style={{ ['--drift-dur' as string]: '38s', ['--drift-delay' as string]: '-12s' }}>
          <Tractor size={compact ? 50 : 74} flip />
        </div>
        {overlay && <div className="absolute left-3 top-3 right-3 z-10">{overlay}</div>}
      </div>

      {/* Fields */}
      <div
        className="relative px-3 sm:px-6 pt-8 pb-6"
        style={{
          background:
            'radial-gradient(circle at 20% 30%, rgba(255,255,255,0.12) 0 2px, transparent 3px) 0 0/34px 34px, radial-gradient(circle at 70% 60%, rgba(0,0,0,0.06) 0 2px, transparent 3px) 0 0/28px 28px, linear-gradient(180deg, #6dbb4c 0%, #58a83a 100%)',
        }}
      >
        <Fence className="absolute inset-x-0 top-0 h-6 w-full opacity-90" />
        <div className={`relative grid grid-cols-2 sm:grid-cols-6 max-w-[860px] mx-auto ${compact ? 'gap-x-3 gap-y-5' : 'gap-x-5 gap-y-8'} pt-2`}>
          {fields.map((f, i) => (
            <div
              key={f.id}
              data-plot={f.id}
              className={`sm:col-span-2 ${i === 3 ? 'sm:col-start-2' : ''} ${i === 4 ? 'col-span-2 sm:col-span-2 mx-auto w-1/2 sm:w-full' : ''}`}
            >
              <FarmPlot
                field={f}
                event={lastEvent}
                selected={selectedId === f.id}
                dry={hot}
                aiTarget={aiFieldId === f.id}
                cursor={cursor}
                onClick={() => onPlotClick?.(f)}
                compact={compact}
              />
            </div>
          ))}
        </div>

        {bugs > 0 &&
          Array.from({ length: bugs }).map((_, i) => (
            <div
              key={i}
              className="absolute pointer-events-none buzz"
              style={{ left: `${12 + i * 14}%`, top: `${20 + ((i * 29) % 60)}%`, ['--buzz-dur' as string]: `${1.2 + (i % 3) * 0.4}s` }}
            >
              <Bug size={14} />
            </div>
          ))}
      </div>
    </div>
  );
};
