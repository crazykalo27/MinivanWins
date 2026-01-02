// Vehicle specifications
// Based on manufacturer data and NHTSA testing specifications
const VEHICLES = {
    corolla: {
        name: 'Toyota Celica',
        year: 2004,
        weight: 2650, // lbs (curb weight, typical for base model)
        centerOfMassHeight: 21, // inches (estimated from NHTSA data for similar sedans)
        wheelbase: 102.4, // inches (official spec)
        frontTrack: 59.9, // inches (official spec)
        rearTrack: 59.4, // inches (official spec)
        driveType: 'FWD', // Front-wheel drive
        // Additional specs for reference (not used in current calculations)
        length: 178.3, // inches
        width: 66.9, // inches
        height: 57.5, // inches
        tireSize: 'P195/65R15' // Typical tire size
    },
    caravan: {
        name: 'Dodge Caravan',
        year: 2016,
        weight: 4560, // lbs (curb weight, typical for Grand Caravan)
        centerOfMassHeight: 27, // inches (higher due to minivan design)
        wheelbase: 121.2, // inches (official spec)
        frontTrack: 64.8, // inches (official spec)
        rearTrack: 64.8, // inches (official spec)
        driveType: 'FWD', // Front-wheel drive
        // Additional specs for reference (not used in current calculations)
        length: 202.8, // inches
        width: 78.7, // inches
        height: 68.9, // inches
        tireSize: 'P225/65R17' // Typical tire size
    }
};

// Physics constants
const GRAVITY = 32.174; // ft/s²
const INCHES_TO_FEET = 1 / 12;
const MPH_TO_FPS = 5280 / 3600; // feet per second

class PhysicsEngine {
    constructor() {
        this.frictionCoeff = 0.7;
        this.ignoreSlipping = false; // If true, ignore spin-out failures
        this.ignoreTipping = false;  // If true, ignore rollover failures
        this.trackRadiusFeet = 75;   // Fixed track turn radius in feet (realistic road curve)
    }

    setFrictionCoeff(mu) {
        this.frictionCoeff = mu;
    }

    setIgnoreSlipping(ignore) {
        this.ignoreSlipping = ignore;
    }

    setIgnoreTipping(ignore) {
        this.ignoreTipping = ignore;
    }

    setTrackRadius(radiusFeet) {
        this.trackRadiusFeet = radiusFeet;
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
     * Get the track's turn radius
     * The turn radius is a property of the ROAD/TRACK, not the vehicle.
     * Both vehicles must navigate the same curve.
     * @returns {number} Turn radius in feet
     */
    calculateTurnRadius() {
        // The track radius is fixed - it's the road's curve, not derived from vehicle properties
        // This is physically correct: the road curve is what it is, vehicles must handle it
        return this.trackRadiusFeet;
    }

    /**
     * Calculate maximum lateral acceleration before spin-out (friction limit)
     * Considers vehicle weight (affects tire contact patch) and drive type
     * @param {number} frictionCoeff - Coefficient of friction
     * @param {Object} vehicle - Vehicle specification
     * @returns {number} Maximum lateral acceleration in ft/s²
     */
    calculateSpinOutLimit(frictionCoeff, vehicle) {
        // Base friction limit
        let baseLimit = frictionCoeff * GRAVITY;
        
        // Weight effect: Heavier vehicles have larger tire contact patches
        // More weight = more normal force = more grip (up to a point)
        // Typical passenger car weight range: 2000-5000 lbs
        // Normalize weight effect (reference: 3000 lbs)
        const weightNormalized = vehicle.weight / 3000;
        // Weight improves grip but with diminishing returns (sqrt relationship)
        const weightGripFactor = Math.sqrt(Math.min(weightNormalized, 1.5));
        
        // Drive type effect: FWD vs RWD affects handling characteristics
        // FWD vehicles tend to understeer (safer, more predictable)
        // RWD vehicles can oversteer (more prone to spin-out)
        let driveTypeFactor = 1.0;
        if (vehicle.driveType === 'FWD') {
            // FWD vehicles are more stable in turns due to front weight bias
            driveTypeFactor = 1.05; // Slight advantage
        } else if (vehicle.driveType === 'RWD') {
            // RWD can be more prone to oversteer
            driveTypeFactor = 0.98; // Slight disadvantage
        }
        
        return baseLimit * weightGripFactor * driveTypeFactor;
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
     * @param {number} turnAngleDegrees - Turn angle in degrees (unused, kept for API compat)
     * @returns {Object} Result with spinOut flag and details
     */
    checkSpinOut(vehicle, speedMPH, turnAngleDegrees) {
        const turnRadius = this.calculateTurnRadius();
        const lateralAccel = this.calculateLateralAcceleration(speedMPH, turnRadius);
        const spinOutLimit = this.calculateSpinOutLimit(this.frictionCoeff, vehicle);
        
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
     * @param {number} turnAngleDegrees - Turn angle in degrees (unused, kept for API compat)
     * @returns {Object} Result with rollover flag and details
     */
    checkRollover(vehicle, speedMPH, turnAngleDegrees) {
        const turnRadius = this.calculateTurnRadius();
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
        let spinOutMargin = spinOutCheck.margin;
        let rolloverMargin = rolloverCheck.margin;
        
        // If ignoring a failure mode, set its margin to positive infinity (never fails)
        if (this.ignoreSlipping) {
            spinOutMargin = Infinity;
        }
        if (this.ignoreTipping) {
            rolloverMargin = Infinity;
        }
        
        let failureType = null;
        let hasFailed = false;
        
        // Failure occurs when margin is negative (exceeded limit)
        // A negative margin means the required acceleration exceeds the limit
        const failureThreshold = 0; // Any negative margin = failure
        
        if (spinOutMargin < failureThreshold && rolloverMargin < failureThreshold) {
            // Both would fail, check which happens first (more negative = worse)
            if (spinOutMargin < rolloverMargin) {
                failureType = 'spin-out';
                hasFailed = true;
            } else {
                failureType = 'rollover';
                hasFailed = true;
            }
        } else if (spinOutMargin < failureThreshold) {
            failureType = 'spin-out';
            hasFailed = true;
        } else if (rolloverMargin < failureThreshold) {
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

