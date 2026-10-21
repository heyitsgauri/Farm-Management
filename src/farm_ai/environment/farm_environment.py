import random
import gymnasium as gym
import numpy as np
from typing import Any, Dict, List, Optional, Tuple, Union
from ..config.settings import STARTING_CASH, NUM_FIELDS, CROP_CONFIG, SEASON_LENGTH
from ..models.field import Field, FieldState
from ..models.crop import Crop
from ..models.market import Market
from .state import FarmState
from .actions import Action, ActionType
from .rewards import RewardCalculator
from ..simulation.season import SeasonManager
from ..simulation.weather import WeatherSystem
from ..simulation.pests import PestSystem
from ..simulation.price_shocks import PriceShockSystem
from .feasibility import FeasibilityFilter
from ..config.settings import EVENT_PROBABILITIES

# ─────────────────────────────────────────────────────────────
# Flat discrete action index layout (total = 24)
#
#  0        → HOLD
#  1–5      → HARVEST field 0,1,2,3,4
#  6–20     → PLANT crop 0,1,2  ×  field 0,1,2,3,4
#             index = 6 + crop_idx*5 + field_idx
#  21–23    → SELL all of crop 0,1,2
# ─────────────────────────────────────────────────────────────
CROPS: List[str] = list(CROP_CONFIG.keys())   # ["Wheat","Rice","Corn"]
NUM_CROPS: int = len(CROPS)
# Harvest actions: 1 per field
HARVEST_OFFSET = 1
# Plant actions: NUM_CROPS * NUM_FIELDS
PLANT_OFFSET = HARVEST_OFFSET + NUM_FIELDS        # 6
# Sell actions: one per crop (sell all inventory of that crop)
SELL_OFFSET = PLANT_OFFSET + NUM_CROPS * NUM_FIELDS  # 21
TOTAL_ACTIONS = SELL_OFFSET + NUM_CROPS              # 24

# ─────────────────────────────────────────────────────────────
# Observation layout (all floats, normalised where noted)
#
#  0       day / SEASON_LENGTH
#  1       cash / STARTING_CASH
#  2       debt / STARTING_CASH
#  3–7     field state  (EMPTY=0, GROWING=0.5, MATURE=1)
#  8–12    field growth progress / max_growth_days
#  13–17   field crop one-hot index / NUM_CROPS  (0 = no crop)
#  18–20   inventory[Wheat,Rice,Corn] / 300  (arbitrary scale cap)
#  21–23   market prices[Wheat,Rice,Corn] / base_price
#  24–26   risk forecasts (LOW=0, MEDIUM=0.5, HIGH=1)
# total = 27 features
# ─────────────────────────────────────────────────────────────
OBS_SIZE = 27
MAX_INVENTORY = 300.0          # normalisation cap
FORECAST_MAP = {"LOW": 0.0, "MEDIUM": 0.5, "HIGH": 1.0}
FIELD_STATE_MAP = {FieldState.EMPTY: 0.0, FieldState.GROWING: 0.5, FieldState.MATURE: 1.0}


def _int_action_to_farm_action(action_idx: int) -> Action:
    """Converts a flat integer action index to a farm Action object."""
    if action_idx == 0:
        return Action(ActionType.HOLD)

    if action_idx < PLANT_OFFSET:           # HARVEST
        field_id = action_idx - HARVEST_OFFSET
        return Action(ActionType.HARVEST, field_id=field_id)

    if action_idx < SELL_OFFSET:            # PLANT
        idx = action_idx - PLANT_OFFSET
        crop_idx = idx // NUM_FIELDS
        field_id = idx % NUM_FIELDS
        return Action(ActionType.PLANT, field_id=field_id, crop_name=CROPS[crop_idx])

    # SELL all of a crop type
    crop_idx = action_idx - SELL_OFFSET
    return Action(ActionType.SELL, crop_name=CROPS[crop_idx], quantity=None)   # quantity resolved later


