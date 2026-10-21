import random
from typing import Dict, Any, List
from ..environment.actions import Action, ActionType
from ..config.settings import CROP_CONFIG

class RandomAgent:
    """An agent that selects actions completely randomly."""
    
    def __init__(self, seed: int = None):
        self.rng = random.Random(seed)
        self.crops = list(CROP_CONFIG.keys())
        
    def select_action(self, state: Dict[str, Any]) -> Action:
        """Selects a random valid-looking action based on the state."""
        
        # Build a list of possible actions
        possible_actions: List[Action] = []
        possible_actions.append(Action(ActionType.HOLD))
        
        # Check fields
        for field in state["fields"]:
            if field["state"] == "MATURE":
                possible_actions.append(Action(ActionType.HARVEST, field_id=field["id"]))
            elif field["state"] == "EMPTY":
                # Only consider planting if we have cash (approximate check)
                for crop_name, config in CROP_CONFIG.items():
                    if state["cash"] >= config["planting_cost"]:
                        possible_actions.append(Action(ActionType.PLANT, field_id=field["id"], crop_name=crop_name))
        
        # Check inventory
        for crop_name, quantity in state["inventory"].items():
            if quantity > 0:
                # Randomly choose to sell either some or all
                sell_qty = self.rng.randint(1, quantity)
                possible_actions.append(Action(ActionType.SELL, crop_name=crop_name, quantity=sell_qty))
                
        # Return a random choice
        return self.rng.choice(possible_actions)
