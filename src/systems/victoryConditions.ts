/**
 * Victory Condition Detection
 *
 * Checks each turn whether any faction has met a win condition:
 *
 * 1. **Subjugation** — Control 60%+ of total claimed territory cells.
 * 2. **Technical Supremacy** — Have 3+ units at Mark V (markLevel >= 5).
 * 3. **Elimination** — All other factions have 0 units remaining.
 *
 * The system runs at the end of each turn (after all phases complete).
 * Once a victory is detected, it persists until the game is reset.
 */

import { Identity, Unit, WorldPosition } from "../ecs/traits";
import { world } from "../ecs/world";
import {
	type EconomyFactionId,
	ALL_ECONOMY_FACTIONS,
} from "./factionEconomy";
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
