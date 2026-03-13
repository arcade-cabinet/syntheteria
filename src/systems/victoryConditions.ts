/**
 * @module victoryConditions
 *
 * Checks three win conditions each turn: Subjugation (60%+ territory), Technical
 * Supremacy (3+ Mark V units), and Elimination (all rivals destroyed). Once a
 * victory is detected it persists until game reset.
 *
 * @exports VictoryType / VictoryCondition - Victory result types
 * @exports checkVictoryConditions / getVictoryCondition - Detection and access
 * @exports checkSubjugation / checkTechnicalSupremacy / checkElimination - Individual checks
 * @exports countFactionUnits - ECS unit census by faction
 * @exports SUBJUGATION_THRESHOLD / TECH_SUPREMACY_UNIT_COUNT / TECH_SUPREMACY_MARK_LEVEL - Constants
 * @exports resetVictoryConditions - Reset for new game
 *
 * @dependencies ecs/traits (Identity, Unit, WorldPosition), ecs/world,
 *   factionEconomy (ALL_ECONOMY_FACTIONS), territorySystem, turnSystem
 * @consumers turnPhaseHandlers, VictoryOverlay
 */

import victoryConfig from "../config/victory.json";
import { gameplayRandom } from "../ecs/seed";
import { Identity, Unit, WorldPosition } from "../ecs/traits";
import { world } from "../ecs/world";
import { ALL_ECONOMY_FACTIONS, type EconomyFactionId } from "./factionEconomy";
import {
	getAllCellOwnership,
	getFactionTerritorySize,
} from "./territorySystem";
import { getTurnState } from "./turnSystem";

// ─── Constants ───────────────────────────────────────────────────────────────

/** Fraction of total claimed territory needed for Subjugation victory */
export const SUBJUGATION_THRESHOLD = 0.6;

/** Number of Mark V+ units needed for Technical Supremacy */
export const TECH_SUPREMACY_UNIT_COUNT = 3;

/** Mark level required for Technical Supremacy */
export const TECH_SUPREMACY_MARK_LEVEL = 5;

// ─── Types ───────────────────────────────────────────────────────────────────

export type VictoryType = "subjugation" | "technical_supremacy" | "elimination";

export interface VictoryCondition {
	/** Which faction won */
	winner: EconomyFactionId;
	/** How they won */
	type: VictoryType;
	/** Turn number when victory was detected */
	turnNumber: number;
	/** Additional context */
	detail: string;
}

// ─── State ───────────────────────────────────────────────────────────────────

let currentVictory: VictoryCondition | null = null;

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Get the current victory condition, or null if the game is ongoing.
 */
export function getVictoryCondition(): VictoryCondition | null {
	return currentVictory;
}

/**
 * Check all victory conditions for all factions.
 * Returns the first victory found, or null.
 * Once a victory is detected, subsequent calls return the same result.
 */
export function checkVictoryConditions(): VictoryCondition | null {
	if (currentVictory) return currentVictory;

	const turnNumber = getTurnState().turnNumber;

	// Count units per faction
	const factionUnits = countFactionUnits();

	// Check each condition for each faction
	for (const faction of ALL_ECONOMY_FACTIONS) {
		const unitCount = factionUnits.get(faction) ?? 0;
		if (unitCount === 0) continue; // Dead factions can't win

		// 1. Subjugation — 60%+ of total territory
		const subjugation = checkSubjugation(faction, turnNumber);
		if (subjugation) {
			currentVictory = subjugation;
			return currentVictory;
		}

		// 2. Technical Supremacy — 3+ Mark V units
		const techSup = checkTechnicalSupremacy(faction, turnNumber);
		if (techSup) {
			currentVictory = techSup;
			return currentVictory;
		}

		// 3. Elimination — all other factions have 0 units
		const elimination = checkElimination(faction, factionUnits, turnNumber);
		if (elimination) {
			currentVictory = elimination;
			return currentVictory;
		}
	}

	return null;
}

/**
 * Reset victory state — call on new game.
 */
export function resetVictoryConditions() {
	currentVictory = null;
}

// ─── Config-Driven Victory & Pacing ──────────────────────────────────────────

