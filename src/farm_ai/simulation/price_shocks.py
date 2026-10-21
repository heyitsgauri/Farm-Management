import random
from typing import Dict, Optional
from ..config.settings import EVENT_PROBABILITIES

class PriceShockSystem:
    """Manages market price shocks."""
    
    def __init__(self, rng: Optional[random.Random] = None):
        self._rng = rng if rng is not None else random.Random()
        self.shock_probability = EVENT_PROBABILITIES["price_shock"]
        self.shock_forecast = "LOW"
        self.is_shock_active = False

    def update(self):
        """Updates price shock forecasts and events."""
        roll = self._rng.random()
        
        if roll < self.shock_probability:
            self.is_shock_active = True
            self.shock_forecast = "HIGH"
        elif roll < self.shock_probability * 3:
            self.is_shock_active = False
            self.shock_forecast = "HIGH"
        elif roll < self.shock_probability * 6:
            self.is_shock_active = False
            self.shock_forecast = "MEDIUM"
        else:
            self.is_shock_active = False
            self.shock_forecast = "LOW"
            
    def apply_effects(self, market):
        """Applies price shocks to the market.

        After applying the shock multiplier, prices are re-clamped via
        ``market.clamp_prices()`` to keep them within configured bounds.
        """
        if self.is_shock_active:
            # Massive drop or spike in all prices
            shock_factor = self._rng.choice([0.5, 2.0])
            for crop_name in market.current_prices:
                market.current_prices[crop_name] *= shock_factor
            # Re-clamp to market bounds (fixes audit issue E1)
            market.clamp_prices()
