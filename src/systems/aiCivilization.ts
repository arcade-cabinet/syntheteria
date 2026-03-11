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
import {
	registerBot,
	tickAIHarvestPipeline,
	type Vec3 as PipelineVec3,
} from "./AIHarvestPipeline";
import { getAllDeposits, type OreDepositData } from "./oreSpawner";
import {
	registerFactionAggression,
	isFactionReadyToAggress,
	consumeAggressionReady,
	calculateRaidStrength,
} from "./stormSystem";

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
	/** World position of the faction's main base. Set by newGameInit. */
	basePosition: { x: number; z: number };
	/** Last chosen expansion target position (set when claim_territory executes). */
	lastExpansionTarget: { x: number; z: number } | null;
}

/** A ranked production target with the cube cost needed to build it. */
export interface ProductionTarget {
	/** Action key matching ACTIONS map (e.g. "build_miner", "produce_units") */
	action: string;
	/** Governor priority this target serves */
	priority: GovernorPriority;
	/** Cube cost to execute this action */
	cubeCost: number;
	/** How strongly this is needed (0-1) */
	urgency: number;
}

/** Evaluated candidate position for an outpost. */
export interface TerritoryCandidate {
	position: { x: number; z: number };
	/** Total economic value of deposits within claim radius */
	depositValue: number;
	/** Distance from base (penalized in scoring) */
	distanceFromBase: number;
	/** Final score (higher = better placement) */
	score: number;
}

// ---------------------------------------------------------------------------
// Config references
// ---------------------------------------------------------------------------

const civConfigs = config.civilizations;
const territoryCfg = config.territory;
const economyCfg = config.economy;

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

	// Register this faction with the aggression/storm pacing system
	registerFactionAggression(civId);

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
		basePosition: { x: 0, z: 0 },
		lastExpansionTarget: null,
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

	// Production planning refinement: if the top scorer has a production target
	// that's 90%+ affordable, promote it slightly to reflect "almost there" urgency.
	const targets = selectProductionTargets(state);
	if (targets.length > 0) {
		const topTarget = targets[0];
		const savingsRatio = state.resources.cubes / topTarget.cubeCost;
		if (savingsRatio >= 0.9 && topTarget.priority !== bestPriority) {
			// Close to affording this — blend the scores to break near-ties
			const blendedScore = bestScore * 0.5 + topTarget.urgency * 0.5;
			if (topTarget.urgency >= blendedScore) {
				bestPriority = topTarget.priority;
				bestScore = topTarget.urgency;
			}
		}
	}

	return {
		priority: bestPriority,
		action: ACTIONS[bestPriority],
		score: bestScore,
	};
}

// ---------------------------------------------------------------------------
// Production planning (§2.4)
// ---------------------------------------------------------------------------

/**
 * Cube costs per action — mirrors the costs in executeDecision.
 * Kept here for planning without side-effects.
 */
const PRODUCTION_COSTS: Record<string, { cubeCost: number; priority: GovernorPriority }> = {
	build_miner: { cubeCost: 10, priority: "mining" },
	produce_units: { cubeCost: 8, priority: "military" },
	build_defenses: { cubeCost: 12, priority: "defense" },
	start_research: { cubeCost: 15, priority: "research" },
	claim_territory: { cubeCost: territoryCfg.outpostTiers[0].cubeCost, priority: "expansion" },
};

/**
 * Return a ranked list of production targets the faction can afford or is
 * saving toward. Urgency combines the governor bias with a "savings progress"
 * factor so an almost-affordable item ranks higher than a cheap one the AI
 * doesn't really want.
 *
 * @param state - Faction's current state
 * @returns Targets sorted descending by urgency
 */
export function selectProductionTargets(state: CivState): ProductionTarget[] {
	const targets: ProductionTarget[] = [];

	for (const [action, { cubeCost, priority }] of Object.entries(PRODUCTION_COSTS)) {
		// Evaluator score for this priority
		const evaluatorScore = EVALUATORS[priority](state);
		if (evaluatorScore <= 0) continue;

		// Savings progress: how close are we to affording this? (0-1, capped at 1)
		const savingsProgress = Math.min(1, state.resources.cubes / cubeCost);

		// Urgency = evaluator score * savings progress weight
		// Weight shifts from needing-it-more (when empty) to almost-there urgency
		const urgency = evaluatorScore * (0.5 + 0.5 * savingsProgress);

		targets.push({ action, priority, cubeCost, urgency });
	}

	// Sort descending by urgency
	targets.sort((a, b) => b.urgency - a.urgency);
	return targets;
}

