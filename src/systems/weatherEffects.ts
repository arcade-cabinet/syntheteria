/**
 * Weather effects system — bridges weather states to gameplay mechanics.
 *
 * weatherSystem.ts tracks state transitions and storm intensity.
 * This module maps each weather state to concrete gameplay modifiers:
 * movement speed, visibility, perception, accuracy, cube exposure damage,
 * lightning bonuses, audio presets, skybox tinting, and particle density.
 *
 * Pure mapping logic with hardcoded presets. No config imports.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WeatherModifiers {
	movementSpeedMult: number;
	visibilityRange: number;
	perceptionRangeMult: number;
	lightningChanceMult: number;
	combatAccuracyMult: number;
	harvestSpeedMult: number;
	cubeExposureDamagePerSec: number;
	ambientSoundPreset: string;
	skyboxTint: string;
	particleDensity: number;
}

export type WeatherPreset =
	| "clear"
	| "cloudy"
	| "rain"
	| "storm"
	| "fog"
	| "acid_rain";

// ---------------------------------------------------------------------------
// Presets
// ---------------------------------------------------------------------------

const PRESETS: Record<WeatherPreset, WeatherModifiers> = {
	clear: {
		movementSpeedMult: 1.0,
		visibilityRange: 500,
		perceptionRangeMult: 1.0,
		lightningChanceMult: 1.0,
		combatAccuracyMult: 1.0,
		harvestSpeedMult: 1.0,
		cubeExposureDamagePerSec: 0,
		ambientSoundPreset: "clear",
		skyboxTint: "#ffffff",
		particleDensity: 0,
	},
	cloudy: {
		movementSpeedMult: 1.0,
		visibilityRange: 350,
		perceptionRangeMult: 0.9,
		lightningChanceMult: 1.0,
		combatAccuracyMult: 1.0,
		harvestSpeedMult: 1.0,
		cubeExposureDamagePerSec: 0,
		ambientSoundPreset: "clear",
		skyboxTint: "#c8c8c8",
		particleDensity: 0,
	},
	rain: {
		movementSpeedMult: 0.8,
		visibilityRange: 350,
		perceptionRangeMult: 0.8,
		lightningChanceMult: 1.5,
		combatAccuracyMult: 0.9,
		harvestSpeedMult: 0.85,
		cubeExposureDamagePerSec: 0.1,
		ambientSoundPreset: "rain",
		skyboxTint: "#8899aa",
		particleDensity: 0.6,
	},
	storm: {
		movementSpeedMult: 0.6,
		visibilityRange: 200,
		perceptionRangeMult: 0.6,
		lightningChanceMult: 3.0,
		combatAccuracyMult: 0.7,
		harvestSpeedMult: 0.6,
		cubeExposureDamagePerSec: 0.5,
		ambientSoundPreset: "storm",
		skyboxTint: "#445566",
		particleDensity: 1.0,
	},
	fog: {
		movementSpeedMult: 1.0,
		visibilityRange: 150,
		perceptionRangeMult: 0.5,
		lightningChanceMult: 1.0,
		combatAccuracyMult: 0.8,
		harvestSpeedMult: 1.0,
		cubeExposureDamagePerSec: 0,
		ambientSoundPreset: "fog",
		skyboxTint: "#aabbcc",
		particleDensity: 0.3,
	},
	acid_rain: {
		movementSpeedMult: 0.7,
		visibilityRange: 250,
		perceptionRangeMult: 0.7,
		lightningChanceMult: 1.5,
		combatAccuracyMult: 0.85,
		harvestSpeedMult: 0.7,
		cubeExposureDamagePerSec: 1.0,
		ambientSoundPreset: "rain",
		skyboxTint: "#667744",
		particleDensity: 0.7,
	},
};

const VALID_PRESETS = new Set<string>(Object.keys(PRESETS));

// ---------------------------------------------------------------------------
// Hazard warnings
// ---------------------------------------------------------------------------

const HAZARD_WARNINGS: Partial<Record<WeatherPreset, string>> = {
	storm: "Storm incoming — protect your cubes!",
	acid_rain: "Acid rain detected — cubes and bots take corrosion damage!",
	fog: "Dense fog — perception and accuracy reduced.",
};

// ---------------------------------------------------------------------------
// Visibility colors (for post-processing)
// ---------------------------------------------------------------------------

const VISIBILITY_COLORS: Record<WeatherPreset, { fog: string; tint: string }> = {
	clear: { fog: "#ffffff", tint: "#ffffff" },
	cloudy: { fog: "#d0d0d0", tint: "#c8c8c8" },
	rain: { fog: "#778899", tint: "#8899aa" },
	storm: { fog: "#334455", tint: "#445566" },
	fog: { fog: "#99aabb", tint: "#aabbcc" },
	acid_rain: { fog: "#556633", tint: "#667744" },
};

// ---------------------------------------------------------------------------
// Mutable override (for testing)
// ---------------------------------------------------------------------------

let overridePresets: Record<string, WeatherModifiers> | null = null;

// ---------------------------------------------------------------------------
// Core API
// ---------------------------------------------------------------------------

/**
 * Resolve a weather state string to its full set of gameplay modifiers.
 * Unknown states fall back to "clear".
 */
