# API Documentation

## Core Classes

### Earth2Simulator

Main class for running NVIDIA Earth-2 weather simulations.

#### Constructor

```python
Earth2Simulator(start_date: str = FORECAST_START_DATE, steps: int = FORECAST_STEPS)
```

**Parameters:**
- `start_date` (str): ISO format date string for forecast start (e.g., "2025-01-01T00:00:00")
- `steps` (int): Number of forecast time steps (6-hour intervals)

**Example:**
```python
simulator = Earth2Simulator(
    start_date="2025-01-15T00:00:00",
    steps=12
)
```

#### Methods

##### run_fourcastnet()

Run FourCastNet3 weather forecast model.

```python
run_fourcastnet() -> str
```

**Returns:** Path to output zarr file

**Example:**
```python
output_path = simulator.run_fourcastnet()
```

##### run_graphcast()

Run GraphCast operational weather forecast model.

```python
run_graphcast() -> str
```

**Returns:** Path to output zarr file

**Example:**
```python
output_path = simulator.run_graphcast()
```

##### run_aifs()

Run ECMWF AIFS weather forecast model.

```python
run_aifs() -> str
```

**Returns:** Path to output zarr file

**Example:**
```python
output_path = simulator.run_aifs()
```

##### run_all_models()

Run all enabled forecast models.

```python
run_all_models() -> List[str]
```

**Returns:** List of output file paths

**Example:**
```python
forecast_paths = simulator.run_all_models()
```

##### load_forecast()

Load forecast data from zarr file.

```python
load_forecast(zarr_path: str) -> xr.Dataset
```

**Parameters:**
- `zarr_path` (str): Path to zarr output file

**Returns:** Xarray dataset containing forecast data

**Example:**
```python
forecast = simulator.load_forecast("outputs/fcn3_forecast.zarr")
```

---

### EnsembleForecast

Create ensemble forecasts by combining multiple model outputs.

#### Constructor

```python
EnsembleForecast(forecast_paths: list)
```

**Parameters:**
- `forecast_paths` (list): List of paths to zarr forecast files

**Example:**
```python
ensemble = EnsembleForecast([
    "outputs/fcn3_forecast.zarr",
    "outputs/graphcast_forecast.zarr"
])
```

#### Methods

##### compute_ensemble_mean()

Compute ensemble mean for a variable.

```python
compute_ensemble_mean(variable: str) -> xr.DataArray
```

**Parameters:**
- `variable` (str): Variable name (e.g., 't2m', 'u10m', 'v10m', 'msl')

**Returns:** Ensemble mean as xarray DataArray

**Example:**
```python
mean_temp = ensemble.compute_ensemble_mean('t2m')
```

##### compute_ensemble_spread()

Compute ensemble spread (standard deviation).

```python
compute_ensemble_spread(variable: str) -> xr.DataArray
```

**Parameters:**
- `variable` (str): Variable name

**Returns:** Ensemble spread as xarray DataArray

**Example:**
```python
temp_spread = ensemble.compute_ensemble_spread('t2m')
```

##### compute_probability()

Compute probability of exceeding threshold.

```python
compute_probability(variable: str, threshold: float, operator: str = '>') -> xr.DataArray
```

**Parameters:**
- `variable` (str): Variable name
- `threshold` (float): Threshold value
- `operator` (str): Comparison operator ('>', '<', '>=', '<=')

**Returns:** Probability field as xarray DataArray

**Example:**
```python
# Probability of temperature > 280K
prob = ensemble.compute_probability('t2m', 280, operator='>')

# Probability of freezing temperatures
freeze_prob = ensemble.compute_probability('t2m', 273.15, operator='<')
```

##### save_ensemble_statistics()

Save ensemble mean and spread to file.

```python
save_ensemble_statistics(output_path: str)
```

**Parameters:**
- `output_path` (str): Path to save ensemble statistics

**Example:**
```python
ensemble.save_ensemble_statistics("outputs/ensemble_stats.zarr")
```

---

### ForecastVisualizer

Visualize weather forecast outputs from Earth-2 models.

#### Constructor

```python
ForecastVisualizer(zarr_path: str)
```

**Parameters:**
- `zarr_path` (str): Path to zarr forecast file

**Example:**
```python
viz = ForecastVisualizer("outputs/fcn3_forecast.zarr")
```

#### Methods

##### plot_temperature()

Plot 2-meter temperature field.

```python
plot_temperature(time_step: int = 0, save_path: Optional[str] = None)
```

**Parameters:**
- `time_step` (int): Time step index to plot
- `save_path` (str, optional): Path to save figure

**Example:**
```python
viz.plot_temperature(time_step=0, save_path="temp_map.png")
```

##### plot_wind()

Plot 10-meter wind field.

```python
plot_wind(time_step: int = 0, save_path: Optional[str] = None)
```

**Parameters:**
- `time_step` (int): Time step index to plot
- `save_path` (str, optional): Path to save figure

**Example:**
```python
viz.plot_wind(time_step=5, save_path="wind_map.png")
```

##### plot_pressure()

Plot mean sea level pressure.

```python
plot_pressure(time_step: int = 0, save_path: Optional[str] = None)
```

**Parameters:**
- `time_step` (int): Time step index to plot
- `save_path` (str, optional): Path to save figure

**Example:**
```python
viz.plot_pressure(time_step=0, save_path="pressure_map.png")
```

##### create_animation()

Create animated forecast visualization.

