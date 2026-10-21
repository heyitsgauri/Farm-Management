from fastapi import APIRouter, Depends, HTTPException, status
from typing import Optional

from ..dependencies import (
    get_farm_service,
    FarmSessionManager,
    get_ppo_service,
    PPOService,
)
from ..schemas.ppo import (
    PPOPredictRequest,
    PPOActionResponse,
    PPOStepRequest,
    PPOStepResponse,
)

router = APIRouter(prefix="/ppo", tags=["PPO Agent"])


@router.post(
    "/predict",
    response_model=PPOActionResponse,
    summary="Predict Action with PPO Agent",
)
def predict_action(
    request: PPOPredictRequest,
    farm_mgr: FarmSessionManager = Depends(get_farm_service),
    ppo: PPOService = Depends(get_ppo_service),
):
    """Asks the trained PPO agent to select an action given the session's current observation.

    Does NOT advance the environment.
    """
    try:
        env = farm_mgr.get_env(request.session_id)
    except KeyError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Farm session '{request.session_id}' not found",
        )

    if not ppo.is_loaded:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=ppo.load_error or "PPO model is unavailable or not yet loaded",
        )

    try:
        action_idx, action_details = ppo.predict(
            env=env,
            deterministic=request.deterministic,
        )
        return PPOActionResponse(
            session_id=request.session_id,
            action=action_idx,
            action_details=action_details,
            deterministic=request.deterministic,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Inference error: {str(e)}",
        )


@router.post(
    "/{session_id}/step",
    response_model=PPOStepResponse,
    summary="Take a Step with PPO Agent",
)
def step_ppo(
    session_id: str,
    request: Optional[PPOStepRequest] = None,
    farm_mgr: FarmSessionManager = Depends(get_farm_service),
    ppo: PPOService = Depends(get_ppo_service),
):
    """Queries PPO for an action and immediately executes it in the farm simulation.

    Advances the simulation by one day and returns the resulting state and reward.
    This facilitates seamless human-vs-AI turn-based interactions in the frontend.
    """
    req = request or PPOStepRequest()

    try:
        env = farm_mgr.get_env(session_id)
    except KeyError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Farm session '{session_id}' not found",
        )

    if not ppo.is_loaded:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=ppo.load_error or "PPO model is unavailable or not yet loaded",
        )

    try:
        # 1. PPO picks action from exact Gymnasium observation
        action_idx, action_details = ppo.predict(
            env=env,
            deterministic=req.deterministic,
        )
        # 2. Execute that action in the exact same environment
        state, reward, terminated, truncated, info = farm_mgr.execute_action(
            session_id=session_id,
            action=action_idx,
        )
        return PPOStepResponse(
            session_id=session_id,
            action=action_idx,
            action_details=action_details,
            state=state,
            reward=reward,
            terminated=terminated,
            truncated=truncated,
            info=info,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"PPO step execution error: {str(e)}",
        )
