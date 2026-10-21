import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Sprout, Bot, ArrowRight } from 'lucide-react';
import { useFarmContext } from '../context/FarmContext';
import { Sky, Hills, Barn, Windmill, Silo, Tree, Tractor, Robot, SeedBag, Coin, Combine, Bug, Sun } from '../components/art/Scenery';
import { CropSprite, CropBadgeArt } from '../components/art/CropSprite';
import { SectionTitle } from '../components/game/common';
import { CROP_LIST, formatMoney, SEASON_LENGTH, type GrowthStage } from '../game/crops';

const WheatField: React.FC = () => (
  <div className="absolute inset-x-0 bottom-0 h-[34%] pointer-events-none">
    <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, #e3b23c 0%, #c99a2e 100%)' }} />
    {Array.from({ length: 3 }).map((_, row) =>
      Array.from({ length: 26 }).map((__, i) => (
        <CropSprite
          key={`${row}-${i}`}
          crop="Wheat"
          stage="mature"
          className="sway absolute"
          style={{
            left: `${(i / 26) * 100 + (row % 2) * 2 - 1}%`,
            bottom: `${68 - row * 32}%`,
            height: `${60 + row * 26}%`,
            ['--sway-delay' as string]: `${-((i * 7 + row * 3) % 10) * 0.3}s`,
            ['--sway-dur' as string]: '2.8s',
          }}
        />
      ))
    )}
  </div>
);

const STEPS = [
  { title: 'Plant', text: 'Buy seed packets and sow them in any of your five fields.', art: <SeedBag size={54} color="#58a83a" /> },
  { title: 'Grow', text: 'Watch sprouts turn into tall, ripe crops day by day.', art: <CropBadgeArt crop="Corn" stage="young" size={60} /> },
  { title: 'Harvest', text: 'Send the combine through ripe fields and fill the barn.', art: <Combine size={80} /> },
  { title: 'Sell', text: 'Trade at the village market when the price is right.', art: <Coin size={54} /> },
];

const STAGE_ROW: GrowthStage[] = ['sprout', 'young', 'ripening', 'mature'];