const {
	subjugation: subjugationConfig,
	technicalSupremacy: techSupConfig,
	wormhole: wormholeConfig,
	stormEscalation,
	aiProgressRates,
	pacing,
} = victoryConfig;

export type ConfigVictoryType =
	| "subjugation"
	| "technical_supremacy"
	| "wormhole"
	| "none";

export interface VictoryState {
	winner: string | null;
	victoryType: ConfigVictoryType;
	turn: number;
}

export interface PlayerProgress {
	territoryCells: number;
	totalMapCells: number;
	allMarkV: boolean;
	allTechsResearched: boolean;
	elCrystals: number;
	reachedWormhole: boolean;
}

export interface AIFactionProgress {
	factionId: string;
	territoryCells: number;
	techsResearched: number;
	totalTechs: number;
	elCrystals: number;
	allMarkV: boolean;
	reachedWormhole: boolean;
}

let victoryState: VictoryState = {
	winner: null,
	victoryType: "none",
	turn: 0,
};

/**
 * Get the config-driven victory state.
 */
export function getVictoryState(): VictoryState {
	return { ...victoryState };
}

/**
 * Check if a player has achieved subjugation victory.
 * Requires owning more than config-defined percentage of total map cells.
 */
export function checkSubjugationConfig(
	territoryCells: number,
	totalMapCells: number,
): boolean {
	const requiredPercent = subjugationConfig.territoryPercent;
	const requiredCells = Math.ceil((requiredPercent / 100) * totalMapCells);
	return territoryCells >= requiredCells;
}

/**
 * Check if a player has achieved technical supremacy.
 * Requires all Mark V chassis and all techs researched.
 */
export function checkTechnicalSupremacyConfig(
	allMarkV: boolean,
	allTechsResearched: boolean,
): boolean {
	if (techSupConfig.requireAllMarkV && !allMarkV) return false;
	if (techSupConfig.requireAllTechs && !allTechsResearched) return false;
	return true;
}

/**
 * Check if a player has achieved wormhole victory.
 * Requires sufficient EL Crystals and reaching the wormhole.
 */
export function checkWormholeVictory(
	elCrystals: number,
	reachedWormhole: boolean,
): boolean {
	if (elCrystals < wormholeConfig.elCrystalsRequired) return false;
	if (wormholeConfig.wormholeReachRequired && !reachedWormhole) return false;
	return true;
}

/**
 * Calculate storm intensity escalation after the soft cap turn.
 * Returns a multiplier (1.0 = normal, >1.0 = escalated).
 */
export function getStormEscalationMultiplier(currentTurn: number): number {
	if (currentTurn <= stormEscalation.softCapTurn) return 1.0;

	const turnsOverCap = currentTurn - stormEscalation.softCapTurn;
	const escalation =
		stormEscalation.baseIntensityAfterCap +
		turnsOverCap * stormEscalation.intensityPerTurnAfterCap;
	return Math.min(escalation, stormEscalation.maxIntensity);
}

/**
 * Simulate AI faction progress for one turn.
 * Uses config-driven rates with variance.
 */
export function simulateAITurn(
	factionProgress: AIFactionProgress,
	totalMapCells: number,
	totalTechs: number,
): AIFactionProgress {
	const variance =
		1.0 + (gameplayRandom() - 0.5) * 2 * aiProgressRates.baseVariance;

	const territoryGain = Math.floor(
		aiProgressRates.territoryGainPerTurn * variance,
	);
	const techGain =
		gameplayRandom() < aiProgressRates.techResearchPerTurn * variance ? 1 : 0;
	const crystalGain =
		gameplayRandom() < aiProgressRates.crystalGatherPerTurn * variance ? 1 : 0;

	return {
		...factionProgress,
		territoryCells: Math.min(
			factionProgress.territoryCells + territoryGain,
			totalMapCells,
		),
		techsResearched: Math.min(
			factionProgress.techsResearched + techGain,
			totalTechs,
		),
		elCrystals: factionProgress.elCrystals + crystalGain,
	};
}

/**
 * Check all config-driven victory conditions for a player and all AI factions.
 * Returns the first victory found, or null.
 */
