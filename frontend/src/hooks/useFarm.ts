import { useState, useEffect, useCallback, useRef } from 'react';
import { farmApi } from '../services/api';
import type {
  Actor,
  FarmState,
  FarmMetrics,
  ActionItem,
  ActionHistoryEntry,
  DaySnapshot,
  FarmEvent,
  PPOPredictResponse,
  HealthResponse,
} from '../types/farm';
import { cropInfo, prettyLabel } from '../game/crops';

export type AutopilotSpeed = 'slow' | 'normal' | 'fast';
export const AUTOPILOT_DELAY: Record<AutopilotSpeed, number> = { slow: 2600, normal: 1500, fast: 700 };

interface StepMeta {
  actor: Actor;
  actionId: number;
  actionType: string;
  actionLabel: string;
  fieldId?: number | null;
  crop?: string | null;
}

/** Diff two farm states to recover what visibly happened during one simulated day. */
function deriveEvent(id: number, prev: FarmState, next: FarmState, meta: StepMeta, reward: number): FarmEvent {
  const event: FarmEvent = {
    id,
    actor: meta.actor,
    actionId: meta.actionId,
    actionType: meta.actionType,
    actionLabel: meta.actionLabel,
    dayFrom: prev.day,
    dayTo: next.day,
    reward,
    invalid: false,
    pestHits: [],
    droughtFields: [],
    priceShock: null,
  };

  const cashDelta = next.cash - prev.cash;

  if (meta.actionType === 'PLANT' && meta.fieldId != null && meta.crop) {
    if (cashDelta < -0.5) event.planted = { fieldId: meta.fieldId, crop: meta.crop, cost: -cashDelta };
    else event.invalid = true;
  }

  if (meta.actionType === 'HARVEST' && meta.fieldId != null) {
    const before = prev.fields.find((f) => f.id === meta.fieldId);
    const crop = before?.crop ?? null;
    const qty = crop ? (next.inventory[crop] ?? 0) - (prev.inventory[crop] ?? 0) : 0;
    if (crop && qty > 0) event.harvested = { fieldId: meta.fieldId, crop, qty };
    else event.invalid = true;
  }

  if (meta.actionType === 'SELL' && meta.crop) {
    const qty = (prev.inventory[meta.crop] ?? 0) - (next.inventory[meta.crop] ?? 0);
    if (qty > 0 && cashDelta > 0) event.sold = { crop: meta.crop, qty, revenue: cashDelta };
    else event.invalid = true;
  }

  for (const after of next.fields) {
    const before = prev.fields.find((f) => f.id === after.id);
    if (!before) continue;
    const harvestedHere = event.harvested?.fieldId === after.id;
    const plantedHere = event.planted?.fieldId === after.id;

    // Crop vanished without a harvest → pest outbreak
    if (after.state === 'EMPTY') {
      if (before.state !== 'EMPTY' && before.crop && !harvestedHere) {
        const days = cropInfo(before.crop)?.growthDays ?? 5;
        event.pestHits.push({
          fieldId: after.id,
          crop: before.crop,
          ratio: before.state === 'MATURE' ? 1 : before.progress / days,
        });
      } else if (plantedHere && event.planted) {
        event.pestHits.push({ fieldId: after.id, crop: event.planted.crop, ratio: 0.1 });
      }
      continue;
    }

    // Growth stalled or reversed → drought
    if (!plantedHere && before.crop === after.crop) {
      const stalled =
        (before.state === 'GROWING' && after.progress <= before.progress) ||
        (before.state === 'MATURE' && after.progress < before.progress);
      if (stalled) event.droughtFields.push(after.id);
    }
  }

  // Price shocks multiply every price by 0.5 or 2 (daily drift is only ±5%)
  const ratios = Object.keys(next.market_prices).map(
    (k) => next.market_prices[k] / (prev.market_prices[k] || next.market_prices[k])
  );
  if (ratios.length && ratios.every((r) => r > 1.6)) event.priceShock = 'UP';
  else if (ratios.length && ratios.every((r) => r < 0.62)) event.priceShock = 'DOWN';

  return event;
}