export function getWeatherModifiers(weatherState: string): WeatherModifiers {
	if (overridePresets && weatherState in overridePresets) {
		return { ...overridePresets[weatherState] };
	}
	const key = VALID_PRESETS.has(weatherState)
		? (weatherState as WeatherPreset)
		: "clear";
	return { ...PRESETS[key] };
}

/**
 * Apply movement speed modifier for the given weather.
 */
export function applyMovementModifier(
	baseSpeed: number,
	weather: string,
): number {
	return baseSpeed * getWeatherModifiers(weather).movementSpeedMult;
}

/**
 * Apply combat accuracy modifier for the given weather.
 */
export function applyAccuracyModifier(
	baseAccuracy: number,
	weather: string,
): number {
	return baseAccuracy * getWeatherModifiers(weather).combatAccuracyMult;
}

/**
 * Calculate total cube exposure damage for a time delta.
 *
 * @param cubeCount  Number of exposed cubes
 * @param isExposed  Whether the cubes are uncovered
 * @param weather    Current weather state string
 * @param delta      Time elapsed in seconds
 * @returns Total damage across all exposed cubes
 */
export function applyCubeDamage(
	cubeCount: number,
	isExposed: boolean,
	weather: string,
	delta: number,
): number {
	if (!isExposed || cubeCount <= 0 || delta <= 0) return 0;
	const dmgPerSec = getWeatherModifiers(weather).cubeExposureDamagePerSec;
	return cubeCount * dmgPerSec * delta;
}

/**
 * Calculate the effective perception range for AI detection.
 */
export function getEffectivePerceptionRange(
	baseRange: number,
	weather: string,
): number {
	return baseRange * getWeatherModifiers(weather).perceptionRangeMult;
}

/**
 * Returns true if the current weather provides a lightning rod bonus.
 * Storm has lightningChanceMult >= 2.0.
 */
export function isLightningBoosted(weather: string): boolean {
	return getWeatherModifiers(weather).lightningChanceMult >= 2.0;
}

/**
 * Returns a hazard warning string for dangerous weather, or null if safe.
 */
export function getWeatherHazardWarning(weather: string): string | null {
	if (!VALID_PRESETS.has(weather)) return null;
	return HAZARD_WARNINGS[weather as WeatherPreset] ?? null;
}

/**
 * Returns fog and tint colors for post-processing effects.
 */
export function getVisibilityColor(
	weather: string,
): { fog: string; tint: string } {
	const key = VALID_PRESETS.has(weather)
		? (weather as WeatherPreset)
		: "clear";
	return { ...VISIBILITY_COLORS[key] };
}

/**
 * Reset all mutable state. For testing.
 */
export function reset(): void {
	overridePresets = null;
}

/**
 * Override presets (test helper). Merged on top of defaults.
 * Call reset() to clear.
 */
export function _setOverridePresets(
	overrides: Record<string, WeatherModifiers>,
): void {
	overridePresets = overrides;
}
