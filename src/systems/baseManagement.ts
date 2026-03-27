/**
 * Base management system — founding, production, power, storage.
 *
 * Bases are settlements that produce units and store resources.
 * Player founds bases via FOUND BASE action. Cult bases are pre-placed
 * in enemy territory during world generation.
 *
 * Data is stored as JSON strings in the Base trait for ECS compatibility.
 */

import type { Entity, World } from "koota";
import { tileToWorldX, tileToWorldZ } from "../board/coords";
import { zoneForTile } from "../board/zones";
import { Base, EntityId, Faction, Position } from "../ecs/traits";
import { gameAssert } from "../errors";
import { recordBaseFounded } from "./gamePhases";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ProductionItem {
	unitType: string;
	progress: number; // 0-1
	cost: Record<string, number>;
}

export interface InfrastructureItem {
	type: string;
	count: number;
}

export type BaseStorage = Record<string, number>;

// ─── Constants ──────────────────────────────────────────────────────────────

/** Minimum distance (in tiles) between any two bases. */
const MIN_BASE_SPACING = 8;

/** Power generated per lightning rod infrastructure. */
const POWER_PER_ROD = 5;

/** Production speed: progress units added per second per base. */
const PRODUCTION_RATE = 0.1;

// ─── Entity ID counter ──────────────────────────────────────────────────────

let nextBaseId = 0;

/** Reset ID counter (for testing). */
export function resetBaseIdCounter(): void {
	nextBaseId = 0;
}

// ─── JSON helpers ────────────────────────────────────────────────────────────

export function parseProductionQueue(json: string): ProductionItem[] {
	try {
		return JSON.parse(json) as ProductionItem[];
	} catch (e) {
		// Non-fatal: corrupt JSON falls back to empty queue, but log it
		console.warn(
			"[baseManagement] corrupt production queue JSON:",
			json.slice(0, 80),
			e,
		);
		return [];
	}
}

export function serializeProductionQueue(items: ProductionItem[]): string {
	return JSON.stringify(items);
}

export function parseInfrastructure(json: string): InfrastructureItem[] {
	try {
		return JSON.parse(json) as InfrastructureItem[];
	} catch (e) {
		// Non-fatal: corrupt JSON falls back to empty list, but log it
		console.warn(
			"[baseManagement] corrupt infrastructure JSON:",
			json.slice(0, 80),
			e,
		);
		return [];
	}
}

export function serializeInfrastructure(items: InfrastructureItem[]): string {
	return JSON.stringify(items);
}

export function parseStorage(json: string): BaseStorage {
	try {
		return JSON.parse(json) as BaseStorage;
	} catch (e) {
		// Non-fatal: corrupt JSON falls back to empty storage, but log it
		console.warn(
			"[baseManagement] corrupt storage JSON:",
			json.slice(0, 80),
			e,
		);
		return {};
	}
}

export function serializeStorage(storage: BaseStorage): string {
	return JSON.stringify(storage);
}

// ─── Validation ──────────────────────────────────────────────────────────────

/**
 * Check whether a tile is valid for founding a base.
 * Returns null if valid, or an error message string if invalid.
 */
export function validateBaseLocation(
	world: World,
	tileX: number,
	tileZ: number,
	factionId: string,
): string | null {
	// Check zone — player cannot found bases in enemy territory
	// Use infinite-world mode (no width/height) for zone check
	const zone = zoneForTile(tileX, tileZ);
	if (factionId === "player" && zone === "enemy") {
		return "Cannot found a base in enemy territory";
	}

	// Check spacing from existing bases
	for (const entity of world.query(Base, Position)) {
		const base = entity.get(Base)!;
		const dx = base.tileX - tileX;
		const dz = base.tileZ - tileZ;
		const dist = Math.sqrt(dx * dx + dz * dz);
		if (dist < MIN_BASE_SPACING) {
			return `Too close to existing base "${base.name}" (${Math.floor(dist)} tiles, need ${MIN_BASE_SPACING})`;
		}
	}

	return null;
}

// ─── Founding ────────────────────────────────────────────────────────────────

/**
 * Found a new base at (tileX, tileZ).
 * Validates location and spawns a Base entity with Position, Faction, EntityId.
 * When a player founds a base, records it for phase progression (Awakening -> Expansion).
 *
 * @returns The spawned base entity.
 * @throws GameError if the location is invalid.
 */
