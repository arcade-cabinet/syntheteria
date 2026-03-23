/**
 * Victory Condition Detection
 *
 * Checks four win conditions at the end of each turn:
 *   1. Subjugation — faction controls 60%+ of all discovered territory
 *   2. Technical Supremacy — faction has 3+ Mark V (level 5) units
 *   3. Elimination — all enemy units and buildings destroyed
 *   4. Wormhole — faction completes the wormhole research chain
 *
 * Any faction (including rivals) can trigger a victory.
 * The system is purely evaluative — it reads state but does not mutate.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type VictoryType =
	| "subjugation"
	| "technical_supremacy"
	| "elimination"
	| "wormhole";

export interface VictoryResult {
	winner: string;
	type: VictoryType;
	turnNumber: number;
}

export interface VictoryInputs {
	/** Total discovered cells */
	totalDiscoveredCells: number;
	/** Cells controlled per faction */
	controlledCells: Map<string, number>;
	/** Unit counts per faction (only living units) */
	unitCounts: Map<string, number>;
	/** Mark levels per faction — array of mark levels for each unit */
	unitMarkLevels: Map<string, number[]>;
	/** Whether any faction has completed the wormhole research chain */
	wormholeComplete: Map<string, boolean>;
	/** All factions currently in the game */
	allFactions: string[];
	/** Current turn number */
	turnNumber: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const SUBJUGATION_THRESHOLD = 0.6;
const TECH_SUPREMACY_MARK_LEVEL = 5;
const TECH_SUPREMACY_UNIT_COUNT = 3;

// ─── State ───────────────────────────────────────────────────────────────────

let victoryResult: VictoryResult | null = null;
const listeners = new Set<() => void>();

function notify() {
	for (const listener of listeners) {
		listener();
	}
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function getVictoryResult(): VictoryResult | null {
	return victoryResult;
}

export function subscribeVictory(listener: () => void): () => void {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

/**
 * Check all victory conditions. Called at the end of each turn.
 * Returns the first triggered victory, or null.
 */
export function checkVictoryConditions(
	inputs: VictoryInputs,
): VictoryResult | null {
	if (victoryResult) return victoryResult;

	const result =
		checkSubjugation(inputs) ??
		checkTechnicalSupremacy(inputs) ??
		checkElimination(inputs) ??
		checkWormhole(inputs);

	if (result) {
		victoryResult = result;
		notify();
	}

	return result;
}

export function resetVictorySystem() {
	victoryResult = null;
}

// ─── Condition Checks ────────────────────────────────────────────────────────

function checkSubjugation(inputs: VictoryInputs): VictoryResult | null {
	if (inputs.totalDiscoveredCells === 0) return null;

	for (const [faction, controlled] of inputs.controlledCells) {
		const ratio = controlled / inputs.totalDiscoveredCells;
		if (ratio >= SUBJUGATION_THRESHOLD) {
			return {
				winner: faction,
				type: "subjugation",
				turnNumber: inputs.turnNumber,
			};
		}
	}
	return null;
}

function checkTechnicalSupremacy(inputs: VictoryInputs): VictoryResult | null {
	for (const [faction, markLevels] of inputs.unitMarkLevels) {
		const markVCount = markLevels.filter(
			(level) => level >= TECH_SUPREMACY_MARK_LEVEL,
		).length;
		if (markVCount >= TECH_SUPREMACY_UNIT_COUNT) {
			return {
				winner: faction,
				type: "technical_supremacy",
				turnNumber: inputs.turnNumber,
			};
		}
	}
	return null;
}

function checkElimination(inputs: VictoryInputs): VictoryResult | null {
	const aliveFactions = inputs.allFactions.filter(
		(f) => (inputs.unitCounts.get(f) ?? 0) > 0,
	);

	if (aliveFactions.length === 1) {
		return {
			winner: aliveFactions[0],
			type: "elimination",
			turnNumber: inputs.turnNumber,
		};
	}
	return null;
}

function checkWormhole(inputs: VictoryInputs): VictoryResult | null {
	for (const [faction, complete] of inputs.wormholeComplete) {
		if (complete) {
			return {
				winner: faction,
				type: "wormhole",
				turnNumber: inputs.turnNumber,
			};
		}
	}
	return null;
}
