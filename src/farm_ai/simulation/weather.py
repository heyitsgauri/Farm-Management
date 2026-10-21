import random
from typing import Dict, Optional
from ..config.settings import EVENT_PROBABILITIES

class WeatherSystem:
    """Manages weather events like drought."""
    
    def __init__(self, rng: Optional[random.Random] = None):
        self._rng = rng if rng is not None else random.Random()
        self.drought_probability = EVENT_PROBABILITIES["drought"]
        self.drought_forecast = "LOW"
        self.is_drought_active = False

    def update(self):
        """Updates weather forecasts and events."""
        # Simple forecast mechanic: if random is close to prob, forecast is HIGH
        roll = self._rng.random()
        
        if roll < self.drought_probability:
            self.is_drought_active = True
            self.drought_forecast = "HIGH"  # Too late, it's here!
        elif roll < self.drought_probability * 3:
            self.is_drought_active = False
            self.drought_forecast = "HIGH"
        elif roll < self.drought_probability * 6:
            self.is_drought_active = False
            self.drought_forecast = "MEDIUM"
        else:
            self.is_drought_active = False
            self.drought_forecast = "LOW"
            
    def apply_effects(self, fields: list):
        """Applies weather effects to fields."""
        if self.is_drought_active:
            # E.g., reduce growth progress by 1 to simulate stunted growth
            for field in fields:
                if field.is_planted and field.growth_progress > 0:
                    field.growth_progress -= 1
