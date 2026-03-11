/**
 * Victory condition evaluator — per-faction, per-tick checking of all 8 GDD
 * victory conditions as defined in docs/design/gameplay/VICTORY.md.
 *
 * The 8 conditions:
 *   1. Colonial    — patron satisfaction >= 80% AND all objectives complete
 *   2. Domination  — control 75% of outpost locations for 5 min (hold timer)
 *   3. Economic    — 500+ cubes of 4+ material types for 5 min (hold timer)
 *   4. Technology  — Tier 5 tech researched AND Convergence Device constructed
 *   5. Diplomatic  — all surviving factions allied or vassalized to evaluating faction
 *   6. Integration — Residual relationship >= 80 AND Resonance Protocol complete
 *   7. Survival    — last faction with powered outpost after Storm Convergence begins
 *   8. Story       — all 4 narrative requirements met (player-only)
 *
 * Hold timers for Domination and Economic persist between ticks. If the
 * threshold drops below requirement, the hold timer resets to zero.
 *
 * Simultaneous victories are resolved by the tiebreaker order from config:
 *   story > integration > technology > colonial > diplomatic > economic >
 *   domination > survival
 *
 * All tunables come from config/victory.json. Systems that own game state
 * are queried via an injected VictoryStateQueries object (testable by injection).
 *
 * Evaluation runs at the configured checkInterval. The main entry point for
 * external callers is wireTick(currentTick) which drives both the per-faction
 * evaluation and the hold timers.
 *
 * Related systems:
 *   - src/systems/territoryControl.ts  (getOutpostControlPercent)
 *   - src/systems/cubePileTracker.ts   (cube counts and material diversity)
 *   - src/systems/techResearch.ts      (max researched tier)
 *   - src/systems/diplomacySystem.ts   (allied/vassalized status)
 */

import { config } from "../../config";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const victoryCfg = config.victory;
const condCfg = victoryCfg.conditions;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ConditionProgress {
	/** 0.0–1.0 normalized progress toward this condition */
	score: number;
	/** True if the condition threshold is fully met (and hold timer expired, if applicable) */
	met: boolean;
}

export interface VictoryProgress {
	colonial: ConditionProgress;
	domination: ConditionProgress;
	economic: ConditionProgress;
	technology: ConditionProgress;
	diplomatic: ConditionProgress;
	integration: ConditionProgress;
	survival: ConditionProgress;
	story: ConditionProgress;
}

export type VictoryConditionKey = keyof VictoryProgress;

export type VictoryEventType = "condition_met" | "threshold_reached";

export interface VictoryEvent {
	type: VictoryEventType;
	faction: string;
	condition: VictoryConditionKey;
	conditionName: string;
	tick: number;
	/** Only present for threshold_reached events */
	threshold?: number;
}

export interface Winner {
	faction: string;
	condition: VictoryConditionKey;
	conditionName: string;
}

// ---------------------------------------------------------------------------
// Query interface — injected for testability
// ---------------------------------------------------------------------------

export interface VictoryStateQueries {
	// Colonial
	getPatronSatisfaction(faction: string): number;
	getCompletedPatronObjectives(faction: string): number;
	getTotalPatronObjectives(faction: string): number;

	// Domination
	getOutpostControlPercent(faction: string): number;
	getTotalOutpostLocations(): number;

	// Economic
	getFactionCubeCount(faction: string): number;
	getFactionMaterialDiversity(faction: string): number;

	// Technology
	getMaxResearchedTier(faction: string): number;
	hasConvergenceDevice(faction: string): boolean;

	// Diplomatic
	getSurvivingFactions(): string[];
	getAlliedFactions(faction: string): string[];
	getVassalizedFactions(faction: string): string[];

	// Integration
	getResidualRelationship(faction: string): number;
	isResonanceProtocolComplete(faction: string): boolean;

	// Survival
	isConvergenceActive(): boolean;
	hasOperationalOutpost(faction: string): boolean;

