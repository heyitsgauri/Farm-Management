import type {
  HealthResponse,
  ResetResponse,
  FarmState,
  ActionItem,
  FarmMetrics,
  StepResponse,
  PPOPredictResponse,
  PPOStepResponse,
} from '../types/farm';

const API_BASE_CANDIDATES = Array.from(
  new Set([
    import.meta.env.VITE_API_BASE_URL,
    'http://localhost:8000',
    'http://localhost:8001',
  ].filter(Boolean) as string[])
).map((base) => base.replace(/\/+$/, ''));

class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  let lastError: unknown = null;

  for (const baseUrl of API_BASE_CANDIDATES) {
    const url = `${baseUrl}${endpoint}`;
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(options?.headers || {}),
        },
      });

      if (!response.ok) {
        let detail = `HTTP Error ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData?.detail) {
            detail = typeof errorData.detail === 'string' ? errorData.detail : JSON.stringify(errorData.detail);
          }
        } catch {
          // Fallback to status text
        }
        throw new ApiError(response.status, detail);
      }

      return (await response.json()) as T;
    } catch (error: unknown) {
      if (error instanceof ApiError) {
        throw error;
      }
      lastError = error;
    }
  }

  const message = lastError instanceof Error ? lastError.message : 'Network error or backend unreachable';
  throw new ApiError(0, message);
}

export const farmApi = {
  getHealth: () => request<HealthResponse>('/api/health'),

  resetFarm: (seed?: number, sessionId?: string) =>
    request<ResetResponse>('/api/farm/reset', {
      method: 'POST',
      body: JSON.stringify({
        seed: seed !== undefined ? seed : null,
        session_id: sessionId || null,
      }),
    }),

  getState: (sessionId: string) =>
    request<{ session_id: string; state: FarmState }>(`/api/farm/${sessionId}/state`).then(
      (res) => res.state
    ),

  getActions: (sessionId: string) =>
    request<{ session_id: string; actions: ActionItem[] }>(`/api/farm/${sessionId}/actions`).then(
      (res) => res.actions
    ),

  executeAction: (sessionId: string, actionId: number) =>
    request<StepResponse>(`/api/farm/${sessionId}/action`, {
      method: 'POST',
      body: JSON.stringify({ action: actionId }),
    }),

  getMetrics: (sessionId: string) => request<FarmMetrics>(`/api/farm/${sessionId}/metrics`),

  predictPPOAction: (sessionId: string, deterministic = true) =>
    request<PPOPredictResponse>('/api/ppo/predict', {
      method: 'POST',
      body: JSON.stringify({ session_id: sessionId, deterministic }),
    }),

  stepPPO: (sessionId: string, deterministic = true) =>
    request<PPOStepResponse>(`/api/ppo/${sessionId}/step`, {
      method: 'POST',
      body: JSON.stringify({ deterministic }),
    }),

  deleteSession: (sessionId: string) =>
    request<{ status: string; session_id: string }>(`/api/farm/${sessionId}`, {
      method: 'DELETE',
    }),

  checkFeasibility: (
    sessionId: string,
    params: { crop_name: string; field_id: number; mode?: string; threshold?: number }
  ) =>
    request<import('../types/farm').FeasibilityCheckResult>(`/api/farm/${sessionId}/feasibility`, {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  configureFilter: (
    sessionId: string,
    params: { mode: string; threshold: number }
  ) =>
    request<{ status: string; mode: string; threshold: number }>(`/api/farm/${sessionId}/filter`, {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  getBenchmarkResults: () =>
    request<import('../types/farm').BenchmarkResponse>('/api/farm/benchmark-results'),

  simulateAIEpisode: (params: {
    seed: number;
    scenario: string;
    agent_type: string;
    filter_mode: string;
    threshold: number;
  }) =>
    request<import('../types/farm').AIEpisodeResponse>('/api/farm/simulate-ai-episode', {
      method: 'POST',
      body: JSON.stringify(params),
    }),
};

