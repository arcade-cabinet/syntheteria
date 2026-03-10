/**
 * cameraSystem — FPS camera state management (pure logic, no Three.js).
 *
 * Manages:
 * - Camera position, yaw, pitch, FOV
 * - Head bob: sinusoidal oscillation based on movement speed
 * - Camera shake: triggered by events (compression, explosions, damage), decays over time
 * - Smooth FOV interpolation for sprint/zoom transitions
 *
 * All state is internal; consumers read via getCameraState().
 * No rendering dependencies — this module is testable without any 3D engine.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TWO_PI = Math.PI * 2;
const HALF_PI = Math.PI / 2;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Vec3 {
	x: number;
	y: number;
	z: number;
}

export interface CameraShakeParams {
	/** Peak offset magnitude in world units. */
	intensity: number;
	/** Total duration in seconds. */
	duration: number;
	/** Oscillation frequency in Hz. */
	frequency: number;
	/** Exponential decay rate (higher = faster falloff). */
	decayRate: number;
}

export interface CameraState {
	position: Vec3;
	yaw: number;
	pitch: number;
	fov: number;
	bobOffset: Vec3;
	shakeOffset: Vec3;
}

export interface HeadBobConfig {
	/** Vertical amplitude in world units. */
	amplitudeY: number;
	/** Horizontal (left/right) amplitude in world units. */
	amplitudeX: number;
	/** Bob frequency in Hz. */
	frequency: number;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_BOB_CONFIG: HeadBobConfig = {
	amplitudeY: 0.04,
	amplitudeX: 0.02,
	frequency: 8,
};

const DEFAULT_FOV = 75;
const FOV_LERP_SPEED = 8;

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

let position: Vec3 = { x: 0, y: 0, z: 0 };
let yaw = 0;
let pitch = 0;

let currentFov = DEFAULT_FOV;
let targetFov = DEFAULT_FOV;

// Head bob
let bobPhase = 0;
let bobAmount = 0; // 0..1 blend factor based on movement
let bobConfig: HeadBobConfig = { ...DEFAULT_BOB_CONFIG };
let bobOffsetX = 0;
let bobOffsetY = 0;
let bobOffsetZ = 0;

// Shake
let shakeActive = false;
let shakeElapsed = 0;
let shakeParams: CameraShakeParams = {
	intensity: 0,
	duration: 0,
	frequency: 15,
	decayRate: 5,
};
let shakeOffsetX = 0;
let shakeOffsetY = 0;
let shakeOffsetZ = 0;
// Deterministic random seed for shake — seeded per trigger
let shakeSeedX = 0;
let shakeSeedY = 0;
let shakeSeedZ = 0;

// ---------------------------------------------------------------------------
// Public API — configuration
// ---------------------------------------------------------------------------

/** Set head bob parameters. */
export function setHeadBobConfig(config: Partial<HeadBobConfig>): void {
	bobConfig = { ...bobConfig, ...config };
}

/** Get current head bob configuration. */
export function getHeadBobConfig(): HeadBobConfig {
	return { ...bobConfig };
}

/** Set the default (resting) FOV. */
export function setDefaultFov(fov: number): void {
	targetFov = fov;
}

// ---------------------------------------------------------------------------
// Public API — camera manipulation
// ---------------------------------------------------------------------------

/** Set camera position directly. */
export function setPosition(x: number, y: number, z: number): void {
	position.x = x;
	position.y = y;
	position.z = z;
}

/** Adjust yaw by a delta (e.g. from mouse movement). Wraps to [0, 2*PI). */
export function rotateYaw(delta: number): void {
	yaw += delta;
	// Wrap to [0, 2*PI)
	yaw = ((yaw % TWO_PI) + TWO_PI) % TWO_PI;
}

/** Adjust pitch by a delta. Clamped to [-PI/2, PI/2]. */
export function rotatePitch(delta: number): void {
	pitch += delta;
	if (pitch > HALF_PI) pitch = HALF_PI;
	if (pitch < -HALF_PI) pitch = -HALF_PI;
}

/** Set yaw directly (radians). Wraps to [0, 2*PI). */
export function setYaw(value: number): void {
	yaw = ((value % TWO_PI) + TWO_PI) % TWO_PI;
}

/** Set pitch directly (radians). Clamped to [-PI/2, PI/2]. */
export function setPitch(value: number): void {
	pitch = value;
	if (pitch > HALF_PI) pitch = HALF_PI;
	if (pitch < -HALF_PI) pitch = -HALF_PI;
}

/** Set the target FOV (e.g. for sprint or zoom). Smooth interpolation occurs in updateCamera. */
export function setTargetFov(fov: number): void {
	targetFov = fov;
}

// ---------------------------------------------------------------------------
// Public API — shake
// ---------------------------------------------------------------------------

/**
 * Trigger a camera shake effect.
 * If a shake is already active, the stronger one wins (higher intensity).
 */
export function triggerShake(
	intensity: number,
	duration: number,
	frequency = 15,
	decayRate = 5,
): void {
	// If current shake is stronger and still has time remaining, keep it
	if (shakeActive) {
		const currentRemaining = shakeParams.duration - shakeElapsed;
		const currentEffective =
			shakeParams.intensity *
			Math.exp(-shakeParams.decayRate * shakeElapsed);
		if (currentEffective > intensity && currentRemaining > 0) {
			return;
		}
	}

	shakeActive = true;
	shakeElapsed = 0;
	shakeParams = { intensity, duration, frequency, decayRate };

	// Generate pseudo-random seeds for deterministic shake offsets.
	// Using simple primes so each axis shakes differently.
	shakeSeedX = 1.0;
	shakeSeedY = 2.3;
	shakeSeedZ = 3.7;
}

// ---------------------------------------------------------------------------
// Public API — update
// ---------------------------------------------------------------------------

/**
 * Advance camera systems by one frame.
 *
 * @param delta — frame time in seconds
 * @param isMoving — whether the player is currently moving
 * @param moveSpeed — current movement speed (used to scale bob intensity)
 */
export function updateCamera(
	delta: number,
	isMoving: boolean,
	moveSpeed: number,
): void {
	// --- Head bob ---
	const targetBob = isMoving ? Math.min(moveSpeed / 5, 1) : 0;
	// Smooth blend toward target bob amount
	bobAmount += (targetBob - bobAmount) * Math.min(delta * 10, 1);

	if (bobAmount > 0.001) {
		bobPhase += delta * bobConfig.frequency * TWO_PI;
		bobPhase %= TWO_PI;

		bobOffsetY = Math.sin(bobPhase) * bobConfig.amplitudeY * bobAmount;
		// Horizontal bob at half frequency for a natural gait
		bobOffsetX =
			Math.sin(bobPhase * 0.5) * bobConfig.amplitudeX * bobAmount;
		bobOffsetZ = 0;
	} else {
		bobOffsetX = 0;
		bobOffsetY = 0;
		bobOffsetZ = 0;
		bobPhase = 0;
		bobAmount = 0;
	}

	// --- Camera shake ---
	if (shakeActive) {
		shakeElapsed += delta;

		if (shakeElapsed >= shakeParams.duration) {
			shakeActive = false;
			shakeOffsetX = 0;
			shakeOffsetY = 0;
			shakeOffsetZ = 0;
		} else {
			const decay = Math.exp(-shakeParams.decayRate * shakeElapsed);
			const t = shakeElapsed * shakeParams.frequency * TWO_PI;

			// Use offset sine waves per axis for varied shake pattern
			shakeOffsetX =
				Math.sin(t * shakeSeedX) * shakeParams.intensity * decay;
			shakeOffsetY =
				Math.sin(t * shakeSeedY) * shakeParams.intensity * decay;
			shakeOffsetZ =
				Math.sin(t * shakeSeedZ) * shakeParams.intensity * decay;
		}
	}

	// --- FOV interpolation ---
	if (Math.abs(currentFov - targetFov) > 0.01) {
		currentFov += (targetFov - currentFov) * Math.min(delta * FOV_LERP_SPEED, 1);
	} else {
		currentFov = targetFov;
	}
}

// ---------------------------------------------------------------------------
// Public API — read state
// ---------------------------------------------------------------------------

/** Returns the full camera state for this frame. */
export function getCameraState(): CameraState {
	return {
		position: { x: position.x, y: position.y, z: position.z },
		yaw,
		pitch,
		fov: currentFov,
		bobOffset: { x: bobOffsetX, y: bobOffsetY, z: bobOffsetZ },
		shakeOffset: { x: shakeOffsetX, y: shakeOffsetY, z: shakeOffsetZ },
	};
}

/** Get raw values for internal inspection (used by tests). */
export function getBobPhase(): number {
	return bobPhase;
}

export function getBobAmount(): number {
	return bobAmount;
}

export function isShakeActive(): boolean {
	return shakeActive;
}

// ---------------------------------------------------------------------------
// Reset (for testing)
// ---------------------------------------------------------------------------

/** Reset all camera state to defaults. */
export function resetCameraSystem(): void {
	position = { x: 0, y: 0, z: 0 };
	yaw = 0;
	pitch = 0;
	currentFov = DEFAULT_FOV;
	targetFov = DEFAULT_FOV;
	bobPhase = 0;
	bobAmount = 0;
	bobConfig = { ...DEFAULT_BOB_CONFIG };
	bobOffsetX = 0;
	bobOffsetY = 0;
	bobOffsetZ = 0;
	shakeActive = false;
	shakeElapsed = 0;
	shakeParams = { intensity: 0, duration: 0, frequency: 15, decayRate: 5 };
	shakeOffsetX = 0;
	shakeOffsetY = 0;
	shakeOffsetZ = 0;
}
