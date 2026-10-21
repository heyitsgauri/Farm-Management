import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Hand, Moon as MoonIcon, Bot, Sparkles, Info } from 'lucide-react';
import { useFarmContext } from '../context/FarmContext';
import { FarmScene } from '../components/farm/FarmScene';
import { RiskChips } from '../components/game/common';
import { CropBadgeArt } from '../components/art/CropSprite';
import { SeedBag, Robot } from '../components/art/Scenery';
import { CROP_LIST, cropInfo, growthStage, STAGE_LABEL, formatMoney, prettyLabel, type CropName, type GrowthStage } from '../game/crops';
import type { ActionItem, FieldState } from '../types/farm';

type Tool = 'inspect' | `plant:${CropName}` | 'harvest';

const SickleIcon: React.FC<{ size?: number }> = ({ size = 30 }) => (
  <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden="true">
    <path d="M10 34 L18 24" stroke="#7a4a24" strokeWidth="5" strokeLinecap="round" />
    <path d="M17 25 Q8 10 22 5 Q36 2 35 16 Q30 8 22 11 Q15 14 20 22 Z" fill="#cdd6df" stroke="#3b2412" strokeWidth="2.2" strokeLinejoin="round" />
  </svg>
);

function findAction(actions: ActionItem[], type: string, fieldId?: number, crop?: string) {
  return actions.find(
    (a) => a.type === type && (fieldId === undefined || a.field_id === fieldId) && (crop === undefined || a.crop_name === crop)
  );
}

const STAGES: GrowthStage[] = ['sprout', 'young', 'ripening', 'mature'];

