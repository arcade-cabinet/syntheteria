import type { World } from "koota";
import { shortestPath } from "../board/adjacency";
import type { GeneratedBoard } from "../board/types";
import { pushTurnEvent } from "../ui/game/turnEvents";
import type { Difficulty } from "../world/config";
import { getRelation } from "../factions/relations";
import {
	Board,
	ResourceDeposit,
	UnitAttack,
	UnitFaction,
	UnitHarvest,
	UnitMove,
	UnitPos,
	UnitStats,
} from "../traits";

// ---------------------------------------------------------------------------
// Layer 1: Faction Personality — static strategic priorities per faction
// ---------------------------------------------------------------------------

interface FactionPersonality {
	/** Base aggression (1=passive, 2=moderate, 3=aggressive). */
	aggression: number;
	/** How much to prioritize harvesting resources. */
	harvestPriority: number;
	/** How much to prioritize expanding territory / moving toward center. */
	expansionPriority: number;
	/** How much to prioritize defending own units. */
	defensePriority: number;
	/** Whether to engage only threats in scan range or seek globally. */
	reactiveOnly: boolean;
}

const FACTION_PERSONALITY: Record<string, FactionPersonality> = {
	reclaimers: {
		aggression: 2,
		harvestPriority: 3,
		expansionPriority: 2,
		defensePriority: 1,
		reactiveOnly: false,
	},
	volt_collective: {
		aggression: 1,
		harvestPriority: 2,
		expansionPriority: 1,
		defensePriority: 3,
		reactiveOnly: true,
	},
	signal_choir: {
		aggression: 3,
		harvestPriority: 1,
		expansionPriority: 3,
		defensePriority: 1,
		reactiveOnly: false,
	},
	iron_creed: {
		aggression: 3,
		harvestPriority: 1,
		expansionPriority: 2,
		defensePriority: 2,
		reactiveOnly: false,
	},
};

const DEFAULT_PERSONALITY: FactionPersonality = {
	aggression: 2,
	harvestPriority: 1,
	expansionPriority: 1,
	defensePriority: 1,
	reactiveOnly: false,
};

/** Difficulty multiplier for AI aggression. */
const DIFFICULTY_AGGRESSION_MULT: Record<Difficulty, number> = {
	story: 0.5,
	standard: 1,
	hard: 2,
};

// ---------------------------------------------------------------------------
// Layer 2: Situation Assessment — evaluate current state per faction
// ---------------------------------------------------------------------------

interface FactionSituation {
	unitCount: number;
	totalHp: number;
	enemyThreats: Array<{
		x: number;
		z: number;
		entityId: number;
		factionId: string;
	}>;
	nearbyDeposits: Array<{ x: number; z: number; entityId: number }>;
	boardCenter: { x: number; z: number };
}

function assessSituation(
	world: World,
	factionId: string,
	board: GeneratedBoard,
	aiUnits: AiUnit[],
): FactionSituation {
	const myUnits = aiUnits.filter((u) => u.factionId === factionId);
	const unitCount = myUnits.length;
	const totalHp = myUnits.reduce((sum, u) => sum + u.hp, 0);

	// Gather all enemy positions (skip allies)
	const enemyThreats: FactionSituation["enemyThreats"] = [];
	for (const e of world.query(UnitPos, UnitFaction, UnitStats)) {
		const f = e.get(UnitFaction);
		const p = e.get(UnitPos);
		if (!f || !p) continue;
		if (f.factionId === factionId) continue;
		// Skip allied factions — AI won't target allies
		if (getRelation(world, factionId, f.factionId) === "ally") continue;
		enemyThreats.push({
			x: p.tileX,
			z: p.tileZ,
			entityId: e.id(),
			factionId: f.factionId,
		});
	}

	// Gather resource deposits
	const nearbyDeposits: FactionSituation["nearbyDeposits"] = [];
	for (const e of world.query(ResourceDeposit)) {
		const dep = e.get(ResourceDeposit);
		if (!dep || dep.depleted) continue;
		nearbyDeposits.push({ x: dep.tileX, z: dep.tileZ, entityId: e.id() });
	}

	const boardCenter = {
		x: Math.floor(board.config.width / 2),
		z: Math.floor(board.config.height / 2),
	};

	return { unitCount, totalHp, enemyThreats, nearbyDeposits, boardCenter };
}

// ---------------------------------------------------------------------------
// Layer 3: Action Selection — per-unit scoring and execution
// ---------------------------------------------------------------------------

