// Initialize physics engine
const physicsEngine = new PhysicsEngine();

// Initialize simulations
const corollaSim = new Simulation('corollaCanvas', 'corollaImage', 'corolla', physicsEngine);
const caravanSim = new Simulation('caravanCanvas', 'caravanImage', 'caravan', physicsEngine);

// Initialize fireworks
const fireworks = new Fireworks('fireworks-container');

// UI Elements
const turnAngleSlider = document.getElementById('turnAngle');
const turnAngleValue = document.getElementById('turnAngleValue');
const frictionCoeffSlider = document.getElementById('frictionCoeff');
const frictionCoeffValue = document.getElementById('frictionCoeffValue');
const speedStepInput = document.getElementById('speedStep');
const simSpeedSlider = document.getElementById('simSpeedSlider');
const simSpeedValue = document.getElementById('simSpeedValue');
const ignoreSlippingCheckbox = document.getElementById('ignoreSlipping');
const ignoreTippingCheckbox = document.getElementById('ignoreTipping');
const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');

const corollaSpeedDisplay = document.getElementById('corollaSpeed');
const corollaStatusDisplay = document.getElementById('corollaStatus');
const caravanSpeedDisplay = document.getElementById('caravanSpeed');
const caravanStatusDisplay = document.getElementById('caravanStatus');
const corollaAnalysis = document.getElementById('corollaAnalysis');
const caravanAnalysis = document.getElementById('caravanAnalysis');
const winnerSummary = document.getElementById('winnerSummary');
const currentSpeedDisplay = document.getElementById('currentSpeedDisplay');

// Event listeners
turnAngleSlider.addEventListener('input', (e) => {
    const angle = parseInt(e.target.value);
    turnAngleValue.textContent = `${angle}°`;
    corollaSim.setTurnAngle(angle);
    caravanSim.setTurnAngle(angle);
});

frictionCoeffSlider.addEventListener('input', (e) => {
    const mu = parseFloat(e.target.value);
    frictionCoeffValue.textContent = mu.toFixed(1);
    physicsEngine.setFrictionCoeff(mu);
    corollaSim.setFrictionCoeff(mu);
    caravanSim.setFrictionCoeff(mu);
});

// Track radius control
const trackRadiusSlider = document.getElementById('trackRadius');
const trackRadiusValue = document.getElementById('trackRadiusValue');

trackRadiusSlider.addEventListener('input', (e) => {
    const radius = parseInt(e.target.value);
    trackRadiusValue.textContent = `${radius} ft`;
    physicsEngine.setTrackRadius(radius);
    // Update visual track representation
    corollaSim.setTrackRadius();
    caravanSim.setTrackRadius();
});

// Failure mode checkboxes
ignoreSlippingCheckbox.addEventListener('change', (e) => {
    physicsEngine.setIgnoreSlipping(e.target.checked);
});

ignoreTippingCheckbox.addEventListener('change', (e) => {
    physicsEngine.setIgnoreTipping(e.target.checked);
});

// Map slider value (0-100) to speed multiplier
// Uses exponential scale: very slow (0.01x) to very fast (50x)
function calculateSpeedMultiplier(sliderValue) {
    // Slider value: 0-100
    // Map to exponential scale: 0.01x (very slow) to 50x (as fast as computationally possible)
    const minMultiplier = 0.01; // Extremely slow
    const maxMultiplier = 50;    // As fast as computationally possible
    const midValue = 50;         // Slider value for normal speed (1.0x)
    
    // Calculate base so that midValue gives 1.0x exactly
    // 1.0 = min * base^(midValue/100)
    // base = (1.0/min)^(100/midValue) = (100)^2 = 10,000
    const base = Math.pow(1.0 / minMultiplier, 100 / midValue);
    
    // Map slider value: multiplier = min * base^(value/100)
    let multiplier = minMultiplier * Math.pow(base, sliderValue / 100);
    
    // Clamp to reasonable max (50x is already extremely fast)
    return Math.min(multiplier, maxMultiplier);
}

// Update simulation speed from slider
function updateSimSpeed() {
    const sliderValue = parseInt(simSpeedSlider.value);
    const multiplier = calculateSpeedMultiplier(sliderValue);
    
    // Update display
    if (multiplier < 1) {
        simSpeedValue.textContent = multiplier.toFixed(2) + 'x';
    } else if (multiplier < 10) {
        simSpeedValue.textContent = multiplier.toFixed(1) + 'x';
    } else {
        simSpeedValue.textContent = multiplier.toFixed(0) + 'x';
    }
    
    // Update simulations
    corollaSim.setSimSpeed(multiplier);
    caravanSim.setSimSpeed(multiplier);
}

// Slider event listener
simSpeedSlider.addEventListener('input', updateSimSpeed);

// Initialize speed (default to middle: 50 = ~1.0x)
updateSimSpeed();