export const HomePage: React.FC = () => {
  const farm = useFarmContext();
  const day = farm.farmState?.day ?? 1;
  const started = farm.events.length > 0;

  return (
    <div className="space-y-10">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-[32px] border-[3px] border-[#3b2412] shadow-[0_8px_0_#3b2412] min-h-[560px] sm:min-h-[620px]">
        <Sky mood="day" clouds={5} />
        <Hills className="h-[58%]" />
        <Barn size={200} className="absolute bottom-[30%] left-[3%] hidden sm:block" />
        <Silo size={56} className="absolute bottom-[30%] left-[calc(3%_+_196px)] hidden md:block" />
        <Tree size={70} className="absolute bottom-[30%] left-[42%] hidden md:block" />
        <Windmill size={130} className="absolute bottom-[30%] right-[5%]" fast />
        <div className="absolute bottom-[31%] left-0 drift" style={{ ['--drift-dur' as string]: '30s', ['--drift-delay' as string]: '-6s' }}>
          <Tractor size={92} flip />
        </div>
        <WheatField />

        <div className="relative z-10 flex flex-col items-center text-center px-4 pt-14 sm:pt-20">
          <motion.div
            className="ribbon rounded-full px-4 py-1 text-sm font-extrabold text-[#4f3119] mb-4"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
          >
            A {SEASON_LENGTH}-day farming season · powered by reinforcement learning
          </motion.div>
          <motion.h1
            className="font-display font-bold text-5xl sm:text-7xl text-[#fff6df] leading-[0.95]"
            style={{ textShadow: '0 4px 0 #3b2412, 0 -3px 0 #3b2412, 3px 0 0 #3b2412, -3px 0 0 #3b2412, 0 12px 24px rgba(0,0,0,0.25)' }}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 160, damping: 12 }}
          >
            Autonomous
            <br />
            Farm AI
          </motion.h1>
          <motion.p
            className="mt-4 max-w-xl rounded-2xl bg-[#fff8e6]/92 border-[3px] border-[#6b4423] px-4 py-2 font-bold text-[#4f3119]"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            Plant, grow, harvest and trade across a 30-day season — or hand the tractor keys to a trained AI farmer and watch it work.
          </motion.p>
          <motion.div className="mt-6 flex flex-wrap gap-3 justify-center" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.35 }}>
            <Link to="/farm" className="btn btn-lg">
              <Sprout className="w-5 h-5" /> {started ? `Continue · Day ${Math.min(day, SEASON_LENGTH)}` : 'Enter the farm'}
            </Link>
            <Link to="/ai" className="btn btn-purple btn-lg">
              <Bot className="w-5 h-5" /> Watch the AI farm
            </Link>
          </motion.div>
          {farm.farmState && (
            <motion.div className="mt-5 flex gap-2 flex-wrap justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
              <span className="rounded-full bg-[#fff8e6] border-2 border-[#6b4423] px-3 py-1 text-sm font-extrabold text-[#3b2412] flex items-center gap-1.5">
                <Coin size={18} /> {formatMoney(farm.farmState.cash)}
              </span>
              <span className="rounded-full bg-[#fff8e6] border-2 border-[#6b4423] px-3 py-1 text-sm font-extrabold text-[#3b2412]">
                {farm.farmState.fields.filter((f) => f.crop).length}/5 fields planted
              </span>
            </motion.div>
          )}
        </div>
      </section>

      {/* HOW TO PLAY */}
      <section>
        <SectionTitle>How a season works</SectionTitle>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {STEPS.map((s, i) => (
            <motion.div
              key={s.title}
              className="panel p-4 text-center"
              initial={{ y: 40, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, type: 'spring', stiffness: 140, damping: 16 }}
              whileHover={{ y: -6, rotate: i % 2 ? 1 : -1 }}
            >
              <div className="h-20 grid place-items-center">{s.art}</div>
              <div className="inline-flex items-center gap-1.5 mt-1">
                <span className="w-7 h-7 rounded-full bg-[#ffd65c] border-[3px] border-[#3b2412] grid place-items-center font-display font-bold text-sm">{i + 1}</span>
                <h3 className="font-display font-bold text-xl text-[#3b2412]">{s.title}</h3>
              </div>
              <p className="text-sm font-semibold text-[#6b4f36] mt-1">{s.text}</p>
            </motion.div>
          ))}
        </div>
        <p className="mt-3 text-sm font-bold text-[#4f3119]">Every action — planting, harvesting, selling or resting — takes exactly one day.</p>
      </section>

      {/* ALMANAC */}
      <section>
        <SectionTitle>Crop almanac</SectionTitle>
        <div className="grid md:grid-cols-3 gap-5">
          {CROP_LIST.map((c, i) => (
            <motion.div
              key={c.name}
              className="panel overflow-hidden"
              initial={{ y: 40, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12 }}
            >
              <div className="relative h-36 border-b-[3px] border-[#3b2412]" style={{ background: c.name === 'Rice' ? 'linear-gradient(180deg,#bfe6f7,#7fc6e8)' : 'linear-gradient(180deg,#d9f3fb,#bfe6a8)' }}>
                <div className="absolute inset-x-0 bottom-0 h-6 bg-[#7a4a24]" />
                <div className="absolute inset-x-3 bottom-4 flex justify-around items-end">
                  {STAGE_ROW.map((s) => (
                    <div key={s} className="flex flex-col items-center">
                      <CropSprite crop={c.name} stage={s} className="sway h-24 w-auto" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-display font-bold text-2xl" style={{ color: c.accent }}>
                  {c.name}
                </h3>
                <p className="text-sm font-semibold text-[#6b4f36] mb-3">{c.tagline}</p>
                <dl className="grid grid-cols-2 gap-2 text-sm">
                  {[
                    ['Seed cost', formatMoney(c.plantingCost)],
                    ['Grows in', `${c.growthDays} days`],
                    ['Yield', `${c.yieldAmount} units`],
                    ['Base price', `₹${c.basePrice}/unit`],
                  ].map(([k, v]) => (
                    <div key={k} className="panel-inset px-2.5 py-1.5">
                      <dt className="text-[10px] font-extrabold uppercase tracking-wide text-[#9a6a3c]">{k}</dt>
                      <dd className="font-display font-bold text-[#3b2412]">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* AI + RISKS */}
      <section className="grid lg:grid-cols-2 gap-5">
        <div className="panel p-6 flex flex-col sm:flex-row items-center gap-5">
          <motion.div animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 2.6 }}>
            <Robot size={130} mood="happy" />
          </motion.div>
          <div>
            <h3 className="font-display font-bold text-2xl text-[#3b2412]">The AI farmer</h3>
            <p className="text-[#6b4f36] font-semibold mt-1">
              A PPO agent trained over 500,000 simulated days. Ask it for advice, let it play one day, or turn on autopilot and watch it run the whole season.
            </p>
            <Link to="/ai" className="btn btn-purple mt-3">
              Meet the robot <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
        <div className="panel p-6">
          <h3 className="font-display font-bold text-2xl text-[#3b2412] mb-3">Nature fights back</h3>
          <ul className="space-y-2">
            {[
              { icon: <Sun size={30} hot />, t: 'Droughts', d: 'set every planted field back a day.' },
              { icon: <Bug size={30} />, t: 'Pests', d: 'can wipe out an entire field overnight.' },
              { icon: <Coin size={30} />, t: 'Price shocks', d: 'halve or double the market in a single day.' },
            ].map((r) => (
              <li key={r.t} className="panel-inset flex items-center gap-3 px-3 py-2">
                {r.icon}
                <span className="font-semibold text-[#6b4f36]">
                  <b className="text-[#3b2412]">{r.t}</b> {r.d}
                </span>
              </li>
            ))}
          </ul>
          <Link to="/weather" className="btn btn-sky mt-4">
            Check the forecast <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
};
