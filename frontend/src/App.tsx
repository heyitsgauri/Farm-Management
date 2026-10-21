import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { useFarm } from './hooks/useFarm';
import { FarmContext, useFarmContext } from './context/FarmContext';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { FarmDashboard } from './pages/FarmDashboard';
import { PlaySimulation } from './pages/PlaySimulation';
import { HumanVsAI } from './pages/HumanVsAI';
import { ResultsResearch } from './pages/ResultsResearch';
import { SettingsPage } from './pages/SettingsPage';

const LoadingScreen: React.FC = () => (
  <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
    <div className="w-12 h-12 rounded-full border-2 border-emerald-500/20 border-t-emerald-400 animate-spin mb-4" />
    <h3 className="text-base font-bold text-white tracking-tight">Initializing Farm Simulation</h3>
    <p className="text-xs text-emerald-400/70 mt-1">
      Connecting to FastAPI simulation engine and loading feasibility filter...
    </p>
  </div>
);

const OfflineScreen: React.FC<{ message: string; onRetry: () => void }> = ({ message, onRetry }) => (
  <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] text-center p-8 max-w-md mx-auto">
    <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center mb-4">
      <span className="text-xl">⚠️</span>
    </div>
    <h3 className="text-base font-bold text-white tracking-tight">Backend Server Offline</h3>
    <p className="text-xs text-emerald-300/80 mt-2 leading-relaxed">{message}</p>
    <button onClick={onRetry} className="ag-button-primary text-xs mt-5">
      Retry Connection
    </button>
  </div>
);

const NeedsFarm: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const farm = useFarmContext();
  if (farm.farmState) return <>{children}</>;
  if (farm.isLoading) return <LoadingScreen />;
  return (
    <OfflineScreen
      message={farm.error ?? 'Could not connect to the FastAPI backend on the default local ports (8000/8001).'}
      onRetry={() => farm.initSession()}
    />
  );
};

const MainContent: React.FC = () => {
  const location = useLocation();

  // Pick title for TopBar
  let title = 'Farm Dashboard';
  let subtitle = 'Manage your fields, monitor conditions and make strategic decisions.';
  if (location.pathname.startsWith('/play')) {
    title = 'Play the Simulation';
    subtitle = 'Choose an action, manage your fields and see how your farm evolves.';
  } else if (location.pathname.startsWith('/comparison')) {
    title = 'Human vs AI Comparison';
    subtitle = 'Run the same scenario and compare performance, decisions and outcomes.';
  } else if (location.pathname.startsWith('/research')) {
    title = 'Benchmark Results & Analysis';
    subtitle = 'Empirical evaluation of Uncertainty-Aware Feasibility Filtering.';
  } else if (location.pathname.startsWith('/settings')) {
    title = 'System Settings';
    subtitle = 'Simulation parameters and backend configuration.';
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 min-h-screen bg-[#061811]">
      <TopBar title={title} subtitle={subtitle} />
      <main className="flex-1 p-5 sm:p-7 max-w-[1550px] w-full mx-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
          >
            <Routes location={location}>
              <Route
                path="/"
                element={
                  <NeedsFarm>
                    <FarmDashboard />
                  </NeedsFarm>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <NeedsFarm>
                    <FarmDashboard />
                  </NeedsFarm>
                }
              />
              <Route
                path="/play"
                element={
                  <NeedsFarm>
                    <PlaySimulation />
                  </NeedsFarm>
                }
              />
              <Route
                path="/comparison"
                element={
                  <NeedsFarm>
                    <HumanVsAI />
                  </NeedsFarm>
                }
              />
              <Route
                path="/research"
                element={
                  <NeedsFarm>
                    <ResultsResearch />
                  </NeedsFarm>
                }
              />
              <Route
                path="/settings"
                element={
                  <NeedsFarm>
                    <SettingsPage />
                  </NeedsFarm>
                }
              />
              {/* Backward compatibility redirects */}
              <Route path="/farm" element={<Navigate to="/play" replace />} />
              <Route path="/market" element={<Navigate to="/play" replace />} />
              <Route path="/barn" element={<Navigate to="/" replace />} />
              <Route path="/weather" element={<Navigate to="/" replace />} />
              <Route path="/ai" element={<Navigate to="/comparison" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
};

export function App() {
  const farm = useFarm();

  return (
    <FarmContext.Provider value={farm}>
      <BrowserRouter>
        <div className="flex min-h-screen bg-[#061811] text-[#f0fdf4]">
          <Sidebar />
          <MainContent />
        </div>
      </BrowserRouter>
    </FarmContext.Provider>
  );
}

export default App;
