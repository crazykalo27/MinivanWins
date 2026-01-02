# Vehicle Turn Simulation - Change Log

## Speed Controls Update (Jan 2026)

### Changes
- **Speed Step Input**: Added number input (default 1) to set how many mph to increment between tests
- **Simulation Speed Lights**: Added 6 lights with arrow controls for playback speed
  - Level 1 (green): Very slow animation
  - Level 6 (red): Very fast animation
  - Click arrows or lights directly to change speed

---

## Track Geometry Fix (Jan 2026)

### Changes
- **Simplified track to single adjustable turn**: Track now has horizontal approach from left, single right-hand turn (adjustable 15-90°), and exit
- **Removed green trajectory line**: No more path history drawn behind the vehicle
- **Fixed confusing double-turn appearance**: Previous geometry created visual illusion of two turns

---

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
  - Clean track visualization without path trails
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

