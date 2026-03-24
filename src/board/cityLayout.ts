import { seededRng } from "./noise";

// ── Types ────────────────────────────────────────────────────────────────────

export type BlockZone = "industrial" | "bio" | "dust" | "aero" | "plaza";

export interface CityBlock {
	x: number; // top-left tile X
	z: number; // top-left tile Z
	w: number; // width in tiles
	h: number; // height in tiles
	zone: BlockZone;
	isAbyssal: boolean;
}

// ── Constants ────────────────────────────────────────────────────────────────

/** Minimum dimension a block may have after a split. */
const MIN_BLOCK = 6;

/** Corridor width between BSP children: 1 or 2 tiles. */
const CORRIDOR_MIN = 1;
const CORRIDOR_MAX = 2;

/** Split position varies within 40%-60% of the split dimension. */
const SPLIT_LO = 0.4;
const SPLIT_HI = 0.6;

/**
 * Zone distribution weights. Order matters for deterministic assignment.
 * Weights sum to 1.0.
 */
const ZONE_WEIGHTS: readonly { zone: BlockZone; weight: number }[] = [
	{ zone: "industrial", weight: 0.3 },
	{ zone: "bio", weight: 0.2 },
	{ zone: "dust", weight: 0.2 },
	{ zone: "aero", weight: 0.15 },
	{ zone: "plaza", weight: 0.15 },
] as const;

// ── BSP Rectangle ────────────────────────────────────────────────────────────

interface Rect {
	x: number;
	z: number;
	w: number;
	h: number;
}

// ── BSP Subdivision ──────────────────────────────────────────────────────────

/**
 * Recursively subdivide a rectangle via BSP. Returns terminal leaf rectangles
 * (the city blocks) and the corridor gaps between splits.
 *
 * `horizontal` indicates the split orientation for this level: true = split
 * along the Z axis (creating a top child + bottom child), false = split along
 * the X axis (left child + right child). Orientation alternates each level.
 */
function subdivide(rect: Rect, horizontal: boolean, rng: () => number): Rect[] {
	const dim = horizontal ? rect.h : rect.w;

	// Choose corridor width: 1 or 2 tiles (seeded)
	const corridorWidth = rng() < 0.5 ? CORRIDOR_MIN : CORRIDOR_MAX;

	// Minimum space needed: two children of MIN_BLOCK + corridor
	const minRequired = MIN_BLOCK * 2 + corridorWidth;
	if (dim < minRequired) {
		// Can't split — this rect is a terminal leaf
		return [rect];
	}

	// Split position: random within 40%-60% of the available interior range.
	// The "interior" excludes the corridor so both children get fair sizing.
	const available = dim - corridorWidth;
	const lo = Math.floor(available * SPLIT_LO);
	const hi = Math.floor(available * SPLIT_HI);
	// Clamp so each child >= MIN_BLOCK
	const clampedLo = Math.max(lo, MIN_BLOCK);
	const clampedHi = Math.min(hi, available - MIN_BLOCK);

	if (clampedLo > clampedHi) {
		// No valid split — terminal leaf
		return [rect];
	}

	const splitSize = clampedLo + Math.floor(rng() * (clampedHi - clampedLo + 1));

	let child1: Rect;
	let child2: Rect;

	if (horizontal) {
		// Split along Z: child1 is top, child2 is bottom, corridor in between
		child1 = { x: rect.x, z: rect.z, w: rect.w, h: splitSize };
		child2 = {
			x: rect.x,
			z: rect.z + splitSize + corridorWidth,
			w: rect.w,
			h: available - splitSize,
		};
	} else {
		// Split along X: child1 is left, child2 is right, corridor in between
		child1 = { x: rect.x, z: rect.z, w: splitSize, h: rect.h };
		child2 = {
			x: rect.x + splitSize + corridorWidth,
			z: rect.z,
			w: available - splitSize,
			h: rect.h,
		};
	}

	// Recurse — alternate split orientation
	const leaves1 = subdivide(child1, !horizontal, rng);
	const leaves2 = subdivide(child2, !horizontal, rng);

	return [...leaves1, ...leaves2];
}

// ── Zone Assignment ──────────────────────────────────────────────────────────

/**
 * Pick a zone using weighted random selection.
 */
function pickZone(rng: () => number): BlockZone {
	const roll = rng();
	let cumulative = 0;
	for (const { zone, weight } of ZONE_WEIGHTS) {
		cumulative += weight;
		if (roll < cumulative) return zone;
	}
	// Floating-point safety: return last zone if we somehow overshoot
	return ZONE_WEIGHTS[ZONE_WEIGHTS.length - 1]!.zone;
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Generate a BSP city layout for a board of the given dimensions.
 *
 * Returns an array of CityBlock objects representing the terminal BSP leaves.
 * Tiles NOT covered by any block are implicit corridor / street space
 * (`transit_deck` in the generator).
 *
 * All blocks start with `isAbyssal = false`; abyssal assignment is a separate
 * step in a later task.
 */
export function generateCityLayout(
	width: number,
	height: number,
	seed: string,
): CityBlock[] {
	const rng = seededRng(`${seed}_cityBSP`);

	// Decide initial split orientation: horizontal if board is wider than tall,
	// vertical otherwise. This produces more natural proportions.
	const startHorizontal = height >= width;

	const leaves = subdivide(
		{ x: 0, z: 0, w: width, h: height },
		startHorizontal,
		rng,
	);

	// Assign zones using a separate RNG stream so zone selection is independent
	// of the BSP structure's random draws.
	const zoneRng = seededRng(`${seed}_cityZones`);

	return leaves.map((rect) => ({
		x: rect.x,
		z: rect.z,
		w: rect.w,
		h: rect.h,
		zone: pickZone(zoneRng),
		isAbyssal: false,
	}));
}
