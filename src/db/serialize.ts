/**
 * serialize.ts — ECS ↔ DB record conversion.
 *
 * Extracts game state from the Koota world into flat DB records (for save),
 * and applies DB records back onto the world (for load).
 */

import type { World } from "koota";
import {
	SUPPORT_DEFAULTS,
	CAVALRY_DEFAULTS,
	CULT_CAVALRY_DEFAULTS,
	CULT_INFANTRY_DEFAULTS,
	CULT_RANGED_DEFAULTS,
	RANGED_DEFAULTS,
	WORKER_DEFAULTS,
	SCOUT_DEFAULTS,
	INFANTRY_DEFAULTS,
} from "../robots";
import {
	Board,
	Building,
	Faction,
	ResourcePool,
	Tile,
	UnitFaction,
	UnitPos,
	UnitSpecialization,
	UnitStats,
	UnitVisual,
} from "../traits";
import type {
	BuildingRecord,
	ExploredRecord,
	ResourceRecord,
	UnitRecord,
} from "./types";

/** Lookup table: modelId → default static stats for that robot class. */
const MODEL_STATS: Record<
	string,
	{
		attack: number;
		defense: number;
		attackRange: number;
		scanRange: number;
		weightClass: string;
	}
> = {
	scout: SCOUT_DEFAULTS.stats,
	infantry: INFANTRY_DEFAULTS.stats,
	cavalry: CAVALRY_DEFAULTS.stats,
	ranged: RANGED_DEFAULTS.stats,
	support: SUPPORT_DEFAULTS.stats,
	worker: WORKER_DEFAULTS.stats,
	cult_infantry: { ...CULT_INFANTRY_DEFAULTS.stats, weightClass: "medium" },
	cult_ranged: { ...CULT_RANGED_DEFAULTS.stats, weightClass: "medium" },
	cult_cavalry: { ...CULT_CAVALRY_DEFAULTS.stats, weightClass: "medium" },
};

// ---------------------------------------------------------------------------
// Save: ECS world → DB records
// ---------------------------------------------------------------------------

/** Extract all units from the world as UnitRecords. */
export function serializeUnits(world: World, gameId: string): UnitRecord[] {
	const records: UnitRecord[] = [];
	for (const entity of world.query(UnitPos, UnitFaction, UnitStats)) {
		const pos = entity.get(UnitPos);
		const faction = entity.get(UnitFaction);
		const stats = entity.get(UnitStats);
		const visual = entity.has(UnitVisual) ? entity.get(UnitVisual) : null;
		const spec = entity.has(UnitSpecialization)
			? entity.get(UnitSpecialization)
			: null;
		if (!pos || !faction || !stats) continue;
		records.push({
			id: String(entity.id()),
			gameId,
			factionId: faction.factionId,
			tileX: pos.tileX,
			tileZ: pos.tileZ,
			hp: stats.hp,
			maxHp: stats.maxHp,
			ap: stats.ap,
			maxAp: stats.maxAp,
			mp: stats.mp,
			maxMp: stats.maxMp,
			modelId: visual?.modelId ?? "",
			trackId: spec?.trackId || undefined,
			trackVersion: spec?.trackVersion || undefined,
		});
	}
	return records;
}

/** Extract all buildings from the world as BuildingRecords. */
export function serializeBuildings(
	world: World,
	gameId: string,
): BuildingRecord[] {
	const records: BuildingRecord[] = [];
	for (const entity of world.query(Building)) {
		const b = entity.get(Building);
		if (!b) continue;
		records.push({
			id: String(entity.id()),
			gameId,
			factionId: b.factionId,
			tileX: b.tileX,
			tileZ: b.tileZ,
			type: b.buildingType,
			hp: b.hp,
			maxHp: b.maxHp,
		});
	}
	return records;
}

/** Extract explored/visibility state from Tile entities. */
export function serializeExplored(
	world: World,
	gameId: string,
): ExploredRecord[] {
	const records: ExploredRecord[] = [];
	for (const entity of world.query(Tile)) {
		const tile = entity.get(Tile);
		if (!tile) continue;
		// Only save tiles that have been explored or have partial visibility
		if (tile.explored || tile.visibility > 0) {
			records.push({
				gameId,
				tileX: tile.x,
				tileZ: tile.z,
				explored: tile.explored,
				visibility: tile.visibility,
			});
		}
	}
	return records;
}

