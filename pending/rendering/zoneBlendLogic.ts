/**
 * Pure functions for zone transition blending calculations.
 *
 * Extracted from StructuralFloorRenderer so blend logic can be unit-tested
 * without R3F. All tunables come from zoneBlending.json config.
 */

import blendConfig from "../config/zoneBlending.json";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Directions for 4-connected grid neighbors: +x, -x, +z, -z */
export type EdgeDirection = "px" | "nx" | "pz" | "nz";

export interface BlendEdge {
	direction: EdgeDirection;
	neighborColor: number;
	isBreach: boolean;
}

export interface StripGeometry {
	/** Position offset relative to cell center (x, z) */
	px: number;
	pz: number;
	/** Scale of the strip plane (width, depth) */
	sx: number;
	sz: number;
}

export interface BlendStripParams {
	outer: StripGeometry;
	inner: StripGeometry;
	outerOpacity: number;
	innerOpacity: number;
	yOuter: number;
	yInner: number;
}

export interface BreachStripParams {
	crack: StripGeometry;
	glowColor: number;
	glowIntensity: number;
	crackOpacity: number;
	yOffset: number;
	pulseSpeed: number;
}

// ---------------------------------------------------------------------------
// Config accessors
// ---------------------------------------------------------------------------

export function getBlendWidthFraction(): number {
	return blendConfig.blendWidthFraction;
}

export function getBreachGlowConfig() {
	return blendConfig.breachGlow;
}

// ---------------------------------------------------------------------------
// Blend factor calculation
// ---------------------------------------------------------------------------

/**
 * Calculates the blend factor (0..1) between two zones.
 *
 * Returns 0 if zones are the same (no blend needed).
 * Returns 1 for breach boundaries (handled specially).
 * Returns a value between 0 and 1 for normal zone transitions.
 *
 * @param zoneA - floor preset ID of the current cell
 * @param zoneB - floor preset ID of the neighbor cell
 * @returns blend factor from 0 (no blend) to 1 (maximum blend / breach)
 */
export function computeBlendFactor(
	zoneA: string,
	zoneB: string | null,
): number {
	if (zoneB === null) return 0;
	if (zoneA === zoneB) return 0;

	const eitherBreach = zoneA === "breach_exposed" || zoneB === "breach_exposed";
	if (eitherBreach) return 1.0;

	// Normal zone transition: fixed blend factor (the visual gradient is
	// handled by the strip geometry, not by varying this value).
	return 0.5;
}

/**
 * Returns true if either zone is a breach boundary, which gets
 * the distinctive glow/crack effect instead of a soft blend.
 */
export function isBreachBoundary(zoneA: string, zoneB: string | null): boolean {
	if (zoneB === null) return false;
	if (zoneA === zoneB) return false;
	return zoneA === "breach_exposed" || zoneB === "breach_exposed";
}

// ---------------------------------------------------------------------------
// Strip geometry
// ---------------------------------------------------------------------------

/**
 * Computes the outer and inner strip geometry for a blend edge.
 *
 * The outer strip spans blendWidthFraction of the cell size at the edge.
 * The inner strip is narrower (innerStripRatio) and higher-opacity for
 * a gradient falloff effect.
 */
export function computeBlendStripParams(
	direction: EdgeDirection,
	plateSize: number,
): BlendStripParams {
	const blendFrac = blendConfig.blendWidthFraction;
	const innerRatio = blendConfig.innerStripRatio;

	const blendDepth = plateSize * blendFrac;
	const blendWidth = plateSize * 0.98;
	const innerDepth = blendDepth * innerRatio;

	const outer = computeStripGeometry(
		direction,
		plateSize,
		blendDepth,
		blendWidth,
	);
	const inner = computeStripGeometry(
		direction,
		plateSize,
		innerDepth,
		blendWidth,
	);

	return {
		outer,
		inner,
		outerOpacity: blendConfig.outerOpacity,
		innerOpacity: blendConfig.innerOpacity,
		yOuter: blendConfig.yOffsetOuter,
		yInner: blendConfig.yOffsetInner,
	};
}

/**
 * Computes the geometry for the breach glow/crack strip.
 */
export function computeBreachStripParams(
	direction: EdgeDirection,
	plateSize: number,
): BreachStripParams {
	const cfg = blendConfig.breachGlow;
	const crackDepth = plateSize * cfg.crackWidth;
	const crackWidth = plateSize * 0.98;

	const crack = computeStripGeometry(
		direction,
		plateSize,
		crackDepth,
		crackWidth,
	);

	return {
		crack,
		glowColor: Number.parseInt(cfg.color.replace("0x", ""), 16),
		glowIntensity: cfg.intensity,
		crackOpacity: cfg.crackOpacity,
		yOffset: blendConfig.yOffsetBreach,
		pulseSpeed: cfg.pulseSpeed,
	};
}

/**
 * Low-level strip placement: given a direction and dimensions,
 * returns position offset and scale.
 */
export function computeStripGeometry(
	direction: EdgeDirection,
	plateSize: number,
	depth: number,
	width: number,
): StripGeometry {
	let px = 0;
	let pz = 0;
	let sx = width;
	let sz = depth;

	if (direction === "px") {
		px = plateSize / 2 - depth / 2;
		sx = depth;
		sz = width;
	} else if (direction === "nx") {
		px = -(plateSize / 2 - depth / 2);
		sx = depth;
		sz = width;
	} else if (direction === "pz") {
		pz = plateSize / 2 - depth / 2;
	} else {
		// nz
		pz = -(plateSize / 2 - depth / 2);
	}

	return { px, pz, sx, sz };
}

// ---------------------------------------------------------------------------
// Edge detection
// ---------------------------------------------------------------------------

export interface CellRecord {
	q: number;
	r: number;
	floor_preset_id: string;
}

/**
 * Computes blend edges for a cell given its neighbors.
 * Returns an empty array if all adjacent cells are the same zone.
 */
export function computeBlendEdges(
	cell: CellRecord,
	cellByCoord: Map<string, CellRecord>,
	floorColors: Record<string, number>,
	defaultColor: number,
): BlendEdge[] {
	const neighbors: [EdgeDirection, number, number][] = [
		["px", cell.q + 1, cell.r],
		["nx", cell.q - 1, cell.r],
		["pz", cell.q, cell.r + 1],
		["nz", cell.q, cell.r - 1],
	];

	const edges: BlendEdge[] = [];
	for (const [dir, nq, nr] of neighbors) {
		const neighbor = cellByCoord.get(`${nq},${nr}`);
		if (!neighbor) continue;
		if (neighbor.floor_preset_id === cell.floor_preset_id) continue;

		const nColor = floorColors[neighbor.floor_preset_id] ?? defaultColor;
		const breach = isBreachBoundary(
			cell.floor_preset_id,
			neighbor.floor_preset_id,
		);
		edges.push({ direction: dir, neighborColor: nColor, isBreach: breach });
	}

	return edges;
}
