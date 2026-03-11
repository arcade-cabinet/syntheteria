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
 * Hostility rules:
 *   - "feral" and "wildlife" never initiate (feral attacks all non-feral, non-wildlife,
 *     non-wildlife; wildlife is passive). Legacy behaviour preserved for feral.
 *   - AI factions fight each other when a war has been declared via declareWar().
 *   - "player" can be at war with any AI faction.
 *   - Same-faction units never fight each other.
 *
 * All tunables sourced from config/combat.json.
 */

import { config } from "../../config";
import type { FactionId, UnitEntity } from "../ecs/types";
import { hasArms } from "../ecs/types";
import { destroyEntityById } from "../ecs/koota/bridge";
import { units } from "../ecs/koota/compat";
import { addResource } from "./resources";
import { emit } from "./eventBus";

// ---------------------------------------------------------------------------
// Audio helper — fire-and-forget; never throws into gameplay code
// ---------------------------------------------------------------------------

function safeEmit(event: Parameters<typeof emit>[0]): void {
	try {
		emit(event);
	} catch {
		// Audio integration must never crash gameplay
	}
}

const MELEE_RANGE = config.combat.meleeRange;
const ATTACK_CHANCE = config.combat.attackChancePerTick;

// ---------------------------------------------------------------------------
// War declaration state
// ---------------------------------------------------------------------------

/**
 * Canonical pair key for two factions (alphabetically sorted so A::B === B::A).
 */
function warPairKey(a: FactionId, b: FactionId): string {
	return a < b ? `${a}::${b}` : `${b}::${a}`;
}

/**
 * Set of faction pairs currently at war.
 * Feral is always hostile toward everything except wildlife; this set tracks
 * declared wars between AI factions and between AI factions and the player.
 */
const warSet = new Set<string>();

/**
 * Declare war between two factions. This sets mutual opinion to -100
 * (via the diplomacy system if available) and enables combat between them.
 * Idempotent — calling twice has no additional effect.
 */
export function declareWar(factionA: FactionId, factionB: FactionId): void {
	if (factionA === factionB) return;
	warSet.add(warPairKey(factionA, factionB));
}

/**
 * Check whether two factions are at war with each other.
 */
export function areAtWar(factionA: FactionId, factionB: FactionId): boolean {
	return warSet.has(warPairKey(factionA, factionB));
}

// ---------------------------------------------------------------------------
// Hostility check
// ---------------------------------------------------------------------------

/** Factions that are always passive (never initiate attacks). */
const PASSIVE_FACTIONS = new Set<FactionId>(["player", "wildlife"]);

/**
 * Return true when `attacker` is allowed to initiate combat against `target`.
 *
 * Rules (evaluated in order):
 *  1. Same faction → never fight.
 *  2. Wildlife → always passive, never initiates.
 *  3. Feral → attacks everything except wildlife and other feral units.
 *  4. Otherwise → hostility is determined by the war declaration set.
 */
function isHostile(attacker: UnitEntity, target: UnitEntity): boolean {
	if (attacker.faction === target.faction) return false;
	if (attacker.faction === "wildlife") return false;
	if (target.faction === "wildlife") return false;

	if (attacker.faction === "feral") {
		// Feral attacks all non-feral, non-wildlife units
		return target.faction !== "feral";
	}

	// For all other factions (AI civs, player) — use explicit war declarations.
	return areAtWar(attacker.faction, target.faction);
}

// ---------------------------------------------------------------------------
// Combat event
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

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

	safeEmit({
		type: "entity_death",
		entityId: entity.id,
		killedBy: "combat",
		entityType: entity.faction,
		tick: 0,
	});

	destroyEntityById(entity.id);
}

// ---------------------------------------------------------------------------
// Main system tick
// ---------------------------------------------------------------------------

/**
 * Combat tick. Called once per sim tick.
 * Checks for hostile units in melee range and resolves attacks.
 * Any faction pair that is hostile (feral-vs-all, or declared-war pair)
 * will engage when within MELEE_RANGE.
 */
export function combatSystem() {
	const events: CombatEvent[] = [];
	const toDestroy: UnitEntity[] = [];
	// Track which entities are already queued for destruction this tick so we
	// don't double-queue the same entity.
	const toDestroySet = new Set<string>();

	const allUnits = Array.from(units);

	for (const attacker of allUnits) {
		// Skip passive factions — they never initiate.
		if (PASSIVE_FACTIONS.has(attacker.faction)) continue;
		// Skip incapacitated attackers.
		if (!attacker.unit.components.some((c) => c.functional)) continue;

		for (const target of allUnits) {
			if (!isHostile(attacker, target)) continue;

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
				safeEmit({
					type: "damage_taken",
					targetId: target.id,
					sourceId: attacker.id,
					amount: 1,
					damageType: "melee",
					tick: 0,
				});
				if (destroyed && !toDestroySet.has(target.id)) {
					toDestroySet.add(target.id);
					toDestroy.push(target);
				}
			}

			// Target retaliates if it has any functional components left.
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
					safeEmit({
						type: "damage_taken",
						targetId: attacker.id,
						sourceId: target.id,
						amount: 1,
						damageType: "melee",
						tick: 0,
					});
					if (retDestroyed && !toDestroySet.has(attacker.id)) {
						toDestroySet.add(attacker.id);
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

// ---------------------------------------------------------------------------
// Reset (testing / new game)
// ---------------------------------------------------------------------------

/**
 * Clear all combat state (war declarations, last events).
 * Must be called between test cases and on new-game-init.
 */
export function resetCombat(): void {
	warSet.clear();
	lastCombatEvents = [];
}
