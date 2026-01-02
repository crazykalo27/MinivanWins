# Vehicle Turn Simulation - Change Log

## Physics Audit & Track Radius Fix (Jan 2026)

### Critical Fix
- **Turn radius is now a fixed track property**: Previously, turn radius was incorrectly calculated based on vehicle wheelbase (~11 ft), causing unrealistic failures at low speeds (~12 mph). This was physically incorrect.
  - **Before**: R = wheelbase × 1.3 × angleFactor × speedFactor (~11 feet for Celica)
  - **After**: R = fixed track radius (default 75 ft, configurable 25-200 ft)
  - The turn radius is a property of the ROAD, not the vehicle. Both vehicles must navigate the same curve.

### New Controls
- **Track Radius Slider**: Added control to set the road curve radius (25-200 feet)
  - City intersection: 25-50 ft (tight, realistic for slow turns)
  - Highway on-ramp: 100-200 ft (wide, higher speed curves)
  - Default: 75 ft (moderate curve)

### Expected Behavior Changes
- **Failure speeds are now realistic**: With default 75 ft radius, failure occurs around 25-35 mph depending on vehicle
- **Simulation speed does NOT affect physics**: Animation speed only affects visual playback, not force calculations
- **Both vehicles tested on identical track**: Same curve radius ensures fair comparison

### Physics Verification
At 30 mph on 75 ft radius:
- Speed: 30 mph = 44 ft/s
- Lateral accel: v²/R = 44² / 75 = 25.8 ft/s² ≈ 0.8g
- Spin-out limit (μ=0.7): ~22-24 ft/s² → will fail
- At 25 mph: 36.7² / 75 = 18.0 ft/s² → will pass

---

## Synchronized Speed Testing & Detailed Failure Math (Jan 2026)

### Changes
- **Synchronized speed testing**: Both vehicles now test the exact same speed simultaneously
  - Uses Promise.all to ensure both vehicles test identical speeds at the same time
  - Winner must complete the exact speed that the loser failed at
  - Eliminates timing discrepancies that could cause incorrect winner determination
- **Detailed failure analysis display**: Shows exact math calculations for failing step
  - Turn radius calculation
  - Lateral acceleration required vs limits
  - Spin-out threshold (friction-based) with margins
  - Rollover threshold (SSF-based) with margins
  - Clear indication of which threshold was exceeded (FAILED) vs passed (PASSED)
  - Color-coded display (red for failed, green for passed)
- **Accurate winner determination**: Winner is guaranteed to have completed the speed the loser failed at
  - Both vehicles tested at identical speeds using synchronized Promise.all
  - When one fails, the other has already completed that same speed
  - Results show exact speeds for accurate comparison

---

## Simulation End Logic & Winner Detection (Jan 2026)

### Changes
- **Immediate stop when opponent fails**: When one vehicle fails, the other simulation stops immediately
  - Simulations communicate via callbacks to check if opponent has failed
  - Winner is determined correctly in all scenarios
  - Fireworks trigger for the winning vehicle
  - Status displays show "Winner!" for the vehicle that wins
- **Comprehensive end-case handling**: All simulation end scenarios properly handled
  - Both fail: Winner is vehicle that lasted longer (higher speed)
  - One fails first: Other vehicle wins immediately with fireworks
  - Both complete: Both marked as completed successfully
  - Tie scenario: Properly detected and handled
- **Improved winner summary**: More detailed explanations for each outcome scenario

---

## Reset Button Enhancement (Jan 2026)

### Changes
- **Reset now stops running simulations**: Reset button can now interrupt and stop any currently running simulation
  - Sets `shouldStop` flag to break out of simulation loops
  - Stops animation frames immediately
  - Re-enables start button for immediate restart
  - Properly resets all state and displays
  - Allows users to stop and restart simulations at any time

---

## Math Display Section (Jan 2026)

### Changes
- **Physics Equations Display**: Added section below simulations showing all formulas used
  - Turn radius calculation
  - Lateral acceleration formula
  - Spin-out limit (friction-based)
  - Rollover limit (Static Stability Factor)
  - Failure condition logic
  - Responsive grid layout with hover effects
  - Clear mathematical notation with descriptions

---

## Failure Mode Controls (Jan 2026)

### Changes
- **Failure Mode Checkboxes**: Added options to ignore specific failure modes
  - **Ignore Slipping**: Checkbox to disable spin-out failure detection
  - **Ignore Tipping**: Checkbox to disable rollover failure detection
  - Allows testing scenarios where only one failure mode is considered
  - Useful for understanding which failure mode limits vehicle performance

---

## Enhanced Physics Model (Jan 2026)

### Changes
- **Vehicle properties now fully utilized**: All vehicle specifications now affect simulation calculations
  - **Wheelbase**: Used in turn radius calculations (longer wheelbase = larger turning radius)
  - **Weight**: Affects spin-out limits (heavier vehicles have better grip due to larger tire contact patches)
  - **Drive Type**: FWD vehicles have slight stability advantage in turns
- **Updated vehicle specifications**: More accurate weight and center of mass height values
  - Toyota Celica: 2,650 lbs, 21" CoM height
  - Dodge Caravan: 4,560 lbs, 27" CoM height
- **Improved turn radius calculation**: Now incorporates vehicle wheelbase for realistic turning behavior
- **Enhanced spin-out physics**: Weight and drive type factors now considered in grip calculations

---

## Speed Controls Update (Jan 2026)

### Changes
- **Speed Step Input**: Added number input (default 1) to set how many mph to increment between tests
- **Simulation Speed Slider**: Replaced discrete lights with continuous draggable slider
  - Range: 0.01x (extremely slow) to 50x (as fast as computationally possible)
  - Smooth exponential scaling for precise control
  - Real-time speed display showing current multiplier
  - Color-coded slider (green = slow, red = fast)

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
  - Toyota Celica (2004): 2600 lbs, CoM 20", wheelbase 102.4", tracks 59.9"/59.4"
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

