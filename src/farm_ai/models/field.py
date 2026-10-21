from enum import Enum
from typing import Optional
from .crop import Crop

class FieldState(Enum):
    EMPTY = "EMPTY"
    GROWING = "GROWING"
    MATURE = "MATURE"

class Field:
    """Represents a field in the farm."""
    
    def __init__(self, field_id: int):
        self.field_id = field_id
        self.crop: Optional[Crop] = None
        self.growth_progress: int = 0
        self.state: FieldState = FieldState.EMPTY
        
    @property
    def is_planted(self) -> bool:
        return self.state != FieldState.EMPTY
        
    @property
    def is_mature(self) -> bool:
        return self.state == FieldState.MATURE

    def plant(self, crop: Crop):
        """Plants a crop in the field."""
        if self.is_planted:
            raise ValueError(f"Field {self.field_id} is already planted.")
        self.crop = crop
        self.growth_progress = 0
        self.state = FieldState.GROWING
        
    def advance_day(self):
        """Advances the growth of the crop by one day."""
        if self.state == FieldState.GROWING and self.crop:
            self.growth_progress += 1
            if self.growth_progress >= self.crop.growth_days:
                self.state = FieldState.MATURE
                
    def harvest(self) -> int:
        """Harvests the crop and returns the yield amount."""
        if self.state != FieldState.MATURE or not self.crop:
            raise ValueError(f"Cannot harvest field {self.field_id}. Not mature.")
        
        yield_amount = self.crop.yield_amount
        self._reset()
        return yield_amount
        
    def _reset(self):
        """Resets the field after harvest or destruction."""
        self.crop = None
        self.growth_progress = 0
        self.state = FieldState.EMPTY
