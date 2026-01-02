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
    }

    drawTrack() {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        ctx.clearRect(0, 0, width, height);
        
        // Draw background
        ctx.fillStyle = '#f5f5f5';
        ctx.fillRect(0, 0, width, height);
        
        // Road parameters
        const centerY = height / 2;
        const roadWidth = 120;
        const straightLength = width * 0.35;
        const turnRadius = Math.min(width * 0.25, height * 0.25);
        const exitLength = width * 0.3;
        
        // Calculate turn geometry
        const turnStartX = straightLength;
        const turnCenterX = turnStartX + turnRadius;
        const turnCenterY = centerY;
        
        // Convert turn angle to radians
        const turnAngleRad = (this.turnAngle * Math.PI) / 180;
        const startAngle = -Math.PI / 2; // Start pointing down (south)
        const endAngle = startAngle + turnAngleRad;
        
        // Calculate exit section start point (end of turn arc)
        const exitStartX = turnCenterX + Math.cos(endAngle) * turnRadius;
        const exitStartY = turnCenterY + Math.sin(endAngle) * turnRadius;
        
        // Calculate perpendicular vector for road width offset
        // For angle θ, perpendicular vector pointing right is (-sin(θ), cos(θ))
        const perpX = -Math.sin(endAngle);
        const perpY = Math.cos(endAngle);
        const offsetX = perpX * roadWidth / 2;
        const offsetY = perpY * roadWidth / 2;
        
        // Calculate exit section end point
        const exitEndX = exitStartX + Math.cos(endAngle) * exitLength;
        const exitEndY = exitStartY + Math.sin(endAngle) * exitLength;
        
        // Draw road as a continuous path
        ctx.fillStyle = '#333';
        ctx.beginPath();
        
        // Start with straight section (left edge)
        ctx.moveTo(0, centerY - roadWidth / 2);
        ctx.lineTo(turnStartX, centerY - roadWidth / 2);
        
        // Connect to outer arc of turn
        ctx.arc(turnCenterX, turnCenterY, turnRadius + roadWidth / 2, startAngle, endAngle, false);
        
        // Continue to exit section (outer edge - right side of exit road)
        ctx.lineTo(exitEndX + offsetX, exitEndY + offsetY);
        
        // Draw exit section (inner edge - left side of exit road)
        ctx.lineTo(exitStartX + offsetX, exitStartY + offsetY);
        
        // Connect to inner arc of turn
        ctx.arc(turnCenterX, turnCenterY, turnRadius - roadWidth / 2, endAngle, startAngle, true);
        
        // Close back to start of straight section (right edge)
        ctx.lineTo(0, centerY + roadWidth / 2);
        ctx.closePath();
        ctx.fill();
        
        // Draw lane markings
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 10]);
        
        // Straight section lane marking
        ctx.beginPath();
        ctx.moveTo(0, centerY);
        ctx.lineTo(turnStartX, centerY);
        ctx.stroke();
        
        // Turn section lane marking
        ctx.beginPath();
        ctx.arc(turnCenterX, turnCenterY, turnRadius, startAngle, endAngle, false);
        ctx.stroke();
        
        // Exit section lane marking
        ctx.beginPath();
        ctx.moveTo(exitStartX, exitStartY);
        ctx.lineTo(exitEndX, exitEndY);
        ctx.stroke();
        
        ctx.setLineDash([]);
        
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

    async run(speedIncrement = 1, maxSpeed = 150) {
        this.isRunning = true;
        this.hasFailed = false;
        this.track = [];
        
        const startSpeed = 10;
        let currentSpeed = startSpeed;
        const animationDuration = 5000; // 5 seconds per speed increment
        const frameRate = 60;
        const frameTime = 1000 / frameRate;
        
        while (currentSpeed <= maxSpeed && !this.hasFailed) {
            const analysis = this.physics.analyzeFailure(this.vehicle, currentSpeed, this.turnAngle);
            
            if (analysis.hasFailed) {
                this.hasFailed = true;
                this.failureType = analysis.failureType;
                this.currentSpeed = currentSpeed;
                this.simulateFailure(analysis);
                break;
            }
            
            // Animate vehicle through turn at this speed
            await this.animateTurn(currentSpeed, animationDuration);
            
            currentSpeed += speedIncrement;
        }
        
        if (!this.hasFailed) {
            this.currentSpeed = maxSpeed;
        }
        
        this.isRunning = false;
        return {
            hasFailed: this.hasFailed,
            failureType: this.failureType,
            speed: this.currentSpeed
        };
    }

    async animateTurn(speedMPH, duration) {
        return new Promise((resolve) => {
            const startTime = Date.now();
            const width = this.canvas.width;
            const height = this.canvas.height;
            const centerY = height / 2;
            
            // Match geometry with drawTrack
            const straightLength = width * 0.35;
            const turnRadius = Math.min(width * 0.25, height * 0.25);
            const exitLength = width * 0.3;
            const turnStartX = straightLength;
            const turnCenterX = turnStartX + turnRadius;
            const turnCenterY = centerY;
            
            // Calculate arc length for turn (for proportional timing)
            const turnAngleRad = (this.turnAngle * Math.PI) / 180;
            const arcLength = turnRadius * turnAngleRad;
            const totalLength = straightLength + arcLength + exitLength;
            
            // Calculate progress thresholds based on actual lengths
            const straightProgress = straightLength / totalLength;
            const turnProgress = arcLength / totalLength;
            
            const startAngle = -Math.PI / 2;
            const endAngle = startAngle + turnAngleRad;
            
            const animate = () => {
                if (this.hasFailed) {
                    resolve();
                    return;
                }
                
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                // Calculate position along track
                let x, y, rotation;
                
                if (progress < straightProgress) {
                    // Straight section
                    const straightProgressLocal = progress / straightProgress;
                    x = straightLength * straightProgressLocal;
                    y = centerY;
                    rotation = 0;
                } else if (progress < straightProgress + turnProgress) {
                    // Turn section
                    const turnProgressLocal = (progress - straightProgress) / turnProgress;
                    const angle = startAngle + turnAngleRad * turnProgressLocal;
                    x = turnCenterX + Math.cos(angle) * turnRadius;
                    y = turnCenterY + Math.sin(angle) * turnRadius;
                    rotation = (this.turnAngle * turnProgressLocal) - 90;
                } else {
                    // Exit section
                    const exitProgressLocal = (progress - straightProgress - turnProgress) / (1 - straightProgress - turnProgress);
                    const exitStartX = turnCenterX + Math.cos(endAngle) * turnRadius;
                    const exitStartY = turnCenterY + Math.sin(endAngle) * turnRadius;
                    x = exitStartX + Math.cos(endAngle) * exitLength * exitProgressLocal;
                    y = exitStartY + Math.sin(endAngle) * exitLength * exitProgressLocal;
                    rotation = this.turnAngle - 90;
                }
                
                // Record track position
                this.track.push({ x, y });
                if (this.track.length > 1000) {
                    this.track.shift();
                }
                
                // Update display
                this.drawTrack();
                this.updateVehiclePosition(x, y, rotation);
                
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

