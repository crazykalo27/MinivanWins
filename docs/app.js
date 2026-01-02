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
        
        // Case 1: Both failed
        if (corollaResult.hasFailed && caravanResult.hasFailed) {
            // Winner is the one that lasted longer (higher speed)
            if (corollaResult.speed > caravanResult.speed) {
                winner = 'Toyota Corolla';
            } else if (caravanResult.speed > corollaResult.speed) {
                winner = 'Dodge Caravan';
            } else {
                // Same speed - tie
                winner = 'Tie!';
            }
        }
        // Case 2: Corolla failed, Caravan did not (Caravan wins)
        else if (corollaResult.hasFailed && !caravanResult.hasFailed) {
            winner = 'Dodge Caravan';
        }
        // Case 3: Caravan failed, Corolla did not (Corolla wins)
        else if (!corollaResult.hasFailed && caravanResult.hasFailed) {
            winner = 'Toyota Corolla';
        }
        // Case 4: Neither failed (both completed successfully)
        else {
            winner = 'Both vehicles completed successfully!';
        }
        
        // Update status displays
        if (corollaResult.hasFailed) {
            corollaStatusDisplay.textContent = `Failed: ${corollaResult.failureType}`;
            corollaStatusDisplay.className = 'status-failed';
        } else if (caravanResult.hasFailed) {
            // Corolla wins because caravan failed
            corollaStatusDisplay.textContent = 'Winner!';
            corollaStatusDisplay.className = 'status-ready';
        } else {
            corollaStatusDisplay.textContent = 'Completed';
            corollaStatusDisplay.className = 'status-ready';
        }
        
        if (caravanResult.hasFailed) {
            caravanStatusDisplay.textContent = `Failed: ${caravanResult.failureType}`;
            caravanStatusDisplay.className = 'status-failed';
        } else if (corollaResult.hasFailed) {
            // Caravan wins because corolla failed
            caravanStatusDisplay.textContent = 'Winner!';
            caravanStatusDisplay.className = 'status-ready';
        } else {
            caravanStatusDisplay.textContent = 'Completed';
            caravanStatusDisplay.className = 'status-ready';
        }
        
        // Analysis text (use innerHTML to render math formatting)
        corollaAnalysis.innerHTML = buildVehicleAnalysis('Toyota Corolla', corollaResult);
        caravanAnalysis.innerHTML = buildVehicleAnalysis('Dodge Caravan', caravanResult);
        winnerSummary.textContent = buildWinnerSummary(winner, corollaResult, caravanResult);
        
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
    corollaAnalysis.textContent = 'Adjust angle and friction, then start to see how the Corolla handles the turn.';
    caravanAnalysis.textContent = 'Adjust angle and friction, then start to see how the Caravan handles the turn.';
    winnerSummary.textContent = 'Run the simulation to see which vehicle wins and why.';
    currentSpeedDisplay.textContent = 'Current test speed: 0 mph';
});

// Initialize displays
corollaSpeedDisplay.textContent = '0';
caravanSpeedDisplay.textContent = '0';

