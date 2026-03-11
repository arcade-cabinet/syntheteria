/**
 * PhoneHome — idle bot finds nearest Base and gets a task from its work queue.
 *
 * When a bot has no active task (BotBrain state is IDLE or PHONE_HOME),
 * it "phones home" to the nearest Base settlement. The Base's work queue
 * always has tasks (harvest, transport, build, patrol), so the bot is
 * guaranteed to receive work. NO BOT EVER IDLES.
 *
 * Fallback chain:
 *   Governor → Base Agent → Bot Brain → Phone Home → Base → guaranteed task
 *
 * This module converts BaseWorkQueue tasks into BotOrders that the
 * BotBrain FSM can execute.
 */

import type { Vec3 } from "../../ecs/types.ts";
import type { BotOrder } from "../BotOrders.ts";
import { BotOrderType } from "../BotOrders.ts";
import type { BaseAgent } from "./BaseAgent.ts";
import { TaskCategory, type WorkTask } from "./BaseWorkQueue.ts";

// ---------------------------------------------------------------------------
// Find nearest base
// ---------------------------------------------------------------------------

/**
 * Find the nearest BaseAgent to the given position.
 * Uses squared XZ distance (ignoring Y) for efficiency.
 *
 * @param botPosition - Bot's current world position
 * @param bases - All BaseAgent instances for this faction
 * @returns Nearest BaseAgent, or null if no bases exist
 */
export function findNearestBase(
	botPosition: Vec3,
	bases: readonly BaseAgent[],
): BaseAgent | null {
	if (bases.length === 0) return null;

	let nearest: BaseAgent | null = null;
	let nearestDistSq = Infinity;

	for (const base of bases) {
		const dx = botPosition.x - base.position.x;
		const dz = botPosition.z - base.position.z;
		const distSq = dx * dx + dz * dz;

		if (distSq < nearestDistSq) {
			nearestDistSq = distSq;
			nearest = base;
		}
	}

	return nearest;
}

// ---------------------------------------------------------------------------
// Phone home — claim task and convert to BotOrder
// ---------------------------------------------------------------------------

/**
 * Phone home: find the nearest Base, claim a task, and convert it to a BotOrder.
 *
 * @param botId - The bot requesting work
 * @param botPosition - Bot's current world position
 * @param bases - All BaseAgent instances for this faction
 * @returns A BotOrder the bot can execute, or null if bot already has work
 */
export function phoneHome(
	botId: string,
	botPosition: Vec3,
	bases: readonly BaseAgent[],
): BotOrder | null {
	// No bases — return to origin as last resort
	if (bases.length === 0) {
		return { type: BotOrderType.RETURN_TO_BASE };
	}

	const base = findNearestBase(botPosition, bases);
	if (!base) {
		return { type: BotOrderType.RETURN_TO_BASE };
	}

	// Claim the highest-priority task from the base's work queue
	const task = base.workQueue.claim(botId);
	if (!task) {
		// Bot already has a claimed task or queue is somehow empty
		return null;
	}

	return taskToOrder(task, base);
}

// ---------------------------------------------------------------------------
// Task → BotOrder conversion
// ---------------------------------------------------------------------------

/**
 * Convert a WorkTask from the Base's queue into a BotOrder.
 * Maps each task category to the appropriate BotOrder type.
 */
function taskToOrder(task: WorkTask, base: BaseAgent): BotOrder {
	switch (task.category) {
		case TaskCategory.HARVEST:
			return {
				type: BotOrderType.GATHER_RESOURCES,
				depositId: task.targetId ?? task.id,
			};

		case TaskCategory.TRANSPORT:
			// Transport to the base position (furnace/stockpile)
			return {
				type: BotOrderType.GATHER_RESOURCES,
				depositId: task.targetId ?? task.id,
			};

		case TaskCategory.BUILD:
			// Move to build site — guard position until construction complete
			return {
				type: BotOrderType.GUARD_POSITION,
				position: task.position,
				radius: 5,
			};

		case TaskCategory.PATROL:
			return {
				type: BotOrderType.PATROL_AREA,
				center: task.position,
				radius: (task.data?.patrolRadius as number) ?? 15,
			};

		case TaskCategory.DEFENSE:
			if (task.targetId) {
				return {
					type: BotOrderType.ATTACK_TARGET,
					targetId: task.targetId,
				};
			}
			// No specific target — guard the base
			return {
				type: BotOrderType.GUARD_POSITION,
				position: base.position,
				radius: 10,
			};

		default:
			// Fallback — patrol around the base
			return {
				type: BotOrderType.PATROL_AREA,
				center: base.position,
				radius: 15,
			};
	}
}
