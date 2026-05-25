# Changelog

All notable changes to the NVIDIA Earth-2 Simulation Model project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-05-25

### Added
- Initial release of NVIDIA Earth-2 Simulation Model
- Core simulation engine (`earth2_simulation.py`)
- Support for three AI weather models:
  - FourCastNet3 (NVIDIA)
  - GraphCast Operational (Google DeepMind)
  - AIFS (ECMWF)
- Ensemble forecasting capabilities (`ensemble_forecast.py`)
  - Ensemble mean computation
  - Ensemble spread calculation
  - Probability forecasts
- Visualization tools (`visualize.py`)
  - Temperature field plotting
  - Wind field visualization
  - Pressure system mapping
- Configuration system (`config.py`)
  - Model enable/disable
  - Forecast parameters
  - Output settings
- Comprehensive documentation:
  - README.md - Project overview
  - GETTING_STARTED.md - Beginner tutorial
  - INSTALL.md - Installation guide
  - USAGE.md - Usage examples
  - API.md - API reference
  - PROJECT_OVERVIEW.md - Technical overview
- Example scripts:
  - `example_usage.py` - Usage examples
  - `notebook_example.ipynb` - Jupyter tutorial
- Testing framework (`test_simulation.py`)
- Quick installation script (`quickstart.sh`)
- Package setup (`setup.py`)
- Dependency management (`requirements.txt`)
- Git ignore rules (`.gitignore`)
- Apache 2.0 License

### Features
- Automatic model weight downloading and caching
- GFS data source integration
- Zarr-based efficient data storage
- Xarray data structures for easy analysis
- Modular architecture for extensibility
- GPU acceleration support (CUDA 11.8 and 12.x)
- Multi-model ensemble creation
- Statistical analysis tools
- Cartopy-based geographic visualizations

### Documentation
- Complete API documentation
- Step-by-step getting started guide
- Detailed installation instructions
- Comprehensive usage examples
- Troubleshooting guides
- Project architecture overview

### Performance
- Optimized inference pipeline
- Efficient data I/O with Zarr
- GPU acceleration support
- Parallel model execution capability

## [Unreleased]

### Planned for v0.2.0
- Additional AI models (Pangu, FuXi, Aurora)
- Real-time data ingestion
- Interactive visualization dashboard
- Performance optimizations
- Web API interface
- Docker containerization
- CI/CD pipeline
- Extended test coverage

### Planned for v0.3.0
- Regional high-resolution models
- Specialized diagnostics (precipitation, tropical cyclones)
- Machine learning post-processing
- Cloud deployment support
- Mobile application
- Multi-language support

## Version History

### Version Numbering
- **Major version** (X.0.0): Breaking changes, major new features
- **Minor version** (0.X.0): New features, backward compatible
- **Patch version** (0.0.X): Bug fixes, minor improvements

### Release Schedule
- Major releases: Annually
- Minor releases: Quarterly
- Patch releases: As needed

## Migration Guides

### Upgrading to v0.1.0
This is the initial release. No migration needed.

## Known Issues

### v0.1.0
- Model downloads can be slow on first run (expected behavior)
- Large memory footprint when running all models simultaneously
- Cartopy installation may require system dependencies on some platforms
- Animation creation not yet implemented in visualizer

## Deprecation Notices

None for v0.1.0 (initial release)

## Security Updates

None for v0.1.0 (initial release)

## Contributors

### v0.1.0
- Initial development and release

## Acknowledgments

Special thanks to:
- NVIDIA for Earth2Studio framework
- Google DeepMind for GraphCast model
- ECMWF for AIFS model
- The open-source AI weather community

---

For more information about releases, see the [GitHub Releases](https://github.com/yourusername/earth2-simulation/releases) page.

To report issues or request features, please open an issue on [GitHub](https://github.com/yourusername/earth2-simulation/issues).