class FarmEnvironment(gym.Env):
    """Farm Simulation environment — fully compatible with Gymnasium and Stable-Baselines3.

    Action space  : Discrete(24)  — flat integer index
    Observation   : Box(27,)      — normalised float32 vector

    Baseline agents (RandomAgent, RuleBasedAgent) continue to work by
    passing Action objects directly to step().  PPO passes an integer.
    The environment handles both transparently.
    """

    metadata = {"render_modes": []}

    def __init__(
        self,
        feasibility_filter: Optional[FeasibilityFilter] = None,
        feasibility_mode: str = "deterministic",
        feasibility_threshold: float = 0.70,
        feasibility_method: str = "analytical",
        drought_prob: Optional[float] = None,
        pest_prob: Optional[float] = None,
    ):
        super().__init__()

        self.drought_prob = drought_prob
        self.pest_prob = pest_prob

        # ── Feasibility Filtering ─────────────────────────────────────
        if feasibility_filter is not None:
            self.feasibility_filter = feasibility_filter
        else:
            self.feasibility_filter = FeasibilityFilter(
                mode=feasibility_mode,
                threshold=feasibility_threshold,
                method=feasibility_method,
                drought_prob=drought_prob,
                pest_prob=pest_prob,
            )

        # ── Spaces required by Stable-Baselines3 ──────────────────────
        self.observation_space = gym.spaces.Box(
            low=0.0, high=1.0,
            shape=(OBS_SIZE,),
            dtype=np.float32
        )
        self.action_space = gym.spaces.Discrete(TOTAL_ACTIONS)

        # Internal state (initialised properly in reset)
        self.cash: float = STARTING_CASH
        self.debt: float = 0.0
        self.fields: List[Field] = []
        self.inventory: Dict[str, int] = {}
        self.market: Optional[Market] = None
        self.season_manager: Optional[SeasonManager] = None
        self.weather_system: Optional[WeatherSystem] = None
        self.pest_system: Optional[PestSystem] = None
        self.price_shock_system: Optional[PriceShockSystem] = None

    # ──────────────────────────────────────────────────────────────────
    # Gymnasium API
    # ──────────────────────────────────────────────────────────────────

    def reset(self, seed: Optional[int] = None, options: Optional[Dict] = None) -> Tuple[np.ndarray, Dict]:
        """Resets the environment to day 1."""
        super().reset(seed=seed)

        self.cash = STARTING_CASH
        self.debt = 0.0
        self.fields = [Field(i) for i in range(NUM_FIELDS)]
        self.inventory = {crop: 0 for crop in CROP_CONFIG.keys()}

        # Derive child RNGs from the seed so that every stochastic
        # sub-system is fully reproducible when the same seed is used.
        if seed is not None:
            master_rng = random.Random(seed)
        else:
            master_rng = random.Random()

        # Resolve event probabilities from options, environment config, or default
        d_prob = EVENT_PROBABILITIES["drought"]
        p_prob = EVENT_PROBABILITIES["pest_outbreak"]
        if self.drought_prob is not None:
            d_prob = self.drought_prob
        if self.pest_prob is not None:
            p_prob = self.pest_prob
        if options:
            if "drought_prob" in options:
                d_prob = options["drought_prob"]
            if "pest_prob" in options:
                p_prob = options["pest_prob"]

        self.market = Market(rng=random.Random(master_rng.randint(0, 2**32 - 1)))
        self.season_manager = SeasonManager()
        self.weather_system = WeatherSystem(rng=random.Random(master_rng.randint(0, 2**32 - 1)))
        self.weather_system.drought_probability = d_prob

        self.pest_system = PestSystem(rng=random.Random(master_rng.randint(0, 2**32 - 1)))
        self.pest_system.pest_probability = p_prob

        self.price_shock_system = PriceShockSystem(rng=random.Random(master_rng.randint(0, 2**32 - 1)))
        if self.feasibility_filter is not None:
            self.feasibility_filter.set_seed(master_rng.randint(0, 2**32 - 1) if seed is not None else None)

        return self._get_observation(), {}

    def step(self, action: Union[int, Action]) -> Tuple[np.ndarray, float, bool, bool, Dict]:
        """Executes one day step.

        Accepts either:
          - int   : flat action index (used by PPO)
          - Action: explicit action object (used by baseline agents)
        """
        # ── Resolve integer → Action (for PPO) ────────────────────────
        if isinstance(action, (int, np.integer)):
            farm_action = _int_action_to_farm_action(int(action))
            # Resolve SELL quantity now that we know the inventory
            if farm_action.type == ActionType.SELL and farm_action.quantity is None:
                qty = self.inventory.get(farm_action.crop_name, 0)
                farm_action = Action(ActionType.SELL, crop_name=farm_action.crop_name, quantity=qty)
        else:
            farm_action = action

        # ── Previous wealth for shaped reward ─────────────────────────
        prev_wealth = self._total_wealth()

        # ── Unified validity check (single source of truth) ───────────
        valid_action = self._is_action_valid(farm_action)

        # ── Execute action ─────────────────────────────────────────────
        if valid_action:
            try:
                self._execute_action(farm_action)
            except ValueError:
                # Defence-in-depth: should not happen if _is_action_valid
                # is correct, but we catch it gracefully anyway.
                valid_action = False

        # ── Crop growth ────────────────────────────────────────────────
        for field in self.fields:
            field.advance_day()

        # ── Market & risk updates ──────────────────────────────────────
        self.market.update_prices()
        self.weather_system.update()
        self.pest_system.update()
        self.price_shock_system.update()

        self.weather_system.apply_effects(self.fields)
        self.pest_system.apply_effects(self.fields)
        self.price_shock_system.apply_effects(self.market)

        # ── Shaped reward: Δwealth (cash + inventory value) ───────────
        curr_wealth = self._total_wealth()
        reward = RewardCalculator.calculate_shaped_reward(
            prev_wealth=prev_wealth,
            curr_wealth=curr_wealth,
            valid_action=valid_action,
        )

        # ── Advance day ────────────────────────────────────────────────
        self.season_manager.advance_day()
        terminated = self.season_manager.is_over
        truncated = False
        info: Dict[str, Any] = {}

        if terminated:
            inventory_value = self._inventory_value()
            info = self.season_manager.evaluate_season(self.cash, inventory_value, STARTING_CASH)

        return self._get_observation(), reward, terminated, truncated, info

    # ──────────────────────────────────────────────────────────────────
    # Public helper — returns the human-readable dict state
    # (used by baseline agents)
    # ──────────────────────────────────────────────────────────────────

    def get_dict_state(self) -> Dict[str, Any]:
        """Returns the current state as a human-readable dictionary.

        Baseline agents (Random, Rule-Based) use this instead of the
        numpy observation array.
        """
        return self._get_farm_state().get_state()

    # ──────────────────────────────────────────────────────────────────
    # Internal helpers
    # ──────────────────────────────────────────────────────────────────

    def _execute_action(self, action: Action) -> None:
        """Processes the chosen farm action."""
        if action.type == ActionType.HOLD:
            return

        if action.type == ActionType.PLANT:
            if action.field_id is None or action.crop_name is None:
                raise ValueError("PLANT requires field_id and crop_name")
            field = self.fields[action.field_id]
            crop_config = CROP_CONFIG.get(action.crop_name)
            if not crop_config:
                raise ValueError(f"Unknown crop: {action.crop_name}")
            cost = crop_config["planting_cost"]
            if self.cash < cost:
                raise ValueError("Not enough cash to plant")
            crop = Crop.from_config(action.crop_name, crop_config)
            field.plant(crop)
            self.cash -= cost

        elif action.type == ActionType.HARVEST:
            if action.field_id is None:
                raise ValueError("HARVEST requires field_id")
            field = self.fields[action.field_id]
            crop_name = field.crop.name if field.crop else None
            yield_amount = field.harvest()   # raises ValueError if not mature
            if crop_name:
                self.inventory[crop_name] += yield_amount

        elif action.type == ActionType.SELL:
            if action.crop_name is None or not action.quantity:
                raise ValueError("SELL requires crop_name and quantity > 0")
            if self.inventory.get(action.crop_name, 0) < action.quantity:
                raise ValueError("Not enough inventory to sell")
            price = self.market.get_current_price(action.crop_name)
            self.inventory[action.crop_name] -= action.quantity
            self.cash += price * action.quantity

        elif action.type == ActionType.BUY_INPUT:
            pass  # Future feature

    def _get_observation(self) -> np.ndarray:
        """Converts farm state into a normalised float32 numpy vector (OBS_SIZE,)."""
        obs = np.zeros(OBS_SIZE, dtype=np.float32)

        # 0 — day progress (clamped to observation-space bounds)
        obs[0] = np.clip(self.season_manager.current_day / SEASON_LENGTH, 0.0, 1.0)

        # 1 — cash (normalised by starting cash)
        obs[1] = np.clip(self.cash / STARTING_CASH, 0.0, 5.0)   # cap at 5× starting cash

        # 2 — debt
        obs[2] = np.clip(self.debt / STARTING_CASH, 0.0, 1.0)

        # 3–7  field state | 8–12  growth progress | 13–17  crop index
        max_growth = max(c["growth_days"] for c in CROP_CONFIG.values())
        for i, field in enumerate(self.fields):
            obs[3 + i] = FIELD_STATE_MAP[field.state]
            obs[8 + i] = field.growth_progress / max_growth if max_growth > 0 else 0.0
            if field.crop is not None:
                crop_idx = CROPS.index(field.crop.name)
                obs[13 + i] = (crop_idx + 1) / NUM_CROPS   # 0 = no crop
            else:
                obs[13 + i] = 0.0

        # 18–20 inventory
        for j, crop in enumerate(CROPS):
            obs[18 + j] = np.clip(self.inventory[crop] / MAX_INVENTORY, 0.0, 1.0)

        # 21–23 market prices (normalised by base price)
        for j, crop in enumerate(CROPS):
            base = CROP_CONFIG[crop]["base_price"]
            obs[21 + j] = np.clip(self.market.current_prices[crop] / base, 0.0, 2.0)

        # 24–26 risk forecasts
        obs[24] = FORECAST_MAP.get(self.weather_system.drought_forecast, 0.0)
        obs[25] = FORECAST_MAP.get(self.pest_system.pest_forecast, 0.0)
        obs[26] = FORECAST_MAP.get(self.price_shock_system.shock_forecast, 0.0)

        return obs

    def _get_farm_state(self) -> FarmState:
        """Returns the current farm state as a FarmState object."""
        return FarmState(
            day=self.season_manager.current_day,
            cash=self.cash,
            debt=self.debt,
            fields=self.fields,
            inventory=self.inventory.copy(),
            market_prices=self.market.current_prices.copy(),
            risk_forecasts={
                "drought": self.weather_system.drought_forecast,
                "pest": self.pest_system.pest_forecast,
                "price_shock": self.price_shock_system.shock_forecast,
            },
        )

    def _inventory_value(self) -> float:
        return sum(
            qty * self.market.get_current_price(crop)
            for crop, qty in self.inventory.items()
        )

    def _total_wealth(self) -> float:
        return self.cash + self._inventory_value()

    def _is_action_valid(self, action: Action) -> bool:
        """Checks whether a given action is valid in the current environment state.

        This method is the **single source of truth** for validity.  It is
        called both by ``step()`` (to decide whether to execute the action)
        and by ``get_actions()`` (to expose validity flags to the frontend).
        """
        if action.type == ActionType.HOLD:
            return True

        if action.type == ActionType.PLANT:
            if action.field_id is None or action.crop_name is None:
                return False
            if action.field_id < 0 or action.field_id >= len(self.fields):
                return False
            field = self.fields[action.field_id]
            if field.crop is not None or field.state != FieldState.EMPTY:
                return False
            crop_config = CROP_CONFIG.get(action.crop_name)
            if not crop_config:
                return False
            if self.cash < crop_config["planting_cost"]:
                return False

            # ── Feasibility filtering (deterministic or uncertainty-aware) ──
            if self.feasibility_filter is not None:
                n_planted = sum(1 for f in self.fields if f.is_planted) + 1
                d_forecast = self.weather_system.drought_forecast if self.weather_system else "LOW"
                p_forecast = self.pest_system.pest_forecast if self.pest_system else "LOW"
                base_d_prob = self.weather_system.drought_probability if self.weather_system else EVENT_PROBABILITIES["drought"]
                base_p_prob = self.pest_system.pest_probability if self.pest_system else EVENT_PROBABILITIES["pest_outbreak"]

                if not self.feasibility_filter.is_planting_feasible(
                    crop_name=action.crop_name,
                    current_day=self.season_manager.current_day,
                    season_length=SEASON_LENGTH,
                    num_planted_fields=n_planted,
                    drought_forecast=d_forecast,
                    pest_forecast=p_forecast,
                    base_drought_prob=base_d_prob,
                    base_pest_prob=base_p_prob,
                ):
                    return False
            else:
                days_remaining = SEASON_LENGTH - self.season_manager.current_day
                if crop_config["growth_days"] >= days_remaining:
                    return False

            return True

        if action.type == ActionType.HARVEST:
            if action.field_id is None:
                return False
            if action.field_id < 0 or action.field_id >= len(self.fields):
                return False
            field = self.fields[action.field_id]
            return field.state == FieldState.MATURE

        if action.type == ActionType.SELL:
            if action.crop_name is None:
                return False
            available = self.inventory.get(action.crop_name, 0)
            if available <= 0:
                return False
            # When quantity is specified (baseline agents, resolved PPO),
            # verify it is positive and within available inventory.
            if action.quantity is not None:
                return 0 < action.quantity <= available
            return True  # quantity=None ⇒ "sell all", valid if inventory > 0

        return False

    def action_masks(self) -> np.ndarray:
        """Returns a boolean 1D numpy array of length `TOTAL_ACTIONS` (24).

        True indicates an action is valid in the current state, conforming to the
        standard MaskablePPO interface from sb3-contrib.
        """
        mask = np.zeros(TOTAL_ACTIONS, dtype=bool)
        for idx in range(TOTAL_ACTIONS):
            farm_action = _int_action_to_farm_action(idx)
            mask[idx] = self._is_action_valid(farm_action)
        return mask

    def get_actions(self) -> List[Dict[str, Any]]:
        """Returns all discrete actions with validity flags for the current state."""
        actions = []
        for idx in range(TOTAL_ACTIONS):
            farm_action = _int_action_to_farm_action(idx)
            is_valid = self._is_action_valid(farm_action)
            act_dict: Dict[str, Any] = {
                "id": idx,
                "type": farm_action.type.value,
                "label": str(farm_action),
                "valid": is_valid,
            }
            if farm_action.field_id is not None:
                act_dict["field_id"] = farm_action.field_id
            if farm_action.crop_name is not None:
                act_dict["crop_name"] = farm_action.crop_name
            actions.append(act_dict)
        return actions

    def get_metrics(self) -> Dict[str, Any]:
        """Returns key financial and operational metrics from the environment."""
        inv_val = self._inventory_value()
        wealth = self._total_wealth()
        profit = wealth - STARTING_CASH
        return {
            "current_day": int(self.season_manager.current_day),
            "cash": float(self.cash),
            "debt": float(self.debt),
            "inventory_value": float(inv_val),
            "total_wealth": float(wealth),
            "profit": float(profit),
            "survived": bool(self.cash > 0 or wealth > 0),
            "season_over": bool(self.season_manager.is_over),
            "fields_planted": sum(1 for f in self.fields if f.crop is not None),
            "fields_mature": sum(1 for f in self.fields if f.state == FieldState.MATURE),
        }
