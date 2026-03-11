/**
 * BotBrainSystem — connects BotBrain FSM output to Yuka Vehicle steering.
 *
 * Each bot entity that should be AI-controlled has:
 *   - A BotBrain (FSM for tactical decisions)
 *   - A BotSteeringAPI (Yuka Vehicle + behaviors)
 *
 * Each frame this system:
 *   1. Calls brain.update(delta, ctx) → SteeringOutput
 *   2. Translates SteeringOutput.command → activateSeek/arrive/flee/wander/stop
 *   3. Passes the target position to the activated behavior
 *
 * This system is the critical glue between tactical AI and physical movement.
 * It does NOT own Vehicles — those are created by useBotSteering() in R3F
 * components, or manually via createBotVehicle() in tests. This system only
 * issues commands to whatever BotSteeringAPI it's given.
 *
 * Usage:
 * ```ts
 * // Register a bot on spawn
 * registerBot("bot-1", brain, steeringApi);
 *
 * // Each frame (from useFrame or a game loop):
 * tickBotBrains(delta, (botId) => buildBotContext(botId));
 *
 * // Unregister on despawn
 * unregisterBot("bot-1");
 * ```
 */

import { BotBrain, SteeringCommand } from "./BotBrain.ts";
import type { SteeringOutput } from "./BotBrain.ts";
import type { BotContext } from "./BotContext.ts";
import {
	activateArrive,
	activateFlee,
	activateSeek,
	activateWander,
	stopAll,
} from "./SteeringBehaviors.ts";
import type { BotBehaviors } from "./SteeringBehaviors.ts";

// ---------------------------------------------------------------------------
// Registration types
// ---------------------------------------------------------------------------

/**
 * A registered bot entry: brain + steering handles.
 * The system holds both so it can call update() and activate behaviors.
 */
export interface BotBrainEntry {
	/** Bot entity ID (for lookup and debugging) */
	botId: string;

	/** The BotBrain FSM for this bot */
	brain: BotBrain;

	/**
	 * The bot's steering API. We use BotBehaviors directly (from SteeringBehaviors.ts)
	 * because BotSteeringAPI in useBotSteering.ts has R3F dependencies we want to
	 * avoid in pure logic systems. Callers may pass a BotBehaviors from
	 * attachBehaviors(), or wrap a BotSteeringAPI.
	 */
	behaviors: BotBehaviors;
}

// ---------------------------------------------------------------------------
// Module-level registry
// ---------------------------------------------------------------------------

/** Active bot brains, keyed by entity ID. */
const botRegistry = new Map<string, BotBrainEntry>();

// ---------------------------------------------------------------------------
// Registration API
// ---------------------------------------------------------------------------

/**
 * Register a bot for brain + steering updates.
 *
 * @param botId    - Unique entity ID.
 * @param brain    - BotBrain FSM instance for this bot.
 * @param behaviors - Yuka steering behaviors from attachBehaviors().
 */
export function registerBotBrain(
	botId: string,
	brain: BotBrain,
	behaviors: BotBehaviors,
): void {
	botRegistry.set(botId, { botId, brain, behaviors });
}

/**
 * Unregister a bot (despawn / entity removal).
 * Stops all behaviors before removing.
 */
export function unregisterBotBrain(botId: string): void {
	const entry = botRegistry.get(botId);
	if (entry) {
		stopAll(entry.behaviors);
	}
	botRegistry.delete(botId);
}

/**
 * Check whether a bot is currently registered.
 */
export function isBotBrainRegistered(botId: string): boolean {
	return botRegistry.has(botId);
}

/**
 * Get the brain for a bot (for debug UI / testing).
 */
export function getBotBrain(botId: string): BotBrain | null {
	return botRegistry.get(botId)?.brain ?? null;
}

/**
 * Get the number of currently registered bots.
 */
export function getRegisteredBotCount(): number {
	return botRegistry.size;
}

// ---------------------------------------------------------------------------
// Steering translation
// ---------------------------------------------------------------------------

/**
 * Apply a SteeringOutput to a bot's behaviors.
 * Translates the BotBrain command enum into concrete Yuka behavior activation.
 *
 * @param behaviors - The bot's behavior handles from attachBehaviors().
 * @param output    - The steering command from BotBrain.update().
 */
export function applySteeringOutput(
	behaviors: BotBehaviors,
	output: SteeringOutput,
): void {
	const { command, target } = output;

	switch (command) {
		case SteeringCommand.SEEK:
			if (target) {
				activateSeek(behaviors, target);
			} else {
				// SEEK with no target — wander as fallback
				activateWander(behaviors);
			}
			break;

		case SteeringCommand.ARRIVE:
			if (target) {
				activateArrive(behaviors, target);
			} else {
				stopAll(behaviors);
			}
			break;

		case SteeringCommand.FLEE:
			if (target) {
				activateFlee(behaviors, target);
			} else {
				// FLEE with no known threat — wander to escape
				activateWander(behaviors);
			}
			break;

		case SteeringCommand.WANDER:
			activateWander(behaviors);
			break;

		case SteeringCommand.STOP:
		default:
			stopAll(behaviors);
			break;
	}
}

// ---------------------------------------------------------------------------
// System tick
// ---------------------------------------------------------------------------

/**
 * Tick all registered bot brains for the given frame delta.
 *
 * For each registered bot:
 *   1. Calls contextBuilder to get the bot's current perception snapshot.
 *   2. Calls brain.update(delta, ctx) to get the steering command.
 *   3. Calls applySteeringOutput to activate the right Yuka behavior.
 *
 * @param delta          - Frame time in seconds.
 * @param contextBuilder - Factory function that builds a BotContext for the given botId.
 *                         Called once per bot per frame. Return null to skip (e.g., bot
 *                         is currently in a cutscene or has no valid perception data).
 */
export function tickBotBrains(
	delta: number,
	contextBuilder: (botId: string) => BotContext | null,
): void {
	for (const entry of botRegistry.values()) {
		const ctx = contextBuilder(entry.botId);
		if (!ctx) continue;

		const output = entry.brain.update(delta, ctx);
		applySteeringOutput(entry.behaviors, output);
	}
}

// ---------------------------------------------------------------------------
// Reset (for tests and game restart)
// ---------------------------------------------------------------------------

/**
 * Clear all registered bots. Call on game restart.
 */
export function resetBotBrainSystem(): void {
	// Stop all behaviors before clearing
	for (const entry of botRegistry.values()) {
		stopAll(entry.behaviors);
	}
	botRegistry.clear();
}