startBtn.addEventListener('click', async () => {
    if (corollaSim.isRunning || caravanSim.isRunning) {
        return;
    }
    
    startBtn.disabled = true;
    startBtn.textContent = 'Running...';
    
    corollaStatusDisplay.textContent = 'Running';
    corollaStatusDisplay.className = 'status-running';
    caravanStatusDisplay.textContent = 'Running';
    caravanStatusDisplay.className = 'status-running';
    
    const handleProgress = (vehicle, speed) => {
        currentSpeedDisplay.textContent = `Current test speed: ${speed.toFixed(1)} mph`;
        if (vehicle === 'corolla') {
            corollaSpeedDisplay.textContent = speed.toFixed(1);
        } else {
            caravanSpeedDisplay.textContent = speed.toFixed(1);
        }
    };
    
    try {
        // Get speed step value from input (allow decimals)
        const speedStep = parseFloat(speedStepInput.value) || 1;
        
        // Synchronized run: test both vehicles at the exact same speeds simultaneously
        const startSpeed = 10;
        const maxSpeed = 150;
        const animationDuration = 5000; // 5 seconds per speed increment
        
        let currentSpeed = startSpeed;
        let corollaResult = null;
        let caravanResult = null;
        let corollaFailed = false;
        let caravanFailed = false;
        
        // Reset simulations
        corollaSim.shouldStop = false;
        corollaSim.isRunning = true;
        corollaSim.hasFailed = false;
        caravanSim.shouldStop = false;
        caravanSim.isRunning = true;
        caravanSim.hasFailed = false;
        
        // Test speeds synchronously - both vehicles test the exact same speed at the same time
        while (currentSpeed <= maxSpeed && (!corollaFailed || !caravanFailed)) {
            // Test both vehicles at the same speed simultaneously
            const [corollaTest, caravanTest] = await Promise.all([
                corollaSim.testSpeed(currentSpeed, animationDuration, 
                    (speed) => handleProgress('corolla', speed)),
                caravanSim.testSpeed(currentSpeed, animationDuration,
                    (speed) => handleProgress('caravan', speed))
            ]);
            
            // Store results for this speed
            if (!corollaFailed) {
                if (corollaTest.hasFailed) {
                    corollaFailed = true;
                    corollaResult = corollaTest;
                } else {
                    corollaResult = corollaTest; // Store successful completion
                }
            }
            
            if (!caravanFailed) {
                if (caravanTest.hasFailed) {
                    caravanFailed = true;
                    caravanResult = caravanTest;
                } else {
                    caravanResult = caravanTest; // Store successful completion
                }
            }
            
            // If both failed at this speed, we're done
            if (corollaFailed && caravanFailed) {
                break;
            }
            
            // If one failed, the other has already completed this speed (tested simultaneously)
            // So we're done - the winner has proven it can handle the speed the loser failed at
            if ((corollaFailed || caravanFailed) && corollaResult && caravanResult) {
                break;
            }
            
            currentSpeed += speedStep;
        }
        
        // Ensure we have results
        if (!corollaResult) {
            corollaResult = {
                hasFailed: false,
                failureType: null,
                speed: Math.max(startSpeed, currentSpeed - speedStep),
                failureAnalysis: corollaSim.lastFailureAnalysis
            };
        }
        
        if (!caravanResult) {
            caravanResult = {
                hasFailed: false,
                failureType: null,
                speed: Math.max(startSpeed, currentSpeed - speedStep),
                failureAnalysis: caravanSim.lastFailureAnalysis
            };
        }
        
        corollaSim.isRunning = false;
        caravanSim.isRunning = false;
        
        // Determine winner - audit all cases
    let winner = null;
        
        // Debug: Log failure states
        console.log('Winner determination:', {
            celicaFailed: corollaResult.hasFailed,
            celicaSpeed: corollaResult.speed,
            celicaFailureType: corollaResult.failureType,
            caravanFailed: caravanResult.hasFailed,
            caravanSpeed: caravanResult.speed,
            caravanFailureType: caravanResult.failureType
        });
        
        // Case 1: Both failed
    if (corollaResult.hasFailed && caravanResult.hasFailed) {
            // Check if they failed at the same speed (within 0.1 mph tolerance for floating point)
            const speedDiff = Math.abs(corollaResult.speed - caravanResult.speed);
            if (speedDiff < 0.1) {
                // Same speed - tie (both failed at same speed)
                winner = 'Tie!';
                console.log('Tie detected: Both failed at same speed');
            } else {
                // Winner is the one that lasted longer (higher speed)
        if (corollaResult.speed > caravanResult.speed) {
                    winner = 'Toyota Celica';
                } else {
                    winner = 'Dodge Caravan';
                }
                console.log(`Winner: ${winner} (failed at higher speed)`);
            }
        }
        // Case 2: Celica failed, Caravan did not (Caravan wins)
        else if (corollaResult.hasFailed && !caravanResult.hasFailed) {
            winner = 'Dodge Caravan';
        }
        // Case 3: Caravan failed, Celica did not (Celica wins)
        else if (!corollaResult.hasFailed && caravanResult.hasFailed) {
            winner = 'Toyota Celica';
        }
        // Case 4: Neither failed (both completed successfully)
        else {
        winner = 'Both vehicles completed successfully!';
    }
    
    // Update status displays
    if (corollaResult.hasFailed) {
            if (winner === 'Tie!') {
                corollaStatusDisplay.textContent = `Failed: ${corollaResult.failureType} (Tie)`;
            } else if (winner === 'Toyota Celica') {
                corollaStatusDisplay.textContent = 'Winner!';
                corollaStatusDisplay.className = 'status-winner';
            } else {
        corollaStatusDisplay.textContent = `Failed: ${corollaResult.failureType}`;
        corollaStatusDisplay.className = 'status-failed';
            }
        } else {
            if (winner === 'Dodge Caravan') {
                corollaStatusDisplay.textContent = 'Winner!';
                corollaStatusDisplay.className = 'status-winner';
    } else {
        corollaStatusDisplay.textContent = 'Completed';
        corollaStatusDisplay.className = 'status-ready';
            }
    }
    
    if (caravanResult.hasFailed) {
            if (winner === 'Tie!') {
                caravanStatusDisplay.textContent = `Failed: ${caravanResult.failureType} (Tie)`;
            } else if (winner === 'Dodge Caravan') {
                caravanStatusDisplay.textContent = 'Winner!';
                caravanStatusDisplay.className = 'status-winner';
            } else {
        caravanStatusDisplay.textContent = `Failed: ${caravanResult.failureType}`;
        caravanStatusDisplay.className = 'status-failed';
            }
        } else {
            if (winner === 'Toyota Celica') {
                caravanStatusDisplay.textContent = 'Winner!';
                caravanStatusDisplay.className = 'status-winner';
    } else {
        caravanStatusDisplay.textContent = 'Completed';
        caravanStatusDisplay.className = 'status-ready';
            }
        }
    
        // Analysis text (use innerHTML to render math formatting)
        corollaAnalysis.innerHTML = buildVehicleAnalysis('Toyota Celica', corollaResult, VEHICLES.corolla, caravanResult, VEHICLES.caravan);
        caravanAnalysis.innerHTML = buildVehicleAnalysis('Dodge Caravan', caravanResult, VEHICLES.caravan, corollaResult, VEHICLES.corolla);
        winnerSummary.innerHTML = buildWinnerSummary(winner, corollaResult, caravanResult, VEHICLES.corolla, VEHICLES.caravan);
    
    corollaSpeedDisplay.textContent = corollaResult.speed.toFixed(1);
    caravanSpeedDisplay.textContent = caravanResult.speed.toFixed(1);
    
        // Launch fireworks for winner (only if there's a single winner, not tie or both)
        if (winner && winner !== 'Tie!' && !winner.includes('Both')) {
        fireworks.launch(winner);
    }
    } catch (error) {
        console.error('Simulation error:', error);
    } finally {
        // Always re-enable start button, even if simulation was stopped
    startBtn.disabled = false;
    startBtn.textContent = 'Start Simulation';
    }
});