function snapshot(state: FarmState, metrics: FarmMetrics | null): DaySnapshot {
  return {
    day: state.day,
    cash: state.cash,
    wealth: metrics?.total_wealth ?? state.cash,
    prices: { ...state.market_prices },
    risks: { ...state.risk_forecasts },
  };
}

export function useFarm() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [farmState, setFarmState] = useState<FarmState | null>(null);
  const [metrics, setMetrics] = useState<FarmMetrics | null>(null);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [actionHistory, setActionHistory] = useState<ActionHistoryEntry[]>([]);
  const [aiRecommendation, setAiRecommendation] = useState<PPOPredictResponse | null>(null);
  const [lastReward, setLastReward] = useState<number | null>(null);

  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isActionExecuting, setIsActionExecuting] = useState<boolean>(false);
  const [isAIPredicting, setIsAIPredicting] = useState<boolean>(false);
  const [isAIStepping, setIsAIStepping] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isSeasonComplete, setIsSeasonComplete] = useState<boolean>(false);

  // Game-layer state
  const [lastEvent, setLastEvent] = useState<FarmEvent | null>(null);
  const [events, setEvents] = useState<FarmEvent[]>([]);
  const [timeline, setTimeline] = useState<DaySnapshot[]>([]);
  const [autopilot, setAutopilot] = useState(false);
  const [autopilotSpeed, setAutopilotSpeed] = useState<AutopilotSpeed>('normal');
  const [deterministic, setDeterministic] = useState(true);

  const eventCounter = useRef(0);
  const stateRef = useRef<FarmState | null>(null);
  useEffect(() => {
    stateRef.current = farmState;
  }, [farmState]);
  const busyRef = useRef(false);

  const checkHealth = useCallback(async () => {
    try {
      const h = await farmApi.getHealth();
      setHealth(h);
      return h;
    } catch {
      setHealth(null);
      setError('Backend API is unreachable. Ensure the FastAPI server is running on a local port (typically 8000 or 8001).');
      return null;
    }
  }, []);

  const refreshSessionData = useCallback(async (sid: string) => {
    try {
      const [stateData, actionsData, metricsData] = await Promise.all([
        farmApi.getState(sid),
        farmApi.getActions(sid),
        farmApi.getMetrics(sid),
      ]);
      setFarmState(stateData);
      setActions(actionsData);
      setMetrics(metricsData);
      if (metricsData.season_over) setIsSeasonComplete(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to refresh farm state');
    }
  }, []);

  const startFresh = useCallback(async (seed: number, existingSid?: string) => {
    const resetRes = await farmApi.resetFarm(seed, existingSid);
    const sid = resetRes.session_id;
    const [actionsData, metricsData] = await Promise.all([
      farmApi.getActions(sid),
      farmApi.getMetrics(sid),
    ]);
    setSessionId(sid);
    setFarmState(resetRes.state);
    setActions(actionsData);
    setMetrics(metricsData);
    setLastReward(null);
    setIsSeasonComplete(false);
    setAiRecommendation(null);
    setActionHistory([]);
    setEvents([]);
    setLastEvent(null);
    setAutopilot(false);
    setTimeline([snapshot(resetRes.state, metricsData)]);
  }, []);

  const initSession = useCallback(async (seed = 42) => {
    setIsLoading(true);
    setError(null);
    try {
      const h = await checkHealth();
      if (h) await startFresh(seed);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to initialize farm session');
    } finally {
      setIsLoading(false);
    }
  }, [checkHealth, startFresh]);

  useEffect(() => {
    initSession();
  }, [initSession]);

  /** Shared post-step bookkeeping for both human and AI moves. */
  const recordStep = useCallback(
    async (sid: string, prev: FarmState, next: FarmState, meta: StepMeta, reward: number, done: boolean) => {
      setFarmState(next);
      setLastReward(reward);
      setAiRecommendation(null);

      const [newActions, newMetrics] = await Promise.all([
        farmApi.getActions(sid),
        farmApi.getMetrics(sid),
      ]);
      setActions(newActions);
      setMetrics(newMetrics);

      eventCounter.current += 1;
      const event = deriveEvent(eventCounter.current, prev, next, meta, reward);
      setLastEvent(event);
      setEvents((list) => [event, ...list].slice(0, 120));
      setTimeline((t) => [...t.filter((s) => s.day < next.day), snapshot(next, newMetrics)]);

      setActionHistory((list) =>
        [
          {
            id: crypto.randomUUID(),
            day: prev.day,
            actor: meta.actor,
            actionId: meta.actionId,
            actionLabel: meta.actionLabel,
            actionType: meta.actionType,
            reward,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          },
          ...list,
        ].slice(0, 60)
      );

      if (done || newMetrics.season_over) {
        setIsSeasonComplete(true);
        setAutopilot(false);
      }
    },
    []
  );

  const executeHumanAction = useCallback(async (actionId: number) => {
    const prev = stateRef.current;
    if (!sessionId || !prev || busyRef.current) return;
    busyRef.current = true;
    setIsActionExecuting(true);
    setError(null);
    try {
      const selected = actions.find((a) => a.id === actionId);
      const stepRes = await farmApi.executeAction(sessionId, actionId);
      await recordStep(
        sessionId,
        prev,
        stepRes.state,
        {
          actor: 'HUMAN',
          actionId,
          actionType: selected?.type ?? 'UNKNOWN',
          actionLabel: selected ? prettyLabel(selected.label) : `Action ${actionId}`,
          fieldId: selected?.field_id,
          crop: selected?.crop_name,
        },
        stepRes.reward,
        stepRes.terminated || stepRes.truncated
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to execute action');
    } finally {
      busyRef.current = false;
      setIsActionExecuting(false);
    }
  }, [sessionId, actions, recordStep]);

  const askAI = useCallback(async (det = deterministic) => {
    if (!sessionId) return;
    setIsAIPredicting(true);
    setError(null);
    try {
      setAiRecommendation(await farmApi.predictPPOAction(sessionId, det));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'PPO AI inference failed');
    } finally {
      setIsAIPredicting(false);
    }
  }, [sessionId, deterministic]);

  const executeAIAction = useCallback(async (det = deterministic) => {
    const prev = stateRef.current;
    if (!sessionId || !prev || busyRef.current) return;
    busyRef.current = true;
    setIsAIStepping(true);
    setError(null);
    try {
      const stepRes = await farmApi.stepPPO(sessionId, det);
      const d = stepRes.action_details;
      await recordStep(
        sessionId,
        prev,
        stepRes.state,
        {
          actor: 'PPO AI',
          actionId: stepRes.action,
          actionType: d.type,
          actionLabel: prettyLabel(d.label),
          fieldId: d.field_id,
          crop: d.crop_name,
        },
        stepRes.reward,
        stepRes.terminated || stepRes.truncated
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to execute PPO AI action');
      setAutopilot(false);
    } finally {
      busyRef.current = false;
      setIsAIStepping(false);
    }
  }, [sessionId, deterministic, recordStep]);

  // Autopilot: keep stepping the PPO agent on a timer, across page navigation
  useEffect(() => {
    if (!autopilot || isSeasonComplete || isAIStepping || isActionExecuting || !sessionId) return;
    const t = window.setTimeout(() => executeAIAction(), AUTOPILOT_DELAY[autopilotSpeed]);
    return () => window.clearTimeout(t);
  }, [autopilot, autopilotSpeed, isSeasonComplete, isAIStepping, isActionExecuting, sessionId, executeAIAction, farmState]);

  const resetFarm = useCallback(async (seed = 42) => {
    setIsLoading(true);
    setError(null);
    try {
      await startFresh(seed, sessionId || undefined);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to reset farm');
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, startFresh]);

  const dismissError = useCallback(() => setError(null), []);

  return {
    sessionId,
    farmState,
    metrics,
    actions,
    actionHistory,
    aiRecommendation,
    lastReward,
    health,
    isLoading,
    isActionExecuting,
    isAIPredicting,
    isAIStepping,
    isBusy: isActionExecuting || isAIStepping,
    error,
    isSeasonComplete,
    lastEvent,
    events,
    timeline,
    autopilot,
    setAutopilot,
    autopilotSpeed,
    setAutopilotSpeed,
    deterministic,
    setDeterministic,
    checkHealth,
    initSession,
    refreshSessionData,
    executeHumanAction,
    askAI,
    executeAIAction,
    resetFarm,
    dismissError,
  };
}

export type FarmController = ReturnType<typeof useFarm>;
