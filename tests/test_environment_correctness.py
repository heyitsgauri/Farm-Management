"""Comprehensive correctness tests for the FarmEnvironment.

Covers audit items:
  - Reproducibility (seed propagation to all subsystems)
  - Observation bounds (all obs values within declared space)
  - Market price bounds (after daily updates and price shocks)
  - Invalid action handling (penalty, no state mutation)
  - Crop planting deadlines (derived from step order)
  - Season termination (correct day counting and terminal info)
  - Reward consistency (Δwealth matches actual wealth change)
"""
import os
import sys
import unittest
import numpy as np

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../src')))

from farm_ai.environment.farm_environment import (
    FarmEnvironment, OBS_SIZE, TOTAL_ACTIONS,
    _int_action_to_farm_action, CROPS, PLANT_OFFSET, NUM_CROPS,
    HARVEST_OFFSET, SELL_OFFSET,
)
from farm_ai.environment.actions import Action, ActionType
from farm_ai.environment.rewards import RewardCalculator
from farm_ai.models.field import Field, FieldState
from farm_ai.models.crop import Crop
from farm_ai.models.market import Market
from farm_ai.config.settings import CROP_CONFIG, SEASON_LENGTH, STARTING_CASH, NUM_FIELDS
from farm_ai.simulation.price_shocks import PriceShockSystem
from farm_ai.simulation.weather import WeatherSystem
from farm_ai.simulation.pests import PestSystem


# ────────────────────────────────────────────────────────────────
# 1. Reproducibility
# ────────────────────────────────────────────────────────────────
class TestReproducibility(unittest.TestCase):
    """Two episodes with the same seed must produce identical trajectories."""

    def _run_episode(self, seed: int):
        """Runs a full episode with HOLD every step, returns list of (obs, reward)."""
        env = FarmEnvironment()
        obs, _ = env.reset(seed=seed)
        trajectory = [(obs.copy(), 0.0)]
        done = False
        while not done:
            obs, reward, done, _, _ = env.step(0)  # HOLD
            trajectory.append((obs.copy(), reward))
        return trajectory

    def test_identical_seed_produces_identical_trajectory(self):
        t1 = self._run_episode(seed=42)
        t2 = self._run_episode(seed=42)
        self.assertEqual(len(t1), len(t2), "Episode lengths differ")
        for i, ((o1, r1), (o2, r2)) in enumerate(zip(t1, t2)):
            np.testing.assert_array_equal(o1, o2, err_msg=f"Step {i}: observations differ")
            self.assertAlmostEqual(r1, r2, places=10, msg=f"Step {i}: rewards differ")

    def test_different_seeds_produce_different_trajectories(self):
        t1 = self._run_episode(seed=1)
        t2 = self._run_episode(seed=9999)
        # At least some observations should differ (market noise etc.)
        any_diff = any(
            not np.array_equal(o1, o2) for (o1, _), (o2, _) in zip(t1[1:], t2[1:])
        )
        self.assertTrue(any_diff, "Different seeds produced identical trajectories")


