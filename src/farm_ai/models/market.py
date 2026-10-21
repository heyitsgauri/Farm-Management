import random
from typing import Dict, Optional
from ..config.settings import CROP_CONFIG

class Market:
    """Represents the dynamic market for crops."""
    
    def __init__(self, rng: Optional[random.Random] = None):
        self._rng = rng if rng is not None else random.Random()
        # Initialize prices based on base_price in config
        self.current_prices: Dict[str, float] = {
            crop_name: config["base_price"]
            for crop_name, config in CROP_CONFIG.items()
        }
        
    def get_current_price(self, crop_name: str) -> float:
        """Returns the current market price for a given crop."""
        if crop_name not in self.current_prices:
            raise ValueError(f"Unknown crop: {crop_name}")
        return self.current_prices[crop_name]
        
    def update_prices(self):
        """Simulates daily price fluctuations."""
        for crop_name in self.current_prices:
            base_price = CROP_CONFIG[crop_name]["base_price"]
            current = self.current_prices[crop_name]
            
            # Simple random walk: prices change by -5% to +5% daily
            change_percent = self._rng.uniform(-0.05, 0.05)
            new_price = current * (1 + change_percent)
            
            # Keep prices within a reasonable range (e.g., 50% to 150% of base)
            self.current_prices[crop_name] = self._clamp(crop_name, new_price)

    def clamp_prices(self):
        """Re-clamps all prices to configured bounds.

        Call after any external modification (e.g. price shocks) to ensure
        prices never exceed [50%, 150%] of the base price.
        """
        for crop_name in self.current_prices:
            self.current_prices[crop_name] = self._clamp(
                crop_name, self.current_prices[crop_name]
            )

    @staticmethod
    def _clamp(crop_name: str, price: float) -> float:
        base_price = CROP_CONFIG[crop_name]["base_price"]
        min_price = base_price * 0.5
        max_price = base_price * 1.5
        return max(min_price, min(price, max_price))
