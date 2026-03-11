/**
 * Wall building mechanics — segment detection, HP, damage, and breach.
 *
 * Detects when 3+ cubes are stacked in a line (axis-aligned row on XZ
 * at any Y level) and forms "wall segments." Each segment has HP derived
 * from its constituent cube materials. Walls provide defense cover and
 * can be damaged/breached.
 *
 * Tunables sourced from config/combat.json (walls section).
 *
 * Depends on cubeStacking.ts for the stack registry.
 */

import { config } from "../../config";
import type { GridCoord } from "./gridSnap";
import { gridKey } from "./gridSnap";
import { type StackedCubeData, getAllStackedCubes } from "./cubeStacking";

// ---------------------------------------------------------------------------
// Config-driven constants
// ---------------------------------------------------------------------------

const wallsCfg = config.combat.walls;

/** Minimum number of cubes in a line to form a wall segment. */
const MIN_WALL_LENGTH = wallsCfg.minWallLength;

/** HP per cube by material type. Higher = stronger wall. */
export const MATERIAL_WALL_HP: Record<string, number> = Object.fromEntries(
	Object.entries(wallsCfg.materialWallHp).map(([mat, hp]) => [
		mat,
		typeof hp === "object" && hp !== null ? (hp as { perCube: number }).perCube : hp as number,
	]),
);

/** Default HP for unknown material types. */
const DEFAULT_CUBE_HP = (wallsCfg as Record<string, unknown>).defaultCubeHp as number ?? 25;

/** Defense bonus multiplier for units behind a wall. */
export const WALL_DEFENSE_BONUS = wallsCfg.wallDefenseBonus;

/** Breach threshold — wall is breached when HP drops below this fraction of maxHp. */
const BREACH_THRESHOLD = wallsCfg.breachThreshold;

/** How many cells to scan for cover in the threat direction. */
const COVER_SCAN_DISTANCE = wallsCfg.coverScanDistance;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A contiguous wall segment formed by 3+ cubes in a line. */
export interface WallSegment {
	/** Unique segment identifier. */
	id: string;
	/** Grid coordinates of all cubes in this segment. */
	cubes: GridCoord[];
	/** Entity IDs of the cubes forming this segment. */
	cubeEntityIds: string[];
	/** Dominant material type (most common material in the segment). */
	material: string;
	/** Current hit points. */
	hp: number;
	/** Maximum hit points (sum of all cube HPs). */
	maxHp: number;
	/** Axis of the wall: "x" for east-west, "z" for north-south. */
	axis: "x" | "z";
	/** The Y level this segment occupies. */
	yLevel: number;
	/** Whether the wall has been breached (hp <= 0 on any cube). */
	breached: boolean;
}

/** Result of damaging a wall segment. */
export interface WallDamageResult {
	/** Remaining HP after damage. */
	remainingHp: number;
	/** Whether this damage caused the wall to breach. */
	breached: boolean;
	/** Whether the segment was completely destroyed. */
	destroyed: boolean;
}

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

/** Registry of detected wall segments, keyed by segment ID. */
const wallSegments = new Map<string, WallSegment>();

/** Auto-incrementing segment ID. */
let nextSegmentId = 0;

/**
 * Reverse lookup: gridKey -> segment ID.
 * Allows quick segment lookup when a specific cube is hit.
 */
const cubeToSegment = new Map<string, string>();

// ---------------------------------------------------------------------------
// Segment detection
// ---------------------------------------------------------------------------

/**
 * Scan the stack registry and detect all wall segments.
 *
 * A wall segment is 3+ cubes in an axis-aligned line along X or Z
 * at the same Y level. Each cube can belong to at most one segment
 * (longest segment wins in case of overlap).
 *
 * This performs a full rescan. Call after significant cube changes.
 */