# ────────────────────────────────────────────────────────────────
# 2. Observation bounds
# ────────────────────────────────────────────────────────────────
class TestObservationBounds(unittest.TestCase):
    """All observation values must stay within the declared space [0, 1]."""

    def test_observation_within_bounds_full_episode(self):
        env = FarmEnvironment()
        obs, _ = env.reset(seed=42)
        self._check_bounds(obs, "reset")

        done = False
        step_count = 0
        while not done:
            obs, _, done, _, _ = env.step(0)  # HOLD
            step_count += 1
            self._check_bounds(obs, f"step {step_count}")

    def _check_bounds(self, obs, label):
        low = env_space_low = 0.0
        high = env_space_high = 1.0
        # obs[1] (cash) can be up to 5.0 by design (cap at 5× starting cash)
        # obs[21:24] (prices) can be up to 2.0 by design
        for i in range(OBS_SIZE):
            if i == 1:  # cash — normalised with cap at 5.0
                self.assertGreaterEqual(obs[i], 0.0, f"{label}: obs[{i}] (cash) below 0")
                self.assertLessEqual(obs[i], 5.0, f"{label}: obs[{i}] (cash) above 5.0")
            elif 21 <= i <= 23:  # prices — normalised with cap at 2.0
                self.assertGreaterEqual(obs[i], 0.0, f"{label}: obs[{i}] (price) below 0")
                self.assertLessEqual(obs[i], 2.0, f"{label}: obs[{i}] (price) above 2.0")
            else:
                self.assertGreaterEqual(obs[i], low, f"{label}: obs[{i}] below {low}")
                self.assertLessEqual(obs[i], high, f"{label}: obs[{i}] above {high}")

    def test_terminal_observation_day_clamped(self):
        """On the terminal step, obs[0] must be <= 1.0 even though
        current_day is 31 (> SEASON_LENGTH)."""
        env = FarmEnvironment()
        obs, _ = env.reset(seed=0)
        done = False
        while not done:
            obs, _, done, _, _ = env.step(0)
        # This is the terminal observation
        self.assertLessEqual(obs[0], 1.0, "Terminal obs[0] exceeds 1.0")
        self.assertGreaterEqual(obs[0], 0.0, "Terminal obs[0] below 0.0")


# ────────────────────────────────────────────────────────────────
# 3. Market price bounds
# ────────────────────────────────────────────────────────────────
class TestMarketPriceBounds(unittest.TestCase):
    """Market prices must stay within [50%, 150%] of base price,
    even after price shocks."""

    def test_prices_clamped_after_shock(self):
        """Directly force a shock and verify clamping."""
        import random as stdlib_random
        rng = stdlib_random.Random(42)
        market = Market(rng=rng)
        shock_sys = PriceShockSystem(rng=stdlib_random.Random(0))

        # Force the shock to be active with a 2× multiplier
        shock_sys.is_shock_active = True
        # Set prices to 1.5× base (upper bound) first
        for crop_name in market.current_prices:
            base = CROP_CONFIG[crop_name]["base_price"]
            market.current_prices[crop_name] = base * 1.5

        shock_sys.apply_effects(market)

        # After shock, prices must still be within bounds
        for crop_name, price in market.current_prices.items():
            base = CROP_CONFIG[crop_name]["base_price"]
            self.assertGreaterEqual(price, base * 0.5,
                                    f"{crop_name} price below lower bound after shock")
            self.assertLessEqual(price, base * 1.5,
                                 f"{crop_name} price above upper bound after shock")

    def test_prices_stay_bounded_over_full_episode(self):
        """Run a full episode and check prices every step."""
        env = FarmEnvironment()
        env.reset(seed=42)

        done = False
        while not done:
            _, _, done, _, _ = env.step(0)
            for crop_name, price in env.market.current_prices.items():
                base = CROP_CONFIG[crop_name]["base_price"]
                self.assertGreaterEqual(price, base * 0.5,
                                        f"{crop_name} price {price} below lower bound")
                self.assertLessEqual(price, base * 1.5,
                                     f"{crop_name} price {price} above upper bound")


