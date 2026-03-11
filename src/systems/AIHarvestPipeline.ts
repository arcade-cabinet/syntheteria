/**
 * AIHarvestPipeline — physical harvest→compress→carry loop for AI bots.
 *
 * AI civilizations previously used passive cube generation (spawnCube directly).
 * This system makes AI bots follow the same physical pipeline as the player:
 *
 *   SEEK_DEPOSIT  → walk to nearest ore deposit
 *   HARVESTING    → call updateHarvesting() each tick, accumulate powder
 *   COMPRESSING   → once powder >= threshold, produce a cube via spawnCube
 *   CARRYING      → walk back to base with cube in hand (bot position moves)
 *   DEPOSITING    → drop cube at base, ready to repeat
 *
 * One AIBotHarvestState is maintained per bot ID. The pipeline is driven by
 * tickAIHarvestPipeline() which the game loop calls each simulation tick.
 *
 * This is a pure-logic system — no Rapier/R3F imports. Positions are
 * managed as Vec3 records and movement is a simple step-toward update
 * that the rendering layer consumes separately.
 *
 * Tunables from config/mining.json.
 */

import miningConfig from "../../config/mining.json";
import { getAllDeposits, type OreDepositData } from "./oreSpawner";
import { spawnCube } from "./cubeEconomy";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Phases of the physical harvest pipeline for one AI bot. */
export type HarvestPhase =
	| "SEEK_DEPOSIT"
	| "HARVESTING"
	| "COMPRESSING"
	| "CARRYING"
	| "DEPOSITING"
	| "IDLE";

export interface Vec3 {
	x: number;
	y: number;
	z: number;
}

/** Per-bot state for the AI harvest pipeline. */
export interface AIBotHarvestState {
	/** Unique bot ID (ECS entity ID or string identifier). */
	botId: string;
	/** Faction this bot belongs to. */
	faction: string;
	/** Current phase in the harvest loop. */
	phase: HarvestPhase;
	/** Bot's current world position (updated each tick). */
	position: Vec3;
	/** Faction's home base position (where cubes are deposited). */
	basePosition: Vec3;
	/** ID of the deposit the bot is targeting. Null when not gathering. */
	targetDepositId: string | null;
	/** Powder accumulated so far (in units matching deposit.grindSpeed). */
	powderAccumulated: number;
	/** ID of the cube currently being carried. Null when not carrying. */
	carriedCubeId: string | null;
	/** Ticks spent in current phase (for compression timing). */
	phaseTimer: number;
}

// ---------------------------------------------------------------------------
// Config constants
// ---------------------------------------------------------------------------

/** Powder needed to produce one cube. */
const POWDER_THRESHOLD: number = miningConfig.harvesting.defaultPowderCapacity;

/** Bot movement speed (world units per tick). */
const BOT_MOVE_SPEED = 0.5;

/** Distance at which a bot considers itself "arrived" at a target. */
const ARRIVAL_RADIUS = 1.5;

/** How many ticks compression takes for an AI bot (no screen shake needed). */
const AI_COMPRESSION_TICKS = 5;

/** Harvest rate per tick for AI bots (units of powder). */
const AI_HARVEST_RATE: number = miningConfig.harvesting.defaultPowderCapacity / 20;

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

const botStates = new Map<string, AIBotHarvestState>();

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Register a bot with the AI harvest pipeline.
 *
 * Must be called before tickAIHarvestPipeline() processes the bot.
 * If the bot ID is already registered, this updates the base position.
 *
 * @param botId - Unique bot identifier
 * @param faction - Faction this bot belongs to
 * @param position - Starting world position
 * @param basePosition - Faction home base position for cube deposit
 */
export function registerBot(
	botId: string,
	faction: string,
	position: Vec3,
	basePosition: Vec3,
): void {
	const existing = botStates.get(botId);
	if (existing) {
		existing.basePosition = { ...basePosition };
		return;
	}

	botStates.set(botId, {
		botId,
		faction,
		phase: "IDLE",
		position: { ...position },
		basePosition: { ...basePosition },
		targetDepositId: null,
		powderAccumulated: 0,
		carriedCubeId: null,
		phaseTimer: 0,
	});
}

/**
 * Unregister a bot from the pipeline (e.g., when it is destroyed).
 */
export function unregisterBot(botId: string): void {
	botStates.delete(botId);
}

/**
 * Get the current harvest state for a bot.
 */
export function getBotState(botId: string): AIBotHarvestState | undefined {
	return botStates.get(botId);
}

/**
 * Get all registered bot states.
 */
export function getAllBotStates(): AIBotHarvestState[] {
	return Array.from(botStates.values());
}

/**
 * Advance the AI harvest pipeline by one simulation tick.
 *
 * For each registered bot, this function:
 *   1. Updates movement toward the current target.
 *   2. Runs the phase-specific logic (seek deposit, harvest, compress, carry, deposit).
 *   3. Transitions to the next phase when arrival/completion conditions are met.
 *
 * Call this once per game simulation tick (not per render frame).
 */
export function tickAIHarvestPipeline(): void {
	for (const state of botStates.values()) {
		tickBot(state);
	}
}

/**
 * Reset all pipeline state — for testing and new-game initialization.
 */
export function resetAIHarvestPipeline(): void {
	botStates.clear();
}

// ---------------------------------------------------------------------------
// Per-bot tick
// ---------------------------------------------------------------------------

function tickBot(state: AIBotHarvestState): void {
	state.phaseTimer++;

	switch (state.phase) {
		case "IDLE":
			tickIdle(state);
			break;
		case "SEEK_DEPOSIT":
			tickSeekDeposit(state);
			break;
		case "HARVESTING":
			tickHarvesting(state);
			break;
		case "COMPRESSING":
			tickCompressing(state);
			break;
		case "CARRYING":
			tickCarrying(state);
			break;
		case "DEPOSITING":
			tickDepositing(state);
			break;
	}
}