```python
create_animation(variable: str = 't2m', output_file: str = 'forecast_animation.gif')
```

**Parameters:**
- `variable` (str): Variable to animate
- `output_file` (str): Output animation file path

**Example:**
```python
viz.create_animation(variable='t2m', output_file='temp_animation.gif')
```

---

## Data Structures

### Forecast Dataset

Forecast outputs are stored as Xarray datasets with the following structure:

#### Dimensions
- `time`: Forecast time steps
- `lat`: Latitude coordinates (degrees North)
- `lon`: Longitude coordinates (degrees East)

#### Variables

| Variable | Description | Units |
|----------|-------------|-------|
| `t2m` | 2-meter temperature | Kelvin (K) |
| `u10m` | 10-meter U wind component | m/s |
| `v10m` | 10-meter V wind component | m/s |
| `msl` | Mean sea level pressure | Pascal (Pa) |
| `z500` | 500 hPa geopotential height | m²/s² |
| `t850` | 850 hPa temperature | K |
| `q700` | 700 hPa specific humidity | kg/kg |

**Note:** Available variables depend on the specific model used.

#### Example Access

```python
import xarray as xr

# Load dataset
ds = xr.open_zarr("outputs/fcn3_forecast.zarr")

# Access temperature
temperature = ds['t2m']  # Shape: (time, lat, lon)

# Get specific time step
temp_t0 = ds['t2m'].isel(time=0)

# Select region
region = ds.sel(lat=slice(50, 25), lon=slice(-125, -70))

# Compute statistics
mean_temp = ds['t2m'].mean(dim=['lat', 'lon'])
```

---

## Configuration

### config.py

Configuration module for simulation parameters.

#### Constants

##### FORECAST_START_DATE
```python
FORECAST_START_DATE: str = "2025-01-01T00:00:00"
```
Default forecast start date in ISO format.

##### FORECAST_STEPS
```python
FORECAST_STEPS: int = 10
```
Default number of 6-hour forecast steps.

##### OUTPUT_DIR
```python
OUTPUT_DIR: str = "outputs"
```
Directory for saving forecast outputs.

##### MODELS
```python
MODELS: dict = {
    "fourcastnet": {
        "enabled": bool,
        "output_path": str
    },
    "graphcast": {...},
    "aifs": {...}
}
```
Model configuration dictionary.

##### DATA_SOURCE
```python
DATA_SOURCE: str = "GFS"
```
Data source for initial conditions.

##### VIZ_CONFIG
```python
VIZ_CONFIG: dict = {
    "variables": list,
    "projection": str,
    "colormap": str
}
```
Visualization configuration.

---

## Error Handling

### Common Exceptions

#### ModelLoadError
Raised when model weights cannot be loaded.

```python
try:
    simulator.run_fourcastnet()
except Exception as e:
    print(f"Model load error: {e}")
```

#### DataFetchError
Raised when initial condition data cannot be fetched.

```python
try:
    simulator = Earth2Simulator()
except Exception as e:
    print(f"Data fetch error: {e}")
```

#### OutOfMemoryError
Raised when GPU/CPU memory is insufficient.

```python
try:
    simulator.run_all_models()
except RuntimeError as e:
    if "out of memory" in str(e):
        print("Reduce forecast steps or run models individually")
```

---

## Type Hints

```python
from typing import List, Optional, Dict, Any
import xarray as xr

# Function signatures with type hints
def run_forecast(
    start_date: str,
    steps: int,
    model_name: str
) -> str:
    """Run forecast and return output path."""
    pass

def load_and_process(
    zarr_path: str,
    variables: List[str]
) -> Dict[str, xr.DataArray]:
    """Load and process forecast variables."""
    pass
```

---

## Constants

### Model Resolutions

```python
MODEL_RESOLUTIONS = {
    "fourcastnet": 0.25,  # degrees
    "graphcast": 0.25,
    "aifs": 0.25
}
```

### Time Steps

```python
TIME_STEP_HOURS = 6  # All models use 6-hour time steps
```

### Variable Units

```python
VARIABLE_UNITS = {
    "t2m": "K",
    "u10m": "m/s",
    "v10m": "m/s",
    "msl": "Pa",
    "z500": "m²/s²"
}
```

---

## Best Practices

### 1. Resource Management

```python
# Good: Run models sequentially for limited memory
simulator = Earth2Simulator()
path1 = simulator.run_fourcastnet()
# Process path1 before continuing
path2 = simulator.run_graphcast()

# Avoid: Running all models at once on limited hardware
paths = simulator.run_all_models()  # May cause OOM
```

### 2. Error Handling

```python
# Good: Handle errors gracefully
try:
    output = simulator.run_fourcastnet()
except Exception as e:
    print(f"Forecast failed: {e}")
    # Fallback or retry logic
```

### 3. Data Validation

```python
# Good: Validate forecast data
forecast = simulator.load_forecast(output_path)
assert 't2m' in forecast, "Temperature data missing"
assert len(forecast.time) == steps, "Incorrect number of time steps"
```

---

## Version Compatibility

- Earth2Studio: >= 0.14.0
- PyTorch: >= 2.0.0
- Xarray: >= 2023.1.0
- Python: 3.9, 3.10, 3.11

---

## References

- [Earth2Studio Documentation](https://nvidia.github.io/earth2studio/)
- [NVIDIA Earth-2 Platform](https://www.nvidia.com/en-us/high-performance-computing/earth-2/)
- [Xarray Documentation](https://docs.xarray.dev/)
