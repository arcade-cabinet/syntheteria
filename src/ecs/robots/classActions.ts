/**
 * Per-class radial action definitions.
 *
 * Each robot class has a DISTINCT set of actions — this is what makes each
 * unit feel different to control. Actions are filtered by the radial menu
 * providers based on the selected unit's robotClass and staging state.
 *
 * Action prerequisites:
 *   - requiresStaging: unit must be staged (can't have moved this turn)
 *   - requiresAdjacent: target must be Manhattan distance <= 1
 *   - requiresEnemy: target must be a hostile unit
 *   - requiresFriendly: target must be a friendly unit
 *   - minRange / maxRange: attack range constraints
 *
 * Design reference: GAME_DESIGN.md §5 (unit actions) + task #45.
 */

import type { RobotClass } from "./types";
import { getSpecializedActions } from "./specializations/trackRegistry";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ActionCategory = "movement" | "combat" | "utility" | "economy";

export interface ClassActionDef {
	/** Unique action ID within the class. */
	readonly id: string;
	/** Display label in radial menu. */
	readonly label: string;
	/** Radial menu icon. */
	readonly icon: string;
	/** Radial menu tone (affects petal color). */
	readonly tone: string;
	/** Which category ring this belongs to. */
	readonly category: ActionCategory;
	/** AP cost to execute (0 = free / movement-only). */
	readonly apCost: number;
	/** Minimum attack/effect range (Manhattan distance). 0 = self. */
	readonly minRange: number;
	/** Maximum attack/effect range. 0 = self/tile-only. */
	readonly maxRange: number;
	/** Must the unit be staged to use this? */
	readonly requiresStaging: boolean;
	/** Must the target be adjacent (Manhattan <= 1)? */
	readonly requiresAdjacent: boolean;
	/** Must the target be a hostile unit? */
	readonly requiresEnemy: boolean;
	/** Must the target be a friendly unit/building? */
	readonly requiresFriendly: boolean;
	/** Cooldown in turns (0 = no cooldown). */
	readonly cooldown: number;
	/** Human-readable description for tooltip. */
	readonly description: string;
}

// ─── Per-Class Action Definitions ─────────────────────────────────────────────

const SCOUT_ACTIONS: readonly ClassActionDef[] = [
	{
		id: "move",
		label: "Move",
		icon: "\u2192",
		tone: "neutral",
		category: "movement",
		apCost: 0,
		minRange: 1,
		maxRange: 3,
		requiresStaging: false,
		requiresAdjacent: false,
		requiresEnemy: false,
		requiresFriendly: false,
		cooldown: 0,
		description: "Move to a reachable tile",
	},
	{
		id: "attack_melee",
		label: "Attack",
		icon: "\u2694",
		tone: "hostile",
		category: "combat",
		apCost: 1,
		minRange: 1,
		maxRange: 1,
		requiresStaging: false,
		requiresAdjacent: true,
		requiresEnemy: true,
		requiresFriendly: false,
		cooldown: 0,
		description: "Melee attack an adjacent enemy",
	},
	{
		id: "reveal",
		label: "Reveal",
		icon: "\uD83D\uDC41",
		tone: "neutral",
		category: "utility",
		apCost: 1,
		minRange: 0,
		maxRange: 0,
		requiresStaging: false,
		requiresAdjacent: false,
		requiresEnemy: false,
		requiresFriendly: false,
		cooldown: 0,
		description: "Reveal a large fog area around this unit",
	},
	{
		id: "signal",
		label: "Signal",
		icon: "\uD83D\uDCE1",
		tone: "neutral",
		category: "utility",
		apCost: 1,
		minRange: 1,
		maxRange: 4,
		requiresStaging: false,
		requiresAdjacent: false,
		requiresEnemy: true,
		requiresFriendly: false,
		cooldown: 2,
		description: "Mark a target for ranged units (+2 damage next attack)",
	},
];

