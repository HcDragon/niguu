/**
 * exerciseEngine.js
 * =================
 * Browser-side exercise tracking engine.
 * Ports the Python ExerciseStateMachine, angle computation,
 * and EMA smoothing to JavaScript for use with MediaPipe JS.
 */

// ── Exercise Configurations ──────────────────────────────────

export const EXERCISE_CONFIGS = {
    elbow_stretching: {
        display_name: 'Elbow Stretching',
        description: 'Left-arm elbow stretching. Bend your elbow fully and hold for 2 seconds.',
        // MediaPipe pose landmark indices
        landmarks: [11, 13, 15], // shoulder, elbow, wrist
        relaxed_angle: 150,
        stretched_angle: 50,
        // "stretched" means angle BELOW threshold (arm curled)
        direction: 'below',
        reps_per_set: 10,
        total_sets: 3,
        cooldown_secs: 30,
        hold_duration: 2.0,
        // Skeleton drawing connections
        connections: [
            [11, 13], // shoulder → elbow
            [13, 15], // elbow → wrist
        ],
        // Color for the active angle arc
        arc_color: '#C9A84C',
    },
    lateral_raises: {
        display_name: 'Lateral Raises',
        description: 'Left-arm lateral raises. Raise arm to shoulder height and hold for 2 seconds.',
        landmarks: [23, 11, 15], // hip, shoulder, wrist
        relaxed_angle: 25,
        stretched_angle: 75,
        // "stretched" means angle ABOVE threshold (arm raised)
        direction: 'above',
        reps_per_set: 10,
        total_sets: 3,
        cooldown_secs: 30,
        hold_duration: 2.0,
        connections: [
            [23, 11], // hip → shoulder
            [11, 13], // shoulder → elbow
            [13, 15], // elbow → wrist
        ],
        arc_color: '#4A6FA5',
    },
}

// ── Angle Computation ────────────────────────────────────────

/**
 * Compute angle at point B, given points A, B, C.
 * Each point is { x, y } in normalized [0,1] coords.
 * Returns angle in degrees.
 */
export function computeAngle(a, b, c) {
    const ba = { x: a.x - b.x, y: a.y - b.y }
    const bc = { x: c.x - b.x, y: c.y - b.y }

    const dotProduct = ba.x * bc.x + ba.y * bc.y
    const magBA = Math.sqrt(ba.x * ba.x + ba.y * ba.y)
    const magBC = Math.sqrt(bc.x * bc.x + bc.y * bc.y)

    if (magBA < 1e-9 || magBC < 1e-9) return 0

    let cosAngle = dotProduct / (magBA * magBC)
    cosAngle = Math.max(-1, Math.min(1, cosAngle))

    return (Math.acos(cosAngle) * 180) / Math.PI
}

// ── EMA Smoother ─────────────────────────────────────────────

export class EMASmoother {
    constructor(alpha = 0.4) {
        this.alpha = alpha
        this._value = null
    }

    update(newValue) {
        if (this._value === null) {
            this._value = newValue
        } else {
            this._value = this.alpha * newValue + (1 - this.alpha) * this._value
        }
        return this._value
    }

    reset() {
        this._value = null
    }

    get value() {
        return this._value ?? 0
    }
}

// ── Exercise State Machine ───────────────────────────────────

export const STATES = {
    RELAXED: 'RELAXED',
    CURLING: 'CURLING',
    HOLDING: 'HOLDING',
    STRETCHED: 'STRETCHED',
    EXTENDING: 'EXTENDING',
}

export class ExerciseStateMachine {
    constructor(config) {
        this.config = config
        this.state = STATES.RELAXED
        this.reps = 0
        this.peakAngle = config.direction === 'below' ? 180 : 0
        this.allAngles = []
        this._holdStart = null
        this.holdProgress = 0
    }

    resetForNewSet() {
        this.state = STATES.RELAXED
        this.reps = 0
        this.peakAngle = this.config.direction === 'below' ? 180 : 0
        this.allAngles = []
        this._holdStart = null
        this.holdProgress = 0
    }

    get avgAngle() {
        if (this.allAngles.length === 0) return 0
        return this.allAngles.reduce((a, b) => a + b, 0) / this.allAngles.length
    }

    /**
     * Check if the angle is in the "stretched" zone based on exercise direction.
     */
    _isStretched(angle) {
        return this.config.direction === 'below'
            ? angle <= this.config.stretched_angle
            : angle >= this.config.stretched_angle
    }

    /**
     * Check if the angle is in the "relaxed" zone.
     */
    _isRelaxed(angle) {
        return this.config.direction === 'below'
            ? angle >= this.config.relaxed_angle
            : angle <= this.config.relaxed_angle
    }

    /**
     * Check if the angle is "moving toward stretched" (past relaxed threshold).
     */
    _isPastRelaxed(angle) {
        return this.config.direction === 'below'
            ? angle < this.config.relaxed_angle
            : angle > this.config.relaxed_angle
    }

