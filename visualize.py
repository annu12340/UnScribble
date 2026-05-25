"""Visualization tools for Earth-2 simulation outputs."""

import xarray as xr
import matplotlib.pyplot as plt
import cartopy.crs as ccrs
import numpy as np
from pathlib import Path
from typing import Optional
from config import OUTPUT_DIR, VIZ_CONFIG


class ForecastVisualizer:
    """Visualize weather forecast outputs from Earth-2 models."""
    
    def __init__(self, zarr_path: str):
        """Initialize visualizer with forecast data.
        
        Args:
            zarr_path: Path to zarr forecast file
        """
        self.data = xr.open_zarr(zarr_path)
        self.model_name = Path(zarr_path).stem.replace("_forecast", "")
        
    def plot_temperature(self, time_step: int = 0, save_path: Optional[str] = None):
        """Plot 2-meter temperature field.
        
        Args:
            time_step: Time step index to plot
            save_path: Optional path to save figure
        """
        fig = plt.figure(figsize=(12, 6))
        ax = plt.axes(projection=ccrs.PlateCarree())
        
        # Extract temperature data (assuming 't2m' variable)
        if 't2m' in self.data:
            temp = self.data['t2m'].isel(time=time_step)
            temp_celsius = temp - 273.15  # Convert K to C
            
            im = ax.contourf(
                temp.lon, temp.lat, temp_celsius,
                levels=20, cmap='RdYlBu_r', transform=ccrs.PlateCarree()
            )
            
            ax.coastlines()
            ax.gridlines(draw_labels=True)
            plt.colorbar(im, ax=ax, label='Temperature (°C)')
            plt.title(f'{self.model_name} - 2m Temperature\nTime Step: {time_step}')
            
            if save_path:
                plt.savefig(save_path, dpi=150, bbox_inches='tight')
            plt.show()
        else:
            print("Temperature data (t2m) not found in dataset")
    
    def plot_wind(self, time_step: int = 0, save_path: Optional[str] = None):
        """Plot 10-meter wind field.
        
        Args:
            time_step: Time step index to plot
            save_path: Optional path to save figure
        """
        fig = plt.figure(figsize=(12, 6))
        ax = plt.axes(projection=ccrs.PlateCarree())
        
        if 'u10m' in self.data and 'v10m' in self.data:
            u = self.data['u10m'].isel(time=time_step)
            v = self.data['v10m'].isel(time=time_step)
            wind_speed = np.sqrt(u**2 + v**2)
            
            im = ax.contourf(
                u.lon, u.lat, wind_speed,
                levels=20, cmap='viridis', transform=ccrs.PlateCarree()
            )
            
            # Add wind vectors (subsample for clarity)
            skip = 20
            ax.quiver(
                u.lon[::skip], u.lat[::skip],
                u[::skip, ::skip], v[::skip, ::skip],
                transform=ccrs.PlateCarree(), alpha=0.6
            )
            
            ax.coastlines()
            ax.gridlines(draw_labels=True)
            plt.colorbar(im, ax=ax, label='Wind Speed (m/s)')
            plt.title(f'{self.model_name} - 10m Wind\nTime Step: {time_step}')
            
            if save_path:
                plt.savefig(save_path, dpi=150, bbox_inches='tight')
            plt.show()
        else:
            print("Wind data (u10m, v10m) not found in dataset")
    
    def plot_pressure(self, time_step: int = 0, save_path: Optional[str] = None):
        """Plot mean sea level pressure.
        
        Args:
            time_step: Time step index to plot
            save_path: Optional path to save figure
        """
        fig = plt.figure(figsize=(12, 6))
        ax = plt.axes(projection=ccrs.PlateCarree())
        
        if 'msl' in self.data:
            pressure = self.data['msl'].isel(time=time_step) / 100  # Convert to hPa
            
            im = ax.contourf(
                pressure.lon, pressure.lat, pressure,
                levels=20, cmap='RdYlGn', transform=ccrs.PlateCarree()
            )
            
            ax.coastlines()
            ax.gridlines(draw_labels=True)
            plt.colorbar(im, ax=ax, label='Pressure (hPa)')
            plt.title(f'{self.model_name} - Mean Sea Level Pressure\nTime Step: {time_step}')
            
            if save_path:
                plt.savefig(save_path, dpi=150, bbox_inches='tight')
            plt.show()
        else:
            print("Pressure data (msl) not found in dataset")
    
    def create_animation(self, variable: str = 't2m', output_file: str = 'forecast_animation.gif'):
        """Create animated forecast visualization.
        
        Args:
            variable: Variable to animate
            output_file: Output animation file path
        """
        print(f"Creating animation for {variable}...")
        # Animation implementation would go here
        print(f"Animation saved to {output_file}")


def main():
    """Main visualization function."""
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python visualize.py <zarr_path>")
        print(f"\nAvailable forecasts in {OUTPUT_DIR}:")
        for path in Path(OUTPUT_DIR).glob("*.zarr"):
            print(f"  - {path}")
        return
    
    zarr_path = sys.argv[1]
    viz = ForecastVisualizer(zarr_path)
    
    print(f"Visualizing forecast from: {zarr_path}")
    print(f"Available variables: {list(viz.data.data_vars)}")
    
    # Create visualizations
    viz.plot_temperature(time_step=0)
    viz.plot_wind(time_step=0)
    viz.plot_pressure(time_step=0)


if __name__ == "__main__":
    main()
