export type FieldStateType = 'EMPTY' | 'GROWING' | 'MATURE';

export interface FieldState {
  id: number;
  state: FieldStateType;
  crop: string | null;
  progress: number;
}

export interface FarmState {
  day: number;
  cash: number;
  debt: number;
  fields: FieldState[];
  inventory: Record<string, number>;
  market_prices: Record<string, number>;
  risk_forecasts: {
    drought?: string;
    pest?: string;
    price_shock?: string;
    [key: string]: string | undefined;
  };
}

export type ActionType = 'HOLD' | 'PLANT' | 'HARVEST' | 'SELL' | 'BUY_INPUT';

export interface ActionItem {
  id: number;
  type: ActionType;
  label: string;
  valid: boolean;
  field_id?: number | null;
  crop_name?: string | null;
}

export interface FarmMetrics {
  session_id: string;
  current_day: number;
  cash: number;
  debt: number;
  inventory_value: number;
  total_wealth: number;
  profit: number;
  survived: boolean;
  season_over: boolean;
  fields_planted: number;
  fields_mature: number;
}

export interface ResetResponse {
  session_id: string;
  state: FarmState;
  info: Record<string, unknown>;
}

export interface StepResponse {
  session_id: string;
  state: FarmState;
  reward: number;
  terminated: boolean;
  truncated: boolean;
  info: {
    final_cash?: number;
    inventory_value?: number;
    total_wealth?: number;
    profit?: number;
    survived?: boolean;
    [key: string]: unknown;
  };
}

export interface PPOActionDetails {
  id: number;
  type: string;
  label: string;
  field_id?: number | null;
  crop_name?: string | null;
}

export interface PPOPredictResponse {
  session_id: string;
  action: number;
  action_details: PPOActionDetails;
  deterministic: boolean;
}

export interface PPOStepResponse {
  session_id: string;
  action: number;
  action_details: PPOActionDetails;
  state: FarmState;
  reward: number;
  terminated: boolean;
  truncated: boolean;
  info: Record<string, unknown>;
}

export interface HealthResponse {
  status: string;
  service: string;
  version: string;
  ppo_model_loaded: boolean;
}

export interface ActionHistoryEntry {
  id: string;
  day: number;
  actor: 'HUMAN' | 'PPO AI';
  actionId: number;
  actionLabel: string;
  actionType: string;
  reward: number;
  time: string;
}

export type Actor = 'HUMAN' | 'PPO AI';

/** A visual/narrative event derived by diffing the farm state before and after one step. */
export interface FarmEvent {
  id: number;
  actor: Actor;
  actionId: number;
  actionType: string;
  actionLabel: string;
  dayFrom: number;
  dayTo: number;
  reward: number;
  invalid: boolean;
  planted?: { fieldId: number; crop: string; cost: number };
  harvested?: { fieldId: number; crop: string; qty: number };
  sold?: { crop: string; qty: number; revenue: number };
  pestHits: { fieldId: number; crop: string; ratio: number }[];
  droughtFields: number[];
  priceShock: 'UP' | 'DOWN' | null;
}

export interface DaySnapshot {
  day: number;
  cash: number;
  wealth: number;
  prices: Record<string, number>;
  risks: Record<string, string | undefined>;
}

export interface FeasibilityCheckResult {
  crop_name: string;
  field_id: number;
  feasible: boolean;
  completion_probability: number;
  p_maturation: number;
  p_pest_survival: number;
  slack_days: number;
  available_growth_days: number;
  required_growth_days: number;
  threshold: number;
  mode: string;
  reason: string;
}

export interface BenchmarkRecord {
  seed: number;
  scenario: string;
  filter_mode: string;
  threshold: number;
  final_wealth: number;
  profit: number;
  survived: boolean;
  stranded_crops: number;
  invalid_actions: number;
  avg_filter_time_ms: number;
}

export interface BenchmarkSummary {
  scenario: string;
  filter_mode: string;
  threshold: number;
  episodes: number;
  mean_wealth: number;
  std_wealth: number;
  min_wealth: number;
  max_wealth: number;
  survival_rate: number;
  mean_stranded_crops: number;
  avg_filter_time_ms: number;
}

export interface BenchmarkResponse {
  records: BenchmarkRecord[];
  summaries: BenchmarkSummary[];
}

export interface AIEpisodeStep {
  day: number;
  action_type: string;
  action_label: string;
  wealth: number;
  cash: number;
  reasoning?: string;
}

export interface AIEpisodeResponse {
  agent_name: string;
  model_loaded: boolean;
  final_wealth: number;
  profit: number;
  survived: boolean;
  total_harvested: number;
  crop_losses: number;
  stranded_crops: number;
  decisions_made: number;
  trajectory: AIEpisodeStep[];
}

