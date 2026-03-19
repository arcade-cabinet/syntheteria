/**
 * Defense turret auto-attack system.
 *
 * Each turn during the environment phase, powered turrets scan for
 * hostile units within manhattan-distance range. The nearest hostile
 * takes damage equal to TurretStats.attackDamage, then the turret
 * enters cooldown.
 */

import type { World } from "koota";
import { playSfx } from "../../audio/sfx";
import { pushTurnEvent } from "../../ui/game/turnEvents";
import { Building, Powered, TurretStats } from "../traits/building";
import { UnitFaction, UnitPos, UnitStats } from "../traits/unit";

function manhattanDist(
	ax: number,
	az: number,
	bx: number,
	bz: number,
): number {
	return Math.abs(ax - bx) + Math.abs(az - bz);
}

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
			if (dist <= ts.attackRange && dist < bestDist) {
				bestDist = dist;
				bestTarget = unit;
			}
		}

		if (!bestTarget) continue;

		// Apply damage to target
		const targetStats = bestTarget.get(UnitStats);
		if (!targetStats) continue;

		const targetFaction = bestTarget.get(UnitFaction);
		const newHp = targetStats.hp - ts.attackDamage;
		if (newHp <= 0) {
			pushTurnEvent(`Turret destroyed ${targetFaction?.factionId ?? "enemy"} unit at (${bestTarget.get(UnitPos)?.tileX}, ${bestTarget.get(UnitPos)?.tileZ})`);
			bestTarget.destroy();
		} else {
			pushTurnEvent(`Turret hit ${targetFaction?.factionId ?? "enemy"} unit for ${ts.attackDamage} dmg`);
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
