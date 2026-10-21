from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field


class FieldStateSchema(BaseModel):
    id: int = Field(..., description="Field index (0-4)")
    state: str = Field(..., description="Field state: EMPTY, GROWING, MATURE")
    crop: Optional[str] = Field(None, description="Crop name if planted, else null")
    progress: int = Field(0, description="Growth progress in days")


class FarmStateSchema(BaseModel):
    day: int = Field(..., description="Current day of the season (1-30)")
    cash: float = Field(..., description="Current liquid cash available")
    debt: float = Field(..., description="Current outstanding debt")
    fields: List[FieldStateSchema] = Field(..., description="List of 5 fields")
    inventory: Dict[str, int] = Field(..., description="Harvested crops inventory count")
    market_prices: Dict[str, float] = Field(..., description="Current selling prices for crops")
    risk_forecasts: Dict[str, str] = Field(..., description="Risk forecasts (LOW, MEDIUM, HIGH)")


class ResetRequest(BaseModel):
    seed: Optional[int] = Field(None, description="Optional random seed for environment reproducibility")
    session_id: Optional[str] = Field(None, description="Optional existing session ID to reset; if null, a new session is created")


class ResetResponse(BaseModel):
    session_id: str = Field(..., description="Unique UUID identifying the farm session")
    state: FarmStateSchema = Field(..., description="Initial farm state")
    info: Dict[str, Any] = Field(default_factory=dict, description="Additional reset information")


class FarmStateResponse(BaseModel):
    session_id: str = Field(..., description="Unique UUID identifying the farm session")
    state: FarmStateSchema = Field(..., description="Current farm state")


class FarmMetricsResponse(BaseModel):
    session_id: str = Field(..., description="Unique UUID identifying the farm session")
    current_day: int = Field(..., description="Current day of the season")
    cash: float = Field(..., description="Liquid cash")
    debt: float = Field(..., description="Outstanding debt")
    inventory_value: float = Field(..., description="Value of current inventory at market prices")
    total_wealth: float = Field(..., description="Total wealth (cash + inventory value)")
    profit: float = Field(..., description="Profit relative to starting cash")
    survived: bool = Field(..., description="Whether farm is solvent")
    season_over: bool = Field(..., description="Whether season has reached maximum days")
    fields_planted: int = Field(..., description="Number of fields currently planted")
    fields_mature: int = Field(..., description="Number of fields ready for harvest")


class FeasibilityCheckRequest(BaseModel):
    crop_name: str = Field(..., description="Name of the crop to plant (e.g. Wheat, Rice, Corn)")
    field_id: int = Field(..., description="Target field ID (0-4)")
    mode: Optional[str] = Field(None, description="Optional override: 'deterministic' or 'uncertainty_aware'")
    threshold: Optional[float] = Field(None, description="Optional override threshold tau in [0.0, 1.0]")


class FeasibilityCheckResponse(BaseModel):
    crop_name: str
    field_id: int
    feasible: bool
    completion_probability: float
    p_maturation: float
    p_pest_survival: float
    slack_days: int
    available_growth_days: int
    required_growth_days: int
    threshold: float
    mode: str
    reason: str


class ConfigureFilterRequest(BaseModel):
    mode: str = Field("deterministic", description="'deterministic' or 'uncertainty_aware'")
    threshold: float = Field(0.50, description="Threshold tau in [0.0, 1.0]")


class AIEpisodeSimulateRequest(BaseModel):
    seed: int = Field(42, description="Random seed for environment reproducibility")
    scenario: str = Field("Normal", description="'Normal' or 'Adverse'")
    agent_type: str = Field("rule_based", description="'rule_based' or 'ppo'")
    filter_mode: str = Field("uncertainty_aware", description="'deterministic' or 'uncertainty_aware'")
    threshold: float = Field(0.50, description="Feasibility threshold tau")


class AIEpisodeStep(BaseModel):
    day: int
    action_type: str
    action_label: str
    wealth: float
    cash: float
    reasoning: Optional[str] = None


class AIEpisodeSimulateResponse(BaseModel):
    agent_name: str
    model_loaded: bool
    final_wealth: float
    profit: float
    survived: bool
    total_harvested: int
    crop_losses: int
    stranded_crops: int
    decisions_made: int
    trajectory: List[AIEpisodeStep]
