/**
 * Save/Load manager with IndexedDB persistence and slot system.
 *
 * Features:
 * - 3 manual save slots + 1 autosave slot
 * - Full game state serialization (ECS entities, resources, power, territories)
 * - Autosave every 5 minutes (configurable)
 * - Graceful fallback to localStorage when IndexedDB is unavailable
 * - Round-trip safe: serialize -> store -> load -> deserialize preserves state
 */

import {
	isNativeDbAvailable,
	nativeDeleteSave,
	nativeGetAllSaves,
	nativeGetSave,
	nativePutSave,
} from "./db";
import { getSnapshot, setGameSpeed, setTickCount } from "../ecs/gameState";
import { getWorldSeed, setWorldSeed } from "../ecs/seed";
import type { Entity, UnitComponent, Vec3 } from "../ecs/types";
import { resetBridge, spawnKootaEntity } from "../ecs/koota/bridge";
import { world } from "../ecs/world";
import { getStormIntensity } from "../systems/power";
import {
	addResource,
	getResources,
	type ResourcePool,
	resetResourcePool,
	resetScavengePoints,
} from "../systems/resources";
import {
	claimTerritory,
	getAllTerritories,
	resetTerritories,
	type Territory,
} from "../systems/territory";

// ---------------------------------------------------------------------------
// Save data types
// ---------------------------------------------------------------------------

/** Identifies a save slot. */
export type SaveSlotId = "slot_1" | "slot_2" | "slot_3" | "autosave";

/** All valid slot IDs. */
export const ALL_SLOT_IDS: readonly SaveSlotId[] = [
	"slot_1",
	"slot_2",
	"slot_3",
	"autosave",
] as const;

/** Summary info for a save slot — used by the UI without loading the full data. */
export interface SaveSlotInfo {
	slotId: SaveSlotId;
	name: string;
	createdAt: number;
	updatedAt: number;
	playTimeSeconds: number;
	tickCount: number;
	seed: number;
	unitCount: number;
	buildingCount: number;
}

/** Serialized entity data — JSON-safe. */
export interface SerializedEntity {
	entityId: string;
	entityType: string;
	faction: string;
	position: Vec3;
	componentData: Record<string, unknown>;
}

/** Serialized territory data — JSON-safe. */
export interface SerializedTerritory {
	id: string;
	ownerId: string;
	center: { x: number; z: number };
	radius: number;
	strength: number;
	established: number;
}

/** Full save payload stored in IndexedDB or localStorage. */
export interface SavePayload {
	version: number;
	slotId: SaveSlotId;
	name: string;
	seed: number;
	createdAt: number;
	updatedAt: number;
	playTimeSeconds: number;
	gameSpeed: number;
	tickCount: number;
	stormIntensity: number;
	entities: SerializedEntity[];
	resources: ResourcePool;
	territories: SerializedTerritory[];
}

/** Current save format version. Increment when the schema changes. */
const SAVE_VERSION = 1;

// ---------------------------------------------------------------------------
// Entity serialization
// ---------------------------------------------------------------------------

function classifyEntity(e: Entity): string {
	if (e.unit) return e.unit.type;
	if (e.building) return e.building.type;
	if (e.belt) return "belt";
	if (e.wire) return "wire";
	if (e.otter) return "otter";
	if (e.oreDeposit) return "ore_deposit";
	if (e.materialCube) return "material_cube";
	if (e.hologram) return "hologram";
	if (e.item) return "item";
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

	if (e.oreDeposit) {
		data.oreDeposit = { ...e.oreDeposit };
	}

	if (e.materialCube) {
		data.materialCube = { ...e.materialCube };
	}

	if (e.placedAt) {
		data.placedAt = { ...e.placedAt };
	}

	if (e.grabbable) {
		data.grabbable = { ...e.grabbable };
	}

	if (e.powderStorage) {
		data.powderStorage = { ...e.powderStorage };
	}

	if (e.hopper) {
		data.hopper = {
			slots: e.hopper.slots,
			contents: e.hopper.contents.map((c) => ({
				material: c.material,
				count: c.count,
			})),
		};
	}

	if (e.cubeStack) {
		data.cubeStack = {
			cubes: [...e.cubeStack.cubes],
			gridX: e.cubeStack.gridX,
			gridZ: e.cubeStack.gridZ,
			height: e.cubeStack.height,
		};
	}

	if (e.hologram) {
		data.hologram = { ...e.hologram };
	}

	if (e.signalRelay) {
		data.signalRelay = { ...e.signalRelay };
	}

	if (e.item) {
		data.item = { ...e.item };
	}

	if (e.heldBy !== undefined) {
		data.heldBy = e.heldBy;
	}

	if (e.onBelt !== undefined) {
		data.onBelt = e.onBelt;
	}

	if (e.inHopper !== undefined) {
		data.inHopper = e.inHopper;
	}

	return data;
}