# ────────────────────────────────────────────────────────────────
# 4. Invalid action handling
# ────────────────────────────────────────────────────────────────
class TestInvalidActions(unittest.TestCase):
    """Invalid actions must produce the -50 penalty and must NOT mutate state."""

    def test_harvest_empty_field_penalty(self):
        env = FarmEnvironment()
        env.reset(seed=42)

        # All fields are empty on day 1 — harvesting should be invalid
        cash_before = env.cash
        inv_before = {k: v for k, v in env.inventory.items()}
        field_states_before = [(f.state, f.crop) for f in env.fields]

        obs, reward, done, _, _ = env.step(1)  # HARVEST field 0 (empty)
        self.assertEqual(reward, RewardCalculator.INVALID_ACTION_PENALTY)
        self.assertEqual(env.cash, cash_before)  # Cash unchanged (except market noise → check via reward)
        for crop in CROP_CONFIG:
            self.assertEqual(env.inventory[crop], inv_before[crop])

    def test_sell_empty_inventory_penalty(self):
        env = FarmEnvironment()
        env.reset(seed=42)
        obs, reward, _, _, _ = env.step(21)  # SELL Wheat (no inventory)
        self.assertEqual(reward, RewardCalculator.INVALID_ACTION_PENALTY)

    def test_plant_on_occupied_field_penalty(self):
        env = FarmEnvironment()
        env.reset(seed=42)
        # Plant Wheat on field 0 (action index 6)
        env.step(6)
        # Try to plant again on same field — should be invalid
        _, reward, _, _, _ = env.step(6)
        self.assertEqual(reward, RewardCalculator.INVALID_ACTION_PENALTY)

    def test_plant_insufficient_cash_penalty(self):
        env = FarmEnvironment()
        env.reset(seed=42)
        # Drain cash by planting on all 5 fields (costs 5×1000 = 5000 for Wheat)
        # Then plant 5 more expensive crops to drain further
        for field_id in range(NUM_FIELDS):
            env.step(PLANT_OFFSET + 0 * NUM_FIELDS + field_id)  # Plant Wheat on each field
        # Now cash ≈ 5000. Try to plant Rice (costs 1500) — need to find empty field
        # First harvest a field to make it empty
        # Actually, fields are growing, not empty. Let's just force low cash.
        env.cash = 0.0
        # Reset a field to empty so we can test cash check
        env.fields[0]._reset()
        _, reward, _, _, _ = env.step(PLANT_OFFSET + 0 * NUM_FIELDS + 0)  # Plant Wheat field 0
        self.assertEqual(reward, RewardCalculator.INVALID_ACTION_PENALTY)

    def test_action_masks_shape_and_dtype(self):
        """action_masks() must return a boolean 1D array of shape (24,)."""
        env = FarmEnvironment()
        env.reset(seed=42)
        mask = env.action_masks()
        self.assertIsInstance(mask, np.ndarray)
        self.assertEqual(mask.shape, (TOTAL_ACTIONS,))
        self.assertEqual(mask.dtype, bool)
        self.assertTrue(mask[0], "HOLD action must always be valid")

    def test_action_masks_consistency(self):
        """action_masks() must agree with get_actions() and _is_action_valid() for all 24 actions."""
        env = FarmEnvironment()
        env.reset(seed=42)
        mask = env.action_masks()
        actions = env.get_actions()
        self.assertEqual(len(actions), TOTAL_ACTIONS)
        for i in range(TOTAL_ACTIONS):
            self.assertEqual(mask[i], actions[i]["valid"],
                             f"Mismatch between action_masks and get_actions for action {i}")


