/**
 * ChunkManager — imperative chunk lifecycle for the game canvas.
 *
 * Loads/unloads labyrinth chunks as the camera pans. Keeps a Map of
 * loaded chunks and lazily generates new ones within VIEW_RADIUS of
 * the current camera chunk.
 *
 * Entity lifecycle (US-1.2): When a chunk loads, its deterministic
 * entity spawn list is instantiated into Koota ECS. When a chunk
 * unloads, those entities are destroyed. This makes entity count
 * scale with loaded chunk count.
 *
 * Not a React component — called imperatively from GameCanvas.
 */

import type { Scene } from "@babylonjs/core/scene";
import type { Entity } from "koota";
import {
	CHUNK_SIZE,
	type ChunkEntitySpawn,
	type ChunkKey,
	type ChunkMeshes,
	chunkKey,
	disposeChunkMeshes,
	generateChunk,
	populateChunkScene,
	TILE_M,
} from "../board";
import { TILE_SIZE_M } from "../board/coords";
import { createFragment, getTerrainHeight } from "../ecs/terrain";
import {
	BuildingTrait,
	EntityId,
	Faction,
	Fragment,
	LightningRod,
	Navigation,
	Position,
	ScavengeSite,
	Unit,
	UnitComponents,
} from "../ecs/traits";
import { serializeComponents } from "../ecs/types";
import { world } from "../ecs/world";
import { logError } from "../errors";

/** How many chunks to load in each direction from the camera chunk. */
const VIEW_RADIUS = 3;

/** Entity ID counter for chunk-spawned entities. */
let nextChunkEntityId = 1000;

export interface ChunkManagerState {
	loaded: Map<ChunkKey, ChunkMeshes>;
	/** Entities spawned per chunk, keyed by ChunkKey. */
	chunkEntities: Map<ChunkKey, Entity[]>;
	lastCameraChunk: string;
	seed: string;
}

/**
 * Create the initial manager state and load chunks around the start position.
 *
 * @param scene - BabylonJS scene to populate
 * @param startWorldX - world-space X of the player start (tile coords * TILE_SIZE_M)
 * @param startWorldZ - world-space Z of the player start
 * @param seed - world generation seed
 */
export function initChunks(
	scene: Scene,
	startWorldX: number,
	startWorldZ: number,
	seed: string,
): ChunkManagerState {
	const startCx = Math.floor(startWorldX / (CHUNK_SIZE * TILE_M));
	const startCz = Math.floor(startWorldZ / (CHUNK_SIZE * TILE_M));

	const state: ChunkManagerState = {
		loaded: new Map(),
		chunkEntities: new Map(),
		lastCameraChunk: `${startCx},${startCz}`,
		seed,
	};

	loadChunksAround(startCx, startCz, scene, state);
	return state;
}

/**
 * Check camera position and load/unload chunks if the camera has moved
 * to a new chunk. Call this from the camera's onViewMatrixChanged observable.
 *
 * @param cameraTargetX - world-space X of the camera target
 * @param cameraTargetZ - world-space Z of the camera target
 * @param scene - BabylonJS scene
 * @param state - chunk manager state (mutated in place)
 */
export function updateChunks(
	cameraTargetX: number,
	cameraTargetZ: number,
	scene: Scene,
	state: ChunkManagerState,
): void {
	const cx = Math.floor(cameraTargetX / (CHUNK_SIZE * TILE_M));
	const cz = Math.floor(cameraTargetZ / (CHUNK_SIZE * TILE_M));
	const key = `${cx},${cz}`;

	if (key !== state.lastCameraChunk) {
		state.lastCameraChunk = key;
		loadChunksAround(cx, cz, scene, state);
	}
}

/**
 * Dispose all loaded chunk meshes and entities. Call on cleanup / unmount.
 */
export function disposeAllChunks(state: ChunkManagerState): void {
	for (const cm of state.loaded.values()) {
		disposeChunkMeshes(cm);
	}
	state.loaded.clear();

	// Destroy all chunk-spawned entities
	for (const entities of state.chunkEntities.values()) {
		for (const entity of entities) {
			if (entity.isAlive()) {
				entity.destroy();
			}
		}
	}
	state.chunkEntities.clear();
}

// ─── Internal ────────────────────────────────────────────────────────────────