// ---------------------------------------------------------------------------
// Phase handlers
// ---------------------------------------------------------------------------

/**
 * IDLE: find the nearest non-depleted deposit and start moving toward it.
 */
function tickIdle(state: AIBotHarvestState): void {
	const deposit = findNearestDeposit(state.position);
	if (!deposit) {
		// No deposits available — stay idle
		return;
	}

	state.targetDepositId = deposit.id;
	state.powderAccumulated = 0;
	transitionTo(state, "SEEK_DEPOSIT");
}

/**
 * SEEK_DEPOSIT: move toward the target deposit; begin harvesting when arrived.
 */
function tickSeekDeposit(state: AIBotHarvestState): void {
	if (!state.targetDepositId) {
		transitionTo(state, "IDLE");
		return;
	}

	const deposit = getAllDeposits().find((d) => d.id === state.targetDepositId);

	if (!deposit || deposit.quantity <= 0) {
		// Deposit gone or depleted — pick another
		state.targetDepositId = null;
		transitionTo(state, "IDLE");
		return;
	}

	const arrived = moveToward(state, deposit.position);

	if (arrived) {
		transitionTo(state, "HARVESTING");
	}
}

/**
 * HARVESTING: extract powder from the deposit each tick.
 * Transitions to COMPRESSING when powder threshold is reached.
 * Transitions to IDLE if deposit depletes before threshold.
 */
function tickHarvesting(state: AIBotHarvestState): void {
	if (!state.targetDepositId) {
		transitionTo(state, "IDLE");
		return;
	}

	const deposit = getAllDeposits().find((d) => d.id === state.targetDepositId);

	if (!deposit || deposit.quantity <= 0) {
		// Deposit depleted mid-harvest
		if (state.powderAccumulated > 0) {
			// Still got some powder — compress what we have if enough
			if (state.powderAccumulated >= POWDER_THRESHOLD * 0.5) {
				transitionTo(state, "COMPRESSING");
			} else {
				state.powderAccumulated = 0;
				state.targetDepositId = null;
				transitionTo(state, "IDLE");
			}
		} else {
			state.targetDepositId = null;
			transitionTo(state, "IDLE");
		}
		return;
	}

	// Extract powder this tick
	const extract = Math.min(AI_HARVEST_RATE, deposit.quantity);
	deposit.quantity -= extract;
	state.powderAccumulated += extract;

	if (state.powderAccumulated >= POWDER_THRESHOLD) {
		transitionTo(state, "COMPRESSING");
	}
}

/**
 * COMPRESSING: simulate compression delay, then spawn a cube.
 */
function tickCompressing(state: AIBotHarvestState): void {
	if (state.phaseTimer < AI_COMPRESSION_TICKS) {
		// Still compressing
		return;
	}

	// Determine cube material from the deposit type, or fallback
	const deposit = state.targetDepositId
		? getAllDeposits().find((d) => d.id === state.targetDepositId)
		: null;
	const material = deposit?.type ?? "scrapMetal";

	// Spawn the cube at the bot's current position
	const cubeId = spawnCube(
		state.faction,
		material,
		state.position.x,
		state.position.z,
	);

	state.carriedCubeId = cubeId;
	state.powderAccumulated = 0;
	state.targetDepositId = null;

	transitionTo(state, "CARRYING");
}

/**
 * CARRYING: move toward base with cube.
 * On arrival, deposit the cube.
 */
function tickCarrying(state: AIBotHarvestState): void {
	const arrived = moveToward(state, state.basePosition);

	if (arrived) {
		transitionTo(state, "DEPOSITING");
	}
}

/**
 * DEPOSITING: cube is dropped at base (already spawned in the world via spawnCube).
 * Immediately transition back to IDLE for the next harvest cycle.
 */
function tickDepositing(state: AIBotHarvestState): void {
	// The cube was already spawned via spawnCube in COMPRESSING.
	// Mark as deposited and reset for next cycle.
	state.carriedCubeId = null;
	transitionTo(state, "IDLE");
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Transition to a new phase, resetting phase timer.
 */
function transitionTo(state: AIBotHarvestState, phase: HarvestPhase): void {
	state.phase = phase;
	state.phaseTimer = 0;
}

/**
 * Move the bot one step toward a target position.
 *
 * @returns true if the bot has arrived within ARRIVAL_RADIUS
 */
function moveToward(
	state: AIBotHarvestState,
	target: { x: number; y: number; z: number },
): boolean {
	const dx = target.x - state.position.x;
	const dz = target.z - state.position.z;
	const distSq = dx * dx + dz * dz;

	if (distSq <= ARRIVAL_RADIUS * ARRIVAL_RADIUS) {
		return true;
	}

	const dist = Math.sqrt(distSq);
	const step = Math.min(BOT_MOVE_SPEED, dist);
	const nx = dx / dist;
	const nz = dz / dist;

	state.position.x += nx * step;
	state.position.z += nz * step;

	return false;
}

/**
 * Find the nearest non-depleted deposit to a position.
 */
function findNearestDeposit(
	pos: Vec3,
): OreDepositData | null {
	const deposits = getAllDeposits().filter((d) => d.quantity > 0);
	if (deposits.length === 0) return null;

	let nearest: OreDepositData | null = null;
	let nearestDistSq = Infinity;

	for (const d of deposits) {
		const dx = d.position.x - pos.x;
		const dz = d.position.z - pos.z;
		const distSq = dx * dx + dz * dz;
		if (distSq < nearestDistSq) {
			nearestDistSq = distSq;
			nearest = d;
		}
	}

	return nearest;
}
