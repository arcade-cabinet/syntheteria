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
	/** Whether the faction has a motor pool (can fabricate units). */
	hasMotorPool: boolean;
	/** Number of non-depleted deposits on the entire board. */
	totalDeposits: number;
	/** Current game turn (1-based). */
	currentTurn: number;
	/** Enemy positions remembered from perception (may include stale intel). */
	rememberedEnemies: Array<{ entityId: number; x: number; z: number; factionId: string }>;
	/** Faction's average unit position — centroid of owned units. */
	factionCenter: { x: number; z: number };
	/** Mineable tiles near faction units (for floor mining backstop). */
	mineableTiles: Array<{ x: number; z: number; material: string }>;
}

let _ctx: TurnContext = {
	enemies: [],
	deposits: [],
	boardCenter: { x: 8, z: 8 },
	boardSize: { width: 16, height: 16 },
	aggressionMult: 1,
	buildOptions: [],
	factionBuildingCount: 0,
	hasMotorPool: false,
	totalDeposits: 0,
	currentTurn: 1,
	rememberedEnemies: [],
	factionCenter: { x: 8, z: 8 },
	mineableTiles: [],
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
				// In range — high desirability, closer = better
				const score = 0.9 + (1 - dist / Math.max(agent.attackRange, 1)) * 0.1;
				if (score > best) best = score;
			}
		}
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
		let bestTarget: { x: number; z: number } | null = null;
		let bestDist = Infinity;

		// Prefer currently visible enemies
		for (const enemy of _ctx.enemies) {
			const dist = manhattan(agent.tileX, agent.tileZ, enemy.x, enemy.z);
			if (this.reactiveOnly && dist > agent.scanRange) continue;
			if (dist <= agent.attackRange) continue;
			if (dist < bestDist) {
				bestDist = dist;
				bestTarget = { x: enemy.x, z: enemy.z };
			}
		}

		// Fall back to remembered enemies if no visible targets
		if (!bestTarget) {
			for (const enemy of _ctx.rememberedEnemies) {
				const dist = manhattan(agent.tileX, agent.tileZ, enemy.x, enemy.z);
				if (dist < bestDist) {
					bestDist = dist;
					bestTarget = { x: enemy.x, z: enemy.z };
				}
			}
		}

		if (bestTarget) {
			agent.decidedAction = {
				type: "move",
				toX: bestTarget.x,
				toZ: bestTarget.z,
			};
		}
	}
}

// ---------------------------------------------------------------------------
// Harvest Evaluator
// ---------------------------------------------------------------------------

export class HarvestEvaluator extends GoalEvaluator<SyntheteriaAgent> {
	calculateDesirability(agent: SyntheteriaAgent): number {
		let best = 0;
		for (const dep of _ctx.deposits) {
			const dist = manhattan(agent.tileX, agent.tileZ, dep.x, dep.z);
			if (dist > agent.scanRange * 2) continue;
			// Adjacent deposits are highly desirable; score tapers with distance
			const score = dist <= 1
				? 0.95
				: Math.max(0, 0.85 * (1 - dist / (agent.scanRange * 2)));
			if (score > best) best = score;
		}
		return best;
	}

