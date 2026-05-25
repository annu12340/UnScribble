"""Example usage of the Earth-2 simulation model."""

from earth2_simulation import Earth2Simulator
from ensemble_forecast import EnsembleForecast
from visualize import ForecastVisualizer


def example_single_model():
    """Example: Run a single model forecast."""
    print("Example 1: Running FourCastNet3 model")
    print("-" * 50)
    
    simulator = Earth2Simulator(
        start_date="2025-01-15T00:00:00",
        steps=8
    )
    
    output_path = simulator.run_fourcastnet()
    print(f"Forecast saved to: {output_path}\n")


def example_multi_model_ensemble():
    """Example: Run multiple models and create ensemble."""
    print("Example 2: Multi-model ensemble forecast")
    print("-" * 50)
    
    simulator = Earth2Simulator(
        start_date="2025-02-01T00:00:00",
        steps=12
    )
    
    # Run all models
    forecast_paths = simulator.run_all_models()
    
    # Create ensemble
    ensemble = EnsembleForecast(forecast_paths)
    
    # Compute ensemble statistics
    ensemble.save_ensemble_statistics("outputs/ensemble_stats.zarr")
    
    # Compute probability of temperature > 280K
    prob = ensemble.compute_probability('t2m', 280, operator='>')
    print(f"Probability field computed: {prob.shape}\n")


def example_visualization():
    """Example: Visualize forecast outputs."""
    print("Example 3: Visualizing forecast data")
    print("-" * 50)
    
    # First run a forecast
    simulator = Earth2Simulator(steps=4)
    output_path = simulator.run_fourcastnet()
    
    # Create visualizations
    viz = ForecastVisualizer(output_path)
    
    print("Creating temperature plot...")
    viz.plot_temperature(time_step=0, save_path="outputs/temperature_map.png")
    
    print("Creating wind plot...")
    viz.plot_wind(time_step=0, save_path="outputs/wind_map.png")
    
    print("Visualizations saved to outputs/\n")


def example_custom_analysis():
    """Example: Custom analysis of forecast data."""
    print("Example 4: Custom forecast analysis")
    print("-" * 50)
    
    simulator = Earth2Simulator(steps=6)
    output_path = simulator.run_graphcast()
    
    # Load and analyze data
    forecast = simulator.load_forecast(output_path)
    
    print(f"Forecast dimensions: {forecast.dims}")
    print(f"Available variables: {list(forecast.data_vars)}")
    print(f"Time range: {forecast.time.values[0]} to {forecast.time.values[-1]}")
    
    # Example: Compute global mean temperature
    if 't2m' in forecast:
        global_mean_temp = forecast['t2m'].mean(dim=['lat', 'lon'])
        print(f"\nGlobal mean temperature evolution:")
        for i, temp in enumerate(global_mean_temp.values):
            print(f"  Step {i}: {temp - 273.15:.2f}°C")
    
    print()


if __name__ == "__main__":
    print("=" * 60)
    print("NVIDIA Earth-2 Simulation Examples")
    print("=" * 60)
    print()
    
    # Run examples (comment out as needed)
    example_single_model()
    # example_multi_model_ensemble()
    # example_visualization()
    # example_custom_analysis()
    
    print("=" * 60)
    print("Examples complete!")
    print("=" * 60)
