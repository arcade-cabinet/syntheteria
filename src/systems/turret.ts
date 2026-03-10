/**
 * Turret defense system — automated base defense buildings.
 *
 * Turret buildings scan for the nearest enemy within range and fire
 * at a configured rate, dealing component damage identical to the
 * combat system. Turrets require power to operate and have a per-entity
 * cooldown tracked in module-level state.
 *
 * All tunables sourced from config/buildings.json → turret + config/combat.json.
 */

import { config } from "../../config";
import type { BuildingEntity, UnitEntity } from "../ecs/types";
import { buildings, units, world } from "../ecs/world";
import { addResource } from "./resources";

const turretCfg = config.buildings.turret;
const combatCfg = config.combat;

// ---------------------------------------------------------------------------
// Module-level cooldown state
// ---------------------------------------------------------------------------

/** Remaining cooldown ticks per turret entity ID. */
const cooldowns = new Map<string, number>();

/** Reset all turret state — for tests and save/load. */
export function resetTurrets(): void {
	cooldowns.clear();
	lastTurretEvents = [];
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TurretFireEvent {
	turretId: string;
	targetId: string;
	componentDamaged: string | null;
	targetDestroyed: boolean;
}

let lastTurretEvents: TurretFireEvent[] = [];

export function getLastTurretEvents(): TurretFireEvent[] {
	return lastTurretEvents;
}

// ---------------------------------------------------------------------------
// Targeting
// ---------------------------------------------------------------------------

/**
 * Find the nearest enemy unit within range of a turret.
 * Only considers units from hostile factions (feral, cultist, rogue).
 */
function findNearestEnemy(turret: BuildingEntity): UnitEntity | null {
	let closest: UnitEntity | null = null;
	let closestDist = turretCfg.range;

	for (const unit of units) {
		if (unit.faction === "player" || unit.faction === "wildlife") continue;
		if (!unit.unit.components.some((c) => c.functional)) continue;

		const dx = unit.worldPosition.x - turret.worldPosition.x;
		const dz = unit.worldPosition.z - turret.worldPosition.z;
		const dist = Math.sqrt(dx * dx + dz * dz);

		if (dist < closestDist) {
			closest = unit;
			closestDist = dist;
		}
	}

	return closest;
}

// ---------------------------------------------------------------------------
// Damage (reuses combat model)
// ---------------------------------------------------------------------------

/**
 * Deal component damage to a target — same model as combat.ts.
 * Picks a random functional component and breaks it with a hit-chance roll.
 */
function dealComponentDamage(target: UnitEntity): string | null {
	const functional = target.unit.components.filter((c) => c.functional);
	if (functional.length === 0) return null;

	if (Math.random() > turretCfg.hitChance) return null;

	const victim = functional[Math.floor(Math.random() * functional.length)];
	victim.functional = false;
	return victim.name;
}

function isDestroyed(entity: UnitEntity): boolean {
	return entity.unit.components.every((c) => !c.functional);
}

function destroyUnit(entity: UnitEntity): void {
	const componentCount = entity.unit.components.length;
	addResource(
		"scrapMetal",
		Math.floor(componentCount * combatCfg.salvageScrapMultiplier),
	);
	if (Math.random() < combatCfg.salvageEWasteChance) {
		addResource("eWaste", 1);
	}
	world.remove(entity);
}

// ---------------------------------------------------------------------------
// System tick
// ---------------------------------------------------------------------------

/**
 * Turret system — runs each simulation tick.
 *
 * 1. Iterates all buildings with type "turret".
 * 2. Skips unpowered or non-operational turrets.
 * 3. Decrements cooldown; if ready, finds nearest enemy and fires.
 * 4. On hit, deals component damage; on destruction, drops salvage.
 */
export function turretSystem(): void {
	const events: TurretFireEvent[] = [];
	const toDestroy: UnitEntity[] = [];

	for (const building of buildings) {
		if (building.building.type !== "turret") continue;
		if (!building.building.powered || !building.building.operational) continue;

		// Decrement cooldown
		const remaining = cooldowns.get(building.id) ?? 0;
		if (remaining > 0) {
			cooldowns.set(building.id, remaining - 1);
			continue;
		}

		// Find target
		const target = findNearestEnemy(building);
		if (!target) continue;

		// Fire — reset cooldown
		cooldowns.set(building.id, turretCfg.fireRateTicks);

		const damaged = dealComponentDamage(target);
		const destroyed = damaged !== null && isDestroyed(target);

		events.push({
			turretId: building.id,
			targetId: target.id,
			componentDamaged: damaged,
			targetDestroyed: destroyed,
		});

		if (destroyed) {
			toDestroy.push(target);
		}
	}

	for (const entity of toDestroy) {
		destroyUnit(entity);
	}

	lastTurretEvents = events;
}
