from dataclasses import dataclass, field
from typing import Dict, List
from ..models.field import Field

@dataclass
class FarmState:
    """Represents the complete state of the farm at a given day."""
    day: int
    cash: float
    debt: float
    fields: List[Field]
    inventory: Dict[str, int]
    market_prices: Dict[str, float]
    risk_forecasts: Dict[str, str]  # e.g., "LOW", "MEDIUM", "HIGH"
    
    def get_state(self) -> dict:
        """Returns a dictionary representation of the state."""
        return {
            "day": self.day,
            "cash": self.cash,
            "debt": self.debt,
            "fields": [
                {
                    "id": f.field_id,
                    "state": f.state.value,
                    "crop": f.crop.name if f.crop else None,
                    "progress": f.growth_progress
                }
                for f in self.fields
            ],
            "inventory": self.inventory,
            "market_prices": self.market_prices,
            "risk_forecasts": self.risk_forecasts
        }