type ActionType =
	| "attack"
	| "harvest"
	| "move_to_enemy"
	| "move_to_deposit"
	| "expand"
	| "idle";

interface ScoredAction {
	type: ActionType;
	score: number;
	targetX?: number;
	targetZ?: number;
	targetEntityId?: number;
}

function manhattanDist(ax: number, az: number, bx: number, bz: number): number {
	return Math.abs(ax - bx) + Math.abs(az - bz);
}

function scoreActions(
	unit: AiUnit,
	personality: FactionPersonality,
	situation: FactionSituation,
	aggressionMult: number,
): ScoredAction {
	const candidates: ScoredAction[] = [];

	// Score: attack nearby enemy
	for (const threat of situation.enemyThreats) {
		const dist = manhattanDist(unit.x, unit.z, threat.x, threat.z);
		// Can attack if in range
		if (dist <= unit.attackRange && unit.attackRange > 0) {
			candidates.push({
				type: "attack",
				score: personality.aggression * aggressionMult * 10 + (10 - dist),
				targetX: threat.x,
				targetZ: threat.z,
				targetEntityId: threat.entityId,
			});
		}
	}

	// Score: move toward nearest enemy (if aggressive enough or reactive + in scan)
	for (const threat of situation.enemyThreats) {
		const dist = manhattanDist(unit.x, unit.z, threat.x, threat.z);
		if (personality.reactiveOnly && dist > unit.scanRange) continue;
		if (unit.attackRange === 0) continue; // Can't attack, don't chase

		const proximityBonus = Math.max(0, 20 - dist);
		const score = personality.aggression * aggressionMult * 3 + proximityBonus;
		candidates.push({
			type: "move_to_enemy",
			score,
			targetX: threat.x,
			targetZ: threat.z,
			targetEntityId: threat.entityId,
		});
	}

	// Score: move toward resource deposit
	for (const dep of situation.nearbyDeposits) {
		const dist = manhattanDist(unit.x, unit.z, dep.x, dep.z);
		if (dist > unit.scanRange * 2) continue; // Only consider within extended scan range
		const score = personality.harvestPriority * 4 + Math.max(0, 15 - dist);
		candidates.push({
			type: "move_to_deposit",
			score,
			targetX: dep.x,
			targetZ: dep.z,
			targetEntityId: dep.entityId,
		});
	}

	// Score: expand toward board center
	const distToCenter = manhattanDist(
		unit.x,
		unit.z,
		situation.boardCenter.x,
		situation.boardCenter.z,
	);
	candidates.push({
		type: "expand",
		score: personality.expansionPriority * 2 + Math.max(0, 10 - distToCenter),
		targetX: situation.boardCenter.x,
		targetZ: situation.boardCenter.z,
	});

	// Score: idle (baseline)
	candidates.push({ type: "idle", score: personality.defensePriority });

	// Pick highest score
	candidates.sort((a, b) => b.score - a.score);
	return candidates[0];
}

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

type AiUnit = {
	entityId: number;
	x: number;
	z: number;
	factionId: string;
	ap: number;
	maxAp: number;
	mp: number;
	maxMp: number;
	hp: number;
	scanRange: number;
	attackRange: number;
	attack: number;
};

// ---------------------------------------------------------------------------
// Read the difficulty from the Board trait. Falls back to "standard".
// ---------------------------------------------------------------------------

function readDifficulty(world: World): Difficulty {
	for (const e of world.query(Board)) {
		const b = e.get(Board);
		if (b) return b.difficulty;
	}
	return "standard";
}

// ---------------------------------------------------------------------------
// Main AI turn runner
// ---------------------------------------------------------------------------

