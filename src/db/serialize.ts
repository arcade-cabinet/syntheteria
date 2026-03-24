/**
 * serialize.ts — ECS <-> DB record conversion for the RTS Koota world.
 *
 * Save: query Koota entities -> flat DB records
 * Load: DB records -> spawn/update Koota entities
 */

import type { World } from "koota";
import {
	BuildingTrait,
	EntityId,
	Faction,
	Fragment,
	LightningRod,
	Navigation,
	Position,
	Unit,
	UnitComponents,
} from "../ecs/traits";
import {
	addResource,
	getResources,
	getScavengePoints,
	spendResource,
} from "../systems/resources";
import type {
	BuildingRecord,
	LightningRodRecord,
	ResourcePoolRecord,
	ScavengePointRecord,
	UnitRecord,
} from "./types";

// ---------------------------------------------------------------------------
// Save: ECS world -> DB records
// ---------------------------------------------------------------------------

let saveIdCounter = 0;

export function serializeUnits(world: World, gameId: string): UnitRecord[] {
	const records: UnitRecord[] = [];
	for (const entity of world.query(
		EntityId,
		Position,
		Faction,
		Unit,
		UnitComponents,
		Navigation,
		Fragment,
	)) {
		const eid = entity.get(EntityId)!;
		const pos = entity.get(Position)!;
		const faction = entity.get(Faction)!;
		const unit = entity.get(Unit)!;
		const comp = entity.get(UnitComponents)!;
		const nav = entity.get(Navigation)!;
		const frag = entity.get(Fragment)!;

		records.push({
			id: `u_${saveIdCounter++}`,
			gameId,
			entityId: eid.value,
			unitType: unit.unitType,
			displayName: unit.displayName,
			faction: faction.value,
			x: pos.x,
			y: pos.y,
			z: pos.z,
			speed: unit.speed,
			fragmentId: frag.fragmentId,
			componentsJson: comp.componentsJson,
			pathJson: nav.pathJson,
			pathIndex: nav.pathIndex,
			moving: nav.moving,
		});
	}
	return records;
}

export function serializeBuildings(
	world: World,
	gameId: string,
): { buildings: BuildingRecord[]; rods: LightningRodRecord[] } {
	const buildings: BuildingRecord[] = [];
	const rods: LightningRodRecord[] = [];

	for (const entity of world.query(
		EntityId,
		Position,
		Faction,
		BuildingTrait,
		Fragment,
	)) {
		const eid = entity.get(EntityId)!;
		const pos = entity.get(Position)!;
		const faction = entity.get(Faction)!;
		const bldg = entity.get(BuildingTrait)!;
		const frag = entity.get(Fragment)!;

		const bId = `b_${saveIdCounter++}`;
		buildings.push({
			id: bId,
			gameId,
			entityId: eid.value,
			buildingType: bldg.buildingType,
			faction: faction.value,
			x: pos.x,
			y: pos.y,
			z: pos.z,
			powered: bldg.powered,
			operational: bldg.operational,
			fragmentId: frag.fragmentId,
			buildingComponentsJson: bldg.buildingComponentsJson,
		});

		// Lightning rod data (only present on rod buildings)
		if (entity.has(LightningRod)) {
			const rod = entity.get(LightningRod)!;
			rods.push({
				buildingId: bId,
				gameId,
				rodCapacity: rod.rodCapacity,
				currentOutput: rod.currentOutput,
				protectionRadius: rod.protectionRadius,
			});
		}
	}

	return { buildings, rods };
}

export function serializeResources(gameId: string): ResourcePoolRecord {
	const pool = getResources();
	return {
		gameId,
		scrapMetal: pool.scrapMetal,
		circuitry: pool.circuitry,
		powerCells: pool.powerCells,
		durasteel: pool.durasteel,
	};
}

export function serializeScavengePoints(gameId: string): ScavengePointRecord[] {
	return getScavengePoints().map((p) => ({
		gameId,
		x: p.x,
		z: p.z,
		remaining: p.remaining,
		resourceType: p.type,
		amountPerScavenge: p.amountPerScavenge,
	}));
}

