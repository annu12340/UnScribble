# Usage Guide

## Quick Start

### 1. Basic Forecast

Run a simple weather forecast with FourCastNet:

```python
from earth2_simulation import Earth2Simulator

simulator = Earth2Simulator(
    start_date="2025-01-01T00:00:00",
    steps=10
)

output_path = simulator.run_fourcastnet()
print(f"Forecast saved to: {output_path}")
```

### 2. Command Line Usage

Run the complete simulation pipeline:

```bash
python earth2_simulation.py
```

This will:
- Load all enabled models from `config.py`
- Run forecasts for the configured time period
- Save outputs to the `outputs/` directory

## Advanced Usage

### Multi-Model Ensemble

Create an ensemble forecast combining multiple AI models:

```python
from earth2_simulation import Earth2Simulator
from ensemble_forecast import EnsembleForecast

# Run all models
simulator = Earth2Simulator()
forecast_paths = simulator.run_all_models()

# Create ensemble
ensemble = EnsembleForecast(forecast_paths)

# Compute statistics
ensemble.save_ensemble_statistics("outputs/ensemble_stats.zarr")

# Compute probability of temperature > 280K
prob = ensemble.compute_probability('t2m', 280, operator='>')
```

### Custom Date Range

Specify custom forecast parameters:

```python
simulator = Earth2Simulator(
    start_date="2025-06-15T12:00:00",  # June 15, 2025 at 12:00 UTC
    steps=20  # 20 steps = 5 days (6-hour intervals)
)
```

### Visualization

Create maps and plots from forecast data:

```python
from visualize import ForecastVisualizer

viz = ForecastVisualizer("outputs/fcn3_forecast.zarr")

# Plot temperature
viz.plot_temperature(time_step=0, save_path="temp_map.png")

# Plot wind
viz.plot_wind(time_step=0, save_path="wind_map.png")

# Plot pressure
viz.plot_pressure(time_step=0, save_path="pressure_map.png")
```

### Data Analysis

Load and analyze forecast data:

```python
import xarray as xr

# Load forecast
forecast = xr.open_zarr("outputs/fcn3_forecast.zarr")

# Access variables
temperature = forecast['t2m']  # 2-meter temperature (K)
u_wind = forecast['u10m']      # 10-meter U wind (m/s)
v_wind = forecast['v10m']      # 10-meter V wind (m/s)
pressure = forecast['msl']     # Mean sea level pressure (Pa)

# Compute statistics
global_mean_temp = temperature.mean(dim=['lat', 'lon'])
max_wind_speed = (u_wind**2 + v_wind**2)**0.5.max()

print(f"Global mean temperature: {global_mean_temp.values[0] - 273.15:.2f}°C")
print(f"Maximum wind speed: {max_wind_speed.values:.2f} m/s")
```

## Configuration

### Model Selection

Edit `config.py` to enable/disable models:

```python
MODELS = {
    "fourcastnet": {
        "enabled": True,  # Set to False to disable
        "output_path": "outputs/fcn3_forecast.zarr"
    },
    "graphcast": {
        "enabled": True,
        "output_path": "outputs/graphcast_forecast.zarr"
    },
    "aifs": {
        "enabled": False,  # Disabled
        "output_path": "outputs/aifs_forecast.zarr"
    }
}
```

### Forecast Parameters

Adjust forecast settings:

```python
# Forecast start date (ISO format)
FORECAST_START_DATE = "2025-01-01T00:00:00"

# Number of 6-hour time steps
FORECAST_STEPS = 10  # 10 steps = 2.5 days

# Output directory
OUTPUT_DIR = "outputs"
```

## Common Workflows

### 1. Daily Forecast Update

```python
from datetime import datetime
from earth2_simulation import Earth2Simulator

# Get current date
today = datetime.utcnow().strftime("%Y-%m-%dT00:00:00")

# Run forecast
simulator = Earth2Simulator(start_date=today, steps=16)  # 4 days
output = simulator.run_fourcastnet()
```

### 2. Ensemble Probability Forecast

