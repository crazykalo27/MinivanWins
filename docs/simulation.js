class Simulation {
    constructor(canvasId, vehicleImageId, vehicleKey, physicsEngine) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.vehicleImage = document.getElementById(vehicleImageId);
        this.vehicle = VEHICLES[vehicleKey];
        this.physics = physicsEngine;
        
        this.currentSpeed = 0;
        this.turnAngle = 45;
        this.isRunning = false;
        this.hasFailed = false;
        this.failureType = null;
        this.track = [];
        this.simSpeedMultiplier = 0.6; // Default mid-speed
        this.shouldStop = false; // Flag to stop simulation early
        
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    resizeCanvas() {
        const container = this.canvas.parentElement;
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
        this.drawTrack();
    }

    setTurnAngle(angle) {
        this.turnAngle = angle;
        if (!this.isRunning) {
            this.drawTrack();
        }
    }

    setFrictionCoeff(mu) {
        this.physics.setFrictionCoeff(mu);
    }

    setSimSpeed(multiplier) {
        this.simSpeedMultiplier = multiplier;
    }

    reset() {
        // Signal to stop any running simulation
        this.shouldStop = true;
        this.isRunning = false;
        
        // Reset all state
        this.currentSpeed = 0;
        this.hasFailed = false;
        this.failureType = null;
        this.track = [];
        this.drawTrack();
        this.updateVehiclePosition(0, 0, 0);
        this.setVisualSpeed(0);
    }

    drawTrack() {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        ctx.clearRect(0, 0, width, height);
        
        // Background
        ctx.fillStyle = '#f5f5f5';
        ctx.fillRect(0, 0, width, height);
        
        // Road parameters
        const roadWidth = 120;
        const turnRadius = Math.min(width, height) * 0.2;
        const approachLength = width * 0.35;
        const exitLength = width * 0.4;
        
        // Geometry: approach horizontally from left, then single right turn (adjustable angle)
        // Turn center is positioned so the approach is horizontal and turn goes up/right
        const turnCenterX = width * 0.35;
        const turnCenterY = height * 0.6;
        
        // Approach: horizontal from left, ending at bottom of turn arc
        const approachEndX = turnCenterX;
        const approachEndY = turnCenterY + turnRadius;
        const approachStartX = approachEndX - approachLength;
        const approachStartY = approachEndY;
        
        // Turn: arc from bottom (approach direction) sweeping by turnAngle
        const turnAngleRad = (this.turnAngle * Math.PI) / 180;
        const arcStartAngle = Math.PI / 2; // bottom of circle (tangent goes right)
        const arcEndAngle = arcStartAngle - turnAngleRad; // sweep counterclockwise
        
        // Exit: continue tangent from end of arc
        const exitStartX = turnCenterX + Math.cos(arcEndAngle) * turnRadius;
        const exitStartY = turnCenterY + Math.sin(arcEndAngle) * turnRadius;
        const exitDir = arcEndAngle - Math.PI / 2; // tangent direction
        const exitEndX = exitStartX + Math.cos(exitDir) * exitLength;
        const exitEndY = exitStartY + Math.sin(exitDir) * exitLength;
        
        // Draw road using a wide stroke along the centerline for smooth joins
        ctx.save();
        ctx.strokeStyle = '#333';
        ctx.lineWidth = roadWidth;
        ctx.lineCap = 'butt';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(approachStartX, approachStartY);
        ctx.lineTo(approachEndX, approachEndY);
        ctx.arc(turnCenterX, turnCenterY, turnRadius, arcStartAngle, arcEndAngle, true);
        ctx.lineTo(exitEndX, exitEndY);
        ctx.stroke();
        ctx.restore();
        
        // Lane marking (center dashed line)
        ctx.save();
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 4;
        ctx.setLineDash([18, 12]);
        ctx.beginPath();
        ctx.moveTo(approachStartX, approachStartY);
        ctx.lineTo(approachEndX, approachEndY);
        ctx.arc(turnCenterX, turnCenterY, turnRadius, arcStartAngle, arcEndAngle, true);
        ctx.lineTo(exitEndX, exitEndY);
        ctx.stroke();
        ctx.restore();
        
        // No green track history line - removed
    }

    drawVehicleVector(x, y, heading) {
        const ctx = this.ctx;
        const size = 26;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(heading);
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-size * 0.6, 0);
        ctx.lineTo(size * 0.6, 0);
        ctx.moveTo(size * 0.6, 0);
        ctx.lineTo(size * 0.3, -8);
        ctx.moveTo(size * 0.6, 0);
        ctx.lineTo(size * 0.3, 8);
        ctx.stroke();
        ctx.restore();
    }

    setVisualSpeed(speedMPH) {
        const blurPx = Math.min(3, speedMPH / 40);
        this.vehicleImage.style.filter = `blur(${blurPx}px)`;
    }

    updateVehiclePosition(x, y, rotation) {
        const container = this.vehicleImage.parentElement;
        const rect = container.getBoundingClientRect();
        const canvasRect = this.canvas.getBoundingClientRect();
        
        // Convert canvas coordinates to container coordinates
        const relativeX = (x / this.canvas.width) * rect.width;
        const relativeY = (y / this.canvas.height) * rect.height;
        
        this.vehicleImage.style.left = `${relativeX}px`;
        this.vehicleImage.style.top = `${relativeY}px`;
        this.vehicleImage.style.transform = `translate(-50%, -50%) rotate(${rotation}deg)`;
    }

    async run(speedIncrement = 1, maxSpeed = 150, progressCb, checkOtherFailed = null) {
        // Reset stop flag at start of new simulation
        this.shouldStop = false;
        this.isRunning = true;
        this.hasFailed = false;
        this.track = [];
        
        const startSpeed = 10;
        let currentSpeed = startSpeed;
        const animationDuration = 5000; // 5 seconds per speed increment
        const frameRate = 60;
        const frameTime = 1000 / frameRate;
        
        while (currentSpeed <= maxSpeed && !this.hasFailed && !this.shouldStop) {
            if (this.shouldStop) break;
            
            // Check if the other vehicle has failed (if callback provided)
            if (checkOtherFailed && checkOtherFailed()) {
                // Other vehicle failed first - we win!
                this.shouldStop = true;
                break;
            }
            
            if (progressCb) progressCb(currentSpeed, 0);
            const analysis = this.physics.analyzeFailure(this.vehicle, currentSpeed, this.turnAngle);
            
            if (analysis.hasFailed) {
                this.hasFailed = true;
                this.failureType = analysis.failureType;
                this.currentSpeed = currentSpeed;
                this.simulateFailure(analysis);
                break;
            }
            
            // Animate vehicle through turn at this speed
            await this.animateTurn(currentSpeed, animationDuration, progressCb, checkOtherFailed);
            
            // Check again after animation in case reset was called or other vehicle failed
            if (this.shouldStop) break;
            if (checkOtherFailed && checkOtherFailed()) {
                this.shouldStop = true;
                break;
            }
            
            currentSpeed += speedIncrement;
        }
        
        // If we stopped because other vehicle failed, mark as completed (winner)
        if (this.shouldStop && !this.hasFailed && checkOtherFailed && checkOtherFailed()) {
            this.currentSpeed = currentSpeed;
        } else if (!this.hasFailed && !this.shouldStop) {
            this.currentSpeed = maxSpeed;
        }
        
        this.isRunning = false;
        this.setVisualSpeed(0);
        return {
            hasFailed: this.hasFailed,
            failureType: this.failureType,
            speed: this.currentSpeed
        };
    }

    async animateTurn(speedMPH, duration, progressCb, checkOtherFailed = null) {
        return new Promise((resolve) => {
            const startTime = Date.now();
            const width = this.canvas.width;
            const height = this.canvas.height;
            
            // Match geometry with drawTrack: horizontal approach, then right turn
            const turnRadius = Math.min(width, height) * 0.2;
            const approachLength = width * 0.35;
            const exitLength = width * 0.4;
            
            const turnCenterX = width * 0.35;
            const turnCenterY = height * 0.6;
            
            const approachEndX = turnCenterX;
            const approachEndY = turnCenterY + turnRadius;
            const approachStartX = approachEndX - approachLength;
            const approachStartY = approachEndY;
            
            const turnAngleRad = (this.turnAngle * Math.PI) / 180;
            const arcStartAngle = Math.PI / 2;
            const arcEndAngle = arcStartAngle - turnAngleRad;
            const exitDir = arcEndAngle - Math.PI / 2;
            
            const arcLength = turnRadius * turnAngleRad;
            const totalLength = approachLength + arcLength + exitLength;
            
            // Calculate progress thresholds based on actual lengths
            const approachProgress = approachLength / totalLength;
            const turnProgress = arcLength / totalLength;

            // Adjust animation duration based on speed and sim speed multiplier
            const speedFactor = Math.max(0.25, Math.min(1, 80 / speedMPH));
            // Divide by simSpeedMultiplier so higher multiplier = faster animation
            const effectiveDuration = (duration * speedFactor) / this.simSpeedMultiplier;
            this.setVisualSpeed(speedMPH);
            
            const animate = () => {
                // Check if we should stop (failed, reset, or other vehicle failed)
                if (this.hasFailed || this.shouldStop) {
                    resolve();
                    return;
                }
                
                // Check if other vehicle failed during animation
                if (checkOtherFailed && checkOtherFailed()) {
                    this.shouldStop = true;
                    resolve();
                    return;
                }
                
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / effectiveDuration, 1);
                
                // Calculate position along track
                let x, y, rotation;
                
                if (progress < approachProgress) {
                    // Approach section (horizontal from left)
                    const approachProgressLocal = progress / approachProgress;
                    x = approachStartX + approachLength * approachProgressLocal;
                    y = approachStartY;
                    rotation = 0; // facing right
                } else if (progress < approachProgress + turnProgress) {
                    // Turn section
                    const turnProgressLocal = (progress - approachProgress) / turnProgress;
                    const angle = arcStartAngle - turnAngleRad * turnProgressLocal;
                    x = turnCenterX + Math.cos(angle) * turnRadius;
                    y = turnCenterY + Math.sin(angle) * turnRadius;
                    rotation = (angle - Math.PI / 2) * 180 / Math.PI;
                } else {
                    // Exit section
                    const exitProgressLocal = (progress - approachProgress - turnProgress) / (1 - approachProgress - turnProgress);
                    const exitStartX = turnCenterX + Math.cos(arcEndAngle) * turnRadius;
                    const exitStartY = turnCenterY + Math.sin(arcEndAngle) * turnRadius;
                    x = exitStartX + Math.cos(exitDir) * exitLength * exitProgressLocal;
                    y = exitStartY + Math.sin(exitDir) * exitLength * exitProgressLocal;
                    rotation = exitDir * 180 / Math.PI;
                }
                
                // Update display (no track history recording)
                this.drawTrack();
                this.drawVehicleVector(x, y, (rotation + 90) * Math.PI / 180);
                this.updateVehiclePosition(x, y, rotation);
                if (progressCb) progressCb(speedMPH, progress);
                
                // Check if other vehicle failed before continuing animation
                const otherFailed = checkOtherFailed && checkOtherFailed();
                if (otherFailed) {
                    this.shouldStop = true;
                    resolve();
                    return;
                }
                
                if (progress < 1 && !this.hasFailed && !this.shouldStop) {
                    requestAnimationFrame(animate);
                } else {
                    resolve();
                }
            };
            
            animate();
        });
    }

    simulateFailure(analysis) {
        // Visual effect for failure
        const x = this.track.length > 0 ? this.track[this.track.length - 1].x : this.canvas.width / 2;
        const y = this.track.length > 0 ? this.track[this.track.length - 1].y : this.canvas.height / 2;
        
        if (this.failureType === 'spin-out') {
            // Spin animation
            let rotation = 0;
            const spinInterval = setInterval(() => {
                rotation += 20;
                this.updateVehiclePosition(x, y, rotation);
                if (rotation > 720) {
                    clearInterval(spinInterval);
                }
            }, 50);
        } else if (this.failureType === 'rollover') {
            // Roll animation
            let tilt = 0;
            const rollInterval = setInterval(() => {
                tilt += 5;
                this.vehicleImage.style.transform = `translate(-50%, -50%) rotate(${tilt}deg)`;
                if (tilt > 90) {
                    clearInterval(rollInterval);
                }
            }, 50);
        }
        
        // Draw failure indicator
        this.ctx.fillStyle = 'rgba(244, 67, 54, 0.3)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.fillStyle = '#f44336';
        this.ctx.font = 'bold 48px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(
            this.failureType === 'spin-out' ? 'SPIN-OUT!' : 'ROLLOVER!',
            this.canvas.width / 2,
            this.canvas.height / 2
        );
    }
}

