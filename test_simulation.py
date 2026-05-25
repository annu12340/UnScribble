"""Unit tests for Earth-2 simulation components."""

import unittest
import os
import tempfile
from pathlib import Path
from earth2_simulation import Earth2Simulator
from config import FORECAST_START_DATE, FORECAST_STEPS


class TestEarth2Simulator(unittest.TestCase):
    """Test cases for Earth2Simulator class."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.simulator = Earth2Simulator(
            start_date=FORECAST_START_DATE,
            steps=2  # Use minimal steps for testing
        )
        self.temp_dir = tempfile.mkdtemp()
    
    def test_initialization(self):
        """Test simulator initialization."""
        self.assertEqual(self.simulator.start_date, FORECAST_START_DATE)
        self.assertEqual(self.simulator.steps, 2)
        self.assertIsNotNone(self.simulator.data_source)
    
    def test_output_directory_creation(self):
        """Test that output directory is created."""
        self.assertTrue(os.path.exists("outputs"))
    
    def tearDown(self):
        """Clean up test fixtures."""
        import shutil
        if os.path.exists(self.temp_dir):
            shutil.rmtree(self.temp_dir)


class TestConfiguration(unittest.TestCase):
    """Test cases for configuration."""
    
    def test_config_imports(self):
        """Test that configuration can be imported."""
        from config import MODELS, OUTPUT_DIR, VIZ_CONFIG
        
        self.assertIsInstance(MODELS, dict)
        self.assertIsInstance(OUTPUT_DIR, str)
        self.assertIsInstance(VIZ_CONFIG, dict)
    
    def test_model_configuration(self):
        """Test model configuration structure."""
        from config import MODELS
        
        for model_name, config in MODELS.items():
            self.assertIn("enabled", config)
            self.assertIn("output_path", config)
            self.assertIsInstance(config["enabled"], bool)
            self.assertIsInstance(config["output_path"], str)


if __name__ == "__main__":
    unittest.main()