export function detectWallSegments(): WallSegment[] {
	wallSegments.clear();
	cubeToSegment.clear();
	nextSegmentId = 0;

	const stacked = getAllStackedCubes();
	if (stacked.size === 0) {
		return [];
	}

	// Group cubes by Y level
	const byLevel = new Map<number, StackedCubeData[]>();
	for (const data of stacked.values()) {
		const y = data.gridCoord.y;
		let arr = byLevel.get(y);
		if (!arr) {
			arr = [];
			byLevel.set(y, arr);
		}
		arr.push(data);
	}

	// For each Y level, find axis-aligned runs
	for (const [yLevel, cubes] of byLevel) {
		// Build lookup set for this level
		const levelSet = new Map<string, StackedCubeData>();
		for (const cube of cubes) {
			const key = `${cube.gridCoord.x},${cube.gridCoord.z}`;
			levelSet.set(key, cube);
		}

		const claimed = new Set<string>();

		// Scan X-axis runs (east-west walls)
		const xRuns = findAxisRuns(cubes, "x", levelSet, claimed);
		for (const run of xRuns) {
			if (run.length >= MIN_WALL_LENGTH) {
				const segment = createSegment(run, "x", yLevel);
				for (const cube of run) {
					const key = `${cube.gridCoord.x},${cube.gridCoord.z}`;
					claimed.add(key);
				}
				wallSegments.set(segment.id, segment);
				for (const coord of segment.cubes) {
					cubeToSegment.set(gridKey(coord), segment.id);
				}
			}
		}

		// Scan Z-axis runs (north-south walls)
		const zRuns = findAxisRuns(cubes, "z", levelSet, claimed);
		for (const run of zRuns) {
			if (run.length >= MIN_WALL_LENGTH) {
				const segment = createSegment(run, "z", yLevel);
				for (const cube of run) {
					const key = `${cube.gridCoord.x},${cube.gridCoord.z}`;
					claimed.add(key);
				}
				wallSegments.set(segment.id, segment);
				for (const coord of segment.cubes) {
					cubeToSegment.set(gridKey(coord), segment.id);
				}
			}
		}
	}

	return Array.from(wallSegments.values());
}

/**
 * Find contiguous runs along a given axis at a single Y level.
 */
function findAxisRuns(
	cubes: StackedCubeData[],
	axis: "x" | "z",
	_levelSet: Map<string, StackedCubeData>,
	claimed: Set<string>,
): StackedCubeData[][] {
	// Group by the perpendicular axis
	const perp = axis === "x" ? "z" : "x";
	const byPerp = new Map<number, StackedCubeData[]>();
	for (const cube of cubes) {
		const perpVal = cube.gridCoord[perp];
		let arr = byPerp.get(perpVal);
		if (!arr) {
			arr = [];
			byPerp.set(perpVal, arr);
		}
		arr.push(cube);
	}

	const runs: StackedCubeData[][] = [];

	for (const [_perpVal, group] of byPerp) {
		// Sort by the scan axis
		group.sort((a, b) => a.gridCoord[axis] - b.gridCoord[axis]);

		let currentRun: StackedCubeData[] = [];

		for (const cube of group) {
			const key = `${cube.gridCoord.x},${cube.gridCoord.z}`;
			if (claimed.has(key)) {
				// This cube is already part of a wall in another axis
				if (currentRun.length >= MIN_WALL_LENGTH) {
					runs.push(currentRun);
				}
				currentRun = [];
				continue;
			}

			if (currentRun.length === 0) {
				currentRun.push(cube);
			} else {
				const last = currentRun[currentRun.length - 1];
				if (cube.gridCoord[axis] === last.gridCoord[axis] + 1) {
					// Contiguous
					currentRun.push(cube);
				} else {
					// Gap — finalize current run
					if (currentRun.length >= MIN_WALL_LENGTH) {
						runs.push(currentRun);
					}
					currentRun = [cube];
				}
			}
		}

		if (currentRun.length >= MIN_WALL_LENGTH) {
			runs.push(currentRun);
		}
	}

	return runs;
}

/**
 * Create a WallSegment from a run of cubes.
 */
function createSegment(
	cubes: StackedCubeData[],
	axis: "x" | "z",
	yLevel: number,
): WallSegment {
	const id = `wall_${nextSegmentId++}`;

	// Count materials to find dominant
	const materialCounts = new Map<string, number>();
	let totalHp = 0;

	for (const cube of cubes) {
		materialCounts.set(
			cube.material,
			(materialCounts.get(cube.material) ?? 0) + 1,
		);
		totalHp += MATERIAL_WALL_HP[cube.material] ?? DEFAULT_CUBE_HP;
	}

	let dominantMaterial = cubes[0].material;
	let maxCount = 0;
	for (const [mat, count] of materialCounts) {
		if (count > maxCount) {
			maxCount = count;
			dominantMaterial = mat;
		}
	}

	return {
		id,
		cubes: cubes.map((c) => ({ ...c.gridCoord })),
		cubeEntityIds: cubes.map((c) => c.entityId),
		material: dominantMaterial,
		hp: totalHp,
		maxHp: totalHp,
		axis,
		yLevel,
		breached: false,
	};
}

