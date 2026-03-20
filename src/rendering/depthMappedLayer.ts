/**
 * Unified depth-mapped layer — replaces BiomeRenderer + DepthRenderer + MinedPitRenderer.
 *
 * A DepthMappedLayer is a 2D grid where each cell has:
 *   - depth: always 0 or negative (0 = surface, -1 = shallow, -2 = deep)
 *   - biomeIndex: atlas cell index (0-8) for texture assignment
 *
 * The layer has a base Y position (world-space elevation of its depth-0 surface).
 */

// ---------------------------------------------------------------------------
// Atlas constants
// ---------------------------------------------------------------------------

/** Metal032 — structural_mass */
export const STRUCTURAL_ATLAS_INDEX = 0;
/** Concrete034 — collapsed_zone / gravel (used for dug cells) */
export const GRAVEL_ATLAS_INDEX = 3;
/** Grate001 — abyssal_platform grating */
export const GRATING_ATLAS_INDEX = 7;
/** Solid black — void / default unassigned */
export const VOID_ATLAS_INDEX = 8;

// ---------------------------------------------------------------------------
// Edge types
// ---------------------------------------------------------------------------

export type EdgeDirection = "north" | "south" | "east" | "west";

export interface EdgeType {
	/** Cell coordinates (the deeper of the two cells) */
	x: number;
	z: number;
	direction: EdgeDirection;
	type: "ramp" | "wall" | "boundary";
	/** Absolute depth difference */
	depthDiff: number;
}

// ---------------------------------------------------------------------------
// Geometry result types
// ---------------------------------------------------------------------------

export interface FloorQuad {
	x: number;
	z: number;
	worldY: number;
	biomeIndex: number;
	opacityCutout: boolean;
}

export interface RampQuad {
	x: number;
	z: number;
	direction: EdgeDirection;
	depthDiff: number;
}

export interface WallQuad {
	x: number;
	z: number;
	direction: EdgeDirection;
	depthDiff: number;
}

export interface VoidPlane {
	x: number;
	z: number;
	worldY: number;
}

export interface LayerGeometryResult {
	floorQuads: FloorQuad[];
	rampQuads: RampQuad[];
	wallQuads: WallQuad[];
	voidPlanes: VoidPlane[];
}

// ---------------------------------------------------------------------------
// DepthMappedLayer
// ---------------------------------------------------------------------------

export interface DepthMappedLayer {
	readonly width: number;
	readonly height: number;
	readonly baseY: number;
	getDepth(x: number, z: number): number;
	setDepth(x: number, z: number, depth: number): void;
	getBiome(x: number, z: number): number;
	setBiome(x: number, z: number, index: number): void;
	/** Returns true if this cell has been explicitly activated (via setDepth or setBiome). */
	isActive(x: number, z: number): boolean;
}

export function createDepthMappedLayer(
	width: number,
	height: number,
	baseY: number,
): DepthMappedLayer {
	const depthData = new Int8Array(width * height); // all 0 by default
	const biomeData = new Uint8Array(width * height);
	// Default biome = 8 (void)
	biomeData.fill(VOID_ATLAS_INDEX);
	const activeData = new Uint8Array(width * height); // 0 = inactive

	function inBounds(x: number, z: number): boolean {
		return x >= 0 && x < width && z >= 0 && z < height;
	}

	return {
		width,
		height,
		baseY,

		getDepth(x: number, z: number): number {
			if (!inBounds(x, z)) return 0;
			return depthData[z * width + x];
		},

		setDepth(x: number, z: number, depth: number): void {
			if (!inBounds(x, z)) return;
			// Clamp to 0 or negative
			depthData[z * width + x] = Math.min(0, depth);
			activeData[z * width + x] = 1;
		},

		getBiome(x: number, z: number): number {
			if (!inBounds(x, z)) return VOID_ATLAS_INDEX;
			return biomeData[z * width + x];
		},

		setBiome(x: number, z: number, index: number): void {
			if (!inBounds(x, z)) return;
			biomeData[z * width + x] = index;
			activeData[z * width + x] = 1;
		},

		isActive(x: number, z: number): boolean {
			if (!inBounds(x, z)) return false;
			return activeData[z * width + x] === 1;
		},
	};
}

// ---------------------------------------------------------------------------
// Edge classification
// ---------------------------------------------------------------------------

const CARDINAL_OFFSETS: Array<{
	dx: number;
	dz: number;
	direction: EdgeDirection;
}> = [
	{ dx: 0, dz: -1, direction: "north" },
	{ dx: 0, dz: 1, direction: "south" },
	{ dx: 1, dz: 0, direction: "east" },
	{ dx: -1, dz: 0, direction: "west" },
];