resetBtn.addEventListener('click', () => {
    // Stop any running simulations
    corollaSim.reset();
    caravanSim.reset();
    
    // Re-enable start button in case it was disabled
    startBtn.disabled = false;
    startBtn.textContent = 'Start Simulation';
    
    // Reset displays
    corollaSpeedDisplay.textContent = '0';
    corollaStatusDisplay.textContent = 'Ready';
    corollaStatusDisplay.className = 'status-ready';
    caravanSpeedDisplay.textContent = '0';
    caravanStatusDisplay.textContent = 'Ready';
    caravanStatusDisplay.className = 'status-ready';
    document.getElementById('fireworks-container').innerHTML = '';
    corollaAnalysis.textContent = 'Adjust angle and friction, then start to see how the Celica handles the turn.';
    caravanAnalysis.textContent = 'Adjust angle and friction, then start to see how the Caravan handles the turn.';
    winnerSummary.textContent = 'Run the simulation to see which vehicle wins and why.';
    currentSpeedDisplay.textContent = 'Current test speed: 0 mph';
});

// Initialize displays
corollaSpeedDisplay.textContent = '0';
caravanSpeedDisplay.textContent = '0';

function buildVehicleAnalysis(name, result, vehicle, opponentResult, opponentVehicle) {
    let analysis = '';
    
    // Vehicle specifications section
    analysis += `<div class="vehicle-specs-section">`;
    analysis += `<strong>Vehicle Specifications:</strong><br>`;
    analysis += `&nbsp;&nbsp;Weight: <code>${vehicle.weight.toLocaleString()} lbs</code><br>`;
    analysis += `&nbsp;&nbsp;Center of Mass: <code>${vehicle.centerOfMassHeight}"</code><br>`;
    analysis += `&nbsp;&nbsp;Wheelbase: <code>${vehicle.wheelbase}"</code><br>`;
    analysis += `&nbsp;&nbsp;Track Width: <code>${vehicle.frontTrack}" / ${vehicle.rearTrack}"</code><br>`;
    analysis += `&nbsp;&nbsp;Drive Type: <code>${vehicle.driveType}</code><br>`;
    analysis += `</div><br>`;
    
    if (!result.hasFailed) {
        analysis += `<div class="success-message">`;
        analysis += `<strong>✓ ${name} completed the turn successfully.</strong><br>`;
        analysis += `Top tested speed: <code>${result.speed.toFixed(1)} mph</code><br><br>`;
        
        // Show why it succeeded
        if (result.failureAnalysis) {
            const analysisData = result.failureAnalysis;
            const spinOut = analysisData.spinOut;
            const rollover = analysisData.rollover;
            
            analysis += `<div class="math-details">`;
            analysis += `<strong>Analysis at ${result.speed.toFixed(1)} mph:</strong><br>`;
            analysis += `Turn Radius: <code>${spinOut.turnRadius.toFixed(2)} ft</code><br>`;
            analysis += `Lateral Acceleration Required: <code>${spinOut.lateralAccel.toFixed(2)} ft/s²</code><br><br>`;
            
            analysis += `<div class="passed-check">`;
            analysis += `<strong>Spin-out Check (PASSED):</strong><br>`;
            analysis += `&nbsp;&nbsp;Required: <code>${spinOut.lateralAccel.toFixed(2)} ft/s²</code><br>`;
            analysis += `&nbsp;&nbsp;Limit: <code>${spinOut.limit.toFixed(2)} ft/s²</code><br>`;
            analysis += `&nbsp;&nbsp;Safety Margin: <code class="passed">+${spinOut.margin.toFixed(2)} ft/s²</code><br>`;
            analysis += `</div><br>`;
            
            analysis += `<div class="passed-check">`;
            analysis += `<strong>Rollover Check (PASSED):</strong><br>`;
            analysis += `&nbsp;&nbsp;Required: <code>${rollover.lateralAccel.toFixed(2)} ft/s²</code><br>`;
            analysis += `&nbsp;&nbsp;Limit: <code>${rollover.limit.toFixed(2)} ft/s²</code><br>`;
            analysis += `&nbsp;&nbsp;Safety Margin: <code class="passed">+${rollover.margin.toFixed(2)} ft/s²</code><br>`;
            analysis += `&nbsp;&nbsp;SSF: <code>${rollover.SSF.toFixed(3)}</code>`;
            analysis += `</div>`;
            analysis += `</div>`;
        }
        analysis += `</div>`;
        
        return analysis;
    }
    
    // Failure case - much more detailed
    const failure = result.failureType === 'spin-out' ? 'lost grip (spin-out)' : 'rolled over (stability limit)';
    analysis += `<div class="failure-message">`;
    analysis += `<strong>✗ ${name} ${failure} at ${result.speed.toFixed(1)} mph.</strong><br><br>`;
    analysis += `</div>`;
    
    // Show detailed math if failure analysis is available
    if (result.failureAnalysis) {
        const analysisData = result.failureAnalysis;
        const spinOut = analysisData.spinOut;
        const rollover = analysisData.rollover;
        
        analysis += `<div class="math-details">`;
        analysis += `<strong>Detailed Failure Analysis at ${result.speed.toFixed(1)} mph:</strong><br><br>`;
        
        // Turn geometry
        const speedFPS = result.speed * (5280 / 3600);
        analysis += `<div class="calculation-section">`;
        analysis += `<strong>Turn Geometry:</strong><br>`;
        analysis += `&nbsp;&nbsp;Track Radius: <code>R = ${spinOut.turnRadius.toFixed(2)} ft</code> (fixed road property)<br>`;
        analysis += `&nbsp;&nbsp;Speed: <code>${result.speed.toFixed(1)} mph = ${speedFPS.toFixed(2)} ft/s</code><br>`;
        analysis += `&nbsp;&nbsp;Lateral Accel: <code>a = v²/R = ${speedFPS.toFixed(2)}² / ${spinOut.turnRadius.toFixed(2)} = ${spinOut.lateralAccel.toFixed(2)} ft/s²</code><br>`;
        analysis += `</div><br>`;
        
        if (result.failureType === 'spin-out') {
            analysis += `<div class="failure-threshold">`;
            analysis += `<strong>SPIN-OUT THRESHOLD EXCEEDED:</strong><br>`;
            analysis += `&nbsp;&nbsp;Required Acceleration: <code>${spinOut.lateralAccel.toFixed(2)} ft/s²</code><br>`;
            analysis += `&nbsp;&nbsp;Friction Limit: <code>μ × g = ${spinOut.limit.toFixed(2)} ft/s²</code><br>`;
            analysis += `&nbsp;&nbsp;Margin: <code class="failed">${spinOut.margin.toFixed(2)} ft/s²</code> (EXCEEDED BY ${Math.abs(spinOut.margin).toFixed(2)} ft/s²)<br><br>`;
            analysis += `<strong>Why this vehicle failed:</strong><br>`;
            analysis += `&nbsp;&nbsp;• Weight: ${vehicle.weight} lbs → grip factor: ${Math.sqrt(Math.min(vehicle.weight / 3000, 1.5)).toFixed(3)}<br>`;
            analysis += `&nbsp;&nbsp;• Drive type: ${vehicle.driveType} → factor: ${vehicle.driveType === 'FWD' ? '1.05' : '0.98'}<br>`;
            analysis += `&nbsp;&nbsp;• Combined limit: ${spinOut.limit.toFixed(2)} ft/s² was insufficient<br>`;
            analysis += `</div><br>`;
            
            analysis += `<div class="passed-check">`;
            analysis += `<strong>Rollover Check (PASSED):</strong><br>`;
            analysis += `&nbsp;&nbsp;Required: <code>${rollover.lateralAccel.toFixed(2)} ft/s²</code><br>`;
            analysis += `&nbsp;&nbsp;Rollover Limit: <code>SSF × g = ${rollover.limit.toFixed(2)} ft/s²</code><br>`;
            analysis += `&nbsp;&nbsp;SSF: <code>track/(2×CoM) = ${rollover.SSF.toFixed(3)}</code><br>`;
            analysis += `&nbsp;&nbsp;Margin: <code class="passed">+${rollover.margin.toFixed(2)} ft/s²</code> (SAFE)<br>`;
            analysis += `</div>`;
        } else {
            analysis += `<div class="passed-check">`;
            analysis += `<strong>Spin-out Check (PASSED):</strong><br>`;
            analysis += `&nbsp;&nbsp;Required: <code>${spinOut.lateralAccel.toFixed(2)} ft/s²</code><br>`;
            analysis += `&nbsp;&nbsp;Friction Limit: <code>${spinOut.limit.toFixed(2)} ft/s²</code><br>`;
            analysis += `&nbsp;&nbsp;Margin: <code class="passed">+${spinOut.margin.toFixed(2)} ft/s²</code> (SAFE)<br>`;
            analysis += `</div><br>`;
            
            analysis += `<div class="failure-threshold">`;
            analysis += `<strong>ROLLOVER THRESHOLD EXCEEDED:</strong><br>`;
            analysis += `&nbsp;&nbsp;Required Acceleration: <code>${rollover.lateralAccel.toFixed(2)} ft/s²</code><br>`;
            analysis += `&nbsp;&nbsp;Rollover Limit: <code>SSF × g = ${rollover.limit.toFixed(2)} ft/s²</code><br>`;
            analysis += `&nbsp;&nbsp;Margin: <code class="failed">${rollover.margin.toFixed(2)} ft/s²</code> (EXCEEDED BY ${Math.abs(rollover.margin).toFixed(2)} ft/s²)<br><br>`;
            analysis += `<strong>Why this vehicle failed:</strong><br>`;
            const avgTrack = (vehicle.frontTrack + vehicle.rearTrack) / 2;
            analysis += `&nbsp;&nbsp;• Track Width: ${avgTrack.toFixed(1)}" (average)<br>`;
            analysis += `&nbsp;&nbsp;• Center of Mass: ${vehicle.centerOfMassHeight}" high<br>`;
            analysis += `&nbsp;&nbsp;• SSF = ${avgTrack.toFixed(1)}" / (2 × ${vehicle.centerOfMassHeight}") = ${rollover.SSF.toFixed(3)}<br>`;
            analysis += `&nbsp;&nbsp;• Lower SSF means less stable → higher CoM or narrower track<br>`;
            analysis += `&nbsp;&nbsp;• Rollover limit ${rollover.limit.toFixed(2)} ft/s² was insufficient<br>`;
            analysis += `</div>`;
        }
        analysis += `</div>`;
        
        // Comparison with opponent
        if (opponentResult && opponentResult.failureAnalysis && opponentVehicle) {
            analysis += `<br><div class="comparison-section">`;
            analysis += `<strong>Comparison with ${opponentVehicle.name}:</strong><br>`;
            
            const opponentSpinOut = opponentResult.failureAnalysis.spinOut;
            const opponentRollover = opponentResult.failureAnalysis.rollover;
            
            analysis += `<table class="comparison-table">`;
            analysis += `<tr><th>Property</th><th>${name}</th><th>${opponentVehicle.name}</th><th>Difference</th></tr>`;
            analysis += `<tr><td>Weight</td><td>${vehicle.weight} lbs</td><td>${opponentVehicle.weight} lbs</td><td>${(opponentVehicle.weight - vehicle.weight)} lbs</td></tr>`;
            analysis += `<tr><td>CoM Height</td><td>${vehicle.centerOfMassHeight}"</td><td>${opponentVehicle.centerOfMassHeight}"</td><td>${(opponentVehicle.centerOfMassHeight - vehicle.centerOfMassHeight)}"</td></tr>`;
            analysis += `<tr><td>Wheelbase</td><td>${vehicle.wheelbase}"</td><td>${opponentVehicle.wheelbase}"</td><td>${(opponentVehicle.wheelbase - vehicle.wheelbase)}"</td></tr>`;
            analysis += `<tr><td>Avg Track</td><td>${((vehicle.frontTrack + vehicle.rearTrack) / 2).toFixed(1)}"</td><td>${((opponentVehicle.frontTrack + opponentVehicle.rearTrack) / 2).toFixed(1)}"</td><td>${(((opponentVehicle.frontTrack + opponentVehicle.rearTrack) / 2) - ((vehicle.frontTrack + vehicle.rearTrack) / 2)).toFixed(1)}"</td></tr>`;
            analysis += `<tr><td>Turn Radius</td><td>${spinOut.turnRadius.toFixed(2)} ft</td><td>${opponentSpinOut.turnRadius.toFixed(2)} ft</td><td>${(opponentSpinOut.turnRadius - spinOut.turnRadius).toFixed(2)} ft</td></tr>`;
            analysis += `<tr><td>Lateral Accel</td><td>${spinOut.lateralAccel.toFixed(2)} ft/s²</td><td>${opponentSpinOut.lateralAccel.toFixed(2)} ft/s²</td><td>${(opponentSpinOut.lateralAccel - spinOut.lateralAccel).toFixed(2)} ft/s²</td></tr>`;
            analysis += `<tr><td>Spin-out Limit</td><td>${spinOut.limit.toFixed(2)} ft/s²</td><td>${opponentSpinOut.limit.toFixed(2)} ft/s²</td><td>${(opponentSpinOut.limit - spinOut.limit).toFixed(2)} ft/s²</td></tr>`;
            analysis += `<tr><td>Rollover Limit</td><td>${rollover.limit.toFixed(2)} ft/s²</td><td>${opponentRollover.limit.toFixed(2)} ft/s²</td><td>${(opponentRollover.limit - rollover.limit).toFixed(2)} ft/s²</td></tr>`;
            analysis += `</table>`;
            analysis += `</div>`;
        }
    }
    
    return analysis;
}

