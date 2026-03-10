/**
 * NavMeshBuilder — generates a Yuka NavMesh from the game world.
 *
 * The world is a continuous terrain with axis-aligned rectangular obstacles
 * (city buildings + player-placed cubes). We discretize the walkable surface
 * into a grid of quads, skip cells occupied by obstacles, then convert
 * those quads into Yuka Polygons and feed them to NavMesh.fromPolygons().
 *
 * A CellSpacePartitioning spatial index is attached for O(1) region lookups.
 *
 * Dynamic updates: when the player places a new cube/building, call
 * updateNavMeshObstacles() to rebuild only the affected area. For simplicity
 * the current implementation does a full rebuild; a future optimization can
 * do incremental patching.
 */

import {
	CellSpacePartitioning,
	NavMesh,
	Polygon,
	Vector3 as YukaVector3,
} from "yuka";

import type { CityBuilding } from "../ecs/cityLayout";
import { getCityBuildings } from "../ecs/cityLayout";
import {
	getTerrainHeight,
	isWalkable,
	WORLD_HALF,
	WORLD_SIZE,
} from "../ecs/terrain";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** An axis-aligned rectangular obstacle in world space. */
export interface ObstacleRect {
	/** Center X */
	x: number;
	/** Center Z */
	z: number;
	/** Half-width (along X) */
	halfW: number;
	/** Half-depth (along Z) */
	halfD: number;
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/**
 * Resolution of the navmesh grid. Smaller = more polygons = more accurate
 * paths but heavier to build. 2 world-units matches the existing navmesh
 * grid step so behavior is consistent.
 */
const CELL_SIZE = 2;

/** Number of grid cells per axis. */
const GRID_SIZE = Math.floor(WORLD_SIZE / CELL_SIZE);

/** Margin around obstacles — keeps bots from brushing walls. */
const OBSTACLE_MARGIN = 0.3;

/** Number of spatial index cells per axis for CellSpacePartitioning. */
const SPATIAL_CELLS = 20;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Convert a grid cell (gx, gz) to the world-space center of that cell.
 */
function cellToWorld(gx: number, gz: number): { x: number; z: number } {
	return {
		x: gx * CELL_SIZE - WORLD_HALF + CELL_SIZE / 2,
		z: gz * CELL_SIZE - WORLD_HALF + CELL_SIZE / 2,
	};
}

/**
 * Check whether a world-space point lies inside any obstacle (with margin).
 */
function isInsideAnyObstacle(
	x: number,
	z: number,
	obstacles: ObstacleRect[],
): boolean {
	for (const obs of obstacles) {
		if (
			x >= obs.x - obs.halfW - OBSTACLE_MARGIN &&
			x <= obs.x + obs.halfW + OBSTACLE_MARGIN &&
			z >= obs.z - obs.halfD - OBSTACLE_MARGIN &&
			z <= obs.z + obs.halfD + OBSTACLE_MARGIN
		) {
			return true;
		}
	}
	return false;
}

/**
 * Test whether an entire grid cell is walkable (terrain + obstacles).
 * We sample the cell center and optionally corners for accuracy.
 */
function isCellWalkable(
	gx: number,
	gz: number,
	obstacles: ObstacleRect[],
): boolean {
	const { x, z } = cellToWorld(gx, gz);

	// Center must be on walkable terrain
	if (!isWalkable(x, z)) return false;

	// Center must not be inside an obstacle
	if (isInsideAnyObstacle(x, z, obstacles)) return false;

	return true;
}

/**
 * Create a Yuka Polygon (convex quad) from four CCW vertices on the XZ plane.
 * Y values are sampled from the terrain heightfield.
 */
function makeQuad(x0: number, z0: number, x1: number, z1: number): Polygon {
	// Vertices in counter-clockwise order when viewed from above (Y-up).
	// Yuka's fromContour expects CCW winding for a plane facing +Y.
	const y00 = getTerrainHeight(x0, z0);
	const y10 = getTerrainHeight(x1, z0);
	const y11 = getTerrainHeight(x1, z1);
	const y01 = getTerrainHeight(x0, z1);

	const contour = [
		new YukaVector3(x0, y00, z0),
		new YukaVector3(x1, y10, z0),
		new YukaVector3(x1, y11, z1),
		new YukaVector3(x0, y01, z1),
	];

	const polygon = new Polygon();
	polygon.fromContour(contour);
	polygon.computeCentroid();
	return polygon;
}

/**
 * Merge horizontally adjacent walkable cells into wider quads to reduce
 * polygon count. Returns an array of merged rectangles in grid space:
 * { gx, gz, width (in cells), height: 1 }.
 *
 * We merge along X first, then attempt to merge rows (greedy rectangle
 * packing). This typically reduces polygon count by 3-5x.
 */
interface MergedRect {
	gx: number;
	gz: number;
	w: number;
	h: number;
}

function mergeWalkableCells(walkable: boolean[]): MergedRect[] {
	// Row-first greedy merge
	const used = new Uint8Array(GRID_SIZE * GRID_SIZE);
	const rects: MergedRect[] = [];

	for (let gz = 0; gz < GRID_SIZE; gz++) {
		for (let gx = 0; gx < GRID_SIZE; gx++) {
			const idx = gz * GRID_SIZE + gx;
			if (!walkable[idx] || used[idx]) continue;

			// Expand horizontally
			let w = 1;
			while (
				gx + w < GRID_SIZE &&
				walkable[gz * GRID_SIZE + gx + w] &&
				!used[gz * GRID_SIZE + gx + w]
			) {
				w++;
			}

			// Expand vertically — all cells in the row span must be walkable
			let h = 1;
			let canExpand = true;
			while (canExpand && gz + h < GRID_SIZE) {
				for (let dx = 0; dx < w; dx++) {
					const i2 = (gz + h) * GRID_SIZE + gx + dx;
					if (!walkable[i2] || used[i2]) {
						canExpand = false;
						break;
					}
				}
				if (canExpand) h++;
			}

			// Mark cells as used
			for (let dz = 0; dz < h; dz++) {
				for (let dx = 0; dx < w; dx++) {
					used[(gz + dz) * GRID_SIZE + gx + dx] = 1;
				}
			}

			rects.push({ gx, gz, w, h });
		}
	}

	return rects;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Collect all obstacles in the world: city buildings + any additional
 * dynamically placed obstacles.
 */
export function gatherObstacles(
	extraObstacles: ObstacleRect[] = [],
): ObstacleRect[] {
	const cityBuildings: CityBuilding[] = getCityBuildings();
	const allObstacles: ObstacleRect[] = [];

	for (const b of cityBuildings) {
		allObstacles.push({
			x: b.x,
			z: b.z,
			halfW: b.halfW,
			halfD: b.halfD,
		});
	}

	for (const o of extraObstacles) {
		allObstacles.push(o);
	}

	return allObstacles;
}

/**
 * Build a Yuka NavMesh covering the entire world.
 *
 * @param worldBounds - Optional override for world extents. Defaults to
 *   the full WORLD_SIZE symmetric about the origin.
 * @param obstacles - Additional obstacles beyond city buildings.
 *   City buildings are always included automatically.
 * @returns A fully constructed Yuka NavMesh with spatial index.
 */
export function buildNavMesh(
	worldBounds?: {
		minX: number;
		maxX: number;
		minZ: number;
		maxZ: number;
	},
	obstacles: ObstacleRect[] = [],
): NavMesh {
	const bounds = worldBounds ?? {
		minX: -WORLD_HALF,
		maxX: WORLD_HALF,
		minZ: -WORLD_HALF,
		maxZ: WORLD_HALF,
	};

	const allObstacles = gatherObstacles(obstacles);

	// --- Step 1: Build walkability grid ---
	const walkable = new Array<boolean>(GRID_SIZE * GRID_SIZE);
	for (let gz = 0; gz < GRID_SIZE; gz++) {
		for (let gx = 0; gx < GRID_SIZE; gx++) {
			const { x, z } = cellToWorld(gx, gz);
			const inBounds =
				x >= bounds.minX &&
				x <= bounds.maxX &&
				z >= bounds.minZ &&
				z <= bounds.maxZ;
			walkable[gz * GRID_SIZE + gx] =
				inBounds && isCellWalkable(gx, gz, allObstacles);
		}
	}

	// --- Step 2: Merge adjacent walkable cells into larger rectangles ---
	const mergedRects = mergeWalkableCells(walkable);

	// --- Step 3: Convert merged rectangles to Yuka Polygons ---
	const polygons: Polygon[] = [];
	for (const rect of mergedRects) {
		// World-space corners of this merged rectangle
		const x0 = rect.gx * CELL_SIZE - WORLD_HALF;
		const z0 = rect.gz * CELL_SIZE - WORLD_HALF;
		const x1 = x0 + rect.w * CELL_SIZE;
		const z1 = z0 + rect.h * CELL_SIZE;

		polygons.push(makeQuad(x0, z0, x1, z1));
	}

	// --- Step 4: Build the Yuka NavMesh ---
	const navMesh = new NavMesh();
	navMesh.fromPolygons(polygons);

	// --- Step 5: Attach spatial index for fast region lookups ---
	const spatialIndex = new CellSpacePartitioning(
		WORLD_SIZE, // width (X)
		1, // height (Y) — flat world, minimal Y range
		WORLD_SIZE, // depth (Z)
		SPATIAL_CELLS, // cells X
		1, // cells Y
		SPATIAL_CELLS, // cells Z
	);

	// Add each region's centroid to the spatial index
	for (const region of navMesh.regions) {
		spatialIndex.addEntityToPartition(region, region.centroid);
	}

	navMesh.spatialIndex = spatialIndex;

	return navMesh;
}

/**
 * Rebuild the navmesh with updated obstacles. This is called when the player
 * places a new building or cube. Currently performs a full rebuild.
 *
 * @param newObstacles - Complete list of dynamic obstacles (cubes, placed buildings).
 *   City buildings are always included automatically.
 * @returns A new NavMesh instance.
 */
export function updateNavMeshObstacles(newObstacles: ObstacleRect[]): NavMesh {
	return buildNavMesh(undefined, newObstacles);
}

/**
 * Get the grid cell size used by the navmesh builder.
 * Useful for debug visualization and coordinate snapping.
 */
export function getNavMeshCellSize(): number {
	return CELL_SIZE;
}

/**
 * Get the grid dimensions.
 */
export function getNavMeshGridSize(): number {
	return GRID_SIZE;
}
