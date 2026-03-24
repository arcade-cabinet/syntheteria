/**
 * Combat system -- component-based damage.
 *
 * When hostile units are within melee range, they exchange damage.
 * Damage breaks random components rather than reducing HP.
 * A unit with all components broken is destroyed.
 *
 * Units with functional arms deal more damage.
 * Units without legs can't fight (immobile = vulnerable).
 */

import type { Entity } from "koota";
import { playSfx } from "../audio";
import {
	EntityId,
	Faction,
	Navigation,
	Position,
	Unit,
	UnitComponents,
} from "../ecs/traits";
import {
	hasArms,
	parseComponents,
	serializeComponents,
	type UnitComponent,
} from "../ecs/types";
import { world } from "../ecs/world";
import { addResource } from "./resources";

const MELEE_RANGE = 2.5;
const ATTACK_CHANCE = 0.4; // chance per tick when in range

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
function dealDamage(
	attackerComponents: UnitComponent[],
	target: Entity,
): string | null {
	const targetComps = parseComponents(
		target.get(UnitComponents)?.componentsJson,
	);
	const functionalParts = targetComps.filter((c) => c.functional);
	if (functionalParts.length === 0) return null;

	// Units with arms are more effective fighters
	const hitChance = hasArms(attackerComponents) ? 0.6 : 0.3;
	if (Math.random() > hitChance) return null;

	// Pick a random functional component to break
	const victim =
		functionalParts[Math.floor(Math.random() * functionalParts.length)];
	victim.functional = false;

	// Write back the updated components
	target.set(UnitComponents, {
		componentsJson: serializeComponents(targetComps),
	});
	return victim.name;
}

/**
 * Check if a unit is destroyed (all components broken).
 */
function isDestroyed(entity: Entity): boolean {
	const comps = parseComponents(entity.get(UnitComponents)?.componentsJson);
	return comps.every((c) => !c.functional);
}

/**
 * Destroy a unit -- remove from world, drop salvage.
 */
function destroyUnit(entity: Entity) {
	// Drop some resources as salvage
	const comps = parseComponents(entity.get(UnitComponents)?.componentsJson);
	addResource("scrapMetal", Math.floor(comps.length * 1.5));
	if (Math.random() > 0.5) addResource("circuitry", 1);

	// Remove from ECS
	entity.destroy();
}

/**
 * Combat tick. Called once per sim tick.
 * Checks for hostile units in melee range and resolves attacks.
 */
export function combatSystem() {
	const events: CombatEvent[] = [];
	const toDestroy: Entity[] = [];

	const allUnits = Array.from(
		world.query(Position, Unit, UnitComponents, Faction, EntityId),
	);

	for (const attacker of allUnits) {
		// Hostile factions (feral + cultist) initiate attacks against player
		const attackerFaction = attacker.get(Faction)?.value;
		if (attackerFaction !== "feral" && attackerFaction !== "cultist") continue;
		const attackerComps = parseComponents(
			attacker.get(UnitComponents)?.componentsJson,
		);
		if (!attackerComps.some((c) => c.functional)) continue;

		for (const target of allUnits) {
			if (target.get(Faction)?.value !== "player") continue;

			const aPos = attacker.get(Position)!;
			const tPos = target.get(Position)!;
			const dx = aPos.x - tPos.x;
			const dz = aPos.z - tPos.z;
			const dist = Math.sqrt(dx * dx + dz * dz);

			if (dist > MELEE_RANGE) continue;
			if (Math.random() > ATTACK_CHANCE) continue;

			const attackerId = attacker.get(EntityId)?.value;
			const targetId = target.get(EntityId)?.value;

			// Feral attacks player
			const damaged = dealDamage(attackerComps, target);
			if (damaged) {
				playSfx("attack_hit");
				const destroyed = isDestroyed(target);
				events.push({
					attackerId,
					targetId,
					componentDamaged: damaged,
					targetDestroyed: destroyed,
				});
				if (destroyed) {
					playSfx("unit_death");
					toDestroy.push(target);
				}
			}

			// Player unit retaliates if it has functional components
			const targetComps = parseComponents(
				target.get(UnitComponents)?.componentsJson,
			);
			if (targetComps.some((c) => c.functional)) {
				const retDamaged = dealDamage(targetComps, attacker);
				if (retDamaged) {
					playSfx("attack_hit");
					const retDestroyed = isDestroyed(attacker);
					events.push({
						attackerId: targetId,
						targetId: attackerId,
						componentDamaged: retDamaged,
						targetDestroyed: retDestroyed,
					});
					if (retDestroyed) {
						playSfx("unit_death");
						toDestroy.push(attacker);
					}
				}
			}

			// Stop the attacker's movement when in combat
			if (attacker.has(Navigation)) {
				attacker.set(Navigation, { moving: false });
			}

			break; // one target per attacker per tick
		}
	}

	// Destroy dead units (after iteration)
	for (const entity of toDestroy) {
		if (entity.isAlive()) {
			destroyUnit(entity);
		}
	}

	lastCombatEvents = events;
}
