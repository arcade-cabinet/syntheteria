/**
 * Shared helper functions for the Yuka AI turn system.
 *
 * Pure queries, distance computations, tile lookups, and small utilities
 * used by multiple AI subsystems (building, fabrication, diplomacy, etc.).
 */

import type { World } from "koota";
import type { GeneratedBoard } from "../board";
import { TileBiome } from "../terrain";
import {
	Board,
	Building,
	type BuildingType,
	Faction,
	ResourcePool,
	Tile,
	UnitFaction,
	UnitMove,
	UnitPos,
	UnitStats,
} from "../traits";
import type { Difficulty } from "../world/config";
import type { AgentSnapshot } from "./agents/SyntheteriaAgent";
import type { TurnContext } from "./goals/evaluators";
import {
	getOrBuildNavGraph,
	sphereManhattan,
	yukaShortestPath,
} from "./navigation/boardNavGraph";

// ---------------------------------------------------------------------------
// Cult faction exclusion
// ---------------------------------------------------------------------------

const CULT_FACTION_IDS = new Set([
	"static_remnants",
	"null_monks",
	"lost_signal",
]);

export function isCultFactionId(factionId: string): boolean {
	return CULT_FACTION_IDS.has(factionId);
}

// ---------------------------------------------------------------------------
// Difficulty helpers
// ---------------------------------------------------------------------------

export const DIFFICULTY_AGGRESSION_MULT: Record<Difficulty, number> = {
	story: 0.5,
	standard: 1,
	hard: 2,
};

export function readDifficulty(world: World): Difficulty {
	for (const e of world.query(Board)) {
		const b = e.get(Board);
		if (b) return b.difficulty;
	}
	return "standard";
}

// ---------------------------------------------------------------------------
// Faction building info
// ---------------------------------------------------------------------------

export interface FactionBuildingInfo {
	buildingType: BuildingType;
	tileX: number;
	tileZ: number;
}

/** Get all buildings owned by a faction. */
export function getFactionBuildings(
	world: World,
	factionId: string,
): FactionBuildingInfo[] {
	const result: FactionBuildingInfo[] = [];
	for (const e of world.query(Building)) {
		const b = e.get(Building);
		if (b && b.factionId === factionId) {
			result.push({
				buildingType: b.buildingType as BuildingType,
				tileX: b.tileX,
				tileZ: b.tileZ,
			});
		}
	}
	return result;
}

// ---------------------------------------------------------------------------
// Resource scoring (for fuzzy module)
// ---------------------------------------------------------------------------

/**
 * Get a normalized resource score (0-100) for a faction.
 * Based on total stockpile across all resource types.
 */
export function getFactionResourceScore(
	world: World,
	factionId: string,
): number {
	for (const e of world.query(Faction, ResourcePool)) {
		const f = e.get(Faction);
		const r = e.get(ResourcePool);
		if (f?.id === factionId && r) {
			const total =
				r.stone +
				r.timber +
				r.iron_ore +
				r.coal +
				r.food +
				r.fiber +
				r.sand +
				r.clay +
				r.steel +
				r.concrete +
				r.glass +
				r.circuits +
				r.fuel +
				r.alloy +
				r.nanomaterial +
				r.fusion_cell +
				r.quantum_crystal;
			// Normalize: 0 resources = 0, 200+ = 100
			return Math.min(100, (total / 200) * 100);
		}
	}
	return 50; // Default if no faction entity found
}

// ---------------------------------------------------------------------------
// Nearest enemy distance (sphere-aware)
// ---------------------------------------------------------------------------

/**
 * Get Manhattan distance to nearest enemy from any faction unit.
 * Sphere-aware: wraps X axis when wrapX is true.
 */
export function getNearestEnemyDist(
	myUnits: AgentSnapshot[],
	enemies: TurnContext["enemies"],
	boardWidth = 0,
	wrapX = false,
): number {
	if (myUnits.length === 0 || enemies.length === 0) return 30;
	let minDist = 30;
	for (const unit of myUnits) {
		for (const enemy of enemies) {
			const dist = sphereManhattan(
				unit.tileX,
				unit.tileZ,
				enemy.x,
				enemy.z,
				boardWidth,
				wrapX,
			);
			if (dist < minDist) minDist = dist;
		}
	}
	return minDist;
}

// ---------------------------------------------------------------------------
// Nearby threat counting (for FSM)
// ---------------------------------------------------------------------------

/** Count enemy/cult units within 5 tiles of any faction building. */
export function countNearbyThreats(
	factionBuildings: Array<{ tileX: number; tileZ: number }>,
	threats: Array<{ x: number; z: number }>,
): number {
	let count = 0;
	for (const t of threats) {
		for (const b of factionBuildings) {
			const dist = Math.abs(t.x - b.tileX) + Math.abs(t.z - b.tileZ);
			if (dist <= 5) {
				count++;
				break; // Count each threat once even if near multiple buildings
			}
		}
	}
	return count;
}

