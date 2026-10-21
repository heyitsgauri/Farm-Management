import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Gamepad2,
  Users,
  BarChart3,
  Settings,
  Sprout,
  Calendar,
} from 'lucide-react';
import { useFarmContext } from '../context/FarmContext';

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const farm = useFarmContext();
  const currentDay = farm.farmState?.day ?? 1;

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Play Simulation', path: '/play', icon: Gamepad2 },
    { name: 'Human vs AI', path: '/comparison', icon: Users },
    { name: 'Results & Research', path: '/research', icon: BarChart3 },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-[#071f16] border-r border-[#123827] flex flex-col shrink-0 min-h-screen select-none z-20">
      {/* Brand Header */}
      <div className="p-5 border-b border-[#123827]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white shadow-lg shadow-emerald-900/40">
            <Sprout className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight leading-tight">
              Autonomous Farm AI
            </h1>
            <p className="text-[11px] text-emerald-400 font-medium">
              Smarter Decisions. Healthier Harvests.
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="p-3 space-y-1.5 flex-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.path === '/'
              ? location.pathname === '/' || location.pathname === '/dashboard'
              : location.pathname.startsWith(item.path);

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-emerald-500 text-[#041a12] font-semibold shadow-md shadow-emerald-500/20'
                  : 'text-emerald-100/80 hover:text-white hover:bg-[#0c2f21]'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-[#041a12]' : 'text-emerald-400'}`} />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Season Day Box */}
      <div className="p-4 mx-3 mb-4 rounded-xl bg-[#0b291c] border border-[#16422e]">
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300">
          <Calendar className="w-3.5 h-3.5" />
          <span>Season Day</span>
        </div>
        <div className="mt-1 flex items-baseline justify-between">
          <span className="text-xl font-bold text-white tracking-tight font-mono">
            {currentDay} <span className="text-xs text-emerald-400/70 font-normal">/ 30</span>
          </span>
          <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            Spring
          </span>
        </div>
        <div className="w-full bg-[#061811] h-1.5 rounded-full mt-2 overflow-hidden">
          <div
            className="bg-emerald-400 h-full rounded-full transition-all duration-300"
            style={{ width: `${Math.min(100, Math.round((currentDay / 30) * 100))}%` }}
          />
        </div>
      </div>

      {/* Bottom Footer Quote */}
      <div className="p-4 border-t border-[#123827] text-[11px] text-emerald-400/60 leading-relaxed">
        <div className="flex items-center gap-2 mb-1 text-emerald-400/80 font-medium">
          <Sprout className="w-3.5 h-3.5" />
          <span>Smarter decisions.</span>
        </div>
        Healthier crops. A more sustainable future.
      </div>
    </aside>
  );
};
export default Sidebar;
