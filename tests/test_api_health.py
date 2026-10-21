import os
import sys
import unittest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../src")))

from farm_ai.api.main import app


class TestAPIHealth(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_health_check_returns_200(self):
        response = self.client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "ok")
        self.assertEqual(data["service"], "autonomous-farm-ai")
        self.assertEqual(data["version"], "0.1.0")
        self.assertIn("ppo_model_loaded", data)

    def test_openapi_docs_accessible(self):
        response = self.client.get("/docs")
        self.assertEqual(response.status_code, 200)
        response_redoc = self.client.get("/redoc")
        self.assertEqual(response_redoc.status_code, 200)
