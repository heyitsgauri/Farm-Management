import uuid
import threading
from typing import Dict, List, Optional, Tuple, Any, Union
import numpy as np

from ...environment.farm_environment import FarmEnvironment, _int_action_to_farm_action
from ...environment.actions import Action


def to_json_compatible(obj: Any) -> Any:
    """Recursively converts NumPy data types to native Python types for JSON serialization."""
    if isinstance(obj, np.integer):
        return int(obj)
    if isinstance(obj, np.floating):
        return float(obj)
    if isinstance(obj, np.ndarray):
        return obj.tolist()
    if isinstance(obj, dict):
        return {k: to_json_compatible(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [to_json_compatible(v) for v in obj]
    return obj


class FarmSessionManager:
    """Manages in-memory farm simulation environments per client session.

    FastAPI is stateless; this manager maintains independent FarmEnvironment instances
    keyed by UUID session IDs.
    NOTE: In-memory session management is suitable for development and local testing.
    Production deployments across multiple workers would require external state persistence.
    """

    def __init__(self):
        self._sessions: Dict[str, FarmEnvironment] = {}
        self._lock = threading.Lock()

    def create_session(self, seed: Optional[int] = None) -> Tuple[str, Dict[str, Any], Dict[str, Any]]:
        """Creates a brand new FarmEnvironment session with a unique UUID."""
        session_id = str(uuid.uuid4())
        env = FarmEnvironment()
        _, info = env.reset(seed=seed)

        with self._lock:
            self._sessions[session_id] = env

        state = to_json_compatible(env.get_dict_state())
        info = to_json_compatible(info)
        return session_id, state, info

    def reset_session(
        self,
        session_id: Optional[str] = None,
        seed: Optional[int] = None
    ) -> Tuple[str, Dict[str, Any], Dict[str, Any]]:
        """Resets an existing session, or creates a new one if session_id is None."""
        if not session_id:
            return self.create_session(seed=seed)

        with self._lock:
            env = self._sessions.get(session_id)
            if env is None:
                # If session does not exist, create it with this id
                env = FarmEnvironment()
                self._sessions[session_id] = env

        _, info = env.reset(seed=seed)
        state = to_json_compatible(env.get_dict_state())
        info = to_json_compatible(info)
        return session_id, state, info

    def get_env(self, session_id: str) -> FarmEnvironment:
        """Retrieves the FarmEnvironment instance for a given session ID."""
        with self._lock:
            env = self._sessions.get(session_id)
        if env is None:
            raise KeyError(f"Session '{session_id}' not found")
        return env

    def get_state(self, session_id: str) -> Dict[str, Any]:
        """Retrieves the current human-readable farm state dictionary."""
        env = self.get_env(session_id)
        return to_json_compatible(env.get_dict_state())

    def get_actions(self, session_id: str) -> List[Dict[str, Any]]:
        """Retrieves all discrete actions with validity flags for the session's current state."""
        env = self.get_env(session_id)
        return to_json_compatible(env.get_actions())

    def execute_action(
        self,
        session_id: str,
        action: Union[int, Action]
    ) -> Tuple[Dict[str, Any], float, bool, bool, Dict[str, Any]]:
        """Executes an action in the environment and returns the updated state and results."""
        env = self.get_env(session_id)
        _, reward, terminated, truncated, info = env.step(action)
        state = to_json_compatible(env.get_dict_state())
        return state, float(reward), bool(terminated), bool(truncated), to_json_compatible(info)

    def get_metrics(self, session_id: str) -> Dict[str, Any]:
        """Retrieves metrics from the environment."""
        env = self.get_env(session_id)
        metrics = env.get_metrics()
        metrics["session_id"] = session_id
        return to_json_compatible(metrics)

    def delete_session(self, session_id: str) -> bool:
        """Removes a session from memory."""
        with self._lock:
            if session_id in self._sessions:
                del self._sessions[session_id]
                return True
        return False

    def session_count(self) -> int:
        """Returns the number of active sessions."""
        with self._lock:
            return len(self._sessions)


# Global singleton instance for the FastAPI application
farm_service = FarmSessionManager()