// ---------------------------------------------------------------------------
// Serialization
// ---------------------------------------------------------------------------

/**
 * Snapshot the entire ECS world into a SavePayload.
 */
export function serializeWorld(
	slotId: SaveSlotId,
	name: string,
	playTimeSeconds: number,
	existingCreatedAt?: number,
): SavePayload {
	const snap = getSnapshot();
	const entities: SerializedEntity[] = [];

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

	const territories: SerializedTerritory[] = getAllTerritories().map((t) => ({
		id: t.id,
		ownerId: t.ownerId,
		center: { x: t.center.x, z: t.center.z },
		radius: t.radius,
		strength: t.strength,
		established: t.established,
	}));

	const now = Date.now();
	return {
		version: SAVE_VERSION,
		slotId,
		name,
		seed: getWorldSeed(),
		createdAt: existingCreatedAt ?? now,
		updatedAt: now,
		playTimeSeconds,
		gameSpeed: snap.gameSpeed,
		tickCount: snap.tick,
		stormIntensity: getStormIntensity(),
		entities,
		resources: getResources(),
		territories,
	};
}

// ---------------------------------------------------------------------------
// Deserialization
// ---------------------------------------------------------------------------

/**
 * Clear the ECS world and recreate all entities from a SavePayload.
 */
export function deserializeWorld(data: SavePayload): void {
	// Clear all existing entities from both Miniplex and Koota
	resetBridge();
	const existing = Array.from(world);
	for (const e of existing) {
		world.remove(e);
	}

	// Restore seed
	setWorldSeed(data.seed);

	// Restore simulation state
	setGameSpeed(data.gameSpeed);
	setTickCount(data.tickCount);

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

		if (cd.oreDeposit) {
			entity.oreDeposit = cd.oreDeposit as Entity["oreDeposit"];
		}

		if (cd.materialCube) {
			entity.materialCube = cd.materialCube as Entity["materialCube"];
		}

		if (cd.placedAt) {
			entity.placedAt = cd.placedAt as Entity["placedAt"];
		}

		if (cd.grabbable) {
			entity.grabbable = cd.grabbable as Entity["grabbable"];
		}

		if (cd.powderStorage) {
			entity.powderStorage = cd.powderStorage as Entity["powderStorage"];
		}

		if (cd.hopper) {
			entity.hopper = cd.hopper as Entity["hopper"];
		}

		if (cd.cubeStack) {
			entity.cubeStack = cd.cubeStack as Entity["cubeStack"];
		}

		if (cd.hologram) {
			entity.hologram = cd.hologram as Entity["hologram"];
		}

		if (cd.signalRelay) {
			entity.signalRelay = cd.signalRelay as Entity["signalRelay"];
		}

		if (cd.item) {
			entity.item = cd.item as Entity["item"];
		}

		if (cd.heldBy !== undefined) {
			entity.heldBy = cd.heldBy as string;
		}

		if (cd.onBelt !== undefined) {
			entity.onBelt = cd.onBelt as string;
		}

		if (cd.inHopper !== undefined) {
			entity.inHopper = cd.inHopper as string;
		}

		spawnKootaEntity(entity as Entity & { id: string });
	}

	// Restore resources — reset pool first to prevent inflation on re-load
	resetResourcePool();
	const res = data.resources;
	addResource("scrapMetal", res.scrapMetal);
	addResource("eWaste", res.eWaste);
	addResource("intactComponents", res.intactComponents);

	// Reset scavenge points so they regenerate from the restored seed
	resetScavengePoints();

	// Restore territories
	resetTerritories();
	for (const t of data.territories) {
		const claimed = claimTerritory(
			world,
			t.ownerId,
			{ x: t.center.x, z: t.center.z },
			t.radius,
			t.established,
		);
		// Restore strength (claimTerritory sets it to 1)
		(claimed as Territory & { strength: number }).strength = t.strength;
	}
}

/**
 * Extract SaveSlotInfo from a full payload without loading the full entity data.
 */
function payloadToSlotInfo(data: SavePayload): SaveSlotInfo {
	let unitCount = 0;
	let buildingCount = 0;
	for (const e of data.entities) {
		if (e.componentData.unit) unitCount++;
		if (e.componentData.building) buildingCount++;
	}

	return {
		slotId: data.slotId,
		name: data.name,
		createdAt: data.createdAt,
		updatedAt: data.updatedAt,
		playTimeSeconds: data.playTimeSeconds,
		tickCount: data.tickCount,
		seed: data.seed,
		unitCount,
		buildingCount,
	};
}

