import random
from typing import Dict, Optional
from ..config.settings import EVENT_PROBABILITIES
from ..models.field import FieldState

class PestSystem:
    """Manages pest outbreaks."""
    
    def __init__(self, rng: Optional[random.Random] = None):
        self._rng = rng if rng is not None else random.Random()
        self.pest_probability = EVENT_PROBABILITIES["pest_outbreak"]
        self.pest_forecast = "LOW"
        self.is_outbreak_active = False

    def update(self):
        """Updates pest forecasts and events."""
        roll = self._rng.random()
        
        if roll < self.pest_probability:
            self.is_outbreak_active = True
            self.pest_forecast = "HIGH"
        elif roll < self.pest_probability * 3:
            self.is_outbreak_active = False
            self.pest_forecast = "HIGH"
        elif roll < self.pest_probability * 6:
            self.is_outbreak_active = False
            self.pest_forecast = "MEDIUM"
        else:
            self.is_outbreak_active = False
            self.pest_forecast = "LOW"
            
    def apply_effects(self, fields: list):
        """Applies pest effects to fields (e.g. destroys a random crop)."""
        if self.is_outbreak_active:
            planted_fields = [f for f in fields if f.is_planted]
            if planted_fields:
                # Target one random planted field
                target = self._rng.choice(planted_fields)
                # Destroy the crop
                target._reset()
