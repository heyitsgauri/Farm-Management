import os
import sys
from typing import Optional, Tuple
import numpy as np
from stable_baselines3 import PPO
from stable_baselines3.common.env_checker import check_env

from ..environment.farm_environment import FarmEnvironment


def _install_legacy_numpy_compat() -> None:
    """Make older PPO checkpoints compatible with newer NumPy installations.

    Some saved SB3 models were serialized against older NumPy internals, which
    reference modules such as ``numpy._core.numeric`` and legacy bit-generator
    pickling helpers. Modern NumPy exposes the equivalent modules under a
    different path, so we register the compatibility aliases before loading the
    checkpoint.
    """
    try:
        sys.modules.setdefault("numpy._core", np.core)
        if hasattr(np.core, "numeric"):
            sys.modules.setdefault("numpy._core.numeric", np.core.numeric)
    except Exception:
        pass

    try:
        import numpy.random._pickle as np_pickle
    except Exception:
        return

    if getattr(np_pickle, "_farm_ai_compat_installed", False):
        return

    original_ctor = np_pickle.__bit_generator_ctor

    def compat_bit_generator_ctor(bit_generator_name="MT19937"):
        if isinstance(bit_generator_name, type):
            bit_generator_name = bit_generator_name.__name__

        if isinstance(bit_generator_name, str):
            bit_generator_name = bit_generator_name.rsplit(".", 1)[-1]
            generators = getattr(np_pickle, "BitGenerators", {})
            if bit_generator_name in generators:
                return generators[bit_generator_name]()

        return original_ctor(bit_generator_name)

    np_pickle.__bit_generator_ctor = compat_bit_generator_ctor
    np_pickle._farm_ai_compat_installed = True


class PPOAgent:
    """A wrapper around Stable-Baselines3 PPO for the FarmEnvironment.

    Follows the same conceptual interface as RandomAgent and RuleBasedAgent:
        action = agent.select_action(obs)

    PPO works on numpy observations (not the dict state used by baseline agents).

    Usage
    -----
        env = FarmEnvironment()
        agent = PPOAgent(env=env, seed=42)
        agent.train(total_timesteps=50_000)
        agent.save("models/ppo/farm_ppo")

        obs, _ = env.reset()
        action = agent.select_action(obs)
    """

    def __init__(
        self,
        env: FarmEnvironment,
        seed: int = 42,
        tensorboard_log: Optional[str] = "runs/ppo",
    ):
        """Creates a new PPOAgent.

        Args:
            env:             A FarmEnvironment instance (must have proper spaces).
            seed:            Random seed for reproducibility.
            tensorboard_log: Directory for TensorBoard logs (None to disable).
        """
        self.env = env
        self.seed = seed

        self.model = PPO(
            policy="MlpPolicy",
            env=self.env,
            seed=self.seed,
            # Lightweight network suitable for a laptop
            policy_kwargs={"net_arch": [64, 64]},
            # Tuned for fast, stable learning on a 30-step episode
            n_steps=256,
            batch_size=64,
            n_epochs=10,
            gamma=0.99,
            learning_rate=3e-4,
            clip_range=0.2,
            ent_coef=0.01,      # Encourages exploration
            verbose=1,
            tensorboard_log=tensorboard_log,
        )

    # ──────────────────────────────────────────────────────────────────
    # Core API
    # ──────────────────────────────────────────────────────────────────

    def train(self, total_timesteps: int = 50_000) -> None:
        """Trains the PPO model.

        Args:
            total_timesteps: Total environment steps to train for.
        """
        self.model.learn(total_timesteps=total_timesteps, reset_num_timesteps=True)

    def select_action(self, obs: np.ndarray, deterministic: bool = False) -> int:
        """Predicts an action given a numpy observation.

        Args:
            obs:          Numpy observation from env.reset() / env.step().
            deterministic: If True, returns the greedy (most likely) action.
                           Use True for evaluation, False (default) for exploration.

        Returns:
            Integer action index compatible with FarmEnvironment.action_space.
        """
        action, _ = self.model.predict(obs, deterministic=deterministic)
        return int(action)

    def save(self, path: str) -> None:
        """Saves the trained model to disk.

        Args:
            path: File path without extension, e.g. 'models/ppo/farm_ppo'.
                  SB3 will append '.zip' automatically.
        """
        os.makedirs(os.path.dirname(path), exist_ok=True)
        self.model.save(path)
        print(f"[PPOAgent] Model saved to {path}.zip")

    @classmethod
    def load(cls, path: str, env: FarmEnvironment) -> "PPOAgent":
        """Loads a saved PPO model from disk.

        Args:
            path: Path to the saved model (.zip extension optional).
            env:  A fresh FarmEnvironment instance to attach the model to.

        Returns:
            A PPOAgent instance with the loaded model.
        """
        _install_legacy_numpy_compat()
        agent = cls.__new__(cls)
        agent.env = env
        agent.seed = 42  # seed used only during training
        agent.model = PPO.load(path, env=env)
        print(f"[PPOAgent] Model loaded from {path}")
        return agent

    def evaluate(self, n_episodes: int = 10, seeds: Optional[list] = None) -> list:
        """Evaluates the trained policy over multiple episodes.

        Uses deterministic=True so results are reproducible.

        Args:
            n_episodes: Number of evaluation episodes.
            seeds:      Optional list of seeds (one per episode).
                        Falls back to 0,1,2,... if not provided.

        Returns:
            List of result dicts with keys: final_cash, inventory_value,
            total_wealth, profit, survived.
        """
        if seeds is None:
            seeds = list(range(n_episodes))

        results = []
        for i, seed in enumerate(seeds[:n_episodes]):
            obs, _ = self.env.reset(seed=seed)
            done = False
            last_info: dict = {}

            while not done:
                action = self.select_action(obs, deterministic=True)
                obs, _reward, done, _truncated, last_info = self.env.step(action)

            results.append(last_info)

        return results
