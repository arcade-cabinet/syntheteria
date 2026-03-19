/**
 * GoalEvaluators for the Yuka GOAP brain.
 *
 * Each evaluator calculates a desirability score (0-1) and its characterBias
 * is set from the faction personality. Think.arbitrate() picks the highest
 * (desirability * characterBias) and calls setGoal() on the winner.
 *
 * Unlike our old scoreActions() which returned a single score, Yuka evaluators
 * are persistent objects on the agent's brain — the bias values are set once
 * at agent creation from FACTION_PERSONALITY and remain stable.
 */

import { GoalEvaluator } from "yuka";
import type { SyntheteriaAgent } from "../agents/SyntheteriaAgent";
import {
	computeEvadeDesirability,
	computeFleeDirection,
} from "../steering/evasionSteering";
import {
	computeInterceptTarget,
	shouldUsePursuit,
} from "../steering/pursuitSteering";

// Context injected before arbitration — shared mutable state per faction turn
export interface BuildOption {
	buildingType: string;
	tileX: number;
	tileZ: number;
}

export interface TurnContext {
	enemies: Array<{ entityId: number; x: number; z: number; factionId: string }>;
	deposits: Array<{ entityId: number; x: number; z: number }>;
	boardCenter: { x: number; z: number };
	boardSize: { width: number; height: number };
	aggressionMult: number;
	/** Available buildings the faction can afford + valid placement tiles. */
	buildOptions: BuildOption[];
	/** Existing building count for the faction this turn. */
	factionBuildingCount: number;
	/** Number of motor pools the faction has (for fabrication throughput). */
	motorPoolCount: number;
	/** Number of non-depleted deposits on the entire board. */
	totalDeposits: number;
	/** Current game turn (1-based). */
	currentTurn: number;
	/** Enemy positions remembered from perception (may include stale intel). */
	rememberedEnemies: Array<{
		entityId: number;
		x: number;
		z: number;
		factionId: string;
	}>;
	/** Faction's average unit position — centroid of owned units. */
	factionCenter: { x: number; z: number };
	/** Mineable tiles near faction units (for floor mining backstop). */
	mineableTiles: Array<{ x: number; z: number; material: string }>;
	/** Current unit count for this faction. */
	unitCount: number;
	/** Population cap for this faction (base + outposts + power plants). */
	popCap: number;
	/** Positions of cult units on the board (for evasion calculations). */
	cultThreats: Array<{ x: number; z: number }>;
	/** Positions of friendly faction units (for local force ratio). */
	factionAllies: Array<{ x: number; z: number }>;
	/** Enemy headings derived from perception memory (entity ID → heading vector). */
	enemyHeadings: Map<number, { dx: number; dz: number }>;
	/** Whether the faction has a research lab. */
	hasResearchLab: boolean;
	/** Whether the faction is currently researching a tech. */
	isResearching: boolean;
	/** Number of techs already researched by this faction. */
	researchedTechCount: number;
}

let _ctx: TurnContext = {
	enemies: [],
	deposits: [],
	boardCenter: { x: 8, z: 8 },
	boardSize: { width: 16, height: 16 },
	aggressionMult: 1,
	buildOptions: [],
	factionBuildingCount: 0,
	motorPoolCount: 0,
	totalDeposits: 0,
	currentTurn: 1,
	rememberedEnemies: [],
	factionCenter: { x: 8, z: 8 },
	mineableTiles: [],
	unitCount: 0,
	popCap: 12,
	cultThreats: [],
	factionAllies: [],
	enemyHeadings: new Map(),
	hasResearchLab: false,
	isResearching: false,
	researchedTechCount: 0,
};

export function setTurnContext(ctx: TurnContext): void {
	_ctx = ctx;
}

function manhattan(ax: number, az: number, bx: number, bz: number): number {
	return Math.abs(ax - bx) + Math.abs(az - bz);
}

// ---------------------------------------------------------------------------
// Attack Evaluator
// ---------------------------------------------------------------------------