/** Extract faction resource pools as ResourceRecords. */
export function serializeResources(
	world: World,
	gameId: string,
): ResourceRecord[] {
	const records: ResourceRecord[] = [];
	for (const entity of world.query(ResourcePool, Faction)) {
		const faction = entity.get(Faction);
		const pool = entity.get(ResourcePool);
		if (!faction || !pool) continue;
		for (const [material, amount] of Object.entries(pool)) {
			if (typeof amount === "number" && amount > 0) {
				records.push({
					gameId,
					factionId: faction.id,
					material,
					amount,
				});
			}
		}
	}
	return records;
}

// ---------------------------------------------------------------------------
// Load: DB records → ECS world (apply onto existing world)
// ---------------------------------------------------------------------------

/**
 * Replace all units in the world with saved records.
 *
 * Entity IDs are NOT stable across sessions — a fresh `initWorldFromBoard`
 * assigns new IDs. So we delete all init-spawned units and respawn from
 * saved records, using MODEL_STATS to fill in static archetype fields
 * (attack, defense, attackRange, weightClass) that aren't persisted.
 */
export function applyUnits(world: World, records: UnitRecord[]): void {
	// Delete all existing units
	const existing = [...world.query(UnitPos, UnitFaction, UnitStats)];
	for (const entity of existing) {
		entity.destroy();
	}

	// Respawn from saved records
	for (const record of records) {
		const defaults = MODEL_STATS[record.modelId];
		const unit = world.spawn(
			UnitPos({ tileX: record.tileX, tileZ: record.tileZ }),
			UnitFaction({ factionId: record.factionId }),
			UnitStats({
				hp: record.hp,
				maxHp: record.maxHp,
				ap: record.ap,
				maxAp: record.maxAp,
				mp: record.mp,
				maxMp: record.maxMp,
				scanRange: defaults?.scanRange ?? 4,
				attack: defaults?.attack ?? 2,
				defense: defaults?.defense ?? 0,
				attackRange: defaults?.attackRange ?? 1,
				weightClass: (defaults?.weightClass ?? "medium") as
					| "light"
					| "medium"
					| "heavy",
			}),
			UnitVisual({ modelId: record.modelId, scale: 1.0, facingAngle: 0 }),
		);

		// Restore specialization if present
		if (record.trackId) {
			unit.add(
				UnitSpecialization({
					trackId: record.trackId,
					trackVersion: record.trackVersion ?? 1,
				}),
			);
		}
	}
}

/**
 * Apply saved building HP onto existing world entities.
 * Buildings are spawned by initWorldFromBoard; this updates their state.
 */
export function applyBuildings(world: World, records: BuildingRecord[]): void {
	// Index by tile position since building entity IDs may differ between sessions
	const recordByPos = new Map(records.map((r) => [`${r.tileX},${r.tileZ}`, r]));

	for (const entity of world.query(Building)) {
		const b = entity.get(Building);
		if (!b) continue;
		const record = recordByPos.get(`${b.tileX},${b.tileZ}`);
		if (record) {
			entity.set(Building, {
				...b,
				hp: record.hp,
				maxHp: record.maxHp,
			});
		}
	}
}

/**
 * Apply saved exploration state onto Tile entities.
 */
export function applyExplored(world: World, records: ExploredRecord[]): void {
	const byPos = new Map(records.map((r) => [`${r.tileX},${r.tileZ}`, r]));

	for (const entity of world.query(Tile)) {
		const tile = entity.get(Tile);
		if (!tile) continue;
		const record = byPos.get(`${tile.x},${tile.z}`);
		if (record) {
			entity.set(Tile, {
				...tile,
				explored: record.explored,
				visibility: Math.max(tile.visibility, record.visibility),
			});
		}
	}
}

/**
 * Set the Board trait's turn counter to match the saved game turn.
 */
export function applyTurn(world: World, turn: number): void {
	for (const entity of world.query(Board)) {
		const b = entity.get(Board);
		if (!b) continue;
		entity.set(Board, { ...b, turn });
	}
}

/**
 * Apply saved resource pools onto faction entities.
 */
export function applyResources(world: World, records: ResourceRecord[]): void {
	// Group by faction
	const byFaction = new Map<string, Map<string, number>>();
	for (const r of records) {
		let materials = byFaction.get(r.factionId);
		if (!materials) {
			materials = new Map();
			byFaction.set(r.factionId, materials);
		}
		materials.set(r.material, r.amount);
	}

	for (const entity of world.query(ResourcePool, Faction)) {
		const faction = entity.get(Faction);
		if (!faction) continue;
		const materials = byFaction.get(faction.id);
		if (!materials) continue;
		const pool = entity.get(ResourcePool);
		if (!pool) continue;
		const updated = { ...pool };
		for (const [mat, amt] of materials) {
			if (mat in updated) {
				(updated as Record<string, number>)[mat] = amt;
			}
		}
		entity.set(ResourcePool, updated);
	}
}
