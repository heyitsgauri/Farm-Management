from typing import Dict, Any
from pydantic import BaseModel, Field
from .farm import FarmStateSchema


class PPOPredictRequest(BaseModel):
    session_id: str = Field(..., description="Unique UUID identifying the farm session")
    deterministic: bool = Field(True, description="Whether to predict deterministically (greedy) or sample from policy")


class PPOActionResponse(BaseModel):
    session_id: str = Field(..., description="Unique UUID identifying the farm session")
    action: int = Field(..., description="Integer action index (0-23) chosen by PPO")
    action_details: Dict[str, Any] = Field(..., description="Decoded action details (type, label, field, crop)")
    deterministic: bool = Field(..., description="Mode used during prediction")


class PPOStepRequest(BaseModel):
    deterministic: bool = Field(True, description="Whether to select action deterministically")


class PPOStepResponse(BaseModel):
    session_id: str = Field(..., description="Unique UUID identifying the farm session")
    action: int = Field(..., description="Action chosen and executed by PPO")
    action_details: Dict[str, Any] = Field(..., description="Decoded action details")
    state: FarmStateSchema = Field(..., description="New farm state after executing action")
    reward: float = Field(..., description="Reward received from the environment")
    terminated: bool = Field(..., description="Whether season has ended")
    truncated: bool = Field(..., description="Whether episode was truncated")
    info: Dict[str, Any] = Field(default_factory=dict, description="Additional step information")
