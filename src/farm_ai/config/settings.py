from typing import Dict, Any

# Initial simulation settings
STARTING_CASH: float = 10000.0
NUM_FIELDS: int = 5
SEASON_LENGTH: int = 30

# Configuration for crops
CROP_CONFIG: Dict[str, Dict[str, Any]] = {
    "Wheat": {
        "planting_cost": 1000.0,
        "growth_days": 5,
        "yield_amount": 100,
        "base_price": 40.0
    },
    "Rice": {
        "planting_cost": 1500.0,
        "growth_days": 8,
        "yield_amount": 150,
        "base_price": 35.0
    },
    "Corn": {
        "planting_cost": 1200.0,
        "growth_days": 6,
        "yield_amount": 120,
        "base_price": 30.0
    }
}

# Configuration for risk events
EVENT_PROBABILITIES: Dict[str, float] = {
    "drought": 0.05,
    "pest_outbreak": 0.08,
    "price_shock": 0.1
}

# API Server Configuration
import os
API_HOST: str = os.getenv("API_HOST", "0.0.0.0")
API_PORT: int = int(os.getenv("API_PORT", "8000"))
CORS_ORIGINS: list = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:3000,http://localhost:5173,http://localhost:5174,http://localhost:5175,http://127.0.0.1:3000,http://127.0.0.1:5173,http://127.0.0.1:5174,http://127.0.0.1:5175"
    ).split(",")
    if origin.strip()
]
DEFAULT_PPO_MODEL_PATH: str = os.getenv(
    "PPO_MODEL_PATH",
    os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../models/ppo/farm_ppo_500k"))
)
DEFAULT_SEED: int = int(os.getenv("DEFAULT_SEED", "42"))
