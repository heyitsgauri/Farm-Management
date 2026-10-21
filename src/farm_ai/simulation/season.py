from ..config.settings import SEASON_LENGTH

class SeasonManager:
    """Manages the progression of a season."""
    
    def __init__(self):
        self.current_day = 1
        self.max_days = SEASON_LENGTH
        
    @property
    def is_over(self) -> bool:
        return self.current_day > self.max_days
        
    def advance_day(self):
        """Advances the season by one day."""
        if not self.is_over:
            self.current_day += 1

    def evaluate_season(self, final_cash: float, inventory_value: float, initial_cash: float) -> dict:
        """Evaluates the outcome at the end of the season."""
        total_wealth = final_cash + inventory_value
        profit = total_wealth - initial_cash
        survived = final_cash > 0 or total_wealth > 0  # Simple survival condition

        return {
            "final_cash": final_cash,
            "inventory_value": inventory_value,
            "total_wealth": total_wealth,
            "profit": profit,
            "survived": survived
        }