export function classifyEdges(layer: DepthMappedLayer): EdgeType[] {
	const edges: EdgeType[] = [];
	const { width, height } = layer;

	for (let z = 0; z < height; z++) {
		for (let x = 0; x < width; x++) {
			const depth = layer.getDepth(x, z);

			for (const { dx, dz, direction } of CARDINAL_OFFSETS) {
				const nx = x + dx;
				const nz = z + dz;

				if (nx < 0 || nx >= width || nz < 0 || nz >= height) {
					// Boundary: only emit edge if this cell is deeper than 0
					if (depth < 0) {
						edges.push({
							x,
							z,
							direction,
							type: "boundary",
							depthDiff: Math.abs(depth),
						});
					}
					continue;
				}

				const neighborDepth = layer.getDepth(nx, nz);
				// Only emit edges from the deeper cell's perspective
				// (to avoid duplicates: each pair emitted once from the deeper side)
				if (depth < neighborDepth) {
					const diff = Math.abs(neighborDepth - depth);
					const type: "ramp" | "wall" = diff === 1 ? "ramp" : "wall";
					edges.push({ x, z, direction, type, depthDiff: diff });
				}
			}
		}
	}

	return edges;
}

// ---------------------------------------------------------------------------
// Geometry builder
// ---------------------------------------------------------------------------

export function buildLayerGeometry(
	layer: DepthMappedLayer,
): LayerGeometryResult {
	const floorQuads: FloorQuad[] = [];
	const voidPlanes: VoidPlane[] = [];
	const { width, height, baseY } = layer;

	// Build floor quads for every cell
	for (let z = 0; z < height; z++) {
		for (let x = 0; x < width; x++) {
			const depth = layer.getDepth(x, z);
			const biome = layer.getBiome(x, z);
			const isAbyssal = biome === GRATING_ATLAS_INDEX;

			floorQuads.push({
				x,
				z,
				worldY: baseY + depth,
				biomeIndex: biome,
				opacityCutout: isAbyssal,
			});

			// Abyssal cells with negative depth get a void plane below
			if (isAbyssal && depth < 0) {
				voidPlanes.push({
					x,
					z,
					worldY: baseY + depth - 1, // below the floor
				});
			}
		}
	}

	// Classify edges and split into ramp/wall quads
	const allEdges = classifyEdges(layer);
	const rampQuads: RampQuad[] = [];
	const wallQuads: WallQuad[] = [];

	for (const edge of allEdges) {
		if (edge.type === "boundary") continue; // boundaries are visual-only, no geometry quad
		if (edge.type === "ramp") {
			rampQuads.push({
				x: edge.x,
				z: edge.z,
				direction: edge.direction,
				depthDiff: edge.depthDiff,
			});
		} else {
			wallQuads.push({
				x: edge.x,
				z: edge.z,
				direction: edge.direction,
				depthDiff: edge.depthDiff,
			});
		}
	}

	return { floorQuads, rampQuads, wallQuads, voidPlanes };
}

// ---------------------------------------------------------------------------
// Mining helpers
// ---------------------------------------------------------------------------

/** DAISY dig: center + 4 cardinal cells go to depth -1, swap texture to gravel. */
export function applyDaisyDig(
	layer: DepthMappedLayer,
	cx: number,
	cz: number,
): void {
	const targets = [
		{ x: cx, z: cz },
		{ x: cx - 1, z: cz },
		{ x: cx + 1, z: cz },
		{ x: cx, z: cz - 1 },
		{ x: cx, z: cz + 1 },
	];

	for (const { x, z } of targets) {
		if (x >= 0 && x < layer.width && z >= 0 && z < layer.height) {
			layer.setDepth(x, z, -1);
			layer.setBiome(x, z, GRAVEL_ATLAS_INDEX);
		}
	}
}

/** Targeted dig: single cell to depth -1, swap texture to gravel. */
export function applyTargetedDig(
	layer: DepthMappedLayer,
	x: number,
	z: number,
): void {
	layer.setDepth(x, z, -1);
	layer.setBiome(x, z, GRAVEL_ATLAS_INDEX);
}

/** Deep dig: decrement depth by 1 (minimum floor determined by Int8Array range). */
export function applyDeepDig(
	layer: DepthMappedLayer,
	x: number,
	z: number,
): void {
	const current = layer.getDepth(x, z);
	layer.setDepth(x, z, current - 1);
	layer.setBiome(x, z, GRAVEL_ATLAS_INDEX);
}
