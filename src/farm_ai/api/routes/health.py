from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from ..dependencies import get_ppo_service, PPOService

router = APIRouter(prefix="/health", tags=["Health"])


class HealthResponse(BaseModel):
    status: str = Field("ok", description="Service health status")
    service: str = Field("autonomous-farm-ai", description="Service identifier")
    version: str = Field("0.1.0", description="API version")
    ppo_model_loaded: bool = Field(..., description="Whether PPO model is loaded and ready for inference")


@router.get("", response_model=HealthResponse, summary="Health Check")
def health_check(ppo: PPOService = Depends(get_ppo_service)):
    """Extremely lightweight health check verifying the API service is alive and reporting PPO model availability."""
    return HealthResponse(
        status="ok",
        service="autonomous-farm-ai",
        version="0.1.0",
        ppo_model_loaded=ppo.is_loaded,
    )
