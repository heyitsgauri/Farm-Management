"""Unit tests for PPOAgent.

Tests run with a tiny environment to stay fast (< 5 seconds total).
"""
import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../src')))

from farm_ai.environment.farm_environment import FarmEnvironment
from farm_ai.agents.ppo_agent import PPOAgent


class TestPPOAgent(unittest.TestCase):

    def setUp(self):
        self.env = FarmEnvironment()
        self.agent = PPOAgent(env=self.env, seed=42, tensorboard_log=None)

    def test_instantiation(self):
        """PPOAgent should be constructable."""
        self.assertIsNotNone(self.agent)
        self.assertIsNotNone(self.agent.model)

    def test_predict_returns_int(self):
        """select_action() must return an int in [0, TOTAL_ACTIONS)."""
        obs, _ = self.env.reset(seed=42)
        action = self.agent.select_action(obs)
        self.assertIsInstance(action, int)
        self.assertGreaterEqual(action, 0)
        self.assertLess(action, self.env.action_space.n)

    def test_action_accepted_by_environment(self):
        """The predicted action must not crash the environment."""
        obs, _ = self.env.reset(seed=42)
        action = self.agent.select_action(obs)
        obs2, reward, done, truncated, info = self.env.step(action)
        self.assertIsNotNone(obs2)
        self.assertIsInstance(reward, float)

    def test_save_and_load(self):
        """Model should be saveable and loadable."""
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, "test_model")
            self.agent.save(path)
            self.assertTrue(os.path.exists(path + ".zip"))

            env2 = FarmEnvironment()
            loaded_agent = PPOAgent.load(path, env=env2)
            self.assertIsNotNone(loaded_agent.model)

    def test_loaded_model_predicts(self):
        """A loaded model should predict actions correctly."""
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, "test_model")
            self.agent.save(path)

            env2 = FarmEnvironment()
            loaded = PPOAgent.load(path, env=env2)
            obs, _ = env2.reset(seed=99)
            action = loaded.select_action(obs, deterministic=True)
            self.assertIsInstance(action, int)
            self.assertGreaterEqual(action, 0)
            self.assertLess(action, env2.action_space.n)


if __name__ == "__main__":
    unittest.main()
