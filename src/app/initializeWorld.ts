import { getRooms, initCityLayout } from "../ecs/cityLayout";
import {
	spawnFabricationUnit,
	spawnLightningRod,
	spawnUnit,
} from "../ecs/factory";
import { setGameConfig, simulationTick } from "../ecs/gameState";
import { getTerrainHeight } from "../ecs/terrain";
import { EntityId, Fragment, Position, ScavengeSite } from "../ecs/traits";
import { world } from "../ecs/world";
import { foundBase } from "../systems/baseManagement";
import { buildNavGraph } from "../systems/navmesh";

/** Counter for unique scavenge site IDs. */
let nextScavengeId = 0;

/** Spawn a scavenge site at world coordinates. */
function spawnScavengeSite(
	x: number,
	z: number,
	materialType: string,
	remaining = 5,
): void {
	const y = getTerrainHeight(x, z);
	const id = `scavenge_${nextScavengeId++}`;

	world.spawn(
		EntityId({ value: id }),
		Position({ x, y, z }),
		ScavengeSite({
			materialType,
			amountPerScavenge: 2,
			remaining,
		}),
	);
}

export function initializeWorld(
	seed = "default",
	difficulty: "easy" | "normal" | "hard" = "normal",
): { startX: number; startZ: number } {
	setGameConfig(seed, difficulty);
	initCityLayout({ width: 48, height: 48, seed, difficulty });

	// Build navigation graph after city layout — required for pathfinding
	buildNavGraph();

	const rooms = getRooms();
	const playerRoom = rooms.find((room) => room.tag === "player");
	const tileSize = 2.0;
	const startX = playerRoom ? (playerRoom.x + playerRoom.w / 2) * tileSize : 48;
	const startZ = playerRoom ? (playerRoom.z + playerRoom.h / 2) * tileSize : 62;

	const botAlpha = spawnUnit({
		x: startX - 2,
		z: startZ,
		displayName: "Bot Alpha",
		components: [
			{ name: "camera", functional: true, material: "electronic" },
			{ name: "arms", functional: false, material: "metal" },
			{ name: "legs", functional: true, material: "metal" },
			{ name: "power_cell", functional: true, material: "electronic" },
		],
	});

	spawnUnit({
		x: startX + 2,
		z: startZ,
		fragmentId: botAlpha.get(Fragment)!.fragmentId,
		displayName: "Bot Beta",
		components: [
			{ name: "camera", functional: false, material: "electronic" },
			{ name: "arms", functional: true, material: "metal" },
			{ name: "legs", functional: true, material: "metal" },
			{ name: "power_cell", functional: true, material: "electronic" },
		],
	});

	spawnFabricationUnit({
		x: startX,
		z: startZ + 2,
		fragmentId: botAlpha.get(Fragment)!.fragmentId,
		powered: false,
		components: [
			{ name: "power_supply", functional: false, material: "electronic" },
			{ name: "fabrication_arm", functional: true, material: "metal" },
			{ name: "material_hopper", functional: true, material: "metal" },
		],
	});

	spawnLightningRod({
		x: startX - 3,
		z: startZ + 2,
		fragmentId: botAlpha.get(Fragment)!.fragmentId,
	});

	// Spawn scavenge sites near the player start — 4 types, spread around
	const scavengeSites = [
		{ dx: 6, dz: 0, type: "scrapMetal", remaining: 5 },
		{ dx: -6, dz: 4, type: "circuitry", remaining: 4 },
		{ dx: 4, dz: -6, type: "powerCells", remaining: 3 },
		{ dx: -4, dz: -4, type: "durasteel", remaining: 4 },
		{ dx: 8, dz: 6, type: "scrapMetal", remaining: 6 },
		{ dx: -8, dz: -6, type: "circuitry", remaining: 5 },
		{ dx: 10, dz: -4, type: "powerCells", remaining: 3 },
		{ dx: -10, dz: 8, type: "durasteel", remaining: 4 },
	];

	for (const site of scavengeSites) {
		spawnScavengeSite(
			startX + site.dx,
			startZ + site.dz,
			site.type,
			site.remaining,
		);
	}

	// Cult bases in northern zone
	const cultBases = [
		{ tileX: 50, tileZ: 20, name: "Cult Stronghold Alpha" },
		{ tileX: 150, tileZ: 30, name: "Cult Outpost Beta" },
		{ tileX: 100, tileZ: 10, name: "Cult Citadel Gamma" },
	];

	for (const base of cultBases) {
		try {
			foundBase(world, base.tileX, base.tileZ, "cultist", base.name);
		} catch (error) {
			console.warn("[init] cult base placement failed:", base.name, error);
		}
	}

	simulationTick();
	return { startX, startZ };
}
