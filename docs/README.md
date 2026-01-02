# Vehicle Turn Simulation

A physics-based simulation comparing the Toyota Corolla (2004) and Dodge Caravan (2016) in turning scenarios.

## Features

- **Side-by-side comparison** of both vehicles
- **Progressive speed testing** - starts at 10 mph and increases until failure
- **Adjustable turn angle** - test different turn sharpness (15-90 degrees)
- **Adjustable friction coefficient** - simulate different road conditions
- **Physics-based failure detection**:
  - **Spin-out**: Occurs when lateral acceleration exceeds friction limits
  - **Rollover**: Occurs when lateral acceleration exceeds rollover threshold (based on SSF)

## How to Use

1. Open `index.html` in a web browser
2. Adjust the turn angle slider to set the sharpness of the right-hand turn
3. Adjust the friction coefficient slider to simulate different road conditions
4. Click "Start Simulation" to begin
5. Watch as both vehicles attempt the turn at increasing speeds
6. The simulation stops when one or both vehicles experience catastrophic failure
7. Fireworks celebrate the winner!

## Vehicle Specifications

### Toyota Corolla (2004)
- Weight: 2,600 lbs
- Center of Mass Height: 20 inches
- Wheelbase: 102.4 inches
- Front Track: 59.9 inches
- Rear Track: 59.4 inches

### Dodge Caravan (2016)
- Weight: 4,500 lbs
- Center of Mass Height: 26 inches
- Wheelbase: 121.2 inches
- Front/Rear Track: 64.8 inches

## Physics Calculations

The simulation uses:
- **Static Stability Factor (SSF)** = Track Width / (2 × Center of Mass Height)
- **Rollover Limit** = SSF × Gravity
- **Spin-out Limit** = Friction Coefficient × Gravity
- **Lateral Acceleration** = Speed² / Turn Radius

Failure occurs when lateral acceleration exceeds either limit.

