/**
 * Victory system — 5 win paths + 1 defeat condition + forced endgame.
 *
 * Victory paths:
 *   1. Domination — control 60%+ of total tiles via territory system
 *   2. Research — have 3+ research labs and accumulate 100 tech points
 *   3. Economic — total resources across all materials >= 500
 *   4. Survival — survive 200 turns
 *   5. Wormhole — complete the Wormhole Stabilizer project (20 turns)
 *
 * Forced endgame (anti-stalemate):
 *   - 80% territory held for 10 consecutive turns = forced domination victory
 *
 * Defeat:
 *   - Elimination — all player units destroyed
 */

import type { World } from "koota";
import {
	FORCED_DOMINATION_HOLD_TURNS,
	FORCED_DOMINATION_PERCENT,
	VICTORY_DOMINATION_PERCENT,
	VICTORY_ECONOMIC_TOTAL,
	VICTORY_RESEARCH_LABS,
	VICTORY_RESEARCH_POINTS,
	VICTORY_SURVIVAL_TURNS,
} from "../config/gameDefaults";
import {
	Board,
	Building,
	Faction,
	ResourcePool,
	UnitFaction,
	UnitStats,
	UnitXP,
} from "../traits";
import { isTechResearched } from "./researchSystem";
import { computeTerritory, getTerritoryPercent } from "./territorySystem";
import { getWormholeProjectState } from "./wormholeProject";

export type VictoryReason =
	| "domination"
	| "research"
	| "economic"
	| "survival"
	| "wormhole"
	| "technical_supremacy"
	| "forced_domination";

export type GameOutcome =
	| { result: "playing" }
	| { result: "victory"; reason: VictoryReason }
	| { result: "defeat"; reason: "elimination" };

export interface VictoryProgress {
	/** Territory % controlled by player. */
	territoryPercent: number;
	/** Number of player research labs. */
	researchLabs: number;
	/** Accumulated tech points. */
	techPoints: number;
	/** Total resources across all materials. */
	totalResources: number;
	/** Current turn number. */
	currentTurn: number;
	/** Wormhole project turns remaining (null if not active). */
	wormholeTurnsRemaining: number | null;
	/** Consecutive turns holding forced domination threshold. */
	forcedDominationProgress: number;
}

const CULT_FACTIONS = ["static_remnants", "null_monks", "lost_signal"] as const;

/** Accumulated tech points (1 per research lab per turn). */
let techPoints = 0;

/** Consecutive turns player has held >= FORCED_DOMINATION_PERCENT territory. */
let forcedDominationCounter = 0;

export function checkVictoryConditions(
	world: World,
	opts?: { observerMode?: boolean },
): GameOutcome {
	// Defeat check: any player units? (skip in observer mode — no player faction)
	if (!opts?.observerMode) {
		let hasPlayerUnit = false;
		for (const e of world.query(UnitFaction)) {
			const f = e.get(UnitFaction);
			if (f?.factionId === "player") {
				hasPlayerUnit = true;
				break;
			}
		}
		if (!hasPlayerUnit) {
			return { result: "defeat", reason: "elimination" };
		}
	}

	// Get board dimensions for territory
	const boardDims = getBoardDims(world);

	// 1. Domination — territory control
	if (boardDims) {
		const territory = computeTerritory(world, boardDims.w, boardDims.h);
		const pct = getTerritoryPercent(territory, "player");
		if (pct >= VICTORY_DOMINATION_PERCENT) {
			return { result: "victory", reason: "domination" };
		}
	}

	// Count player research labs + accumulate tech points
	let playerLabCount = 0;
	for (const e of world.query(Building)) {
		const b = e.get(Building);
		if (b?.factionId === "player" && b.buildingType === "research_lab") {
			playerLabCount++;
		}
	}
	techPoints += playerLabCount;

	// 2. Research victory
	if (
		playerLabCount >= VICTORY_RESEARCH_LABS &&
		techPoints >= VICTORY_RESEARCH_POINTS
	) {
		return { result: "victory", reason: "research" };
	}

	// 3. Economic victory — total resources
	const totalRes = getPlayerTotalResources(world);
	if (totalRes >= VICTORY_ECONOMIC_TOTAL) {
		return { result: "victory", reason: "economic" };
	}

	// 4. Survival victory
	const turn = getCurrentTurnForVictory(world);
	if (turn >= VICTORY_SURVIVAL_TURNS) {
		return { result: "victory", reason: "survival" };
	}

	// 5. Wormhole victory — stabilizer project completed
	const wormholeState = getWormholeProjectState();
	if (wormholeState.status === "completed") {
		return { result: "victory", reason: "wormhole" };
	}

	// 6. Technical Supremacy — mark_v_transcendence researched + Mark V unit of each class
	if (checkTechnicalSupremacy(world, "player")) {
		return { result: "victory", reason: "technical_supremacy" };
	}

	// 7. Forced domination (anti-stalemate) — 80% territory for 10 consecutive turns
	if (boardDims) {
		const territory = computeTerritory(world, boardDims.w, boardDims.h);
		const pct = getTerritoryPercent(territory, "player");
		if (pct >= FORCED_DOMINATION_PERCENT) {
			forcedDominationCounter++;
			if (forcedDominationCounter >= FORCED_DOMINATION_HOLD_TURNS) {
				return { result: "victory", reason: "forced_domination" };
			}
		} else {
			forcedDominationCounter = 0;
		}
	}

	return { result: "playing" };
}

