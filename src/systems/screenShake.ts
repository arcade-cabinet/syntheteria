/**
 * Screen shake system — camera shake, screen flash, and vibration data for
 * the rendering layer.
 *
 * Designed to provide "juice" for the compression mechanic and other
 * high-impact game events. Supports multiple simultaneous shakes with
 * additive blending, configurable decay curves, and a global intensity
 * multiplier for accessibility.
 *
 * Pure math — no Three.js, no config imports. Module-level state with
 * reset() for test cleanup.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ShakeConfig {
	/** How much the camera moves (0–1 normalized). */
	intensity: number;
	/** How fast it oscillates (Hz). */
	frequency: number;
	/** How long the shake lasts (seconds). */
	duration: number;
	/** How intensity fades over time. */
	decayType: "linear" | "exponential" | "none";
}

export interface ActiveShake {
	/** Unique identifier for this shake instance. */
	id: string;
	/** Configuration for this shake. */
	config: ShakeConfig;
	/** Time elapsed since shake started (seconds). */
	elapsed: number;
	/** Seed for deterministic pseudo-random noise per axis. */
	seed: number;
}

export interface ShakeOutput {
	/** Camera X offset (world units). */
	offsetX: number;
	/** Camera Y offset (world units). */
	offsetY: number;
	/** Camera roll (radians). */
	rotation: number;
	/** Screen flash intensity (0–1). */
	flashIntensity: number;
	/** Screen flash color (hex string). */
	flashColor: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TWO_PI = Math.PI * 2;

/** Maximum combined offset magnitude to prevent extreme values. */
const MAX_OFFSET = 2.0;

/** Maximum combined rotation magnitude. */
const MAX_ROTATION = 0.15;

/** Maximum combined flash intensity. */
const MAX_FLASH = 1.0;

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

let activeShakes: ActiveShake[] = [];
let nextShakeId = 0;
let globalMultiplier = 1.0;

// Flash state
let flashActive = false;
let flashElapsed = 0;
let flashDuration = 0;
let flashPeakIntensity = 0;
let flashColor = "#ffffff";

// ---------------------------------------------------------------------------
// Preset registry
// ---------------------------------------------------------------------------

const presets: Record<string, () => ShakeConfig> = {};

// ---------------------------------------------------------------------------
// Decay helpers
// ---------------------------------------------------------------------------

/**
 * Compute the decay multiplier for a given decay type.
 *
 * - linear:      1 - (elapsed / duration)
 * - exponential: e^(-elapsed * 3)
 * - none:        1.0 (no decay)
 */
function computeDecay(
	decayType: ShakeConfig["decayType"],
	elapsed: number,
	duration: number,
): number {
	switch (decayType) {
		case "linear":
			return Math.max(0, 1 - elapsed / duration);
		case "exponential":
			return Math.exp(-elapsed * 3);
		case "none":
			return 1.0;
	}
}

/**
 * Simple deterministic hash-noise function.
 * Returns a value in [-1, 1] given a time value and a seed.
 */
function noise(t: number, seed: number): number {
	const x = Math.sin(t * seed * 12.9898 + seed * 78.233) * 43758.5453;
	return (x - Math.floor(x)) * 2 - 1;
}

// ---------------------------------------------------------------------------
// Preset factory methods
// ---------------------------------------------------------------------------

/**
 * Compression shake — the build-up portion.
 * Gentle vibration that gets used alongside a slam shake at the end.
 */
export function createCompressionShake(): ShakeConfig {
	return {
		intensity: 0.15,
		frequency: 12,
		duration: 2.5,
		decayType: "none",
	};
}

/** Damage shake — sharp burst, quick exponential decay. */
export function createDamageShake(): ShakeConfig {
	return {
		intensity: 0.5,
		frequency: 25,
		duration: 0.3,
		decayType: "exponential",
	};
}

/** Explosion shake — big burst, slow linear decay. */
export function createExplosionShake(): ShakeConfig {
	return {
		intensity: 0.9,
		frequency: 15,
		duration: 1.2,
		decayType: "linear",
	};
}

/** Footstep shake — tiny, rhythmic. */
export function createFootstepShake(): ShakeConfig {
	return {
		intensity: 0.03,
		frequency: 8,
		duration: 0.12,
		decayType: "linear",
	};
}

/** Mining shake — medium, rhythmic during grind. */
export function createMiningShake(): ShakeConfig {
	return {
		intensity: 0.2,
		frequency: 18,
		duration: 0.4,
		decayType: "linear",
	};
}

/** Cube drop shake — brief thud impact. */
export function createCubeDropShake(): ShakeConfig {
	return {
		intensity: 0.25,
		frequency: 20,
		duration: 0.2,
		decayType: "exponential",
	};
}

// Register all built-in presets
presets.compression = createCompressionShake;
presets.damage = createDamageShake;
presets.explosion = createExplosionShake;
presets.footstep = createFootstepShake;
presets.mining = createMiningShake;
presets.cubeDrop = createCubeDropShake;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Trigger a shake from a ShakeConfig. Returns the shake ID.
 */
export function triggerShake(config: ShakeConfig): string {
	const id = `shake_${nextShakeId++}`;
	activeShakes.push({
		id,
		config: { ...config },
		elapsed: 0,
		seed: nextShakeId * 7.13 + 1.37,
	});
	return id;
}

/**
 * Trigger a shake from a named preset. Returns the shake ID.
 * Throws if the preset name is not registered.
 */
export function triggerShakePreset(preset: string): string {
	const factory = presets[preset];
	if (!factory) {
		throw new Error(`Unknown shake preset: "${preset}"`);
	}
	return triggerShake(factory());
}

/**
 * Advance all active shakes by delta seconds and return the combined output.
 */
export function updateShakes(delta: number): ShakeOutput {
	let totalOffsetX = 0;
	let totalOffsetY = 0;
	let totalRotation = 0;

	// Advance and accumulate each active shake
	const surviving: ActiveShake[] = [];

	for (const shake of activeShakes) {
		shake.elapsed += delta;

		// Remove finished shakes
		if (shake.elapsed >= shake.config.duration) {
			continue;
		}

		const decay = computeDecay(
			shake.config.decayType,
			shake.elapsed,
			shake.config.duration,
		);

		const t = shake.elapsed * shake.config.frequency * TWO_PI;
		const effectiveIntensity = shake.config.intensity * decay * globalMultiplier;

		totalOffsetX += Math.sin(t) * effectiveIntensity;
		totalOffsetY += Math.cos(t * 1.3 + shake.seed) * effectiveIntensity;
		totalRotation +=
			noise(t * 0.7, shake.seed) * effectiveIntensity * 0.1;

		surviving.push(shake);
	}

	activeShakes = surviving;

	// Advance flash
	let currentFlashIntensity = 0;
	let currentFlashColor = flashColor;

	if (flashActive) {
		flashElapsed += delta;
		if (flashElapsed >= flashDuration) {
			flashActive = false;
			currentFlashIntensity = 0;
		} else {
			// Flash decays linearly
			const flashDecay = Math.max(0, 1 - flashElapsed / flashDuration);
			currentFlashIntensity = flashPeakIntensity * flashDecay;
		}
		currentFlashColor = flashColor;
	}

	// Clamp combined values
	const clampedOffsetX = Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, totalOffsetX));
	const clampedOffsetY = Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, totalOffsetY));
	const clampedRotation = Math.max(
		-MAX_ROTATION,
		Math.min(MAX_ROTATION, totalRotation),
	);
	const clampedFlash = Math.min(MAX_FLASH, currentFlashIntensity);

	return {
		offsetX: clampedOffsetX,
		offsetY: clampedOffsetY,
		rotation: clampedRotation,
		flashIntensity: clampedFlash,
		flashColor: currentFlashColor,
	};
}

