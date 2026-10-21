"""Benchmark script comparing Deterministic vs. Uncertainty-Aware Feasibility Filtering

for Finite-Horizon Agricultural Resource Allocation.

Evaluates:
  - Final wealth (mean ± std)
  - Survival rate
  - Stranded crops count at season end
  - Invalid action count
  - Average filter / decision computation time (ms)

Conditions tested:
  - Normal conditions (default event probabilities)
  - Adverse conditions (elevated drought & pest outbreak probabilities)

Outputs:
  - CSV file with per-episode data
  - Formatted terminal report and summary statistics
"""

import sys
import os
import time
import csv
import statistics
from typing import Dict, Any, List, Optional

# Ensure stdout handles UTF-8 on Windows cp1252 shells
if sys.stdout.encoding != "utf-8":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../src")))

from farm_ai.environment.farm_environment import FarmEnvironment, _int_action_to_farm_action
from farm_ai.environment.feasibility import FeasibilityFilter
from farm_ai.agents.rule_based_agent import RuleBasedAgent
from farm_ai.agents.random_agent import RandomAgent
from farm_ai.environment.actions import Action, ActionType
from farm_ai.config.settings import EVENT_PROBABILITIES, SEASON_LENGTH


EVAL_SEEDS = [
    42, 100, 999, 1234, 5555, 777, 888, 9999, 11111, 22222,
    33333, 44444, 55555, 66666, 77777, 88888, 99999, 10101, 20202, 30303
]

OUTPUT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../benchmark_results"))
CSV_PATH = os.path.join(OUTPUT_DIR, "feasibility_benchmark.csv")


class MaskAwareAgent:
    """An agent that chooses economic actions respecting the environment's action mask.

    Harvests mature fields first, sells inventory, and plants the highest expected-value
    crop among actions currently marked VALID by the active feasibility filter.
    """

    def __init__(self, agent_name: str = "MaskAwareRuleBased"):
        self.name = agent_name

    def select_action(self, env: FarmEnvironment) -> Action:
        valid_actions = env.get_actions()
        dict_state = env.get_dict_state()

        # 1. Harvest if valid
        for act in valid_actions:
            if act["type"] == "HARVEST" and act["valid"]:
                return Action(ActionType.HARVEST, field_id=act["field_id"])

        # 2. Sell if valid and inventory available
        for act in valid_actions:
            if act["type"] == "SELL" and act["valid"]:
                qty = dict_state["inventory"].get(act["crop_name"], 0)
                if qty > 0:
                    return Action(ActionType.SELL, crop_name=act["crop_name"], quantity=qty)

        # 3. Plant among valid actions with highest margin
        valid_plant_actions = [a for a in valid_actions if a["type"] == "PLANT" and a["valid"]]
        if valid_plant_actions:
            # Sort by crop market price / margin
            best_act = max(
                valid_plant_actions,
                key=lambda a: dict_state["market_prices"].get(a["crop_name"], 0.0),
            )
            return Action(ActionType.PLANT, field_id=best_act["field_id"], crop_name=best_act["crop_name"])

        # 4. Fallback to HOLD
        return Action(ActionType.HOLD)


def run_single_episode(
    env: FarmEnvironment,
    agent: Any,
    seed: int,
    options: Optional[Dict] = None,
) -> Dict[str, Any]:
    """Runs one full 30-day episode and records performance and filter timing."""
    obs, _ = env.reset(seed=seed, options=options)
    done = False
    step_times_ms: List[float] = []
    invalid_actions_count = 0
    total_steps = 0

    while not done:
        t0 = time.perf_counter()
        action = agent.select_action(env)
        dt = (time.perf_counter() - t0) * 1000.0  # ms
        step_times_ms.append(dt)

        # Execute
        obs, reward, done, _, info = env.step(action)
        total_steps += 1
        if reward <= -50.0:  # Invalid action penalty
            invalid_actions_count += 1

    # End of episode metrics
    stranded_crops = sum(1 for f in env.fields if f.is_planted)
    metrics = env.get_metrics()

    return {
        "final_wealth": metrics["total_wealth"],
        "profit": metrics["profit"],
        "survived": metrics["survived"],
        "stranded_crops": stranded_crops,
        "invalid_actions": invalid_actions_count,
        "avg_filter_time_ms": statistics.mean(step_times_ms) if step_times_ms else 0.0,
    }


