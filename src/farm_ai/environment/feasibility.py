"""Uncertainty-Aware Feasibility Filtering for Finite-Horizon Agricultural Resource Allocation.

This module provides feasibility filtering for discrete farm action spaces over
finite seasonal horizons (e.g. T = 30 days).

Agricultural Pipeline Constraints:
    To generate economic return from planting a crop with nominal growth days G
    on day D of a season with length T:
      1. Step D: Plant crop (state becomes GROWING, progress = 0)
      2. Steps D to D+N-1: Crop grows across N days until reaching progress G.
         - On non-drought days: progress advances by +1.
         - On drought days: advance_day (+1) is counteracted by weather effects (-1),
           resulting in net 0 progress (a 1-day delay).
         - Therefore, reaching maturity requires exactly G non-drought days:
           N = G + K_d drought days.
      3. Step D+N: Harvest crop (field becomes EMPTY, yield enters inventory).
      4. Step D+N+1: Sell crop (inventory converted to cash).

    Last executable step is day T (e.g. 30).
    Total available days from day D until season end: H = T - D + 1.
    Required steps: (G + K_d) + 1 (harvest) + 1 (sell) = G + K_d + 2.
    Maximum growth days available: M = H - 2 = (T - 1) - D.
    For T = 30, M = 29 - D.

Failure Modes:
    1. Deadline/Drought Failure:
       Crop fails to mature by day 28 (M < G + K_d), leaving no time to harvest and sell.
       Probability of maturity: P(X >= G) where X ~ Binomial(M, 1 - p_drought).
    2. Biological Loss (Pest Outbreak):
       Pests destroy the crop before harvest with per-day attack probability.
       Probability of survival: (1 - p_kill)^N.

Feasibility Modes:
    - 'deterministic': Baseline check (M >= G, or days_remaining > G).
    - 'uncertainty_aware': Probabilistic completion filter (P(completion) >= threshold).
"""

import math
import random
from typing import Dict, Any, Optional
from ..config.settings import CROP_CONFIG, SEASON_LENGTH, EVENT_PROBABILITIES


