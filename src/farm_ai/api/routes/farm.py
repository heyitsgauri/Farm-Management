import os
import csv
import statistics
from fastapi import APIRouter, Depends, HTTPException, status
from typing import Optional, List, Dict, Any

from ..dependencies import get_farm_service, FarmSessionManager, get_ppo_service, PPOService
from ..schemas.farm import (
    ResetRequest,
    ResetResponse,
    FarmStateResponse,
    FarmMetricsResponse,
    FeasibilityCheckRequest,
    FeasibilityCheckResponse,
    ConfigureFilterRequest,
    AIEpisodeSimulateRequest,
    AIEpisodeSimulateResponse,
    AIEpisodeStep,
)
from ..schemas.actions import (
    AvailableActionsResponse,
    ActionRequest,
    StepResponse,
)
from ...environment.feasibility import FeasibilityFilter
from ...environment.farm_environment import FarmEnvironment, _int_action_to_farm_action
from ...environment.actions import Action, ActionType
from ...agents.rule_based_agent import RuleBasedAgent
from ...config.settings import CROP_CONFIG, SEASON_LENGTH, EVENT_PROBABILITIES

router = APIRouter(prefix="/farm", tags=["Farm Simulation"])


@router.post(
    "/reset",
    response_model=ResetResponse,
    summary="Create or Reset a Farm Session",
    status_code=status.HTTP_200_OK,
)
def reset_farm(
    request: Optional[ResetRequest] = None,
    service: FarmSessionManager = Depends(get_farm_service),
):
    """Creates a new simulation session or resets an existing session.

    If `session_id` is provided in the request body, that session is reset.
    Otherwise, a new session is created with a unique UUID.
    Optional `seed` parameter controls environmental reproducibility.
    """
    req = request or ResetRequest()
    session_id, state, info = service.reset_session(
        session_id=req.session_id,
        seed=req.seed,
    )
    return ResetResponse(
        session_id=session_id,
        state=state,
        info=info,
    )


@router.get(
    "/{session_id}/state",
    response_model=FarmStateResponse,
    summary="Get Current Farm State",
)
def get_farm_state(
    session_id: str,
    service: FarmSessionManager = Depends(get_farm_service),
):
    """Retrieves the complete human-readable state of the farm for the given session."""
    try:
        state = service.get_state(session_id)
        return FarmStateResponse(session_id=session_id, state=state)
    except KeyError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Farm session '{session_id}' not found",
        )


@router.get(
    "/{session_id}/actions",
    response_model=AvailableActionsResponse,
    summary="Get Available Actions",
)
def get_available_actions(
    session_id: str,
    service: FarmSessionManager = Depends(get_farm_service),
):
    """Returns all 24 discrete actions with dynamic validity checks against the current farm state."""
    try:
        actions = service.get_actions(session_id)
        return AvailableActionsResponse(session_id=session_id, actions=actions)
    except KeyError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Farm session '{session_id}' not found",
        )


@router.post(
    "/{session_id}/action",
    response_model=StepResponse,
    summary="Execute Human / Client Action",
)
def execute_player_action(
    session_id: str,
    request: ActionRequest,
    service: FarmSessionManager = Depends(get_farm_service),
):
    """Executes a discrete action (0-23) in the simulation.

    Advances the simulation by one day, updates crop growth, market prices,
    risk events, and computes the wealth-shaped reward.
    """
    try:
        state, reward, terminated, truncated, info = service.execute_action(
            session_id=session_id,
            action=request.action,
        )
        return StepResponse(
            session_id=session_id,
            state=state,
            reward=reward,
            terminated=terminated,
            truncated=truncated,
            info=info,
        )
    except KeyError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Farm session '{session_id}' not found",
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid action execution: {str(e)}",
        )


@router.get(
    "/{session_id}/metrics",
    response_model=FarmMetricsResponse,
    summary="Get Farm Financial & Operational Metrics",
)
def get_farm_metrics(
    session_id: str,
    service: FarmSessionManager = Depends(get_farm_service),
):
    """Retrieves economic and operational metrics (cash, wealth, profit, survival status) calculated by the simulation."""
    try:
        metrics = service.get_metrics(session_id)
        return FarmMetricsResponse(**metrics)
    except KeyError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Farm session '{session_id}' not found",
        )


@router.delete(
    "/{session_id}",
    summary="Delete Farm Session",
    status_code=status.HTTP_200_OK,
)
def delete_farm_session(
    session_id: str,
    service: FarmSessionManager = Depends(get_farm_service),
):
    """Deletes an active session to free in-memory resources."""
    success = service.delete_session(session_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Farm session '{session_id}' not found",
        )
    return {"status": "deleted", "session_id": session_id}