export class AttackEvaluator extends GoalEvaluator<SyntheteriaAgent> {
	calculateDesirability(agent: SyntheteriaAgent): number {
		if (agent.attackRange === 0 || agent.attack === 0) return 0;

		let best = 0;
		for (const enemy of _ctx.enemies) {
			const dist = manhattan(agent.tileX, agent.tileZ, enemy.x, enemy.z);
			if (dist <= agent.attackRange) {
				// In range — very high desirability so attack ALWAYS wins over idle/expand
				// Adjacent enemies (dist <= 1) get near-maximum score regardless of aggression
				if (dist <= 1) {
					// Adjacent: always attack — hard floor of 0.95 ignores aggressionMult
					best = Math.max(best, 0.95);
				} else {
					const score = 0.85 + (1 - dist / Math.max(agent.attackRange, 1)) * 0.1;
					if (score > best) best = score;
				}
			}
		}
		// Adjacent attacks bypass aggressionMult — they ALWAYS happen
		if (best >= 0.95) return best;
		return best * _ctx.aggressionMult;
	}

	setGoal(agent: SyntheteriaAgent): void {
		// Find the best attack target
		let bestTarget: (typeof _ctx.enemies)[0] | null = null;
		let bestDist = Infinity;
		for (const enemy of _ctx.enemies) {
			const dist = manhattan(agent.tileX, agent.tileZ, enemy.x, enemy.z);
			if (dist <= agent.attackRange && dist < bestDist) {
				bestDist = dist;
				bestTarget = enemy;
			}
		}
		if (bestTarget) {
			agent.decidedAction = {
				type: "attack",
				targetEntityId: bestTarget.entityId,
				damage: Math.max(1, agent.attack),
			};
		}
	}
}

// ---------------------------------------------------------------------------
// Chase Enemy Evaluator
// ---------------------------------------------------------------------------

export class ChaseEnemyEvaluator extends GoalEvaluator<SyntheteriaAgent> {
	/** If true, only chase enemies within scanRange. */
	reactiveOnly = false;

	calculateDesirability(agent: SyntheteriaAgent): number {
		if (agent.attackRange === 0) return 0;

		let best = 0;

		// Check currently visible enemies
		for (const enemy of _ctx.enemies) {
			const dist = manhattan(agent.tileX, agent.tileZ, enemy.x, enemy.z);
			if (this.reactiveOnly && dist > agent.scanRange) continue;
			// Already in attack range — AttackEvaluator handles it
			if (dist <= agent.attackRange) continue;

			const proximityScore = Math.max(0, 1 - dist / 30);
			if (proximityScore > best) best = proximityScore;
		}

		// Also consider remembered enemies (stale intel) at reduced weight
		for (const enemy of _ctx.rememberedEnemies) {
			const dist = manhattan(agent.tileX, agent.tileZ, enemy.x, enemy.z);
			// Remembered positions are less reliable — use wider range, lower score
			const proximityScore = Math.max(0, 1 - dist / 40) * 0.6;
			if (proximityScore > best) best = proximityScore;
		}

		return best * _ctx.aggressionMult;
	}

	setGoal(agent: SyntheteriaAgent): void {
		let bestEnemy: { entityId: number; x: number; z: number } | null = null;
		let bestDist = Infinity;

		// Prefer currently visible enemies
		for (const enemy of _ctx.enemies) {
			const dist = manhattan(agent.tileX, agent.tileZ, enemy.x, enemy.z);
			if (this.reactiveOnly && dist > agent.scanRange) continue;
			if (dist <= agent.attackRange) continue;
			if (dist < bestDist) {
				bestDist = dist;
				bestEnemy = enemy;
			}
		}

		// Fall back to remembered enemies if no visible targets
		if (!bestEnemy) {
			for (const enemy of _ctx.rememberedEnemies) {
				const dist = manhattan(agent.tileX, agent.tileZ, enemy.x, enemy.z);
				if (dist < bestDist) {
					bestDist = dist;
					bestEnemy = enemy;
				}
			}
		}

		if (bestEnemy) {
			// Check if pursuit intercept is beneficial
			const heading = _ctx.enemyHeadings.get(bestEnemy.entityId);
			const hdx = heading?.dx ?? 0;
			const hdz = heading?.dz ?? 0;

			if (
				shouldUsePursuit(
					agent.tileX,
					agent.tileZ,
					bestEnemy.x,
					bestEnemy.z,
					hdx,
					hdz,
				)
			) {
				const intercept = computeInterceptTarget(
					agent.tileX,
					agent.tileZ,
					bestEnemy.x,
					bestEnemy.z,
					hdx,
					hdz,
					_ctx.boardSize.width,
					_ctx.boardSize.height,
				);
				agent.decidedAction = {
					type: "move",
					toX: intercept.x,
					toZ: intercept.z,
				};
			} else {
				agent.decidedAction = {
					type: "move",
					toX: bestEnemy.x,
					toZ: bestEnemy.z,
				};
			}
		}
	}
}

