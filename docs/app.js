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
const speedUpBtn = document.getElementById('speedUp');
const speedDownBtn = document.getElementById('speedDown');
const speedLights = document.querySelectorAll('.speed-light');
const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');

// Simulation speed level (1-6): 1=slowest, 6=fastest
let simSpeedLevel = 3; // Default to middle speed

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

// Speed lights update function
function updateSpeedLights() {
    speedLights.forEach((light, index) => {
        const level = index + 1;
        if (level <= simSpeedLevel) {
            light.classList.add('active');
        } else {
            light.classList.remove('active');
        }
    });
    // Update simulation speed multipliers
    const speedMultipliers = [0.15, 0.35, 0.6, 1.0, 2.0, 4.0]; // 1=very slow, 6=very fast
    const multiplier = speedMultipliers[simSpeedLevel - 1];
    corollaSim.setSimSpeed(multiplier);
    caravanSim.setSimSpeed(multiplier);
}

speedUpBtn.addEventListener('click', () => {
    if (simSpeedLevel < 6) {
        simSpeedLevel++;
        updateSpeedLights();
    }
});

speedDownBtn.addEventListener('click', () => {
    if (simSpeedLevel > 1) {
        simSpeedLevel--;
        updateSpeedLights();
    }
});

// Click on lights to set speed directly
speedLights.forEach((light) => {
    light.addEventListener('click', () => {
        simSpeedLevel = parseInt(light.dataset.level);
        updateSpeedLights();
    });
});

// Initialize speed lights
updateSpeedLights();

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
    
    // Get speed step value from input
    const speedStep = parseInt(speedStepInput.value) || 1;
    
    // Run both simulations simultaneously
    const [corollaResult, caravanResult] = await Promise.all([
        corollaSim.run(speedStep, 150, (speed) => handleProgress('corolla', speed)),
        caravanSim.run(speedStep, 150, (speed) => handleProgress('caravan', speed))
    ]);
    
    // Determine winner
    let winner = null;
    if (corollaResult.hasFailed && caravanResult.hasFailed) {
        // Both failed - winner is the one that lasted longer (higher speed)
        if (corollaResult.speed > caravanResult.speed) {
            winner = 'Toyota Corolla';
        } else if (caravanResult.speed > corollaResult.speed) {
            winner = 'Dodge Caravan';
        } else {
            winner = 'Tie!';
        }
    } else if (corollaResult.hasFailed) {
        winner = 'Dodge Caravan';
    } else if (caravanResult.hasFailed) {
        winner = 'Toyota Corolla';
    } else {
        winner = 'Both vehicles completed successfully!';
    }
    
    // Update status displays
    if (corollaResult.hasFailed) {
        corollaStatusDisplay.textContent = `Failed: ${corollaResult.failureType}`;
        corollaStatusDisplay.className = 'status-failed';
    } else {
        corollaStatusDisplay.textContent = 'Completed';
        corollaStatusDisplay.className = 'status-ready';
    }
    
    if (caravanResult.hasFailed) {
        caravanStatusDisplay.textContent = `Failed: ${caravanResult.failureType}`;
        caravanStatusDisplay.className = 'status-failed';
    } else {
        caravanStatusDisplay.textContent = 'Completed';
        caravanStatusDisplay.className = 'status-ready';
    }
    
    // Analysis text
    corollaAnalysis.textContent = buildVehicleAnalysis('Toyota Corolla', corollaResult);
    caravanAnalysis.textContent = buildVehicleAnalysis('Dodge Caravan', caravanResult);
    winnerSummary.textContent = buildWinnerSummary(winner, corollaResult, caravanResult);
    
    corollaSpeedDisplay.textContent = corollaResult.speed.toFixed(1);
    caravanSpeedDisplay.textContent = caravanResult.speed.toFixed(1);
    
    // Launch fireworks for winner
    if (winner && !winner.includes('Tie') && !winner.includes('Both')) {
        fireworks.launch(winner);
    }
    
    startBtn.disabled = false;
    startBtn.textContent = 'Start Simulation';
});

resetBtn.addEventListener('click', () => {
    corollaSim.reset();
    caravanSim.reset();
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
    return `${name} ${failure} at ${result.speed.toFixed(1)} mph.`;
}

function buildWinnerSummary(winner, corollaResult, caravanResult) {
    if (!winner) return 'Run the simulation to see which vehicle wins and why.';
    
    if (winner.includes('Tie')) {
        return 'Both vehicles failed at similar thresholds—no clear winner.';
    }
    
    if (winner.includes('Both')) {
        return 'Both vehicles completed successfully through the tested speed range.';
    }
    
    const corollaSpeed = corollaResult.speed.toFixed(1);
    const caravanSpeed = caravanResult.speed.toFixed(1);
    return `${winner} wins by sustaining a higher survivable speed: Corolla ${corollaSpeed} mph vs Caravan ${caravanSpeed} mph.`;
}

