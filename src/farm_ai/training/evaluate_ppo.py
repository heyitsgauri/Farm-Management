"""PPO evaluation module.

Loads a saved model and runs deterministic evaluation episodes.
Results are printed in a format compatible with the baseline evaluation in run_baselines.py.

Usage (from project root):
    python -c "from farm_ai.training.evaluate_ppo import evaluate; evaluate()"
or via the train_ppo script with --evaluate flag.
"""
import os
import sys
import statistics
from typing import Optional, List

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../')))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../src')))

from farm_ai.environment.farm_environment import FarmEnvironment
from farm_ai.agents.ppo_agent import PPOAgent

DEFAULT_MODEL_PATH = os.path.join(
    os.path.dirname(__file__), "../../../models/ppo/farm_ppo"
)
EVAL_SEEDS = [42, 100, 999, 1234, 5555, 777, 888, 9999, 11111, 22222]


def evaluate(
    model_path: Optional[str] = None,
    n_episodes: int = 10,
    seeds: Optional[List[int]] = None,
    agent_name: str = "PPO Agent",
    deterministic: bool = False,
) -> list:
    """Loads a saved PPO model and evaluates it over n_episodes.

    Args:
        model_path:    Path to the saved model (.zip).  Defaults to the standard path.
        n_episodes:    Number of evaluation episodes.
        seeds:         Explicit list of seeds (one per episode).
        agent_name:    Display name in output.
        deterministic: Whether to use deterministic or stochastic action selection.

    Returns:
        List of result dicts (final_cash, inventory_value, total_wealth, profit, survived).
    """
    if model_path is None:
        model_path = DEFAULT_MODEL_PATH
    if seeds is None:
        seeds = EVAL_SEEDS

    mode_str = "Deterministic" if deterministic else "Stochastic"
    print(f"\n{'='*50}")
    print(f"Evaluating {agent_name} ({mode_str})")
    print(f"{'='*50}")
    print(f"Model: {os.path.abspath(model_path)}.zip")

    env = FarmEnvironment()
    agent = PPOAgent.load(model_path, env=env)

    results = []
    for i, seed in enumerate(seeds[:n_episodes]):
        obs, _ = env.reset(seed=seed)
        done = False
        last_info: dict = {}

        while not done:
            action = agent.select_action(obs, deterministic=deterministic)
            obs, _reward, done, _truncated, last_info = env.step(action)

        episode_num = i + 1
        print(f"\n{agent_name}")
        print(f"Episode {episode_num}")
        print(f"Final Cash:       ₹{last_info.get('final_cash', 0):,.2f}")
        print(f"Inventory Value:  ₹{last_info.get('inventory_value', 0):,.2f}")
        print(f"Final Wealth:     ₹{last_info.get('total_wealth', 0):,.2f}")
        print(f"Profit:           ₹{last_info.get('profit', 0):,.2f}")
        print(f"Survived:         {'Yes' if last_info.get('survived') else 'No'}")
        print(f"Days Completed:   30")

        results.append(last_info)

    # Summary
    print(f"\n{'='*50}")
    print(f"{agent_name} SUMMARY ({n_episodes} Episodes)")
    print(f"{'='*50}")
    mean_wealth = statistics.mean([r.get('total_wealth', 0) for r in results])
    mean_profit = statistics.mean([r.get('profit', 0) for r in results])
    survival_rate = sum(1 for r in results if r.get('survived')) / n_episodes * 100
    print(f"Mean Final Wealth: ₹{mean_wealth:,.2f}")
    print(f"Mean Profit:       ₹{mean_profit:,.2f}")
    print(f"Survival Rate:     {survival_rate:.1f}%")

    return results


if __name__ == "__main__":
    evaluate()