// ---------------------------------------------------------------------------
// Floor mining helpers
// ---------------------------------------------------------------------------

/** Find mineable tiles within scan range of faction units. */
export function findMineableTilesNearUnits(
	world: World,
	units: AgentSnapshot[],
	boardWidth = 0,
	wrapX = false,
): Array<{ x: number; z: number; material: string }> {
	const results: Array<{ x: number; z: number; material: string }> = [];
	const seen = new Set<string>();

	for (const e of world.query(Tile, TileBiome)) {
		const tile = e.get(Tile);
		const biome = e.get(TileBiome);
		if (!tile || !biome || !biome.mineable || !biome.resourceMaterial) continue;

		const key = `${tile.x},${tile.z}`;
		if (seen.has(key)) continue;

		// Check if any faction unit is within scan range * 2
		for (const unit of units) {
			const dist = sphereManhattan(
				unit.tileX,
				unit.tileZ,
				tile.x,
				tile.z,
				boardWidth,
				wrapX,
			);
			if (dist <= unit.scanRange * 2) {
				results.push({
					x: tile.x,
					z: tile.z,
					material: biome.resourceMaterial,
				});
				seen.add(key);
				break;
			}
		}
	}

	return results;
}

/** Find TileBiome data at a specific coordinate. */
export function findTileBiomeAt(
	world: World,
	x: number,
	z: number,
): {
	mineable: boolean;
	hardness: number;
	resourceMaterial: string | null;
} | null {
	for (const e of world.query(Tile, TileBiome)) {
		const tile = e.get(Tile);
		if (tile && tile.x === x && tile.z === z) {
			const biome = e.get(TileBiome);
			if (biome) return biome;
		}
	}
	return null;
}

// ---------------------------------------------------------------------------
// Territory counting
// ---------------------------------------------------------------------------

/** Count territory tiles for a faction (building positions + outpost influence). */
export function countFactionTerritory(world: World, factionId: string): number {
	let count = 0;
	for (const e of world.query(Building)) {
		const b = e.get(Building);
		if (b && b.factionId === factionId) count++;
	}
	return count;
}

/** Check if a faction is the strongest (most units + buildings). */
export function checkIsStrongest(
	factionId: string,
	agentsByFaction: Map<string, AgentSnapshot[]>,
	world: World,
): boolean {
	const myStrength =
		(agentsByFaction.get(factionId)?.length ?? 0) +
		countFactionTerritory(world, factionId);

	for (const [otherId] of agentsByFaction) {
		if (otherId === factionId) continue;
		const otherStrength =
			(agentsByFaction.get(otherId)?.length ?? 0) +
			countFactionTerritory(world, otherId);
		if (otherStrength > myStrength) return false;
	}
	return true;
}

// ---------------------------------------------------------------------------
// Terrain scoring for AI decisions
// ---------------------------------------------------------------------------

/**
 * Score a tile for strategic desirability based on biome properties.
 * Higher = more desirable for unit placement.
 *
 * - Hills: high defense + vision → good for positioning
 * - Forest: high defense + cover → good for defense
 * - Desert/tundra: environmental drain → avoid if possible
 * - Grassland: neutral, good for attacking enemies on
 */
export function scoreTileForPosition(biomeType: string): number {
	switch (biomeType) {
		case "hills":
			return 1.3; // +defense, +vision
		case "forest":
			return 1.2; // +defense, +cover
		case "wetland":
			return 0.8; // slow, minor defense
		case "grassland":
			return 1.0; // neutral
		case "desert":
			return 0.5; // drain
		case "tundra":
			return 0.5; // drain
		default:
			return 1.0;
	}
}

/**
 * Score a tile for attacking an enemy on it.
 * Lower enemy defense bonus = better target.
 */
export function scoreTileForAttacking(biomeType: string): number {
	switch (biomeType) {
		case "grassland":
			return 1.3; // No defense bonus — ideal for attacking
		case "desert":
			return 1.2; // No defense, enemies draining
		case "wetland":
			return 1.0;
		case "hills":
			return 0.7; // Enemy has defense bonus
		case "forest":
			return 0.5; // Enemy has defense + cover
		case "tundra":
			return 0.9;
		default:
			return 1.0;
	}
}

// ---------------------------------------------------------------------------
// Movement helper — uses Yuka NavGraph A* when available
// ---------------------------------------------------------------------------

export function moveToward(
	entity: ReturnType<World["query"]>[number],
	fromX: number,
	fromZ: number,
	targetX: number,
	targetZ: number,
	board: GeneratedBoard,
): void {
	// Try Yuka NavGraph pathfinding first
	const navGraph = getOrBuildNavGraph(board);
	const path = yukaShortestPath(fromX, fromZ, targetX, targetZ, navGraph);

	if (path.length >= 2) {
		const next = path[1];
		entity.add(
			UnitMove({
				fromX,
				fromZ,
				toX: next.x,
				toZ: next.z,
				progress: 0,
				mpCost: 1,
			}),
		);
	}
}
