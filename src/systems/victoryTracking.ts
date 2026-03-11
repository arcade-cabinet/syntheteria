/**
 * Victory condition tracking system.
 *
 * Monitors progress toward 6 victory conditions for each faction:
 *   - Economic Dominance: cube count + territory percentage
 *   - Military Conquest: all enemy factions eliminated
 *   - Scientific Supremacy: all techs at the required tier researched
 *   - Cultural Dominion: otter holograms + quest completions
 *   - Digital Takeover: hack percentage of enemy infrastructure
 *   - Last Bot Standing: be the last faction with functional units
 *
 * Checks run at configurable intervals (not every tick) and are
 * suppressed during the grace period at game start.
 *
 * All tunables sourced from config/victory.json.
 */

import { config } from "../../config";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ConditionProgress {
	/** 0.0–1.0 normalized progress toward this condition */
	score: number;
	/** True if the condition is fully met */
	met: boolean;
}

export interface FactionVictoryProgress {
	economic: ConditionProgress;
	military: ConditionProgress;
	scientific: ConditionProgress;
	cultural: ConditionProgress;
	hacking: ConditionProgress;
	survival: ConditionProgress;
}

export type VictoryConditionKey = keyof FactionVictoryProgress;

export interface VictoryEvent {
	faction: string;
	condition: VictoryConditionKey;
	conditionName: string;
	tick: number;
}

export interface Winner {
	faction: string;
	condition: VictoryConditionKey;
	conditionName: string;
}

// ---------------------------------------------------------------------------
// Game state query interfaces — injected for testability
// ---------------------------------------------------------------------------

/**
 * Query functions that the victory system calls to inspect game state.
 * Production code injects real implementations; tests inject stubs.
 */
export interface GameStateQueries {
	/** Number of cubes owned by a faction */
	getCubeCount(faction: string): number;
	/** Fraction of total territory controlled by a faction (0.0–1.0) */
	getTerritoryPercentage(faction: string): number;
	/** List of all faction IDs that are still alive (have functional units) */
	getAliveFactions(): string[];
	/** Highest tech tier fully researched by a faction (0-based index) */
	getMaxResearchedTier(faction: string): number;
	/** Number of active otter holograms for a faction */
	getHologramCount(faction: string): number;
	/** Number of quests completed by a faction */
	getQuestCompletionCount(faction: string): number;
	/** Fraction of enemy infrastructure hacked by a faction (0.0–1.0) */
	getHackPercentage(faction: string): number;
}

// ---------------------------------------------------------------------------
// Config shorthand
// ---------------------------------------------------------------------------

const victoryCfg = config.victory;
const conditions = victoryCfg.conditions;

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

let gameStateQueries: GameStateQueries | null = null;
let victoryEvents: VictoryEvent[] = [];
let winner: Winner | null = null;
let lastCheckTick: Record<VictoryConditionKey, number> = {
	economic: -Infinity,
	military: -Infinity,
	scientific: -Infinity,
	cultural: -Infinity,
	hacking: -Infinity,
	survival: -Infinity,
};

/** Per-faction progress cache, updated each time conditions are evaluated */
const factionProgress = new Map<string, FactionVictoryProgress>();

/** useSyncExternalStore-compatible listeners */
const victoryListeners = new Set<() => void>();

function notifyVictory(): void {
	for (const fn of victoryListeners) fn();
}

/** Subscribe to victory state changes (useSyncExternalStore API). */
export function subscribeVictory(callback: () => void): () => void {
	victoryListeners.add(callback);
	return () => victoryListeners.delete(callback);
}

/**
 * Stable snapshot for useSyncExternalStore — returns a frozen snapshot object.
 * Reference changes only when winner or factionProgress changes.
 */
export interface VictorySnapshot {
	winner: Winner | null;
	factionProgress: ReadonlyMap<string, FactionVictoryProgress>;
}

let _victorySnapshot: VictorySnapshot = { winner: null, factionProgress: new Map() };