@router.post(
    "/{session_id}/feasibility",
    response_model=FeasibilityCheckResponse,
    summary="Check Planting Feasibility for a Field and Crop",
)
def check_planting_feasibility(
    session_id: str,
    request: FeasibilityCheckRequest,
    service: FarmSessionManager = Depends(get_farm_service),
):
    """Evaluates whether planting the specified crop on field_id is feasible under current conditions."""
    try:
        env = service.get_env(session_id)
    except KeyError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Farm session '{session_id}' not found")

    filter_instance = env.feasibility_filter
    if request.mode is not None or request.threshold is not None:
        mode = request.mode or (filter_instance.mode if filter_instance else "deterministic")
        threshold = request.threshold if request.threshold is not None else (filter_instance.threshold if filter_instance else 0.5)
        filter_instance = FeasibilityFilter(
            mode=mode,
            threshold=threshold,
            method="analytical",
            drought_prob=getattr(env.weather_system, "drought_probability", 0.05),
            pest_prob=getattr(env.pest_system, "pest_probability", 0.08),
        )
    elif filter_instance is None:
        filter_instance = FeasibilityFilter(mode="deterministic")

    num_planted = sum(1 for f in env.fields if f.is_planted)
    res = filter_instance.estimate_planting_feasibility(
        crop_name=request.crop_name,
        current_day=env.current_day,
        season_length=SEASON_LENGTH,
        num_planted_fields=num_planted,
        drought_forecast=env.weather_system.forecast,
        pest_forecast=env.pest_system.forecast,
        base_drought_prob=getattr(env.weather_system, "drought_probability", 0.05),
        base_pest_prob=getattr(env.pest_system, "pest_probability", 0.08),
    )

    return FeasibilityCheckResponse(
        crop_name=request.crop_name,
        field_id=request.field_id,
        feasible=res["feasible"],
        completion_probability=res["completion_probability"],
        p_maturation=res["p_maturation"],
        p_pest_survival=res["p_pest_survival"],
        slack_days=res["slack_days"],
        available_growth_days=res["available_growth_days"],
        required_growth_days=res["required_growth_days"],
        threshold=res["threshold"],
        mode=res["mode"],
        reason=res["reason"],
    )


@router.post(
    "/{session_id}/filter",
    summary="Configure Feasibility Filter for Session",
)
def configure_filter(
    session_id: str,
    request: ConfigureFilterRequest,
    service: FarmSessionManager = Depends(get_farm_service),
):
    """Updates the feasibility filter configuration for the active simulation session."""
    try:
        env = service.get_env(session_id)
    except KeyError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Farm session '{session_id}' not found")

    env.feasibility_filter = FeasibilityFilter(
        mode=request.mode,
        threshold=request.threshold,
        method="analytical",
        drought_prob=getattr(env.weather_system, "drought_probability", 0.05),
        pest_prob=getattr(env.pest_system, "pest_probability", 0.08),
    )
    return {
        "status": "success",
        "mode": env.feasibility_filter.mode,
        "threshold": env.feasibility_filter.threshold,
    }


