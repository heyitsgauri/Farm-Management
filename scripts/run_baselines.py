import sys
import os
import statistics

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../src')))

from farm_ai.environment.farm_environment import FarmEnvironment
from farm_ai.agents.random_agent import RandomAgent
from farm_ai.agents.rule_based_agent import RuleBasedAgent

NUM_EPISODES = 10


def run_agent(agent_class, agent_name: str, seeds: list) -> list:
    """Runs the given agent for one episode per seed.

    Baseline agents (Random, Rule-Based) work on the human-readable dict state
    returned by env.get_dict_state(), NOT on the numpy observation used by PPO.

    Returns a list of result dicts (one per episode).
    """
    print(f"\n{'='*50}")
    print(f"Running {agent_name}")
    print(f"{'='*50}")

    results = []

    for i, seed in enumerate(seeds):
        env = FarmEnvironment()
        agent = agent_class(seed=seed) if agent_class == RandomAgent else agent_class()

        _obs, _info = env.reset(seed=seed)
        done = False
        last_info = {}

        while not done:
            # Baseline agents use the human-readable dict state
            dict_state = env.get_dict_state()
            action = agent.select_action(dict_state)
            _obs, _reward, done, _truncated, last_info = env.step(action)

        episode_num = i + 1
        print(f"\n{agent_name}")
        print(f"Episode {episode_num}")
        print(f"Final Cash:       ₹{last_info['final_cash']:,.2f}")
        print(f"Inventory Value:  ₹{last_info['inventory_value']:,.2f}")
        print(f"Final Wealth:     ₹{last_info['total_wealth']:,.2f}")
        print(f"Profit:           ₹{last_info['profit']:,.2f}")
        print(f"Survived:         {'Yes' if last_info['survived'] else 'No'}")
        print(f"Days Completed:   30")

        results.append({
            "wealth": last_info['total_wealth'],
            "profit": last_info['profit'],
            "survived": last_info['survived'],
        })

    # ── Summary ───────────────────────────────────────────────────────
    print(f"\n{'='*50}")
    print(f"{agent_name} SUMMARY ({NUM_EPISODES} Episodes)")
    print(f"{'='*50}")
    mean_wealth = statistics.mean([r["wealth"] for r in results])
    mean_profit = statistics.mean([r["profit"] for r in results])
    survival_rate = sum(1 for r in results if r["survived"]) / NUM_EPISODES * 100
    print(f"Mean Final Wealth: ₹{mean_wealth:,.2f}")
    print(f"Mean Profit:       ₹{mean_profit:,.2f}")
    print(f"Survival Rate:     {survival_rate:.1f}%")

    return results


def main():
    seeds = [42, 100, 999, 1234, 5555, 777, 888, 9999, 11111, 22222]
    run_agent(RandomAgent, "Random Agent", seeds)
    run_agent(RuleBasedAgent, "Rule-Based Agent", seeds)


if __name__ == "__main__":
    main()