// ---------------------------------------------------------------------------
// Harvest Evaluator
// ---------------------------------------------------------------------------

export class HarvestEvaluator extends GoalEvaluator<SyntheteriaAgent> {
	calculateDesirability(agent: SyntheteriaAgent): number {
		if (_ctx.totalDeposits === 0) return 0;

		let best = 0;
		for (const dep of _ctx.deposits) {
			const dist = manhattan(agent.tileX, agent.tileZ, dep.x, dep.z);
			if (dist <= 1) {
				// Adjacent — highest desirability
				best = Math.max(best, 0.95);
			} else if (dist <= agent.scanRange * 2) {
				// Nearby — high desirability, tapers with distance
				const score = 0.85 * (1 - dist / (agent.scanRange * 2));
				best = Math.max(best, score);
			} else {
				// Distant deposit — still worth going after (reduced score)
				// This prevents the AI from giving up when nearby deposits are depleted
				const score = Math.max(0.15, 0.5 * (1 - dist / 60));
				best = Math.max(best, score);
			}
		}
		return best;
	}

	setGoal(agent: SyntheteriaAgent): void {
		// Search ALL deposits, not just nearby ones — find closest on entire board
		let bestDep: (typeof _ctx.deposits)[0] | null = null;
		let bestDist = Infinity;
		for (const dep of _ctx.deposits) {
			const dist = manhattan(agent.tileX, agent.tileZ, dep.x, dep.z);
			if (dist < bestDist) {
				bestDist = dist;
				bestDep = dep;
			}
		}
		if (bestDep) {
			if (bestDist <= 1) {
				// Adjacent — harvest directly
				agent.decidedAction = {
					type: "harvest",
					depositEntityId: bestDep.entityId,
					targetX: bestDep.x,
					targetZ: bestDep.z,
				};
			} else {
				// Move toward deposit (even if far away)
				agent.decidedAction = {
					type: "move",
					toX: bestDep.x,
					toZ: bestDep.z,
				};
			}
		}
	}
}

// ---------------------------------------------------------------------------
// Expand Evaluator
// ---------------------------------------------------------------------------

export class ExpandEvaluator extends GoalEvaluator<SyntheteriaAgent> {
	calculateDesirability(_agent: SyntheteriaAgent): number {
		// Time-based escalation: desire to expand grows over the first 20 turns
		// Higher floor (0.5) so scouts push outward from turn 1
		const timeRamp = Math.min(1, _ctx.currentTurn / 20);
		const base = 0.5 + 0.4 * timeRamp;

		return Math.min(1, base);
	}

