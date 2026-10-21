import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingProps {
  message?: string;
}

export const Loading: React.FC<LoadingProps> = ({ message = 'Initializing Farm Simulation...' }) => {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 text-center space-y-4">
      <div className="w-12 h-12 rounded-2xl bg-[var(--bg-card-elevated)] border border-[var(--border-green)] flex items-center justify-center shadow-[var(--shadow-emerald)]">
        <Loader2 className="w-6 h-6 text-[var(--emerald-400)] animate-spin" />
      </div>
      <div>
        <h3 className="text-sm font-bold text-white tracking-wide">{message}</h3>
        <p className="text-xs text-[var(--text-muted)] mt-1">Connecting to FastAPI backend &amp; PPO inference service</p>
      </div>
    </div>
  );
};
