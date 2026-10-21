"""Unit and integration tests for Uncertainty-Aware Feasibility Filtering.

Tests coverage:
  - Deterministic filtering reproducing existing baseline behavior
  - Actions near the season deadline
  - Low- and high-uncertainty scenarios
  - Threshold configuration changing the mask as expected
  - Reproducibility with identical seeds
  - Analytical vs Monte Carlo statistical consistency
  - No future-information leakage
  - Consistency between action mask and step execution
  - At least one valid action (HOLD) remaining available in all states
"""

import os
import sys
import unittest
import numpy as np

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../src')))

from farm_ai.environment.farm_environment import (
    FarmEnvironment,
    _int_action_to_farm_action,
    TOTAL_ACTIONS,
    PLANT_OFFSET,
    NUM_FIELDS,
    CROPS,
)
from farm_ai.environment.feasibility import FeasibilityFilter
from farm_ai.environment.actions import Action, ActionType
from farm_ai.environment.rewards import RewardCalculator
from farm_ai.config.settings import CROP_CONFIG, SEASON_LENGTH, EVENT_PROBABILITIES


class TestFeasibilityFilterUnit(unittest.TestCase):
    """Unit tests for the FeasibilityFilter class."""

    def test_deterministic_reproduces_baseline(self):
        """Deterministic mode must match the baseline rule (days_remaining > growth_days)

        across all crops and days 1 to 30.
        """
        filter_det = FeasibilityFilter(mode="deterministic")
        for crop_name, cfg in CROP_CONFIG.items():
            g = cfg["growth_days"]
            for day in range(1, SEASON_LENGTH + 1):
                days_remaining = SEASON_LENGTH - day
                expected_baseline = (days_remaining > g)

                res = filter_det.estimate_planting_feasibility(
                    crop_name=crop_name,
                    current_day=day,
                    season_length=SEASON_LENGTH,
                )
                self.assertEqual(
                    res["feasible"],
                    expected_baseline,
                    f"Mismatch for {crop_name} on day {day}: expected {expected_baseline}, got {res['feasible']}",
                )

    def test_actions_near_season_deadline(self):
        """Examines crop viability on boundary days near season end.

        Wheat (G=5):
          Day 24: slack=0 (tightest possible deterministic completion)
          Day 25: slack=-1 (impossible)
        """
        # Under deterministic filter: Day 24 is valid, Day 25 is invalid
        filter_det = FeasibilityFilter(mode="deterministic")
        self.assertTrue(filter_det.is_planting_feasible("Wheat", current_day=24))
        self.assertFalse(filter_det.is_planting_feasible("Wheat", current_day=25))

        # Under uncertainty-aware filter with threshold 0.60:
        # Day 24 has 0 slack: any drought or pest event causes failure.
        # Completion probability is ~0.50, so tau=0.60 rejects it.
        filter_ua = FeasibilityFilter(mode="uncertainty_aware", threshold=0.60)
        res_day24 = filter_ua.estimate_planting_feasibility("Wheat", current_day=24)
        self.assertLess(res_day24["completion_probability"], 0.60)
        self.assertFalse(res_day24["feasible"], "Day 24 with 0 slack should be rejected under 0.60 threshold")

        # But Day 10 with abundant slack (slack=14) has P ~ 0.65 > 0.60, so it is feasible
        res_day10 = filter_ua.estimate_planting_feasibility("Wheat", current_day=10)
        self.assertGreater(res_day10["completion_probability"], 0.60)
        self.assertTrue(res_day10["feasible"], "Day 10 with ample slack should be feasible under 0.60 threshold")

    def test_low_and_high_uncertainty_scenarios(self):
        """Adverse weather and pest risks reduce completion probability."""
        # Baseline / Low uncertainty
        filter_low = FeasibilityFilter(
            mode="uncertainty_aware",
            threshold=0.50,
            drought_prob=0.01,
            pest_prob=0.01,
            use_forecasts=False,
        )
        res_low = filter_low.estimate_planting_feasibility("Wheat", current_day=20)

        # High adverse uncertainty
        filter_high = FeasibilityFilter(
            mode="uncertainty_aware",
            threshold=0.50,
            drought_prob=0.35,
            pest_prob=0.30,
            use_forecasts=False,
        )
        res_high = filter_high.estimate_planting_feasibility("Wheat", current_day=20)

        self.assertGreater(
            res_low["completion_probability"],
            res_high["completion_probability"],
            "Low uncertainty scenario should have strictly higher completion probability",
        )
        self.assertGreater(res_low["p_maturation"], res_high["p_maturation"])
        self.assertGreater(res_low["p_pest_survival"], res_high["p_pest_survival"])

    def test_threshold_configuration_changes_mask(self):
        """Varying the threshold tau directly changes the feasibility decision."""
        # On Day 22 for Wheat (G=5, M=7, slack=2):
        filter_lenient = FeasibilityFilter(mode="uncertainty_aware", threshold=0.40)
        filter_strict = FeasibilityFilter(mode="uncertainty_aware", threshold=0.95)

        res_lenient = filter_lenient.estimate_planting_feasibility("Wheat", current_day=22)
        res_strict = filter_strict.estimate_planting_feasibility("Wheat", current_day=22)

        p = res_lenient["completion_probability"]
        self.assertAlmostEqual(p, res_strict["completion_probability"], places=4)
        self.assertTrue(res_lenient["feasible"], "Moderate risk should pass lenient threshold")
        self.assertFalse(res_strict["feasible"], "Moderate risk should be rejected by strict 0.95 threshold")

    def test_reproducibility_with_identical_seeds(self):
        """Monte Carlo sampling with the same seed produces identical results."""
        f1 = FeasibilityFilter(mode="uncertainty_aware", method="monte_carlo", num_mc_samples=250, seed=12345)
        f2 = FeasibilityFilter(mode="uncertainty_aware", method="monte_carlo", num_mc_samples=250, seed=12345)

        res1 = f1.estimate_planting_feasibility("Wheat", current_day=15)
        res2 = f2.estimate_planting_feasibility("Wheat", current_day=15)

        self.assertEqual(res1["completion_probability"], res2["completion_probability"])
        self.assertEqual(res1["p_maturation"], res2["p_maturation"])

    def test_analytical_vs_monte_carlo_statistical_agreement(self):
        """Analytical closed-form and Monte Carlo empirical estimates agree within error margin."""
        f_analytical = FeasibilityFilter(mode="uncertainty_aware", method="analytical")
        f_mc = FeasibilityFilter(mode="uncertainty_aware", method="monte_carlo", num_mc_samples=1000, seed=42)

        res_an = f_analytical.estimate_planting_feasibility("Wheat", current_day=18)
        res_mc = f_mc.estimate_planting_feasibility("Wheat", current_day=18)

        # Standard error for n=1000 is ~sqrt(0.25/1000) ~ 0.016; 3 sigma ~ 0.05
        diff = abs(res_an["completion_probability"] - res_mc["completion_probability"])
        self.assertLess(diff, 0.05, f"Monte Carlo and analytical estimates diverged by {diff:.4f}")

    def test_no_future_information_leakage(self):
        """Feasibility estimation only uses decision-time inputs and does not depend on future state."""
        filter_inst = FeasibilityFilter(mode="uncertainty_aware")

        # Call with identical decision-time arguments at different moments
        res1 = filter_inst.estimate_planting_feasibility("Corn", current_day=12, drought_forecast="LOW")
        # Advance an unrelated RNG
        _ = [filter_inst._rng.random() for _ in range(50)]
        res2 = filter_inst.estimate_planting_feasibility("Corn", current_day=12, drought_forecast="LOW")

        self.assertEqual(res1["completion_probability"], res2["completion_probability"])
        self.assertEqual(res1["feasible"], res2["feasible"])

    def test_forecast_modulation_impact(self):
        """HIGH weather/pest forecasts lower the estimated completion probability."""
        filter_inst = FeasibilityFilter(mode="uncertainty_aware", use_forecasts=True)

        res_low = filter_inst.estimate_planting_feasibility("Rice", current_day=10, drought_forecast="LOW", pest_forecast="LOW")
        res_high = filter_inst.estimate_planting_feasibility("Rice", current_day=10, drought_forecast="HIGH", pest_forecast="HIGH")

        self.assertGreater(res_low["completion_probability"], res_high["completion_probability"])