function buildVehicleAnalysis(name, result) {
    if (!result.hasFailed) {
        return `${name} completed the turn. Top tested speed: ${result.speed.toFixed(1)} mph.`;
    }
    
    const failure = result.failureType === 'spin-out' ? 'lost grip (spin-out)' : 'rolled over (stability limit)';
    let analysis = `<strong>${name} ${failure} at ${result.speed.toFixed(1)} mph.</strong><br><br>`;
    
    // Show detailed math if failure analysis is available
    if (result.failureAnalysis) {
        const analysisData = result.failureAnalysis;
        const spinOut = analysisData.spinOut;
        const rollover = analysisData.rollover;
        
        analysis += `<div class="math-details">`;
        analysis += `<strong>Failure Analysis at ${result.speed.toFixed(1)} mph:</strong><br>`;
        analysis += `Turn Radius: <code>${spinOut.turnRadius.toFixed(2)} ft</code><br>`;
        analysis += `Lateral Acceleration: <code>${spinOut.lateralAccel.toFixed(2)} ft/s²</code><br><br>`;
        
        if (result.failureType === 'spin-out') {
            analysis += `<div class="failure-threshold">`;
            analysis += `<strong>SPIN-OUT THRESHOLD EXCEEDED:</strong><br>`;
            analysis += `&nbsp;&nbsp;Required: <code>${spinOut.lateralAccel.toFixed(2)} ft/s²</code><br>`;
            analysis += `&nbsp;&nbsp;Limit: <code>${spinOut.limit.toFixed(2)} ft/s²</code><br>`;
            analysis += `&nbsp;&nbsp;Margin: <code class="failed">${spinOut.margin.toFixed(2)} ft/s²</code> (FAILED)<br>`;
            analysis += `</div><br>`;
            analysis += `<div class="passed-check">`;
            analysis += `Rollover Check:<br>`;
            analysis += `&nbsp;&nbsp;Required: <code>${rollover.lateralAccel.toFixed(2)} ft/s²</code><br>`;
            analysis += `&nbsp;&nbsp;Limit: <code>${rollover.limit.toFixed(2)} ft/s²</code><br>`;
            analysis += `&nbsp;&nbsp;Margin: <code class="passed">${rollover.margin.toFixed(2)} ft/s²</code> (PASSED)`;
            analysis += `</div>`;
        } else {
            analysis += `<div class="passed-check">`;
            analysis += `Spin-out Check:<br>`;
            analysis += `&nbsp;&nbsp;Required: <code>${spinOut.lateralAccel.toFixed(2)} ft/s²</code><br>`;
            analysis += `&nbsp;&nbsp;Limit: <code>${spinOut.limit.toFixed(2)} ft/s²</code><br>`;
            analysis += `&nbsp;&nbsp;Margin: <code class="passed">${spinOut.margin.toFixed(2)} ft/s²</code> (PASSED)<br>`;
            analysis += `</div><br>`;
            analysis += `<div class="failure-threshold">`;
            analysis += `<strong>ROLLOVER THRESHOLD EXCEEDED:</strong><br>`;
            analysis += `&nbsp;&nbsp;Required: <code>${rollover.lateralAccel.toFixed(2)} ft/s²</code><br>`;
            analysis += `&nbsp;&nbsp;Limit: <code>${rollover.limit.toFixed(2)} ft/s²</code><br>`;
            analysis += `&nbsp;&nbsp;Margin: <code class="failed">${rollover.margin.toFixed(2)} ft/s²</code> (FAILED)<br>`;
            analysis += `&nbsp;&nbsp;SSF: <code>${rollover.SSF.toFixed(3)}</code>`;
            analysis += `</div>`;
        }
        analysis += `</div>`;
    }
    
    return analysis;
}

function buildWinnerSummary(winner, corollaResult, caravanResult) {
    if (!winner) return 'Run the simulation to see which vehicle wins and why.';
    
    const corollaSpeed = corollaResult.speed.toFixed(1);
    const caravanSpeed = caravanResult.speed.toFixed(1);
    
    // Case 1: Tie - both failed at same speed
    if (winner.includes('Tie')) {
        return `Both vehicles failed at ${corollaSpeed} mph—no clear winner.`;
    }
    
    // Case 2: Both completed successfully
    if (winner.includes('Both')) {
        return `Both vehicles completed successfully through the tested speed range (up to ${Math.max(corollaSpeed, caravanSpeed)} mph).`;
    }
    
    // Case 3: One vehicle failed, other wins
    if (corollaResult.hasFailed && !caravanResult.hasFailed) {
        return `${winner} wins! Corolla failed at ${corollaSpeed} mph, while Caravan completed successfully at ${caravanSpeed} mph.`;
    }
    
    if (!corollaResult.hasFailed && caravanResult.hasFailed) {
        return `${winner} wins! Caravan failed at ${caravanSpeed} mph, while Corolla completed successfully at ${corollaSpeed} mph.`;
    }
    
    // Case 4: Both failed - winner is the one that lasted longer
    return `${winner} wins by sustaining a higher speed before failure: Corolla ${corollaSpeed} mph vs Caravan ${caravanSpeed} mph.`;
}

