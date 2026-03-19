/**
 * Weather & storm configuration — gameplay multipliers.
 *
 * Converted from pending/config/weather.json to TypeScript const objects.
 * This file contains the GAMEPLAY-relevant weather parameters (how weather
 * affects power generation, repair speed, visibility, and cultist activity).
 *
 * Visual weather parameters (rain particles, cloud speed, lightning aesthetics)
 * belong in the rendering layer and are NOT included here.
 */

import type { StormProfile } from "../world/config";

// ─── Visibility Multipliers ──────────────────────────────────────────────────

/**
 * How weather conditions affect unit scan range.
 * Applied as a multiplier to base scanRange.
 */
export const WEATHER_VISIBILITY = {
	clearMultiplier: 1.0,
	lightRainMultiplier: 0.9,
	heavyRainMultiplier: 0.7,
	surgeMultiplier: 0.5,
	/** Night penalty is applied multiplicatively on top of weather. */
	nightPenalty: 0.6,
} as const;

// ─── Power Generation Multipliers ────────────────────────────────────────────

/**
 * Lightning rod output = rodCapacity * stormIntensity * dayNightMultiplier.
 */
export const POWER_GENERATION = {
	dayMultiplier: 1.0,
	nightMultiplier: 0.6,
} as const;

// ─── Cultist Activity Multipliers ────────────────────────────────────────────

/**
 * Cultists worship the wormhole and are more active at night.
 */
export const CULTIST_ACTIVITY = {
	dayMultiplier: 0.7,
	nightMultiplier: 1.3,
} as const;

// ─── Repair Speed Multipliers ────────────────────────────────────────────────

/**
 * Heavy rain slows outdoor repair work.
 */
export const REPAIR_SPEED = {
	clearMultiplier: 1.0,
	stormMultiplier: 0.7,
} as const;

// ─── Storm Visual Parameters (per profile) ───────────────────────────────────

export interface StormVisualParams {
	readonly rainParticleCount: number;
	readonly rainAlphaBase: number;
	readonly rainAlphaStorm: number;
	readonly windSpeedBase: number;
	readonly windSpeedStorm: number;
	readonly cloudSpeed: number;
	readonly cloudDetailScale: number;
	readonly lightningIntervalMin: number;
	readonly lightningIntervalMax: number;
	readonly rodCaptureChance: number;
	readonly debrisThreshold: number;
	readonly fogDensity: number;
	readonly skyTintShift: number;
}

export const STORM_VISUAL_PARAMS: Record<StormProfile, StormVisualParams> = {
	stable: {
		rainParticleCount: 800,
		rainAlphaBase: 0.12,
		rainAlphaStorm: 0.18,
		windSpeedBase: 2.0,
		windSpeedStorm: 4.0,
		cloudSpeed: 0.04,
		cloudDetailScale: 6.0,
		lightningIntervalMin: 15.0,
		lightningIntervalMax: 25.0,
		rodCaptureChance: 0.1,
		debrisThreshold: 999,
		fogDensity: 0.3,
		skyTintShift: 0.0,
	},
	volatile: {
		rainParticleCount: 1400,
		rainAlphaBase: 0.15,
		rainAlphaStorm: 0.25,
		windSpeedBase: 3.0,
		windSpeedStorm: 6.0,
		cloudSpeed: 0.08,
		cloudDetailScale: 8.0,
		lightningIntervalMin: 5.0,
		lightningIntervalMax: 12.0,
		rodCaptureChance: 0.3,
		debrisThreshold: 0.9,
		fogDensity: 0.5,
		skyTintShift: 0.3,
	},
	cataclysmic: {
		rainParticleCount: 2000,
		rainAlphaBase: 0.2,
		rainAlphaStorm: 0.35,
		windSpeedBase: 5.0,
		windSpeedStorm: 9.0,
		cloudSpeed: 0.14,
		cloudDetailScale: 10.0,
		lightningIntervalMin: 3.0,
		lightningIntervalMax: 6.0,
		rodCaptureChance: 0.6,
		debrisThreshold: 0.82,
		fogDensity: 0.8,
		skyTintShift: 0.7,
	},
} as const;

// ─── Wormhole Day/Night Cycle ────────────────────────────────────────────────

/**
 * The wormhole IS the sun. Its glow cycle defines day/night.
 */
export const WORMHOLE_CYCLE = {
	minGlowIntensity: 0.15,
	maxGlowIntensity: 1.0,
	glowColor: {
		day: [0.35, 0.1, 0.55] as const,
		night: [0.08, 0.02, 0.12] as const,
	},
	ambientLight: {
		dayIntensity: 0.45,
		nightIntensity: 0.08,
		dayColor: [0.08, 0.06, 0.14] as const,
		nightColor: [0.02, 0.01, 0.04] as const,
	},
	directionalLight: {
		dayIntensity: 0.7,
		nightIntensity: 0.1,
		color: [0.47, 0.27, 0.67] as const,
	},
} as const;
