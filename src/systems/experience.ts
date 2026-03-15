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

import { getBotArchetypeDefinition } from "../bots/archetypes";
import type { BotArchetypeId, BotRoleFamily } from "../bots/types";
import type { Entity } from "../ecs/traits";
import { Experience, Identity, Unit } from "../ecs/traits";
import { units } from "../ecs/world";

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

// ─── Entity lookup ────────────────────────────────────────────────────────────

function findUnitById(id: string): Entity | null {
	for (const e of units) {
		if (e.get(Identity)?.id === id) return e;
	}
	return null;
}

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
 * Build a UnitExperience view from a Koota entity's Experience trait.
 */
function buildUnitExperience(
	entity: Entity,
	archetypeId: BotArchetypeId,
): UnitExperience {
	const trait = entity.get(Experience)!;
	const xpToNextMark = getXPForNextMark(trait.level);
	return {
		entityId: entity.get(Identity)!.id,
		archetypeId,
		currentXP: trait.xp,
		currentMark: trait.level,
		xpToNextMark,
		upgradeEligible: trait.xp >= xpToNextMark,
	};
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
	const entity = findUnitById(entityId);
	const earned = calculateXPForAction(archetypeId, action, bonusMultiplier);

	if (!entity) {
		// Entity not yet in Koota world (e.g. test setup) — no-op
		return { xpEarned: earned, upgradeEligible: false, newMark: currentMark };
	}

	const cur = entity.get(Experience);
	if (!cur) {
		return { xpEarned: earned, upgradeEligible: false, newMark: currentMark };
	}

	const newXp = cur.xp + earned;
	const newLevel = cur.level > 0 ? cur.level : Math.max(1, currentMark);
	entity.set(Experience, { ...cur, xp: newXp, level: newLevel });

	const xpToNextMark = getXPForNextMark(newLevel);
	const upgradeEligible = newXp >= xpToNextMark;

	return { xpEarned: earned, upgradeEligible, newMark: newLevel };
}

/**
 * Apply a Mark upgrade to a unit (consumes accumulated XP toward next Mark).
 * Returns false if the unit is not eligible.
 */
export function applyMarkUpgrade(entityId: string): boolean {
	const entity = findUnitById(entityId);
	if (!entity) return false;

	const cur = entity.get(Experience);
	if (!cur) return false;

	const xpToNextMark = getXPForNextMark(cur.level);
	if (cur.xp < xpToNextMark) return false;

	entity.set(Experience, {
		...cur,
		xp: cur.xp - xpToNextMark,
		level: cur.level + 1,
	});

	return true;
}

/**
 * Get a unit's XP state. Returns undefined if not tracked.
 */
export function getUnitExperience(
	entityId: string,
): UnitExperience | undefined {
	const entity = findUnitById(entityId);
	if (!entity) return undefined;

	const trait = entity.get(Experience);
	if (!trait) return undefined;

	const archetypeId = (entity.get(Unit)?.archetypeId ??
		"field_technician") as BotArchetypeId;
	return buildUnitExperience(entity, archetypeId);
}

/**
 * Get all tracked unit XP states.
 */
export function getAllUnitExperience(): readonly UnitExperience[] {
	const result: UnitExperience[] = [];
	for (const entity of units) {
		const trait = entity.get(Experience);
		if (!trait) continue;
		const archetypeId = (entity.get(Unit)?.archetypeId ??
			"field_technician") as BotArchetypeId;
		result.push(buildUnitExperience(entity, archetypeId));
	}
	return result;
}

/**
 * Get all units that are eligible for Mark upgrade.
 */
export function getUpgradeEligibleUnits(): readonly UnitExperience[] {
	return getAllUnitExperience().filter((xp) => xp.upgradeEligible);
}

/**
 * Get XP progress as a fraction [0, 1] for UI display.
 */
export function getXPProgress(entityId: string): number {
	const entity = findUnitById(entityId);
	if (!entity) return 0;

	const trait = entity.get(Experience);
	if (!trait) return 0;

	const xpToNextMark = getXPForNextMark(trait.level);
	if (xpToNextMark === 0) return 0;
	return Math.min(1, trait.xp / xpToNextMark);
}

/**
 * Rehydrate XP state from persisted data.
 * Sets Experience trait on unit entities by matching entityId.
 */
export function rehydrateExperience(states: UnitExperience[]) {
	for (const state of states) {
		const entity = findUnitById(state.entityId);
		if (!entity) continue;
		const cur = entity.get(Experience);
		if (!cur) continue;
		entity.set(Experience, {
			...cur,
			xp: state.currentXP,
			level: state.currentMark,
		});
	}
}

/**
 * Serialize XP state for persistence.
 */
export function serializeExperience(): UnitExperience[] {
	return getAllUnitExperience() as UnitExperience[];
}

/**
 * Reset all XP state — call on new game.
 * Resets Experience trait on all unit entities to defaults.
 */
export function resetExperience() {
	for (const entity of units) {
		const cur = entity.get(Experience);
		if (!cur) continue;
		entity.set(Experience, {
			...cur,
			xp: 0,
			level: 1,
			killCount: 0,
			harvestCount: 0,
		});
	}
}
