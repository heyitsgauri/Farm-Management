import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Brain, Play, Pause, StepForward, Gauge, Dices } from 'lucide-react';
import { useFarmContext } from '../context/FarmContext';
import { PageBanner, SectionTitle, StatTile } from '../components/game/common';
import { FarmScene } from '../components/farm/FarmScene';
import { Robot } from '../components/art/Scenery';
import { formatMoney, prettyLabel } from '../game/crops';
import type { AutopilotSpeed } from '../hooks/useFarm';

const SPEEDS: { id: AutopilotSpeed; label: string }[] = [
  { id: 'slow', label: 'Slow' },
  { id: 'normal', label: 'Normal' },
  { id: 'fast', label: 'Fast' },
];

const TYPE_COLOR: Record<string, string> = {
  PLANT: 'bg-[#e3f5d3] text-[#2f6b1f] border-[#3f8a2a]',
  HARVEST: 'bg-[#fff0c2] text-[#8a5200] border-[#b36f00]',
  SELL: 'bg-[#d9f0fb] text-[#1d6797] border-[#2b8bb8]',
  HOLD: 'bg-[#efe9ff] text-[#4b33a6] border-[#8b6cf0]',
};

export const AIFarmerPage: React.FC = () => {
  const farm = useFarmContext();
  const { farmState, health, aiRecommendation, autopilot, isBusy, events } = farm;
  if (!farmState) return null;

  const ready = !!health?.ppo_model_loaded;
  const aiEvents = events.filter((e) => e.actor === 'PPO AI');
  const aiReward = aiEvents.reduce((s, e) => s + e.reward, 0);
  const humanMoves = events.length - aiEvents.length;
  const thinking = farm.isAIPredicting || farm.isAIStepping;

  return (
    <div>
      <PageBanner
        title="Meet the AI Farmer"
        subtitle="A PPO reinforcement-learning agent trained for 500k steps on this exact farm"
        art={<Robot size={130} thinking={thinking} mood={autopilot ? 'happy' : 'idle'} />}
      >
        <span className={`inline-flex items-center gap-2 rounded-full border-[3px] px-3 py-1 text-sm font-extrabold ${ready ? 'bg-[#e3f5d3] border-[#3f8a2a] text-[#2f6b1f]' : 'bg-[#fdebe9] border-[#c23a33] text-[#8f2621]'}`}>
          <span className={`w-2.5 h-2.5 rounded-full ${ready ? 'bg-[#58a83a] animate-pulse' : 'bg-[#e2524a]'}`} />
          {ready ? 'Model loaded & ready' : 'Model not loaded on server'}
        </span>
      </PageBanner>

      <div className="grid lg:grid-cols-[360px_1fr] gap-5">
        {/* Control desk */}
        <div className="space-y-4">
          <div className="panel p-5">
            <SectionTitle>Control desk</SectionTitle>

            {/* thought bubble */}
            <div className="relative panel-inset p-3 mb-4 min-h-[76px]">
              <div className="text-[11px] font-extrabold uppercase tracking-wide text-[#9a6a3c] flex items-center gap-1">
                <Brain className="w-3.5 h-3.5" /> AI is thinking
              </div>
              <AnimatePresence mode="wait">
                {thinking ? (
                  <motion.div key="dots" className="flex gap-1.5 mt-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    {[0, 1, 2].map((i) => (
                      <motion.span key={i} className="w-2.5 h-2.5 rounded-full bg-[#8b6cf0]" animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.15 }} />
                    ))}
                  </motion.div>
                ) : aiRecommendation ? (
                  <motion.p key="rec" className="font-display font-bold text-lg text-[#4b33a6] mt-1" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                    “I would {prettyLabel(aiRecommendation.action_details.label).toLowerCase()}.”
                  </motion.p>
                ) : aiEvents[0] ? (
                  <motion.p key="last" className="font-semibold text-[#6b4f36] mt-1" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    Last move: <b className="text-[#3b2412]">{aiEvents[0].actionLabel}</b>
                  </motion.p>
                ) : (
                  <motion.p key="idle" className="font-semibold text-[#6b4f36] mt-1" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    Ask for advice, take one step, or switch on autopilot.
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button className="btn btn-sky" onClick={() => farm.askAI()} disabled={!ready || isBusy || farm.isAIPredicting || autopilot}>
                <Brain className="w-4 h-4" /> Advice
              </button>
              <button className="btn btn-purple" onClick={() => farm.executeAIAction()} disabled={!ready || isBusy || autopilot || farm.isSeasonComplete}>
                <StepForward className="w-4 h-4" /> One day
              </button>
            </div>

            <motion.button
              className={`btn btn-lg w-full mt-3 ${autopilot ? 'btn-berry' : ''}`}
              onClick={() => farm.setAutopilot(!autopilot)}
              disabled={!ready || farm.isSeasonComplete}
              whileTap={{ scale: 0.95 }}
            >
              {autopilot ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              {autopilot ? 'Stop autopilot' : 'Start autopilot'}
            </motion.button>
            <p className="text-xs font-semibold text-[#9a6a3c] mt-2 text-center">Autopilot keeps farming while you browse other pages.</p>

            <div className="mt-4">
              <div className="text-[11px] font-extrabold uppercase tracking-wide text-[#9a6a3c] mb-1 flex items-center gap-1">
                <Gauge className="w-3.5 h-3.5" /> Speed
              </div>
              <div className="grid grid-cols-3 gap-1 panel-inset p-1">
                {SPEEDS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => farm.setAutopilotSpeed(s.id)}
                    className={`rounded-lg py-1.5 font-display font-semibold text-sm ${farm.autopilotSpeed === s.id ? 'bg-[#8b6cf0] text-white shadow-[0_2px_0_#4b33a6]' : 'text-[#6b4f36]'}`}
                    aria-pressed={farm.autopilotSpeed === s.id}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <label className="mt-4 flex items-center justify-between gap-3 cursor-pointer">
              <span className="flex items-center gap-1.5 text-sm font-bold text-[#3b2412]">
                <Dices className="w-4 h-4" /> Let the AI explore (stochastic)
              </span>
              <button
                role="switch"
                aria-checked={!farm.deterministic}
                onClick={() => farm.setDeterministic(!farm.deterministic)}
                className={`relative w-12 h-7 rounded-full border-[3px] border-[#3b2412] transition-colors ${!farm.deterministic ? 'bg-[#8b6cf0]' : 'bg-[#e9d8b4]'}`}
              >
                <motion.span className="absolute top-0.5 w-5 h-5 rounded-full bg-white border-2 border-[#3b2412]" animate={{ left: !farm.deterministic ? 22 : 2 }} />
              </button>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <StatTile label="AI moves" value={aiEvents.length} />
            <StatTile label="Your moves" value={humanMoves} />
            <StatTile label="AI reward" value={aiReward.toFixed(0)} />
            <StatTile label="Wealth" value={formatMoney(farm.metrics?.total_wealth ?? farmState.cash)} />
          </div>
        </div>

        {/* Live farm */}
        <div className="space-y-4 min-w-0">
          <FarmScene
            fields={farmState.fields}
            risks={farmState.risk_forecasts}
            lastEvent={farm.lastEvent}
            aiFieldId={aiRecommendation?.action_details.field_id ?? null}
            cursor="default"
          />
          <div className="panel p-5">
            <SectionTitle>AI decision feed</SectionTitle>
            {aiEvents.length === 0 ? (
              <p className="text-[#6b4f36] font-semibold">No AI decisions yet this season.</p>
            ) : (
              <ul className="space-y-1.5 max-h-[320px] overflow-y-auto pr-1">
                <AnimatePresence initial={false}>
                  {aiEvents.slice(0, 30).map((e) => (
                    <motion.li
                      key={e.id}
                      layout
                      initial={{ x: -30, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      className="panel-inset flex items-center gap-2 px-3 py-1.5 text-sm"
                    >
                      <span className="text-xs font-extrabold text-[#9a6a3c] w-12">Day {e.dayFrom}</span>
                      <span className={`rounded-full border-2 px-2 text-[10px] font-extrabold ${TYPE_COLOR[e.actionType] ?? TYPE_COLOR.HOLD}`}>{e.actionType}</span>
                      <span className="font-bold text-[#3b2412] flex-1 truncate">{e.actionLabel}</span>
                      <span className={`text-xs font-extrabold tabular ${e.reward >= 0 ? 'text-[#2f6b1f]' : 'text-[#8f2621]'}`}>
                        {e.reward >= 0 ? '+' : ''}
                        {e.reward.toFixed(0)}
                      </span>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
