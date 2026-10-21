# Autonomous Farm AI

Scenario-Aware Economic Decision Framework for Autonomous Farm Management

This project is a reinforcement-learning-based autonomous farm management system. Steps 1–3 have been completed.

## Quick start (one command)

Requirements: **Node.js 20+** and **Python 3.9+**.

```bash
cd autonomous-farm-ai
npm run dev
```

This starts the FastAPI backend (port 8000) and the React frontend, then opens http://localhost:5173 in your browser.
The first run installs all Python and npm packages automatically (a few minutes). Press **Ctrl+C** to stop everything.

---

## Baseline Agents

### Random Agent
- Makes completely random decisions from the available valid actions.
- Used as a **weak lower baseline**.

### Rule-Based Agent
- Uses deterministic, predefined farm-management rules: prioritise harvest → sell inventory → plant most profitable crop → hold.
- Used as a **strong, hand-designed non-learning baseline**.

### Why both are necessary
| Agent | Purpose |
|---|---|
| Random | Lower bound — shows minimum performance |
| Rule-Based | Upper bound for hand-coded logic |
| PPO (next) | Learns a policy that should eventually exceed both |

---

## PPO Reinforcement Learning

PPO (Proximal Policy Optimisation) is the learning agent.  It trains by interacting with the **same** `FarmEnvironment` used by the baseline agents.

### Library
`stable-baselines3 >= 2.0.0`

### Observation Space
27-dimensional normalised `float32` vector covering:  day progress, cash, debt, field states (5 fields), growth progress, crop planted, inventory, market prices, and risk forecasts.

### Action Space
`Discrete(24)`:
- `0` → HOLD
- `1–5` → HARVEST field 0–4
- `6–20` → PLANT (3 crops × 5 fields)
- `21–23` → SELL all of Wheat / Rice / Corn

### Reward Objective
`Δ(total_wealth)` = change in cash + inventory value per step.  Invalid actions are penalised at -50.

### Training
```bash
python scripts/train_ppo.py
```

Default: 50,000 timesteps, CPU, seed 42.  Model saved to `models/ppo/farm_ppo.zip`.

### Evaluation
```bash
python -c "
import sys; sys.path.insert(0,'src')
from farm_ai.training.evaluate_ppo import evaluate
evaluate()
"
```

### TensorBoard
```bash
tensorboard --logdir runs/ppo
```

### Action Distribution Progression Across Training

| Timesteps | HOLD | PLANT | HARVEST | SELL | Active Total |
|---|---|---|---|---|---|
| **50k** | 94% | 2% | 2% | 2% | 6% |
| **100k** | 80% | 8% | 6% | 6% | 20% |
| **200k** | 55% | 20% | 15% | 10% | 45% |
| **500k (Stochastic)** | **2.8%** | **43.2%** | **47.5%** | **6.5%** | **97.2%** |

### Benchmark Results (20 Episodes)

| Agent | Mean Wealth | Mean Profit | Survival |
|---|---|---|---|
| Random | ₹22,832 | ₹12,832 | 100% |
| Rule-Based | ₹37,257 | ₹27,257 | 100% |
| PPO (50k, Stochastic) | ₹11,200 | ₹1,200 | 100% |
| PPO (500k, Stochastic) | ₹13,772 | ₹3,772 | 100% |

