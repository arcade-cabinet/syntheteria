/**
 * Place starter buildings for each faction at world init.
 *
 * Uses terrain-affinity spawn centers computed by computeSpawnCenters().
 * Each faction gets a storm_transmitter + storage_hub near their spawn.
 */

import type { World } from "koota";
import type { GeneratedBoard } from "../../board/types";
import { BUILDING_DEFS } from "../buildings/definitions";
import { FACTION_DEFINITIONS } from "../factions/definitions";
import { getSpawnCenters } from "../robots/placement";
import {
	Building,
	PowerGrid,
	StorageCapacity,
	type BuildingType,
} from "../traits/building";

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

	if (
		def.powerDelta !== 0 ||
		def.powerRadius > 0 ||
		type === "power_box"
	) {
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
}

// ─── Main ───────────────────────────────────────────────────────────────────

/**
 * Place starter buildings (storage_hub + storm_transmitter) for each faction.
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
	const placements: Array<{ factionId: string; center: { x: number; z: number } }> = [];

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

	for (const { factionId, center } of placements) {
		// Place storm_transmitter first (power source)
		const transmitterTile = findPassableNear(
			center.x,
			center.z,
			board,
			occupied,
		);
		if (transmitterTile) {
			spawnBuilding(
				world,
				"storm_transmitter",
				factionId,
				transmitterTile.x,
				transmitterTile.z,
			);
			occupied.add(`${transmitterTile.x},${transmitterTile.z}`);
		}

		// Place storage_hub nearby
		const hubTile = findPassableNear(center.x, center.z, board, occupied);
		if (hubTile) {
			spawnBuilding(
				world,
				"storage_hub",
				factionId,
				hubTile.x,
				hubTile.z,
			);
			occupied.add(`${hubTile.x},${hubTile.z}`);
		}
	}
}