export function runAiTurns(world: World, board: GeneratedBoard): void {
	const difficulty = readDifficulty(world);
	const aggressionMult = DIFFICULTY_AGGRESSION_MULT[difficulty];

	// Collect all player unit positions (for backward compat check)
	type PlayerPos = { x: number; z: number };
	const playerPositions: PlayerPos[] = [];
	for (const e of world.query(UnitPos, UnitFaction)) {
		const faction = e.get(UnitFaction);
		const pos = e.get(UnitPos);
		if (!faction || !pos) continue;
		if (faction.factionId === "player") {
			playerPositions.push({ x: pos.tileX, z: pos.tileZ });
		}
	}

	if (playerPositions.length === 0) return;

	// Build a snapshot of AI entities
	const aiUnits: AiUnit[] = [];
	for (const e of world.query(UnitPos, UnitFaction, UnitStats)) {
		const faction = e.get(UnitFaction);
		const pos = e.get(UnitPos);
		const stats = e.get(UnitStats);
		if (!faction || !pos || !stats) continue;
		if (faction.factionId === "player") continue;
		if (stats.ap <= 0 && stats.mp <= 0) continue;
		aiUnits.push({
			entityId: e.id(),
			x: pos.tileX,
			z: pos.tileZ,
			factionId: faction.factionId,
			ap: stats.ap,
			maxAp: stats.maxAp,
			mp: stats.mp,
			maxMp: stats.maxMp,
			hp: stats.hp,
			scanRange: stats.scanRange,
			attackRange: stats.attackRange,
			attack: stats.attack,
		});
	}

	// Build entity id map for resolving actions back to entities
	const entityById = new Map<number, ReturnType<World["query"]>[number]>();
	for (const e of world.query(UnitPos, UnitFaction, UnitStats)) {
		entityById.set(e.id(), e);
	}

	// Get unique AI faction IDs
	const aiFactionIds = [...new Set(aiUnits.map((u) => u.factionId))];

	// Run GOAP per faction
	for (const factionId of aiFactionIds) {
		const personality = FACTION_PERSONALITY[factionId] ?? DEFAULT_PERSONALITY;
		const situation = assessSituation(world, factionId, board, aiUnits);
		const factionUnits = aiUnits.filter((u) => u.factionId === factionId);

		for (const unit of factionUnits) {
			const entity = entityById.get(unit.entityId);
			if (!entity) continue;

			const action = scoreActions(unit, personality, situation, aggressionMult);

			switch (action.type) {
				case "attack": {
					if (action.targetEntityId != null && !entity.has(UnitAttack)) {
						entity.add(
							UnitAttack({ targetEntityId: action.targetEntityId, damage: 2 }),
						);
					}
					break;
				}
				case "move_to_enemy":
				case "move_to_deposit":
				case "expand": {
					if (action.targetX != null && action.targetZ != null) {
						moveToward(entity, unit, action.targetX, action.targetZ, board);
					}
					break;
				}
				case "harvest": {
					// Start harvest if on a deposit and not already harvesting
					if (!entity.has(UnitHarvest) && action.targetEntityId != null) {
						entity.add(
							UnitHarvest({
								depositEntityId: action.targetEntityId,
								ticksRemaining: 3,
								totalTicks: 3,
								targetX: action.targetX ?? unit.x,
								targetZ: action.targetZ ?? unit.z,
							}),
						);
					}
					break;
				}
				case "idle":
				default:
					break;
			}
		}
	}

	// Refresh all AI AP for next AI turn
	for (const e of world.query(UnitFaction, UnitStats)) {
		const faction = e.get(UnitFaction);
		const stats = e.get(UnitStats);
		if (!faction || !stats) continue;
		if (faction.factionId !== "player") {
			e.set(UnitStats, { ...stats, ap: stats.maxAp, mp: stats.maxMp });
		}
	}
}

// ---------------------------------------------------------------------------
// Movement helper
// ---------------------------------------------------------------------------

function moveToward(
	entity: ReturnType<World["query"]>[number],
	unit: AiUnit,
	targetX: number,
	targetZ: number,
	board: GeneratedBoard,
): void {
	if (entity.has(UnitMove)) return; // Already moving
	const path = shortestPath(unit.x, unit.z, targetX, targetZ, board);
	// path[0] is current tile; path[1] is the next step
	if (path.length >= 2) {
		const next = path[1];
		// Queue a UnitMove for visible lerp animation
		entity.add(
			UnitMove({
				fromX: unit.x,
				fromZ: unit.z,
				toX: next.x,
				toZ: next.z,
				progress: 0,
				mpCost: 1,
			}),
		);
	}
}

/**
 * Instantly complete all pending UnitMove components.
 * Used by tests and by the turn system when animation is disabled.
 */
export function resolveAllMoves(world: World): void {
	for (const entity of world.query(UnitMove, UnitStats)) {
		const move = entity.get(UnitMove);
		const stats = entity.get(UnitStats);
		if (!move || !stats) continue;
		entity.set(UnitPos, { tileX: move.toX, tileZ: move.toZ });
		entity.set(UnitStats, {
			...stats,
			mp: Math.max(0, stats.mp - move.mpCost),
		});
		entity.remove(UnitMove);
	}
}

// Exported for testing
export {
	FACTION_PERSONALITY,
	DIFFICULTY_AGGRESSION_MULT,
	scoreActions,
	assessSituation,
};
export type {
	FactionPersonality,
	FactionSituation,
	AiUnit,
	ScoredAction,
	ActionType,
};
