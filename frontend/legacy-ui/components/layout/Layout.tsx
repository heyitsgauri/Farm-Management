import React from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import type { NavTab } from './Sidebar';
import type { FarmState, HealthResponse } from '../../types/farm';

interface LayoutProps {
  farmState: FarmState | null;
  health: HealthResponse | null;
  sessionId: string | null;
  lastReward: number | null;
  isLoading: boolean;
  onReset: () => void;
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({
  farmState,
  health,
  sessionId,
  lastReward,
  isLoading,
  onReset,
  activeTab,
  onTabChange,
  children,
}) => {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-primary)]">
      {/* Top Floating / Sticky Header */}
      <Header
        farmState={farmState}
        health={health}
        lastReward={lastReward}
        isLoading={isLoading}
        onReset={onReset}
      />

      {/* Main Content Layout with Sidebar */}
      <div className="flex-1 flex max-w-[1600px] w-full mx-auto">
        <Sidebar
          activeTab={activeTab}
          onTabChange={onTabChange}
          sessionId={sessionId}
        />

        {/* Scrollable Dashboard View */}
        <main className="flex-1 p-6 lg:p-8 overflow-y-auto space-y-6">
          {children}
        </main>
      </div>
    </div>
  );
};
