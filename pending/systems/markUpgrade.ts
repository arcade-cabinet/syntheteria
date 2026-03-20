/**
 * Mark Upgrade System
 *
 * Handles unit Mark upgrades at Motor Pools. A unit is "docked" at a Motor Pool
 * during upgrade — it cannot move or act. Upgrade takes turns depending on the
 * target Mark level.
 *
 * Mark upgrade turns:
 *   I → II:   2 turns
 *   II → III: 4 turns
 *   III → IV: 8 turns
 *   IV → V:   8 turns
 *
 * Mark IV-V can only be upgraded from Mark III, not built from scratch.
 */

import { Building, Identity, Unit } from "../ecs/traits";
import { buildings, units } from "../ecs/world";
import {
	canMotorPoolUpgradeMark,
	getMarkUpgradeCost,
	getMotorPoolState,
} from "./motorPool";
import { getResources, spendResource } from "./resources";

// ---------------------------------------------------------------------------
// Upgrade turn durations by target mark
// ---------------------------------------------------------------------------

const UPGRADE_TURNS: Record<number, number> = {
	2: 2,
	3: 4,
	4: 8,
	5: 8,
};

export function getUpgradeTurns(targetMark: number): number {
	return UPGRADE_TURNS[targetMark] ?? 0;
}

// ---------------------------------------------------------------------------
// Active upgrade jobs
// ---------------------------------------------------------------------------

export interface MarkUpgradeJob {
	unitEntityId: string;
	motorPoolEntityId: string;
	targetMark: number;
	turnsRemaining: number;
	totalTurns: number;
}

const activeUpgrades: Map<string, MarkUpgradeJob> = new Map();

/**
 * Check if a unit can be upgraded at a specific Motor Pool.
 */
export function canUpgradeUnit(
	unitEntityId: string,
	motorPoolEntityId: string,
): { possible: boolean; reason?: string } {
	if (activeUpgrades.has(unitEntityId)) {
		return { possible: false, reason: "Unit already upgrading" };
	}

	let unitMark = 0;
	let unitFound = false;
	for (const unit of units) {
		if (unit.get(Identity)?.id === unitEntityId) {
			unitFound = true;
			const unitComp = unit.get(Unit);
			if (!unitComp) return { possible: false, reason: "Not a unit" };
			unitMark = unitComp.markLevel ?? 1;
			break;
		}
	}
	if (!unitFound) return { possible: false, reason: "Unit not found" };
	if (unitMark >= 5) {
		return { possible: false, reason: "Already at maximum Mark" };
	}

	const targetMark = unitMark + 1;
	if (!canMotorPoolUpgradeMark(motorPoolEntityId, targetMark)) {
		return {
			possible: false,
			reason: `Motor Pool tier too low for Mark ${targetMark}`,
		};
	}

	const upgradeCost = getMarkUpgradeCost(unitMark);
	if (!upgradeCost) return { possible: false, reason: "No upgrade path" };

	const pool = getResources();
	for (const cost of upgradeCost.costs) {
		if ((pool[cost.type] ?? 0) < cost.amount) {
			return { possible: false, reason: "Insufficient resources" };
		}
	}

	return { possible: true };
}

/**
 * Start upgrading a unit at a Motor Pool.
 * The unit is "docked" and cannot move or act until upgrade completes.
 */
export function startMarkUpgrade(
	unitEntityId: string,
	motorPoolEntityId: string,
): boolean {
	const check = canUpgradeUnit(unitEntityId, motorPoolEntityId);
	if (!check.possible) return false;

	let currentMark = 1;
	for (const unit of units) {
		if (unit.get(Identity)?.id === unitEntityId) {
			currentMark = unit.get(Unit)?.markLevel ?? 1;
			break;
		}
	}

	const targetMark = currentMark + 1;
	const upgradeCost = getMarkUpgradeCost(currentMark);
	if (!upgradeCost) return false;

	for (const cost of upgradeCost.costs) {
		spendResource(cost.type, cost.amount);
	}

	const turns = getUpgradeTurns(targetMark);
	activeUpgrades.set(unitEntityId, {
		unitEntityId,
		motorPoolEntityId,
		targetMark,
		turnsRemaining: turns,
		totalTurns: turns,
	});

	return true;
}

/**
 * Check if a unit is currently docked for upgrade.
 */
export function isUnitDocked(unitEntityId: string): boolean {
	return activeUpgrades.has(unitEntityId);
}

/**
 * Get upgrade progress for a unit.
 */
export function getUpgradeJob(unitEntityId: string): MarkUpgradeJob | null {
	return activeUpgrades.get(unitEntityId) ?? null;
}

/**
 * Get all active upgrade jobs.
 */
export function getAllUpgradeJobs(): MarkUpgradeJob[] {
	return Array.from(activeUpgrades.values());
}

/**
 * Advance all active upgrades by one turn.
 * Completed upgrades increase the unit's Mark level.
 */
export function markUpgradeTurnTick(): void {
	for (const [unitId, job] of activeUpgrades) {
		let powered = false;
		for (const bldg of buildings) {
			if (bldg.get(Identity)?.id === job.motorPoolEntityId) {
				const bComp = bldg.get(Building);
				if (bComp?.powered && bComp.operational) {
					powered = true;
				}
				break;
			}
		}

		if (!powered) continue;

		job.turnsRemaining--;
		if (job.turnsRemaining <= 0) {
			for (const unit of units) {
				if (unit.get(Identity)?.id === unitId) {
					const unitComp = unit.get(Unit);
					if (unitComp) {
						unit.set(Unit, {
							...unitComp,
							markLevel: job.targetMark,
						});
					}
					break;
				}
			}
			activeUpgrades.delete(unitId);
		}
	}
}

export function resetMarkUpgradeState() {
	activeUpgrades.clear();
}

export function _reset() {
	activeUpgrades.clear();
}