const INFANTRY_ACTIONS: readonly ClassActionDef[] = [
	{
		id: "move",
		label: "Move",
		icon: "\u2192",
		tone: "neutral",
		category: "movement",
		apCost: 0,
		minRange: 1,
		maxRange: 2,
		requiresStaging: false,
		requiresAdjacent: false,
		requiresEnemy: false,
		requiresFriendly: false,
		cooldown: 0,
		description: "Move to a reachable tile",
	},
	{
		id: "attack_melee",
		label: "Attack",
		icon: "\u2694",
		tone: "hostile",
		category: "combat",
		apCost: 1,
		minRange: 1,
		maxRange: 1,
		requiresStaging: false,
		requiresAdjacent: true,
		requiresEnemy: true,
		requiresFriendly: false,
		cooldown: 0,
		description: "Melee attack an adjacent enemy",
	},
	{
		id: "fortify",
		label: "Fortify",
		icon: "\uD83D\uDEE1",
		tone: "neutral",
		category: "combat",
		apCost: 1,
		minRange: 0,
		maxRange: 0,
		requiresStaging: false,
		requiresAdjacent: false,
		requiresEnemy: false,
		requiresFriendly: false,
		cooldown: 0,
		description: "Increase defense by 2 until next turn",
	},
	{
		id: "guard",
		label: "Guard",
		icon: "\u2693",
		tone: "neutral",
		category: "combat",
		apCost: 1,
		minRange: 0,
		maxRange: 0,
		requiresStaging: false,
		requiresAdjacent: false,
		requiresEnemy: false,
		requiresFriendly: false,
		cooldown: 0,
		description: "Auto-counterattack adjacent enemies until next turn",
	},
];

const CAVALRY_ACTIONS: readonly ClassActionDef[] = [
	{
		id: "move",
		label: "Move",
		icon: "\u2192",
		tone: "neutral",
		category: "movement",
		apCost: 0,
		minRange: 1,
		maxRange: 2,
		requiresStaging: false,
		requiresAdjacent: false,
		requiresEnemy: false,
		requiresFriendly: false,
		cooldown: 0,
		description: "Move to a reachable tile",
	},
	{
		id: "charge",
		label: "Charge",
		icon: "\u26A1",
		tone: "hostile",
		category: "combat",
		apCost: 1,
		minRange: 2,
		maxRange: 3,
		requiresStaging: false,
		requiresAdjacent: false,
		requiresEnemy: true,
		requiresFriendly: false,
		cooldown: 0,
		description: "Move 2-3 tiles and attack in one action (+2 damage)",
	},
	{
		id: "retreat",
		label: "Retreat",
		icon: "\u2190",
		tone: "neutral",
		category: "movement",
		apCost: 0,
		minRange: 1,
		maxRange: 2,
		requiresStaging: false,
		requiresAdjacent: false,
		requiresEnemy: false,
		requiresFriendly: false,
		cooldown: 0,
		description: "Disengage without triggering counterattack",
	},
	{
		id: "flank",
		label: "Flank",
		icon: "\u21B7",
		tone: "hostile",
		category: "combat",
		apCost: 1,
		minRange: 1,
		maxRange: 1,
		requiresStaging: false,
		requiresAdjacent: true,
		requiresEnemy: true,
		requiresFriendly: false,
		cooldown: 0,
		description: "Bonus damage from behind (+3 damage if flanking)",
	},
];

const RANGED_ACTIONS: readonly ClassActionDef[] = [
	{
		id: "stage",
		label: "Stage",
		icon: "\u23F9",
		tone: "neutral",
		category: "movement",
		apCost: 0,
		minRange: 0,
		maxRange: 0,
		requiresStaging: false,
		requiresAdjacent: false,
		requiresEnemy: false,
		requiresFriendly: false,
		cooldown: 0,
		description: "Plant feet and prepare for ranged actions",
	},
	{
		id: "attack_ranged",
		label: "Attack",
		icon: "\uD83C\uDFF9",
		tone: "hostile",
		category: "combat",
		apCost: 1,
		minRange: 2,
		maxRange: 4,
		requiresStaging: true,
		requiresAdjacent: false,
		requiresEnemy: true,
		requiresFriendly: false,
		cooldown: 0,
		description: "Ranged attack (2-4 range, requires staging)",
	},
	{
		id: "overwatch",
		label: "Overwatch",
		icon: "\uD83D\uDD2D",
		tone: "hostile",
		category: "combat",
		apCost: 1,
		minRange: 0,
		maxRange: 0,
		requiresStaging: true,
		requiresAdjacent: false,
		requiresEnemy: false,
		requiresFriendly: false,
		cooldown: 0,
		description: "Auto-fire at first enemy entering range next turn",
	},
	{
		id: "relocate",
		label: "Relocate",
		icon: "\u21C4",
		tone: "neutral",
		category: "movement",
		apCost: 0,
		minRange: 1,
		maxRange: 1,
		requiresStaging: true,
		requiresAdjacent: false,
		requiresEnemy: false,
		requiresFriendly: false,
		cooldown: 0,
		description: "Move 1 tile without un-staging",
	},
];