	// Story
	getCoreAccessPointsDiscovered(faction: string): number;
	isAllKelpDialogueComplete(faction: string): boolean;
	hasMaterialOfferingDelivered(faction: string): boolean;
}

// ---------------------------------------------------------------------------
// Hold timer state
// ---------------------------------------------------------------------------

interface HoldTimerState {
	/** How many ticks the threshold has been continuously satisfied */
	accumulatedTicks: number;
	/** True once accumulatedTicks >= holdDurationTicks */
	expired: boolean;
}

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

let queries: VictoryStateQueries | null = null;

/** Cached VictoryProgress per faction (updated each evaluation pass) */
const progressCache = new Map<string, VictoryProgress>();

/** Hold timers — key: `${faction}:${condition}` */
const holdTimers = new Map<string, HoldTimerState>();

/** Pending victory events (drained by getVictoryEvents) */
let pendingEvents: VictoryEvent[] = [];

/** The winning faction and condition, once determined */
let winner: Winner | null = null;

/** Tick of last evaluation pass (per condition, for check interval) */
let lastEvalTick = -Infinity;

/** Threshold alerts already fired — key: `${faction}:${condition}:${threshold}` */
const firedAlerts = new Set<string>();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function holdTimerKey(faction: string, condition: VictoryConditionKey): string {
	return `${faction}:${condition}`;
}

function getOrCreateHoldTimer(faction: string, condition: VictoryConditionKey): HoldTimerState {
	const key = holdTimerKey(faction, condition);
	let timer = holdTimers.get(key);
	if (!timer) {
		timer = { accumulatedTicks: 0, expired: false };
		holdTimers.set(key, timer);
	}
	return timer;
}

/**
 * Advance a hold timer by `elapsedTicks`. Returns true if the timer has now
 * expired (accumulated >= required). Resets timer if `thresholdMet` is false.
 */
function advanceHoldTimer(
	faction: string,
	condition: VictoryConditionKey,
	thresholdMet: boolean,
	elapsedTicks: number,
	holdDurationTicks: number,
): boolean {
	const timer = getOrCreateHoldTimer(faction, condition);

	if (timer.expired) return true;

	if (!thresholdMet) {
		timer.accumulatedTicks = 0;
		return false;
	}

	timer.accumulatedTicks += elapsedTicks;
	if (timer.accumulatedTicks >= holdDurationTicks) {
		timer.expired = true;
		return true;
	}
	return false;
}

function clamp(value: number, min = 0, max = 1): number {
	return Math.max(min, Math.min(max, value));
}

// ---------------------------------------------------------------------------
// Individual condition evaluators
// ---------------------------------------------------------------------------

function evaluateColonial(q: VictoryStateQueries, faction: string): ConditionProgress {
	const cfg = condCfg.colonial;
	const satisfaction = q.getPatronSatisfaction(faction);
	const completed = q.getCompletedPatronObjectives(faction);
	const total = q.getTotalPatronObjectives(faction);

	const satFraction = clamp(satisfaction / cfg.patronSatisfactionRequired);
	const objFraction = total > 0 ? clamp(completed / total) : 0;
	const score = (satFraction + objFraction) / 2;

	const met =
		satisfaction >= cfg.patronSatisfactionRequired &&
		completed >= total &&
		total > 0;

	return { score, met };
}

function evaluateDomination(
	q: VictoryStateQueries,
	faction: string,
	elapsedTicks: number,
): ConditionProgress {
	const cfg = condCfg.domination;
	const controlPct = q.getOutpostControlPercent(faction);

	const score = clamp(controlPct / cfg.outpostControlPercent);
	const thresholdMet = controlPct >= cfg.outpostControlPercent;

	const holdExpired = advanceHoldTimer(
		faction,
		"domination",
		thresholdMet,
		elapsedTicks,
		cfg.holdDurationTicks,
	);

	return { score, met: holdExpired };
}

