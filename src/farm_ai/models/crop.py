from dataclasses import dataclass

@dataclass
class Crop:
    """Represents a crop in the farm simulator."""
    name: str
    planting_cost: float
    growth_days: int
    yield_amount: int
    base_price: float
    
    @classmethod
    def from_config(cls, name: str, config: dict) -> 'Crop':
        """Creates a Crop instance from a configuration dictionary."""
        return cls(
            name=name,
            planting_cost=config["planting_cost"],
            growth_days=config["growth_days"],
            yield_amount=config["yield_amount"],
            base_price=config["base_price"]
        )