@router.get(
    "/benchmark-results",
    summary="Get Feasibility Benchmark Results",
)
def get_benchmark_results():
    """Returns the empirical benchmark results from feasibility_benchmark.csv."""
    csv_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../..", "benchmark_results", "feasibility_benchmark.csv"))
    if not os.path.exists(csv_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Benchmark results not found")

    records = []
    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            records.append({
                "seed": int(row["seed"]),
                "scenario": row["scenario"],
                "filter_mode": row["filter_mode"],
                "threshold": float(row["threshold"]),
                "final_wealth": float(row["final_wealth"]),
                "profit": float(row["profit"]),
                "survived": row["survived"].lower() in ("true", "1"),
                "stranded_crops": int(row["stranded_crops"]),
                "invalid_actions": int(row["invalid_actions"]),
                "avg_filter_time_ms": float(row["avg_filter_time_ms"]),
            })

    groups: Dict[tuple, list] = {}
    for r in records:
        key = (r["scenario"], r["filter_mode"], r["threshold"])
        if key not in groups:
            groups[key] = []
        groups[key].append(r)

    summaries = []
    for (scenario, filter_mode, threshold), group_rows in groups.items():
        wealths = [x["final_wealth"] for x in group_rows]
        stranded = [x["stranded_crops"] for x in group_rows]
        survived_count = sum(1 for x in group_rows if x["survived"])
        times = [x["avg_filter_time_ms"] for x in group_rows]
        summaries.append({
            "scenario": scenario,
            "filter_mode": filter_mode,
            "threshold": threshold,
            "episodes": len(group_rows),
            "mean_wealth": statistics.mean(wealths),
            "std_wealth": statistics.stdev(wealths) if len(wealths) > 1 else 0.0,
            "min_wealth": min(wealths),
            "max_wealth": max(wealths),
            "survival_rate": survived_count / len(group_rows) if group_rows else 0.0,
            "mean_stranded_crops": statistics.mean(stranded),
            "avg_filter_time_ms": statistics.mean(times) if times else 0.0,
        })

    return {
        "records": records,
        "summaries": summaries,
    }


@router.post(
    "/simulate-ai-episode",
    response_model=AIEpisodeSimulateResponse,
    summary="Simulate a Full AI Episode for Head-to-Head Comparison",
)
def simulate_ai_episode(
    request: AIEpisodeSimulateRequest,
    ppo_svc: PPOService = Depends(get_ppo_service),
):
    """Simulates an entire 30-day episode for an AI agent under identical seeds/scenarios."""
    is_adverse = request.scenario.lower() == "adverse"
    d_prob = 0.20 if is_adverse else 0.05
    p_prob = 0.18 if is_adverse else 0.08

    f_filter = FeasibilityFilter(
        mode=request.filter_mode,
        threshold=request.threshold,
        method="analytical",
        drought_prob=d_prob,
        pest_prob=p_prob,
    )

    env = FarmEnvironment(
        feasibility_filter=f_filter,
        feasibility_mode=request.filter_mode,
        feasibility_threshold=request.threshold,
    )
    env.reset(seed=request.seed, options={"drought_prob": d_prob, "pest_prob": p_prob})

    use_ppo = request.agent_type.lower() == "ppo" and ppo_svc.is_loaded
    ppo_available = ppo_svc.is_loaded

    trajectory: List[AIEpisodeStep] = []
    done = False
    step_count = 0

    while not done and step_count < SEASON_LENGTH:
        day = env.current_day
        valid_actions = env.get_actions()
        dict_state = env.get_dict_state()

        chosen_action: Optional[Action] = None
        reasoning = ""

        if use_ppo:
            obs = env._get_observation()
            action_idx = ppo_svc.predict(obs, deterministic=True)
            chosen_action = _int_action_to_farm_action(action_idx)
            reasoning = f"PPO network output action {chosen_action.type.name} with confidence."
        else:
            # Rule-based mask-aware agent
            # 1. Harvest mature fields
            for act in valid_actions:
                if act["type"] == "HARVEST" and act["valid"]:
                    chosen_action = Action(ActionType.HARVEST, field_id=act["field_id"])
                    crop = env.fields[act["field_id"]].crop_name
                    reasoning = f"Field #{act['field_id'] + 1} has mature {crop}. Harvesting immediately to prevent crop spoilage."
                    break

            # 2. Sell inventory
            if chosen_action is None:
                for act in valid_actions:
                    if act["type"] == "SELL" and act["valid"]:
                        qty = dict_state["inventory"].get(act["crop_name"], 0)
                        if qty > 0:
                            chosen_action = Action(ActionType.SELL, crop_name=act["crop_name"], quantity=qty)
                            price = dict_state["market_prices"].get(act["crop_name"], 0.0)
                            reasoning = f"Selling {qty} units of {act['crop_name']} at current market price of ₹{price:.1f}/unit."
                            break

            # 3. Plant highest value crop passing feasibility
            if chosen_action is None:
                valid_plants = [a for a in valid_actions if a["type"] == "PLANT" and a["valid"]]
                if valid_plants:
                    best_plant = max(
                        valid_plants,
                        key=lambda a: dict_state["market_prices"].get(a["crop_name"], 0.0),
                    )
                    chosen_action = Action(ActionType.PLANT, field_id=best_plant["field_id"], crop_name=best_plant["crop_name"])
                    reasoning = (
                        f"Feasibility filter approved planting {best_plant['crop_name']} on Field #{best_plant['field_id'] + 1} "
                        f"(Mode: {request.filter_mode})."
                    )

            # 4. Fallback HOLD
            if chosen_action is None:
                chosen_action = Action(ActionType.HOLD)
                reasoning = "No valid planting, harvesting, or selling actions available within risk threshold. Preserving capital."

        # Step environment
        _, _, done, _, _ = env.step(chosen_action)
        step_count += 1

        action_label = chosen_action.type.name
        if chosen_action.type == ActionType.PLANT:
            action_label = f"Plant {chosen_action.crop_name} (F{chosen_action.field_id + 1})"
        elif chosen_action.type == ActionType.HARVEST:
            action_label = f"Harvest (F{chosen_action.field_id + 1})"
        elif chosen_action.type == ActionType.SELL:
            action_label = f"Sell {chosen_action.crop_name} ({chosen_action.quantity})"

        trajectory.append(
            AIEpisodeStep(
                day=day,
                action_type=chosen_action.type.name,
                action_label=action_label,
                wealth=round(env._total_wealth(), 2),
                cash=round(env.cash, 2),
                reasoning=reasoning,
            )
        )

    metrics = env.get_metrics()
    stranded = sum(1 for f in env.fields if f.is_planted)

    agent_name = "PPO Agent" if use_ppo else ("Rule-Based Agent" if request.agent_type == "rule_based" else "Rule-Based Agent (PPO fallback)")

    return AIEpisodeSimulateResponse(
        agent_name=agent_name,
        model_loaded=ppo_available if request.agent_type.lower() == "ppo" else True,
        final_wealth=round(metrics["total_wealth"], 2),
        profit=round(metrics["profit"], 2),
        survived=bool(metrics["survived"]),
        total_harvested=int(metrics["total_harvested"]),
        crop_losses=int(metrics["crop_losses"]),
        stranded_crops=int(stranded),
        decisions_made=len(trajectory),
        trajectory=trajectory,
    )

