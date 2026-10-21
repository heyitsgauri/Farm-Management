import unittest
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../src')))

from farm_ai.environment.farm_environment import FarmEnvironment
from farm_ai.agents.rule_based_agent import RuleBasedAgent
from farm_ai.environment.actions import Action, ActionType


class TestRuleBasedAgent(unittest.TestCase):

    def test_rule_based_agent_instantiation(self):
        agent = RuleBasedAgent()
        self.assertIsNotNone(agent)

    def test_rule_based_agent_returns_valid_action(self):
        env = FarmEnvironment()
        agent = RuleBasedAgent()

        env.reset()
        state = env.get_dict_state()
        action = agent.select_action(state)

        self.assertIsInstance(action, Action)

    def test_completes_full_episode(self):
        env = FarmEnvironment()
        agent = RuleBasedAgent()

        env.reset()
        done = False
        last_info = {}

        while not done:
            state = env.get_dict_state()
            action = agent.select_action(state)
            _obs, _reward, done, _truncated, last_info = env.step(action)

        self.assertTrue(done)
        self.assertIn("survived", last_info)

    def test_prioritizes_harvest(self):
        """Agent should harvest a MATURE field before doing anything else."""
        env = FarmEnvironment()
        agent = RuleBasedAgent()

        env.reset()

        # Build a fake dict state with a mature field to test priority directly
        state = env.get_dict_state()
        state["fields"][0]["state"] = "MATURE"
        state["fields"][0]["crop"] = "Wheat"

        action = agent.select_action(state)

        self.assertEqual(action.type, ActionType.HARVEST)
        self.assertEqual(action.field_id, state["fields"][0]["id"])
