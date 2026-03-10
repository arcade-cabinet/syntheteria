/**
 * AI Civilization economics system — state-machine-driven faction AI.
 *
 * Each non-player civilization maintains an independent resource pool and
 * cycles through a state machine: GATHER → BUILD → EXPAND → DEFEND.
 * Passive resource harvesting is scaled by faction governor biases from
 * config/civilizations.json. Building construction and territory expansion
 * consume cubes. Threat assessment drives transitions to DEFEND state.
 *
 * All tunables sourced from config/civilizations.json + config/territory.json
 * via the centralized config index.
 */

import { config } from "../../config";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CivPhase = "GATHER" | "BUILD" | "EXPAND" | "DEFEND";

export type GovernorPriority =
	| "economy"
	| "mining"
	| "military"
	| "defense"
	| "research"
	| "expansion";

export interface GovernorBias {
	economy: number;
	mining: number;
	military: number;
	defense: number;
	research: number;
	expansion: number;
}

export interface CivResources {
	cubes: number;
	units: number;
	buildings: number;
	territories: number;
}

export interface GovernorDecision {
	priority: GovernorPriority;
	action: string;
	score: number;
}

export interface CivState {
	civId: string;
	name: string;
	bias: GovernorBias;
	resources: CivResources;
	phase: CivPhase;
	phaseTimer: number;
	lastDecision: GovernorDecision | null;
	threatLevel: number;
	economicScore: number;
	militaryStrength: number;
	techLevel: number;
	ticksAlive: number;
}

// ---------------------------------------------------------------------------
// Config references
// ---------------------------------------------------------------------------

const civConfigs = config.civilizations;
const territoryCfg = config.territory;

/** Ticks per phase before auto-transitioning to the next. */
const PHASE_DURATION = 50;

/** Minimum cubes to transition from GATHER to BUILD. */
const BUILD_THRESHOLD = 10;

/** Minimum threat level to force DEFEND phase. */
const DEFEND_THREAT_THRESHOLD = 0.5;

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

const civStates = new Map<string, CivState>();

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

function initCivState(civId: string): CivState {
	const civConfig = (
		civConfigs as Record<
			string,
			{ name: string; description: string; color: string; governorBias: GovernorBias }
		>
	)[civId];

	if (!civConfig) {
		throw new Error(`Unknown civilization: ${civId}`);
	}

	return {
		civId,
		name: civConfig.name,
		bias: { ...civConfig.governorBias },
		resources: { cubes: 0, units: 3, buildings: 1, territories: 1 },
		phase: "GATHER",
		phaseTimer: 0,
		lastDecision: null,
		threatLevel: 0,
		economicScore: 0,
		militaryStrength: 0,
		techLevel: 0,
		ticksAlive: 0,
	};
}

function getOrCreateCivState(civId: string): CivState {
	let state = civStates.get(civId);
	if (!state) {
		state = initCivState(civId);
		civStates.set(civId, state);
	}
	return state;
}

// ---------------------------------------------------------------------------
// Phase transitions (state machine)
// ---------------------------------------------------------------------------

function nextPhase(current: CivPhase): CivPhase {
	switch (current) {
		case "GATHER":
			return "BUILD";
		case "BUILD":
			return "EXPAND";
		case "EXPAND":
			return "DEFEND";
		case "DEFEND":
			return "GATHER";
	}
}

function shouldTransition(state: CivState): boolean {
	// Force DEFEND if under high threat
	if (state.threatLevel >= DEFEND_THREAT_THRESHOLD && state.phase !== "DEFEND") {
		return true;
	}

	// GATHER → BUILD when we have enough cubes
	if (state.phase === "GATHER" && state.resources.cubes >= BUILD_THRESHOLD) {
		return true;
	}

	// Auto-transition after phase duration
	return state.phaseTimer >= PHASE_DURATION;
}

function transitionPhase(state: CivState): void {
	if (state.threatLevel >= DEFEND_THREAT_THRESHOLD && state.phase !== "DEFEND") {
		state.phase = "DEFEND";
	} else {
		state.phase = nextPhase(state.phase);
	}
	state.phaseTimer = 0;
}

// ---------------------------------------------------------------------------
// Evaluation functions
// ---------------------------------------------------------------------------

function evaluateEconomy(state: CivState): number {
	const needFactor = Math.max(0, 1 - state.resources.cubes / 50);
	return needFactor * state.bias.economy;
}

function evaluateMining(state: CivState): number {
	const miningNeed = Math.max(0, 1 - state.resources.cubes / 30);
	return miningNeed * state.bias.mining;
}

function evaluateMilitary(state: CivState): number {
	const threatFactor = state.threatLevel;
	const weaknessFactor = Math.max(0, 1 - state.militaryStrength / 10);
	return (threatFactor * 0.6 + weaknessFactor * 0.4) * state.bias.military;
}

function evaluateDefense(state: CivState): number {
	const canBuild = state.resources.cubes >= 10 ? 1 : 0.3;
	return state.threatLevel * canBuild * state.bias.defense;
}

function evaluateResearch(state: CivState): number {
	const stability = Math.min(1, state.resources.cubes / 20);
	const techGap = Math.max(0, 1 - state.techLevel / 4);
	return stability * techGap * state.bias.research;
}

