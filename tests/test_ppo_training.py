"""Tests for PPO training pipeline (uses very few timesteps to stay fast)."""
import os
import sys
import tempfile
import unittest
import numpy as np

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../src')))

from farm_ai.environment.farm_environment import FarmEnvironment, OBS_SIZE, TOTAL_ACTIONS
from farm_ai.agents.ppo_agent import PPOAgent

FAST_TIMESTEPS = 256   # must be >= n_steps (256) for one update


class TestPPOTraining(unittest.TestCase):

    def test_env_spaces(self):
        """Environment must expose correct Gymnasium spaces."""
        env = FarmEnvironment()
        self.assertEqual(env.observation_space.shape, (OBS_SIZE,))
        self.assertEqual(env.action_space.n, TOTAL_ACTIONS)

    def test_observation_dtype_and_shape(self):
        """reset() and step() must return float32 arrays of shape (OBS_SIZE,)."""
        env = FarmEnvironment()
        obs, _ = env.reset(seed=0)
        self.assertEqual(obs.shape, (OBS_SIZE,))
        self.assertEqual(obs.dtype, np.float32)

        obs2, reward, done, truncated, info = env.step(0)  # HOLD
        self.assertEqual(obs2.shape, (OBS_SIZE,))
        self.assertEqual(obs2.dtype, np.float32)
        self.assertIsInstance(reward, float)

    def test_training_completes(self):
        """A short training run must complete without error."""
        env = FarmEnvironment()
        agent = PPOAgent(env=env, seed=42, tensorboard_log=None)
        # Use a very small number of timesteps; n_steps=256 so one rollout = one update
        agent.model.n_steps = 256
        agent.train(total_timesteps=FAST_TIMESTEPS)  # Should not raise

    def test_save_and_load_after_training(self):
        """Model trained with small timesteps should save and load correctly."""
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, "trained_model")
            env = FarmEnvironment()
            agent = PPOAgent(env=env, seed=42, tensorboard_log=None)
            agent.train(total_timesteps=FAST_TIMESTEPS)
            agent.save(path)
            self.assertTrue(os.path.exists(path + ".zip"))

            env2 = FarmEnvironment()
            loaded = PPOAgent.load(path, env=env2)
            obs, _ = env2.reset(seed=7)
            action = loaded.select_action(obs, deterministic=True)
            self.assertIsInstance(action, int)

    def test_full_episode_no_crash(self):
        """PPO should be able to play a complete 30-day episode without crashing."""
        env = FarmEnvironment()
        agent = PPOAgent(env=env, seed=42, tensorboard_log=None)
        # No training — random untrained policy is fine for this test
        obs, _ = env.reset(seed=42)
        done = False
        step_count = 0
        while not done:
            action = agent.select_action(obs)
            obs, reward, done, truncated, info = env.step(action)
            step_count += 1
            self.assertLessEqual(step_count, 35, "Episode exceeded expected length")

        self.assertTrue(done)
        self.assertIn("survived", info)


if __name__ == "__main__":
    unittest.main()