```python
from ensemble_forecast import EnsembleForecast

# Run ensemble
simulator = Earth2Simulator()
paths = simulator.run_all_models()

# Create ensemble
ensemble = EnsembleForecast(paths)

# Probability of freezing temperatures
freeze_prob = ensemble.compute_probability('t2m', 273.15, operator='<')

# Probability of high winds (>15 m/s)
# Note: Need to compute wind speed first
```

### 3. Regional Analysis

```python
import xarray as xr

# Load forecast
forecast = xr.open_zarr("outputs/fcn3_forecast.zarr")

# Select region (e.g., North America)
region = forecast.sel(
    lat=slice(50, 25),  # 25°N to 50°N
    lon=slice(-125, -70)  # 125°W to 70°W
)

# Compute regional statistics
regional_mean_temp = region['t2m'].mean(dim=['lat', 'lon'])
```

### 4. Time Series Extraction

```python
import xarray as xr

# Load forecast
forecast = xr.open_zarr("outputs/fcn3_forecast.zarr")

# Extract time series for a specific location
lat, lon = 40.7, -74.0  # New York City
point_forecast = forecast.sel(lat=lat, lon=lon, method='nearest')

# Get temperature time series
temp_series = point_forecast['t2m'].values - 273.15  # Convert to Celsius

print("Temperature forecast for NYC:")
for i, temp in enumerate(temp_series):
    print(f"  Step {i} (+{i*6}h): {temp:.1f}°C")
```

## Performance Tips

### GPU Acceleration

Ensure CUDA is available for faster inference:

```python
import torch
print(f"CUDA available: {torch.cuda.is_available()}")
print(f"GPU: {torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'None'}")
```

### Memory Management

For large forecasts or limited memory:

1. Run models sequentially instead of all at once
2. Reduce forecast steps
3. Process outputs in chunks
4. Use Zarr's chunking for efficient I/O

```python
# Run models one at a time
simulator = Earth2Simulator()
simulator.run_fourcastnet()  # Run first
# Process/visualize before running next
simulator.run_graphcast()    # Run second
```

### Parallel Processing

For multiple independent forecasts:

```python
from concurrent.futures import ProcessPoolExecutor

def run_forecast(date):
    simulator = Earth2Simulator(start_date=date, steps=8)
    return simulator.run_fourcastnet()

dates = ["2025-01-01T00:00:00", "2025-01-02T00:00:00", "2025-01-03T00:00:00"]

with ProcessPoolExecutor(max_workers=3) as executor:
    results = list(executor.map(run_forecast, dates))
```

## Troubleshooting

### Model Download Issues

Models are downloaded automatically on first use. If downloads fail:

```python
# Check cache directory
import os
cache_dir = os.path.expanduser("~/.cache/earth2studio/")
print(f"Cache directory: {cache_dir}")
print(f"Exists: {os.path.exists(cache_dir)}")
```

### Memory Errors

If you encounter OOM errors:

```python
# Reduce forecast steps
simulator = Earth2Simulator(steps=4)  # Instead of 10

# Or run on CPU (slower but uses system RAM)
import torch
torch.cuda.is_available = lambda: False
```

### Data Access Issues

If GFS data fetching fails:

```python
# Check internet connection
# GFS data is fetched from NOAA servers
# Ensure firewall allows HTTPS connections
```

## Examples

See `example_usage.py` for complete working examples:

```bash
python example_usage.py
```

Or explore the Jupyter notebook:

```bash
jupyter notebook notebook_example.ipynb
```

## API Reference

For detailed API documentation, see:
- [Earth2Studio API Docs](https://nvidia.github.io/earth2studio/modules/index.html)
- Source code docstrings in each module

## Next Steps

- Explore different models and compare results
- Create custom visualizations
- Integrate with your own data sources
- Build automated forecast pipelines
- Experiment with ensemble techniques

For more information, visit the [NVIDIA Earth-2 platform](https://www.nvidia.com/en-us/high-performance-computing/earth-2/).
