/**
 * Bot command system — issues and manages orders for player-controlled bots.
 *
 * Bots can receive commands: harvest, build, patrol, guard, follow, carry, idle.
 * Each bot has one active command at a time. Commands queue state transitions
 * that other systems (harvesting, building, combat) read and execute.
 *
 * Tunables sourced from config/botMovement.json (automation section)
 * and config/botAutomation.json.
 */

import { config } from "../../config";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CommandType =
	| "idle"
	| "harvest"
	| "build"
	| "patrol"
	| "guard"
	| "follow"
	| "carry"
	| "attack";

export interface CommandTarget {
	entityId?: string;
	position?: { x: number; z: number };
	/** For patrol: list of waypoints */
	waypoints?: { x: number; z: number }[];
	/** For harvest: deposit ID */
	depositId?: string;
	/** For build: building type */
	buildingType?: string;
	/** For carry: cube ID */
	cubeId?: string;
}

export interface BotCommand {
	type: CommandType;
	target: CommandTarget;
	issuedTick: number;
	/** For patrol: current waypoint index */
	waypointIndex: number;
}

export interface BotCommandState {
	botId: string;
	faction: string;
	command: BotCommand;
	/** Bot position for distance checks */
	x: number;
	z: number;
}

export interface CommandEvent {
	botId: string;
	previousCommand: CommandType;
	newCommand: CommandType;
	tick: number;
}

// ---------------------------------------------------------------------------
// Config references
// ---------------------------------------------------------------------------

const automationCfg = config.botMovement.automation;
const GUARD_RANGE = automationCfg.guardRange;
const FOLLOW_DISTANCE = automationCfg.followDistance;
const WAYPOINT_REACH_THRESHOLD = automationCfg.waypointReachThreshold;

// ---------------------------------------------------------------------------
// Module-level state
// ---------------------------------------------------------------------------

const botStates = new Map<string, BotCommandState>();
let commandEvents: CommandEvent[] = [];
let currentTick = 0;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function dist2d(
	x1: number,
	z1: number,
	x2: number,
	z2: number,
): number {
	const dx = x1 - x2;
	const dz = z1 - z2;
	return Math.sqrt(dx * dx + dz * dz);
}

// ---------------------------------------------------------------------------
// Public API — Registration
// ---------------------------------------------------------------------------

/**
 * Register a bot in the command system. Starts with idle command.
 */
export function registerBot(
	botId: string,
	faction: string,
	x: number,
	z: number,
): void {
	botStates.set(botId, {
		botId,
		faction,
		command: {
			type: "idle",
			target: {},
			issuedTick: currentTick,
			waypointIndex: 0,
		},
		x,
		z,
	});
}

/**
 * Unregister a bot (destroyed or despawned).
 */
export function unregisterBot(botId: string): void {
	botStates.delete(botId);
}

/**
 * Update a bot's position. Called by movement systems.
 */
export function updateBotPosition(
	botId: string,
	x: number,
	z: number,
): void {
	const state = botStates.get(botId);
	if (state) {
		state.x = x;
		state.z = z;
	}
}

// ---------------------------------------------------------------------------
// Public API — Commands
// ---------------------------------------------------------------------------

/**
 * Issue a command to a bot. Replaces any current command.
 * Returns true if the command was accepted.
 */
export function issueCommand(
	botId: string,
	type: CommandType,
	target: CommandTarget = {},
): boolean {
	const state = botStates.get(botId);
	if (!state) return false;

	// Validate patrol requires waypoints
	if (type === "patrol" && (!target.waypoints || target.waypoints.length === 0)) {
		return false;
	}

	// Validate guard/follow requires a target position or entity
	if (
		(type === "guard" || type === "follow") &&
		!target.position &&
		!target.entityId
	) {
		return false;
	}

	// Validate harvest requires a deposit
	if (type === "harvest" && !target.depositId) {
		return false;
	}

	// Validate carry requires a cube
	if (type === "carry" && !target.cubeId) {
		return false;
	}

	// Validate attack requires an entity target
	if (type === "attack" && !target.entityId) {
		return false;
	}

	const previousCommand = state.command.type;

	state.command = {
		type,
		target,
		issuedTick: currentTick,
		waypointIndex: 0,
	};

	commandEvents.push({
		botId,
		previousCommand,
		newCommand: type,
		tick: currentTick,
	});

	return true;
}

