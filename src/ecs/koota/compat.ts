/**
 * Koota ECS Compatibility Layer
 *
 * Provides the same named query exports as `src/ecs/world.ts` (Miniplex
 * archetypes) but backed by Koota queries. Systems can migrate their import
 * source from `../ecs/world` to `../ecs/koota/compat` without changing
 * entity data access code — they still get live Miniplex entity objects.
 *
 * How it works:
 *   1. Each Koota query runs against the Koota world (kept in sync by the
 *      bridge's syncBeforeFrame at the start of each tick).
 *   2. For each Koota entity result, we look up the Miniplex entity via
 *      getMiniplexId() + miniplexWorld iteration.
 *   3. The returned array contains live Miniplex entities — mutations are
 *      reflected immediately and synced back to Koota at end-of-frame.
 *
 * This is a migration shim. Once all systems write directly to Koota traits,
 * this module will be removed and systems will call kootaWorld.query() directly.
 */

import type { Entity as KootaEntity } from "koota";
import type {
	BuildingEntity,
	Entity,
	LightningRodEntity,
	OtterEntity,
	PlayerEntity,
	UnitEntity,
} from "../types";
import { world as miniplexWorld } from "../world";
import { getMiniplexId } from "./bridge";
import { kootaWorld } from "./world";
import {
	Automation,
	Belt,
	Building,
	Faction,
	Hackable,
	IsPlayerControlled,
	LightningRod,
	MapFragment,
	Miner,
	Navigation,
	Otter,
	Position,
	Processor,
	SignalRelay,
	Unit,
	Wire,
	ConnectsFrom,
	ConnectsTo,
} from "./world";

// ---------------------------------------------------------------------------
// Miniplex entity lookup helpers
// ---------------------------------------------------------------------------

/**
 * Resolve a Koota entity to its live Miniplex counterpart via the bridge.
 * Returns undefined if the entity has no bridge mapping (e.g. pure Koota entity).
 */
function toMiniplex(kEntity: KootaEntity): Entity | undefined {
	const mpId = getMiniplexId(kEntity);
	if (!mpId) return undefined;
	for (const entity of miniplexWorld) {
		if (entity.id === mpId) return entity;
	}
	return undefined;
}

/**
 * Map a Koota query iterable to an array of live Miniplex entities,
 * skipping any Koota entities with no bridge mapping.
 */
function resolveQuery(kEntities: Iterable<KootaEntity>): Entity[] {
	const result: Entity[] = [];
	for (const kEntity of kEntities) {
		const mpEntity = toMiniplex(kEntity);
		if (mpEntity) result.push(mpEntity);
	}
	return result;
}

// ---------------------------------------------------------------------------
// Named getter functions — each invokes a Koota query on demand
// ---------------------------------------------------------------------------

export function getUnits(): UnitEntity[] {
	return resolveQuery(kootaWorld.query(Unit, Position, MapFragment)) as UnitEntity[];
}

export function getMovingUnits(): Entity[] {
	return resolveQuery(kootaWorld.query(Unit, Navigation, Position));
}

export function getBuildings(): BuildingEntity[] {
	return resolveQuery(kootaWorld.query(Building, Position)) as BuildingEntity[];
}

export function getLightningRods(): LightningRodEntity[] {
	return resolveQuery(
		kootaWorld.query(LightningRod, Building, Position),
	) as LightningRodEntity[];
}

export function getOtters(): OtterEntity[] {
	return resolveQuery(kootaWorld.query(Otter, Position)) as OtterEntity[];
}

export function getPlayerBots(): PlayerEntity[] {
	return resolveQuery(
		kootaWorld.query(IsPlayerControlled, Unit, Position),
	) as PlayerEntity[];
}

export function getAutomatedBots(): Entity[] {
	return resolveQuery(kootaWorld.query(Automation, Unit, Position));
}

export function getBelts(): Entity[] {
	return resolveQuery(kootaWorld.query(Belt, Position));
}

export function getWires(): Entity[] {
	return resolveQuery(kootaWorld.query(Wire, ConnectsFrom("*"), ConnectsTo("*")));
}

export function getMiners(): Entity[] {
	return resolveQuery(kootaWorld.query(Miner, Building, Position));
}

export function getProcessors(): Entity[] {
	return resolveQuery(kootaWorld.query(Processor, Building, Position));
}

export function getHackables(): Entity[] {
	return resolveQuery(kootaWorld.query(Hackable, Position));
}

export function getSignalRelays(): Entity[] {
	return resolveQuery(kootaWorld.query(SignalRelay, Position));
}

export function getPlayerUnits(): UnitEntity[] {
	return (
		resolveQuery(kootaWorld.query(Unit, Faction, Position)) as UnitEntity[]
	).filter((e) => e.faction === "player");
}

// ---------------------------------------------------------------------------
// Iterable proxies — `for (const entity of units)` syntax
// ---------------------------------------------------------------------------

/**
 * Lazy iterable that invokes a getter on each iteration pass.
 * Implements Symbol.iterator so systems can use `for...of` syntax —
 * identical usage to the Miniplex archetype query objects.
 */
function makeQueryIterable<T extends Entity>(getFn: () => T[]): Iterable<T> {
	return {
		[Symbol.iterator](): Iterator<T> {
			const items = getFn();
			let i = 0;
			return {
				next(): IteratorResult<T> {
					if (i < items.length) {
						return { value: items[i++], done: false };
					}
					return { value: undefined as unknown as T, done: true };
				},
			};
		},
	};
}

// Named iterable proxies — drop-in replacements for src/ecs/world.ts exports
export const units = makeQueryIterable(getUnits);
export const movingUnits = makeQueryIterable(getMovingUnits);
export const buildings = makeQueryIterable(getBuildings);
export const lightningRods = makeQueryIterable(getLightningRods);
export const otters = makeQueryIterable(getOtters);
export const playerBots = makeQueryIterable(getPlayerBots);
export const automatedBots = makeQueryIterable(getAutomatedBots);
export const belts = makeQueryIterable(getBelts);
export const wires = makeQueryIterable(getWires);
export const miners = makeQueryIterable(getMiners);
export const processors = makeQueryIterable(getProcessors);
export const hackables = makeQueryIterable(getHackables);
export const signalRelays = makeQueryIterable(getSignalRelays);
