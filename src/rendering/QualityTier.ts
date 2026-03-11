/**
 * Quality tier detection and settings for Syntheteria.
 *
 * Detects device capability using available browser signals and returns
 * a tier (high / medium / low) that controls shadow resolution, particle
 * count, LOD distances, and audio polyphony limits.
 *
 * Tier detection heuristics (synchronous, no GPU queries):
 *   - Device pixel ratio   ≥ 2 → mobile-class device, start medium/low
 *   - Hardware concurrency ≤ 4 → constrained CPU, drop a tier
 *   - Touch-primary device → assume mobile, start medium
 *   - DeviceMemory API     < 4 GB → low tier
 *
 * After startup, the PerformanceMonitor in R3F can call `adjustTier(ratio)`
 * to promote or demote based on measured FPS.
 *
 * All config values come from config/rendering.json and config/audio.json
 * qualityTiers sections, so balance changes require no code edits.
 */

import renderingConfig from "../../config/rendering.json";
import audioConfig from "../../config/audio.json";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type QualityTierName = "high" | "medium" | "low";

export interface RenderingQuality {
	shadowMapSize: number;
	maxParticles: number;
	lodDistances: number[];
	instancedBatchSize: number;
	renderDistance: number;
	antialias: boolean;
	postProcessing: boolean;
}

export interface AudioQuality {
	maxPolyphony: number;
	spatialAudioEnabled: boolean;
	biomeAmbienceEnabled: boolean;
	adaptiveMusicEnabled: boolean;
	reverbEnabled: boolean;
}

export interface QualitySettings {
	tier: QualityTierName;
	rendering: RenderingQuality;
	audio: AudioQuality;
}

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

let currentTier: QualityTierName = "high";

// ---------------------------------------------------------------------------
// Detection
// ---------------------------------------------------------------------------

/**
 * Detect the appropriate quality tier from browser/device signals.
 * Call once at startup before the R3F canvas mounts.
 */
export function detectQualityTier(): QualityTierName {
	// navigator.deviceMemory is non-standard but widely supported on Android/Chrome
	const memory = (navigator as Navigator & { deviceMemory?: number })
		.deviceMemory;
	if (memory !== undefined && memory < 4) {
		currentTier = "low";
		return currentTier;
	}

	// Touch-primary + high DPR → likely a phone
	const isTouch =
		typeof window !== "undefined" &&
		window.matchMedia("(pointer: coarse)").matches;
	const dpr =
		typeof window !== "undefined" ? window.devicePixelRatio ?? 1 : 1;
	const cores = navigator.hardwareConcurrency ?? 4;

	if (isTouch && dpr >= 2 && cores <= 4) {
		currentTier = "low";
		return currentTier;
	}

	if (isTouch || (dpr >= 2 && cores <= 6)) {
		currentTier = "medium";
		return currentTier;
	}

	currentTier = "high";
	return currentTier;
}

/**
 * Override the current tier. Used by PerformanceMonitor callbacks.
 *
 * @param tier - The new tier to apply.
 */
export function setQualityTier(tier: QualityTierName): void {
	currentTier = tier;
}

/**
 * Adjust tier based on a measured performance ratio (0-1).
 * Called by R3F PerformanceMonitor with its `factor` value.
 *
 *   factor < 0.5  → downgrade one tier
 *   factor > 0.9  → upgrade one tier
 */
export function adjustTierByPerformance(factor: number): void {
	if (factor < 0.5) {
		if (currentTier === "high") currentTier = "medium";
		else if (currentTier === "medium") currentTier = "low";
	} else if (factor > 0.9) {
		if (currentTier === "low") currentTier = "medium";
		else if (currentTier === "medium") currentTier = "high";
	}
}

/**
 * Get the current tier name.
 */
export function getQualityTier(): QualityTierName {
	return currentTier;
}

/**
 * Get full quality settings for the current tier.
 */
export function getQualitySettings(): QualitySettings {
	const t = currentTier;
	return {
		tier: t,
		rendering: renderingConfig.qualityTiers[t] as RenderingQuality,
		audio: audioConfig.qualityTiers[t] as AudioQuality,
	};
}

/**
 * Get rendering settings for the current tier.
 */
export function getRenderingQuality(): RenderingQuality {
	return renderingConfig.qualityTiers[currentTier] as RenderingQuality;
}

/**
 * Get audio settings for the current tier.
 */
export function getAudioQuality(): AudioQuality {
	return audioConfig.qualityTiers[currentTier] as AudioQuality;
}

// ---------------------------------------------------------------------------
// Reset (for tests)
// ---------------------------------------------------------------------------

/** Reset to default high tier. Used in tests. */
export function _resetQualityTier(): void {
	currentTier = "high";
}