// ---------------------------------------------------------------------------
// Wall queries
// ---------------------------------------------------------------------------

/**
 * Get all detected wall segments.
 */
export function getWallSegments(): WallSegment[] {
	return Array.from(wallSegments.values());
}

/**
 * Get a wall segment by ID.
 */
export function getWallSegment(segmentId: string): WallSegment | undefined {
	return wallSegments.get(segmentId);
}

/**
 * Find the wall segment that contains a cube at the given grid position.
 * Returns undefined if the cube is not part of any wall segment.
 */
export function getSegmentAtPosition(gridPos: GridCoord): WallSegment | undefined {
	const segmentId = cubeToSegment.get(gridKey(gridPos));
	if (!segmentId) return undefined;
	return wallSegments.get(segmentId);
}

/**
 * Check if a position is behind a wall relative to a threat direction.
 *
 * A position is "behind" a wall if there is a wall segment between
 * the position and the threat along the wall's axis direction.
 *
 * @param position - The defender's grid position.
 * @param threatDirection - Normalized direction from defender toward threat.
 * @returns The defense bonus multiplier (0 = no cover, WALL_DEFENSE_BONUS = full cover).
 */
export function getCoverBonus(
	position: GridCoord,
	threatDirection: { x: number; z: number },
): number {
	// Check cells between position and threat for wall segments
	// Simple scan: check 1-N cells in the threat direction
	for (let dist = 1; dist <= COVER_SCAN_DISTANCE; dist++) {
		const checkX = position.x + Math.round(threatDirection.x * dist);
		const checkZ = position.z + Math.round(threatDirection.z * dist);

		// Check all Y levels at this XZ
		for (let y = 0; y <= position.y + 1; y++) {
			const key = gridKey({ x: checkX, y, z: checkZ });
			if (cubeToSegment.has(key)) {
				return WALL_DEFENSE_BONUS;
			}
		}
	}

	return 0;
}

// ---------------------------------------------------------------------------
// Wall damage
// ---------------------------------------------------------------------------

/**
 * Apply damage to a wall segment.
 *
 * Reduces the segment's HP. If HP reaches 0, the segment is breached.
 * If HP drops below 0, the segment is destroyed (removed from registry).
 *
 * @param segmentId - Wall segment to damage.
 * @param amount - Damage amount to apply.
 * @returns Damage result, or null if segment not found.
 */
export function damageWall(
	segmentId: string,
	amount: number,
): WallDamageResult | null {
	const segment = wallSegments.get(segmentId);
	if (!segment) {
		return null;
	}

	segment.hp = Math.max(0, segment.hp - amount);

	const destroyed = segment.hp === 0;
	const breached = destroyed || segment.hp < segment.maxHp * BREACH_THRESHOLD;

	segment.breached = breached;

	if (destroyed) {
		wallSegments.delete(segmentId);
		// Clean up reverse lookup
		for (const coord of segment.cubes) {
			cubeToSegment.delete(gridKey(coord));
		}
	}

	return {
		remainingHp: segment.hp,
		breached,
		destroyed,
	};
}

/**
 * Check if a wall segment is breached (HP below 30% or destroyed).
 */
export function isWallBreach(segmentId: string): boolean {
	const segment = wallSegments.get(segmentId);
	if (!segment) {
		return true; // non-existent segments count as breached
	}
	return segment.breached;
}

/**
 * Get the HP percentage of a wall segment (0.0 to 1.0).
 */
export function getWallHpPercent(segmentId: string): number {
	const segment = wallSegments.get(segmentId);
	if (!segment || segment.maxHp === 0) {
		return 0;
	}
	return segment.hp / segment.maxHp;
}

// ---------------------------------------------------------------------------
// Test / reset helpers
// ---------------------------------------------------------------------------

/**
 * Reset all wall building state. Test-only.
 */
export function _resetWallBuilding(): void {
	wallSegments.clear();
	cubeToSegment.clear();
	nextSegmentId = 0;
}
