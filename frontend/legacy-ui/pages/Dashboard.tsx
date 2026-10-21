import React from 'react';
import {
  Wallet,
  Coins,
  TrendingUp,
  Package,
  Activity,
} from 'lucide-react';

import { useFarm } from '../hooks/useFarm';
import type { NavTab } from '../components/layout/Sidebar';
import { StatCard } from '../components/dashboard/StatCard';
import { FieldGrid } from '../components/dashboard/FieldGrid';
import { MarketPanel } from '../components/dashboard/MarketPanel';
import { RiskPanel } from '../components/dashboard/RiskPanel';
import { InventoryCard } from '../components/dashboard/InventoryCard';
import { AIAssistant } from '../components/dashboard/AIAssistant';
import { ActionPanel } from '../components/dashboard/ActionPanel';
import { ActionHistory } from '../components/dashboard/ActionHistory';
import { SeasonEndModal } from '../components/dashboard/SeasonEndModal';
import { ErrorBanner } from '../components/common/ErrorBanner';
import { Loading } from '../components/common/Loading';

interface DashboardProps {
  activeTab: NavTab;
  farm: ReturnType<typeof useFarm>;
}

export const Dashboard: React.FC<DashboardProps> = ({ activeTab, farm }) => {
  const {
    farmState,
    metrics,
    actions,
    actionHistory,
    aiRecommendation,
    health,
    isLoading,
    isActionExecuting,
    isAIPredicting,
    isAIStepping,
    error,
    isSeasonComplete,
    executeHumanAction,
    askAI,
    executeAIAction,
    resetFarm,
    dismissError,
    initSession,
  } = farm;

  if (isLoading && !farmState) {
    return <Loading message="Initializing Autonomous Farm AI Environment..." />;
  }

  const cash = metrics?.cash ?? farmState?.cash ?? 10000;
  const wealth = metrics?.total_wealth ?? cash;
  const profit = metrics?.profit ?? 0;
  const inventoryVal = metrics?.inventory_value ?? 0;
  const isSolvent = metrics?.survived ?? true;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Error Banner */}
      {error && (
        <ErrorBanner
          message={error}
          onDismiss={dismissError}
          onRetry={() => initSession()}
        />
      )}

      {/* Top 5 Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard
          title="Liquid Cash"
          value={`₹${cash.toLocaleString('en-IN', { maximumFractionDigits: 1 })}`}
          subtitle="Starting ₹10,000"
          icon={Wallet}
          highlightGreen={cash >= 10000}
        />

        <StatCard
          title="Net Wealth"
          value={`₹${wealth.toLocaleString('en-IN', { maximumFractionDigits: 1 })}`}
          subtitle="Cash + Inventory"
          icon={Coins}
          highlightGreen={wealth >= 10000}
        />

        <StatCard
          title="Net Profit"
          value={`${profit >= 0 ? '+₹' : '-₹'}${Math.abs(profit).toLocaleString('en-IN', {
            maximumFractionDigits: 1,
          })}`}
          subtitle="Season return"
          icon={TrendingUp}
          trend={{
            value: profit >= 0 ? `+${((profit / 10000) * 100).toFixed(1)}%` : `${((profit / 10000) * 100).toFixed(1)}%`,
            isPositive: profit >= 0,
          }}
          highlightGreen={profit > 0}
        />

        <StatCard
          title="Inventory"
          value={`₹${inventoryVal.toLocaleString('en-IN', { maximumFractionDigits: 1 })}`}
          subtitle="Stored crops"
          icon={Package}
        />

        <StatCard
          title="Solvency"
          value={isSolvent ? '100% OK' : 'CRITICAL'}
          subtitle={isSolvent ? 'Active Season' : 'Bankrupt'}
          icon={Activity}
          highlightGreen={isSolvent}
        />
      </div>

      {/* Top Container: 5 Field Cards (Exact match to top container in flowmaticai.in) */}
      {(activeTab === 'overview' || activeTab === 'fields') && farmState && (
        <FieldGrid
          fields={farmState.fields}
          actions={actions}
          isExecuting={isActionExecuting || isAIStepping}
          onExecuteAction={executeHumanAction}
        />
      )}

      {/* Bottom 2 Cards: Exactly like the 2-column split in flowmaticai.in */}
      {(activeTab === 'overview' || activeTab === 'ai') && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Let PPO run, and watch it work */}
          <AIAssistant
            health={health}
            metrics={metrics}
            aiRecommendation={aiRecommendation}
            isPredicting={isAIPredicting}
            isStepping={isAIStepping}
            onAskAI={askAI}
            onExecuteAI={executeAIAction}
          />

          {/* Right: Start with what matters. Trigger your way. (With big glowing button and You pill) */}
          <ActionPanel
            actions={actions}
            isExecuting={isActionExecuting || isAIStepping}
            onExecuteAction={executeHumanAction}
          />
        </div>
      )}

      {/* Commodity Market, Inventory & Environmental Risk Row */}
      {(activeTab === 'overview' || activeTab === 'market') && farmState && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <MarketPanel
              prices={farmState.market_prices}
              inventory={farmState.inventory}
              actions={actions}
              isExecuting={isActionExecuting || isAIStepping}
              onExecuteAction={executeHumanAction}
            />
          </div>
          <div>
            <InventoryCard
              inventory={farmState.inventory}
              marketPrices={farmState.market_prices}
            />
          </div>
        </div>
      )}

      {(activeTab === 'overview' || activeTab === 'risks') && farmState && (
        <RiskPanel forecasts={farmState.risk_forecasts} />
      )}

      {(activeTab === 'overview' || activeTab === 'history') && (
        <ActionHistory history={actionHistory} />
      )}

      {/* End of Season Dialog */}
      <SeasonEndModal
        isOpen={isSeasonComplete}
        metrics={metrics}
        onReset={() => resetFarm()}
      />
    </div>
  );
};