export function checkAllVictoryConditions(
	player: PlayerProgress,
	aiFactions: AIFactionProgress[],
	currentTurn: number,
): VictoryState {
	if (checkSubjugationConfig(player.territoryCells, player.totalMapCells)) {
		return { winner: "player", victoryType: "subjugation", turn: currentTurn };
	}
	if (
		checkTechnicalSupremacyConfig(player.allMarkV, player.allTechsResearched)
	) {
		return {
			winner: "player",
			victoryType: "technical_supremacy",
			turn: currentTurn,
		};
	}
	if (checkWormholeVictory(player.elCrystals, player.reachedWormhole)) {
		return { winner: "player", victoryType: "wormhole", turn: currentTurn };
	}

	for (const ai of aiFactions) {
		if (checkSubjugationConfig(ai.territoryCells, pacing.totalMapCells)) {
			return {
				winner: ai.factionId,
				victoryType: "subjugation",
				turn: currentTurn,
			};
		}
		if (
			checkTechnicalSupremacyConfig(
				ai.allMarkV,
				ai.techsResearched >= ai.totalTechs,
			)
		) {
			return {
				winner: ai.factionId,
				victoryType: "technical_supremacy",
				turn: currentTurn,
			};
		}
		if (checkWormholeVictory(ai.elCrystals, ai.reachedWormhole)) {
			return {
				winner: ai.factionId,
				victoryType: "wormhole",
				turn: currentTurn,
			};
		}
	}

	return { winner: null, victoryType: "none", turn: currentTurn };
}

/**
 * Run a simulated game for testing: returns the turn at which victory
 * was achieved, or -1 if no victory by maxTurns.
 *
 * Uses a local seeded PRNG for reproducible simulation.
 */
export function simulateTestGame(
	seed: number,
	maxTurns: number,
	totalMapCells: number,
	totalTechs: number,
): { turn: number; winner: string; victoryType: ConfigVictoryType } | null {
	let s = seed >>> 0;
	const rng = () => {
		s |= 0;
		s = (s + 0x6d2b79f5) | 0;
		let t = Math.imul(s ^ (s >>> 15), 1 | s);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 0xffffffff;
	};

	let playerCells = 1;
	let playerTechs = 0;
	let playerCrystals = 0;
	const playerTerritoryGrowth = 1.5;

	const aiFactions: AIFactionProgress[] = [
		{
			factionId: "reclaimers",
			territoryCells: 1,
			techsResearched: 0,
			totalTechs,
			elCrystals: 0,
			allMarkV: false,
			reachedWormhole: false,
		},
		{
			factionId: "volt_collective",
			territoryCells: 1,
			techsResearched: 0,
			totalTechs,
			elCrystals: 0,
			allMarkV: false,
			reachedWormhole: false,
		},
		{
			factionId: "signal_choir",
			territoryCells: 1,
			techsResearched: 0,
			totalTechs,
			elCrystals: 0,
			allMarkV: false,
			reachedWormhole: false,
		},
		{
			factionId: "iron_creed",
			territoryCells: 1,
			techsResearched: 0,
			totalTechs,
			elCrystals: 0,
			allMarkV: false,
			reachedWormhole: false,
		},
	];

	for (let turn = 1; turn <= maxTurns; turn++) {
		const playerVariance = 1.0 + (rng() - 0.5) * 0.4;
		playerCells = Math.min(
			totalMapCells,
			playerCells + Math.floor(playerTerritoryGrowth * playerVariance),
		);
		if (rng() < 0.05) playerTechs = Math.min(totalTechs, playerTechs + 1);
		if (rng() < 0.01) playerCrystals++;

		for (let i = 0; i < aiFactions.length; i++) {
			const aiVar = 1.0 + (rng() - 0.5) * 2 * aiProgressRates.baseVariance;
			const tGain = Math.floor(aiProgressRates.territoryGainPerTurn * aiVar);
			const techGain =
				rng() < aiProgressRates.techResearchPerTurn * aiVar ? 1 : 0;
			const crystGain =
				rng() < aiProgressRates.crystalGatherPerTurn * aiVar ? 1 : 0;

			aiFactions[i] = {
				...aiFactions[i],
				territoryCells: Math.min(
					aiFactions[i].territoryCells + tGain,
					totalMapCells,
				),
				techsResearched: Math.min(
					aiFactions[i].techsResearched + techGain,
					totalTechs,
				),
				elCrystals: aiFactions[i].elCrystals + crystGain,
			};
		}

		const hasAllTechs = playerTechs >= totalTechs;
		const playerProgress: PlayerProgress = {
			territoryCells: playerCells,
			totalMapCells,
			allMarkV: hasAllTechs,
			allTechsResearched: hasAllTechs,
			elCrystals: playerCrystals,
			reachedWormhole: playerCrystals >= wormholeConfig.elCrystalsRequired,
		};

		const result = checkAllVictoryConditions(playerProgress, aiFactions, turn);
		if (result.winner) {
			return {
				turn,
				winner: result.winner,
				victoryType: result.victoryType,
			};
		}
	}

	return null;
}