class FeasibilityFilter:
    """Evaluates whether an agricultural action (specifically PLANT) is feasible

    given finite season deadlines, pipeline latency, and environmental uncertainty.
    """

    def __init__(
        self,
        mode: str = "deterministic",
        threshold: float = 0.70,
        method: str = "analytical",
        num_mc_samples: int = 300,
        seed: Optional[int] = None,
        use_forecasts: bool = True,
        drought_prob: Optional[float] = None,
        pest_prob: Optional[float] = None,
    ):
        """Initializes the feasibility filter.

        Args:
            mode: 'deterministic' (deadline-only baseline) or 'uncertainty_aware'
            threshold: Minimum required completion probability tau in [0.0, 1.0]
            method: 'analytical' (exact binomial/survival model) or 'monte_carlo'
            num_mc_samples: Number of forward rollouts if using Monte Carlo
            seed: Optional seed for reproducible Monte Carlo sampling
            use_forecasts: Whether to modulate event probabilities based on current forecasts
            drought_prob: Optional manual override for daily drought probability
            pest_prob: Optional manual override for daily pest probability
        """
        if mode not in ("deterministic", "uncertainty_aware"):
            raise ValueError(f"Unknown feasibility mode: {mode}. Must be 'deterministic' or 'uncertainty_aware'")
        if method not in ("analytical", "monte_carlo"):
            raise ValueError(f"Unknown estimation method: {method}. Must be 'analytical' or 'monte_carlo'")
        if not (0.0 <= threshold <= 1.0):
            raise ValueError(f"Threshold must be in [0.0, 1.0], got {threshold}")

        self.mode = mode
        self.threshold = float(threshold)
        self.method = method
        self.num_mc_samples = int(num_mc_samples)
        self.use_forecasts = bool(use_forecasts)
        self.drought_prob_override = drought_prob
        self.pest_prob_override = pest_prob
        self._rng = random.Random(seed)

    def set_seed(self, seed: Optional[int]) -> None:
        """Sets the random seed for reproducible sampling."""
        if seed is not None:
            self._rng = random.Random(seed)

    def _get_effective_probabilities(
        self,
        drought_forecast: str,
        pest_forecast: str,
        base_drought_prob: float,
        base_pest_prob: float,
    ) -> tuple[float, float]:
        """Calculates decision-time event probabilities without future leakage."""
        p_d = self.drought_prob_override if self.drought_prob_override is not None else base_drought_prob
        p_p = self.pest_prob_override if self.pest_prob_override is not None else base_pest_prob

        if self.use_forecasts:
            # Forecast modulation: forecasts provide Bayesian signal on current conditions
            # LOW: baseline probability
            # MEDIUM: moderate increase
            # HIGH: high increase
            drought_multipliers = {"LOW": 1.0, "MEDIUM": 1.5, "HIGH": 2.2}
            pest_multipliers = {"LOW": 1.0, "MEDIUM": 1.4, "HIGH": 2.0}

            p_d = min(0.95, p_d * drought_multipliers.get(drought_forecast.upper(), 1.0))
            p_p = min(0.95, p_p * pest_multipliers.get(pest_forecast.upper(), 1.0))

        return p_d, p_p

    def estimate_planting_feasibility(
        self,
        crop_name: str,
        current_day: int,
        season_length: int = SEASON_LENGTH,
        num_planted_fields: int = 1,
        drought_forecast: str = "LOW",
        pest_forecast: str = "LOW",
        base_drought_prob: float = EVENT_PROBABILITIES["drought"],
        base_pest_prob: float = EVENT_PROBABILITIES["pest_outbreak"],
    ) -> Dict[str, Any]:
        """Estimates the probability that planting `crop_name` on `current_day` completes

        the full grow -> harvest -> sell cycle before the season terminates.

        Returns a detailed dictionary of metrics and the feasibility boolean.
        """
        crop_config = CROP_CONFIG.get(crop_name)
        if not crop_config:
            return {
                "feasible": False,
                "completion_probability": 0.0,
                "p_maturation": 0.0,
                "p_pest_survival": 0.0,
                "slack_days": -1,
                "available_growth_days": 0,
                "required_growth_days": 0,
                "threshold": self.threshold,
                "mode": self.mode,
            }

        g = crop_config["growth_days"]
        days_remaining = season_length - current_day

        # Maximum available days for growth (need 1 day to harvest, 1 day to sell)
        # Total available decision steps from current_day: H = season_length - current_day + 1
        # Max growth days = H - 2 = season_length - current_day - 1 = days_remaining - 1
        m = days_remaining - 1
        slack_days = m - g

        # ── Deterministic Mode ─────────────────────────────────────────
        if self.mode == "deterministic":
            # Replicates baseline rule: days_remaining > growth_days <=> slack_days >= 0
            is_feasible = bool(slack_days >= 0)
            p_comp = 1.0 if is_feasible else 0.0
            return {
                "feasible": is_feasible,
                "completion_probability": p_comp,
                "p_maturation": p_comp,
                "p_pest_survival": 1.0 if is_feasible else 0.0,
                "slack_days": slack_days,
                "available_growth_days": max(0, m),
                "required_growth_days": g,
                "threshold": self.threshold,
                "mode": self.mode,
            }

        # ── Uncertainty-Aware Mode ─────────────────────────────────────
        # If available days are strictly less than required growth days, completion is impossible
        if m < g:
            return {
                "feasible": False,
                "completion_probability": 0.0,
                "p_maturation": 0.0,
                "p_pest_survival": 0.0,
                "slack_days": slack_days,
                "available_growth_days": max(0, m),
                "required_growth_days": g,
                "threshold": self.threshold,
                "mode": self.mode,
            }

        p_drought, p_pest = self._get_effective_probabilities(
            drought_forecast=drought_forecast,
            pest_forecast=pest_forecast,
            base_drought_prob=base_drought_prob,
            base_pest_prob=base_pest_prob,
        )

        # Per-field pest destruction probability given num_planted_fields
        n_fields = max(1, num_planted_fields)
        p_field_kill = p_pest / n_fields

        if self.method == "analytical":
            p_maturation, p_pest_survival, p_completion = self._compute_analytical(
                g=g,
                m=m,
                p_drought=p_drought,
                p_field_kill=p_field_kill,
            )
        else:
            p_maturation, p_pest_survival, p_completion = self._compute_monte_carlo(
                g=g,
                m=m,
                p_drought=p_drought,
                p_field_kill=p_field_kill,
            )

        is_feasible = bool(p_completion >= self.threshold)

        return {
            "feasible": is_feasible,
            "completion_probability": float(p_completion),
            "p_maturation": float(p_maturation),
            "p_pest_survival": float(p_pest_survival),
            "slack_days": int(slack_days),
            "available_growth_days": int(m),
            "required_growth_days": int(g),
            "threshold": self.threshold,
            "mode": self.mode,
        }

    def _compute_analytical(
        self,
        g: int,
        m: int,
        p_drought: float,
        p_field_kill: float,
    ) -> tuple[float, float, float]:
        """Computes exact closed-form completion probability.

        P(maturation):
            Out of m available days, the number of non-drought days X follows
            Binomial(m, 1 - p_drought). Maturation requires X >= g non-drought days.

        P(pest_survival):
            For a crop maturing on day step n (where g <= n <= m), it survives
            pest outbreaks with probability (1 - p_field_kill)^n.

        Total P(completion) = sum_{n=g}^m P(matures exactly on day n) * (1 - p_field_kill)^n.
        """
        # Edge case: if drought is certain (p_drought == 1.0), growth never advances
        if p_drought >= 1.0:
            return 0.0, 0.0, 0.0

        p_good = 1.0 - p_drought
        p_maturation = 0.0
        p_completion = 0.0

        # Negative Binomial / Stepwise convolution:
        # The crop matures on day n iff day n is the g-th non-drought day,
        # meaning exactly g-1 non-drought days occurred in the first n-1 days,
        # and day n is a non-drought day.
        # Range of n is from g up to m.
        for n in range(g, m + 1):
            comb = math.comb(n - 1, g - 1)
            prob_mature_at_n = comb * (p_good ** g) * (p_drought ** (n - g))
            pest_survival_at_n = (1.0 - p_field_kill) ** n

            p_maturation += prob_mature_at_n
            p_completion += prob_mature_at_n * pest_survival_at_n

        # Conditional pest survival given that it matured
        p_pest_survival = (p_completion / p_maturation) if p_maturation > 0 else 0.0

        return p_maturation, p_pest_survival, p_completion

    def _compute_monte_carlo(
        self,
        g: int,
        m: int,
        p_drought: float,
        p_field_kill: float,
    ) -> tuple[float, float, float]:
        """Computes empirical completion probability via forward trajectory sampling."""
        matures_count = 0
        completed_count = 0

        for _ in range(self.num_mc_samples):
            growth_progress = 0
            survived = True

            for day_idx in range(1, m + 1):
                # Daily drought roll
                drought_active = self._rng.random() < p_drought
                # advance_day (+1) minus drought effect (-1)
                if not drought_active:
                    growth_progress += 1

                # Daily pest roll
                if self._rng.random() < p_field_kill:
                    survived = False
                    break

                if growth_progress >= g:
                    # Matured!
                    matures_count += 1
                    if survived:
                        completed_count += 1
                    break

        p_mat = matures_count / self.num_mc_samples
        p_comp = completed_count / self.num_mc_samples
        p_pest = (p_comp / p_mat) if p_mat > 0 else 0.0

        return p_mat, p_pest, p_comp

    def is_planting_feasible(
        self,
        crop_name: str,
        current_day: int,
        season_length: int = SEASON_LENGTH,
        num_planted_fields: int = 1,
        drought_forecast: str = "LOW",
        pest_forecast: str = "LOW",
        base_drought_prob: float = EVENT_PROBABILITIES["drought"],
        base_pest_prob: float = EVENT_PROBABILITIES["pest_outbreak"],
    ) -> bool:
        """Convenience method returning True iff planting action is feasible."""
        res = self.estimate_planting_feasibility(
            crop_name=crop_name,
            current_day=current_day,
            season_length=season_length,
            num_planted_fields=num_planted_fields,
            drought_forecast=drought_forecast,
            pest_forecast=pest_forecast,
            base_drought_prob=base_drought_prob,
            base_pest_prob=base_pest_prob,
        )
        return res["feasible"]
