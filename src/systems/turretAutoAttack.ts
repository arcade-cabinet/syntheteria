/**
 * Turret Auto-Attack System
 *
 * During the environment phase, each operational defense turret scans for
 * hostile units within its attack range and fires at the nearest one.
 *
 * Turret stats are read from config/buildings.json via the config loader.
 * Turrets do not consume AP — they fire automatically every turn.
 */

import buildingsConfig from "../config/buildings.json";
import { gameplayRandom } from "../ecs/seed";
import { Building, Identity, Unit, WorldPosition } from "../ecs/traits";
import { buildings, units } from "../ecs/world";
import { areFactionsHostile } from "./combat";
import { registerEnvironmentPhaseHandler } from "./turnSystem";

// ─── Config ──────────────────────────────────────────────────────────────────

const TURRET_STATS = {
	attackRange: buildingsConfig.defense_turret.attackRange,
	attackDamage: buildingsConfig.defense_turret.attackDamage,
	attackCooldown: buildingsConfig.defense_turret.attackCooldown,
};

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TurretAttackEvent {
	turretEntityId: string;
	turretFaction: string;
	targetEntityId: string;
	targetFaction: string;
	componentsDestroyed: number;
	targetKilled: boolean;
}

// ─── State ───────────────────────────────────────────────────────────────────

let lastTurretEvents: TurretAttackEvent[] = [];

/** Per-turret cooldown tracker: entityId -> turns remaining */
const turretCooldowns = new Map<string, number>();

export function getLastTurretEvents(): readonly TurretAttackEvent[] {
	return lastTurretEvents;
}

export function resetTurretAutoAttack() {
	lastTurretEvents = [];
	turretCooldowns.clear();
}

// ─── Core Logic ──────────────────────────────────────────────────────────────

/**
 * Run turret auto-attack for all operational defense turrets.
 * Called during the environment phase of each turn.
 */
export function turretAutoAttackTick(): TurretAttackEvent[] {
	const stats = TURRET_STATS;
	const events: TurretAttackEvent[] = [];

	const allUnits = Array.from(units);

	for (const turret of buildings) {
		const building = turret.get(Building);
		if (!building) continue;
		if (building.type !== "defense_turret") continue;
		if (!building.powered) continue;
		if (!building.operational) continue;

		const turretIdentity = turret.get(Identity);
		if (!turretIdentity) continue;

		const turretPos = turret.get(WorldPosition);
		if (!turretPos) continue;

		// Check cooldown
		const cooldownRemaining = turretCooldowns.get(turretIdentity.id) ?? 0;
		if (cooldownRemaining > 0) {
			turretCooldowns.set(turretIdentity.id, cooldownRemaining - 1);
			continue;
		}

		// Find nearest hostile unit within range
		let nearestTarget: (typeof allUnits)[number] | null = null;
		let nearestDist = Infinity;

		for (const target of allUnits) {
			const targetIdentity = target.get(Identity);
			if (!targetIdentity) continue;
			if (!areFactionsHostile(turretIdentity.faction, targetIdentity.faction))
				continue;

			const targetPos = target.get(WorldPosition);
			if (!targetPos) continue;

			const dx = turretPos.x - targetPos.x;
			const dz = turretPos.z - targetPos.z;
			const dist = Math.sqrt(dx * dx + dz * dz);

			if (dist <= stats.attackRange && dist < nearestDist) {
				nearestDist = dist;
				nearestTarget = target;
			}
		}

		if (!nearestTarget) continue;

		// Fire at nearest target — deal damage to random components
		const targetUnit = nearestTarget.get(Unit);
		const targetIdentity = nearestTarget.get(Identity)!;
		if (!targetUnit) continue;

		let componentsDestroyed = 0;
		for (let i = 0; i < stats.attackDamage; i++) {
			const functional = targetUnit.components.filter((c) => c.functional);
			if (functional.length === 0) break;

			const victim =
				functional[Math.floor(gameplayRandom() * functional.length)]!;
			victim.functional = false;
			componentsDestroyed++;
		}

		const targetKilled = targetUnit.components.every((c) => !c.functional);

		events.push({
			turretEntityId: turretIdentity.id,
			turretFaction: turretIdentity.faction,
			targetEntityId: targetIdentity.id,
			targetFaction: targetIdentity.faction,
			componentsDestroyed,
			targetKilled,
		});

		// Set cooldown
		turretCooldowns.set(turretIdentity.id, stats.attackCooldown);

		// Destroy killed unit
		if (targetKilled) {
			nearestTarget.destroy();
		}
	}

	lastTurretEvents = events;
	return events;
}

// ─── Registration ────────────────────────────────────────────────────────────

registerEnvironmentPhaseHandler((_turnNumber) => {
	turretAutoAttackTick();
});