> The agent demonstrates a steady, clear learning trajectory: passive HOLD behavior drops from 94% down to under 3%, with active farming actions reaching 97.2%. See [docs/ppo_experiment.md](file:///Users/deepakkumar/Desktop/VIRTUAL%20FARM/autonomous-farm-ai/docs/ppo_experiment.md) for detailed notes.

---

## FastAPI Backend

The FastAPI application provides a clean, modular REST API layer bridging the simulation engine (`FarmEnvironment`) and AI agents (`PPOAgent`) to future user interfaces (such as a React frontend in Step 5).

### Architecture Highlights
- **Communication Layer Only**: FastAPI contains zero farm business logic, reward calculation, or simulation physics. `FarmEnvironment` remains the single source of truth.
- **In-Memory Session Isolation**: Multiple users/clients each have an independent `FarmEnvironment` instance mapped by session UUIDs (`FarmSessionManager`).
- **One-Time Model Loading**: PPO model (`farm_ppo_500k.zip`) is loaded once during server lifespan startup and reused across requests without memory leaks or repeated disk I/O.
- **CORS Configured**: Pre-configured for local frontend development (`http://localhost:3000`, `http://localhost:5173`).

### Start the API Server
```bash
python scripts/run_api.py
```
*(If port 8000 is occupied, it automatically falls back to port 8001. You can also specify `--port <PORT>` or set `API_PORT`.)*

### Interactive API Documentation
- **Swagger UI**: [http://localhost:8001/docs](http://localhost:8001/docs)
- **ReDoc**: [http://localhost:8001/redoc](http://localhost:8001/redoc)

### Endpoints Overview

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Service health status and PPO model availability |
| `POST` | `/api/farm/reset` | Creates a new farm session or resets an existing one |
| `GET` | `/api/farm/{session_id}/state` | Retrieves the current human-readable farm state |
| `GET` | `/api/farm/{session_id}/actions` | Lists all 24 discrete actions with dynamic validity checks |
| `POST` | `/api/farm/{session_id}/action` | Executes a player action (0–23) and advances 1 day |
| `GET` | `/api/farm/{session_id}/metrics` | Returns financial & operational metrics from the environment |
| `DELETE` | `/api/farm/{session_id}` | Deletes session and releases in-memory resources |
| `POST` | `/api/ppo/predict` | Queries PPO for an action without advancing simulation |
| `POST` | `/api/ppo/{session_id}/step` | Queries PPO and executes its action in the environment |

### Complete Workflow Example

1. **Create Simulation Session**:
   ```bash
   curl -X POST http://localhost:8001/api/farm/reset -H "Content-Type: application/json" -d '{"seed": 42}'
   ```
   *Returns:* `{"session_id": "<UUID>", "state": {...}, "info": {}}`

2. **Retrieve Available Actions**:
   ```bash
   curl http://localhost:8001/api/farm/<UUID>/actions
   ```

3. **Execute Human Action** (e.g. Action ID 6: Plant Wheat in Field 0):
   ```bash
   curl -X POST http://localhost:8001/api/farm/<UUID>/action -H "Content-Type: application/json" -d '{"action": 6}'
   ```

4. **Query PPO Agent Action**:
   ```bash
   curl -X POST http://localhost:8001/api/ppo/predict -H "Content-Type: application/json" -d '{"session_id": "<UUID>", "deterministic": true}'
   ```

5. **Execute PPO Step Directly** (Human vs AI gameplay):
   ```bash
   curl -X POST http://localhost:8001/api/ppo/<UUID>/step -H "Content-Type: application/json" -d '{"deterministic": true}'
   ```

6. **Retrieve Current Financial Metrics**:
   ```bash
   curl http://localhost:8001/api/farm/<UUID>/metrics
   ```

---

## Project Structure
```
autonomous-farm-ai/
├── src/farm_ai/
│   ├── environment/   # FarmEnvironment (Gymnasium-compatible)
│   ├── models/        # Crop, Field, Market domain models
│   ├── simulation/    # Weather, Pests, PriceShocks, Season
│   ├── agents/        # RandomAgent, RuleBasedAgent, PPOAgent
│   ├── training/      # train_ppo.py, evaluate_ppo.py
│   ├── config/        # settings.py
│   └── api/           # FastAPI application layer
│       ├── main.py            # FastAPI entry point & lifespan
│       ├── dependencies.py    # Dependency injection providers
│       ├── routes/            # health, farm, and ppo route modules
│       ├── schemas/           # Pydantic request/response schemas
│       └── services/          # FarmSessionManager & PPOService
├── scripts/           # run_simulation.py, run_baselines.py, train_ppo.py, run_api.py
├── models/ppo/        # Saved PPO models (farm_ppo.zip, farm_ppo_500k.zip)
├── tests/             # 35 unit & integration tests
└── docs/              # ppo_experiment.md
```

## Install
```bash
pip install -r requirements.txt
```

## Run Tests
```bash
python -m unittest discover tests -v
```
