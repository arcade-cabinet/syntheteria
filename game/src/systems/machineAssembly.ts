/**
 * Machine assembly system — converts matched cube patterns into machines.
 *
 * When cubes are arranged in a valid blueprint pattern (detected by
 * patternMatcher), this module consumes the cubes and spawns a machine
 * entity at the anchor position. Machines can also be disassembled,
 * restoring the original cubes at their original positions with their
 * original materials.
 *
 * Stats scale by the average material quality of constituent cubes.
 *
 * Uses module-level state (Map store) with _resetMachineState for
 * test cleanup. Blueprint/config data is passed as parameters, not
 * imported from JSON.
 */

import type { GridCoord } from "./gridSnap";
import type { MatchResult } from "./patternMatcher";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MachineStats {
	/** Base efficiency multiplied by average material quality. */
	efficiency: number;
	/** Base durability multiplied by average material quality. */
	durability: number;
}

export interface MachineData {
	id: string;
	type: string;
	anchor: GridCoord;
	cubePositions: Array<{ coord: GridCoord; material: string }>;
	stats: MachineStats;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Quality multiplier per material type.
 * Higher quality materials produce machines with better stats.
 */
export const MATERIAL_QUALITY: Record<string, number> = {
	iron: 1.0,
	scrap_iron: 1.0,
	copper: 1.2,
	stone: 0.8,
	carbon: 1.5,
	titanium: 2.0,
	aluminum: 1.1,
	gold: 1.8,
};

/** Default quality for materials not listed in MATERIAL_QUALITY. */
const DEFAULT_QUALITY = 1.0;

/** Base stats before material quality scaling. */
const BASE_EFFICIENCY = 1.0;
const BASE_DURABILITY = 100;

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

let nextMachineId = 1;
const machines = new Map<string, MachineData>();

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function generateMachineId(): string {
	const id = `machine_${nextMachineId}`;
	nextMachineId++;
	return id;
}

function getMaterialQuality(material: string): number {
	return MATERIAL_QUALITY[material] ?? DEFAULT_QUALITY;
}

function calculateStats(
	cubePositions: Array<{ coord: GridCoord; material: string }>,
): MachineStats {
	if (cubePositions.length === 0) {
		return { efficiency: BASE_EFFICIENCY, durability: BASE_DURABILITY };
	}

	let totalQuality = 0;
	for (const cube of cubePositions) {
		totalQuality += getMaterialQuality(cube.material);
	}
	const avgQuality = totalQuality / cubePositions.length;

	return {
		efficiency: BASE_EFFICIENCY * avgQuality,
		durability: BASE_DURABILITY * avgQuality,
	};
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Assemble a machine from a matched blueprint pattern.
 *
 * Records all cube positions and materials from the match result,
 * removes each cube via the provided callback, calculates stats
 * from average material quality, and stores the machine.
 *
 * @param matchResult     The result from patternMatcher.matchBlueprint
 * @param getCubeMaterial Function to look up material at a grid coord
 * @param removeCubeFn    Function to remove a cube at a grid coord
 * @returns The created MachineData
 */
export function assembleMachine(
	matchResult: MatchResult,
	getCubeMaterial: (coord: GridCoord) => string | undefined,
	removeCubeFn: (coord: GridCoord) => void,
): MachineData {
	// Record all cube positions and their materials before removal
	const cubePositions: Array<{ coord: GridCoord; material: string }> = [];

	for (const coord of matchResult.cubeCoords) {
		const material = getCubeMaterial(coord) ?? "unknown";
		cubePositions.push({ coord: { ...coord }, material });
	}

	// Remove all constituent cubes
	for (const coord of matchResult.cubeCoords) {
		removeCubeFn(coord);
	}

	// Determine anchor (first cube coordinate from match)
	const anchor: GridCoord =
		matchResult.cubeCoords.length > 0
			? { ...matchResult.cubeCoords[0] }
			: { x: 0, y: 0, z: 0 };

	// Calculate stats from material quality
	const stats = calculateStats(cubePositions);

	// Create machine entity
	const id = generateMachineId();
	const machine: MachineData = {
		id,
		type: matchResult.blueprint.result,
		anchor,
		cubePositions,
		stats,
	};

	machines.set(id, machine);

	return machine;
}

/**
 * Disassemble a machine back into its constituent cubes.
 *
 * Restores cubes at their original positions with their original
 * materials using the provided placement callback. The machine is
 * removed from the registry.
 *
 * @param machineId   The ID of the machine to disassemble
 * @param placeCubeFn Function to place a cube (entityId, coord, material) => success
 * @returns The restored cube data, or null if machine not found
 */
export function disassembleMachine(
	machineId: string,
	placeCubeFn: (
		entityId: string,
		coord: GridCoord,
		material: string,
	) => boolean,
): Array<{ coord: GridCoord; material: string }> | null {
	const machine = machines.get(machineId);
	if (!machine) return null;

	const restoredCubes: Array<{ coord: GridCoord; material: string }> = [];

	// Restore each cube at its original position with original material
	for (let i = 0; i < machine.cubePositions.length; i++) {
		const { coord, material } = machine.cubePositions[i];
		const entityId = `${machineId}_cube_${i}`;
		const placed = placeCubeFn(entityId, coord, material);
		if (placed) {
			restoredCubes.push({ coord: { ...coord }, material });
		}
	}

	// Remove machine from registry
	machines.delete(machineId);

	return restoredCubes;
}

/**
 * Get a machine by its ID.
 */
export function getMachine(id: string): MachineData | undefined {
	return machines.get(id);
}

/**
 * Get all registered machines.
 */
export function getAllMachines(): MachineData[] {
	return Array.from(machines.values());
}

/**
 * Reset all machine state. For testing only.
 */
export function _resetMachineState(): void {
	machines.clear();
	nextMachineId = 1;
}
