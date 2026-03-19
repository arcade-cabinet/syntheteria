/**
 * Hacking system types and role definitions.
 *
 * Ported from pending/systems/hacking.ts — pure data definitions for the
 * Volt Collective's signature ability. The full hacking system loop
 * (compute, signal, multi-turn progress) is deferred to a separate task.
 *
 * When a bot is captured via hacking, its combat role is determined by its
 * robot class. Each class has specialized captured capabilities.
 */

import type { RobotClass } from "../robots/types";

// ─── Constants ────────────────────────────────────────────────────────────────

/** AP cost per hacking action (per turn of hacking). */
export const HACKING_AP_COST = 1;

/** Manhattan distance required for hacking (tile distance). */
export const HACKING_RANGE = 3;

/** Base difficulty for hacking (progress = computeCost / difficulty per tick). */
export const HACKING_BASE_DIFFICULTY = 10;

// ─── Hacked Bot Roles ────────────────────────────────────────────────────────

export interface HackedBotRole {
	/** Display label for the captured role. */
	label: string;
	/** Combat style. */
	combatStyle: "melee" | "ranged" | "siege";
	/** Attack range in tiles. */
	attackRange: number;
	/** Damage multiplier against structures (1.0 = normal). */
	structureDamageMultiplier: number;
	/** AP modifier (1.0 = normal). */
	apModifier: number;
}

const HACKED_ROLES: Partial<Record<RobotClass, HackedBotRole>> = {
	cult_infantry: {
		label: "Reclaimed Trooper",
		combatStyle: "melee",
		attackRange: 1,
		structureDamageMultiplier: 1.0,
		apModifier: 1.0,
	},
	cult_ranged: {
		label: "Reclaimed Gunner",
		combatStyle: "ranged",
		attackRange: 2,
		structureDamageMultiplier: 1.0,
		apModifier: 1.0,
	},
	cult_cavalry: {
		label: "Reclaimed Striker",
		combatStyle: "melee",
		attackRange: 1,
		structureDamageMultiplier: 1.0,
		apModifier: 1.3,
	},
	infantry: {
		label: "Reclaimed Infantry",
		combatStyle: "melee",
		attackRange: 1,
		structureDamageMultiplier: 1.0,
		apModifier: 1.0,
	},
	ranged: {
		label: "Reclaimed Guard",
		combatStyle: "ranged",
		attackRange: 2,
		structureDamageMultiplier: 1.0,
		apModifier: 1.0,
	},
	cavalry: {
		label: "Reclaimed Cavalry",
		combatStyle: "melee",
		attackRange: 1,
		structureDamageMultiplier: 1.0,
		apModifier: 1.2,
	},
};

/** Default role for classes without a specialized hacked role. */
const DEFAULT_HACKED_ROLE: HackedBotRole = {
	label: "Reclaimed Unit",
	combatStyle: "melee",
	attackRange: 1,
	structureDamageMultiplier: 1.0,
	apModifier: 1.0,
};

/** Get the hacked bot role for a given robot class. */
export function getHackedBotRole(robotClass: RobotClass): HackedBotRole {
	return HACKED_ROLES[robotClass] ?? DEFAULT_HACKED_ROLE;
}
