from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field
from .farm import FarmStateSchema


class ActionItemSchema(BaseModel):
    id: int = Field(..., description="Action integer identifier (0-23)")
    type: str = Field(..., description="Action type: HOLD, PLANT, HARVEST, SELL")
    label: str = Field(..., description="Human readable description of the action")
    valid: bool = Field(..., description="Whether action can be successfully executed in current state")
    field_id: Optional[int] = Field(None, description="Field index targeted by action, if applicable")
    crop_name: Optional[str] = Field(None, description="Crop name targeted by action, if applicable")


class AvailableActionsResponse(BaseModel):
    session_id: str = Field(..., description="Unique UUID identifying the farm session")
    actions: List[ActionItemSchema] = Field(..., description="List of all discrete actions and their validity")


class ActionRequest(BaseModel):
    action: int = Field(..., ge=0, le=23, description="Integer action index (0-23) to execute")


class StepResponse(BaseModel):
    session_id: str = Field(..., description="Unique UUID identifying the farm session")
    state: FarmStateSchema = Field(..., description="New farm state after executing action")
    reward: float = Field(..., description="Reward received from the environment step")
    terminated: bool = Field(..., description="Whether season has ended")
    truncated: bool = Field(..., description="Whether episode was truncated")
    info: Dict[str, Any] = Field(default_factory=dict, description="Additional step information / season evaluation")