function evaluateEconomic(
	q: VictoryStateQueries,
	faction: string,
	elapsedTicks: number,
): ConditionProgress {
	const cfg = condCfg.economic;
	const cubes = q.getFactionCubeCount(faction);
	const diversity = q.getFactionMaterialDiversity(faction);

	const cubeFraction = clamp(cubes / cfg.totalCubesRequired);
	const divFraction = clamp(diversity / cfg.materialDiversityRequired);
	const score = (cubeFraction + divFraction) / 2;

	const thresholdMet =
		cubes >= cfg.totalCubesRequired && diversity >= cfg.materialDiversityRequired;

	const holdExpired = advanceHoldTimer(
		faction,
		"economic",
		thresholdMet,
		elapsedTicks,
		cfg.holdDurationTicks,
	);

	return { score, met: holdExpired };
}

function evaluateTechnology(q: VictoryStateQueries, faction: string): ConditionProgress {
	const cfg = condCfg.technology;
	const tier = q.getMaxResearchedTier(faction);
	const hasDevice = q.hasConvergenceDevice(faction);

	const tierFraction = clamp(tier / cfg.requiredTechTier);
	const deviceFraction = hasDevice ? 1 : 0;

	// Weight: tier 70%, device 30%
	const score = tierFraction * 0.7 + deviceFraction * 0.3;

	const met = tier >= cfg.requiredTechTier && hasDevice;
	return { score: clamp(score), met };
}

function evaluateDiplomatic(q: VictoryStateQueries, faction: string): ConditionProgress {
	const surviving = q.getSurvivingFactions();
	const others = surviving.filter((f) => f !== faction);

	// Diplomatic victory requires at least one other faction to survive
	if (others.length === 0) {
		return { score: 0, met: false };
	}

	const allied = new Set(q.getAlliedFactions(faction));
	const vassalized = new Set(q.getVassalizedFactions(faction));

	let aligned = 0;
	for (const other of others) {
		if (allied.has(other) || vassalized.has(other)) {
			aligned++;
		}
	}

	const score = clamp(aligned / others.length);
	const met = aligned >= others.length;
	return { score, met };
}

function evaluateIntegration(q: VictoryStateQueries, faction: string): ConditionProgress {
	const cfg = condCfg.integration;
	const relationship = q.getResidualRelationship(faction);
	const protocolDone = q.isResonanceProtocolComplete(faction);

	const relFraction = clamp(relationship / cfg.residualRelationshipRequired);
	const protocolFraction = protocolDone ? 1 : 0;

	// Weight: relationship 70%, protocol 30%
	const score = relFraction * 0.7 + protocolFraction * 0.3;

	const met =
		relationship >= cfg.residualRelationshipRequired && protocolDone;

	return { score: clamp(score), met };
}

function evaluateSurvival(q: VictoryStateQueries, faction: string): ConditionProgress {
	if (!q.isConvergenceActive()) {
		return { score: 0, met: false };
	}

	const surviving = q.getSurvivingFactions();
	const factionsWithOutposts = surviving.filter((f) => q.hasOperationalOutpost(f));

	// Score: once convergence is active, scale by how many factions have been
	// eliminated (lost all powered outposts). This faction must have an outpost
	// to have any positive score.
	const thisHasOutpost = q.hasOperationalOutpost(faction);
	const totalFactions = surviving.length;
	const survivorsWithPower = factionsWithOutposts.length;
	const eliminated = totalFactions - survivorsWithPower;

	// Score = fraction of other factions eliminated + small base for still being alive
	// If 0 factions eliminated and we have an outpost → 0.1 (alive, convergence started)
	// If all others eliminated → 1.0
	const score = thisHasOutpost && totalFactions > 0
		? clamp(0.1 + (eliminated / totalFactions) * 0.9)
		: 0;

	// Met: convergence active AND this faction is the only one with a powered outpost
	const met =
		thisHasOutpost &&
		factionsWithOutposts.length === 1 &&
		factionsWithOutposts[0] === faction;

	return { score: clamp(score), met };
}

