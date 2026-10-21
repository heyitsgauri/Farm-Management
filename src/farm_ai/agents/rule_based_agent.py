from typing import Dict, Any, Optional
from ..environment.actions import Action, ActionType
from ..config.settings import CROP_CONFIG, SEASON_LENGTH

class RuleBasedAgent:
    """A deterministic agent using predefined economic rules."""
    
    def select_action(self, state: Dict[str, Any]) -> Action:
        """Selects an action based on priority rules."""
        
        current_day = state["day"]
        days_remaining = SEASON_LENGTH - current_day
        
        # Priority 1 & B: Harvest mature crops
        for field in state["fields"]:
            if field["state"] == "MATURE":
                return Action(ActionType.HARVEST, field_id=field["id"])
                
        # Priority C: Sell harvested inventory
        # Rule: Sell if we have inventory. For more advanced, we could check prices, 
        # but for a strong baseline, always selling ensures we get cash back.
        for crop_name, quantity in state["inventory"].items():
            if quantity > 0:
                # We could check if price is above base price, but simple baseline says just sell
                return Action(ActionType.SELL, crop_name=crop_name, quantity=quantity)
                
        # Priority D: Plant crops if time permits and it is profitable
        best_crop = self._get_best_crop(state["market_prices"], days_remaining)
        
        if best_crop:
            crop_config = CROP_CONFIG[best_crop]
            if state["cash"] >= crop_config["planting_cost"]:
                # Find an empty field
                for field in state["fields"]:
                    if field["state"] == "EMPTY":
                        return Action(ActionType.PLANT, field_id=field["id"], crop_name=best_crop)
                        
        # Priority E: Hold
        return Action(ActionType.HOLD)
        
    def _get_best_crop(self, market_prices: Dict[str, float], days_remaining: int) -> Optional[str]:
        """Finds the most profitable crop that can mature in the remaining days."""
        best_crop = None
        best_expected_value = -float('inf')
        
        for crop_name, config in CROP_CONFIG.items():
            # Add +1 because planting takes a turn and growth happens at end of turn.
            # To be safe, ensure growth_days < days_remaining
            if config["growth_days"] < days_remaining:
                # Expected value = Yield * Current Price - Planting Cost
                # We use current price as a naive forecast for the future price
                current_price = market_prices[crop_name]
                expected_value = (config["yield_amount"] * current_price) - config["planting_cost"]
                
                if expected_value > best_expected_value and expected_value > 0: # Only plant if it looks profitable
                    best_expected_value = expected_value
                    best_crop = crop_name
                    
        return best_crop
