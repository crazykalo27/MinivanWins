# Vehicle Turn Simulation - Change Log

## Initial Implementation

### Core Features
- **Physics Engine**: Implements rollover and spin-out calculations based on:
  - Static Stability Factor (SSF) for rollover prediction
  - Friction coefficient limits for spin-out prediction
  - Center of mass height, track width, and vehicle weight considerations
  
- **Vehicle Specifications**:
  - Toyota Corolla (2004): 2600 lbs, CoM 20", wheelbase 102.4", tracks 59.9"/59.4"
  - Dodge Caravan (2016): 4500 lbs, CoM 26", wheelbase 121.2", tracks 64.8"/64.8"

- **Simulation Features**:
  - Side-by-side top-down view with track visualization
  - Progressive speed increase (10-150 mph increments)
  - Adjustable turn angle (15-90 degrees)
  - Adjustable friction coefficient (0.3-1.2)
  - Right-hand turn simulation
  - Visual track history showing vehicle path
  - Catastrophic failure detection (spin-out or rollover)

- **UI/UX**:
  - White, orange, and green color theme
  - Intuitive controls with sliders
  - Real-time speed and status displays
  - Fireworks animation for winner
  - Responsive design

### Technical Implementation
- HTML5 Canvas for track rendering
- CSS3 animations and transitions
- JavaScript physics calculations
- Binary search algorithm for critical speed detection
- Frame-based animation system

