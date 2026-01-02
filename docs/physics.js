// Vehicle specifications
const VEHICLES = {
    corolla: {
        name: 'Toyota Corolla',
        weight: 2600, // lbs
        centerOfMassHeight: 20, // inches
        wheelbase: 102.4, // inches
        frontTrack: 59.9, // inches
        rearTrack: 59.4, // inches
        driveType: 'FWD'
    },
    caravan: {
        name: 'Dodge Caravan',
        weight: 4500, // lbs
        centerOfMassHeight: 26, // inches
        wheelbase: 121.2, // inches
        frontTrack: 64.8, // inches
        rearTrack: 64.8, // inches
        driveType: 'FWD'
    }
};

// Physics constants
const GRAVITY = 32.174; // ft/s²
const INCHES_TO_FEET = 1 / 12;
const MPH_TO_FPS = 5280 / 3600; // feet per second

class PhysicsEngine {
    constructor() {
        this.frictionCoeff = 0.7;
    }

    setFrictionCoeff(mu) {
        this.frictionCoeff = mu;
    }

    /**
     * Calculate lateral acceleration required for a turn at given speed and radius
     * @param {number} speedMPH - Speed in miles per hour
     * @param {number} turnRadiusFeet - Turn radius in feet
     * @returns {number} Lateral acceleration in ft/s²
     */
    calculateLateralAcceleration(speedMPH, turnRadiusFeet) {
        const speedFPS = speedMPH * MPH_TO_FPS;
        return (speedFPS * speedFPS) / turnRadiusFeet;
    }

    /**
     * Calculate turn radius from turn angle (assuming a standard turn)
     * For a right-hand turn, we use a reasonable radius based on angle
     * @param {number} turnAngleDegrees - Turn angle in degrees
     * @param {number} speedMPH - Speed in mph (affects radius)
     * @returns {number} Turn radius in feet
     */
    calculateTurnRadius(turnAngleDegrees, speedMPH) {
        // Base radius calculation: sharper turns = smaller radius
        // For highway turns: radius ≈ speed² / (15 * sin(angle))
        // For tighter turns, we use a more realistic formula
        const angleRad = (turnAngleDegrees * Math.PI) / 180;
        
        // Minimum radius based on angle (sharper angle = smaller radius)
        // Typical turning radius for vehicles at different angles
        const baseRadius = 50; // feet base radius
        const angleFactor = 1 / Math.sin(angleRad);
        
        // Speed factor: higher speeds need larger radii for the same angle
        const speedFactor = Math.max(1, speedMPH / 30);
        
        return baseRadius * angleFactor * speedFactor;
    }

    /**
     * Calculate maximum lateral acceleration before spin-out (friction limit)
     * @param {number} frictionCoeff - Coefficient of friction
     * @returns {number} Maximum lateral acceleration in ft/s²
     */
    calculateSpinOutLimit(frictionCoeff) {
        return frictionCoeff * GRAVITY;
    }

    /**
     * Calculate maximum lateral acceleration before rollover
     * Uses the Static Stability Factor (SSF) = track / (2 * CoM height)
     * Rollover occurs when: lateral_accel > (track / (2 * CoM_height)) * gravity
     * @param {Object} vehicle - Vehicle specification object
     * @returns {number} Maximum lateral acceleration in ft/s² before rollover
     */
    calculateRolloverLimit(vehicle) {
        // Use average track width (front and rear average)
        const avgTrack = (vehicle.frontTrack + vehicle.rearTrack) / 2;
        const trackFeet = avgTrack * INCHES_TO_FEET;
        const comHeightFeet = vehicle.centerOfMassHeight * INCHES_TO_FEET;
        
        // Static Stability Factor
        const SSF = trackFeet / (2 * comHeightFeet);
        
        // Rollover occurs when lateral acceleration exceeds SSF * gravity
        return SSF * GRAVITY;
    }

    /**
     * Check if vehicle will spin out at given conditions
     * @param {Object} vehicle - Vehicle specification
     * @param {number} speedMPH - Speed in mph
     * @param {number} turnAngleDegrees - Turn angle in degrees
     * @returns {Object} Result with spinOut flag and details
     */
    checkSpinOut(vehicle, speedMPH, turnAngleDegrees) {
        const turnRadius = this.calculateTurnRadius(turnAngleDegrees, speedMPH);
        const lateralAccel = this.calculateLateralAcceleration(speedMPH, turnRadius);
        const spinOutLimit = this.calculateSpinOutLimit(this.frictionCoeff);
        
        return {
            willSpinOut: lateralAccel > spinOutLimit,
            lateralAccel: lateralAccel,
            limit: spinOutLimit,
            margin: spinOutLimit - lateralAccel,
            turnRadius: turnRadius
        };
    }

