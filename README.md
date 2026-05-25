# NVIDIA Earth-2 Weather Simulation Model

A comprehensive implementation of NVIDIA's Earth-2 climate digital twin platform for AI-powered weather forecasting and climate simulation.

## Overview

This project leverages NVIDIA's Earth2Studio framework to run state-of-the-art AI weather models including:

- **FourCastNet3** - NVIDIA's neural operator-based global forecast model
- **GraphCast** - Google DeepMind's graph neural network weather model  
- **AIFS** - ECMWF's AI Integrated Forecasting System

## Features

- Multi-model ensemble forecasting
- Global weather prediction at 0.25° resolution
- 6-hour time step forecasts
- Visualization tools for temperature, wind, and pressure fields
- Ensemble statistics (mean, spread, probability)
- Zarr-based efficient data storage

## Quick Start

**New to Earth-2?** Check out the [Getting Started Guide](GETTING_STARTED.md) for a step-by-step tutorial.

### Installation

```bash
# Quick install
chmod +x quickstart.sh
./quickstart.sh
source venv/bin/activate

# Or manual install
pip install -r requirements.txt
```

For detailed installation instructions, see [INSTALL.md](INSTALL.md).

## Usage

### Run Your First Forecast

```bash
python earth2_simulation.py
```

### Python API

```python
from earth2_simulation import Earth2Simulator

simulator = Earth2Simulator(
    start_date="2025-01-01T00:00:00",
    steps=10
)

output = simulator.run_fourcastnet()
```

For comprehensive usage examples, see [USAGE.md](USAGE.md).

## Documentation

- **[Getting Started Guide](GETTING_STARTED.md)** - Step-by-step tutorial for beginners
- **[Installation Guide](INSTALL.md)** - Detailed installation instructions
- **[Usage Guide](USAGE.md)** - Comprehensive usage examples
- **[API Reference](API.md)** - Complete API documentation

## Project Structure

```
.
├── earth2_simulation.py    # Main simulation engine
├── ensemble_forecast.py    # Ensemble forecasting
├── visualize.py            # Visualization tools
├── config.py               # Configuration settings
├── example_usage.py        # Usage examples
├── test_simulation.py      # Unit tests
├── requirements.txt        # Python dependencies
├── setup.py                # Package setup
├── quickstart.sh           # Quick installation script
├── notebook_example.ipynb  # Jupyter notebook tutorial
├── README.md               # This file
├── INSTALL.md              # Installation guide
├── USAGE.md                # Detailed usage guide
└── outputs/                # Forecast outputs (generated)
```

## Model Details

### FourCastNet3
- Resolution: 0.25° (~25km)
- Architecture: Fourier Neural Operator
- Time step: 6 hours
- Coverage: Global

### GraphCast Operational
- Resolution: 0.25° (~25km)  
- Architecture: Graph Neural Network
- Time step: 6 hours
- Coverage: Global

### AIFS
- Resolution: 0.25° (~25km)
- Architecture: Transformer
- Time step: 6 hours
- Coverage: Global

## Data Sources

The models use GFS (Global Forecast System) data as initial conditions, automatically fetched from NOAA servers.

## Output Format

Forecasts are saved in Zarr format with the following structure:

```
forecast.zarr/
├── time          # Forecast time steps
├── lat           # Latitude coordinates
├── lon           # Longitude coordinates
├── t2m           # 2-meter temperature (K)
├── u10m          # 10-meter U wind (m/s)
├── v10m          # 10-meter V wind (m/s)
├── msl           # Mean sea level pressure (Pa)
└── ...           # Additional variables
```

## Performance

Typical forecast times on NVIDIA A100:
- FourCastNet3: ~2 seconds per time step
- GraphCast: ~3 seconds per time step
- AIFS: ~4 seconds per time step

## References

- [NVIDIA Earth-2 Platform](https://www.nvidia.com/en-us/high-performance-computing/earth-2/)
- [Earth2Studio Documentation](https://nvidia.github.io/earth2studio/)
- [Earth2Studio GitHub](https://github.com/NVIDIA/earth2studio)
- [FourCastNet Paper](https://arxiv.org/abs/2202.11214)
- [GraphCast Paper](https://arxiv.org/abs/2212.12794)

## License

This project uses NVIDIA Earth2Studio under the Apache License 2.0. Individual models may have their own licenses - please refer to the original sources.

## Contributing

Contributions are welcome! Please ensure:
- Code follows PEP 8 style guidelines
- All functions include docstrings
- Tests pass before submitting PRs

## Support

For issues related to:
- Earth2Studio: [GitHub Issues](https://github.com/NVIDIA/earth2studio/issues)
- This implementation: Open an issue in this repository

## Acknowledgments

Built with [NVIDIA Earth2Studio](https://github.com/NVIDIA/earth2studio) - an open-source framework for AI weather and climate modeling.