// ---------------------------------------------------------------------------
// Territory value evaluation (§2.5)
// ---------------------------------------------------------------------------

/**
 * Compute the total economic value of deposits within a circular claim radius.
 * Uses economy.json `cubeValue` per material when available, falls back to
 * deposit `quantity` as a raw score for unknown material types.
 *
 * @param position - Candidate outpost centre
 * @param claimRadius - Outpost claim radius in world units
 * @param deposits - All available ore deposits (typically from getAllDeposits())
 * @returns Total deposit value within the claim radius
 */
export function evaluateTerritoryValue(
	position: { x: number; z: number },
	claimRadius: number,
	deposits: OreDepositData[],
): number {
	let totalValue = 0;
	const radiusSq = claimRadius * claimRadius;

	for (const deposit of deposits) {
		if (deposit.quantity <= 0) continue;
		const dx = deposit.position.x - position.x;
		const dz = deposit.position.z - position.z;
		const distSq = dx * dx + dz * dz;

		if (distSq <= radiusSq) {
			// Attempt to look up cubeValue from economy config
			const materialCfg = (economyCfg.materials as Record<string, { cubeValue?: number }>)[
				deposit.type
			];
			const cubeValue = materialCfg?.cubeValue ?? 1;

			// Weight by remaining quantity (more ore = more future production)
			totalValue += cubeValue * deposit.quantity;
		}
	}

	return totalValue;
}

/**
 * Generate candidate expansion positions in a ring around the base.
 * Candidates are evenly distributed at a distance of (territory + 1) * spacing.
 * This ensures each new outpost doesn't overlap the previous one.
 *
 * @param base - Faction home base position
 * @param territoryCount - How many territories already claimed (affects ring radius)
 * @returns List of candidate {x, z} positions to evaluate
 */
export function generateExpansionCandidates(
	base: { x: number; z: number },
	territoryCount: number,
): Array<{ x: number; z: number }> {
	const spacing = territoryCfg.minimumOutpostSpacing;
	const ringRadius = (territoryCount + 1) * spacing;
	const numCandidates = 8; // Cardinal + diagonal directions
	const candidates: Array<{ x: number; z: number }> = [];

	for (let i = 0; i < numCandidates; i++) {
		const angle = (i / numCandidates) * Math.PI * 2;
		candidates.push({
			x: base.x + Math.cos(angle) * ringRadius,
			z: base.z + Math.sin(angle) * ringRadius,
		});
	}

	return candidates;
}

/**
 * Score candidate outpost positions and return them sorted best-first.
 *
 * Scoring = depositValue / (1 + distanceFromBase * 0.05)
 * Distance is penalised mildly — proximity to base still matters for logistics
 * but a deposit-rich distant site can beat a barren nearby one.
 *
 * @param basePosition - Faction's home base position
 * @param candidates - Candidate positions to evaluate
 * @param claimRadius - Outpost claim radius
 * @param deposits - All ore deposits (pass getAllDeposits() in production code)
 * @returns Candidates with scores attached, sorted best-first
 */
export function rankTerritoryPositions(
	basePosition: { x: number; z: number },
	candidates: Array<{ x: number; z: number }>,
	claimRadius: number,
	deposits: OreDepositData[],
): TerritoryCandidate[] {
	const scored = candidates.map((pos) => {
		const dx = pos.x - basePosition.x;
		const dz = pos.z - basePosition.z;
		const dist = Math.sqrt(dx * dx + dz * dz);
		const depositValue = evaluateTerritoryValue(pos, claimRadius, deposits);
		const score = depositValue / (1 + dist * 0.05);
		return { position: pos, depositValue, distanceFromBase: dist, score };
	});

	scored.sort((a, b) => b.score - a.score);
	return scored;
}

// ---------------------------------------------------------------------------
// Action execution
// ---------------------------------------------------------------------------

