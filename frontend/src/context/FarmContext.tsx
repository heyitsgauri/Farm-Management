import { createContext, useContext } from 'react';
import type { FarmController } from '../hooks/useFarm';

export const FarmContext = createContext<FarmController | null>(null);

export function useFarmContext(): FarmController {
  const ctx = useContext(FarmContext);
  if (!ctx) throw new Error('useFarmContext must be used inside <FarmContext.Provider>');
  return ctx;
}