// ---------------------------------------------------------------------------
// Load: DB records -> ECS world
// ---------------------------------------------------------------------------

/**
 * Clear all unit entities and respawn from saved records.
 * Entity IDs are NOT stable across sessions.
 */
export function applyUnits(world: World, records: UnitRecord[]): void {
	// Delete all existing units
	const existing = [...world.query(Unit, EntityId)];
	for (const entity of existing) {
		entity.destroy();
	}

	// Respawn from saved records
	for (const record of records) {
		world.spawn(
			EntityId({ value: record.entityId }),
			Position({ x: record.x, y: record.y, z: record.z }),
			Faction({
				value: record.faction as "player" | "cultist" | "rogue" | "feral",
			}),
			Fragment({ fragmentId: record.fragmentId }),
			Unit({
				unitType: record.unitType,
				displayName: record.displayName,
				speed: record.speed,
				selected: false,
			}),
			UnitComponents({ componentsJson: record.componentsJson }),
			Navigation({
				pathJson: record.pathJson,
				pathIndex: record.pathIndex,
				moving: record.moving,
			}),
		);
	}
}

/**
 * Clear all building entities and respawn from saved records + lightning rod data.
 */
export function applyBuildings(
	world: World,
	buildings: BuildingRecord[],
	rods: LightningRodRecord[],
): void {
	// Delete all existing buildings
	const existing = [...world.query(BuildingTrait, EntityId)];
	for (const entity of existing) {
		entity.destroy();
	}

	// Index rods by building ID
	const rodByBuildingId = new Map(rods.map((r) => [r.buildingId, r]));

	for (const b of buildings) {
		// biome-ignore lint: explicit any[] needed — Koota traits are heterogeneous
		const traits: any[] = [
			EntityId({ value: b.entityId }),
			Position({ x: b.x, y: b.y, z: b.z }),
			Faction({ value: b.faction as "player" | "cultist" | "rogue" | "feral" }),
			Fragment({ fragmentId: b.fragmentId }),
			BuildingTrait({
				buildingType: b.buildingType,
				powered: b.powered,
				operational: b.operational,
				selected: false,
				buildingComponentsJson: b.buildingComponentsJson,
			}),
		];

		const rod = rodByBuildingId.get(b.id);
		if (rod) {
			traits.push(
				LightningRod({
					rodCapacity: rod.rodCapacity,
					currentOutput: rod.currentOutput,
					protectionRadius: rod.protectionRadius,
				}),
			);
		}

		// Buildings that are also units (fabrication units) get Unit traits too
		if (b.buildingType === "fabrication_unit") {
			traits.push(
				Unit({
					unitType: "fabrication_unit",
					displayName: "Fabrication Unit",
					speed: 0,
					selected: false,
				}),
				UnitComponents({ componentsJson: b.buildingComponentsJson }),
				Navigation({ pathJson: "[]", pathIndex: 0, moving: false }),
			);
		}

		world.spawn(...traits);
	}
}

/**
 * Restore the global resource pool from a saved record.
 * Directly mutates the module-level resource state via exported helpers.
 */
export function applyResources(pool: ResourcePoolRecord): void {
	// Zero out current resources then add saved amounts
	const current = getResources();
	if (current.scrapMetal > 0) spendResource("scrapMetal", current.scrapMetal);
	if (current.circuitry > 0) spendResource("circuitry", current.circuitry);
	if (current.powerCells > 0) spendResource("powerCells", current.powerCells);
	if (current.durasteel > 0) spendResource("durasteel", current.durasteel);

	if (pool.scrapMetal > 0) addResource("scrapMetal", pool.scrapMetal);
	if (pool.circuitry > 0) addResource("circuitry", pool.circuitry);
	if (pool.powerCells > 0) addResource("powerCells", pool.powerCells);
	if (pool.durasteel > 0) addResource("durasteel", pool.durasteel);
}