/**
 * Get current progress toward all victory conditions.
 * Used by the HUD to show progress bars/indicators.
 */
export function getVictoryProgress(world: World): VictoryProgress {
	const boardDims = getBoardDims(world);
	let territoryPercent = 0;
	if (boardDims) {
		const territory = computeTerritory(world, boardDims.w, boardDims.h);
		territoryPercent = getTerritoryPercent(territory, "player");
	}

	let researchLabs = 0;
	for (const e of world.query(Building)) {
		const b = e.get(Building);
		if (b?.factionId === "player" && b.buildingType === "research_lab") {
			researchLabs++;
		}
	}

	const totalResources = getPlayerTotalResources(world);
	const currentTurn = getCurrentTurnForVictory(world);

	const wormhole = getWormholeProjectState();
	const wormholeTurnsRemaining =
		wormhole.status === "building" ? wormhole.turnsRemaining : null;

	return {
		territoryPercent,
		researchLabs,
		techPoints,
		totalResources,
		currentTurn,
		wormholeTurnsRemaining,
		forcedDominationProgress: forcedDominationCounter,
	};
}

// ---------------------------------------------------------------------------
// Technical Supremacy — requires mark_v_transcendence + Mark V unit of each class
// ---------------------------------------------------------------------------

const FACTION_ROBOT_CLASSES = [
	"scout",
	"infantry",
	"cavalry",
	"ranged",
	"support",
	"worker",
] as const;

/**
 * Check if a faction has achieved Technical Supremacy:
 *   1. mark_v_transcendence tech researched
 *   2. At least one Mark V (markLevel >= 5) unit of EACH faction robot class
 */
export function checkTechnicalSupremacy(
	world: World,
	factionId: string,
): boolean {
	if (!isTechResearched(world, factionId, "mark_v_transcendence")) return false;

	const markVClasses = new Set<string>();
	for (const e of world.query(UnitFaction, UnitStats, UnitXP)) {
		const f = e.get(UnitFaction);
		if (f?.factionId !== factionId) continue;
		const stats = e.get(UnitStats);
		const xp = e.get(UnitXP);
		if (!stats || !xp) continue;
		if (xp.markLevel >= 5) {
			markVClasses.add(stats.robotClass);
		}
	}

	return FACTION_ROBOT_CLASSES.every((cls) => markVClasses.has(cls));
}

function getBoardDims(world: World): { w: number; h: number } | null {
	for (const e of world.query(Board)) {
		const b = e.get(Board);
		if (b) return { w: b.width, h: b.height };
	}
	return null;
}

function getPlayerTotalResources(world: World): number {
	for (const e of world.query(ResourcePool, Faction)) {
		const f = e.get(Faction);
		if (!f?.isPlayer) continue;
		const pool = e.get(ResourcePool);
		if (!pool) continue;
		let total = 0;
		for (const val of Object.values(pool)) {
			if (typeof val === "number") total += val;
		}
		return total;
	}
	return 0;
}

function getCurrentTurnForVictory(world: World): number {
	for (const e of world.query(Board)) {
		const b = e.get(Board);
		if (b) return b.turn;
	}
	return 1;
}

function isCultFaction(factionId: string): boolean {
	return (CULT_FACTIONS as readonly string[]).includes(factionId);
}

/** Reset module state — for tests. */
export function _resetVictory(): void {
	techPoints = 0;
	forcedDominationCounter = 0;
}

/** Read current tech points — for tests. */
export function _getTechPoints(): number {
	return techPoints;
}
