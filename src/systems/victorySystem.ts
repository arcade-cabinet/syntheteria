/**
 * Victory system — 6 win paths + defeat condition.
 *
 * Victory paths:
 *   1. Domination — all rival machine factions eliminated (no units AND no buildings)
 *   2. Network Supremacy — signal coverage ≥ 80% of passable map tiles
 *   3. Reclamation — roboform ≥ 60% of passable tiles to Level 3+ (building tier)
 *   4. Transcendence — Wormhole Stabilizer complete (20-turn project)
 *   5. Cult Eradication — all cult structures destroyed (0 remaining with HP > 0)
 *   6. Score (Turn Cap) — turn reaches 200 → highest score wins
 *
 * Defeat:
 *   - Elimination — all player units AND buildings destroyed
 */

import type { World } from "koota";
import {
	VICTORY_NETWORK_COVERAGE_PERCENT,
	VICTORY_RECLAMATION_MIN_LEVEL,
	VICTORY_RECLAMATION_PERCENT,
	VICTORY_TURN_CAP,
} from "../config/gameDefaults";
import {
	Board,
	Building,
	CultStructure,
	Faction,
	Powered,
	SignalNode,
	Tile,
	UnitFaction,
} from "../traits";
import { calculateFactionScore } from "./scoreSystem";
import { getWormholeProjectState } from "./wormholeProject";

// ─── Types ──────────────────────────────────────────────────────────────────

export type VictoryType =
	| "domination"
	| "network_supremacy"
	| "reclamation"
	| "transcendence"
	| "cult_eradication"
	| "score";

export interface VictoryResult {
	type: VictoryType;
	winnerId: string;
	score?: number;
}

export type GameOutcome =
	| { result: "playing" }
	| { result: "victory"; reason: VictoryType; winnerId: string; score?: number }
	| { result: "defeat"; reason: "elimination" };

export interface VictoryProgress {
	/** Signal coverage % of passable tiles. */
	networkCoveragePercent: number;
	/** % of passable tiles roboformed to Level 3+. */
	reclamationPercent: number;
	/** Current turn number. */
	currentTurn: number;
	/** Wormhole project turns remaining (null if not active). */
	wormholeTurnsRemaining: number | null;
	/** Number of cult structures remaining. */
	cultStructuresRemaining: number;
	/** Number of rival factions still alive. */
	rivalFactionsAlive: number;
}

const CULT_FACTIONS = ["static_remnants", "null_monks", "lost_signal"] as const;

const MACHINE_FACTIONS = [
	"reclaimers",
	"volt_collective",
	"signal_choir",
	"iron_creed",
] as const;

function isCultFaction(factionId: string): boolean {
	return (CULT_FACTIONS as readonly string[]).includes(factionId);
}

function isMachineFaction(factionId: string): boolean {
	return (MACHINE_FACTIONS as readonly string[]).includes(factionId);
}

// ─── Victory Checks ─────────────────────────────────────────────────────────

