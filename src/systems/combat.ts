/**
 * Combat system -- component-based damage.
 *
 * When hostile units are within melee range, they exchange damage.
 * Damage breaks random components rather than reducing HP.
 * A unit with all components broken is destroyed.
 *
 * Damage uses attackPower (from robotDefs mark tiers) and
 * durability (target's defense multiplier) to compute hit chance.
 * Units with functional arms get a bonus.
 */

import type { Entity } from "koota";
import { playSfx } from "../audio";
import { getMarkTier } from "../config/robotDefs";
import {
	EngagementRule,
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
import { recordCultLeaderKill } from "./victoryDefeat";

const MELEE_RANGE = 2.5;
const ATTACK_CHANCE = 0.4; // chance per tick when in range

/** Base hit chance before attackPower/durability modifiers */
const BASE_HIT_CHANCE = 0.35;
/** Bonus hit chance when attacker has functional arms */
const ARMS_BONUS = 0.15;

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
 * Get the attackPower for a unit.
 * Player units use robotDefs mark tiers; cult/feral mechs get defaults.
 */
export function getAttackPower(entity: Entity): number {
	const unit = entity.get(Unit);
	if (!unit) return 1.0;
	const tier = getMarkTier(unit.unitType, unit.mark);
	if (tier) return tier.stats.attackPower;
	// Cult/feral mechs without mark definitions default to 1.0
	return 1.0;
}

/**
 * Get the durability for a unit.
 * Player units use robotDefs mark tiers; cult/feral mechs get defaults.
 */
export function getDurability(entity: Entity): number {
	const unit = entity.get(Unit);
	if (!unit) return 1.0;
	const tier = getMarkTier(unit.unitType, unit.mark);
	if (tier) return tier.stats.durability;
	return 1.0;
}

/**
 * Compute hit chance: base + arms bonus, scaled by attacker's attackPower,
 * reduced by target's durability. Clamped to [0.05, 0.95].
 */
export function computeHitChance(
	attackerComponents: UnitComponent[],
	attackPower: number,
	targetDurability: number,
): number {
	const base = hasArms(attackerComponents)
		? BASE_HIT_CHANCE + ARMS_BONUS
		: BASE_HIT_CHANCE;
	const raw = (base * attackPower) / targetDurability;
	return Math.max(0.05, Math.min(0.95, raw));
}

/**
 * Try to damage a random functional component on the target.
 * Uses attackPower/durability to scale hit probability.
 * Returns the component name that was damaged, or null.
 */
export function dealDamage(
	attackerComponents: UnitComponent[],
	attackPower: number,
	target: Entity,
	rng: () => number = Math.random,
): string | null {
	const targetComps = parseComponents(
		target.get(UnitComponents)?.componentsJson,
	);
	const functionalParts = targetComps.filter((c) => c.functional);
	if (functionalParts.length === 0) return null;

	const targetDurability = getDurability(target);
	const hitChance = computeHitChance(
		attackerComponents,
		attackPower,
		targetDurability,
	);
	if (rng() > hitChance) return null;

	// Pick a random functional component to break
	const victim = functionalParts[Math.floor(rng() * functionalParts.length)];
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
 * If the destroyed entity is the cult leader, triggers victory.
 */
function destroyUnit(entity: Entity) {
	// Check for cult leader before destroying
	const entityId = entity.has(EntityId) ? entity.get(EntityId)!.value : "";
	if (entityId === "cult_leader") {
		recordCultLeaderKill();
	}

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
		const attackerPower = getAttackPower(attacker);

		for (const target of allUnits) {
			if (target.get(Faction)?.value !== "player") continue;

			const aPos = attacker.get(Position)!;
			const tPos = target.get(Position)!;
			const dx = aPos.x - tPos.x;
			const dz = aPos.z - tPos.z;
			const dist = Math.sqrt(dx * dx + dz * dz);

			if (dist > MELEE_RANGE) continue;
			if (Math.random() > ATTACK_CHANCE) continue;

			const attackerId = attacker.get(EntityId)?.value ?? "";
			const targetId = target.get(EntityId)?.value ?? "";

			// Feral/cultist attacks player
			const damaged = dealDamage(attackerComps, attackerPower, target);
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

			// Player unit retaliates if engagement rule allows it
			// "hold" and "flee" units do not retaliate
			const targetRule = target.has(EngagementRule)
				? target.get(EngagementRule)!.value
				: "attack";
			const canRetaliate = targetRule === "attack" || targetRule === "protect";
			const targetComps = parseComponents(
				target.get(UnitComponents)?.componentsJson,
			);
			if (canRetaliate && targetComps.some((c) => c.functional)) {
				const targetPower = getAttackPower(target);
				const retDamaged = dealDamage(targetComps, targetPower, attacker);
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