	setGoal(agent: SyntheteriaAgent): void {
		// Priority 1: Move toward remembered enemies (stale intel)
		if (_ctx.rememberedEnemies.length > 0) {
			let closest: (typeof _ctx.rememberedEnemies)[0] | null = null;
			let closestDist = Infinity;
			for (const enemy of _ctx.rememberedEnemies) {
				const dist = manhattan(agent.tileX, agent.tileZ, enemy.x, enemy.z);
				if (dist < closestDist) {
					closestDist = dist;
					closest = enemy;
				}
			}
			if (closest) {
				agent.decidedAction = {
					type: "move",
					toX: closest.x,
					toZ: closest.z,
				};
				return;
			}
		}

		// Priority 2: Multi-base expansion — workers with enough resources
		// should head far from faction center to found outposts
		const isWorkerLike = agent.attack === 0;
		const hasEnoughUnits = _ctx.unitCount >= 6;
		if (isWorkerLike && hasEnoughUnits) {
			const { width, height } = _ctx.boardSize;
			const fc = _ctx.factionCenter;
			// Pick a target at least 15 tiles from faction center
			const candidates = [
				{ x: Math.floor(width * 0.2), z: Math.floor(height * 0.2) },
				{ x: Math.floor(width * 0.8), z: Math.floor(height * 0.2) },
				{ x: Math.floor(width * 0.2), z: Math.floor(height * 0.8) },
				{ x: Math.floor(width * 0.8), z: Math.floor(height * 0.8) },
				{ x: Math.floor(width * 0.5), z: Math.floor(height * 0.2) },
				{ x: Math.floor(width * 0.5), z: Math.floor(height * 0.8) },
			];
			let bestCandidate = candidates[0];
			let bestDist = 0;
			for (const c of candidates) {
				const distFromCenter = manhattan(fc.x, fc.z, c.x, c.z);
				if (distFromCenter > bestDist) {
					bestDist = distFromCenter;
					bestCandidate = c;
				}
			}
			if (bestDist >= 15) {
				agent.decidedAction = {
					type: "move",
					toX: bestCandidate.x,
					toZ: bestCandidate.z,
				};
				return;
			}
		}

		// Priority 3: Move away from faction center toward frontier
		const { width, height } = _ctx.boardSize;
		const fc = _ctx.factionCenter;
		// Direction vector from faction center outward through this unit
		const dx = agent.tileX - fc.x;
		const dz = agent.tileZ - fc.z;
		const len = Math.abs(dx) + Math.abs(dz);

		if (len > 0) {
			// Push much further (10 tiles) to spread across the map
			const targetX = Math.max(
				0,
				Math.min(width - 1, agent.tileX + Math.sign(dx) * 10),
			);
			const targetZ = Math.max(
				0,
				Math.min(height - 1, agent.tileZ + Math.sign(dz) * 10),
			);
			agent.decidedAction = {
				type: "move",
				toX: targetX,
				toZ: targetZ,
			};
		} else {
			// Unit is exactly at faction center — pick a distant board quadrant
			const quadrants = [
				{ x: Math.floor(width * 0.2), z: Math.floor(height * 0.2) },
				{ x: Math.floor(width * 0.8), z: Math.floor(height * 0.2) },
				{ x: Math.floor(width * 0.2), z: Math.floor(height * 0.8) },
				{ x: Math.floor(width * 0.8), z: Math.floor(height * 0.8) },
			];
			// Pick furthest from current position
			let best = quadrants[0];
			let bestD = 0;
			for (const q of quadrants) {
				const d = manhattan(agent.tileX, agent.tileZ, q.x, q.z);
				if (d > bestD) { bestD = d; best = q; }
			}
			agent.decidedAction = {
				type: "move",
				toX: best.x,
				toZ: best.z,
			};
		}
	}
}

// ---------------------------------------------------------------------------
// Build Evaluator — place buildings when resources allow
// ---------------------------------------------------------------------------

/**
 * AI building priority order:
 *   1. storm_transmitter — power first (foundation for everything)
 *   2. motor_pool — enables unit fabrication (essential)
 *   3. research_lab — tech progress (without this, no specializations)
 *   4. outpost — territory + pop cap expansion
 *   5. motor_pool (second) — throughput when first is busy
 *   6. storage_hub — storage (low priority)
 *   7. defense_turret — defense when under threat
 *   8. relay_tower — signal coverage
 */
const BUILD_PRIORITY: string[] = [
	"storm_transmitter",
	"motor_pool",
	"research_lab",
	"outpost",
	"storage_hub",
	"defense_turret",
	"relay_tower",
];