/**
 * Cancel a specific shake by ID.
 */
export function cancelShake(id: string): void {
	activeShakes = activeShakes.filter((s) => s.id !== id);
}

/**
 * Cancel all active shakes immediately.
 */
export function cancelAllShakes(): void {
	activeShakes = [];
}

/**
 * Get the number of currently active shakes.
 */
export function getActiveShakeCount(): number {
	return activeShakes.length;
}

/**
 * Trigger a screen flash effect (damage, compression slam, etc.).
 */
export function triggerFlash(
	color: string,
	intensity: number,
	duration: number,
): void {
	flashActive = true;
	flashElapsed = 0;
	flashDuration = duration;
	flashPeakIntensity = Math.min(intensity, MAX_FLASH);
	flashColor = color;
}

/**
 * Set the global shake intensity multiplier (accessibility / settings).
 * 0 disables all shakes, 1 is default, >1 amplifies.
 */
export function setShakeMultiplier(mult: number): void {
	globalMultiplier = Math.max(0, mult);
}

/**
 * Get the current global shake intensity multiplier.
 */
export function getShakeMultiplier(): number {
	return globalMultiplier;
}

/**
 * Reset all state — for testing.
 */
export function reset(): void {
	activeShakes = [];
	nextShakeId = 0;
	globalMultiplier = 1.0;
	flashActive = false;
	flashElapsed = 0;
	flashDuration = 0;
	flashPeakIntensity = 0;
	flashColor = "#ffffff";
}