function executeDecision(state: CivState, decision: GovernorDecision, currentTick = 0): void {
	switch (decision.action) {
		case "harvest_resources": {
			// Register harvester bots with the physical pipeline.
			// Each territory contributes one harvester bot.
			// Passive cube generation is now handled by the pipeline ticking bots
			// through the physical harvest→compress→carry loop.
			const harvesterCount = Math.min(
				Math.round(state.resources.territories * state.bias.mining * 0.5),
				3, // cap at 3 pipeline bots per decision cycle
			);
			state.economicScore += 1;

			for (let i = 0; i < harvesterCount; i++) {
				const botId = `${state.civId}_harvester_${i}`;
				// Offset start position slightly so bots don't stack
				const offsetX = (i - 1) * 3;
				const botPos: PipelineVec3 = {
					x: state.basePosition.x + offsetX,
					y: 0,
					z: state.basePosition.z,
				};
				const basePos: PipelineVec3 = {
					x: state.basePosition.x,
					y: 0,
					z: state.basePosition.z,
				};
				registerBot(botId, state.civId, botPos, basePos);
			}
			break;
		}

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

				// If ready to aggress, consume the timer and commit to a raid
				if (isFactionReadyToAggress(state.civId)) {
					const strength = calculateRaidStrength({
						cubeCount: state.resources.cubes,
						buildingCount: state.resources.buildings,
						techLevel: state.techLevel,
					});
					// Only launch if raid strength meets minimum threshold
					if (strength >= 5) {
						consumeAggressionReady(state.civId, currentTick);
						state.militaryStrength += 1; // bonus for committing to aggression
					}
				}
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

				// Log which territory position has highest value (for future rendering)
				const claimRadius = territoryCfg.outpostTiers[0].radius;
				const deposits = getAllDeposits();
				const candidates = generateExpansionCandidates(state.basePosition, state.resources.territories);
				if (candidates.length > 0) {
					const ranked = rankTerritoryPositions(state.basePosition, candidates, claimRadius, deposits);
					// Best candidate is ranked[0] — available for rendering/placement systems
					state.lastExpansionTarget = ranked[0]?.position ?? null;
				}
			}
			break;
		}
	}
}

// ---------------------------------------------------------------------------
// Passive resource harvesting (every tick, scaled by faction bonuses)
// ---------------------------------------------------------------------------

function passiveHarvest(state: CivState): void {
	// Track economic score — actual cube spawning is done by the AI harvest pipeline
	// (AIHarvestPipeline.ts) which bots registered via the harvest_resources action.
	// We keep a small passive increment to resource.cubes so the AI can still
	// make strategic decisions when bots haven't started contributing yet.
	const harvestRate = state.resources.territories * 0.05 * state.bias.economy;
	const passiveCubes = Math.max(0, Math.round(harvestRate));
	state.resources.cubes += passiveCubes;
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
 *   3. Tick the AI harvest pipeline (physical bot movement + harvest + compress + carry).
 *   4. Threat assessment against other factions.
 *   5. Every 10 ticks: governor evaluates priorities, executes best action.
 *   6. Phase transition check.
 */
export function aiCivilizationSystem(currentTick = 0): void {
	const allStates = getAllCivStates();

	for (const state of allStates) {
		state.ticksAlive++;
		state.phaseTimer++;

		// Passive resource trickle (reduced now that pipeline handles real harvesting)
		passiveHarvest(state);

		// Update threat from other factions
		updateThreatLevel(state, allStates);

		// Governor decision every 10 ticks
		if (state.ticksAlive % 10 === 0) {
			const decision = makeDecision(state);
			executeDecision(state, decision, currentTick);
			state.lastDecision = decision;
		}

		// Phase transitions
		if (shouldTransition(state)) {
			transitionPhase(state);
		}
	}

	// Advance the physical harvest pipeline (all registered bots move + harvest + compress + carry)
	tickAIHarvestPipeline();
}

/**
 * Set the world-space base position for a faction.
 * Called by newGameInit after placing AI faction spawn points.
 */
export function setBasePosition(civId: string, x: number, z: number): void {
	const state = getOrCreateCivState(civId);
	state.basePosition = { x, z };
}

export function resetCivilizations(): void {
	civStates.clear();
}
