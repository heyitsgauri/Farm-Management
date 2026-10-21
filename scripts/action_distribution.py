"""Measures the action-type distribution of a trained PPO model
over N evaluation episodes and prints a summary.

Usage (from project root):
    python scripts/action_distribution.py models/ppo/farm_ppo_500k
    python scripts/action_distribution.py models/ppo/farm_ppo_500k --stochastic
"""
import sys
import os
import argparse
import collections

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../src')))

from farm_ai.environment.farm_environment import (
    FarmEnvironment,
    _int_action_to_farm_action,
)
from farm_ai.agents.ppo_agent import PPOAgent
from farm_ai.environment.actions import ActionType

N_EPISODES = 20
SEEDS = list(range(N_EPISODES))


def classify(action_idx: int) -> str:
    """Maps a flat action index to its human-readable category."""
    farm_action = _int_action_to_farm_action(action_idx)
    return farm_action.type.value


def run_evaluation(agent: PPOAgent, deterministic: bool, n_episodes: int = N_EPISODES):
    env = FarmEnvironment()
    counts: collections.Counter = collections.Counter()
    total_steps = 0
    total_reward = 0.0

    for seed in SEEDS[:n_episodes]:
        obs, _ = env.reset(seed=seed)
        done = False
        while not done:
            action_idx = agent.select_action(obs, deterministic=deterministic)
            category = classify(action_idx)
            counts[category] += 1
            total_steps += 1
            obs, r, done, _, _ = env.step(action_idx)
            total_reward += r

    mode_str = "Deterministic" if deterministic else "Stochastic"
    print(f"\n--- {mode_str} Mode (Episodes: {n_episodes}, Steps: {total_steps}) ---")
    print(f"Mean Episode Reward: {total_reward / n_episodes:,.2f}")
    print("-" * 50)
    for action_type in ActionType:
        n = counts.get(action_type.value, 0)
        pct = 100.0 * n / total_steps if total_steps else 0
        bar = "█" * int(pct / 2)
        print(f"  {action_type.value:<12} {n:>5} steps  ({pct:5.1f}%)  {bar}")
    print("-" * 50)
    hold_pct = 100.0 * counts.get("HOLD", 0) / total_steps if total_steps else 0
    active_pct = 100.0 - hold_pct
    print(f"  Active actions: {active_pct:.1f}%   HOLD: {hold_pct:.1f}%")


def analyse(model_path: str, mode: str = "both", n_episodes: int = N_EPISODES) -> None:
    env = FarmEnvironment()
    agent = PPOAgent.load(model_path, env=env)

    print(f"\n==================================================")
    print(f"Action Distribution Analysis: {os.path.basename(model_path)}")
    print(f"==================================================")

    if mode in ("stochastic", "both"):
        run_evaluation(agent, deterministic=False, n_episodes=n_episodes)
    if mode in ("deterministic", "both"):
        run_evaluation(agent, deterministic=True, n_episodes=n_episodes)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="PPO Action Distribution Analysis")
    parser.add_argument("model", nargs="?", default="models/ppo/farm_ppo_500k", help="Model path")
    parser.add_argument("--stochastic", action="store_true", help="Evaluate stochastically only")
    parser.add_argument("--deterministic", action="store_true", help="Evaluate deterministically only")
    parser.add_argument("--episodes", type=int, default=N_EPISODES, help="Number of episodes")

    args = parser.parse_args()
    mode = "both"
    if args.stochastic and not args.deterministic:
        mode = "stochastic"
    elif args.deterministic and not args.stochastic:
        mode = "deterministic"

    analyse(args.model, mode=mode, n_episodes=args.episodes)
