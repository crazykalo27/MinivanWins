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
        
        // Draw road/track
        const centerY = height / 2;
        const roadWidth = 120;
        
        // Draw straight section
        ctx.fillStyle = '#333';
        ctx.fillRect(0, centerY - roadWidth / 2, width * 0.4, roadWidth);
        
        // Draw lane markings
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 10]);
        ctx.beginPath();
        ctx.moveTo(0, centerY);
        ctx.lineTo(width * 0.4, centerY);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Draw turn section (right-hand turn)
        const turnStartX = width * 0.4;
        const turnRadius = Math.min(width * 0.3, height * 0.3);
        const turnCenterX = turnStartX + turnRadius;
        const turnCenterY = centerY;
        
        // Outer arc
        ctx.beginPath();
        ctx.arc(turnCenterX, turnCenterY, turnRadius + roadWidth / 2, -Math.PI / 2, 
                -Math.PI / 2 + (this.turnAngle * Math.PI / 180), false);
        ctx.lineWidth = roadWidth;
        ctx.strokeStyle = '#333';
        ctx.stroke();
        
        // Inner arc
        ctx.beginPath();
        ctx.arc(turnCenterX, turnCenterY, turnRadius - roadWidth / 2, -Math.PI / 2, 
                -Math.PI / 2 + (this.turnAngle * Math.PI / 180), false);
        ctx.lineWidth = roadWidth;
        ctx.strokeStyle = '#f5f5f5';
        ctx.stroke();
        
        // Draw turn lane marking
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 10]);
        ctx.beginPath();
        ctx.arc(turnCenterX, turnCenterY, turnRadius, -Math.PI / 2, 
                -Math.PI / 2 + (this.turnAngle * Math.PI / 180), false);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Draw exit straight section
        const exitAngle = -Math.PI / 2 + (this.turnAngle * Math.PI / 180);
        const exitStartX = turnCenterX + Math.cos(exitAngle) * turnRadius;
        const exitStartY = turnCenterY + Math.sin(exitAngle) * turnRadius;
        const exitLength = width * 0.3;
        const exitEndX = exitStartX + Math.cos(exitAngle) * exitLength;
        const exitEndY = exitStartY + Math.sin(exitAngle) * exitLength;
        
        ctx.fillStyle = '#333';
        ctx.save();
        ctx.translate(exitStartX, exitStartY);
        ctx.rotate(exitAngle);
        ctx.fillRect(0, -roadWidth / 2, exitLength, roadWidth);
        ctx.restore();
        
        // Draw exit lane marking
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 10]);
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
            const turnStartX = width * 0.4;
            const turnRadius = Math.min(width * 0.3, height * 0.3);
            const turnCenterX = turnStartX + turnRadius;
            const turnCenterY = centerY;
            const exitAngle = -Math.PI / 2 + (this.turnAngle * Math.PI / 180);
            
            const animate = () => {
                if (this.hasFailed) {
                    resolve();
                    return;
                }
                
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                // Calculate position along track
                let x, y, rotation;
                
                if (progress < 0.4) {
                    // Straight section
                    x = (width * 0.4) * progress / 0.4;
                    y = centerY;
                    rotation = 0;
                } else if (progress < 0.7) {
                    // Turn section
                    const turnProgress = (progress - 0.4) / 0.3;
                    const angle = -Math.PI / 2 + (this.turnAngle * Math.PI / 180) * turnProgress;
                    x = turnCenterX + Math.cos(angle) * turnRadius;
                    y = turnCenterY + Math.sin(angle) * turnRadius;
                    rotation = (this.turnAngle * turnProgress) - 90;
                } else {
                    // Exit section
                    const exitProgress = (progress - 0.7) / 0.3;
                    const exitLength = width * 0.3;
                    const exitStartX = turnCenterX + Math.cos(exitAngle) * turnRadius;
                    const exitStartY = turnCenterY + Math.sin(exitAngle) * turnRadius;
                    x = exitStartX + Math.cos(exitAngle) * exitLength * exitProgress;
                    y = exitStartY + Math.sin(exitAngle) * exitLength * exitProgress;
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

