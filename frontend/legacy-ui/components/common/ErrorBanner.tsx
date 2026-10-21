import React from 'react';
import { AlertCircle, X, RotateCcw } from 'lucide-react';

interface ErrorBannerProps {
  message: string;
  onDismiss?: () => void;
  onRetry?: () => void;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({
  message,
  onDismiss,
  onRetry,
}) => {
  return (
    <div className="p-3.5 rounded-xl bg-rose-950/80 border border-rose-800/60 text-rose-300 text-xs flex items-center justify-between gap-3 shadow-lg mb-4 animate-in fade-in">
      <div className="flex items-center gap-2.5">
        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
        <span>{message}</span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-2.5 py-1 rounded-lg bg-rose-900/60 hover:bg-rose-900 text-white font-medium flex items-center gap-1 transition-all"
          >
            <RotateCcw className="w-3 h-3" /> Retry
          </button>
        )}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="p-1 rounded-lg hover:bg-rose-900/60 text-rose-400 hover:text-white transition-all"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