    /**
     * Update state machine with a new angle reading.
     * Returns the current state string.
     */
    update(angle) {
        this.allAngles.push(angle)

        // Track peak
        if (this.config.direction === 'below') {
            this.peakAngle = Math.min(this.peakAngle, angle)
        } else {
            this.peakAngle = Math.max(this.peakAngle, angle)
        }

        const now = performance.now() / 1000 // seconds

        switch (this.state) {
            case STATES.RELAXED:
                this.holdProgress = 0
                this._holdStart = null
                if (this._isPastRelaxed(angle)) {
                    this.state = STATES.CURLING
                }
                break

            case STATES.CURLING:
                this.holdProgress = 0
                if (this._isStretched(angle)) {
                    this.state = STATES.HOLDING
                    this._holdStart = now
                } else if (this._isRelaxed(angle)) {
                    this.state = STATES.RELAXED
                }
                break

            case STATES.HOLDING:
                if (!this._isStretched(angle)) {
                    this.state = STATES.CURLING
                    this._holdStart = null
                    this.holdProgress = 0
                } else {
                    const elapsed = now - this._holdStart
                    this.holdProgress = Math.min(elapsed / this.config.hold_duration, 1.0)
                    if (elapsed >= this.config.hold_duration) {
                        this.state = STATES.STRETCHED
                        this.holdProgress = 1.0
                    }
                }
                break

            case STATES.STRETCHED:
                if (!this._isStretched(angle)) {
                    this.state = STATES.EXTENDING
                }
                break

            case STATES.EXTENDING:
                if (this._isRelaxed(angle)) {
                    this.state = STATES.RELAXED
                    this.reps += 1
                    this.holdProgress = 0
                    this._holdStart = null
                } else if (this._isStretched(angle)) {
                    this.state = STATES.HOLDING
                    this._holdStart = now
                }
                break
        }

        return this.state
    }
}

// ── Session Manager ──────────────────────────────────────────

/**
 * Manages the full exercise session: multiple sets, cooldowns,
 * and final result compilation.
 */
export class ExerciseSession {
    constructor(exerciseKey) {
        const config = EXERCISE_CONFIGS[exerciseKey]
        if (!config) throw new Error(`Unknown exercise: ${exerciseKey}`)

        this.exerciseKey = exerciseKey
        this.config = config
        this.smoother = new EMASmoother(0.4)
        this.stateMachine = new ExerciseStateMachine(config)

        this.currentSet = 1
        this.phase = 'exercising' // 'exercising' | 'cooldown' | 'completed'
        this.cooldownRemaining = 0
        this._cooldownStart = null

        this.setResults = [] // { reps, peakAngle, avgAngle }
        this.startTime = performance.now()

        // Current frame data (for rendering)
        this.currentAngle = 0
        this.smoothedAngle = 0
    }

    /**
     * Process a new frame with pose landmarks.
     * Returns the current session state for rendering.
     */
    processLandmarks(landmarks) {
        if (this.phase === 'completed') return this._getState()

        // Handle cooldown
        if (this.phase === 'cooldown') {
            const elapsed = (performance.now() / 1000) - this._cooldownStart
            this.cooldownRemaining = Math.max(0, this.config.cooldown_secs - elapsed)
            if (this.cooldownRemaining <= 0) {
                this._startNextSet()
            }
            return this._getState()
        }

        // Get the three landmark points
        const [idxA, idxB, idxC] = this.config.landmarks
        const a = landmarks[idxA]
        const b = landmarks[idxB]
        const c = landmarks[idxC]

        if (!a || !b || !c) return this._getState()

        // Compute and smooth angle
        const rawAngle = computeAngle(a, b, c)
        this.currentAngle = rawAngle
        this.smoothedAngle = this.smoother.update(rawAngle)

        // Update state machine
        this.stateMachine.update(this.smoothedAngle)

        // Check if set is complete
        if (this.stateMachine.reps >= this.config.reps_per_set) {
            this._completeSet()
        }

        return this._getState()
    }

    _completeSet() {
        this.setResults.push({
            set: this.currentSet,
            reps: this.stateMachine.reps,
            peakAngle: Math.round(this.stateMachine.peakAngle * 10) / 10,
            avgAngle: Math.round(this.stateMachine.avgAngle * 10) / 10,
        })

        if (this.currentSet >= this.config.total_sets) {
            this.phase = 'completed'
        } else {
            this.phase = 'cooldown'
            this._cooldownStart = performance.now() / 1000
            this.cooldownRemaining = this.config.cooldown_secs
        }
    }

    _startNextSet() {
        this.currentSet += 1
        this.phase = 'exercising'
        this.stateMachine.resetForNewSet()
        this.smoother.reset()
        this._cooldownStart = null
        this.cooldownRemaining = 0
    }

    /**
     * Force-end the session (user pressed END).
     */
    endSession() {
        if (this.phase === 'exercising' && this.stateMachine.reps > 0) {
            this.setResults.push({
                set: this.currentSet,
                reps: this.stateMachine.reps,
                peakAngle: Math.round(this.stateMachine.peakAngle * 10) / 10,
                avgAngle: Math.round(this.stateMachine.avgAngle * 10) / 10,
            })
        }
        this.phase = 'completed'
    }

    /**
     * Get the final result object for saving to backend.
     */
    getResult() {
        const totalReps = this.setResults.reduce((sum, s) => sum + s.reps, 0)
        const peakAngles = this.setResults.map(s => s.peakAngle).filter(a => a > 0)
        const avgPeak = peakAngles.length > 0
            ? peakAngles.reduce((a, b) => a + b, 0) / peakAngles.length
            : 0

        return {
            exercise: this.exerciseKey,
            total_reps: totalReps,
            avg_peak_angle: Math.round(avgPeak * 10) / 10,
            sets: this.setResults,
            duration_secs: Math.round((performance.now() - this.startTime) / 1000),
            early_exit: this.currentSet < this.config.total_sets,
        }
    }

    _getState() {
        return {
            phase: this.phase,
            currentSet: this.currentSet,
            totalSets: this.config.total_sets,
            reps: this.stateMachine.reps,
            repsTarget: this.config.reps_per_set,
            state: this.stateMachine.state,
            angle: Math.round(this.smoothedAngle),
            holdProgress: this.stateMachine.holdProgress,
            cooldownRemaining: Math.round(this.cooldownRemaining),
            setResults: this.setResults,
            completed: this.phase === 'completed',
        }
    }
}