// ---------------------------------------------------------------------------
// Storage backend abstraction
// ---------------------------------------------------------------------------

/**
 * Detect whether IndexedDB is available and functional.
 */
function isIndexedDBAvailable(): boolean {
	try {
		if (typeof indexedDB === "undefined") return false;
		// Some browsers have indexedDB but throw in private/incognito mode
		// We can't do a synchronous test, so we check for the constructor
		return typeof indexedDB.open === "function";
	} catch {
		return false;
	}
}

// ---------------------------------------------------------------------------
// IndexedDB backend
// ---------------------------------------------------------------------------

const DB_NAME = "syntheteria_saves_v2";
const DB_VERSION = 1;
const STORE_NAME = "save_slots";

function openDB(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, DB_VERSION);

		request.onupgradeneeded = () => {
			const db = request.result;
			if (!db.objectStoreNames.contains(STORE_NAME)) {
				db.createObjectStore(STORE_NAME, { keyPath: "slotId" });
			}
		};

		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
}

async function idbPut(data: SavePayload): Promise<void> {
	const db = await openDB();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE_NAME, "readwrite");
		const store = tx.objectStore(STORE_NAME);
		store.put(data);
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
	});
}

async function idbGet(slotId: SaveSlotId): Promise<SavePayload | undefined> {
	const db = await openDB();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE_NAME, "readonly");
		const store = tx.objectStore(STORE_NAME);
		const req = store.get(slotId);
		req.onsuccess = () => resolve(req.result as SavePayload | undefined);
		req.onerror = () => reject(req.error);
	});
}

async function idbGetAll(): Promise<SavePayload[]> {
	const db = await openDB();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE_NAME, "readonly");
		const store = tx.objectStore(STORE_NAME);
		const req = store.getAll();
		req.onsuccess = () => resolve(req.result as SavePayload[]);
		req.onerror = () => reject(req.error);
	});
}

async function idbDelete(slotId: SaveSlotId): Promise<void> {
	const db = await openDB();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE_NAME, "readwrite");
		const store = tx.objectStore(STORE_NAME);
		store.delete(slotId);
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
	});
}

// ---------------------------------------------------------------------------
// localStorage fallback
// ---------------------------------------------------------------------------

const LS_PREFIX = "syntheteria_save_";

function lsPut(data: SavePayload): void {
	try {
		localStorage.setItem(LS_PREFIX + data.slotId, JSON.stringify(data));
	} catch (err) {
		console.error("[SaveManager] localStorage write failed:", err);
		throw new Error("Save failed: storage full or unavailable");
	}
}

function lsGet(slotId: SaveSlotId): SavePayload | undefined {
	const raw = localStorage.getItem(LS_PREFIX + slotId);
	if (!raw) return undefined;
	try {
		return JSON.parse(raw) as SavePayload;
	} catch {
		return undefined;
	}
}

function lsGetAll(): SavePayload[] {
	const results: SavePayload[] = [];
	for (const id of ALL_SLOT_IDS) {
		const data = lsGet(id);
		if (data) results.push(data);
	}
	return results;
}

function lsDelete(slotId: SaveSlotId): void {
	localStorage.removeItem(LS_PREFIX + slotId);
}

// ---------------------------------------------------------------------------
// SaveManager — public API
// ---------------------------------------------------------------------------

/** Default autosave interval: 5 minutes in milliseconds. */
const DEFAULT_AUTOSAVE_INTERVAL_MS = 5 * 60 * 1000;

/** Whether we're using IndexedDB (true) or localStorage fallback (false). */
let useIDB = isIndexedDBAvailable();

/** Autosave interval handle. */
let autosaveTimer: ReturnType<typeof setInterval> | null = null;

/** Game start time — used to track play time for this session. */
let sessionStartTime = 0;

/** Play time already accumulated from a loaded save. */
let accumulatedPlayTime = 0;

/**
 * Get total play time for the current session (in seconds).
 */
export function getCurrentPlayTime(): number {
	if (sessionStartTime === 0) return accumulatedPlayTime;
	const elapsed = (Date.now() - sessionStartTime) / 1000;
	return accumulatedPlayTime + elapsed;
}

/**
 * Start tracking play time from now.
 * Call this when a game starts or is loaded.
 */
export function startPlayTimeTracking(previousPlayTime = 0): void {
	accumulatedPlayTime = previousPlayTime;
	sessionStartTime = Date.now();
}

/**
 * Save the current game state to the specified slot.
 */