const SUPPORT_ACTIONS: readonly ClassActionDef[] = [
	{
		id: "stage",
		label: "Stage",
		icon: "\u23F9",
		tone: "neutral",
		category: "movement",
		apCost: 0,
		minRange: 0,
		maxRange: 0,
		requiresStaging: false,
		requiresAdjacent: false,
		requiresEnemy: false,
		requiresFriendly: false,
		cooldown: 0,
		description: "Set up for support actions",
	},
	{
		id: "hack",
		label: "Hack",
		icon: "\uD83D\uDD13",
		tone: "hostile",
		category: "utility",
		apCost: 1,
		minRange: 1,
		maxRange: 3,
		requiresStaging: true,
		requiresAdjacent: false,
		requiresEnemy: true,
		requiresFriendly: false,
		cooldown: 0,
		description: "Start hacking an enemy building or unit",
	},
	{
		id: "repair",
		label: "Repair",
		icon: "\uD83D\uDD27",
		tone: "neutral",
		category: "utility",
		apCost: 1,
		minRange: 1,
		maxRange: 1,
		requiresStaging: true,
		requiresAdjacent: true,
		requiresEnemy: false,
		requiresFriendly: true,
		cooldown: 0,
		description: "Restore HP to an adjacent friendly unit",
	},
	{
		id: "buff",
		label: "Buff",
		icon: "\u2B06",
		tone: "neutral",
		category: "utility",
		apCost: 1,
		minRange: 1,
		maxRange: 1,
		requiresStaging: true,
		requiresAdjacent: true,
		requiresEnemy: false,
		requiresFriendly: true,
		cooldown: 2,
		description: "Boost adjacent friendly stats for 2 turns",
	},
	{
		id: "deploy_beacon",
		label: "Deploy Beacon",
		icon: "\uD83D\uDCE1",
		tone: "neutral",
		category: "utility",
		apCost: 1,
		minRange: 0,
		maxRange: 0,
		requiresStaging: true,
		requiresAdjacent: false,
		requiresEnemy: false,
		requiresFriendly: false,
		cooldown: 3,
		description: "Create scan range extension at current tile",
	},
];

const WORKER_ACTIONS: readonly ClassActionDef[] = [
	{
		id: "stage",
		label: "Stage",
		icon: "\u23F9",
		tone: "neutral",
		category: "movement",
		apCost: 0,
		minRange: 0,
		maxRange: 0,
		requiresStaging: false,
		requiresAdjacent: false,
		requiresEnemy: false,
		requiresFriendly: false,
		cooldown: 0,
		description: "Set up for work actions",
	},
	{
		id: "harvest",
		label: "Harvest",
		icon: "\u26CF",
		tone: "harvest",
		category: "economy",
		apCost: 1,
		minRange: 1,
		maxRange: 1,
		requiresStaging: true,
		requiresAdjacent: true,
		requiresEnemy: false,
		requiresFriendly: false,
		cooldown: 0,
		description: "Salvage resources from adjacent deposit",
	},
	{
		id: "build",
		label: "Build",
		icon: "\uD83D\uDD27",
		tone: "construct",
		category: "economy",
		apCost: 1,
		minRange: 1,
		maxRange: 1,
		requiresStaging: true,
		requiresAdjacent: true,
		requiresEnemy: false,
		requiresFriendly: false,
		cooldown: 0,
		description: "Place a building on adjacent tile",
	},
	{
		id: "salvage",
		label: "Salvage",
		icon: "\u267B",
		tone: "harvest",
		category: "economy",
		apCost: 1,
		minRange: 1,
		maxRange: 1,
		requiresStaging: true,
		requiresAdjacent: true,
		requiresEnemy: false,
		requiresFriendly: true,
		cooldown: 0,
		description: "Dismantle own building for partial resource refund",
	},
	{
		id: "mine",
		label: "Mine",
		icon: "\u26CF",
		tone: "harvest",
		category: "economy",
		apCost: 1,
		minRange: 0,
		maxRange: 1,
		requiresStaging: true,
		requiresAdjacent: true,
		requiresEnemy: false,
		requiresFriendly: false,
		cooldown: 0,
		description: "Strip-mine the floor for basic materials (backstop economy)",
	},
	{
		id: "prospect",
		label: "Prospect",
		icon: "\uD83D\uDD0D",
		tone: "neutral",
		category: "utility",
		apCost: 1,
		minRange: 0,
		maxRange: 0,
		requiresStaging: true,
		requiresAdjacent: false,
		requiresEnemy: false,
		requiresFriendly: false,
		cooldown: 0,
		description: "Reveal resource deposits on adjacent tiles",
	},
];