export function foundBase(
	world: World,
	tileX: number,
	tileZ: number,
	factionId: string,
	name: string,
): Entity {
	const error = validateBaseLocation(world, tileX, tileZ, factionId);
	gameAssert(!error, error ?? "Invalid base location", "baseManagement", {
		tileX,
		tileZ,
		factionId,
	});

	const id = `base_${nextBaseId++}`;
	const wx = tileToWorldX(tileX);
	const wz = tileToWorldZ(tileZ);

	// Record base founding for phase progression (Tier 5)
	if (factionId === "player") {
		recordBaseFounded();
	}

	return world.spawn(
		EntityId({ value: id }),
		Position({ x: wx, y: 0, z: wz }),
		Faction({ value: factionId as "player" | "cultist" | "rogue" | "feral" }),
		Base({
			name,
			tileX,
			tileZ,
			factionId,
			infrastructureJson: "[]",
			productionQueueJson: "[]",
			power: 0,
			storageJson: "{}",
		}),
	);
}

// ─── Production ──────────────────────────────────────────────────────────────

/**
 * Advance production queues for all bases.
 * When an item reaches progress >= 1, it is removed from the queue.
 * (Unit spawning is handled by the caller or a higher-level system.)
 *
 * @returns Array of completed production items with their base entity IDs.
 */
export function baseProductionTick(
	world: World,
	deltaSec: number,
): { baseEntityId: string; item: ProductionItem }[] {
	const completed: { baseEntityId: string; item: ProductionItem }[] = [];

	for (const entity of world.query(Base, EntityId)) {
		const base = entity.get(Base)!;
		const eid = entity.get(EntityId)!.value;
		const queue = parseProductionQueue(base.productionQueueJson);

		if (queue.length === 0) continue;

		// Only advance the first item in the queue
		const item = queue[0]!;
		item.progress += PRODUCTION_RATE * deltaSec;

		if (item.progress >= 1.0) {
			completed.push({ baseEntityId: eid, item: { ...item, progress: 1 } });
			queue.shift();
		}

		entity.set(Base, {
			productionQueueJson: serializeProductionQueue(queue),
		});
	}

	return completed;
}

// ─── Power ───────────────────────────────────────────────────────────────────

/**
 * Recalculate power for all bases from their infrastructure.
 */
export function basePowerTick(world: World): void {
	for (const entity of world.query(Base)) {
		const base = entity.get(Base)!;
		const infra = parseInfrastructure(base.infrastructureJson);

		let power = 0;
		for (const item of infra) {
			if (item.type === "lightning_rod") {
				power += item.count * POWER_PER_ROD;
			}
			// Future infrastructure types add power here
		}

		if (power !== base.power) {
			entity.set(Base, { power });
		}
	}
}

// ─── Storage ─────────────────────────────────────────────────────────────────

/**
 * Get the parsed storage map from a base entity.
 */
export function getBaseStorage(entity: Entity): BaseStorage {
	const base = entity.get(Base);
	if (!base) return {};
	return parseStorage(base.storageJson);
}

/**
 * Add a quantity of a material to a base's storage.
 */
export function addToBaseStorage(
	entity: Entity,
	materialType: string,
	amount: number,
): void {
	gameAssert(
		entity.has(Base),
		"Entity is not a base",
		"baseManagement/addToBaseStorage",
	);
	const storage = getBaseStorage(entity);
	storage[materialType] = (storage[materialType] ?? 0) + amount;
	entity.set(Base, { storageJson: serializeStorage(storage) });
}

/**
 * Remove a quantity of a material from a base's storage.
 * Returns true if the amount was available and removed, false otherwise.
 */
export function removeFromBaseStorage(
	entity: Entity,
	materialType: string,
	amount: number,
): boolean {
	gameAssert(
		entity.has(Base),
		"Entity is not a base",
		"baseManagement/removeFromBaseStorage",
	);
	const storage = getBaseStorage(entity);
	const current = storage[materialType] ?? 0;
	if (current < amount) return false;

	storage[materialType] = current - amount;
	if (storage[materialType] === 0) {
		delete storage[materialType];
	}
	entity.set(Base, { storageJson: serializeStorage(storage) });
	return true;
}

// ─── Production Queue Management ─────────────────────────────────────────────

/**
 * Enqueue a production item at a base.
 */
export function enqueueProduction(
	entity: Entity,
	unitType: string,
	cost: Record<string, number>,
): void {
	gameAssert(
		entity.has(Base),
		"Entity is not a base",
		"baseManagement/enqueueProduction",
	);
	const base = entity.get(Base)!;
	const queue = parseProductionQueue(base.productionQueueJson);
	queue.push({ unitType, progress: 0, cost });
	entity.set(Base, { productionQueueJson: serializeProductionQueue(queue) });
}

/**
 * Get the current production queue for a base.
 */
export function getProductionQueue(entity: Entity): ProductionItem[] {
	const base = entity.get(Base);
	if (!base) return [];
	return parseProductionQueue(base.productionQueueJson);
}

/**
 * Get infrastructure list for a base.
 */
export function getInfrastructure(entity: Entity): InfrastructureItem[] {
	const base = entity.get(Base);
	if (!base) return [];
	return parseInfrastructure(base.infrastructureJson);
}