export function getVictorySnapshot(): VictorySnapshot {
	return _victorySnapshot;
}

function refreshSnapshot(): void {
	_victorySnapshot = {
		winner: winner ? { ...winner } : null,
		factionProgress: new Map(factionProgress),
	};
	notifyVictory();
}

// ---------------------------------------------------------------------------
// Condition evaluators — pure functions
// ---------------------------------------------------------------------------

function evaluateEconomic(queries: GameStateQueries, faction: string): ConditionProgress {
	const cubeCount = queries.getCubeCount(faction);
	const territoryPct = queries.getTerritoryPercentage(faction);

	const cubeScore = Math.min(1.0, cubeCount / conditions.economic.cubeThreshold);
	const territoryScore = Math.min(1.0, territoryPct / conditions.economic.territoryPercentage);

	// Both criteria must be met; score is average
	const score = (cubeScore + territoryScore) / 2;
	const met = cubeCount >= conditions.economic.cubeThreshold &&
		territoryPct >= conditions.economic.territoryPercentage;

	return { score, met };
}

function evaluateMilitary(queries: GameStateQueries, faction: string): ConditionProgress {
	const aliveFactions = queries.getAliveFactions();
	const enemiesAlive = aliveFactions.filter((f) => f !== faction);

	if (aliveFactions.length <= 1) {
		// Only this faction or no factions — met if this faction is alive
		const met = aliveFactions.includes(faction);
		return { score: met ? 1.0 : 0.0, met };
	}

	// Total factions minus self = total enemies. Dead enemies / total enemies = score
	// @ts-ignore reserved for future use
	const totalEnemies = aliveFactions.length - 1 + enemiesAlive.length;
	// Actually: we need to know the total number of factions that existed, not just alive ones.
	// Since we only have alive factions, we approximate: if 0 enemies alive, score = 1.
	const score = enemiesAlive.length === 0 ? 1.0 : Math.max(0, 1 - enemiesAlive.length / 3);
	const met = enemiesAlive.length === 0 && aliveFactions.includes(faction);

	return { score, met };
}

function evaluateScientific(queries: GameStateQueries, faction: string): ConditionProgress {
	const maxTier = queries.getMaxResearchedTier(faction);
	const requiredTier = conditions.scientific.requiredTier;

	const score = Math.min(1.0, maxTier / requiredTier);
	const met = maxTier >= requiredTier;

	return { score, met };
}

function evaluateCultural(queries: GameStateQueries, faction: string): ConditionProgress {
	const holograms = queries.getHologramCount(faction);
	const quests = queries.getQuestCompletionCount(faction);

	const hologramScore = Math.min(1.0, holograms / conditions.cultural.hologramThreshold);
	const questScore = Math.min(1.0, quests / conditions.cultural.questThreshold);

	const score = (hologramScore + questScore) / 2;
	const met = holograms >= conditions.cultural.hologramThreshold &&
		quests >= conditions.cultural.questThreshold;

	return { score, met };
}

function evaluateHacking(queries: GameStateQueries, faction: string): ConditionProgress {
	const hackPct = queries.getHackPercentage(faction);
	const required = conditions.hacking.hackPercentageRequired;

	const score = Math.min(1.0, hackPct / required);
	const met = hackPct >= required;

	return { score, met };
}

function evaluateSurvival(queries: GameStateQueries, faction: string): ConditionProgress {
	const aliveFactions = queries.getAliveFactions();

	if (aliveFactions.length === 1 && aliveFactions[0] === faction) {
		return { score: 1.0, met: true };
	}

	if (!aliveFactions.includes(faction)) {
		return { score: 0.0, met: false };
	}

	// Score based on how few factions remain (fewer = closer to winning)
	// 4 factions: 0.25, 3: 0.33, 2: 0.5, 1: 1.0
	const score = 1 / aliveFactions.length;
	return { score, met: false };
}

// ---------------------------------------------------------------------------
// Evaluator dispatch
// ---------------------------------------------------------------------------

const evaluators: Record<
	VictoryConditionKey,
	(queries: GameStateQueries, faction: string) => ConditionProgress