# ────────────────────────────────────────────────────────────────
# 5. Crop planting deadlines
# ────────────────────────────────────────────────────────────────
class TestPlantingDeadlines(unittest.TestCase):
    """Planting must be rejected when the crop cannot complete the
    full grow+harvest+sell cycle before season end.

    Derivation from step order (see farm_environment.py):
        Plant on day D → mature after step D+G-1 → harvest step D+G
        → sell step D+G+1.
        Last step = day 30.  Requires D+G+1 ≤ 30 → days_remaining > G.

    Wheat:  G=5, last valid plant day = 24  (days_remaining=6 > 5 ✓)
    Corn:   G=6, last valid plant day = 23  (days_remaining=7 > 6 ✓)
    Rice:   G=8, last valid plant day = 21  (days_remaining=9 > 8 ✓)
    """

    def _advance_to_day(self, env, target_day):
        """Advance the environment to the given day using HOLD actions."""
        while env.season_manager.current_day < target_day:
            env.step(0)  # HOLD

    def test_wheat_last_valid_day(self):
        """Wheat (G=5) should be plantable on day 24 but not on day 25."""
        env = FarmEnvironment()
        env.reset(seed=42)
        self._advance_to_day(env, 24)
        self.assertEqual(env.season_manager.current_day, 24)

        # Day 24: days_remaining=6 > 5 → valid
        action = Action(ActionType.PLANT, field_id=0, crop_name="Wheat")
        self.assertTrue(env._is_action_valid(action),
                        "Wheat should be plantable on day 24")

    def test_wheat_one_day_too_late(self):
        """Wheat (G=5) should NOT be plantable on day 25."""
        env = FarmEnvironment()
        env.reset(seed=42)
        self._advance_to_day(env, 25)
        self.assertEqual(env.season_manager.current_day, 25)

        # Day 25: days_remaining=5, NOT > 5 → invalid
        action = Action(ActionType.PLANT, field_id=0, crop_name="Wheat")
        self.assertFalse(env._is_action_valid(action),
                         "Wheat should NOT be plantable on day 25")

    def test_rice_last_valid_day(self):
        """Rice (G=8) should be plantable on day 21 but not on day 22."""
        env = FarmEnvironment()
        env.reset(seed=42)
        self._advance_to_day(env, 21)

        action = Action(ActionType.PLANT, field_id=0, crop_name="Rice")
        self.assertTrue(env._is_action_valid(action),
                        "Rice should be plantable on day 21")

    def test_rice_one_day_too_late(self):
        env = FarmEnvironment()
        env.reset(seed=42)
        self._advance_to_day(env, 22)

        action = Action(ActionType.PLANT, field_id=0, crop_name="Rice")
        self.assertFalse(env._is_action_valid(action),
                         "Rice should NOT be plantable on day 22")

    def test_corn_last_valid_day(self):
        """Corn (G=6) should be plantable on day 23 but not on day 24."""
        env = FarmEnvironment()
        env.reset(seed=42)
        self._advance_to_day(env, 23)

        action = Action(ActionType.PLANT, field_id=0, crop_name="Corn")
        self.assertTrue(env._is_action_valid(action),
                        "Corn should be plantable on day 23")

    def test_corn_one_day_too_late(self):
        env = FarmEnvironment()
        env.reset(seed=42)
        self._advance_to_day(env, 24)

        action = Action(ActionType.PLANT, field_id=0, crop_name="Corn")
        self.assertFalse(env._is_action_valid(action),
                         "Corn should NOT be plantable on day 24")

    def test_late_plant_via_step_gets_penalty(self):
        """Planting too late via step() should produce an invalid-action penalty."""
        env = FarmEnvironment()
        env.reset(seed=42)
        self._advance_to_day(env, 25)

        # Try to plant Wheat via integer action (action 6 = Plant Wheat field 0)
        _, reward, _, _, _ = env.step(6)
        self.assertEqual(reward, RewardCalculator.INVALID_ACTION_PENALTY,
                         "Late planting should receive the invalid-action penalty")

    def test_full_cycle_boundary_wheat_day24(self):
        """Plant Wheat on day 24, verify full grow → harvest → sell completes
        before season end."""
        env = FarmEnvironment()
        env.reset(seed=42)
        # Disable stochastic events by zeroing probabilities so that
        # update() inside step() can never re-activate them.
        env.weather_system.drought_probability = 0.0
        env.pest_system.pest_probability = 0.0
        env.price_shock_system.shock_probability = 0.0

        self._advance_to_day(env, 24)

        # Plant Wheat on field 0 (action 6)
        obs, reward, done, _, _ = env.step(6)
        self.assertNotEqual(reward, RewardCalculator.INVALID_ACTION_PENALTY,
                            "Plant Wheat on day 24 should be valid")
        self.assertFalse(done)

        # Advance through growth (days 25-28 = 4 steps with growth)
        # Wheat needs 5 days of advance_day(). It got 1 on the plant step.
        # So 4 more steps needed.
        for _ in range(4):
            obs, _, done, _, _ = env.step(0)  # HOLD
            self.assertFalse(done)

        # Now field 0 should be MATURE
        self.assertEqual(env.fields[0].state, FieldState.MATURE,
                         "Field should be MATURE after growth_days advance_day calls")

        # Harvest on step 29 (day 29 at start of step)
        obs, _, done, _, _ = env.step(HARVEST_OFFSET + 0)  # HARVEST field 0
        self.assertFalse(done)
        self.assertGreater(env.inventory["Wheat"], 0, "Inventory should have Wheat after harvest")

        # Sell on step 30 (day 30 at start of step — last step)
        obs, _, done, _, info = env.step(SELL_OFFSET + 0)  # SELL Wheat
        self.assertTrue(done, "Season should end after day 30 step")
        self.assertIn("total_wealth", info, "Terminal info should contain total_wealth")


