/**
 * Place starter buildings for each faction at world init.
 *
 * Uses terrain-affinity spawn centers computed by computeSpawnCenters().
 * Each faction gets storm_transmitter + motor_pool + outpost + storage_hub near spawn.
 * The motor_pool enables fabrication; the outpost raises pop cap by 4.
 */

import type { World } from "koota";
import type { GeneratedBoard } from "../board/types";
import { BUILDING_DEFS } from "../buildings";
import { FACTION_DEFINITIONS } from "../factions/definitions";
import { getSpawnCenters } from "../robots/placement";
import {
	BotFabricator,
	Building,
	type BuildingType,
	PowerGrid,
	StorageCapacity,
} from "../traits";

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Find a passable tile near (cx, cz), avoiding already-occupied tiles. */
function findPassableNear(
	cx: number,
	cz: number,
	board: GeneratedBoard,
	occupied: Set<string>,
): { x: number; z: number } | null {
	const { width, height } = board.config;
	for (let r = 0; r <= 5; r++) {
		for (let dx = -r; dx <= r; dx++) {
			for (let dz = -r; dz <= r; dz++) {
				const x = cx + dx;
				const z = cz + dz;
				if (x < 0 || z < 0 || x >= width || z >= height) continue;
				const key = `${x},${z}`;
				if (occupied.has(key)) continue;
				const tile = board.tiles[z]?.[x];
				if (tile?.passable) return { x, z };
			}
		}
	}
	return null;
}

function spawnBuilding(
	world: World,
	type: BuildingType,
	factionId: string,
	x: number,
	z: number,
): void {
	const def = BUILDING_DEFS[type];
	const entity = world.spawn(
		Building({
			tileX: x,
			tileZ: z,
			buildingType: type,
			modelId: def.modelId,
			factionId,
			hp: def.hp,
			maxHp: def.hp,
		}),
	);

	if (def.powerDelta !== 0 || def.powerRadius > 0 || type === "power_box") {
		entity.add(
			PowerGrid({
				powerDelta: def.powerDelta,
				storageCapacity: def.storageCapacity,
				currentCharge: 0,
				powerRadius: def.powerRadius,
			}),
		);
	}

	if (type === "storage_hub" && def.storageCapacity > 0) {
		entity.add(
			StorageCapacity({
				capacity: def.storageCapacity,
			}),
		);
	}

	if (def.fabricationSlots > 0) {
		entity.add(
			BotFabricator({
				fabricationSlots: def.fabricationSlots,
				queueSize: 0,
			}),
		);
	}
}

// ─── Main ───────────────────────────────────────────────────────────────────

/**
 * Place starter buildings for each faction:
 *   1. storm_transmitter — power source (must be first for coverage)
 *   2. motor_pool — unit fabrication (critical: without this, faction dies)
 *   3. synthesizer — converts raw → refined materials (unlocks economy chain)
 *   4. outpost — raises pop cap by 4 (12 base + 4 = 16 slots at start)
 *   5. storage_hub — resource storage
 *
 * Power budget: transmitter +5, motor_pool -3, synthesizer -4 = -2 deficit.
 * The power system tolerates slight deficit — synthesizer still gets Powered
 * if within transmitter's powerRadius (12 tiles). For safety we place all
 * buildings within 3 tiles of spawn center.
 *
 * Uses spawn centers from the terrain-affinity system.
 */
export function placeStarterBuildings(
	world: World,
	board: GeneratedBoard,
): void {
	const occupied = new Set<string>();
	const spawnCenters = getSpawnCenters();

	// Build the list of (factionId, center) pairs to place buildings for.
	// AI factions are stored under their real id (e.g. "volt_collective").
	// The player's spawn center is stored under "player", not the faction def id,
	// so we add it explicitly.
	const placements: Array<{
		factionId: string;
		center: { x: number; z: number };
	}> = [];

	for (const faction of FACTION_DEFINITIONS) {
		const center = spawnCenters.get(faction.id);
		if (center) {
			placements.push({ factionId: faction.id, center });
		}
	}

	// Player faction: spawn center stored under "player" key
	const playerCenter = spawnCenters.get("player");
	if (playerCenter) {
		placements.push({ factionId: "player", center: playerCenter });
	}

	const STARTER_BUILDINGS: BuildingType[] = [
		"storm_transmitter",
		"motor_pool",
		"synthesizer",
		"outpost",
		"storage_hub",
	];

	for (const { factionId, center } of placements) {
		for (const type of STARTER_BUILDINGS) {
			const tile = findPassableNear(center.x, center.z, board, occupied);
			if (tile) {
				spawnBuilding(world, type, factionId, tile.x, tile.z);
				occupied.add(`${tile.x},${tile.z}`);
			}
		}
	}
}
