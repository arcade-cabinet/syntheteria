/**
 * @module combat
 *
 * Component-based melee combat system with AP cost integration and Guardian taunt.
 * Damage breaks random functional components rather than reducing HP; a unit with
 * all components broken is destroyed and drops salvage. Supports faction-on-faction
 * combat with a hostility matrix.
 *
 * @exports CombatEvent - Damage event record (attacker, target, component, destroyed)
 * @exports combatSystem - Per-tick combat resolution
 * @exports getLastCombatEvents / resetCombatState - Event access and reset
 * @exports areFactionsHostile - Faction hostility check (wildlife neutral)
 * @exports findTauntTarget - Guardian taunt target resolution
 * @exports TAUNT_RADIUS / COMBAT_AP_COST - Combat constants
 *
 * @dependencies ai (cancelAgentTask), bots/definitions, ecs/seed (gameplayRandom),
 *   ecs/traits, ecs/world, resources (addResource), turnSystem
 * @consumers gameState (combatSystem tick + getLastCombatEvents), initialization,
 *   audioHooks, CombatEffectsRenderer
 */
import { cancelAgentTask } from "../ai";
import { getBotDefinition } from "../bots/definitions";
import type { BotUnitType } from "../bots/types";
import { gameplayRandom } from "../ecs/seed";
import type { UnitEntity } from "../ecs/traits";
import { hasArms, Identity, Unit, WorldPosition } from "../ecs/traits";
import { units } from "../ecs/world";
import { addResource } from "./resources";
import { getTurnState, hasActionPoints, spendActionPoint } from "./turnSystem";

const MELEE_RANGE = 2.5;
const ATTACK_CHANCE = 0.4; // chance per tick when in range

/** Guardian taunt radius — enemies within this range prefer the Guardian. */
export const TAUNT_RADIUS = 5;

/** AP cost for a melee attack action. */
export const COMBAT_AP_COST = 1;

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

export function resetCombatState() {
	lastCombatEvents = [];
}

/**
 * Faction hostility matrix.
 * Returns true if faction `a` considers faction `b` hostile.
 * All non-player factions are hostile to each other and to the player.
 * Player is hostile to all non-player, non-wildlife factions.
 * Wildlife is neutral to everyone.
 */
export function areFactionsHostile(a: string, b: string): boolean {
	if (a === b) return false;
	if (a === "wildlife" || b === "wildlife") return false;
	// Everyone else is hostile to everyone not in their faction
	return true;
}

/**
 * Try to damage a random functional component on the target.
 * Returns the component name that was damaged, or null.
 */
function dealDamage(attacker: UnitEntity, target: UnitEntity): string | null {
	const functionalParts = target
		.get(Unit)
		?.components.filter((c) => c.functional);
	if (!functionalParts || functionalParts.length === 0) return null;

	// Units with arms are more effective fighters
	const hitChance = hasArms(attacker) ? 0.6 : 0.3;
	if (gameplayRandom() > hitChance) return null;

	// Pick a random functional component to break
	const victim =
		functionalParts[Math.floor(gameplayRandom() * functionalParts.length)];
	victim.functional = false;
	return victim.name;
}

/**
 * Check if a unit is destroyed (all components broken).
 */
function isDestroyed(entity: UnitEntity): boolean {
	return entity.get(Unit)!.components.every((c) => !c.functional);
}

/**
 * Destroy a unit — remove from world, drop salvage.
 */
function destroyUnit(entity: UnitEntity) {
	// Drop some resources as salvage
	const componentCount = entity.get(Unit)?.components.length;
	addResource("scrapMetal", Math.floor(componentCount! * 1.5));
	if (gameplayRandom() > 0.5) addResource("eWaste", 1);

	// Remove from ECS
	entity.destroy();
}

/**
 * Check if a unit can attack this turn.
 * Player units need AP. AI units attack freely during their phase.
 */
function canUnitAttack(entity: UnitEntity): boolean {
	const faction = entity.get(Identity)?.faction;
	if (!faction) return false;

	const turn = getTurnState();

	if (faction === "player") {
		// Player units require AP and it must be the player phase
		if (turn.phase !== "player") return false;
		const entityId = entity.get(Identity)!.id;
		return hasActionPoints(entityId);
	}

	// AI factions attack during ai_faction phase or freely if no turn system active
	// Feral/rogue/cultist units attack during their phase
	return true;
}

/**
 * Attempt to spend AP for an attack. Returns true if the attack can proceed.
 * Player units spend AP; AI units always succeed.
 */
function trySpendAttackAP(entity: UnitEntity): boolean {
	const faction = entity.get(Identity)?.faction;
	if (faction === "player") {
		const entityId = entity.get(Identity)!.id;
		return spendActionPoint(entityId, COMBAT_AP_COST);
	}
	// AI factions don't spend AP
	return true;
}

/**
 * Check if a unit is a Guardian (role === "guardian") with functional components.
 */
function isGuardian(entity: UnitEntity): boolean {
	const unitType = entity.get(Unit)?.type;
	if (!unitType) return false;
	const def = getBotDefinition(unitType as BotUnitType);
	return (
		def?.role === "guardian" &&
		entity.get(Unit)!.components.some((c) => c.functional)
	);
}

/**
 * Find a Guardian within taunt radius that could redirect an attack.
 * Returns the Guardian entity if one is taunting, or null.
 * The Guardian must be:
 *   - in the same hostile faction relationship as the original target
 *   - within TAUNT_RADIUS of the attacker
 *   - alive (has functional components)
 */
