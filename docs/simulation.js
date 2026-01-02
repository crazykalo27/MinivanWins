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

    reset() {
        this.currentSpeed = 0;
        this.isRunning = false;
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
        const startX = width * 0.35;
        const startY = height * 0.8;
        const straightLength = height * 0.35;
        const turnRadius = Math.min(width, height) * 0.2;
        const exitLength = width * 0.4;
        
        // Geometry: move up, then right turn (variable angle), then exit rightward
        const turnStartX = startX;
        const turnStartY = startY - straightLength;
        const turnCenterX = turnStartX + turnRadius;
        const turnCenterY = turnStartY;
        const turnAngleRad = (this.turnAngle * Math.PI) / 180;
        const startAngle = Math.PI; // start on left of center (tangent up)
        const endAngle = startAngle - turnAngleRad; // sweep anticlockwise to turn right
        const exitStartX = turnCenterX + Math.cos(endAngle) * turnRadius;
        const exitStartY = turnCenterY + Math.sin(endAngle) * turnRadius;
        const exitDir = endAngle - Math.PI / 2; // tangent direction after turn
        const exitEndX = exitStartX + Math.cos(exitDir) * exitLength;
        const exitEndY = exitStartY + Math.sin(exitDir) * exitLength;
        
        // Draw road using a wide stroke along the centerline for smooth joins
        ctx.save();
        ctx.strokeStyle = '#333';
        ctx.lineWidth = roadWidth;
        ctx.lineCap = 'butt';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(turnStartX, turnStartY);
        ctx.arc(turnCenterX, turnCenterY, turnRadius, startAngle, endAngle, true);
        ctx.lineTo(exitEndX, exitEndY);
        ctx.stroke();
        ctx.restore();
        
        // Lane marking (center dashed line)
        ctx.save();
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 4;
        ctx.setLineDash([18, 12]);
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(turnStartX, turnStartY);
        ctx.arc(turnCenterX, turnCenterY, turnRadius, startAngle, endAngle, true);
        ctx.lineTo(exitEndX, exitEndY);
        ctx.stroke();
        ctx.restore();
        
        // Draw track history
        if (this.track.length > 0) {
            ctx.strokeStyle = '#4caf50';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(this.track[0].x, this.track[0].y);
            for (let i = 1; i < this.track.length; i++) {
                ctx.lineTo(this.track[i].x, this.track[i].y);
            }
            ctx.stroke();
        }
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

    async run(speedIncrement = 1, maxSpeed = 150, progressCb) {
        this.isRunning = true;
        this.hasFailed = false;
        this.track = [];
        
        const startSpeed = 10;
        let currentSpeed = startSpeed;
        const animationDuration = 5000; // 5 seconds per speed increment
        const frameRate = 60;
        const frameTime = 1000 / frameRate;
        
        while (currentSpeed <= maxSpeed && !this.hasFailed) {
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
            await this.animateTurn(currentSpeed, animationDuration, progressCb);
            
            currentSpeed += speedIncrement;
        }
        
        if (!this.hasFailed) {
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

    async animateTurn(speedMPH, duration, progressCb) {
        return new Promise((resolve) => {
            const startTime = Date.now();
            const width = this.canvas.width;
            const height = this.canvas.height;
            
            // Match geometry with drawTrack: move up then right turn
            const startX = width * 0.35;
            const startY = height * 0.8;
            const straightLength = height * 0.35;
            const turnRadius = Math.min(width, height) * 0.2;
            const exitLength = width * 0.4;
            
            const turnStartX = startX;
            const turnStartY = startY - straightLength;
            const turnCenterX = turnStartX + turnRadius;
            const turnCenterY = turnStartY;
            const turnAngleRad = (this.turnAngle * Math.PI) / 180;
            const startAngle = Math.PI;
            const endAngle = startAngle - turnAngleRad;
            const exitDir = endAngle - Math.PI / 2;
            const arcLength = turnRadius * turnAngleRad;
            const totalLength = straightLength + arcLength + exitLength;
            
            // Calculate progress thresholds based on actual lengths
            const straightProgress = straightLength / totalLength;
            const turnProgress = arcLength / totalLength;

            // Adjust animation duration based on speed to visually feel faster
            const speedFactor = Math.max(0.25, Math.min(1, 80 / speedMPH));
            const effectiveDuration = duration * speedFactor;
            this.setVisualSpeed(speedMPH);
            
            const animate = () => {
                if (this.hasFailed) {
                    resolve();
                    return;
                }
                
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / effectiveDuration, 1);
                
                // Calculate position along track
                let x, y, rotation;
                
                if (progress < straightProgress) {
                    // Straight section
                    const straightProgressLocal = progress / straightProgress;
                    x = startX;
                    y = startY - straightLength * straightProgressLocal;
                    rotation = -90;
                } else if (progress < straightProgress + turnProgress) {
                    // Turn section
                    const turnProgressLocal = (progress - straightProgress) / turnProgress;
                    const angle = startAngle - turnAngleRad * turnProgressLocal;
                    x = turnCenterX + Math.cos(angle) * turnRadius;
                    y = turnCenterY + Math.sin(angle) * turnRadius;
                    rotation = (angle - Math.PI / 2) * 180 / Math.PI;
                } else {
                    // Exit section
                    const exitProgressLocal = (progress - straightProgress - turnProgress) / (1 - straightProgress - turnProgress);
                    const exitStartX = turnCenterX + Math.cos(endAngle) * turnRadius;
                    const exitStartY = turnCenterY + Math.sin(endAngle) * turnRadius;
                    x = exitStartX + Math.cos(exitDir) * exitLength * exitProgressLocal;
                    y = exitStartY + Math.sin(exitDir) * exitLength * exitProgressLocal;
                    rotation = (exitDir) * 180 / Math.PI;
                }
                
                // Record track position
                this.track.push({ x, y });
                if (this.track.length > 1000) {
                    this.track.shift();
                }
                
                // Update display
                this.drawTrack();
                this.drawVehicleVector(x, y, (rotation + 90) * Math.PI / 180);
                this.updateVehiclePosition(x, y, rotation);
                if (progressCb) progressCb(speedMPH, progress);
                
                if (progress < 1 && !this.hasFailed) {
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

