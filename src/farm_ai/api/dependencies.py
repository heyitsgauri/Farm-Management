from .services.farm_service import farm_service, FarmSessionManager
from .services.ppo_service import ppo_service, PPOService


def get_farm_service() -> FarmSessionManager:
    """Dependency that provides the FarmSessionManager instance."""
    return farm_service


def get_ppo_service() -> PPOService:
    """Dependency that provides the PPOService instance."""
    return ppo_service