export function findTauntTarget(
	attacker: UnitEntity,
	allUnits: UnitEntity[],
): UnitEntity | null {
	const attackerIdentity = attacker.get(Identity);
	const attackerPos = attacker.get(WorldPosition);
	if (!attackerIdentity || !attackerPos) return null;

	let closestGuardian: UnitEntity | null = null;
	let closestDist = TAUNT_RADIUS + 1;

	for (const candidate of allUnits) {
		const candidateIdentity = candidate.get(Identity);
		if (!candidateIdentity) continue;
		if (candidateIdentity.id === attackerIdentity.id) continue;
		if (
			!areFactionsHostile(attackerIdentity.faction, candidateIdentity.faction)
		)
			continue;
		if (!isGuardian(candidate)) continue;

		const candidatePos = candidate.get(WorldPosition);
		if (!candidatePos) continue;

		const dx = attackerPos.x - candidatePos.x;
		const dz = attackerPos.z - candidatePos.z;
		const dist = Math.sqrt(dx * dx + dz * dz);

		if (dist <= TAUNT_RADIUS && dist < closestDist) {
			closestGuardian = candidate;
			closestDist = dist;
		}
	}

	return closestGuardian;
}

/**
 * Combat tick. Called once per sim tick.
 * Checks for hostile units in melee range and resolves attacks.
 * Guardians taunt nearby enemies — redirecting attacks to themselves.
 * Supports faction-on-faction combat — any faction vs any hostile faction.
 */
export function combatSystem() {
	const events: CombatEvent[] = [];
	const toDestroy: UnitEntity[] = [];

	const allUnits = Array.from(units);
	const attacked = new Set<string>(); // track who already attacked this tick

	for (const attacker of allUnits) {
		const attackerIdentity = attacker.get(Identity);
		if (!attackerIdentity) continue;
		if (attacked.has(attackerIdentity.id)) continue;
		if (!attacker.get(Unit)?.components.some((c) => c.functional)) continue;
		if (!canUnitAttack(attacker)) continue;

		// Guardian taunt: check if a nearby Guardian should redirect this attack
		const tauntTarget = findTauntTarget(attacker, allUnits);

		for (const candidate of allUnits) {
			const targetIdentity = candidate.get(Identity);
			if (!targetIdentity) continue;
			if (attackerIdentity.id === targetIdentity.id) continue;
			if (!areFactionsHostile(attackerIdentity.faction, targetIdentity.faction))
				continue;

			// If a Guardian is taunting, skip non-Guardian targets
			const target = tauntTarget ?? candidate;
			const actualTargetIdentity = target.get(Identity);
			if (!actualTargetIdentity) continue;

			const attackerPos = attacker.get(WorldPosition);
			const targetPos = target.get(WorldPosition);
			if (!attackerPos || !targetPos) continue;

			const dx = attackerPos.x - targetPos.x;
			const dz = attackerPos.z - targetPos.z;
			const dist = Math.sqrt(dx * dx + dz * dz);

			if (dist > MELEE_RANGE) {
				// If taunted to Guardian but Guardian is out of melee range,
				// fall back to original candidate
				if (tauntTarget && target !== candidate) {
					const candPos = candidate.get(WorldPosition);
					if (!candPos) continue;
					const cdx = attackerPos.x - candPos.x;
					const cdz = attackerPos.z - candPos.z;
					const cDist = Math.sqrt(cdx * cdx + cdz * cdz);
					if (cDist > MELEE_RANGE) continue;
					// Use original candidate since Guardian is out of melee range
					// but don't redirect — fall through to attack candidate
				} else {
					continue;
				}
			}
			if (gameplayRandom() > ATTACK_CHANCE) continue;

			// Spend AP before attacking (player units only)
			if (!trySpendAttackAP(attacker)) continue;

			// Resolve final target (Guardian if in melee range, otherwise candidate)
			const finalTarget = dist <= MELEE_RANGE ? target : candidate;
			const finalTargetIdentity = finalTarget.get(Identity)!;

			// Attacker attacks target
			const damaged = dealDamage(attacker, finalTarget);
			if (damaged) {
				const destroyed = isDestroyed(finalTarget);
				events.push({
					attackerId: attackerIdentity.id,
					targetId: finalTargetIdentity.id,
					componentDamaged: damaged,
					targetDestroyed: destroyed,
				});
				if (destroyed) {
					toDestroy.push(finalTarget);
				}
			}

			// Target retaliates if it has functional components
			if (finalTarget.get(Unit)?.components.some((c) => c.functional)) {
				const retDamaged = dealDamage(finalTarget, attacker);
				if (retDamaged) {
					const retDestroyed = isDestroyed(attacker);
					events.push({
						attackerId: finalTargetIdentity.id,
						targetId: attackerIdentity.id,
						componentDamaged: retDamaged,
						targetDestroyed: retDestroyed,
					});
					if (retDestroyed) {
						toDestroy.push(attacker);
					}
				}
			}

			cancelAgentTask(attackerIdentity.id);
			attacked.add(attackerIdentity.id);

			break; // one target per attacker per tick
		}
	}

	// Destroy dead units (after iteration)
	for (const entity of toDestroy) {
		destroyUnit(entity);
	}

	lastCombatEvents = events;
}