class TestFeasibilityEnvironmentIntegration(unittest.TestCase):
    """Integration tests between FarmEnvironment and FeasibilityFilter."""

    def test_environment_deterministic_mode_default(self):
        """FarmEnvironment default must be deterministic feasibility mode."""
        env = FarmEnvironment()
        self.assertEqual(env.feasibility_filter.mode, "deterministic")

    def test_action_mask_and_step_execution_consistency(self):
        """If action_masks() says False, step() MUST reject the action with INVALID_ACTION_PENALTY

        and must not execute the action.
        """
        # Strict uncertainty-aware threshold
        env = FarmEnvironment(feasibility_mode="uncertainty_aware", feasibility_threshold=0.85)
        env.reset(seed=42)

        # Advance to a high-risk boundary day (day 23)
        while env.season_manager.current_day < 23:
            env.step(0)  # HOLD

        mask = env.action_masks()
        actions = env.get_actions()

        # Verify agreement between action_masks() and get_actions()
        for idx in range(TOTAL_ACTIONS):
            self.assertEqual(mask[idx], actions[idx]["valid"])

        # Find an action filtered out by the uncertainty filter (e.g. planting late)
        # Wheat on field 0 is action 6
        plant_wheat_field0 = 6
        if not mask[plant_wheat_field0]:
            cash_before = env.cash
            _, reward, _, _, _ = env.step(plant_wheat_field0)
            self.assertEqual(reward, RewardCalculator.INVALID_ACTION_PENALTY)
            self.assertEqual(env.cash, cash_before, "Rejected action must not deduct cash")
            self.assertEqual(env.fields[0].state.value, "EMPTY", "Rejected action must not plant field")

    def test_at_least_one_valid_action_always_available(self):
        """Even under extreme adverse conditions (day 30, zero cash, high uncertainty),

        at least one valid action (HOLD) must remain available.
        """
        env = FarmEnvironment(feasibility_mode="uncertainty_aware", feasibility_threshold=0.99)
        env.reset(seed=42)
        env.cash = 0.0  # Cannot afford any planting

        for _ in range(SEASON_LENGTH):
            mask = env.action_masks()
            self.assertGreaterEqual(int(np.sum(mask)), 1, "At least one action must be valid")
            self.assertTrue(mask[0], "Action 0 (HOLD) must always be valid")
            env.step(0)

    def test_reproducibility_with_environment_seed(self):
        """Identical environment seed produces identical feasibility decisions across episode."""
        env1 = FarmEnvironment(feasibility_mode="uncertainty_aware", feasibility_threshold=0.70)
        env2 = FarmEnvironment(feasibility_mode="uncertainty_aware", feasibility_threshold=0.70)

        env1.reset(seed=999)
        env2.reset(seed=999)

        for _ in range(15):
            mask1 = env1.action_masks()
            mask2 = env2.action_masks()
            np.testing.assert_array_equal(mask1, mask2)
            env1.step(0)
            env2.step(0)


if __name__ == "__main__":
    unittest.main()
