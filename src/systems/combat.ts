/**
 * Combat system — component-based damage.
 *
 * When hostile units are within melee range, they exchange damage.
 * Damage breaks random components rather than reducing HP.
 * A unit with all components broken is destroyed.
 *
 * Units with functional arms deal more damage.
 * Units without legs can't fight (immobile = vulnerable).
 *
 * All tunables sourced from config/combat.json.
 */

import { config } from "../../config";
import type { UnitEntity } from "../ecs/types";
import { hasArms } from "../ecs/types";
import { world } from "../ecs/world";
import { units } from "../ecs/koota/compat";
import { addResource } from "./resources";

const MELEE_RANGE = config.combat.meleeRange;
const ATTACK_CHANCE = config.combat.attackChancePerTick;

export interface CombatEvent {
	attackerId: string;
	targetId: string;
	componentDamaged: string;
	targetDestroyed: boolean;
}

let lastCombatEvents: CombatEvent[] = [];

export function getLastCombatEvents(): CombatEvent[] {
	return lastCombatEvents;
}

/**
 * Try to damage a random functional component on the target.
 * Returns the component name that was damaged, or null.
 */
function dealDamage(attacker: UnitEntity, target: UnitEntity): string | null {
	const functionalParts = target.unit.components.filter((c) => c.functional);
	if (functionalParts.length === 0) return null;

	const hitChance = hasArms(attacker)
		? config.combat.meleeHitChance
		: config.combat.meleeHitChanceNoArms;
	if (Math.random() > hitChance) return null;

	const victim =
		functionalParts[Math.floor(Math.random() * functionalParts.length)];
	victim.functional = false;
	return victim.name;
}

/**
 * Check if a unit is destroyed (all components broken).
 */
function isDestroyed(entity: UnitEntity): boolean {
	return entity.unit.components.every((c) => !c.functional);
}

/**
 * Destroy a unit — remove from world, drop salvage.
 */
function destroyUnit(entity: UnitEntity) {
	const componentCount = entity.unit.components.length;
	addResource(
		"scrapMetal",
		Math.floor(componentCount * config.combat.salvageScrapMultiplier),
	);
	if (Math.random() < config.combat.salvageEWasteChance)
		addResource("eWaste", 1);

	world.remove(entity);
}

/**
 * Combat tick. Called once per sim tick.
 * Checks for hostile units in melee range and resolves attacks.
 */
export function combatSystem() {
	const events: CombatEvent[] = [];
	const toDestroy: UnitEntity[] = [];

	const allUnits = Array.from(units);

	for (const attacker of allUnits) {
		if (attacker.faction !== "feral") continue;
		if (!attacker.unit.components.some((c) => c.functional)) continue;

		for (const target of allUnits) {
			if (target.faction !== "player") continue;

			const dx = attacker.worldPosition.x - target.worldPosition.x;
			const dz = attacker.worldPosition.z - target.worldPosition.z;
			const dist = Math.sqrt(dx * dx + dz * dz);

			if (dist > MELEE_RANGE) continue;
			if (Math.random() > ATTACK_CHANCE) continue;

			const damaged = dealDamage(attacker, target);
			if (damaged) {
				const destroyed = isDestroyed(target);
				events.push({
					attackerId: attacker.id,
					targetId: target.id,
					componentDamaged: damaged,
					targetDestroyed: destroyed,
				});
				if (destroyed) {
					toDestroy.push(target);
				}
			}

			if (target.unit.components.some((c) => c.functional)) {
				const retDamaged = dealDamage(target, attacker);
				if (retDamaged) {
					const retDestroyed = isDestroyed(attacker);
					events.push({
						attackerId: target.id,
						targetId: attacker.id,
						componentDamaged: retDamaged,
						targetDestroyed: retDestroyed,
					});
					if (retDestroyed) {
						toDestroy.push(attacker);
					}
				}
			}

			if (attacker.navigation) {
				attacker.navigation.moving = false;
			}

			break;
		}
	}

	for (const entity of toDestroy) {
		destroyUnit(entity);
	}

	lastCombatEvents = events;
}