export class BuildEvaluator extends GoalEvaluator<SyntheteriaAgent> {
	calculateDesirability(_agent: SyntheteriaAgent): number {
		const hasBuildOptions = _ctx.buildOptions.length > 0;

		// Higher desire when faction has few buildings — saturates at 30
		const buildingBonus = Math.max(0, 1 - _ctx.factionBuildingCount / 30);
		// Strong desire if fewer than 2 motor pools — need fabrication throughput
		const motorPoolBonus = _ctx.motorPoolCount < 2 ? 0.5 - _ctx.motorPoolCount * 0.25 : 0;
		// Time ramp: AI should build more as game progresses
		const timeRamp = Math.min(1, _ctx.currentTurn / 20);

		if (hasBuildOptions) {
			// Can afford something — high desire
			return Math.min(
				1,
				0.55 + buildingBonus * 0.3 + motorPoolBonus + timeRamp * 0.15,
			);
		}

		// Can't afford anything yet — maintain moderate desire if the faction
		// has infrastructure (drives units to harvest toward building goals)
		// but return 0 if no buildings exist (nothing to build toward yet)
		if (_ctx.factionBuildingCount === 0 && _ctx.motorPoolCount === 0) return 0;
		return Math.min(1, 0.2 + buildingBonus * 0.15 + motorPoolBonus * 0.5);
	}

	setGoal(agent: SyntheteriaAgent): void {
		// When near pop cap (>= 80%), outpost gets top priority to raise the ceiling
		const nearPopCap =
			_ctx.popCap > 0 && _ctx.unitCount >= _ctx.popCap * 0.8;

		let best: BuildOption | null = null;
		let bestPriority = BUILD_PRIORITY.length;

		for (const opt of _ctx.buildOptions) {
			let priority: number;
			if (nearPopCap && opt.buildingType === "outpost") {
				// Outpost jumps to top priority when near pop cap
				priority = -1;
			} else {
				const idx = BUILD_PRIORITY.indexOf(opt.buildingType);
				priority = idx >= 0 ? idx : BUILD_PRIORITY.length;
			}
			if (priority < bestPriority) {
				bestPriority = priority;
				best = opt;
			}
		}

		if (!best) best = _ctx.buildOptions[0];

		if (best) {
			const dist = manhattan(agent.tileX, agent.tileZ, best.tileX, best.tileZ);
			if (dist <= 3) {
				agent.decidedAction = {
					type: "build",
					buildingType: best.buildingType,
					tileX: best.tileX,
					tileZ: best.tileZ,
				};
			} else {
				agent.decidedAction = {
					type: "move",
					toX: best.tileX,
					toZ: best.tileZ,
				};
			}
		}
	}
}

// ---------------------------------------------------------------------------
// Research Evaluator — queue tech research when a lab exists and idle
// ---------------------------------------------------------------------------

export class ResearchEvaluator extends GoalEvaluator<SyntheteriaAgent> {
	calculateDesirability(_agent: SyntheteriaAgent): number {
		// No lab → can't research
		if (!_ctx.hasResearchLab) return 0;
		// Already researching → no action needed
		if (_ctx.isResearching) return 0;
		// Lab exists, no active research → high priority
		// More urgent early game when no techs yet
		const urgency = _ctx.researchedTechCount === 0 ? 0.95 : 0.8;
		return urgency;
	}

	setGoal(agent: SyntheteriaAgent): void {
		// Signal to the turn system that this faction needs to pick a tech
		agent.decidedAction = { type: "idle" };
	}
}

// ---------------------------------------------------------------------------
// Scout Evaluator — explore outward to discover new deposits
// ---------------------------------------------------------------------------

export class ScoutEvaluator extends GoalEvaluator<SyntheteriaAgent> {
	calculateDesirability(agent: SyntheteriaAgent): number {
		const nearbyCount = _ctx.deposits.filter(
			(d) =>
				manhattan(agent.tileX, agent.tileZ, d.x, d.z) <= agent.scanRange * 2,
		).length;

		// After turn 10, scouting becomes relevant even if deposits are nearby
		// — factions need to discover other factions, not just harvest
		const timeBoost =
			_ctx.currentTurn > 10 ? Math.min(0.4, (_ctx.currentTurn - 10) / 50) : 0;

		// No enemies ever encountered — need to find them
		const noEnemiesBoost =
			_ctx.enemies.length === 0 && _ctx.rememberedEnemies.length === 0
				? 0.3
				: 0;

		if (nearbyCount > 0) {
			// Even with nearby deposits, scout if time has passed and no enemies found
			return Math.min(1, timeBoost + noEnemiesBoost);
		}

		if (_ctx.totalDeposits === 0)
			return Math.min(1, 0.1 + timeBoost + noEnemiesBoost);

		// No nearby deposits but some exist on the board — go find them
		return Math.min(1, 0.6 + timeBoost + noEnemiesBoost);
	}