// ─── Class Action Map ─────────────────────────────────────────────────────────

/**
 * Per-class action definitions. Each player robot class has a unique set
 * of actions that defines its gameplay identity.
 *
 * Cult classes use a subset of their faction-bot counterparts.
 */
export const CLASS_ACTIONS: Readonly<Record<RobotClass, readonly ClassActionDef[]>> = {
	scout: SCOUT_ACTIONS,
	infantry: INFANTRY_ACTIONS,
	cavalry: CAVALRY_ACTIONS,
	ranged: RANGED_ACTIONS,
	support: SUPPORT_ACTIONS,
	worker: WORKER_ACTIONS,
	// Cult mechs — simplified action sets
	cult_infantry: [INFANTRY_ACTIONS[0]!, INFANTRY_ACTIONS[1]!], // Move + Attack
	cult_ranged: [RANGED_ACTIONS[0]!, RANGED_ACTIONS[1]!],       // Stage + Attack
	cult_cavalry: [CAVALRY_ACTIONS[0]!, CAVALRY_ACTIONS[1]!],    // Move + Charge
};

// ─── Query helpers ────────────────────────────────────────────────────────────

/**
 * Get all action definitions for a robot class.
 */
export function getClassActions(robotClass: RobotClass): readonly ClassActionDef[] {
	return CLASS_ACTIONS[robotClass];
}

/**
 * Get a specific action by ID for a robot class. Returns undefined if not found.
 */
export function getClassAction(robotClass: RobotClass, actionId: string): ClassActionDef | undefined {
	return CLASS_ACTIONS[robotClass].find(a => a.id === actionId);
}

/**
 * Check if a robot class has a specific action.
 */
export function hasClassAction(robotClass: RobotClass, actionId: string): boolean {
	return CLASS_ACTIONS[robotClass].some(a => a.id === actionId);
}

/**
 * Get actions filtered by category for a robot class.
 */
export function getClassActionsByCategory(
	robotClass: RobotClass,
	category: ActionCategory,
): readonly ClassActionDef[] {
	return CLASS_ACTIONS[robotClass].filter(a => a.category === category);
}

/**
 * Get all actions for a unit including its specialization track actions.
 * Base class actions + track-specific actions (if specialized).
 */
export function getActionsForUnit(
	robotClass: RobotClass,
	trackId: string,
): readonly ClassActionDef[] {
	const base = CLASS_ACTIONS[robotClass];
	if (!trackId) return base;

	const trackActions = getSpecializedActions(trackId);
	if (trackActions.length === 0) return base;

	// Deduplicate by action id (track actions override base if same id)
	const seen = new Set<string>();
	const merged: ClassActionDef[] = [];
	for (const a of trackActions) {
		seen.add(a.id);
		merged.push(a);
	}
	for (const a of base) {
		if (!seen.has(a.id)) merged.push(a);
	}
	return merged;
}

/**
 * Check if a unit can use a specific action given its current state.
 * Does NOT check target validity — only unit-side prerequisites.
 */
export function canUseAction(
	actionDef: ClassActionDef,
	unitState: { ap: number; staged: boolean },
): { canUse: boolean; reason?: string } {
	// AP check (stage actions are free)
	if (actionDef.apCost > 0 && unitState.ap < actionDef.apCost) {
		return { canUse: false, reason: "Not enough AP" };
	}

	// Staging check
	if (actionDef.requiresStaging && !unitState.staged) {
		return { canUse: false, reason: "Must stage first" };
	}

	return { canUse: true };
}
