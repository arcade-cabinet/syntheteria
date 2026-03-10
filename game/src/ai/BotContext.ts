/**
 * BotContext — world perception snapshot for a single bot.
 *
 * Each frame the BotBrainSystem builds a BotContext for every bot entity.
 * The BotBrain FSM reads this context to decide state transitions without
 * needing direct access to the ECS world. This keeps the FSM pure and testable.
 *
 * Perception is bounded by the bot's detection range (from config) so bots
 * only react to things they can plausibly "see".
 */

import type { Vec3 } from "../ecs/types.ts";
import type { BotOrder } from "./BotOrders.ts";

// ---------------------------------------------------------------------------
// Nearby entity summary
// ---------------------------------------------------------------------------

/** Minimal info about a nearby entity, projected into the bot's perception. */
export interface NearbyEntity {
	/** Entity ID for targeting / following. */
	id: string;
	/** World-space position of the entity. */
	position: Vec3;
	/** Squared distance from the bot (avoids sqrt each frame). */
	distanceSq: number;
	/** Faction of the entity. */
	faction: string;
}

// ---------------------------------------------------------------------------
// Component health summary
// ---------------------------------------------------------------------------

/** Summary of a bot's own component status. */
export interface ComponentStatus {
	/** Total number of components on this bot. */
	total: number;
	/** Number of functional (non-broken) components. */
	functional: number;
	/** Ratio of functional components to total (0..1). */
	healthRatio: number;
	/** Whether the bot has at least one functional "arms" component. */
	hasArms: boolean;
	/** Whether the bot has at least one functional "camera" component. */
	hasCamera: boolean;
	/** Whether the bot has at least one functional "legs" component. */
	hasLegs: boolean;
}

// ---------------------------------------------------------------------------
// BotContext
// ---------------------------------------------------------------------------

/**
 * Complete perception snapshot for one bot, built each frame.
 *
 * All distances are pre-computed as squared values to avoid sqrt per frame.
 * Nearby lists are sorted by distanceSq ascending (closest first).
 */
export interface BotContext {
	/** This bot's entity ID. */
	entityId: string;

	/** This bot's current world position. */
	position: Vec3;

	/** This bot's faction. */
	faction: string;

	// --- Perception ---

	/** Hostile entities within detection range, sorted closest-first. */
	nearbyEnemies: NearbyEntity[];

	/** Friendly entities within detection range, sorted closest-first. */
	nearbyAllies: NearbyEntity[];

	// --- Self status ---

	/** Summary of this bot's component health. */
	components: ComponentStatus;

	// --- Strategic ---

	/** Home base position (faction spawn or nearest friendly building). */
	homeBase: Vec3 | null;

	/** Current order from the governor, if any. */
	currentOrder: BotOrder | null;

	// --- Config thresholds (from enemies.json / combat.json) ---

	/** Squared aggro range — enemies closer than this trigger ATTACK. */
	aggroRangeSq: number;

	/** Squared patrol range — max distance from patrol center. */
	patrolRangeSq: number;

	/** Melee attack range from combat config. */
	meleeRange: number;

	/** Health ratio below which the bot should flee (0..1). */
	fleeThreshold: number;

	/** Squared distance considered "safe" for ending flee state. */
	safeDistanceSq: number;
}

/**
 * Compute squared distance between two Vec3 positions on the XZ plane.
 * Y is ignored since bots move on a 2D terrain surface.
 */
export function distanceSqXZ(a: Vec3, b: Vec3): number {
	const dx = a.x - b.x;
	const dz = a.z - b.z;
	return dx * dx + dz * dz;
}

/**
 * Build a ComponentStatus summary from a list of UnitComponents.
 */
export function summarizeComponents(
	components: ReadonlyArray<{ name: string; functional: boolean }>,
): ComponentStatus {
	const total = components.length;
	const functional = components.filter((c) => c.functional).length;

	return {
		total,
		functional,
		healthRatio: total > 0 ? functional / total : 0,
		hasArms: components.some((c) => c.name === "arms" && c.functional),
		hasCamera: components.some((c) => c.name === "camera" && c.functional),
		hasLegs: components.some((c) => c.name === "legs" && c.functional),
	};
}
