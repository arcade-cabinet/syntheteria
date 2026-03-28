/**
 * epochVisualDefs — renderer-agnostic visual atmosphere per epoch.
 *
 * Single source of truth for how each epoch LOOKS. No rendering library
 * dependency — just RGB tuples, intensity floats, and descriptive labels.
 *
 * The progression: clear sunny day → gathering clouds → storm → deep storm → transcendence.
 *
 * Consumed by: atmosphere renderers (Babylon, Three, CSS, whatever).
 * NOT consumed by: gameplay systems (those use EPOCHS in epochDefs.ts).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EpochVisualDef {
	/** Epoch number 1-5. */
	readonly number: 1 | 2 | 3 | 4 | 5;
	/** Human-readable epoch name. */
	readonly name: string;
	/** Short description of the visual mood. */
	readonly mood: string;

	// ── Sky ──────────────────────────────────────────────────────────────
	/** Sky color at zenith [r,g,b] 0-1. */
	readonly skyZenith: readonly [number, number, number];
	/** Sky color at horizon [r,g,b] 0-1. */
	readonly skyHorizon: readonly [number, number, number];
	/** Scene clear/background color [r,g,b] 0-1 (for renderers that need it). */
	readonly backgroundColor: readonly [number, number, number];

	// ── Lighting ─────────────────────────────────────────────────────────
	/** Ambient/fill light color [r,g,b] 0-1. */
	readonly ambientColor: readonly [number, number, number];
	/** Ambient light intensity multiplier. */
	readonly ambientIntensity: number;
	/** Sun/directional light color [r,g,b] 0-1. */
	readonly sunColor: readonly [number, number, number];
	/** Sun light intensity multiplier. */
	readonly sunIntensity: number;

	// ── Fog / atmosphere ─────────────────────────────────────────────────
	/** Fog color [r,g,b] 0-1. */
	readonly fogColor: readonly [number, number, number];
	/** Fog density (0 = no fog, 0.02 = heavy). */
	readonly fogDensity: number;

	// ── Weather effects ──────────────────────────────────────────────────
	/** Rain particle density (0 = none, 50 = heavy storm). */
	readonly rainDensity: number;
	/** Lightning flash interval range [minSeconds, maxSeconds]. null = no lightning. */
	readonly lightningInterval: readonly [number, number] | null;

	// ── Accent lights ────────────────────────────────────────────────────
	/** Optional colored accent lights for dramatic effect. */
	readonly accentLights: readonly EpochAccentLight[];
}

export interface EpochAccentLight {
	readonly color: readonly [number, number, number];
	readonly intensity: number;
	readonly distance: number;
	/** Position relative to planet/board center. */
	readonly offset: readonly [number, number, number];
}

// ---------------------------------------------------------------------------
// Definitions
// ---------------------------------------------------------------------------