> = {
	economic: evaluateEconomic,
	military: evaluateMilitary,
	scientific: evaluateScientific,
	cultural: evaluateCultural,
	hacking: evaluateHacking,
	survival: evaluateSurvival,
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Set the game state query functions. Must be called before the first tick.
 */
export function setGameStateQueries(queries: GameStateQueries): void {
	gameStateQueries = queries;
}

/**
 * Main system tick. Call once per simulation tick.
 *
 * Evaluates victory conditions at their configured check intervals,
 * skipping the grace period. When a condition is met, a VictoryEvent
 * is recorded and the game is marked as over.
 */
export function victoryTrackingSystem(currentTick: number): void {
	if (winner !== null) return; // game already won
	if (gameStateQueries === null) return; // not initialized
	if (currentTick < victoryCfg.gracePeriodTicks) return; // grace period

	const queries = gameStateQueries;
	const aliveFactions = queries.getAliveFactions();

	for (const faction of aliveFactions) {
		let progress = factionProgress.get(faction);
		if (!progress) {
			progress = {
				economic: { score: 0, met: false },
				military: { score: 0, met: false },
				scientific: { score: 0, met: false },
				cultural: { score: 0, met: false },
				hacking: { score: 0, met: false },
				survival: { score: 0, met: false },
			};
			factionProgress.set(faction, progress);
		}

		for (const key of Object.keys(evaluators) as VictoryConditionKey[]) {
			const condCfg = conditions[key];
			const interval = condCfg.checkInterval;

			// Respect check interval
			if (currentTick - lastCheckTick[key] < interval) continue;

			const result = evaluators[key](queries, faction);
			progress[key] = result;

			if (result.met && winner === null) {
				const conditionName = condCfg.name;
				winner = { faction, condition: key, conditionName };
				victoryEvents.push({
					faction,
					condition: key,
					conditionName,
					tick: currentTick,
				});
				refreshSnapshot();
				return; // stop checking once someone wins
			}
		}
	}

	// Update lastCheckTick for each condition that was evaluated this tick
	let anyUpdated = false;
	for (const key of Object.keys(evaluators) as VictoryConditionKey[]) {
		const interval = conditions[key].checkInterval;
		if (currentTick - lastCheckTick[key] >= interval) {
			lastCheckTick[key] = currentTick;
			anyUpdated = true;
		}
	}
	if (anyUpdated) refreshSnapshot();
}

/**
 * Get victory progress for a specific faction.
 * Returns current cached progress for all 6 conditions.
 */
export function getVictoryProgress(faction: string): FactionVictoryProgress {
	const progress = factionProgress.get(faction);
	if (progress) {
		return { ...progress };
	}
	return {
		economic: { score: 0, met: false },
		military: { score: 0, met: false },
		scientific: { score: 0, met: false },
		cultural: { score: 0, met: false },
		hacking: { score: 0, met: false },
		survival: { score: 0, met: false },
	};
}

/**
 * Return any victory events since last call (drains the event queue).
 */
export function getVictoryEvents(): VictoryEvent[] {
	const events = [...victoryEvents];
	victoryEvents = [];
	return events;
}

/**
 * True if any faction has achieved a victory condition.
 */
export function isGameOver(): boolean {
	return winner !== null;
}

/**
 * Returns the winning faction and condition, or null if no winner yet.
 */
export function getWinner(): Winner | null {
	return winner ? { ...winner } : null;
}

/**
 * Reset all victory tracking state. Used for testing and new-game initialization.
 */
export function resetVictoryTracking(): void {
	victoryEvents = [];
	winner = null;
	factionProgress.clear();
	gameStateQueries = null;
	lastCheckTick = {
		economic: -Infinity,
		military: -Infinity,
		scientific: -Infinity,
		cultural: -Infinity,
		hacking: -Infinity,
		survival: -Infinity,
	};
	_victorySnapshot = { winner: null, factionProgress: new Map() };
	notifyVictory();
}