/**
 * Get the current command for a bot.
 */
export function getBotCommand(botId: string): BotCommand | null {
	const state = botStates.get(botId);
	return state ? { ...state.command } : null;
}

/**
 * Get all bots with a specific command type.
 */
export function getBotsByCommand(type: CommandType): BotCommandState[] {
	const result: BotCommandState[] = [];
	for (const state of botStates.values()) {
		if (state.command.type === type) {
			result.push({ ...state, command: { ...state.command } });
		}
	}
	return result;
}

/**
 * Get all bots belonging to a faction.
 */
export function getBotsByFaction(faction: string): BotCommandState[] {
	const result: BotCommandState[] = [];
	for (const state of botStates.values()) {
		if (state.faction === faction) {
			result.push({ ...state, command: { ...state.command } });
		}
	}
	return result;
}

/**
 * Get command events since last call (drains queue).
 */
export function getCommandEvents(): CommandEvent[] {
	const events = commandEvents;
	commandEvents = [];
	return events;
}

// ---------------------------------------------------------------------------
// Public API — Patrol logic
// ---------------------------------------------------------------------------

/**
 * Advance patrol waypoint for a bot if it reached the current one.
 * Returns the current target waypoint position.
 */
export function advancePatrol(botId: string): { x: number; z: number } | null {
	const state = botStates.get(botId);
	if (!state || state.command.type !== "patrol") return null;

	const waypoints = state.command.target.waypoints;
	if (!waypoints || waypoints.length === 0) return null;

	const currentWp = waypoints[state.command.waypointIndex];
	const distance = dist2d(state.x, state.z, currentWp.x, currentWp.z);

	if (distance <= WAYPOINT_REACH_THRESHOLD) {
		// Advance to next waypoint (loop)
		state.command.waypointIndex =
			(state.command.waypointIndex + 1) % waypoints.length;
	}

	return waypoints[state.command.waypointIndex];
}

// ---------------------------------------------------------------------------
// Public API — Guard logic
// ---------------------------------------------------------------------------

/**
 * Check if a guarding bot should return to its guard position.
 * Returns the guard position if the bot is too far, null otherwise.
 */
export function checkGuardReturn(
	botId: string,
): { x: number; z: number } | null {
	const state = botStates.get(botId);
	if (!state || state.command.type !== "guard") return null;

	const guardPos = state.command.target.position;
	if (!guardPos) return null;

	const distance = dist2d(state.x, state.z, guardPos.x, guardPos.z);
	if (distance > GUARD_RANGE) {
		return guardPos;
	}

	return null;
}

// ---------------------------------------------------------------------------
// Public API — Follow logic
// ---------------------------------------------------------------------------

/**
 * Check if a following bot should move closer to its target.
 * Returns the target position if the bot is too far, null otherwise.
 */
export function checkFollowDistance(
	botId: string,
	targetX: number,
	targetZ: number,
): { x: number; z: number } | null {
	const state = botStates.get(botId);
	if (!state || state.command.type !== "follow") return null;

	const distance = dist2d(state.x, state.z, targetX, targetZ);
	if (distance > FOLLOW_DISTANCE) {
		return { x: targetX, z: targetZ };
	}

	return null;
}

// ---------------------------------------------------------------------------
// System tick
// ---------------------------------------------------------------------------

/**
 * Main bot command system tick. Updates patrol waypoints and checks
 * guard/follow distances. Called once per sim tick.
 */
export function botCommandSystem(tick: number): void {
	currentTick = tick;

	for (const state of botStates.values()) {
		switch (state.command.type) {
			case "patrol":
				advancePatrol(state.botId);
				break;
			// guard and follow distance checks are done by
			// the movement system querying checkGuardReturn/checkFollowDistance
		}
	}
}

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

/**
 * Reset all bot command state. For tests and new-game initialization.
 */
export function resetBotCommands(): void {
	botStates.clear();
	commandEvents = [];
	currentTick = 0;
}
