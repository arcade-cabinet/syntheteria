/**
 * Experience Accumulation System — units gain XP from role-aligned actions.
 *
 * Each robot class has a role family that determines which actions grant full XP.
 * Off-role actions grant 50% XP. XP accumulates toward Mark thresholds.
 *
 * Ported from pending/systems/experience.ts — adapted to Koota ECS with
 * world param pattern, numeric entity IDs, and our RobotClass taxonomy.
 *
 * Role-action XP mapping:
 *   - worker (industry):   harvest, build, repair → full XP
 *   - scout (utility):     explore, survey, relay → full XP
 *   - infantry (combat):   combat, hack, breach → full XP
 *   - cavalry (combat):    combat, hack, breach → full XP
 *   - ranged (combat):     combat, hack, breach → full XP
 *   - support (expansion): build, repair, fortify → full XP
 *   - cult_* (hostile):    combat, breach → full XP
 *   - Off-role actions grant 50% XP
 *
 * Mark thresholds (exponential):
 *   Mark 2 = 100 XP, Mark 3 = 300 XP (cumulative), Mark 4 = 700 XP, etc.
 */

import type { World } from "koota";
import type { RobotClass } from "../robots/types";
import { MAX_MARK_LEVEL } from "../robots/marks";
import { UnitFaction, UnitPos, UnitStats, UnitVisual, UnitXP } from "../traits/unit";
import { pushToast } from "./toastNotifications";

// ─── Types ────────────────────────────────────────────────────────────────────

export type XPActionType =
	| "harvest"
	| "build"
	| "repair"
	| "explore"
	| "survey"
	| "relay"
	| "combat"
	| "hack"
	| "breach"
	| "haul"
	| "fortify"
	| "found";

/** Role family — derived from RobotClass. */
export type RobotRoleFamily =
	| "industry"
	| "utility"
	| "combat"
	| "expansion"
	| "hostile";

// ─── Constants ────────────────────────────────────────────────────────────────

/** Base XP per action. */
export const BASE_XP = 10;

/** Off-role XP multiplier. */
export const OFF_ROLE_MULTIPLIER = 0.5;

/** Mark threshold formula: base * factor^(mark-2) per level. */
const MARK_XP_BASE = 100;
const MARK_XP_FACTOR = 2.0;

/** Map RobotClass to its role family. */
export const CLASS_ROLE: Record<RobotClass, RobotRoleFamily> = {
	worker: "industry",
	scout: "utility",
	infantry: "combat",
	cavalry: "combat",
	ranged: "combat",
	support: "expansion",
	cult_infantry: "hostile",
	cult_ranged: "hostile",
	cult_cavalry: "hostile",
};

/** Which action types align with which role families. */
export const ROLE_ACTIONS: Record<RobotRoleFamily, readonly XPActionType[]> = {
	industry: ["harvest", "build", "repair"],
	utility: ["explore", "survey", "relay"],
	combat: ["combat", "hack", "breach"],
	expansion: ["build", "repair", "fortify"],
	hostile: ["combat", "breach"],
};

// ─── XP Calculations ─────────────────────────────────────────────────────────

/**
 * Total XP required to reach a given Mark level (cumulative).
 * Mark 1 = 0, Mark 2 = 100, Mark 3 = 300, Mark 4 = 700, etc.
 */
export function getMarkThreshold(mark: number): number {
	if (mark <= 1) return 0;
	let total = 0;
	for (let m = 2; m <= mark; m++) {
		total += Math.floor(MARK_XP_BASE * Math.pow(MARK_XP_FACTOR, m - 2));
	}
	return total;
}

/**
 * XP needed to advance from `currentMark` to `currentMark + 1`.
 */
export function getXPForNextMark(currentMark: number): number {
	return getMarkThreshold(currentMark + 1) - getMarkThreshold(currentMark);
}

/**
 * Check if an action is role-aligned for a given robot class.
 */
export function isRoleAligned(
	robotClass: RobotClass,
	action: XPActionType,
): boolean {
	const family = CLASS_ROLE[robotClass];
	const alignedActions = ROLE_ACTIONS[family];
	return alignedActions?.includes(action) ?? false;
}

/**
 * Calculate XP earned for an action, considering role alignment.
 */
export function calculateXPForAction(
	robotClass: RobotClass,
	action: XPActionType,
	bonusMultiplier = 1,
): number {
	const aligned = isRoleAligned(robotClass, action);
	const multiplier = aligned ? 1 : OFF_ROLE_MULTIPLIER;
	return Math.floor(BASE_XP * multiplier * bonusMultiplier);
}

