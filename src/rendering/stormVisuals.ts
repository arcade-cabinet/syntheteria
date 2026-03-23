/**
 * Pure logic for storm/wormhole visual parameters.
 *
 * All functions consume weather system state (storm intensity 0.0–1.5)
 * and return visual parameters. No side effects, no ECS reads.
 *
 * Storm profiles drive color grading:
 * - "standard" (volatile): purple/dark clouds
 * - "surge": brighter, more saturated purples/blues
 * - "calm" (stable): muted grays
 */

export type StormVisualProfile = "standard" | "surge" | "calm";

export interface StormColorGrade {
	darkCloud: [number, number, number];
	lightCloud: [number, number, number];
	wormholeColor: [number, number, number];
	lightningColor: [number, number, number];
}

/** Color grades per storm profile */
export const STORM_COLOR_GRADES: Record<StormVisualProfile, StormColorGrade> = {
	standard: {
		darkCloud: [0.02, 0.02, 0.04],
		lightCloud: [0.08, 0.06, 0.12],
		wormholeColor: [0.3, 0.1, 0.5],
		lightningColor: [0.6, 0.7, 1.0],
	},
	surge: {
		darkCloud: [0.04, 0.02, 0.08],
		lightCloud: [0.15, 0.08, 0.2],
		wormholeColor: [0.5, 0.15, 0.8],
		lightningColor: [0.8, 0.85, 1.0],
	},
	calm: {
		darkCloud: [0.03, 0.03, 0.035],
		lightCloud: [0.06, 0.06, 0.07],
		wormholeColor: [0.15, 0.08, 0.25],
		lightningColor: [0.4, 0.5, 0.7],
	},
};

/**
 * Determine the visual profile from storm intensity.
 * >= 1.0 is "surge", <= 0.4 is "calm", otherwise "standard".
 */
export function getStormVisualProfile(
	stormIntensity: number,
): StormVisualProfile {
	if (stormIntensity >= 1.0) return "surge";
	if (stormIntensity <= 0.4) return "calm";
	return "standard";
}

/**
 * Get storm particle density (0.0 = none, 1.0 = maximum).
 * Maps storm intensity to visual density with clamping.
 */
export function getParticleDensity(stormIntensity: number): number {
	return Math.max(0, Math.min(1, stormIntensity));
}

/**
 * Get the target particle count for a given intensity.
 * Scales linearly from 0 to maxParticles.
 */
export function getParticleCount(
	stormIntensity: number,
	maxParticles: number,
): number {
	const density = getParticleDensity(stormIntensity);
	return Math.floor(density * maxParticles);
}

/**
 * Get lightning flash frequency per second based on storm intensity.
 * 0 at calm, up to 8 flashes/sec during surges.
 */
export function getLightningFrequency(stormIntensity: number): number {
	if (stormIntensity <= 0.3) return 0;
	return Math.min(8, (stormIntensity - 0.3) * 10);
}

/**
 * Get wormhole glow brightness (0.0–1.0).
 * Scales with storm intensity: brighter during surges.
 * Wormhole becomes visible from mid-game onward (controlled by gameTick threshold).
 */
export function getWormholeGlow(
	stormIntensity: number,
	gameTick: number,
	wormholeVisibleTick: number,
): number {
	if (gameTick < wormholeVisibleTick) return 0;
	// Fade in over 600 ticks (~10 seconds at 60fps)
	const fadeIn = Math.min(1, (gameTick - wormholeVisibleTick) / 600);
	const intensityScale = 0.3 + stormIntensity * 0.7;
	return fadeIn * intensityScale;
}

/** Tick threshold after which wormhole becomes visible (mid-game ~5min at 60fps) */
export const WORMHOLE_VISIBLE_TICK = 18000;

/**
 * Get color grade for current storm profile.
 */
export function getStormColorGrade(stormIntensity: number): StormColorGrade {
	const profile = getStormVisualProfile(stormIntensity);
	return STORM_COLOR_GRADES[profile];
}