export async function saveGame(
	slotId: SaveSlotId,
	name?: string,
): Promise<void> {
	const playTime = getCurrentPlayTime();
	const slotName = name ?? slotId;

	// Check if a save already exists to preserve createdAt
	let existingCreatedAt: number | undefined;
	try {
		const existing = useIDB ? await idbGet(slotId) : lsGet(slotId);
		if (existing) {
			existingCreatedAt = existing.createdAt;
		}
	} catch {
		// Ignore — will create fresh
	}

	const payload = serializeWorld(slotId, slotName, playTime, existingCreatedAt);

	// Native: use expo-sqlite via db.ts
	if (isNativeDbAvailable()) {
		nativePutSave(slotId, payload);
		return;
	}

	try {
		if (useIDB) {
			await idbPut(payload);
		} else {
			lsPut(payload);
		}
	} catch (err) {
		// If IndexedDB fails at runtime, fall back to localStorage
		if (useIDB) {
			console.warn(
				"[SaveManager] IndexedDB write failed, falling back to localStorage:",
				err,
			);
			useIDB = false;
			lsPut(payload);
		} else {
			throw err;
		}
	}
}

/**
 * Load a saved game from the specified slot and restore the world state.
 */
export async function loadGame(slotId: SaveSlotId): Promise<void> {
	let data: SavePayload | undefined;

	// Native: use expo-sqlite via db.ts
	if (isNativeDbAvailable()) {
		data = nativeGetSave(slotId) as SavePayload | undefined;
	} else {
		try {
			data = useIDB ? await idbGet(slotId) : lsGet(slotId);
		} catch (err) {
			if (useIDB) {
				console.warn(
					"[SaveManager] IndexedDB read failed, trying localStorage:",
					err,
				);
				useIDB = false;
				data = lsGet(slotId);
			} else {
				throw err;
			}
		}
	}

	if (!data) {
		throw new Error(`No save found in slot "${slotId}"`);
	}

	if (data.version > SAVE_VERSION) {
		throw new Error(
			`Save version ${data.version} is newer than supported version ${SAVE_VERSION}`,
		);
	}

	deserializeWorld(data);
	startPlayTimeTracking(data.playTimeSeconds);
}

/**
 * Get summary info for all save slots.
 * Empty slots are omitted from the result.
 */
export async function getSaveSlots(): Promise<SaveSlotInfo[]> {
	let payloads: SavePayload[];

	// Native: use expo-sqlite via db.ts
	if (isNativeDbAvailable()) {
		payloads = nativeGetAllSaves() as SavePayload[];
	} else {
		try {
			payloads = useIDB ? await idbGetAll() : lsGetAll();
		} catch (err) {
			if (useIDB) {
				console.warn(
					"[SaveManager] IndexedDB read failed, trying localStorage:",
					err,
				);
				useIDB = false;
				payloads = lsGetAll();
			} else {
				throw err;
			}
		}
	}

	return payloads.map(payloadToSlotInfo);
}

/**
 * Delete a save from the specified slot.
 */
export async function deleteSave(slotId: SaveSlotId): Promise<void> {
	// Native: use expo-sqlite via db.ts
	if (isNativeDbAvailable()) {
		nativeDeleteSave(slotId);
		return;
	}

	try {
		if (useIDB) {
			await idbDelete(slotId);
		} else {
			lsDelete(slotId);
		}
	} catch (err) {
		if (useIDB) {
			console.warn(
				"[SaveManager] IndexedDB delete failed, trying localStorage:",
				err,
			);
			useIDB = false;
			lsDelete(slotId);
		} else {
			throw err;
		}
	}
}

/**
 * Start autosaving at the configured interval.
 * Autosave writes to the "autosave" slot.
 */
export function startAutosave(
	intervalMs: number = DEFAULT_AUTOSAVE_INTERVAL_MS,
): void {
	stopAutosave();
	autosaveTimer = setInterval(async () => {
		try {
			await saveGame("autosave", "Autosave");
			console.log("[SaveManager] Autosave completed");
		} catch (err) {
			console.error("[SaveManager] Autosave failed:", err);
		}
	}, intervalMs);
}

/**
 * Stop the autosave timer.
 */
export function stopAutosave(): void {
	if (autosaveTimer !== null) {
		clearInterval(autosaveTimer);
		autosaveTimer = null;
	}
}

/**
 * Check if a save slot has data.
 */
export async function hasSlotData(slotId: SaveSlotId): Promise<boolean> {
	try {
		const data = useIDB ? await idbGet(slotId) : lsGet(slotId);
		return data !== undefined;
	} catch {
		return false;
	}
}

/**
 * Get the storage backend name (for debug/display).
 */
export function getStorageBackend(): "indexeddb" | "localstorage" {
	return useIDB ? "indexeddb" : "localstorage";
}

/**
 * Force the storage backend (for testing).
 * @internal
 */
export function _setStorageBackend(
	backend: "indexeddb" | "localstorage",
): void {
	useIDB = backend === "indexeddb";
}