/**
 * Victory pacing system tick.
 */
export function victoryPacingSystemTick(currentTurn: number) {
	victoryState.turn = currentTurn;
}

/**
 * Reset config-driven victory state.
 */
export function resetVictoryState() {
	victoryState = { winner: null, victoryType: "none", turn: 0 };
}

// ─── Condition Checks ────────────────────────────────────────────────────────

/**
 * Count units per faction from the ECS world.
 */
export function countFactionUnits(): Map<EconomyFactionId, number> {
	const counts = new Map<EconomyFactionId, number>();
	for (const faction of ALL_ECONOMY_FACTIONS) {
		counts.set(faction, 0);
	}

	for (const entity of world.query(Unit, Identity, WorldPosition)) {
		const identity = entity.get(Identity);
		if (!identity) continue;
		const faction = identity.faction as EconomyFactionId;
		if (counts.has(faction)) {
			counts.set(faction, counts.get(faction)! + 1);
		}
	}

	return counts;
}

/**
 * Check Subjugation victory: faction controls 60%+ of all claimed territory.
 */
export function checkSubjugation(
	faction: EconomyFactionId,
	turnNumber: number,
): VictoryCondition | null {
	const ownership = getAllCellOwnership();
	const totalCells = ownership.size;
	if (totalCells === 0) return null;

	const factionCells = getFactionTerritorySize(faction);
	const ratio = factionCells / totalCells;

	if (ratio >= SUBJUGATION_THRESHOLD) {
		return {
			winner: faction,
			type: "subjugation",
			turnNumber,
			detail: `${faction} controls ${factionCells}/${totalCells} cells (${Math.round(ratio * 100)}%)`,
		};
	}

	return null;
}

/**
 * Check Technical Supremacy: faction has 3+ units at Mark V or above.
 */
export function checkTechnicalSupremacy(
	faction: EconomyFactionId,
	turnNumber: number,
): VictoryCondition | null {
	let markVCount = 0;

	for (const entity of world.query(Unit, Identity)) {
		const identity = entity.get(Identity);
		if (!identity || identity.faction !== faction) continue;

		const unit = entity.get(Unit);
		if (!unit) continue;

		if (unit.markLevel >= TECH_SUPREMACY_MARK_LEVEL) {
			markVCount++;
		}
	}

	if (markVCount >= TECH_SUPREMACY_UNIT_COUNT) {
		return {
			winner: faction,
			type: "technical_supremacy",
			turnNumber,
			detail: `${faction} has ${markVCount} units at Mark ${TECH_SUPREMACY_MARK_LEVEL}+`,
		};
	}

	return null;
}

/**
 * Check Elimination: all other factions have 0 units.
 */
export function checkElimination(
	faction: EconomyFactionId,
	factionUnits: Map<EconomyFactionId, number>,
	turnNumber: number,
): VictoryCondition | null {
	for (const other of ALL_ECONOMY_FACTIONS) {
		if (other === faction) continue;
		if ((factionUnits.get(other) ?? 0) > 0) return null;
	}

	return {
		winner: faction,
		type: "elimination",
		turnNumber,
		detail: `${faction} is the last faction with surviving units`,
	};
}