function loadChunksAround(
	cx: number,
	cz: number,
	scene: Scene,
	state: ChunkManagerState,
): void {
	const needed = new Set<ChunkKey>();

	for (let dz = -VIEW_RADIUS; dz <= VIEW_RADIUS; dz++) {
		for (let dx = -VIEW_RADIUS; dx <= VIEW_RADIUS; dx++) {
			const key = chunkKey(cx + dx, cz + dz);
			needed.add(key);

			if (!state.loaded.has(key)) {
				const chunk = generateChunk(state.seed, cx + dx, cz + dz);
				const meshes = populateChunkScene(chunk, scene);
				state.loaded.set(key, meshes);

				// Spawn entities from chunk data (US-1.2)
				const entities = spawnChunkEntities(chunk.entities);
				state.chunkEntities.set(key, entities);
			}
		}
	}

	// Unload chunks that are no longer within view radius
	for (const [key, cm] of state.loaded) {
		if (!needed.has(key)) {
			disposeChunkMeshes(cm);
			state.loaded.delete(key);

			// Despawn entities for this chunk
			const entities = state.chunkEntities.get(key);
			if (entities) {
				for (const entity of entities) {
					if (entity.isAlive()) {
						entity.destroy();
					}
				}
				state.chunkEntities.delete(key);
			}
		}
	}
}

/**
 * Spawn ECS entities from chunk entity descriptors.
 * Returns array of spawned entities for later cleanup.
 */
function spawnChunkEntities(spawns: ChunkEntitySpawn[]): Entity[] {
	const entities: Entity[] = [];
	const fragment = createFragment();

	for (const spawn of spawns) {
		try {
			const wx = spawn.tileX * TILE_SIZE_M;
			const wz = spawn.tileZ * TILE_SIZE_M;
			const y = getTerrainHeight(wx, wz);
			const id = `chunk_${nextChunkEntityId++}`;

			let entity: Entity;

			switch (spawn.kind) {
				case "scavenge_site":
					entity = world.spawn(
						EntityId({ value: id }),
						Position({ x: wx, y, z: wz }),
						ScavengeSite({
							materialType: spawn.materialType ?? "scrap_metal",
							amountPerScavenge: 2,
							remaining: spawn.remaining ?? 3,
						}),
					);
					break;

				case "lightning_rod":
					entity = world.spawn(
						EntityId({ value: id }),
						Position({ x: wx, y, z: wz }),
						Faction({ value: "player" }),
						Fragment({ fragmentId: fragment.id }),
						BuildingTrait({
							buildingType: "lightning_rod",
							powered: true,
							operational: true,
							selected: false,
							buildingComponentsJson: "[]",
						}),
						LightningRod({
							rodCapacity: 10,
							currentOutput: 7,
							protectionRadius: 8,
						}),
					);
					break;

				case "fabrication_unit":
					entity = world.spawn(
						EntityId({ value: id }),
						Position({ x: wx, y, z: wz }),
						Faction({ value: "player" }),
						Fragment({ fragmentId: fragment.id }),
						Unit({
							unitType: "fabrication_unit",
							displayName: "Fabrication Unit",
							speed: 0,
							selected: false,
						}),
						UnitComponents({
							componentsJson: serializeComponents([
								{
									name: "power_supply",
									functional: false,
									material: "electronic",
								},
								{
									name: "fabrication_arm",
									functional: true,
									material: "metal",
								},
								{
									name: "material_hopper",
									functional: true,
									material: "metal",
								},
							]),
						}),
						BuildingTrait({
							buildingType: "fabrication_unit",
							powered: false,
							operational: false,
							selected: false,
							buildingComponentsJson: "[]",
						}),
					);
					break;

				case "cult_patrol":
					entity = world.spawn(
						EntityId({ value: id }),
						Position({ x: wx, y, z: wz }),
						Faction({ value: "cultist" }),
						Fragment({ fragmentId: fragment.id }),
						Unit({
							unitType: "wanderer",
							displayName: `Cult Patrol ${id.slice(-3).toUpperCase()}`,
							speed: 2 + Math.random() * 1.5,
							selected: false,
						}),
						UnitComponents({
							componentsJson: serializeComponents([
								{
									name: "camera",
									functional: true,
									material: "electronic",
								},
								{
									name: "arms",
									functional: Math.random() > 0.3,
									material: "metal",
								},
								{ name: "legs", functional: true, material: "metal" },
								{
									name: "power_cell",
									functional: true,
									material: "electronic",
								},
							]),
						}),
						Navigation({ pathJson: "[]", pathIndex: 0, moving: false }),
					);
					break;
			}

			entities.push(entity!);
		} catch (error) {
			logError(
				error instanceof Error
					? error
					: new Error(`Failed to spawn chunk entity: ${String(error)}`),
			);
		}
	}

	return entities;
}
