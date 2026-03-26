/**
 * renderDefs — renderer-agnostic visual constants.
 *
 * Single source of truth for all rendering parameters that were previously
 * scattered across renderer files. No rendering library dependency.
 *
 * Consumed by: any renderer (Babylon, Three, 2D canvas).
 * These are constants — not ECS traits, not per-entity data.
 */

import type { Elevation } from "../board";

// ---------------------------------------------------------------------------
// Elevation → world-space Y displacement
// ---------------------------------------------------------------------------

/**
 * Canonical elevation → Y displacement mapping.
 *
 * This is THE source of truth. No other file should define elevation heights.
 * elevationSampler.ts should import this. Renderers should import this.
 *
 * Values in world units (meters):
 *   -1 (pit/water) → -1.5m below ground
 *    0 (flat)      → 0m (standard surface)
 *    1 (hills)     → 2.0m (raised plateau)
 *    2 (mountains) → 4.5m (cliffs, peaks)
 */
export const ELEVATION_Y: Record<Elevation, number> = {
	[-1]: -1.5,
	0: 0,
	1: 2.0,
	2: 4.5,
};

// ---------------------------------------------------------------------------
// Model scales
// ---------------------------------------------------------------------------

/**
 * How large models appear relative to a tile.
 * TILE_SIZE_M = 2.0 world units per tile.
 * A scale of 0.45 means the model fills ~45% of a tile.
 */
export const MODEL_SCALES = {
	/** Robot unit models (workers, scouts, infantry, etc). */
	unit: 0.7,
	/** Faction buildings (synthesizer, motor pool, etc). */
	building: 0.45,
	/** Salvage props (wreckage, ruins). */
	salvage: 0.35,
	/** Vegetation scatter (trees, bushes). */
	vegetation: 0.5,
	/** Rock/debris scatter. */
	scatter: 0.3,
} as const;

// ---------------------------------------------------------------------------
// Animation parameters
// ---------------------------------------------------------------------------

export const ANIMATION = {
	/** Unit bob-and-weave amplitude (world units). */
	bobAmplitude: 0.08,
	/** Unit bob speed (radians per millisecond). */
	bobSpeed: 0.002,
	/** Building appear animation duration (ms). */
	buildingAppearMs: 500,
	/** Unit death animation duration (ms). */
	unitDeathMs: 300,
	/** Selection ring rotation speed (radians per frame at 60fps). */
	selectionRingRotSpeed: 0.032,
	/** Selection ring pulse amount (scale ± this value). */
	selectionRingPulseAmount: 0.12,
	/** Camera pan tween duration (ms). */
	cameraPanMs: 300,
	/** Camera zoom tween duration (ms). */
	cameraZoomMs: 200,
} as const;

// ---------------------------------------------------------------------------
// Camera defaults
// ---------------------------------------------------------------------------

export const CAMERA = {
	/** Field of view (degrees) for perspective camera. */
	fov: 45,
	/** Minimum zoom: multiplier of sphere radius (close to surface). */
	minZoomFactor: 1.15,
	/** Maximum zoom: multiplier of sphere radius (see whole planet). */
	maxZoomFactor: 5.5,
	/** Default zoom: multiplier of sphere radius. */
	defaultZoomFactor: 1.8,
} as const;

// ---------------------------------------------------------------------------
// Faction identity
// ---------------------------------------------------------------------------

/**
 * Full faction visual identity. Extends the FACTION_COLORS in gameDefaults.ts
 * with secondary colors and display metadata.
 */
export const FACTION_IDENTITY: Record<
	string,
	{
		readonly displayName: string;
		readonly primaryColor: readonly [number, number, number];
		readonly secondaryColor: readonly [number, number, number];
		readonly discColor: number; // hex for legacy compat
	}
> = {
	player: {
		displayName: "Player",
		primaryColor: [0.55, 0.9, 1.0],
		secondaryColor: [0.3, 0.7, 0.9],
		discColor: 0x8be6ff,
	},
	reclaimers: {
		displayName: "Reclaimers",
		primaryColor: [0.55, 0.9, 1.0],
		secondaryColor: [0.3, 0.7, 0.9],
		discColor: 0x8be6ff,
	},
	volt_collective: {
		displayName: "Volt Collective",
		primaryColor: [1.0, 0.85, 0.2],
		secondaryColor: [0.9, 0.7, 0.1],
		discColor: 0xffd633,
	},
	signal_choir: {
		displayName: "Signal Choir",
		primaryColor: [0.6, 0.4, 1.0],
		secondaryColor: [0.4, 0.25, 0.8],
		discColor: 0x9966ff,
	},
	iron_creed: {
		displayName: "Iron Creed",
		primaryColor: [1.0, 0.3, 0.2],
		secondaryColor: [0.8, 0.2, 0.15],
		discColor: 0xff4d33,
	},
};

// ---------------------------------------------------------------------------
// Roboforming visual progression
// ---------------------------------------------------------------------------

/**
 * Per-level roboforming overlay. Level 0 = natural, level 5 = fully developed.
 * Each level adds more "civilization glow" to the terrain.
 */
export const ROBOFORM_LEVELS = [
	{
		level: 0,
		overlayColor: [0, 0, 0] as const,
		overlayOpacity: 0,
		label: "Natural",
	},
	{
		level: 1,
		overlayColor: [0.2, 0.3, 0.4] as const,
		overlayOpacity: 0.1,
		label: "Surveyed",
	},
	{
		level: 2,
		overlayColor: [0.3, 0.5, 0.6] as const,
		overlayOpacity: 0.2,
		label: "Foundations",
	},
	{
		level: 3,
		overlayColor: [0.4, 0.6, 0.7] as const,
		overlayOpacity: 0.35,
		label: "Infrastructure",
	},
	{
		level: 4,
		overlayColor: [0.5, 0.7, 0.8] as const,
		overlayOpacity: 0.5,
		label: "Developed",
	},
	{
		level: 5,
		overlayColor: [0.6, 0.8, 0.9] as const,
		overlayOpacity: 0.65,
		label: "Ecumenopolis",
	},
] as const;

// ---------------------------------------------------------------------------
// Ocean visual
// ---------------------------------------------------------------------------

export const OCEAN = {
	/** Ocean surface color [r,g,b] 0-1. */
	color: [0.06, 0.25, 0.55] as const,
	/** Ocean specular color [r,g,b] 0-1 (shiny water reflection). */
	specularColor: [0.4, 0.4, 0.5] as const,
	/** Ocean transparency (0 = invisible, 1 = opaque). */
	alpha: 0.85,
	/** Ocean sphere radius multiplier vs terrain radius (< 1.0 = below land). */
	radiusFactor: 0.97,
} as const;

// ---------------------------------------------------------------------------
// Atmosphere visual
// ---------------------------------------------------------------------------

export const ATMOSPHERE = {
	/** Atmosphere shell color [r,g,b] 0-1. */
	color: [0.4, 0.6, 0.9] as const,
	/** Atmosphere emissive glow [r,g,b] 0-1. */
	emissiveColor: [0.15, 0.25, 0.45] as const,
	/** Atmosphere transparency. */
	alpha: 0.12,
	/** Atmosphere radius multiplier vs terrain radius (> 1.0 = above terrain). */
	radiusFactor: 1.04,
} as const;
