import React from 'react';
import { ArrowRight, Sprout } from 'lucide-react';
import { cropInfo } from '../game/crops';
import type { FieldState } from '../types/farm';

interface FieldCardProps {
  field: FieldState;
  onSelect: (fieldId: number) => void;
  onPlant: (fieldId: number) => void;
  onViewDetails: (fieldId: number) => void;
  isSelected?: boolean;
}

export const FieldCard: React.FC<FieldCardProps> = ({
  field,
  onSelect,
  onPlant,
  onViewDetails,
  isSelected = false,
}) => {
  const isPlanted = field.state !== 'EMPTY';
  const isMature = field.state === 'MATURE';
  const cropName = field.crop || 'Empty';

  // Growth target days based on backend crop config
  const info = cropInfo(field.crop);
  const growthTargetDays = info?.growthDays ?? (cropName.toLowerCase() === 'rice' ? 8 : cropName.toLowerCase() === 'corn' ? 6 : 5);

  const currentDays = Math.min(growthTargetDays, field.progress);
  const progressPct = isMature ? 100 : isPlanted ? Math.round((currentDays / growthTargetDays) * 100) : 0;

  // Determine stage display label
  let stageLabel = 'Not Planted';
  let pillClass = 'ag-pill bg-emerald-950/50 border border-emerald-900/60 text-emerald-400/60';
  if (isMature) {
    stageLabel = 'Mature';
    pillClass = 'ag-pill bg-amber-500/20 border border-amber-500/40 text-amber-300';
  } else if (isPlanted) {
    stageLabel = progressPct < 40 ? 'Seedling' : 'Growing';
    pillClass = 'ag-pill bg-emerald-500/20 border border-emerald-500/40 text-emerald-300';
  }

  return (
    <div
      onClick={() => onSelect(field.id)}
      className={`ag-card overflow-hidden flex flex-col cursor-pointer group transition-all duration-200 ${
        isSelected
          ? 'ring-2 ring-emerald-400 border-emerald-400/80 shadow-lg shadow-emerald-950/80 -translate-y-1'
          : 'hover:-translate-y-1 hover:border-emerald-500/50'
      }`}
    >
      {/* Field Image / Soil Illustration Banner */}
      <div className="relative h-28 w-full bg-[#071d14] overflow-hidden border-b border-[#16402d]">
        <svg
          viewBox="0 0 300 140"
          className="w-full h-full object-cover select-none"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id={`skyGrad-${field.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#134e38" />
              <stop offset="100%" stopColor="#0d3323" />
            </linearGradient>
            <linearGradient id={`soilGrad-${field.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3d2817" />
              <stop offset="100%" stopColor="#1e130b" />
            </linearGradient>
            <linearGradient id={`cropGrad-${field.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={isMature ? '#fbbf24' : '#34d399'} />
              <stop offset="100%" stopColor={isMature ? '#d97706' : '#059669'} />
            </linearGradient>
          </defs>

          {/* Sky horizon */}
          <rect x="0" y="0" width="300" height="45" fill={`url(#skyGrad-${field.id})`} />
          <circle cx="240" cy="25" r="14" fill="#fde68a" opacity="0.4" />

          {/* Rolling soil furrows */}
          <path
            d="M0,45 Q75,40 150,45 T300,45 L300,140 L0,140 Z"
            fill={`url(#soilGrad-${field.id})`}
          />

          {/* Perspective Furrows */}
          <path d="M150,45 L40,140" stroke="#170d07" strokeWidth="2.5" opacity="0.7" />
          <path d="M150,45 L100,140" stroke="#170d07" strokeWidth="2.5" opacity="0.7" />
          <path d="M150,45 L160,140" stroke="#170d07" strokeWidth="2.5" opacity="0.7" />
          <path d="M150,45 L220,140" stroke="#170d07" strokeWidth="2.5" opacity="0.7" />
          <path d="M150,45 L280,140" stroke="#170d07" strokeWidth="2.5" opacity="0.7" />

          {/* Crops in perspective */}
          {isPlanted && (
            <g fill={`url(#cropGrad-${field.id})`}>
              {[70, 110, 150, 190, 230].map((x, i) => (
                <ellipse
                  key={`b-${i}`}
                  cx={x}
                  cy="55"
                  rx={isMature ? 6 : Math.max(3, (progressPct / 100) * 5)}
                  ry={isMature ? 10 : Math.max(4, (progressPct / 100) * 8)}
                />
              ))}

              {[50, 95, 145, 195, 245].map((x, i) => (
                <ellipse
                  key={`m-${i}`}
                  cx={x}
                  cy="75"
                  rx={isMature ? 9 : Math.max(4, (progressPct / 100) * 8)}
                  ry={isMature ? 14 : Math.max(6, (progressPct / 100) * 12)}
                />
              ))}

              {[30, 85, 140, 200, 260].map((x, i) => (
                <ellipse
                  key={`f-${i}`}
                  cx={x}
                  cy="105"
                  rx={isMature ? 13 : Math.max(6, (progressPct / 100) * 12)}
                  ry={isMature ? 19 : Math.max(9, (progressPct / 100) * 18)}
                />
              ))}
            </g>
          )}
        </svg>

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
          <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-[#061811]/80 backdrop-blur text-emerald-200 border border-[#16402d]">
            Field {field.id + 1}
          </span>
          <span className={pillClass}>{stageLabel}</span>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-3.5 flex flex-col flex-1 justify-between">
        <div>
          {/* Crop Name & Icon */}
          <div className="flex items-center gap-2 mb-2">
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm ${
                isMature
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : isPlanted
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-emerald-950/40 text-emerald-600 border border-emerald-900/40'
              }`}
            >
              <Sprout className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-bold text-white leading-tight">{cropName}</div>
              <div className="text-[11px] text-emerald-400/70">{stageLabel}</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-[11px] text-emerald-400/80 mb-1">
              <span>{isPlanted ? `Growth: ${currentDays} / ${growthTargetDays} days` : 'Ready for planting'}</span>
              <span className="font-mono font-bold text-white">{isPlanted ? `${progressPct}%` : '—'}</span>
            </div>
            <div className="w-full bg-[#061811] h-2 rounded-full overflow-hidden border border-[#16402d]">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  isMature
                    ? 'bg-gradient-to-r from-amber-400 to-amber-500'
                    : 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                }`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Dedicated Action Button with stopPropagation */}
        <div className="mt-4 pt-2.5 border-t border-[#16402d]">
          {isPlanted ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onViewDetails(field.id);
              }}
              className="ag-button-secondary text-xs py-1.5 px-3 w-full justify-between"
            >
              <span>View Details</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPlant(field.id);
              }}
              className="ag-button-primary text-xs py-1.5 px-3 w-full justify-between"
            >
              <span>Plant Crop</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
export default FieldCard;