// ─── Entity helpers ───────────────────────────────────────────────────────────

function findEntityById(world: World, entityId: number) {
	for (const e of world.query(UnitXP)) {
		if (e.id() === entityId) return e;
	}
	return null;
}

// ─── Unit XP Management ──────────────────────────────────────────────────────

/**
 * Award XP to a unit for performing an action.
 * Auto-applies mark upgrade when threshold is reached and fires a toast.
 * Returns the XP earned and whether the unit leveled up.
 */
export function awardXP(
	world: World,
	entityId: number,
	robotClass: RobotClass,
	action: XPActionType,
	bonusMultiplier = 1,
): { xpEarned: number; upgradeEligible: boolean; newMarkLevel: number } {
	const earned = calculateXPForAction(robotClass, action, bonusMultiplier);
	const entity = findEntityById(world, entityId);

	if (!entity) {
		return { xpEarned: earned, upgradeEligible: false, newMarkLevel: 1 };
	}

	const cur = entity.get(UnitXP);
	if (!cur) {
		return { xpEarned: earned, upgradeEligible: false, newMarkLevel: 1 };
	}

	const newXp = cur.xp + earned;
	const markLevel = cur.markLevel > 0 ? cur.markLevel : 1;
	entity.set(UnitXP, { ...cur, xp: newXp, markLevel });

	const xpToNext = getXPForNextMark(markLevel);
	const upgradeEligible = newXp >= xpToNext;

	// Auto-apply mark upgrade and fire toast
	if (upgradeEligible && markLevel < MAX_MARK_LEVEL) {
		const upgraded = applyMarkUpgrade(world, entityId);
		if (upgraded) {
			const visual = entity.get(UnitVisual);
			const unitName = visual?.modelId
				? visual.modelId.replace(/_/g, " ").toUpperCase()
				: "UNIT";
			const newMark = markLevel + 1;
			const markNames = ["", "I", "II", "III", "IV", "V"];
			pushToast(
				"system",
				"MARK ADVANCEMENT",
				`${unitName} ADVANCED TO MARK ${markNames[newMark] ?? newMark}`,
			);
			return { xpEarned: earned, upgradeEligible: true, newMarkLevel: newMark };
		}
	}

	return { xpEarned: earned, upgradeEligible, newMarkLevel: markLevel };
}

/**
 * Apply a Mark upgrade (consumes accumulated XP toward next Mark).
 * Returns false if not eligible.
 */
export function applyMarkUpgrade(world: World, entityId: number): boolean {
	const entity = findEntityById(world, entityId);
	if (!entity) return false;

	const cur = entity.get(UnitXP);
	if (!cur) return false;

	// Cap at Mark V (Transcendence)
	if (cur.markLevel >= MAX_MARK_LEVEL) return false;

	const xpToNext = getXPForNextMark(cur.markLevel);
	if (cur.xp < xpToNext) return false;

	entity.set(UnitXP, {
		...cur,
		xp: cur.xp - xpToNext,
		markLevel: cur.markLevel + 1,
	});

	return true;
}

/**
 * Get XP progress as a fraction [0, 1] for UI display.
 */
export function getXPProgress(world: World, entityId: number): number {
	const entity = findEntityById(world, entityId);
	if (!entity) return 0;

	const cur = entity.get(UnitXP);
	if (!cur) return 0;

	const xpToNext = getXPForNextMark(cur.markLevel);
	if (xpToNext === 0) return 0;
	return Math.min(1, cur.xp / xpToNext);
}

/**
 * Increment kill count for a unit.
 */
export function recordKill(world: World, entityId: number): void {
	const entity = findEntityById(world, entityId);
	if (!entity) return;
	const cur = entity.get(UnitXP);
	if (!cur) return;
	entity.set(UnitXP, { ...cur, killCount: cur.killCount + 1 });
}

/**
 * Increment harvest count for a unit.
 */
export function recordHarvest(world: World, entityId: number): void {
	const entity = findEntityById(world, entityId);
	if (!entity) return;
	const cur = entity.get(UnitXP);
	if (!cur) return;
	entity.set(UnitXP, { ...cur, harvestCount: cur.harvestCount + 1 });
}

/**
 * Reset all XP state — call on new game.
 */
export function resetAllXP(world: World): void {
	for (const entity of world.query(UnitXP)) {
		entity.set(UnitXP, { xp: 0, markLevel: 1, killCount: 0, harvestCount: 0 });
	}
}
