import React from 'react';
import {
  LayoutDashboard,
  Sprout,
  TrendingUp,
  ShieldAlert,
  Bot,
  History,
  Terminal,
} from 'lucide-react';

export type NavTab = 'overview' | 'fields' | 'market' | 'risks' | 'ai' | 'history';

interface SidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  sessionId: string | null;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  sessionId,
}) => {
  const navItems = [
    { id: 'overview' as NavTab, label: 'Overview', icon: LayoutDashboard },
    { id: 'fields' as NavTab, label: 'Fields & Crops', icon: Sprout },
    { id: 'market' as NavTab, label: 'Market & Prices', icon: TrendingUp },
    { id: 'risks' as NavTab, label: 'Risk Monitor', icon: ShieldAlert },
    { id: 'ai' as NavTab, label: 'PPO AI Agent', icon: Bot },
    { id: 'history' as NavTab, label: 'Activity Log', icon: History },
  ];

  return (
    <aside className="w-56 shrink-0 hidden md:flex flex-col justify-between p-3">
      <div className="space-y-4">
        {/* Navigation list */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200 text-left ${
                  isActive
                    ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.15)] font-semibold'
                    : 'text-neutral-400 hover:bg-white/5 hover:text-white border border-transparent'
                }`}
              >
                <Icon
                  className={`w-4 h-4 transition-colors ${
                    isActive ? 'text-emerald-400' : 'text-neutral-500'
                  }`}
                />
                <span>{item.label}</span>
                {isActive && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#10b981]" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Reference-style Spec Card */}
        <div className="p-3 rounded-2xl bg-[#0e1014] border border-white/10 text-xs space-y-2">
          <div className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Decision Engine
          </div>
          <p className="text-[11px] text-neutral-400 leading-snug">
            Trained PPO Agent interacts with Gymnasium FarmEnvironment.
          </p>
          <div className="text-[10px] font-mono text-neutral-500 pt-1 border-t border-white/5 flex justify-between">
            <span>Actions</span>
            <span className="text-white font-bold">24 Discrete</span>
          </div>
        </div>
      </div>

      {/* Session Footer */}
      <div className="pt-3 border-t border-white/10 text-[11px] text-neutral-500 space-y-1">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1">
            <Terminal className="w-3 h-3 text-emerald-500" />
            Session
          </span>
          <span className="font-mono text-[10px] text-neutral-300">
            {sessionId ? `${sessionId.slice(0, 6)}...` : 'Connecting'}
          </span>
        </div>
        <div className="text-[10px] text-neutral-600">
          Autonomous Farm Management
        </div>
      </div>
    </aside>
  );
};
