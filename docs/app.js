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
const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');

const corollaSpeedDisplay = document.getElementById('corollaSpeed');
const corollaStatusDisplay = document.getElementById('corollaStatus');
const caravanSpeedDisplay = document.getElementById('caravanSpeed');
const caravanStatusDisplay = document.getElementById('caravanStatus');

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
    
    // Run both simulations simultaneously
    const [corollaResult, caravanResult] = await Promise.all([
        corollaSim.run(1, 150),
        caravanSim.run(1, 150)
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
});

// Initialize displays
corollaSpeedDisplay.textContent = '0';
caravanSpeedDisplay.textContent = '0';

