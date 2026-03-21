/**
 * Defense turret auto-attack system.
 *
 * Each turn during the environment phase, powered turrets scan for
 * hostile units within manhattan-distance range. The nearest hostile
 * takes damage equal to TurretStats.attackDamage, then the turret
 * enters cooldown.
 */

import type { World } from "koota";
import { playSfx } from "../audio/sfx";
import {
	Building,
	Powered,
	TurretStats,
	UnitFaction,
	UnitPos,
	UnitStats,
} from "../traits";
import { pushTurnEvent } from "../ui/game/turnEvents";

function manhattanDist(ax: number, az: number, bx: number, bz: number): number {
	return Math.abs(ax - bx) + Math.abs(az - bz);
}

const TURRET_DAMAGE_BY_TIER: Record<number, number> = { 1: 3, 2: 5, 3: 8 };
const TURRET_RANGE_BY_TIER: Record<number, number> = { 1: 8, 2: 10, 3: 12 };

export function runTurrets(world: World): void {
	for (const turret of world.query(Building, TurretStats, Powered)) {
		const b = turret.get(Building);
		const ts = turret.get(TurretStats);
		if (!b || !ts) continue;

		// Decrement cooldown
		if (ts.currentCooldown > 0) {
			turret.set(TurretStats, {
				...ts,
				currentCooldown: ts.currentCooldown - 1,
			});
			continue;
		}

		// Tier-scaled damage and range
		const tier = b.buildingTier ?? 1;
		const effectiveDamage = TURRET_DAMAGE_BY_TIER[tier] ?? ts.attackDamage;
		const effectiveRange = TURRET_RANGE_BY_TIER[tier] ?? ts.attackRange;

		// Find nearest hostile unit within range
		let bestTarget: (typeof units)[number] | null = null;
		let bestDist = Infinity;

		const units = world.query(UnitPos, UnitFaction, UnitStats);
		for (const unit of units) {
			const pos = unit.get(UnitPos);
			const faction = unit.get(UnitFaction);
			if (!pos || !faction) continue;

			// Hostile = different faction
			if (faction.factionId === b.factionId) continue;

			const dist = manhattanDist(b.tileX, b.tileZ, pos.tileX, pos.tileZ);
			if (dist <= effectiveRange && dist < bestDist) {
				bestDist = dist;
				bestTarget = unit;
			}
		}

		if (!bestTarget) continue;

		// Apply damage to target
		const targetStats = bestTarget.get(UnitStats);
		if (!targetStats) continue;

		const targetFaction = bestTarget.get(UnitFaction);
		const newHp = targetStats.hp - effectiveDamage;
		if (newHp <= 0) {
			pushTurnEvent(
				`Turret destroyed ${targetFaction?.factionId ?? "enemy"} unit at (${bestTarget.get(UnitPos)?.tileX}, ${bestTarget.get(UnitPos)?.tileZ})`,
			);
			bestTarget.destroy();
		} else {
			pushTurnEvent(
				`Turret hit ${targetFaction?.factionId ?? "enemy"} unit for ${effectiveDamage} dmg`,
			);
			bestTarget.set(UnitStats, { ...targetStats, hp: newHp });
		}

		playSfx("attack_hit");

		// Enter cooldown
		turret.set(TurretStats, {
			...ts,
			currentCooldown: ts.cooldownTurns,
		});
	}
}