	setGoal(agent: SyntheteriaAgent): void {
		let bestDep: (typeof _ctx.deposits)[0] | null = null;
		let bestDist = Infinity;
		for (const dep of _ctx.deposits) {
			const dist = manhattan(agent.tileX, agent.tileZ, dep.x, dep.z);
			if (dist > agent.scanRange * 2) continue;
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
				// Move toward deposit
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
		// Time-based escalation: desire to expand grows over the first 40 turns
		const timeRamp = Math.min(1, _ctx.currentTurn / 40);
		const base = 0.3 + 0.5 * timeRamp;

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

		// Priority 2: Move away from faction center toward frontier
		const { width, height } = _ctx.boardSize;
		const fc = _ctx.factionCenter;
		// Direction vector from faction center outward through this unit
		const dx = agent.tileX - fc.x;
		const dz = agent.tileZ - fc.z;
		const len = Math.abs(dx) + Math.abs(dz);

		if (len > 0) {
			// Push further in the same direction, clamped to board
			const targetX = Math.max(0, Math.min(width - 1,
				agent.tileX + Math.sign(dx) * 5));
			const targetZ = Math.max(0, Math.min(height - 1,
				agent.tileZ + Math.sign(dz) * 5));
			agent.decidedAction = {
				type: "move",
				toX: targetX,
				toZ: targetZ,
			};
		} else {
			// Unit is exactly at faction center — move toward board center
			agent.decidedAction = {
				type: "move",
				toX: _ctx.boardCenter.x,
				toZ: _ctx.boardCenter.z,
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
 *   2. storage_hub — increases resource capacity for stockpiling
 *   3. motor_pool — enables unit fabrication (needs silicon_wafer from salvage)
 *   4. outpost — cheap territorial expansion
 *   5. defense_turret — territorial defense
 *   6. relay_tower — signal coverage
 */
const BUILD_PRIORITY: string[] = [
	"storm_transmitter",
	"storage_hub",
	"motor_pool",
	"outpost",
	"defense_turret",
	"relay_tower",
];

export class BuildEvaluator extends GoalEvaluator<SyntheteriaAgent> {
	calculateDesirability(_agent: SyntheteriaAgent): number {
		if (_ctx.buildOptions.length === 0) return 0;

		// Higher desire when faction has few buildings — saturates at 20 not 8
		const buildingBonus = Math.max(0, 1 - _ctx.factionBuildingCount / 20);
		// Strong desire if no motor pool — can't fabricate units without one
		const motorPoolBonus = _ctx.hasMotorPool ? 0 : 0.5;
		// Time ramp: AI should build more as game progresses
		const timeRamp = Math.min(1, _ctx.currentTurn / 20);

		return Math.min(1, 0.45 + buildingBonus * 0.35 + motorPoolBonus + timeRamp * 0.15);
	}

	setGoal(agent: SyntheteriaAgent): void {
		let best: BuildOption | null = null;
		let bestPriority = BUILD_PRIORITY.length;

		for (const opt of _ctx.buildOptions) {
			const idx = BUILD_PRIORITY.indexOf(opt.buildingType);
			const priority = idx >= 0 ? idx : BUILD_PRIORITY.length;
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
// Scout Evaluator — explore outward to discover new deposits
// ---------------------------------------------------------------------------

export class ScoutEvaluator extends GoalEvaluator<SyntheteriaAgent> {
	calculateDesirability(agent: SyntheteriaAgent): number {
		const nearbyCount = _ctx.deposits.filter(
			(d) => manhattan(agent.tileX, agent.tileZ, d.x, d.z) <= agent.scanRange * 2,
		).length;

		// After turn 10, scouting becomes relevant even if deposits are nearby
		// — factions need to discover other factions, not just harvest
		const timeBoost = _ctx.currentTurn > 10
			? Math.min(0.4, (_ctx.currentTurn - 10) / 50)
			: 0;

		// No enemies ever encountered — need to find them
		const noEnemiesBoost =
			_ctx.enemies.length === 0 && _ctx.rememberedEnemies.length === 0
				? 0.3
				: 0;

		if (nearbyCount > 0) {
			// Even with nearby deposits, scout if time has passed and no enemies found
			return Math.min(1, timeBoost + noEnemiesBoost);
		}

		if (_ctx.totalDeposits === 0) return Math.min(1, 0.1 + timeBoost + noEnemiesBoost);

		// No nearby deposits but some exist on the board — go find them
		return Math.min(1, 0.6 + timeBoost + noEnemiesBoost);
	}

	setGoal(agent: SyntheteriaAgent): void {
		// Priority 1: If no enemies encountered, explore toward distant quadrants
		const noEnemies = _ctx.enemies.length === 0 && _ctx.rememberedEnemies.length === 0;
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
			(d) => manhattan(agent.tileX, agent.tileZ, d.x, d.z) <= agent.scanRange * 2,
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
// Idle/Defend Evaluator — baseline fallback
// ---------------------------------------------------------------------------

export class IdleEvaluator extends GoalEvaluator<SyntheteriaAgent> {
	calculateDesirability(_agent: SyntheteriaAgent): number {
		// Baseline score — defensive factions (high idle bias) stay put more
		return 0.3;
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

	const names = ["Attack", "Chase", "Harvest", "Expand", "Build", "Scout", "FloorMine", "Idle"];
	const scores: string[] = [];
	let bestIdx = 0;
	let bestScore = -1;

	for (let i = 0; i < evaluators.length; i++) {
		const desirability = evaluators[i].calculateDesirability(agent);
		const bias = evaluators[i].characterBias;
		const effective = desirability * bias;
		scores.push(`${names[i] ?? `E${i}`}=${effective.toFixed(2)}(d=${desirability.toFixed(2)}*b=${bias.toFixed(2)})`);
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