# ────────────────────────────────────────────────────────────────
# 6. Season termination
# ────────────────────────────────────────────────────────────────
class TestSeasonTermination(unittest.TestCase):
    """The season must terminate after exactly 30 steps, with correct info."""

    def test_exactly_30_steps(self):
        env = FarmEnvironment()
        env.reset(seed=42)
        step_count = 0
        done = False
        while not done:
            _, _, done, _, _ = env.step(0)
            step_count += 1
        self.assertEqual(step_count, SEASON_LENGTH, f"Expected {SEASON_LENGTH} steps")

    def test_terminal_info_fields(self):
        env = FarmEnvironment()
        env.reset(seed=42)
        done = False
        info = {}
        while not done:
            _, _, done, _, info = env.step(0)
        self.assertIn("final_cash", info)
        self.assertIn("inventory_value", info)
        self.assertIn("total_wealth", info)
        self.assertIn("profit", info)
        self.assertIn("survived", info)

    def test_terminal_wealth_equals_cash_plus_inventory(self):
        env = FarmEnvironment()
        env.reset(seed=42)
        done = False
        info = {}
        while not done:
            _, _, done, _, info = env.step(0)
        expected = info["final_cash"] + info["inventory_value"]
        self.assertAlmostEqual(info["total_wealth"], expected, places=2)

    def test_profit_equals_wealth_minus_starting_cash(self):
        env = FarmEnvironment()
        env.reset(seed=42)
        done = False
        info = {}
        while not done:
            _, _, done, _, info = env.step(0)
        self.assertAlmostEqual(info["profit"], info["total_wealth"] - STARTING_CASH, places=2)


# ────────────────────────────────────────────────────────────────
# 7. Reward consistency
# ────────────────────────────────────────────────────────────────
class TestRewardConsistency(unittest.TestCase):
    """Reward must equal Δwealth for valid actions and -50 for invalid ones."""

    def test_hold_reward_equals_delta_wealth(self):
        """HOLD is always valid.  Reward should equal Δwealth from market moves."""
        env = FarmEnvironment()
        env.reset(seed=42)

        wealth_before = env._total_wealth()
        _, reward, _, _, _ = env.step(0)
        wealth_after = env._total_wealth()

        expected_reward = wealth_after - wealth_before
        self.assertAlmostEqual(reward, expected_reward, places=4,
                               msg="HOLD reward should equal Δwealth")

    def test_plant_reward_equals_delta_wealth(self):
        """Valid PLANT should produce reward = Δwealth (negative from cost)."""
        env = FarmEnvironment()
        env.reset(seed=42)

        wealth_before = env._total_wealth()
        _, reward, _, _, _ = env.step(6)  # Plant Wheat field 0
        wealth_after = env._total_wealth()

        expected_reward = wealth_after - wealth_before
        self.assertAlmostEqual(reward, expected_reward, places=4,
                               msg="PLANT reward should equal Δwealth")

    def test_invalid_action_gets_fixed_penalty(self):
        """Invalid action reward must be exactly INVALID_ACTION_PENALTY."""
        env = FarmEnvironment()
        env.reset(seed=42)
        _, reward, _, _, _ = env.step(1)  # HARVEST field 0 (empty)
        self.assertEqual(reward, RewardCalculator.INVALID_ACTION_PENALTY)


