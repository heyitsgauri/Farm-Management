from enum import Enum
from dataclasses import dataclass
from typing import Optional

class ActionType(Enum):
    PLANT = "PLANT"
    HARVEST = "HARVEST"
    SELL = "SELL"
    BUY_INPUT = "BUY_INPUT"
    HOLD = "HOLD"

@dataclass
class Action:
    """Represents an action taken by an agent."""
    type: ActionType
    field_id: Optional[int] = None
    crop_name: Optional[str] = None
    quantity: Optional[int] = None

    def __str__(self):
        parts = [self.type.value]
        if self.crop_name:
            parts.append(self.crop_name)
        if self.field_id is not None:
            parts.append(f"in Field {self.field_id}")
        if self.quantity is not None:
            parts.append(f"(Qty: {self.quantity})")
        return " ".join(parts)