export function checkVictoryConditions(
	world: World,
	opts?: { observerMode?: boolean },
): GameOutcome {
	const playerFactionId = "player";

	// Defeat check: player must have at least one unit OR one building
	if (!opts?.observerMode) {
		const hasPlayerPresence = factionHasPresence(world, playerFactionId);
		if (!hasPlayerPresence) {
			return { result: "defeat", reason: "elimination" };
		}
	}

	// 1. Domination — all rival machine factions eliminated
	const rivalAlive = countRivalFactionsAlive(world, playerFactionId);
	if (rivalAlive === 0 && hasAnyRivalFactionEverExisted(world)) {
		return {
			result: "victory",
			reason: "domination",
			winnerId: playerFactionId,
		};
	}

	// 2. Network Supremacy — signal coverage ≥ threshold
	const networkPct = computeSignalCoveragePercent(world);
	if (networkPct >= VICTORY_NETWORK_COVERAGE_PERCENT) {
		return {
			result: "victory",
			reason: "network_supremacy",
			winnerId: playerFactionId,
		};
	}

	// 3. Reclamation — roboform tiles at level 3+ ≥ threshold
	const reclamationPct = computeReclamationPercent(world, playerFactionId);
	if (reclamationPct >= VICTORY_RECLAMATION_PERCENT) {
		return {
			result: "victory",
			reason: "reclamation",
			winnerId: playerFactionId,
		};
	}

	// 4. Transcendence — wormhole project completed
	const wormholeState = getWormholeProjectState();
	if (wormholeState.status === "completed") {
		return {
			result: "victory",
			reason: "transcendence",
			winnerId: playerFactionId,
		};
	}

	// 5. Cult Eradication — all cult structures destroyed
	const cultCount = countCultStructuresAlive(world);
	if (cultCount === 0 && cultStructuresEverExisted(world)) {
		return {
			result: "victory",
			reason: "cult_eradication",
			winnerId: playerFactionId,
		};
	}

	// 6. Score (Turn Cap) — turn reaches threshold
	const turn = getCurrentTurnForVictory(world);
	if (turn >= VICTORY_TURN_CAP) {
		const { winnerId, score } = determineScoreWinner(world);
		return { result: "victory", reason: "score", winnerId, score };
	}

	return { result: "playing" };
}

/**
 * Get current progress toward all victory conditions.
 * Used by the HUD to show progress bars/indicators.
 */
export function getVictoryProgress(world: World): VictoryProgress {
	const networkCoveragePercent = computeSignalCoveragePercent(world);
	const reclamationPercent = computeReclamationPercent(world, "player");
	const currentTurn = getCurrentTurnForVictory(world);

	const wormhole = getWormholeProjectState();
	const wormholeTurnsRemaining =
		wormhole.status === "building" ? wormhole.turnsRemaining : null;

	const cultStructuresRemaining = countCultStructuresAlive(world);
	const rivalFactionsAlive = countRivalFactionsAlive(world, "player");

	return {
		networkCoveragePercent,
		reclamationPercent,
		currentTurn,
		wormholeTurnsRemaining,
		cultStructuresRemaining,
		rivalFactionsAlive,
	};
}

// ─── Internal Helpers ────────────────────────────────────────────────────────

/** Whether a faction has any units or buildings alive. */
function factionHasPresence(world: World, factionId: string): boolean {
	for (const e of world.query(UnitFaction)) {
		const f = e.get(UnitFaction);
		if (f?.factionId === factionId) return true;
	}
	for (const e of world.query(Building)) {
		const b = e.get(Building);
		if (b?.factionId === factionId && b.hp > 0) return true;
	}
	return false;
}

/** Count rival machine factions that still have units or buildings. */
function countRivalFactionsAlive(
	world: World,
	playerFactionId: string,
): number {
	const alive = new Set<string>();
	for (const e of world.query(UnitFaction)) {
		const f = e.get(UnitFaction);
		if (!f || f.factionId === playerFactionId || isCultFaction(f.factionId))
			continue;
		if (isMachineFaction(f.factionId)) alive.add(f.factionId);
	}
	for (const e of world.query(Building)) {
		const b = e.get(Building);
		if (!b || b.factionId === playerFactionId || isCultFaction(b.factionId))
			continue;
		if (isMachineFaction(b.factionId) && b.hp > 0) alive.add(b.factionId);
	}
	return alive.size;
}

/** Whether any rival machine faction was ever spawned (has a Faction entity). */
function hasAnyRivalFactionEverExisted(world: World): boolean {
	for (const e of world.query(Faction)) {
		const f = e.get(Faction);
		if (!f) continue;
		if (isMachineFaction(f.id) && !f.isPlayer) return true;
	}
	return false;
}

/** Signal coverage as % of passable tiles. */
function computeSignalCoveragePercent(world: World): number {
	const passableTiles = getPassableTileSet(world);
	if (passableTiles.size === 0) return 0;

	const covered = buildSignalCoverageSet(world);
	let coveredPassable = 0;
	for (const key of covered) {
		if (passableTiles.has(key)) coveredPassable++;
	}
	return (coveredPassable / passableTiles.size) * 100;
}