def run_benchmark(
    seeds: List[int] = EVAL_SEEDS,
) -> List[Dict[str, Any]]:
    """Runs matched-seed benchmark comparing Deterministic vs Uncertainty-Aware filtering

    under Normal and Adverse environmental conditions.
    """
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    results: List[Dict[str, Any]] = []
    agent = MaskAwareAgent()

    scenarios = [
        ("Normal", {"drought": 0.05, "pest_outbreak": 0.08}),
        ("Adverse", {"drought": 0.20, "pest_outbreak": 0.18}),
    ]

    filter_configs = [
        ("Deterministic", "deterministic", 0.0),
        ("Uncertainty-Aware (tau=0.10)", "uncertainty_aware", 0.10),
        ("Uncertainty-Aware (tau=0.30)", "uncertainty_aware", 0.30),
        ("Uncertainty-Aware (tau=0.50)", "uncertainty_aware", 0.50),
    ]

    print("\n" + "=" * 70)
    print("STARTING FEASIBILITY FILTERING BENCHMARK")
    print(f"Seeds: {len(seeds)} | Thresholds: tau in [0.10, 0.30, 0.50]")
    print("=" * 70)

    for scenario_name, risk_probs in scenarios:
        sim_options = {
            "drought_prob": risk_probs["drought"],
            "pest_prob": risk_probs["pest_outbreak"],
        }
        for filter_label, f_mode, f_thresh in filter_configs:
            print(f"\nEvaluating: Scenario={scenario_name:<8} | Filter={filter_label:<28} ...", end="", flush=True)

            ep_results = []
            for seed in seeds:
                # Instantiate environment with configured feasibility filter
                f_filter = FeasibilityFilter(
                    mode=f_mode,
                    threshold=f_thresh,
                    method="analytical",
                    drought_prob=risk_probs["drought"],
                    pest_prob=risk_probs["pest_outbreak"],
                )
                env = FarmEnvironment(
                    feasibility_filter=f_filter,
                    drought_prob=risk_probs["drought"],
                    pest_prob=risk_probs["pest_outbreak"],
                )

                ep_data = run_single_episode(env, agent, seed, options=sim_options)
                ep_data["seed"] = seed
                ep_data["scenario"] = scenario_name
                ep_data["filter_mode"] = filter_label
                ep_data["threshold"] = f_thresh
                ep_results.append(ep_data)
                results.append(ep_data)

            mean_w = statistics.mean([r["final_wealth"] for r in ep_results])
            print(f" Done! Mean Wealth: ₹{mean_w:,.2f}")

    # Save to CSV
    fieldnames = [
        "seed", "scenario", "filter_mode", "threshold",
        "final_wealth", "profit", "survived", "stranded_crops",
        "invalid_actions", "avg_filter_time_ms",
    ]
    with open(CSV_PATH, mode="w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for row in results:
            writer.writerow(row)

    print(f"\n[OK] Per-episode results saved to: {CSV_PATH}")
    return results


def print_summary_table(results: List[Dict[str, Any]]):
    """Prints a comparative summary table aggregating performance by Scenario and Filter Mode."""
    print("\n" + "=" * 80)
    print("FEASIBILITY FILTER BENCHMARK SUMMARY REPORT")
    print("=" * 80)

    groups: Dict[tuple, List[Dict[str, Any]]] = {}
    for r in results:
        key = (r["scenario"], r["filter_mode"])
        groups.setdefault(key, []).append(r)

    header = f"{'Scenario':<10} | {'Filter Mode':<18} | {'Mean Wealth (₹)':<16} | {'Std Wealth':<12} | {'Survival':<10} | {'Stranded Crops':<14} | {'Avg Time (ms)':<14}"
    print(header)
    print("-" * len(header))

    for (scenario, filter_mode), ep_list in sorted(groups.items()):
        wealths = [r["final_wealth"] for r in ep_list]
        stranded = [r["stranded_crops"] for r in ep_list]
        survived = [r["survived"] for r in ep_list]
        times = [r["avg_filter_time_ms"] for r in ep_list]

        mean_w = statistics.mean(wealths)
        std_w = statistics.stdev(wealths) if len(wealths) > 1 else 0.0
        surv_pct = (sum(1 for s in survived if s) / len(survived)) * 100.0
        mean_stranded = statistics.mean(stranded)
        total_stranded = sum(stranded)
        mean_time = statistics.mean(times)

        print(
            f"{scenario:<10} | {filter_mode:<18} | ₹{mean_w:>13,.2f} | ₹{std_w:>10,.2f} | {surv_pct:>8.1f}% | {mean_stranded:>5.2f} (tot {total_stranded:<2}) | {mean_time:>10.4f} ms"
        )
    print("=" * 80 + "\n")


def main():
    results = run_benchmark(seeds=EVAL_SEEDS)
    print_summary_table(results)


if __name__ == "__main__":
    main()