function buildWinnerSummary(winner, corollaResult, caravanResult, celicaVehicle, caravanVehicle) {
    if (!winner) return 'Run the simulation to see which vehicle wins and why.';
    
    const celicaSpeed = corollaResult.speed.toFixed(1);
    const caravanSpeed = caravanResult.speed.toFixed(1);
    const failureSpeed = Math.min(parseFloat(celicaSpeed), parseFloat(caravanSpeed));
    
    let summary = `<div class="winner-summary-content">`;
    summary += `<h3>🏆 ${winner} Wins!</h3><br>`;
    
    // Case 1: Tie - both failed at same speed
    if (winner.includes('Tie')) {
        summary += `<p>Both vehicles failed at <strong>${celicaSpeed} mph</strong>—no clear winner.</p>`;
        if (corollaResult.failureAnalysis && caravanResult.failureAnalysis) {
            summary += `<div class="tie-analysis">`;
            summary += `<strong>Why both failed at the same speed:</strong><br>`;
            const celicaFail = corollaResult.failureType;
            const caravanFail = caravanResult.failureType;
            summary += `• Celica failed due to: <strong>${celicaFail}</strong><br>`;
            summary += `• Caravan failed due to: <strong>${caravanFail}</strong><br>`;
            summary += `Both vehicles reached their respective failure thresholds simultaneously.`;
            summary += `</div>`;
        }
        summary += `</div>`;
        return summary;
    }
    
    // Case 2: Both completed successfully
    if (winner.includes('Both')) {
        summary += `<p>Both vehicles completed successfully through the tested speed range (up to <strong>${Math.max(celicaSpeed, caravanSpeed)} mph</strong>).</p>`;
        summary += `<p>Neither vehicle exceeded its failure thresholds at any tested speed.</p>`;
        summary += `</div>`;
        return summary;
    }
    
    // Case 3: One vehicle failed, other wins
    if (corollaResult.hasFailed && !caravanResult.hasFailed) {
        summary += `<p><strong>Dodge Caravan</strong> wins! Celica failed at <strong>${celicaSpeed} mph</strong>, while Caravan completed successfully at <strong>${caravanSpeed} mph</strong>.</p><br>`;
        
        summary += `<div class="detailed-explanation">`;
        summary += `<strong>Why Caravan Won:</strong><br><br>`;
        
        if (corollaResult.failureAnalysis && caravanResult.failureAnalysis) {
            const celicaFail = corollaResult.failureAnalysis;
            const caravanPass = caravanResult.failureAnalysis;
            
            summary += `<strong>At ${celicaSpeed} mph (failure speed):</strong><br>`;
            summary += `<table class="comparison-table">`;
            summary += `<tr><th>Check</th><th>Celica</th><th>Caravan</th><th>Result</th></tr>`;
            
            // Spin-out comparison
            const celicaSpinMargin = celicaFail.spinOut.margin;
            const caravanSpinMargin = caravanPass.spinOut.margin;
            summary += `<tr><td>Spin-out</td>`;
            summary += `<td>Margin: <code class="${celicaSpinMargin < 0 ? 'failed' : 'passed'}">${celicaSpinMargin.toFixed(2)} ft/s²</code></td>`;
            summary += `<td>Margin: <code class="${caravanSpinMargin < 0 ? 'failed' : 'passed'}">${caravanSpinMargin.toFixed(2)} ft/s²</code></td>`;
            summary += `<td>${celicaSpinMargin < 0 ? 'FAILED' : 'PASSED'} vs ${caravanSpinMargin < 0 ? 'FAILED' : 'PASSED'}</td></tr>`;
            
            // Rollover comparison
            const celicaRollMargin = celicaFail.rollover.margin;
            const caravanRollMargin = caravanPass.rollover.margin;
            summary += `<tr><td>Rollover</td>`;
            summary += `<td>Margin: <code class="${celicaRollMargin < 0 ? 'failed' : 'passed'}">${celicaRollMargin.toFixed(2)} ft/s²</code></td>`;
            summary += `<td>Margin: <code class="${caravanRollMargin < 0 ? 'failed' : 'passed'}">${caravanRollMargin.toFixed(2)} ft/s²</code></td>`;
            summary += `<td>${celicaRollMargin < 0 ? 'FAILED' : 'PASSED'} vs ${caravanRollMargin < 0 ? 'FAILED' : 'PASSED'}</td></tr>`;
            summary += `</table><br>`;
            
            // Key differences
            summary += `<strong>Key Differences That Led to Victory:</strong><br>`;
            if (corollaResult.failureType === 'spin-out') {
                summary += `• <strong>Weight Advantage:</strong> Caravan (${caravanVehicle.weight} lbs) vs Celica (${celicaVehicle.weight} lbs)<br>`;
                summary += `&nbsp;&nbsp;Heavier vehicle = larger tire contact patch = better grip<br>`;
                summary += `• <strong>Spin-out Limit:</strong> Caravan ${caravanPass.spinOut.limit.toFixed(2)} ft/s² vs Celica ${celicaFail.spinOut.limit.toFixed(2)} ft/s²<br>`;
                summary += `&nbsp;&nbsp;Caravan's higher limit allowed it to pass this speed<br>`;
            } else {
                summary += `• <strong>Stability Advantage:</strong> Caravan's SSF = ${caravanPass.rollover.SSF.toFixed(3)} vs Celica's SSF = ${celicaFail.rollover.SSF.toFixed(3)}<br>`;
                summary += `&nbsp;&nbsp;Caravan: Track ${((caravanVehicle.frontTrack + caravanVehicle.rearTrack) / 2).toFixed(1)}" / CoM ${caravanVehicle.centerOfMassHeight}"<br>`;
                summary += `&nbsp;&nbsp;Celica: Track ${((celicaVehicle.frontTrack + celicaVehicle.rearTrack) / 2).toFixed(1)}" / CoM ${celicaVehicle.centerOfMassHeight}"<br>`;
                summary += `&nbsp;&nbsp;Caravan's better SSF gave it higher rollover resistance<br>`;
            }
        }
        summary += `</div>`;
    } else if (!corollaResult.hasFailed && caravanResult.hasFailed) {
        summary += `<p><strong>Toyota Celica</strong> wins! Caravan failed at <strong>${caravanSpeed} mph</strong>, while Celica completed successfully at <strong>${celicaSpeed} mph</strong>.</p><br>`;
        
        summary += `<div class="detailed-explanation">`;
        summary += `<strong>Why Celica Won:</strong><br><br>`;
        
        if (corollaResult.failureAnalysis && caravanResult.failureAnalysis) {
            const celicaPass = corollaResult.failureAnalysis;
            const caravanFail = caravanResult.failureAnalysis;
            
            summary += `<strong>At ${caravanSpeed} mph (failure speed):</strong><br>`;
            summary += `<table class="comparison-table">`;
            summary += `<tr><th>Check</th><th>Celica</th><th>Caravan</th><th>Result</th></tr>`;
            
            // Spin-out comparison
            const celicaSpinMargin = celicaPass.spinOut.margin;
            const caravanSpinMargin = caravanFail.spinOut.margin;
            summary += `<tr><td>Spin-out</td>`;
            summary += `<td>Margin: <code class="${celicaSpinMargin < 0 ? 'failed' : 'passed'}">${celicaSpinMargin.toFixed(2)} ft/s²</code></td>`;
            summary += `<td>Margin: <code class="${caravanSpinMargin < 0 ? 'failed' : 'passed'}">${caravanSpinMargin.toFixed(2)} ft/s²</code></td>`;
            summary += `<td>${celicaSpinMargin < 0 ? 'FAILED' : 'PASSED'} vs ${caravanSpinMargin < 0 ? 'FAILED' : 'PASSED'}</td></tr>`;
            
            // Rollover comparison
            const celicaRollMargin = celicaPass.rollover.margin;
            const caravanRollMargin = caravanFail.rollover.margin;
            summary += `<tr><td>Rollover</td>`;
            summary += `<td>Margin: <code class="${celicaRollMargin < 0 ? 'failed' : 'passed'}">${celicaRollMargin.toFixed(2)} ft/s²</code></td>`;
            summary += `<td>Margin: <code class="${caravanRollMargin < 0 ? 'failed' : 'passed'}">${caravanRollMargin.toFixed(2)} ft/s²</code></td>`;
            summary += `<td>${celicaRollMargin < 0 ? 'FAILED' : 'PASSED'} vs ${caravanRollMargin < 0 ? 'FAILED' : 'PASSED'}</td></tr>`;
            summary += `</table><br>`;
            
            // Key differences
            summary += `<strong>Key Differences That Led to Victory:</strong><br>`;
            if (caravanResult.failureType === 'spin-out') {
                summary += `• <strong>Lower Weight Advantage:</strong> Celica (${celicaVehicle.weight} lbs) vs Caravan (${caravanVehicle.weight} lbs)<br>`;
                summary += `&nbsp;&nbsp;Lighter vehicle = less lateral force required = easier to maintain grip<br>`;
                summary += `• <strong>Turn Radius:</strong> Celica ${celicaPass.spinOut.turnRadius.toFixed(2)} ft vs Caravan ${caravanFail.spinOut.turnRadius.toFixed(2)} ft<br>`;
                summary += `&nbsp;&nbsp;Shorter wheelbase = tighter turn = less lateral acceleration needed<br>`;
            } else {
                summary += `• <strong>Stability Advantage:</strong> Celica's SSF = ${celicaPass.rollover.SSF.toFixed(3)} vs Caravan's SSF = ${caravanFail.rollover.SSF.toFixed(3)}<br>`;
                summary += `&nbsp;&nbsp;Celica: Lower CoM (${celicaVehicle.centerOfMassHeight}") = better stability<br>`;
                summary += `&nbsp;&nbsp;Caravan: Higher CoM (${caravanVehicle.centerOfMassHeight}") = less stable<br>`;
                summary += `&nbsp;&nbsp;Celica's better SSF gave it higher rollover resistance<br>`;
            }
        }
        summary += `</div>`;
    } else {
        // Case 4: Both failed - winner is the one that lasted longer
        summary += `<p><strong>${winner}</strong> wins by sustaining a higher speed before failure: Celica <strong>${celicaSpeed} mph</strong> vs Caravan <strong>${caravanSpeed} mph</strong>.</p><br>`;
        
        if (corollaResult.failureAnalysis && caravanResult.failureAnalysis) {
            summary += `<div class="detailed-explanation">`;
            summary += `<strong>Why ${winner} Lasted Longer:</strong><br><br>`;
            
            const higherSpeed = parseFloat(celicaSpeed) > parseFloat(caravanSpeed) ? corollaResult : caravanResult;
            const lowerSpeed = parseFloat(celicaSpeed) > parseFloat(caravanSpeed) ? caravanResult : corollaResult;
            const higherVehicle = parseFloat(celicaSpeed) > parseFloat(caravanSpeed) ? celicaVehicle : caravanVehicle;
            const lowerVehicle = parseFloat(celicaSpeed) > parseFloat(caravanSpeed) ? caravanVehicle : celicaVehicle;
            
            summary += `The winner reached <strong>${Math.max(celicaSpeed, caravanSpeed)} mph</strong> before failing, while the loser failed at <strong>${Math.min(celicaSpeed, caravanSpeed)} mph</strong>.<br><br>`;
            summary += `This ${Math.abs(parseFloat(celicaSpeed) - parseFloat(caravanSpeed)).toFixed(1)} mph difference demonstrates the winner's superior handling characteristics.`;
            summary += `</div>`;
        }
    }
    
    summary += `</div>`;
    return summary;
}