function evaluateStory(q: VictoryStateQueries, faction: string): ConditionProgress {
	const cfg = condCfg.story;

	// Story victory is player-only
	if (faction !== "player") {
		return { score: 0, met: false };
	}

	const corePoints = q.getCoreAccessPointsDiscovered(faction);
	const relationship = q.getResidualRelationship(faction);
	const kelpDone = q.isAllKelpDialogueComplete(faction);
	const offeringDone = q.hasMaterialOfferingDelivered(faction);

	const coreFraction = clamp(corePoints / cfg.coreAccessPointsRequired);
	const relFraction = clamp(relationship / cfg.residualRelationshipRequired);
	const kelpFraction = kelpDone ? 1 : 0;
	const offeringFraction = offeringDone ? 1 : 0;

	const score = (coreFraction + relFraction + kelpFraction + offeringFraction) / 4;

	const met =
		corePoints >= cfg.coreAccessPointsRequired &&
		relationship >= cfg.residualRelationshipRequired &&
		kelpDone &&
		offeringDone;

	return { score: clamp(score), met };
}

// ---------------------------------------------------------------------------
// Alert threshold processing
// ---------------------------------------------------------------------------

const ALERT_THRESHOLDS: readonly number[] =
	victoryCfg.progressPanel.alertThresholds;

function checkAlertThresholds(
	faction: string,
	condition: VictoryConditionKey,
	conditionName: string,
	score: number,
	tick: number,
): void {
	for (const threshold of ALERT_THRESHOLDS) {
		if (score >= threshold) {
			const alertKey = `${faction}:${condition}:${threshold}`;
			if (!firedAlerts.has(alertKey)) {
				firedAlerts.add(alertKey);
				pendingEvents.push({
					type: "threshold_reached",
					faction,
					condition,
					conditionName,
					tick,
					threshold,
				});
			}
		}
	}
}

// ---------------------------------------------------------------------------
// Tiebreaker ordering
// ---------------------------------------------------------------------------

const TIEBREAKER_ORDER: VictoryConditionKey[] =
	victoryCfg.simultaneousVictoryPriority as VictoryConditionKey[];

/**
 * Given a set of (faction, condition) pairs where `met` is true, determine
 * which wins according to the tiebreaker priority order.
 */
function resolveTiebreaker(
	candidates: Array<{ faction: string; condition: VictoryConditionKey; conditionName: string }>,
): { faction: string; condition: VictoryConditionKey; conditionName: string } | null {
	if (candidates.length === 0) return null;
	if (candidates.length === 1) return candidates[0];

	for (const condition of TIEBREAKER_ORDER) {
		const match = candidates.find((c) => c.condition === condition);
		if (match) return match;
	}

	// Fallback to first candidate
	return candidates[0];
}

// ---------------------------------------------------------------------------
// Per-faction evaluation
// ---------------------------------------------------------------------------

/**
 * Evaluate all 8 victory conditions for a single faction.
 *
 * Returns zero progress during the grace period or when no queries are set.
 * Hold timers are NOT advanced by this function; use wireTick for that.
 */
export function evaluateVictoryConditions(
	faction: string,
	currentTick: number,
): VictoryProgress {
	const zero: ConditionProgress = { score: 0, met: false };

	if (!queries || currentTick < victoryCfg.gracePeriodTicks) {
		return {
			colonial: { ...zero },
			domination: { ...zero },
			economic: { ...zero },
			technology: { ...zero },
			diplomatic: { ...zero },
			integration: { ...zero },
			survival: { ...zero },
			story: { ...zero },
		};
	}

	const q = queries;
	return {
		colonial: evaluateColonial(q, faction),
		domination: evaluateDomination(q, faction, 0),
		economic: evaluateEconomic(q, faction, 0),
		technology: evaluateTechnology(q, faction),
		diplomatic: evaluateDiplomatic(q, faction),
		integration: evaluateIntegration(q, faction),
		survival: evaluateSurvival(q, faction),
		story: evaluateStory(q, faction),
	};
}

// ---------------------------------------------------------------------------
// Orchestrator-facing tick entry point
// ---------------------------------------------------------------------------

