/**
 * Save / load logic.
 *
 * Works with any DB adapter — currently serializes to/from plain objects
 * and persists via IndexedDB as a browser fallback before expo-sqlite.
 */

import { getSnapshot, setGameSpeed, setTickCount } from "../ecs/gameState";
import { getWorldSeed, setWorldSeed } from "../ecs/seed";
import type { Entity, UnitComponent, Vec3 } from "../ecs/types";
import { world } from "../ecs/world";
import { getStormIntensity, setStormIntensity } from "../systems/power";
import {
	addResource,
	getResources,
	type ResourcePool,
	resetResourcePool,
} from "../systems/resources";

// ---------------------------------------------------------------------------
// Serialized data shapes (plain objects, JSON-safe)
// ---------------------------------------------------------------------------

export interface SavedEntityData {
	entityId: string;
	entityType: string;
	faction: string;
	position: Vec3;
	/** JSON-safe blob of component-specific data */
	componentData: Record<string, unknown>;
}

export interface SaveData {
	name: string;
	seed: number;
	createdAt: number;
	playTimeSeconds: number;
	gameSpeed: number;
	tickCount: number;
	stormIntensity: number;
	entities: SavedEntityData[];
	resources: ResourcePool;
}

// ---------------------------------------------------------------------------
// Serialize
// ---------------------------------------------------------------------------

function classifyEntity(e: Entity): string {
	if (e.unit) return e.unit.type;
	if (e.building) return e.building.type;
	if (e.belt) return "belt";
	if (e.otter) return "otter";
	return "unknown";
}

function serializeComponents(e: Entity): Record<string, unknown> {
	const data: Record<string, unknown> = {};

	if (e.unit) {
		data.unit = {
			type: e.unit.type,
			displayName: e.unit.displayName,
			speed: e.unit.speed,
			selected: e.unit.selected,
			components: e.unit.components.map((c: UnitComponent) => ({
				name: c.name,
				functional: c.functional,
				material: c.material,
			})),
		};
	}

	if (e.building) {
		data.building = {
			type: e.building.type,
			powered: e.building.powered,
			operational: e.building.operational,
			selected: e.building.selected,
			components: e.building.components.map((c: UnitComponent) => ({
				name: c.name,
				functional: c.functional,
				material: c.material,
			})),
		};
	}

	if (e.lightningRod) {
		data.lightningRod = { ...e.lightningRod };
	}

	if (e.navigation) {
		data.navigation = {
			path: e.navigation.path,
			pathIndex: e.navigation.pathIndex,
			moving: e.navigation.moving,
		};
	}

	if (e.mapFragment) {
		data.mapFragment = { fragmentId: e.mapFragment.fragmentId };
	}

	if (e.playerControlled) {
		data.playerControlled = {
			isActive: e.playerControlled.isActive,
			yaw: e.playerControlled.yaw,
			pitch: e.playerControlled.pitch,
		};
	}

	if (e.belt) {
		data.belt = { ...e.belt };
	}

	if (e.wire) {
		data.wire = { ...e.wire };
	}

	if (e.miner) {
		data.miner = { ...e.miner };
	}

	if (e.processor) {
		data.processor = { ...e.processor };
	}

	if (e.hackable) {
		data.hackable = { ...e.hackable };
	}

	if (e.automation) {
		data.automation = { ...e.automation };
	}

	if (e.otter) {
		data.otter = { ...e.otter };
	}

	return data;
}

/**
 * Snapshot the entire ECS world into a serializable SaveData object.
 */
export function serializeWorld(name: string, playTimeSeconds = 0): SaveData {
	const snap = getSnapshot();
	const entities: SavedEntityData[] = [];

	for (const e of world) {
		if (!e.worldPosition) continue;

		entities.push({
			entityId: e.id,
			entityType: classifyEntity(e),
			faction: e.faction,
			position: { ...e.worldPosition },
			componentData: serializeComponents(e),
		});
	}

	return {
		name,
		seed: getWorldSeed(),
		createdAt: Date.now(),
		playTimeSeconds,
		gameSpeed: snap.gameSpeed,
		tickCount: snap.tick,
		stormIntensity: getStormIntensity(),
		entities,
		resources: getResources(),
	};
}

// ---------------------------------------------------------------------------
// Deserialize
// ---------------------------------------------------------------------------

/**
 * Clear the ECS world and recreate all entities from a SaveData snapshot.
 */
