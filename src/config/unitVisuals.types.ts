/**
 * Types for unitVisuals.json — cultist identity, mark badges, damage visuals.
 */

export interface UnitVisualsCultist {
	tint: string;
	emissive: string;
	materialEmissive: string;
	auraColor: string;
	materialLerpColor: string;
	materialLerpAmount: number;
	emissiveIntensity: number;
	roughnessMax: number;
	metalnessMin: number;
	auraRingInner: number;
	auraRingOuter: number;
	auraOpacityBase: number;
	auraOpacityPulseAmplitude: number;
	auraPulseSpeed: number;
}

export interface UnitVisualsDamage {
	sparkingThreshold: number;
	opacityMin: number;
	glowIntensityMin: number;
	desaturationMax: number;
}

export interface UnitVisualsConfig {
	cultist: UnitVisualsCultist;
	markBadgeColors: Record<string, string>;
	damageVisuals: UnitVisualsDamage;
}

/** Cultist config with hex strings resolved to numbers (for rendering) */
export interface UnitVisualsCultistResolved {
	tint: number;
	emissive: number;
	materialEmissive: number;
	auraColor: number;
	materialLerpColor: number;
	materialLerpAmount: number;
	emissiveIntensity: number;
	roughnessMax: number;
	metalnessMin: number;
	auraRingInner: number;
	auraRingOuter: number;
	auraOpacityBase: number;
	auraOpacityPulseAmplitude: number;
	auraPulseSpeed: number;
}
