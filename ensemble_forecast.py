"""Ensemble forecasting with multiple Earth-2 models."""

import xarray as xr
import numpy as np
from pathlib import Path
from earth2_simulation import Earth2Simulator
from config import OUTPUT_DIR


class EnsembleForecast:
    """Create ensemble forecasts by combining multiple model outputs."""
    
    def __init__(self, forecast_paths: list):
        """Initialize ensemble with multiple forecast outputs.
        
        Args:
            forecast_paths: List of paths to zarr forecast files
        """
        self.forecasts = [xr.open_zarr(path) for path in forecast_paths]
        self.model_names = [Path(p).stem for p in forecast_paths]
        
    def compute_ensemble_mean(self, variable: str) -> xr.DataArray:
        """Compute ensemble mean for a variable.
        
        Args:
            variable: Variable name to compute mean for
            
        Returns:
            Ensemble mean as xarray DataArray
        """
        arrays = [ds[variable] for ds in self.forecasts if variable in ds]
        if not arrays:
            raise ValueError(f"Variable {variable} not found in any forecast")
        
        return xr.concat(arrays, dim='model').mean(dim='model')
    
    def compute_ensemble_spread(self, variable: str) -> xr.DataArray:
        """Compute ensemble spread (standard deviation).
        
        Args:
            variable: Variable name to compute spread for
            
        Returns:
            Ensemble spread as xarray DataArray
        """
        arrays = [ds[variable] for ds in self.forecasts if variable in ds]
        if not arrays:
            raise ValueError(f"Variable {variable} not found in any forecast")
        
        return xr.concat(arrays, dim='model').std(dim='model')
    
    def compute_probability(self, variable: str, threshold: float, operator: str = '>') -> xr.DataArray:
        """Compute probability of exceeding threshold.
        
        Args:
            variable: Variable name
            threshold: Threshold value
            operator: Comparison operator ('>', '<', '>=', '<=')
            
        Returns:
            Probability field as xarray DataArray
        """
        arrays = [ds[variable] for ds in self.forecasts if variable in ds]
        if not arrays:
            raise ValueError(f"Variable {variable} not found in any forecast")
        
        if operator == '>':
            exceedances = [arr > threshold for arr in arrays]
        elif operator == '<':
            exceedances = [arr < threshold for arr in arrays]
        elif operator == '>=':
            exceedances = [arr >= threshold for arr in arrays]
        elif operator == '<=':
            exceedances = [arr <= threshold for arr in arrays]
        else:
            raise ValueError(f"Unknown operator: {operator}")
        
        return xr.concat(exceedances, dim='model').mean(dim='model')
    
    def save_ensemble_statistics(self, output_path: str):
        """Save ensemble mean and spread to file.
        
        Args:
            output_path: Path to save ensemble statistics
        """
        # Get common variables across all forecasts
        common_vars = set(self.forecasts[0].data_vars)
        for ds in self.forecasts[1:]:
            common_vars &= set(ds.data_vars)
        
        ensemble_stats = {}
        for var in common_vars:
            ensemble_stats[f'{var}_mean'] = self.compute_ensemble_mean(var)
            ensemble_stats[f'{var}_spread'] = self.compute_ensemble_spread(var)
        
        ds = xr.Dataset(ensemble_stats)
        ds.to_zarr(output_path, mode='w')
        print(f"Ensemble statistics saved to {output_path}")


def main():
    """Run ensemble forecast analysis."""
    print("Running ensemble forecast with multiple Earth-2 models...")
    
    # Run all models
    simulator = Earth2Simulator()
    forecast_paths = simulator.run_all_models()
    
    # Create ensemble
    ensemble = EnsembleForecast(forecast_paths)
    
    # Compute and save ensemble statistics
    ensemble_output = f"{OUTPUT_DIR}/ensemble_statistics.zarr"
    ensemble.save_ensemble_statistics(ensemble_output)
    
    print(f"\nEnsemble analysis complete!")
    print(f"Models used: {', '.join(ensemble.model_names)}")


if __name__ == "__main__":
    main()
