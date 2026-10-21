import os
import sys
import unittest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../src")))

from farm_ai.api.main import app
from farm_ai.api.services.ppo_service import ppo_service


class TestAPIPPO(unittest.TestCase):
    def setUp(self):
        self._client_cm = TestClient(app)
        self.client = self._client_cm.__enter__()
        # Create a farm session to test with
        res = self.client.post("/api/farm/reset", json={"seed": 42})
        self.session_id = res.json()["session_id"]

    def tearDown(self):
        self._client_cm.__exit__(None, None, None)

    def test_ppo_predict_action(self):
        # Predict an action with PPO
        response = self.client.post(
            "/api/ppo/predict",
            json={"session_id": self.session_id, "deterministic": True},
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["session_id"], self.session_id)
        self.assertIn("action", data)
        self.assertIn(data["action"], list(range(24)))
        self.assertIn("action_details", data)
        self.assertTrue(data["deterministic"])

    def test_ppo_step_action(self):
        # Execute an action chosen by PPO
        response = self.client.post(
            f"/api/ppo/{self.session_id}/step",
            json={"deterministic": True},
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["session_id"], self.session_id)
        self.assertIn("action", data)
        self.assertIn(data["action"], list(range(24)))
        self.assertIn("state", data)
        self.assertEqual(data["state"]["day"], 2)  # Day advanced
        self.assertIn("reward", data)
        self.assertIn("action_details", data)

    def test_ppo_invalid_session_returns_404(self):
        fake_id = "non-existent-session"
        predict_res = self.client.post(
            "/api/ppo/predict",
            json={"session_id": fake_id, "deterministic": True},
        )
        self.assertEqual(predict_res.status_code, 404)

        step_res = self.client.post(
            f"/api/ppo/{fake_id}/step",
            json={"deterministic": True},
        )
        self.assertEqual(step_res.status_code, 404)

    def test_ppo_service_unloaded_graceful_error(self):
        """Verify that when PPO is not loaded, endpoints return 503 rather than crashing."""
        original_state = ppo_service._is_loaded
        original_agent = ppo_service._agent
        try:
            ppo_service._is_loaded = False
            ppo_service._agent = None
            ppo_service._load_error = "Model not found for testing"

            res_predict = self.client.post(
                "/api/ppo/predict",
                json={"session_id": self.session_id},
            )
            self.assertEqual(res_predict.status_code, 503)
            self.assertIn("Model not found", res_predict.json()["detail"])

            res_step = self.client.post(f"/api/ppo/{self.session_id}/step")
            self.assertEqual(res_step.status_code, 503)
        finally:
            ppo_service._is_loaded = original_state
            ppo_service._agent = original_agent
