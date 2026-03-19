/**
 * Pure logic for unit visual properties.
 *
 * Badge colors, damage visuals, and cultist identity are config-driven (unitVisuals.json).
 * All functions are pure — no side effects, no ECS reads.
 */

import { parseHexColor, unitVisualsConfig } from "../config/unitVisuals";
import type { UnitVisualsCultistResolved } from "../config/unitVisuals.types";

/** Roman numeral labels for Mark levels */
export const MARK_LABELS: Record<number, string> = {
	1: "I",
	2: "II",
	3: "III",
	4: "IV",
	5: "V",
};

/** Resolved cultist config with hex strings parsed to numbers (cached) */
let cachedCultist: UnitVisualsCultistResolved | null = null;

/**
 * Get cultist visual config with parsed hex colors. Used by UnitRenderer for tint/aura.
 */
export function getCultistVisualConfig(): UnitVisualsCultistResolved {
	if (cachedCultist) return cachedCultist;
	const c = unitVisualsConfig.cultist;
	cachedCultist = {
		tint: parseHexColor(c.tint),
		emissive: parseHexColor(c.emissive),
		materialEmissive: parseHexColor(c.materialEmissive),
		auraColor: parseHexColor(c.auraColor),
		materialLerpColor: parseHexColor(c.materialLerpColor),
		materialLerpAmount: c.materialLerpAmount,
		emissiveIntensity: c.emissiveIntensity,
		roughnessMax: c.roughnessMax,
		metalnessMin: c.metalnessMin,
		auraRingInner: c.auraRingInner,
		auraRingOuter: c.auraRingOuter,
		auraOpacityBase: c.auraOpacityBase,
		auraOpacityPulseAmplitude: c.auraOpacityPulseAmplitude,
		auraPulseSpeed: c.auraPulseSpeed,
	};
	return cachedCultist;
}

/**
 * Get the badge color for a given Mark level (from config).
 * Returns null for invalid levels (<=0 or >5).
 */
export function getBadgeColor(markLevel: number): number | null {
	if (markLevel < 1 || markLevel > 5) return null;
	const hex = unitVisualsConfig.markBadgeColors[String(markLevel)];
	return hex != null ? parseHexColor(hex) : null;
}

/**
 * Get the Roman numeral label for a given Mark level.
 * Returns null for invalid levels.
 */
export function getBadgeLabel(markLevel: number): string | null {
	if (markLevel < 1 || markLevel > 5) return null;
	return MARK_LABELS[markLevel] ?? null;
}

/**
 * Calculate the damage ratio from a unit's component list.
 * Returns 0.0 (fully functional) to 1.0 (all components broken).
 * Returns 0 if the unit has no components.
 */
export function getDamageRatio(components: { functional: boolean }[]): number {
	if (components.length === 0) return 0;
	const broken = components.filter((c) => !c.functional).length;
	return broken / components.length;
}

/**
 * Determine if a unit should display the cultist visual identity.
 * Cultist and rogue factions get the distinct cultist tint.
 */
export function isCultistVisual(faction: string): boolean {
	return faction === "cultist" || faction === "rogue";
}

/**
 * Get visual degradation parameters based on damage ratio (from config).
 * - opacity, glowIntensity, desaturation driven by damageVisuals config
 * - sparking when damage ratio >= sparkingThreshold
 */
export function getDamageVisuals(damageRatio: number): {
	opacity: number;
	glowIntensity: number;
	desaturation: number;
	sparking: boolean;
} {
	const d = unitVisualsConfig.damageVisuals;
	const clamped = Math.max(0, Math.min(1, damageRatio));
	const opacityRange = 1.0 - d.opacityMin;
	const glowRange = 1.0 - d.glowIntensityMin;
	return {
		opacity: 1.0 - clamped * opacityRange,
		glowIntensity: 1.0 - clamped * glowRange,
		desaturation: clamped * d.desaturationMax,
		sparking: clamped >= d.sparkingThreshold,
	};
}