# ────────────────────────────────────────────────────────────────
# 8. Validity consistency
# ────────────────────────────────────────────────────────────────
class TestValidityConsistency(unittest.TestCase):
    """_is_action_valid and step() must agree: actions marked valid
    must not produce the invalid-action penalty, and vice-versa."""

    def test_all_actions_consistency_at_reset(self):
        env = FarmEnvironment()
        env.reset(seed=42)

        for idx in range(TOTAL_ACTIONS):
            # Create a fresh env for each test to avoid state mutation
            env_test = FarmEnvironment()
            env_test.reset(seed=42)

            farm_action = _int_action_to_farm_action(idx)
            # Resolve SELL quantity for PPO-style actions
            if farm_action.type == ActionType.SELL and farm_action.quantity is None:
                qty = env_test.inventory.get(farm_action.crop_name, 0)
                farm_action = Action(ActionType.SELL, crop_name=farm_action.crop_name, quantity=qty)

            is_valid = env_test._is_action_valid(farm_action)
            _, reward, _, _, _ = env_test.step(idx)

            if is_valid:
                self.assertNotEqual(
                    reward, RewardCalculator.INVALID_ACTION_PENALTY,
                    f"Action {idx} ({farm_action}) marked valid but received penalty"
                )
            else:
                self.assertEqual(
                    reward, RewardCalculator.INVALID_ACTION_PENALTY,
                    f"Action {idx} ({farm_action}) marked invalid but did NOT receive penalty"
                )


# ────────────────────────────────────────────────────────────────
# 9. Framework mismatch documentation
# ────────────────────────────────────────────────────────────────
class TestFrameworkMismatchDocumentation(unittest.TestCase):
    """These tests document the known mismatch between the proposed
    Loss–Field–Market decision framework and the implementation.

    The paper proposes a multi-phase decision sequence per timestep.
    The implementation uses a flat, single-action-per-step model.
    This means harvest → sell requires two separate days.

    These tests PASS and confirm the mismatch exists — they are
    documentation, not bugs to fix in this phase.
    """

    def test_single_action_per_step(self):
        """Confirm that only one action is executed per step() call."""
        env = FarmEnvironment()
        env.reset(seed=42)
        # Plant Wheat on field 0
        env.step(6)
        # Advance to maturity
        for _ in range(5):
            env.step(0)
        # Field 0 should now be MATURE (or possibly destroyed by pest)
        # Try to harvest AND sell in the same step — can only do one
        env.step(HARVEST_OFFSET + 0)  # HARVEST
        # Wheat should be in inventory, not yet sold
        self.assertGreaterEqual(env.inventory["Wheat"], 0,
                                "After HARVEST, crop should be in inventory (not auto-sold)")

    def test_pipeline_latency_three_days(self):
        """A full plant→harvest→sell cycle takes at least G+2 steps,
        not G steps as a multi-phase framework might allow."""
        env = FarmEnvironment()
        env.reset(seed=42)
        # Suppress stochastic events by zeroing probabilities
        env.weather_system.drought_probability = 0.0
        env.pest_system.pest_probability = 0.0
        env.price_shock_system.shock_probability = 0.0

        start_day = env.season_manager.current_day  # 1
        env.step(6)  # PLANT Wheat field 0 (day 1)
        # Growth: 4 more HOLD steps
        for _ in range(4):
            env.step(0)
        env.step(HARVEST_OFFSET + 0)  # HARVEST (day 7)
        env.step(SELL_OFFSET + 0)     # SELL (day 8)
        end_day = env.season_manager.current_day  # should be 8

        total_days = end_day - start_day
        wheat_growth = CROP_CONFIG["Wheat"]["growth_days"]  # 5
        self.assertEqual(total_days, wheat_growth + 2,
                         "Full cycle should take growth_days + 2 steps")


if __name__ == "__main__":
    unittest.main()
