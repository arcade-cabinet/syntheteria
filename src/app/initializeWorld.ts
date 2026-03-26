import { getRooms, initCityLayout } from "../ecs/cityLayout";
import {
	spawnFabricationUnit,
	spawnLightningRod,
	spawnUnit,
} from "../ecs/factory";
import {
	setGameConfig,
	simulationTick,
} from "../ecs/gameState";
import { Fragment } from "../ecs/traits";
import { world } from "../ecs/world";
import { foundBase } from "../systems/baseManagement";

export function initializeWorld(
	seed = "default",
	difficulty: "easy" | "normal" | "hard" = "normal",
): { startX: number; startZ: number } {
	setGameConfig(seed, difficulty);
	initCityLayout({ width: 48, height: 48, seed, difficulty });

	const rooms = getRooms();
	const playerRoom = rooms.find((room) => room.tag === "player");
	const tileSize = 2.0;
	const startX = playerRoom
		? (playerRoom.x + playerRoom.w / 2) * tileSize
		: 48;
	const startZ = playerRoom
		? (playerRoom.z + playerRoom.h / 2) * tileSize
		: 62;

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
