import os
import sys
import unittest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../src")))

from farm_ai.api.main import app
from farm_ai.api.services.farm_service import farm_service


class TestAPIFarm(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_create_session_via_reset(self):
        response = self.client.post("/api/farm/reset", json={"seed": 42})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("session_id", data)
        self.assertIn("state", data)
        state = data["state"]
        self.assertEqual(state["day"], 1)
        self.assertEqual(state["cash"], 10000.0)
        self.assertEqual(len(state["fields"]), 5)

    def test_get_farm_state(self):
        # Create session first
        res = self.client.post("/api/farm/reset", json={"seed": 10})
        session_id = res.json()["session_id"]

        response = self.client.get(f"/api/farm/{session_id}/state")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["session_id"], session_id)
        self.assertEqual(data["state"]["day"], 1)
        self.assertIn("inventory", data["state"])
        self.assertIn("market_prices", data["state"])

    def test_get_available_actions(self):
        res = self.client.post("/api/farm/reset")
        session_id = res.json()["session_id"]

        response = self.client.get(f"/api/farm/{session_id}/actions")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["session_id"], session_id)
        actions = data["actions"]
        self.assertEqual(len(actions), 24)
        # Action 0 (HOLD) should always be valid
        self.assertEqual(actions[0]["type"], "HOLD")
        self.assertTrue(actions[0]["valid"])

    def test_execute_valid_action(self):
        res = self.client.post("/api/farm/reset", json={"seed": 42})
        session_id = res.json()["session_id"]

        # Action 0 is HOLD
        step_res = self.client.post(f"/api/farm/{session_id}/action", json={"action": 0})
        self.assertEqual(step_res.status_code, 200)
        data = step_res.json()
        self.assertEqual(data["session_id"], session_id)
        self.assertEqual(data["state"]["day"], 2)  # Day advanced
        self.assertIn("reward", data)
        self.assertFalse(data["terminated"])

    def test_get_metrics(self):
        res = self.client.post("/api/farm/reset", json={"seed": 42})
        session_id = res.json()["session_id"]

        response = self.client.get(f"/api/farm/{session_id}/metrics")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["session_id"], session_id)
        self.assertEqual(data["current_day"], 1)
        self.assertEqual(data["cash"], 10000.0)
        self.assertEqual(data["total_wealth"], 10000.0)
        self.assertEqual(data["profit"], 0.0)
        self.assertTrue(data["survived"])
        self.assertFalse(data["season_over"])

    def test_reset_existing_session(self):
        res = self.client.post("/api/farm/reset", json={"seed": 42})
        session_id = res.json()["session_id"]

        # Advance one day
        self.client.post(f"/api/farm/{session_id}/action", json={"action": 0})
        state_res = self.client.get(f"/api/farm/{session_id}/state")
        self.assertEqual(state_res.json()["state"]["day"], 2)

        # Reset same session
        reset_res = self.client.post("/api/farm/reset", json={"session_id": session_id, "seed": 42})
        self.assertEqual(reset_res.status_code, 200)
        self.assertEqual(reset_res.json()["session_id"], session_id)
        self.assertEqual(reset_res.json()["state"]["day"], 1)

    def test_unknown_session_returns_404(self):
        fake_id = "non-existent-session-12345"
        self.assertEqual(self.client.get(f"/api/farm/{fake_id}/state").status_code, 404)
        self.assertEqual(self.client.get(f"/api/farm/{fake_id}/actions").status_code, 404)
        self.assertEqual(self.client.post(f"/api/farm/{fake_id}/action", json={"action": 0}).status_code, 404)
        self.assertEqual(self.client.get(f"/api/farm/{fake_id}/metrics").status_code, 404)
        self.assertEqual(self.client.delete(f"/api/farm/{fake_id}").status_code, 404)

    def test_action_validation_error(self):
        res = self.client.post("/api/farm/reset")
        session_id = res.json()["session_id"]

        # Action index >= 24 or < 0 should fail validation (HTTP 422)
        bad_action_res = self.client.post(f"/api/farm/{session_id}/action", json={"action": 99})
        self.assertEqual(bad_action_res.status_code, 422)

    def test_delete_session(self):
        res = self.client.post("/api/farm/reset")
        session_id = res.json()["session_id"]

        del_res = self.client.delete(f"/api/farm/{session_id}")
        self.assertEqual(del_res.status_code, 200)

        # Subsequent call should return 404
        self.assertEqual(self.client.get(f"/api/farm/{session_id}/state").status_code, 404)

    def test_multiple_sessions_independence(self):
        """CRITICAL: Verify Session A and Session B remain completely independent."""
        res_a = self.client.post("/api/farm/reset", json={"seed": 1})
        session_a = res_a.json()["session_id"]

        res_b = self.client.post("/api/farm/reset", json={"seed": 2})
        session_b = res_b.json()["session_id"]

        self.assertNotEqual(session_a, session_b)

        # Advance Session A by 3 steps (HOLD)
        for _ in range(3):
            self.client.post(f"/api/farm/{session_a}/action", json={"action": 0})

        # Session A should now be at day 4
        state_a = self.client.get(f"/api/farm/{session_a}/state").json()["state"]
        self.assertEqual(state_a["day"], 4)

        # Session B must still be at day 1!
        state_b = self.client.get(f"/api/farm/{session_b}/state").json()["state"]
        self.assertEqual(state_b["day"], 1)

        # Now advance Session B by 1 step
        self.client.post(f"/api/farm/{session_b}/action", json={"action": 0})
        state_b_updated = self.client.get(f"/api/farm/{session_b}/state").json()["state"]
        self.assertEqual(state_b_updated["day"], 2)

        # Session A must still be at day 4!
        state_a_check = self.client.get(f"/api/farm/{session_a}/state").json()["state"]
        self.assertEqual(state_a_check["day"], 4)