export const EPOCH_VISUALS: readonly EpochVisualDef[] = [
	// ── Epoch 1: Emergence ── Dark dead ecumenopolis. Dim glow from circuits.
	{
		number: 1,
		name: "Emergence",
		mood: "Dark sealed city. Faint cyan glow from ancient circuits. Storm overhead.",
		skyZenith: [0.02, 0.04, 0.08],
		skyHorizon: [0.03, 0.06, 0.1],
		backgroundColor: [0.012, 0.027, 0.043], // #03070b dark void
		ambientColor: [0.12, 0.15, 0.2], // cool dark fill
		ambientIntensity: 0.5,
		sunColor: [0.67, 0.8, 1.0], // cool blue-white
		sunIntensity: Math.PI * 0.8,
		fogColor: [0.012, 0.027, 0.043], // matches void
		fogDensity: 0.015,
		rainDensity: 0,
		lightningInterval: null,
		accentLights: [
			{
				color: [0.0, 1.0, 1.0], // cyan accent
				intensity: 2,
				distance: 30,
				offset: [0, 8, 0],
			},
		],
	},
	// ── Epoch 2: Expansion ── Clouds forming. Storm hints at horizon.
	{
		number: 2,
		name: "Expansion",
		mood: "First clouds. Wind picking up. Sky shifts blue-grey.",
		skyZenith: [0.2, 0.38, 0.55],
		skyHorizon: [0.45, 0.55, 0.65],
		backgroundColor: [0.17, 0.23, 0.29],
		ambientColor: [0.29, 0.33, 0.4],
		ambientIntensity: 0.95,
		sunColor: [0.8, 0.87, 0.93],
		sunIntensity: 1.0,
		fogColor: [0.17, 0.23, 0.29],
		fogDensity: 0.005,
		rainDensity: 10,
		lightningInterval: null,
		accentLights: [],
	},
	// ── Epoch 3: Consolidation ── Storm approaching.
	{
		number: 3,
		name: "Consolidation",
		mood: "Storm approaching. Fog thickens. Lightning begins.",
		skyZenith: [0.12, 0.22, 0.32],
		skyHorizon: [0.25, 0.35, 0.45],
		backgroundColor: [0.09, 0.16, 0.22],
		ambientColor: [0.23, 0.29, 0.35],
		ambientIntensity: 0.8,
		sunColor: [0.73, 0.87, 1.0],
		sunIntensity: 1.1,
		fogColor: [0.09, 0.16, 0.22],
		fogDensity: 0.008,
		rainDensity: 25,
		lightningInterval: [20, 40],
		accentLights: [
			{
				color: [0.4, 0.53, 0.8],
				intensity: 0.5,
				distance: 50,
				offset: [-20, 15, -20],
			},
			{
				color: [0.27, 0.4, 0.67],
				intensity: 0.4,
				distance: 40,
				offset: [30, 12, 25],
			},
		],
	},
	// ── Epoch 4: Convergence ── Deep storm. Dramatic.
	{
		number: 4,
		name: "Convergence",
		mood: "Full storm. Dense fog. Magenta/red accent lights.",
		skyZenith: [0.1, 0.08, 0.18],
		skyHorizon: [0.18, 0.14, 0.25],
		backgroundColor: [0.1, 0.08, 0.15],
		ambientColor: [0.21, 0.15, 0.25],
		ambientIntensity: 0.7,
		sunColor: [0.67, 0.67, 0.8],
		sunIntensity: 0.9,
		fogColor: [0.1, 0.08, 0.15],
		fogDensity: 0.01,
		rainDensity: 40,
		lightningInterval: [10, 20],
		accentLights: [
			{
				color: [0.8, 0.2, 0.4],
				intensity: 0.8,
				distance: 60,
				offset: [-15, 10, -15],
			},
			{
				color: [1.0, 0.13, 0.27],
				intensity: 0.6,
				distance: 50,
				offset: [25, 8, 20],
			},
		],
	},
	// ── Epoch 5: Transcendence ── Wormhole glow. Otherworldly.
	{
		number: 5,
		name: "Transcendence",
		mood: "Heavy storm. Pulsing wormhole glow. The end approaches.",
		skyZenith: [0.08, 0.04, 0.15],
		skyHorizon: [0.15, 0.1, 0.22],
		backgroundColor: [0.1, 0.06, 0.16],
		ambientColor: [0.16, 0.09, 0.22],
		ambientIntensity: 0.6,
		sunColor: [0.6, 0.53, 0.8],
		sunIntensity: 0.8,
		fogColor: [0.1, 0.06, 0.16],
		fogDensity: 0.012,
		rainDensity: 50,
		lightningInterval: [5, 10],
		accentLights: [
			{
				color: [0.53, 0.27, 1.0],
				intensity: 1.2,
				distance: 80,
				offset: [0, 30, 0],
			},
			{
				color: [1.0, 0.13, 0.67],
				intensity: 0.9,
				distance: 60,
				offset: [-20, 10, -10],
			},
		],
	},
];

/**
 * Get epoch visual definition by number (1-5). Clamps to valid range.
 */
export function getEpochVisual(epoch: number): EpochVisualDef {
	const clamped = Math.max(1, Math.min(5, Math.floor(epoch)));
	return EPOCH_VISUALS[clamped - 1];
}