	setGoal(agent: SyntheteriaAgent): void {
		// Priority 1: If no enemies encountered, explore toward distant quadrants
		const noEnemies =
			_ctx.enemies.length === 0 && _ctx.rememberedEnemies.length === 0;
		if (noEnemies) {
			const { width, height } = _ctx.boardSize;
			const quadrants = [
				{ x: Math.floor(width * 0.25), z: Math.floor(height * 0.25) },
				{ x: Math.floor(width * 0.75), z: Math.floor(height * 0.25) },
				{ x: Math.floor(width * 0.25), z: Math.floor(height * 0.75) },
				{ x: Math.floor(width * 0.75), z: Math.floor(height * 0.75) },
			];
			let furthest = quadrants[0];
			let furthestDist = 0;
			for (const q of quadrants) {
				const dist = manhattan(agent.tileX, agent.tileZ, q.x, q.z);
				if (dist > furthestDist) {
					furthestDist = dist;
					furthest = q;
				}
			}
			agent.decidedAction = {
				type: "move",
				toX: furthest.x,
				toZ: furthest.z,
			};
			return;
		}

		// Priority 2: Find the closest deposit anywhere on the board
		let bestDep: (typeof _ctx.deposits)[0] | null = null;
		let bestDist = Infinity;
		for (const dep of _ctx.deposits) {
			const dist = manhattan(agent.tileX, agent.tileZ, dep.x, dep.z);
			if (dist < bestDist) {
				bestDist = dist;
				bestDep = dep;
			}
		}

		if (bestDep) {
			agent.decidedAction = {
				type: "move",
				toX: bestDep.x,
				toZ: bestDep.z,
			};
			return;
		}

		// Fallback: explore toward a distant board quadrant
		const { width, height } = _ctx.boardSize;
		const quadrants = [
			{ x: Math.floor(width * 0.25), z: Math.floor(height * 0.25) },
			{ x: Math.floor(width * 0.75), z: Math.floor(height * 0.25) },
			{ x: Math.floor(width * 0.25), z: Math.floor(height * 0.75) },
			{ x: Math.floor(width * 0.75), z: Math.floor(height * 0.75) },
		];
		let furthest = quadrants[0];
		let furthestDist = 0;
		for (const q of quadrants) {
			const dist = manhattan(agent.tileX, agent.tileZ, q.x, q.z);
			if (dist > furthestDist) {
				furthestDist = dist;
				furthest = q;
			}
		}
		agent.decidedAction = {
			type: "move",
			toX: furthest.x,
			toZ: furthest.z,
		};
	}
}

// ---------------------------------------------------------------------------
// Floor Mine Evaluator — backstop economy when salvage is scarce
// ---------------------------------------------------------------------------

export class FloorMineEvaluator extends GoalEvaluator<SyntheteriaAgent> {
	calculateDesirability(agent: SyntheteriaAgent): number {
		if (_ctx.mineableTiles.length === 0) return 0;

		// Only desirable when no salvage deposits are nearby
		const nearbyDeposits = _ctx.deposits.filter(
			(d) =>
				manhattan(agent.tileX, agent.tileZ, d.x, d.z) <= agent.scanRange * 2,
		).length;

		// If salvage exists nearby, prefer harvesting over mining
		if (nearbyDeposits > 0) return 0.1;

		// No nearby salvage — floor mining becomes relevant
		const nearbyMineable = _ctx.mineableTiles.filter(
			(t) => manhattan(agent.tileX, agent.tileZ, t.x, t.z) <= 1,
		).length;

		// Adjacent mineable tile — high desirability
		if (nearbyMineable > 0) return 0.7;

		// Mineable tiles exist but not adjacent — moderate desire to move there
		return 0.4;
	}

