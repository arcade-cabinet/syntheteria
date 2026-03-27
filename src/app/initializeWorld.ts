/**
 * World initialization — US-1.4: Only spawn player start.
 *
 * All entity placement (scavenge sites, lightning rods, fabrication units,
 * cult bases, enemy patrols) comes from the board's chunk generation.
 * This function ONLY creates the 2 starting robots and returns the
 * start position for camera targeting.
 */

import { getRooms, initCityLayout } from "../ecs/cityLayout";
import { spawnUnit } from "../ecs/factory";
import { setGameConfig, simulationTick } from "../ecs/gameState";
import { Fragment } from "../ecs/traits";
import { buildNavGraph } from "../systems/navmesh";

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

	// US-1.4: Only spawn the 2 starting robots. Nothing else.
	// Bot Alpha: working camera, broken arms
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

	// Bot Beta: working arms, broken camera
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

	// All other entities (scavenge sites, lightning rods, fabrication units,
	// cult bases, cult patrols) are spawned by ChunkManager when chunks load.
	// See src/game/ChunkManager.ts spawnChunkEntities().

	simulationTick();
	return { startX, startZ };
}
