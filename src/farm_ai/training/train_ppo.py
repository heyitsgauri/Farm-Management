"""Training pipeline for the PPO agent.

Usage (from project root):
    python scripts/train_ppo.py
"""
import os
import sys

# Allow running from project root or scripts/
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../src')))

from farm_ai.environment.farm_environment import FarmEnvironment
from farm_ai.agents.ppo_agent import PPOAgent

SEED = 42
TOTAL_TIMESTEPS = 50_000
MODEL_SAVE_PATH = os.path.join(os.path.dirname(__file__), "../../models/ppo/farm_ppo")
TENSORBOARD_LOG = os.path.join(os.path.dirname(__file__), "../../runs/ppo")


def train() -> None:
    """Creates the environment, trains PPO, and saves the model."""
    print("=" * 50)
    print("PPO TRAINING — Autonomous Farm AI")
    print("=" * 50)
    print(f"Seed:             {SEED}")
    print(f"Total timesteps:  {TOTAL_TIMESTEPS:,}")
    print(f"Save path:        {MODEL_SAVE_PATH}.zip")
    print(f"TensorBoard log:  {TENSORBOARD_LOG}")
    print("=" * 50)

    env = FarmEnvironment()
    env.reset(seed=SEED)

    agent = PPOAgent(env=env, seed=SEED, tensorboard_log=TENSORBOARD_LOG)
    agent.train(total_timesteps=TOTAL_TIMESTEPS)
    agent.save(MODEL_SAVE_PATH)

    print("\n✅ Training complete.")
    print(f"   Model saved at: {os.path.abspath(MODEL_SAVE_PATH)}.zip")
    print("   To evaluate:  python scripts/train_ppo.py --evaluate")
    print("   TensorBoard:  tensorboard --logdir runs/ppo")


if __name__ == "__main__":
    train()