export function deserializeWorld(data: SaveData): void {
	// Clear all existing entities
	const existing = Array.from(world);
	for (const e of existing) {
		world.remove(e);
	}

	// Restore seed
	setWorldSeed(data.seed);

	// Restore simulation state
	setGameSpeed(data.gameSpeed);
	setTickCount(data.tickCount);
	setStormIntensity(data.stormIntensity);

	// Restore entities
	for (const saved of data.entities) {
		const entity: Entity = {
			id: saved.entityId,
			faction: saved.faction as Entity["faction"],
			worldPosition: { ...saved.position },
		};

		const cd = saved.componentData;

		if (cd.unit) {
			entity.unit = cd.unit as Entity["unit"];
		}

		if (cd.building) {
			entity.building = cd.building as Entity["building"];
		}

		if (cd.lightningRod) {
			entity.lightningRod = cd.lightningRod as Entity["lightningRod"];
		}

		if (cd.navigation) {
			entity.navigation = cd.navigation as Entity["navigation"];
		}

		if (cd.mapFragment) {
			entity.mapFragment = cd.mapFragment as Entity["mapFragment"];
		}

		if (cd.playerControlled) {
			entity.playerControlled =
				cd.playerControlled as Entity["playerControlled"];
		}

		if (cd.belt) {
			entity.belt = cd.belt as Entity["belt"];
		}

		if (cd.wire) {
			entity.wire = cd.wire as Entity["wire"];
		}

		if (cd.miner) {
			entity.miner = cd.miner as Entity["miner"];
		}

		if (cd.processor) {
			entity.processor = cd.processor as Entity["processor"];
		}

		if (cd.hackable) {
			entity.hackable = cd.hackable as Entity["hackable"];
		}

		if (cd.automation) {
			entity.automation = cd.automation as Entity["automation"];
		}

		if (cd.otter) {
			entity.otter = cd.otter as Entity["otter"];
		}

		world.add(entity);
	}

	// Restore resources — reset pool first to prevent inflation on re-load
	resetResourcePool();
	const res = data.resources;
	addResource("scrapMetal", res.scrapMetal);
	addResource("eWaste", res.eWaste);
	addResource("intactComponents", res.intactComponents);
}

// ---------------------------------------------------------------------------
// IndexedDB persistence (browser fallback)
// ---------------------------------------------------------------------------

const DB_NAME = "syntheteria_saves";
const DB_VERSION = 1;
const STORE_NAME = "saves";

function openDB(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, DB_VERSION);

		request.onupgradeneeded = () => {
			const db = request.result;
			if (!db.objectStoreNames.contains(STORE_NAME)) {
				db.createObjectStore(STORE_NAME, { keyPath: "name" });
			}
		};

		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
}

/**
 * Save the current world state to IndexedDB under the given name.
 */
export async function saveToIndexedDB(
	name: string,
	playTimeSeconds = 0,
): Promise<void> {
	const data = serializeWorld(name, playTimeSeconds);
	const db = await openDB();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE_NAME, "readwrite");
		const store = tx.objectStore(STORE_NAME);
		store.put(data);
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
	});
}

/**
 * Load a saved world from IndexedDB and restore it.
 */
export async function loadFromIndexedDB(name: string): Promise<void> {
	const db = await openDB();
	const data: SaveData | undefined = await new Promise((resolve, reject) => {
		const tx = db.transaction(STORE_NAME, "readonly");
		const store = tx.objectStore(STORE_NAME);
		const req = store.get(name);
		req.onsuccess = () => resolve(req.result as SaveData | undefined);
		req.onerror = () => reject(req.error);
	});

	if (!data) {
		throw new Error(`Save "${name}" not found`);
	}

	deserializeWorld(data);
}

/**
 * List all save names stored in IndexedDB.
 */
export async function listSaves(): Promise<string[]> {
	const db = await openDB();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE_NAME, "readonly");
		const store = tx.objectStore(STORE_NAME);
		const req = store.getAllKeys();
		req.onsuccess = () => resolve(req.result as string[]);
		req.onerror = () => reject(req.error);
	});
}

/**
 * Delete a save from IndexedDB.
 */
export async function deleteSave(name: string): Promise<void> {
	const db = await openDB();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE_NAME, "readwrite");
		const store = tx.objectStore(STORE_NAME);
		store.delete(name);
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
	});
}