/**
 * Main tick entry point — call once per orchestrator tick.
 *
 * Responsibilities:
 * 1. Respects check interval — does not evaluate every tick
 * 2. Evaluates all 8 conditions for every surviving faction
 * 3. Advances hold timers for Domination and Economic
 * 4. Fires threshold alert events
 * 5. Resolves simultaneous victories via tiebreaker
 * 6. Sets winner and emits condition_met event
 *
 * @param currentTick - The current simulation tick from the orchestrator.
 */
export function wireTick(currentTick: number): void {
	if (!queries) return;
	if (winner !== null) return; // game already decided

	const checkInterval = condCfg.colonial.checkInterval; // all conditions share the same interval
	if (currentTick - lastEvalTick < checkInterval) return;
	// Cap elapsedTicks to checkInterval to prevent huge jumps on first evaluation
	const elapsedTicks = Math.min(currentTick - lastEvalTick, checkInterval);
	lastEvalTick = currentTick;

	if (currentTick < victoryCfg.gracePeriodTicks) return;

	const q = queries;
	const factions = q.getSurvivingFactions();
	const candidates: Array<{ faction: string; condition: VictoryConditionKey; conditionName: string }> = [];

	for (const faction of factions) {
		const progress: VictoryProgress = {
			colonial: evaluateColonial(q, faction),
			domination: evaluateDomination(q, faction, elapsedTicks),
			economic: evaluateEconomic(q, faction, elapsedTicks),
			technology: evaluateTechnology(q, faction),
			diplomatic: evaluateDiplomatic(q, faction),
			integration: evaluateIntegration(q, faction),
			survival: evaluateSurvival(q, faction),
			story: evaluateStory(q, faction),
		};

		progressCache.set(faction, progress);

		// Check alerts and collect winning conditions
		for (const key of Object.keys(progress) as VictoryConditionKey[]) {
			const p = progress[key];
			const name = condCfg[key].name;

			checkAlertThresholds(faction, key, name, p.score, currentTick);

			if (p.met) {
				candidates.push({ faction, condition: key, conditionName: name });
			}
		}
	}

	// Resolve simultaneous victories
	const resolved = resolveTiebreaker(candidates);
	if (resolved) {
		winner = {
			faction: resolved.faction,
			condition: resolved.condition,
			conditionName: resolved.conditionName,
		};
		pendingEvents.push({
			type: "condition_met",
			faction: resolved.faction,
			condition: resolved.condition,
			conditionName: resolved.conditionName,
			tick: currentTick,
		});
	}
}

// ---------------------------------------------------------------------------
// Public query API
// ---------------------------------------------------------------------------

/**
 * Set the game state query functions. Must be called before wireTick.
 */
export function setVictoryStateQueries(q: VictoryStateQueries): void {
	queries = q;
}

/**
 * Get cached VictoryProgress for a faction, or null if not yet evaluated.
 */
export function getVictoryProgress(faction: string): VictoryProgress | null {
	return progressCache.get(faction) ?? null;
}

/**
 * Get all cached progress as a Map (faction -> progress).
 */
export function getAllFactionsProgress(): Map<string, VictoryProgress> {
	return new Map(progressCache);
}

/**
 * Drain and return all pending victory events.
 */
export function getVictoryEvents(): VictoryEvent[] {
	const events = [...pendingEvents];
	pendingEvents = [];
	return events;
}

/**
 * True if any faction has achieved a victory condition.
 */
export function isGameOver(): boolean {
	return winner !== null;
}

/**
 * Returns the winning faction/condition, or null if the game continues.
 */
export function getWinner(): Winner | null {
	return winner ? { ...winner } : null;
}

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

/**
 * Reset all evaluator state. For testing and new-game initialization.
 */
export function resetVictoryConditionEvaluator(): void {
	queries = null;
	progressCache.clear();
	holdTimers.clear();
	pendingEvents = [];
	winner = null;
	lastEvalTick = -Infinity;
	firedAlerts.clear();
}
