"""Configuration for NVIDIA Earth-2 simulation models."""

# Simulation parameters
FORECAST_START_DATE = "2025-01-01T00:00:00"
FORECAST_STEPS = 10  # Number of 6-hour steps
OUTPUT_DIR = "outputs"

# Model configurations
MODELS = {
    "fourcastnet": {
        "enabled": True,
        "output_path": f"{OUTPUT_DIR}/fcn3_forecast.zarr"
    },
    "graphcast": {
        "enabled": True,
        "output_path": f"{OUTPUT_DIR}/graphcast_forecast.zarr"
    },
    "aifs": {
        "enabled": True,
        "output_path": f"{OUTPUT_DIR}/aifs_forecast.zarr"
    }
}

# Data source configuration
DATA_SOURCE = "GFS"  # Global Forecast System

# Visualization settings
VIZ_CONFIG = {
    "variables": ["t2m", "u10m", "v10m", "msl"],  # Temperature, wind, pressure
    "projection": "PlateCarree",
    "colormap": "viridis"
}
