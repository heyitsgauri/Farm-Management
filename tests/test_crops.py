import unittest
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../src')))

from farm_ai.models.crop import Crop
from farm_ai.models.field import Field
from farm_ai.config.settings import CROP_CONFIG

class TestCrops(unittest.TestCase):
    def test_crop_creation(self):
        crop = Crop.from_config("Wheat", CROP_CONFIG["Wheat"])
        self.assertEqual(crop.name, "Wheat")
        self.assertEqual(crop.planting_cost, 1000.0)

    def test_field_planting_and_growth(self):
        field = Field(0)
        self.assertFalse(field.is_planted)
        
        crop = Crop.from_config("Wheat", CROP_CONFIG["Wheat"])
        field.plant(crop)
        
        self.assertTrue(field.is_planted)
        self.assertFalse(field.is_mature)
        
        # Advance days
        for _ in range(crop.growth_days):
            field.advance_day()
            
        self.assertTrue(field.is_mature)
        
        yield_amount = field.harvest()
        self.assertEqual(yield_amount, crop.yield_amount)
        self.assertFalse(field.is_planted)
