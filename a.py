from earth2_simulation import Earth2Simulator

simulator = Earth2Simulator(
    start_date="2025-01-01T00:00:00",
    steps=10
)

output_path = simulator.run_fourcastnet()
print(f"Forecast saved to: {output_path}")