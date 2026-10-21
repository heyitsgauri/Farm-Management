import unittest
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../src')))

from farm_ai.environment.farm_environment import FarmEnvironment
from farm_ai.agents.random_agent import RandomAgent
from farm_ai.environment.actions import Action

class TestRandomAgent(unittest.TestCase):
    def test_random_agent_instantiation(self):
        agent = RandomAgent(seed=42)
        self.assertIsNotNone(agent)
        
    def test_random_agent_returns_valid_action(self):
        env = FarmEnvironment()
        agent = RandomAgent(seed=42)

        env.reset()
        state = env.get_dict_state()
        action = agent.select_action(state)
        
        self.assertIsInstance(action, Action)
        
    def test_random_agent_reproducibility(self):
        env1 = FarmEnvironment()
        agent1 = RandomAgent(seed=123)
        env1.reset(seed=123)
        action1 = agent1.select_action(env1.get_dict_state())

        env2 = FarmEnvironment()
        agent2 = RandomAgent(seed=123)
        env2.reset(seed=123)
        action2 = agent2.select_action(env2.get_dict_state())

        self.assertEqual(action1.type, action2.type)
        self.assertEqual(action1.field_id, action2.field_id)
        self.assertEqual(action1.crop_name, action2.crop_name)
        self.assertEqual(action1.quantity, action2.quantity)
