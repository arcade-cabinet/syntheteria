/**
 * Experience Accumulation System — units gain XP from role-aligned actions.
 *
 * Each bot archetype has a role family that determines which actions
 * grant XP. XP accumulates toward Mark thresholds for upgrading.
 *
 * Role-action XP mapping:
 *   - Fabricator (industry): harvest, build, repair → full XP
 *   - Scout (utility): explore, survey, relay → full XP
 *   - Striker (combat): combat, hack, breach → full XP
 *   - Hauler (logistics): haul, relay, logistics → full XP
 *   - Engineer (expansion): found, fortify, terrain → full XP
 *   - Off-role actions grant 50% XP
 *
 * Mark thresholds use exponential scaling:
 *   Mark 2 = 100 XP, Mark 3 = 250 XP, Mark 4 = 500 XP, etc.
 */

import type { BotArchetypeId, BotRoleFamily } from "../bots/types";
import { getBotArchetypeDefinition } from "../bots/archetypes";

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

export interface UnitExperience {
	entityId: string;
	archetypeId: BotArchetypeId;
	currentXP: number;
	currentMark: number;
	xpToNextMark: number;
	upgradeEligible: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Base XP per action */
const BASE_XP = 10;

/** Off-role XP multiplier */
const OFF_ROLE_MULTIPLIER = 0.5;

/** Mark threshold formula: base * factor^(mark-1) */
const MARK_XP_BASE = 100;
const MARK_XP_FACTOR = 2.0;

/** Which action types align with which role families */
const ROLE_ACTIONS: Record<BotRoleFamily, XPActionType[]> = {
	industry: ["harvest", "build", "repair"],
	utility: ["explore", "survey", "relay"],
	combat: ["combat", "hack", "breach"],
	logistics: ["haul", "relay"],
	expansion: ["found", "fortify", "build"],
	hostile: ["combat", "breach"],
};

// ─── State ────────────────────────────────────────────────────────────────────

const unitXP = new Map<string, UnitExperience>();

// ─── XP Calculations ──────────────────────────────────────────────────────────

/**
 * Calculate the total XP required to reach a given Mark level.
 * Mark 1 = 0 XP (starting), Mark 2 = 100, Mark 3 = 300, Mark 4 = 700, etc.
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
 * Calculate XP needed for the next Mark from current Mark.
 */
export function getXPForNextMark(currentMark: number): number {
	return getMarkThreshold(currentMark + 1) - getMarkThreshold(currentMark);
}

/**
 * Check if an action is role-aligned for a given archetype.
 */
export function isRoleAligned(
	archetypeId: BotArchetypeId,
	action: XPActionType,
): boolean {
	const archetype = getBotArchetypeDefinition(archetypeId);
	const alignedActions = ROLE_ACTIONS[archetype.roleFamily];
	return alignedActions?.includes(action) ?? false;
}

/**
 * Calculate XP earned for an action, considering role alignment.
 */
export function calculateXPForAction(
	archetypeId: BotArchetypeId,
	action: XPActionType,
	bonusMultiplier = 1,
): number {
	const aligned = isRoleAligned(archetypeId, action);
	const multiplier = aligned ? 1 : OFF_ROLE_MULTIPLIER;
	return Math.floor(BASE_XP * multiplier * bonusMultiplier);
}

// ─── Unit XP Management ───────────────────────────────────────────────────────

/**
 * Initialize or get a unit's XP state.
 */
function ensureUnitXP(
	entityId: string,
	archetypeId: BotArchetypeId,
	currentMark = 1,
): UnitExperience {
	let xp = unitXP.get(entityId);
	if (!xp) {
		xp = {
			entityId,
			archetypeId,
			currentXP: 0,
			currentMark: Math.max(1, currentMark),
			xpToNextMark: getXPForNextMark(currentMark),
			upgradeEligible: false,
		};
		unitXP.set(entityId, xp);
	}
	return xp;
}

/**
 * Award XP to a unit for performing an action.
 * Returns the XP earned and whether the unit became upgrade-eligible.
 */
export function awardXP(
	entityId: string,
	archetypeId: BotArchetypeId,
	action: XPActionType,
	currentMark = 1,
	bonusMultiplier = 1,
): { xpEarned: number; upgradeEligible: boolean; newMark: number } {
	const xp = ensureUnitXP(entityId, archetypeId, currentMark);
	const earned = calculateXPForAction(archetypeId, action, bonusMultiplier);

	xp.currentXP += earned;

	// Check if Mark threshold reached
	const nextMarkThreshold = getMarkThreshold(xp.currentMark + 1);
	const totalXPForCurrentMark = getMarkThreshold(xp.currentMark);
	const xpSinceCurrentMark = xp.currentXP;

	if (xpSinceCurrentMark >= xp.xpToNextMark) {
		xp.upgradeEligible = true;
	}

	return {
		xpEarned: earned,
		upgradeEligible: xp.upgradeEligible,
		newMark: xp.currentMark,
	};
}

/**
 * Apply a Mark upgrade to a unit (consumes accumulated XP toward next Mark).
 * Returns false if the unit is not eligible.
 */
export function applyMarkUpgrade(entityId: string): boolean {
	const xp = unitXP.get(entityId);
	if (!xp || !xp.upgradeEligible) return false;

	// Carry over excess XP
	xp.currentXP -= xp.xpToNextMark;
	xp.currentMark++;
	xp.xpToNextMark = getXPForNextMark(xp.currentMark);
	xp.upgradeEligible = xp.currentXP >= xp.xpToNextMark;

	return true;
}

/**
 * Get a unit's XP state. Returns undefined if not tracked.
 */
export function getUnitExperience(entityId: string): UnitExperience | undefined {
	return unitXP.get(entityId);
}

/**
 * Get all tracked unit XP states.
 */
export function getAllUnitExperience(): readonly UnitExperience[] {
	return Array.from(unitXP.values());
}

/**
 * Get all units that are eligible for Mark upgrade.
 */
export function getUpgradeEligibleUnits(): readonly UnitExperience[] {
	return Array.from(unitXP.values()).filter((xp) => xp.upgradeEligible);
}

/**
 * Get XP progress as a fraction [0, 1] for UI display.
 */
export function getXPProgress(entityId: string): number {
	const xp = unitXP.get(entityId);
	if (!xp || xp.xpToNextMark === 0) return 0;
	return Math.min(1, xp.currentXP / xp.xpToNextMark);
}

/**
 * Rehydrate XP state from persisted data.
 */
export function rehydrateExperience(states: UnitExperience[]) {
	unitXP.clear();
	for (const state of states) {
		unitXP.set(state.entityId, { ...state });
	}
}

/**
 * Serialize XP state for persistence.
 */
export function serializeExperience(): UnitExperience[] {
	return Array.from(unitXP.values());
}

/**
 * Reset all XP state — call on new game.
 */
export function resetExperience() {
	unitXP.clear();
}