export const FarmPage: React.FC = () => {
  const farm = useFarmContext();
  const { farmState, actions, isBusy, aiRecommendation } = farm;
  const [tool, setTool] = useState<Tool>('inspect');
  const [selectedId, setSelectedId] = useState<number>(0);
  const [hint, setHint] = useState<string | null>(null);

  const fields = farmState?.fields ?? [];
  const selected = fields.find((f) => f.id === selectedId) ?? fields[0];
  const prices = farmState?.market_prices ?? {};
  const cash = farmState?.cash ?? 0;
  const holdAction = actions.find((a) => a.type === 'HOLD');
  const aiFieldId = aiRecommendation?.action_details.field_id ?? null;

  const flash = useCallback((msg: string) => {
    setHint(msg);
    window.setTimeout(() => setHint((h) => (h === msg ? null : h)), 2200);
  }, []);

  const run = useCallback(
    (a: ActionItem | undefined, fallbackMsg: string) => {
      if (!a || !a.valid) return flash(fallbackMsg);
      if (isBusy) return;
      farm.executeHumanAction(a.id);
    },
    [farm, isBusy, flash]
  );

  const onPlotClick = (f: FieldState) => {
    setSelectedId(f.id);
    if (tool === 'harvest') {
      if (f.state !== 'MATURE') return flash(f.crop ? `Field ${f.id + 1} isn't ready yet` : `Field ${f.id + 1} is empty`);
      run(findAction(actions, 'HARVEST', f.id), 'Cannot harvest right now');
    } else if (tool.startsWith('plant:')) {
      const crop = tool.slice(6) as CropName;
      if (f.state !== 'EMPTY') return flash(`Field ${f.id + 1} already has ${f.crop}`);
      run(findAction(actions, 'PLANT', f.id, crop), `Not enough coins for ${crop} seeds`);
    }
  };

  // Keyboard shortcuts, like a game hotbar
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.metaKey || e.ctrlKey) return;
      const map: Record<string, Tool> = { '1': 'inspect', '2': 'plant:Wheat', '3': 'plant:Rice', '4': 'plant:Corn', '5': 'harvest' };
      if (map[e.key]) setTool(map[e.key]);
      else if (e.key === ' ' || e.key.toLowerCase() === 'n') {
        e.preventDefault();
        run(holdAction, 'Cannot pass the day right now');
      } else if (e.key.toLowerCase() === 'a') farm.askAI();
      else if (e.key === 'ArrowRight') setSelectedId((i) => (i + 1) % Math.max(1, fields.length));
      else if (e.key === 'ArrowLeft') setSelectedId((i) => (i - 1 + fields.length) % Math.max(1, fields.length));
      else if (e.key === 'Escape') setTool('inspect');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [run, holdAction, farm, fields.length]);

  const cursor = tool === 'inspect' ? 'pointer' : tool === 'harvest' ? 'crosshair' : 'copy';

  const hotbar = useMemo(
    () => [
      { id: 'inspect' as Tool, label: 'Inspect', key: '1', art: <Hand className="w-7 h-7 text-[#6b4423]" strokeWidth={2.4} /> },
      ...CROP_LIST.map((c, i) => ({
        id: `plant:${c.name}` as Tool,
        label: `${c.name}`,
        key: String(i + 2),
        art: <SeedBag size={28} color={c.accent} />,
        sub: formatMoney(c.plantingCost),
      })),
      { id: 'harvest' as Tool, label: 'Sickle', key: '5', art: <SickleIcon /> },
    ],
    []
  );

  if (!farmState || !selected) return null;

  return (
    <div className="grid lg:grid-cols-[1fr_340px] gap-5">
      <div className="min-w-0 space-y-4">
        <FarmScene
          fields={fields}
          risks={farmState.risk_forecasts}
          lastEvent={farm.lastEvent}
          selectedId={selected.id}
          aiFieldId={aiFieldId}
          cursor={cursor}
          onPlotClick={onPlotClick}
          overlay={
            <div className="flex flex-wrap items-start justify-between gap-2">
              <RiskChips risks={farmState.risk_forecasts} />
              <AnimatePresence>
                {hint && (
                  <motion.div
                    initial={{ y: -10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="rounded-xl bg-[#fff8e6] border-2 border-[#c23a33] px-3 py-1 text-sm font-bold text-[#8f2621]"
                  >
                    {hint}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          }
        />

        {/* Hotbar */}
        <div className="wood rounded-[22px] p-2.5 shadow-[0_5px_0_#3b2412] flex flex-wrap items-center gap-2">
          <div className="flex gap-2 flex-wrap">
            {hotbar.map((slot) => {
              const active = tool === slot.id;
              return (
                <motion.button
                  key={slot.id}
                  onClick={() => setTool(slot.id)}
                  whileTap={{ scale: 0.9 }}
                  animate={{ y: active ? -4 : 0 }}
                  className={`relative w-[56px] h-[62px] sm:w-[68px] sm:h-[68px] rounded-2xl border-[3px] grid place-items-center ${
                    active ? 'bg-[#ffd65c] border-[#3b2412] shadow-[0_4px_0_#3b2412]' : 'bg-[#fff6df] border-[#6b4423] shadow-[0_3px_0_#4f3119]'
                  }`}
                  title={`${slot.label} (${slot.key})`}
                  aria-pressed={active}
                >
                  <span className="absolute left-1 top-0.5 text-[10px] font-extrabold text-[#9a6a3c]">{slot.key}</span>
                  <span className="-mt-2">{slot.art}</span>
                  <span className="absolute bottom-0.5 inset-x-0 text-[10px] font-extrabold text-[#4f3119] leading-none">
                    {'sub' in slot ? slot.sub : slot.label}
                  </span>
                </motion.button>
              );
            })}
          </div>
          <div className="flex gap-2 ml-auto">
            <button className="btn btn-sky" onClick={() => farm.askAI()} disabled={farm.isAIPredicting || isBusy || !farm.health?.ppo_model_loaded}>
              <Bot className={`w-5 h-5 ${farm.isAIPredicting ? 'animate-bounce' : ''}`} /> Ask AI
            </button>
            <button className="btn btn-purple btn-lg" onClick={() => run(holdAction, 'Cannot pass the day right now')} disabled={isBusy}>
              <MoonIcon className="w-5 h-5" /> Next day
            </button>
          </div>
        </div>
        <p className="hidden sm:flex text-xs font-bold text-[#4f3119]/80 items-center gap-1.5">
          <Info className="w-3.5 h-3.5" /> Pick a tool, then tap a field. Every action uses one day. Keys: 1–5 tools · Space next day · A ask AI · ←/→ select field.
        </p>
      </div>

      {/* Side panel */}
      <aside className="space-y-4">
        <FieldPanel field={selected} actions={actions} prices={prices} cash={cash} busy={isBusy} onRun={run} />

        {/* AI hint */}
        <div className="panel p-4">
          <div className="flex items-center gap-3">
            <Robot size={58} thinking={farm.isAIPredicting} mood={aiRecommendation ? 'happy' : 'idle'} />
            <div className="flex-1 min-w-0">
              <div className="font-display font-bold text-[#3b2412]">AI Farmer says…</div>
              <AnimatePresence mode="wait">
                {aiRecommendation ? (
                  <motion.div key="rec" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    <div className="mt-1 rounded-xl bg-[#efe9ff] border-2 border-[#8b6cf0] px-2.5 py-1.5 text-sm font-bold text-[#4b33a6]">
                      “{prettyLabel(aiRecommendation.action_details.label)}”
                    </div>
                    <button className="btn btn-purple btn-sm mt-2" onClick={() => farm.executeAIAction()} disabled={isBusy}>
                      <Sparkles className="w-4 h-4" /> Let AI do it
                    </button>
                  </motion.div>
                ) : (
                  <motion.p key="none" className="text-sm text-[#6b4f36] font-semibold" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    {farm.health?.ppo_model_loaded ? 'Press “Ask AI” for advice on today’s move.' : 'The PPO model is not loaded on the server.'}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
};

const FieldPanel: React.FC<{
  field: FieldState;
  actions: ActionItem[];
  prices: Record<string, number>;
  cash: number;
  busy: boolean;
  onRun: (a: ActionItem | undefined, msg: string) => void;
}> = ({ field, actions, prices, cash, busy, onRun }) => {
  const info = cropInfo(field.crop);
  const isMature = field.state === 'MATURE';
  const stage = info ? growthStage(field.progress, info.growthDays, isMature) : null;

  return (
    <motion.div key={field.id} className="panel p-4" initial={{ scale: 0.96, opacity: 0.6 }} animate={{ scale: 1, opacity: 1 }}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display font-bold text-2xl text-[#3b2412]">Field {field.id + 1}</h2>
        <span className={`rounded-full border-2 px-2.5 py-0.5 text-xs font-extrabold ${isMature ? 'bg-[#ffd65c] border-[#b36f00] text-[#4f3119]' : field.crop ? 'bg-[#e3f5d3] border-[#3f8a2a] text-[#2f6b1f]' : 'bg-[#fdf0cf] border-[#c99a66] text-[#6b4f36]'}`}>
          {stage ? STAGE_LABEL[stage] : 'Empty soil'}
        </span>
      </div>

      {!info && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-[#6b4f36]">Choose a seed packet to plant:</p>
          {CROP_LIST.map((c) => {
            const a = findAction(actions, 'PLANT', field.id, c.name);
            const value = c.yieldAmount * (prices[c.name] ?? c.basePrice);
            const affordable = cash >= c.plantingCost;
            return (
              <motion.button
                key={c.name}
                whileHover={{ x: 3 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onRun(a, `Not enough coins for ${c.name}`)}
                disabled={busy || !a?.valid}
                className="w-full flex items-center gap-3 rounded-2xl border-[3px] p-2 text-left disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: c.accentSoft, borderColor: c.accent }}
              >
                <CropBadgeArt crop={c.name} size={50} />
                <div className="flex-1 min-w-0">
                  <div className="font-display font-bold text-[#3b2412] leading-tight">{c.name}</div>
                  <div className="text-[11px] font-bold text-[#6b4f36]">
                    {c.growthDays} days · {c.yieldAmount} units · worth ~{formatMoney(value)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-display font-bold text-[#3b2412] tabular">{formatMoney(c.plantingCost)}</div>
                  <div className={`text-[10px] font-extrabold ${affordable ? 'text-[#3f8a2a]' : 'text-[#c23a33]'}`}>{affordable ? 'PLANT' : 'TOO PRICEY'}</div>
                </div>
              </motion.button>
            );
          })}
        </div>
      )}

      {info && stage && (
        <div className="space-y-3">
          <div className="flex items-end gap-3">
            <CropBadgeArt crop={info.name} stage={stage} size={84} />
            <div className="flex-1">
              <div className="font-display font-bold text-lg" style={{ color: info.accent }}>
                {info.name}
              </div>
              <div className="text-sm font-bold text-[#6b4f36] tabular">
                Day {Math.min(field.progress, info.growthDays)} of {info.growthDays}
                {!isMature && ` · ${Math.max(0, info.growthDays - field.progress)} to go`}
              </div>
              <div className="text-xs font-semibold text-[#9a6a3c]">
                Yield {info.yieldAmount} · now worth {formatMoney(info.yieldAmount * (prices[info.name] ?? info.basePrice))}
              </div>
            </div>
          </div>

          {/* growth timeline */}
          <div className="panel-inset p-2 flex justify-between">
            {STAGES.map((s) => {
              const reached = STAGES.indexOf(s) <= STAGES.indexOf(stage === 'seed' ? 'sprout' : stage);
              return (
                <div key={s} className={`flex flex-col items-center w-1/4 ${reached ? '' : 'opacity-35 grayscale'}`}>
                  <CropBadgeArt crop={info.name} stage={s} size={38} animated={s === stage} />
                  <span className="text-[9px] font-extrabold uppercase text-[#6b4f36] mt-0.5">{STAGE_LABEL[s].split(' ')[0]}</span>
                </div>
              );
            })}
          </div>

          {isMature ? (
            <button
              className="btn btn-gold btn-lg w-full"
              onClick={() => onRun(findAction(actions, 'HARVEST', field.id), 'Cannot harvest right now')}
              disabled={busy}
            >
              <SickleIcon size={26} /> Harvest {info.yieldAmount} {info.name}
            </button>
          ) : (
            <button className="btn btn-purple w-full" onClick={() => onRun(actions.find((a) => a.type === 'HOLD'), 'Cannot wait right now')} disabled={busy}>
              <MoonIcon className="w-5 h-5" /> Let it grow one more day
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
};