function evaluateExpansion(state: CivState): number {
	const needTerritory = Math.max(0, 1 - state.resources.territories / 5);
	const canAfford =
		state.resources.cubes >= territoryCfg.outpostTiers[0].cubeCost ? 1 : 0.3;
	return needTerritory * canAfford * state.bias.expansion;
}

// ---------------------------------------------------------------------------
// Decision making
// ---------------------------------------------------------------------------

const EVALUATORS: Record<GovernorPriority, (state: CivState) => number> = {
	economy: evaluateEconomy,
	mining: evaluateMining,
	military: evaluateMilitary,
	defense: evaluateDefense,
	research: evaluateResearch,
	expansion: evaluateExpansion,
};

const ACTIONS: Record<GovernorPriority, string> = {
	economy: "harvest_resources",
	mining: "build_miner",
	military: "produce_units",
	defense: "build_defenses",
	research: "start_research",
	expansion: "claim_territory",
};

function makeDecision(state: CivState): GovernorDecision {
	let bestPriority: GovernorPriority = "economy";
	let bestScore = -1;

	for (const [priority, evaluator] of Object.entries(EVALUATORS) as [
		GovernorPriority,
		(state: CivState) => number,
	][]) {
		const score = evaluator(state);
		if (score > bestScore) {
			bestScore = score;
			bestPriority = priority;
		}
	}

	return {
		priority: bestPriority,
		action: ACTIONS[bestPriority],
		score: bestScore,
	};
}

// ---------------------------------------------------------------------------
// Action execution
// ---------------------------------------------------------------------------

function executeDecision(state: CivState, decision: GovernorDecision): void {
	switch (decision.action) {
		case "harvest_resources":
			state.resources.cubes += Math.round(
				state.resources.territories * state.bias.mining * 0.5,
			);
			state.economicScore += 1;
			break;

		case "build_miner":
			if (state.resources.cubes >= 10) {
				state.resources.cubes -= 10;
				state.resources.buildings += 1;
				state.economicScore += 2;
			}
			break;

		case "produce_units":
			if (state.resources.cubes >= 8) {
				state.resources.cubes -= 8;
				state.resources.units += 1;
				state.militaryStrength += 1;
			}
			break;

		case "build_defenses":
			if (state.resources.cubes >= 12) {
				state.resources.cubes -= 12;
				state.resources.buildings += 1;
			}
			break;

		case "start_research":
			if (state.resources.cubes >= 15) {
				state.resources.cubes -= 15;
				state.techLevel = Math.min(4, state.techLevel + 1);
			}
			break;

		case "claim_territory": {
			const cost = territoryCfg.outpostTiers[0].cubeCost;
			if (state.resources.cubes >= cost) {
				state.resources.cubes -= cost;
				state.resources.territories += 1;
				state.resources.buildings += 1;
			}
			break;
		}
	}
}

// ---------------------------------------------------------------------------
// Passive resource harvesting (every tick, scaled by faction bonuses)
// ---------------------------------------------------------------------------

function passiveHarvest(state: CivState): void {
	// Each territory generates cubes scaled by economy + mining bias
	const harvestRate = state.resources.territories * 0.1 * state.bias.economy;
	state.resources.cubes += Math.max(0, Math.round(harvestRate));
}

// ---------------------------------------------------------------------------
// Threat assessment
// ---------------------------------------------------------------------------

function updateThreatLevel(state: CivState, allStates: CivState[]): void {
	let maxThreat = 0;
	for (const other of allStates) {
		if (other.civId === state.civId) continue;
		const strengthDiff = other.militaryStrength - state.militaryStrength;
		const threat = Math.max(0, strengthDiff / 10);
		maxThreat = Math.max(maxThreat, threat);
	}
	// Exponential smoothing: 80% old threat, 20% new observation
	state.threatLevel = state.threatLevel * 0.8 + maxThreat * 0.2;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function getCivState(civId: string): CivState | undefined {
	return civStates.get(civId);
}

export function getAllCivStates(): CivState[] {
	return [...civStates.values()];
}

export function initializeCivilizations(): void {
	for (const civId of Object.keys(civConfigs)) {
		getOrCreateCivState(civId);
	}
}

/**
 * AI civilization tick. Called once per sim tick.
 *
 * State machine per faction: GATHER → BUILD → EXPAND → DEFEND → (loop)
 * Each tick:
 *   1. Increment phase timer and ticksAlive.
 *   2. Passive resource harvest (every tick).
 *   3. Threat assessment against other factions.
 *   4. Every 10 ticks: governor evaluates priorities, executes best action.
 *   5. Phase transition check.
 */
export function aiCivilizationSystem(): void {
	const allStates = getAllCivStates();

	for (const state of allStates) {
		state.ticksAlive++;
		state.phaseTimer++;

		// Passive harvest every tick
		passiveHarvest(state);

		// Update threat from other factions
		updateThreatLevel(state, allStates);

		// Governor decision every 10 ticks
		if (state.ticksAlive % 10 === 0) {
			const decision = makeDecision(state);
			executeDecision(state, decision);
			state.lastDecision = decision;
		}

		// Phase transitions
		if (shouldTransition(state)) {
			transitionPhase(state);
		}
	}
}

export function resetCivilizations(): void {
	civStates.clear();
}