/** Build signal coverage set from all powered signal nodes. */
function buildSignalCoverageSet(world: World): Set<string> {
	const covered = new Set<string>();
	for (const e of world.query(Building, SignalNode, Powered)) {
		const b = e.get(Building);
		const sn = e.get(SignalNode);
		if (!b || !sn || sn.range <= 0) continue;
		for (let x = b.tileX - sn.range; x <= b.tileX + sn.range; x++) {
			const remainingZ = sn.range - Math.abs(x - b.tileX);
			for (let z = b.tileZ - remainingZ; z <= b.tileZ + remainingZ; z++) {
				covered.add(`${x},${z}`);
			}
		}
	}
	return covered;
}

/** Get the set of passable tile keys. */
function getPassableTileSet(world: World): Set<string> {
	const tiles = new Set<string>();
	for (const e of world.query(Tile)) {
		const t = e.get(Tile);
		if (t?.passable) tiles.add(`${t.x},${t.z}`);
	}
	// Fall back to board dimensions if no Tile entities exist
	if (tiles.size === 0) {
		const boardDims = getBoardDims(world);
		if (boardDims) {
			for (let z = 0; z < boardDims.h; z++) {
				for (let x = 0; x < boardDims.w; x++) {
					tiles.add(`${x},${z}`);
				}
			}
		}
	}
	return tiles;
}

/**
 * Reclamation: % of passable tiles that have a player building with
 * buildingTier >= VICTORY_RECLAMATION_MIN_LEVEL.
 */
function computeReclamationPercent(world: World, factionId: string): number {
	const passableTiles = getPassableTileSet(world);
	if (passableTiles.size === 0) return 0;

	const roboformedTiles = new Set<string>();
	for (const e of world.query(Building)) {
		const b = e.get(Building);
		if (!b || b.factionId !== factionId || b.hp <= 0) continue;
		if (b.buildingTier >= VICTORY_RECLAMATION_MIN_LEVEL) {
			const key = `${b.tileX},${b.tileZ}`;
			if (passableTiles.has(key)) roboformedTiles.add(key);
		}
	}

	return (roboformedTiles.size / passableTiles.size) * 100;
}

/** Count cult structures with HP > 0. */
function countCultStructuresAlive(world: World): number {
	let count = 0;
	for (const e of world.query(CultStructure)) {
		const cs = e.get(CultStructure);
		if (cs && cs.hp > 0) count++;
	}
	return count;
}

/** Track whether cult structures were ever placed. Module-level flag. */
let _cultStructuresEverPlaced = false;

function cultStructuresEverExisted(world: World): boolean {
	if (_cultStructuresEverPlaced) return true;
	// Check if any cult structure entities exist (even with hp <= 0)
	for (const _e of world.query(CultStructure)) {
		_cultStructuresEverPlaced = true;
		return true;
	}
	return false;
}

/** Determine score-victory winner across all factions. */
function determineScoreWinner(world: World): {
	winnerId: string;
	score: number;
} {
	const factionIds: string[] = ["player"];
	for (const e of world.query(Faction)) {
		const f = e.get(Faction);
		if (f && !f.isPlayer && isMachineFaction(f.id)) {
			factionIds.push(f.id);
		}
	}

	let bestId = "player";
	let bestScore = -Infinity;
	for (const fid of factionIds) {
		const score = calculateFactionScore(world, fid);
		if (score > bestScore) {
			bestScore = score;
			bestId = fid;
		}
	}
	return { winnerId: bestId, score: bestScore };
}

function getBoardDims(world: World): { w: number; h: number } | null {
	for (const e of world.query(Board)) {
		const b = e.get(Board);
		if (b) return { w: b.width, h: b.height };
	}
	return null;
}

function getCurrentTurnForVictory(world: World): number {
	for (const e of world.query(Board)) {
		const b = e.get(Board);
		if (b) return b.turn;
	}
	return 1;
}

/** Reset module state — for tests. */
export function _resetVictory(): void {
	_cultStructuresEverPlaced = false;
}