    /**
     * Check if vehicle will rollover at given conditions
     * @param {Object} vehicle - Vehicle specification
     * @param {number} speedMPH - Speed in mph
     * @param {number} turnAngleDegrees - Turn angle in degrees
     * @returns {Object} Result with rollover flag and details
     */
    checkRollover(vehicle, speedMPH, turnAngleDegrees) {
        const turnRadius = this.calculateTurnRadius(turnAngleDegrees, speedMPH);
        const lateralAccel = this.calculateLateralAcceleration(speedMPH, turnRadius);
        const rolloverLimit = this.calculateRolloverLimit(vehicle);
        
        return {
            willRollover: lateralAccel > rolloverLimit,
            lateralAccel: lateralAccel,
            limit: rolloverLimit,
            margin: rolloverLimit - lateralAccel,
            turnRadius: turnRadius,
            SSF: (vehicle.frontTrack + vehicle.rearTrack) / 2 / (2 * vehicle.centerOfMassHeight)
        };
    }

    /**
     * Determine failure mode and speed threshold
     * Returns which failure occurs first (spin-out or rollover)
     * @param {Object} vehicle - Vehicle specification
     * @param {number} speedMPH - Speed in mph
     * @param {number} turnAngleDegrees - Turn angle in degrees
     * @returns {Object} Failure analysis
     */
    analyzeFailure(vehicle, speedMPH, turnAngleDegrees) {
        const spinOutCheck = this.checkSpinOut(vehicle, speedMPH, turnAngleDegrees);
        const rolloverCheck = this.checkRollover(vehicle, speedMPH, turnAngleDegrees);
        
        // Determine which failure occurs first
        const spinOutMargin = spinOutCheck.margin;
        const rolloverMargin = rolloverCheck.margin;
        
        let failureType = null;
        let hasFailed = false;
        
        // Catastrophic failure: margin must be negative (exceeded limit)
        // We use a threshold to ensure it's truly catastrophic, not just a slight exceedance
        const catastrophicThreshold = -0.5; // ft/s² buffer for catastrophic failure
        
        if (spinOutMargin < catastrophicThreshold && rolloverMargin < catastrophicThreshold) {
            // Both would fail, check which happens first
            if (spinOutMargin < rolloverMargin) {
                failureType = 'spin-out';
                hasFailed = true;
            } else {
                failureType = 'rollover';
                hasFailed = true;
            }
        } else if (spinOutMargin < catastrophicThreshold) {
            failureType = 'spin-out';
            hasFailed = true;
        } else if (rolloverMargin < catastrophicThreshold) {
            failureType = 'rollover';
            hasFailed = true;
        }
        
        return {
            hasFailed: hasFailed,
            failureType: failureType,
            spinOut: spinOutCheck,
            rollover: rolloverCheck,
            speed: speedMPH
        };
    }

    /**
     * Find the critical speed where failure occurs
     * Uses binary search to find the speed threshold
     * @param {Object} vehicle - Vehicle specification
     * @param {number} turnAngleDegrees - Turn angle in degrees
     * @param {number} minSpeed - Minimum speed to test (mph)
     * @param {number} maxSpeed - Maximum speed to test (mph)
     * @returns {Object} Critical speed and failure details
     */
    findCriticalSpeed(vehicle, turnAngleDegrees, minSpeed = 10, maxSpeed = 150) {
        let low = minSpeed;
        let high = maxSpeed;
        let criticalSpeed = null;
        let failureDetails = null;
        
        // Binary search for critical speed
        while (high - low > 0.1) {
            const midSpeed = (low + high) / 2;
            const analysis = this.analyzeFailure(vehicle, midSpeed, turnAngleDegrees);
            
            if (analysis.hasFailed) {
                criticalSpeed = midSpeed;
                failureDetails = analysis;
                high = midSpeed; // Try lower speeds
            } else {
                low = midSpeed; // Try higher speeds
            }
        }
        
        return {
            criticalSpeed: criticalSpeed || low,
            failureDetails: failureDetails || this.analyzeFailure(vehicle, low, turnAngleDegrees)
        };
    }
}

