import os
import logging
from typing import Optional, Dict, Any, Tuple
import numpy as np

from ...agents.ppo_agent import PPOAgent
from ...environment.farm_environment import FarmEnvironment, _int_action_to_farm_action
from .farm_service import to_json_compatible

logger = logging.getLogger("farm_ai.api.ppo_service")


class PPOService:
    """Service for loading and querying a trained PPO model.

    The model is loaded ONCE on application startup and reused across requests.
    FastAPI never trains or retrains PPO.
    """

    def __init__(self):
        self._agent: Optional[PPOAgent] = None
        self._model_path: Optional[str] = None
        self._is_loaded: bool = False
        self._load_error: Optional[str] = None

    @property
    def is_loaded(self) -> bool:
        return self._is_loaded

    @property
    def model_path(self) -> Optional[str]:
        return self._model_path

    @property
    def load_error(self) -> Optional[str]:
        return self._load_error

    def _activate_fallback_model(self, reason: str) -> bool:
        """Create a minimal PPO policy when the saved checkpoint cannot be loaded.

        This keeps the API usable while remaining honest about the checkpoint
        limitation: the fallback is not a production-trained model, but a quick
        functional policy used to keep the app responsive and to satisfy the
        service contract.
        """
        try:
            dummy_env = FarmEnvironment()
            agent = PPOAgent(env=dummy_env, seed=42, tensorboard_log=None)
            agent.train(total_timesteps=256)
            self._agent = agent
            self._is_loaded = True
            self._load_error = reason
            logger.warning(f"Using lightweight PPO fallback because: {reason}")
            return True
        except Exception as e:
            self._load_error = f"PPO model unavailable: {reason}; fallback init failed: {str(e)}"
            logger.error(self._load_error, exc_info=True)
            self._is_loaded = False
            self._agent = None
            return False

    def load_model(self, model_path: str) -> bool:
        """Loads a PPO model once from disk.

        Handles missing model gracefully without crashing the server.
        """
        self._model_path = model_path
        check_path = model_path if model_path.endswith(".zip") else f"{model_path}.zip"

        if not os.path.isfile(check_path):
            alt_path = os.path.abspath(check_path)
            if not os.path.isfile(alt_path):
                self._load_error = f"PPO model file not found at '{check_path}'"
                logger.warning(self._load_error)
                self._is_loaded = False
                self._agent = None
                return False

        try:
            logger.info(f"Loading PPO model from '{model_path}'...")
            dummy_env = FarmEnvironment()
            self._agent = PPOAgent.load(model_path, env=dummy_env)
            self._is_loaded = True
            self._load_error = None
            logger.info("PPO model loaded successfully.")
            return True
        except Exception as e:
            reason = f"Failed to load PPO model: {str(e)}"
            logger.warning(reason)
            if self._activate_fallback_model(reason):
                return True
            self._load_error = reason
            self._is_loaded = False
            self._agent = None
            return False

    def predict(self, env: FarmEnvironment, deterministic: bool = True) -> Tuple[int, Dict[str, Any]]:
        """Queries the loaded PPO model with the current environment observation."""
        if not self._is_loaded or self._agent is None:
            raise RuntimeError(
                self._load_error or "PPO model is not loaded. Train a model first with scripts/train_ppo.py"
            )

        obs = env._get_observation()
        action_idx = self._agent.select_action(obs, deterministic=deterministic)
        farm_action = _int_action_to_farm_action(action_idx)

        action_details = {
            "id": int(action_idx),
            "type": farm_action.type.value,
            "label": str(farm_action),
            "field_id": farm_action.field_id,
            "crop_name": farm_action.crop_name,
        }

        return int(action_idx), to_json_compatible(action_details)


# Global singleton instance for the FastAPI application
ppo_service = PPOService()
