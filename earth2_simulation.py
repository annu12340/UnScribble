"""NVIDIA Earth-2 Weather Simulation Model.

This module implements weather forecasting using NVIDIA's Earth-2 AI models
including FourCastNet, GraphCast, and AIFS.

Reference: https://github.com/NVIDIA/earth2studio
"""

import os
from typing import List, Optional
import xarray as xr
from earth2studio.models.px import FCN3, GraphCastOperational, AIFS
from earth2studio.data import GFS
from earth2studio.io import ZarrBackend
from earth2studio.run import deterministic as run
from config import FORECAST_START_DATE, FORECAST_STEPS, MODELS, OUTPUT_DIR


class Earth2Simulator:
    """Main class for running NVIDIA Earth-2 weather simulations."""
    
    def __init__(self, start_date: str = FORECAST_START_DATE, steps: int = FORECAST_STEPS):
        """Initialize the Earth-2 simulator.
        
        Args:
            start_date: ISO format date string for forecast start
            steps: Number of forecast time steps (6-hour intervals)
        """
        self.start_date = start_date
        self.steps = steps
        self.data_source = GFS()
        os.makedirs(OUTPUT_DIR, exist_ok=True)
        
    def run_fourcastnet(self) -> str:
        """Run FourCastNet3 weather forecast model.
        
        Returns:
            Path to output zarr file
        """
        print("Loading FourCastNet3 model...")
        model = FCN3.load_model(FCN3.load_default_package())
        
        output_path = MODELS["fourcastnet"]["output_path"]
        io = ZarrBackend(output_path)
        
        print(f"Running FourCastNet3 forecast from {self.start_date} for {self.steps} steps...")
        run([self.start_date], self.steps, model, self.data_source, io)
        
        print(f"FourCastNet3 forecast saved to {output_path}")
        return output_path
    
    def run_graphcast(self) -> str:
        """Run GraphCast operational weather forecast model.
        
        Returns:
            Path to output zarr file
        """
        print("Loading GraphCast model...")
        package = GraphCastOperational.load_default_package()
        model = GraphCastOperational.load_model(package)
        
        output_path = MODELS["graphcast"]["output_path"]
        io = ZarrBackend(output_path)
        
        print(f"Running GraphCast forecast from {self.start_date} for {self.steps} steps...")
        run([self.start_date], self.steps, model, self.data_source, io)
        
        print(f"GraphCast forecast saved to {output_path}")
        return output_path
    
    def run_aifs(self) -> str:
        """Run ECMWF AIFS weather forecast model.
        
        Returns:
            Path to output zarr file
        """
        print("Loading AIFS model...")
        model = AIFS.load_model(AIFS.load_default_package())
        
        output_path = MODELS["aifs"]["output_path"]
        io = ZarrBackend(output_path)
        
        print(f"Running AIFS forecast from {self.start_date} for {self.steps} steps...")
        run([self.start_date], self.steps, model, self.data_source, io)
        
        print(f"AIFS forecast saved to {output_path}")
        return output_path
    
    def run_all_models(self) -> List[str]:
        """Run all enabled forecast models.
        
        Returns:
            List of output file paths
        """
        outputs = []
        
        if MODELS["fourcastnet"]["enabled"]:
            outputs.append(self.run_fourcastnet())
            
        if MODELS["graphcast"]["enabled"]:
            outputs.append(self.run_graphcast())
            
        if MODELS["aifs"]["enabled"]:
            outputs.append(self.run_aifs())
            
        return outputs
    
    def load_forecast(self, zarr_path: str) -> xr.Dataset:
        """Load forecast data from zarr file.
        
        Args:
            zarr_path: Path to zarr output file
            
        Returns:
            Xarray dataset containing forecast data
        """
        return xr.open_zarr(zarr_path)


def main():
    """Main execution function."""
    print("=" * 60)
    print("NVIDIA Earth-2 Weather Simulation")
    print("=" * 60)
    
    simulator = Earth2Simulator()
    output_files = simulator.run_all_models()
    
    print("\n" + "=" * 60)
    print("Simulation Complete!")
    print("=" * 60)
    print(f"\nGenerated {len(output_files)} forecast(s):")
    for path in output_files:
        print(f"  - {path}")
    
    print("\nTo visualize results, run: python visualize.py")


if __name__ == "__main__":
    main()