	setGoal(agent: SyntheteriaAgent): void {
		let closest: (typeof _ctx.mineableTiles)[0] | null = null;
		let closestDist = Infinity;
		for (const tile of _ctx.mineableTiles) {
			const dist = manhattan(agent.tileX, agent.tileZ, tile.x, tile.z);
			if (dist < closestDist) {
				closestDist = dist;
				closest = tile;
			}
		}

		if (!closest) return;

		if (closestDist <= 1) {
			agent.decidedAction = {
				type: "mine",
				targetX: closest.x,
				targetZ: closest.z,
			};
		} else {
			agent.decidedAction = {
				type: "move",
				toX: closest.x,
				toZ: closest.z,
			};
		}
	}
}

// ---------------------------------------------------------------------------
// Evade Evaluator — flee when outnumbered by cult
// ---------------------------------------------------------------------------

export class EvadeEvaluator extends GoalEvaluator<SyntheteriaAgent> {
	calculateDesirability(agent: SyntheteriaAgent): number {
		if (_ctx.cultThreats.length === 0) return 0;

		return computeEvadeDesirability(
			agent.tileX,
			agent.tileZ,
			agent.hp,
			10, // maxHp — use UnitStats.maxHp if available via agent
			agent.scanRange,
			_ctx.cultThreats,
			_ctx.factionAllies,
		);
	}

	setGoal(agent: SyntheteriaAgent): void {
		const fleeDir = computeFleeDirection(
			agent.tileX,
			agent.tileZ,
			_ctx.cultThreats,
			agent.scanRange,
		);

		if (fleeDir.dx === 0 && fleeDir.dz === 0) {
			agent.decidedAction = { type: "idle" };
			return;
		}

		// Move 3-5 tiles in the flee direction
		const fleeDistance = 4;
		const targetX = Math.round(agent.tileX + fleeDir.dx * fleeDistance);
		const targetZ = Math.round(agent.tileZ + fleeDir.dz * fleeDistance);

		// Clamp to board bounds
		const { width, height } = _ctx.boardSize;
		agent.decidedAction = {
			type: "move",
			toX: Math.max(0, Math.min(width - 1, targetX)),
			toZ: Math.max(0, Math.min(height - 1, targetZ)),
		};
	}
}

// ---------------------------------------------------------------------------
// Idle/Defend Evaluator — baseline fallback
// ---------------------------------------------------------------------------

export class IdleEvaluator extends GoalEvaluator<SyntheteriaAgent> {
	calculateDesirability(_agent: SyntheteriaAgent): number {
		// Near-zero fallback — idle should NEVER win when any productive action
		// is possible. Only wins when every other evaluator returns 0.
		return 0.05;
	}

	setGoal(agent: SyntheteriaAgent): void {
		agent.decidedAction = { type: "idle" };
	}
}

// ---------------------------------------------------------------------------
// Diagnostic logging
// ---------------------------------------------------------------------------

let _diagnosticsEnabled = false;

export function enableAIDiagnostics(enabled: boolean): void {
	_diagnosticsEnabled = enabled;
}

export function isAIDiagnosticsEnabled(): boolean {
	return _diagnosticsEnabled;
}

/**
 * Log which evaluator won arbitration for a given agent.
 * Called from the AI turn system after arbitrate().
 */
export function logEvaluatorChoice(
	agent: SyntheteriaAgent,
	evaluators: GoalEvaluator<SyntheteriaAgent>[],
): void {
	if (!_diagnosticsEnabled) return;

	const names = [
		"Attack",
		"Chase",
		"Harvest",
		"Expand",
		"Build",
		"Research",
		"Scout",
		"FloorMine",
		"Evade",
		"Idle",
	];
	const scores: string[] = [];
	let bestIdx = 0;
	let bestScore = -1;

	for (let i = 0; i < evaluators.length; i++) {
		const desirability = evaluators[i].calculateDesirability(agent);
		const bias = evaluators[i].characterBias;
		const effective = desirability * bias;
		scores.push(
			`${names[i] ?? `E${i}`}=${effective.toFixed(2)}(d=${desirability.toFixed(2)}*b=${bias.toFixed(2)})`,
		);
		if (effective > bestScore) {
			bestScore = effective;
			bestIdx = i;
		}
	}

	console.log(
		`[AI] ${agent.factionId} unit@(${agent.tileX},${agent.tileZ}): ` +
			`CHOSE ${names[bestIdx] ?? `E${bestIdx}`} | ${scores.join(" ")}`,
	);
}
