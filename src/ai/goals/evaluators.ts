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
	computeInterposeDesirability,
	findInterposeTarget,
	computeInterposePoint,
	type UnitInfo,
} from "../steering/interposeSteering";
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
	/** Detailed ally info for interpose (support units). */
	allyUnits: UnitInfo[];
	/** Detailed enemy info for interpose (support units). */
	enemyUnits: UnitInfo[];
	/** Faction's total territory tile count (for wormhole evaluator). */
	factionTerritoryCount: number;
	/** Whether the faction is the strongest (most territory + units). */
	isStrongestFaction: boolean;
	/** Count of each building type the faction currently owns. */
	existingBuildingTypes: Record<string, number>;
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
	allyUnits: [],
	enemyUnits: [],
	factionTerritoryCount: 0,
	isStrongestFaction: false,
	existingBuildingTypes: {},
};

export function setTurnContext(ctx: TurnContext): void {
	_ctx = ctx;
}

function manhattan(ax: number, az: number, bx: number, bz: number): number {
	return Math.abs(ax - bx) + Math.abs(az - bz);
}

// ---------------------------------------------------------------------------
// Response curve helpers — smooth scoring, no if/else thresholds
// ---------------------------------------------------------------------------

/** Logistic curve: smooth ramp from 0 to 1, centered at midpoint. k controls steepness. */
function logistic(x: number, midpoint: number, k = 1): number {
	return 1 / (1 + Math.exp(-k * (x - midpoint)));
}

/** Quadratic decay: 1.0 at dist=0, 0 at dist=maxDist, never negative. */
function quadraticDecay(dist: number, maxDist: number): number {
	const t = Math.min(1, dist / maxDist);
	return Math.max(0, 1 - t * t);
}

/**
 * Momentum bonus: +0.1 if the agent's last action matches the given type.
 * Encourages units to finish what they started. NEVER applies to idle.
 */
function momentumBonus(agent: SyntheteriaAgent, actionType: string): number {
	if (actionType === "idle") return 0;
	return agent.lastActionType === actionType ? 0.1 : 0;
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
				// Smooth quadratic decay: closer = higher score
				// Adjacent (dist<=1) → 0.95, at max range → ~0.85
				const score = 0.85 + 0.10 * quadraticDecay(dist, Math.max(agent.attackRange, 1));
				best = Math.max(best, score);
			}
		}

		// Time escalation: aggression rises after turn 30 even without adjacent enemies
		// Only applies when enemies exist on the map (drives units to seek combat)
		const timeAggression = _ctx.enemies.length > 0
			? logistic(_ctx.currentTurn, 30, 0.15) * 0.2
			: 0;
		if (best === 0) return Math.min(1, timeAggression);

		// Adjacent attacks (score >= 0.93) bypass aggressionMult — always fight back
		if (best >= 0.93) return Math.min(1, best + momentumBonus(agent, "attack"));
		return Math.min(1, best * _ctx.aggressionMult + timeAggression + momentumBonus(agent, "attack"));
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

		// Check currently visible enemies — smooth quadratic decay over distance
		for (const enemy of _ctx.enemies) {
			const dist = manhattan(agent.tileX, agent.tileZ, enemy.x, enemy.z);
			if (this.reactiveOnly && dist > agent.scanRange) continue;
			// Already in attack range — AttackEvaluator handles it
			if (dist <= agent.attackRange) continue;

			const score = quadraticDecay(dist, 30);
			if (score > best) best = score;
		}

		// Also consider remembered enemies (stale intel) — wider range, damped
		for (const enemy of _ctx.rememberedEnemies) {
			const dist = manhattan(agent.tileX, agent.tileZ, enemy.x, enemy.z);
			const score = quadraticDecay(dist, 40) * 0.6;
			if (score > best) best = score;
		}

		// Time escalation: willingness to pursue increases mid-game
		// Only applies when there are enemies to actually chase
		const chaseTimeBoost = best > 0
			? logistic(_ctx.currentTurn, 20, 0.2) * 0.15
			: 0;
		return Math.min(1, best * _ctx.aggressionMult + chaseTimeBoost + momentumBonus(agent, "move"));
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
			} else {
				// Smooth decay over distance, floor at 0.15 so AI always has
				// motivation to seek deposits anywhere on the board
				const score = Math.max(0.15, 0.85 * quadraticDecay(dist, 50));
				best = Math.max(best, score);
			}
		}

		// Time escalation: if no nearby deposits and it's been a while, urgency rises
		if (best < 0.5 && _ctx.currentTurn > 10) {
			const escalation = Math.min(0.15, (_ctx.currentTurn - 10) / 200);
			best = Math.min(1, best + escalation);
		}

		return Math.min(1, best + momentumBonus(agent, "harvest"));
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
	calculateDesirability(agent: SyntheteriaAgent): number {
		// Logistic time ramp: smooth curve from 0.5 early to 0.9 late
		// Centered at turn 10, steepness 0.3 — gradual, not a cliff
		const timeScore = 0.5 + 0.4 * logistic(_ctx.currentTurn, 10, 0.3);

		// If faction hasn't expanded recently (no buildings growing), escalate
		const stagnationBonus = _ctx.factionBuildingCount < 4 && _ctx.currentTurn > 15
			? 0.1 : 0;

		return Math.min(1, timeScore + stagnationBonus + momentumBonus(agent, "move"));
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
 * Dynamic build priority — what the faction is MISSING matters more than
 * a static checklist. The economy chain is:
 *   power (transmitter) → raw materials (harvest) → refined (synthesizer)
 *   → buildings/research_lab → tech → specialized units
 *
 * If the faction has zero of a critical building, that jumps to top priority.
 * Otherwise falls back to the static order for "nice to have" buildings.
 */
function dynamicBuildPriority(existingTypes: Record<string, number>): string[] {
	const priority: string[] = [];

	// Critical infrastructure gaps — order matters
	if ((existingTypes["synthesizer"] ?? 0) === 0) priority.push("synthesizer");
	if ((existingTypes["motor_pool"] ?? 0) === 0) priority.push("motor_pool");
	if ((existingTypes["storm_transmitter"] ?? 0) === 0) priority.push("storm_transmitter");
	if ((existingTypes["research_lab"] ?? 0) === 0) priority.push("research_lab");

	// Growth buildings
	priority.push(
		"outpost",
		"motor_pool",
		"synthesizer",
		"storm_transmitter",
		"storage_hub",
		"defense_turret",
		"relay_tower",
		"power_box",
	);

	return priority;
}

export class BuildEvaluator extends GoalEvaluator<SyntheteriaAgent> {
	calculateDesirability(agent: SyntheteriaAgent): number {
		const hasBuildOptions = _ctx.buildOptions.length > 0;

		// Smooth saturation curve: fewer buildings → higher desire
		const buildingBonus = quadraticDecay(_ctx.factionBuildingCount, 30);
		// Logistic motor pool urgency: 0 pools → 0.5 bonus, 1 → 0.25, 2+ → ~0
		const motorPoolBonus = _ctx.motorPoolCount < 2
			? 0.5 * quadraticDecay(_ctx.motorPoolCount, 2)
			: 0;
		// Smooth time ramp via logistic — centered at turn 10
		const timeRamp = logistic(_ctx.currentTurn, 10, 0.3);

		if (hasBuildOptions) {
			// Can afford something — high desire with smooth components
			return Math.min(
				1,
				0.55 + buildingBonus * 0.3 + motorPoolBonus + timeRamp * 0.15
					+ momentumBonus(agent, "build"),
			);
		}

		// Can't afford anything yet — maintain moderate desire if the faction
		// has infrastructure (drives units to harvest toward building goals)
		if (_ctx.factionBuildingCount === 0 && _ctx.motorPoolCount === 0) return 0;
		return Math.min(1, 0.2 + buildingBonus * 0.15 + motorPoolBonus * 0.5
			+ momentumBonus(agent, "build"));
	}

	setGoal(agent: SyntheteriaAgent): void {
		const buildPriority = dynamicBuildPriority(_ctx.existingBuildingTypes);

		// When near pop cap (>= 80%), outpost gets top priority to raise the ceiling
		const nearPopCap =
			_ctx.popCap > 0 && _ctx.unitCount >= _ctx.popCap * 0.8;

		let best: BuildOption | null = null;
		let bestPriority = buildPriority.length;

		for (const opt of _ctx.buildOptions) {
			let priority: number;
			if (nearPopCap && opt.buildingType === "outpost") {
				// Outpost jumps to top priority when near pop cap
				priority = -1;
			} else {
				const idx = buildPriority.indexOf(opt.buildingType);
				priority = idx >= 0 ? idx : buildPriority.length;
			}
			if (priority < bestPriority) {
				bestPriority = priority;
				best = opt;
			}
		}

		if (!best) best = _ctx.buildOptions[0];

		// Remove ALL options of the same building type from shared list
		// so other agents on the same faction don't build duplicates this turn.
		// Also bump the existingBuildingTypes count so subsequent agents see the
		// updated priority (prevents two agents both thinking "0 synthesizers").
		if (best) {
			for (let i = _ctx.buildOptions.length - 1; i >= 0; i--) {
				if (_ctx.buildOptions[i].buildingType === best.buildingType) {
					_ctx.buildOptions.splice(i, 1);
				}
			}
			_ctx.existingBuildingTypes[best.buildingType] =
				(_ctx.existingBuildingTypes[best.buildingType] ?? 0) + 1;
		}

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
		// Smooth decay: urgency decreases as more techs are researched
		// 0 techs → 0.95, 3 techs → ~0.75, 10 techs → ~0.5
		return Math.max(0.4, 0.95 * quadraticDecay(_ctx.researchedTechCount, 15));
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

		// Smooth time escalation via logistic — scouting becomes important mid-game
		const timeBoost = 0.4 * logistic(_ctx.currentTurn, 15, 0.2);

		// No enemies ever encountered — urgency to find them
		const noEnemiesBoost =
			_ctx.enemies.length === 0 && _ctx.rememberedEnemies.length === 0
				? 0.3
				: 0;

		let base: number;
		if (nearbyCount > 0) {
			// Deposits nearby — scouting only if time-driven or no enemies found
			base = timeBoost + noEnemiesBoost;
		} else if (_ctx.totalDeposits === 0) {
			// No deposits anywhere — light scouting
			base = 0.15 + timeBoost + noEnemiesBoost;
		} else {
			// No nearby deposits but some exist on the board — go find them
			base = 0.6 + timeBoost + noEnemiesBoost;
		}

		return Math.min(1, base + momentumBonus(agent, "move"));
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

		// Smooth proximity check: how close is the nearest mineable tile?
		let nearestMine = Infinity;
		for (const t of _ctx.mineableTiles) {
			const d = manhattan(agent.tileX, agent.tileZ, t.x, t.z);
			if (d < nearestMine) nearestMine = d;
		}

		// Smooth proximity check for deposits (prefer harvesting over mining)
		let nearestDeposit = Infinity;
		for (const d of _ctx.deposits) {
			const dist = manhattan(agent.tileX, agent.tileZ, d.x, d.z);
			if (dist < nearestDeposit) nearestDeposit = dist;
		}

		// If salvage deposits are close, floor mining is less appealing
		// Smooth curve: deposit at dist 0 → 0.1 score, deposit far → full mining score
		const depositPenalty = nearestDeposit <= agent.scanRange * 2
			? 0.6 * quadraticDecay(nearestDeposit, agent.scanRange * 2)
			: 0;

		// Mine score: high when adjacent, moderate when distant
		const mineScore = nearestMine <= 1 ? 0.7 : 0.15 + 0.25 * quadraticDecay(nearestMine, 15);

		// Time escalation: mining urgency rises when deposits are running out
		const mineTimeBoost = _ctx.totalDeposits < 10
			? logistic(_ctx.currentTurn, 25, 0.2) * 0.2
			: 0;

		return Math.min(1, Math.max(0.15, mineScore - depositPenalty) + mineTimeBoost
			+ momentumBonus(agent, "mine"));
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

		const baseEvade = computeEvadeDesirability(
			agent.tileX,
			agent.tileZ,
			agent.hp,
			10, // maxHp — use UnitStats.maxHp if available via agent
			agent.scanRange,
			_ctx.cultThreats,
			_ctx.factionAllies,
		);

		// Time escalation: evasion decreases late-game — factions get braver
		const braveryFactor = 1.0 - logistic(_ctx.currentTurn, 50, 0.1) * 0.3;
		return baseEvade * braveryFactor;
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
// Interpose Evaluator — support units shield threatened allies
// ---------------------------------------------------------------------------

export class InterposeEvaluator extends GoalEvaluator<SyntheteriaAgent> {
	calculateDesirability(agent: SyntheteriaAgent): number {
		// Only support-class units interpose (attack === 0 or low attack with defense > 0)
		// Support units have attack <= 1 and defense > 0 typically
		if (agent.attack > 2) return 0;

		return computeInterposeDesirability(
			agent.tileX,
			agent.tileZ,
			agent.scanRange,
			_ctx.allyUnits,
			_ctx.enemyUnits,
		);
	}

	setGoal(agent: SyntheteriaAgent): void {
		const target = findInterposeTarget(
			agent.tileX,
			agent.tileZ,
			agent.scanRange,
			_ctx.allyUnits,
			_ctx.enemyUnits,
		);
		if (!target) {
			agent.decidedAction = { type: "idle" };
			return;
		}

		const midpoint = computeInterposePoint(
			{ x: target.ally.x, z: target.ally.z },
			{ x: target.threat.x, z: target.threat.z },
		);

		agent.decidedAction = {
			type: "move",
			toX: midpoint.x,
			toZ: midpoint.z,
		};
	}
}

// ---------------------------------------------------------------------------
// Wormhole Evaluator — strongest faction pursues wormhole victory after turn 100
// ---------------------------------------------------------------------------

export class WormholeEvaluator extends GoalEvaluator<SyntheteriaAgent> {
	calculateDesirability(_agent: SyntheteriaAgent): number {
		// Only active after turn 100
		if (_ctx.currentTurn < 100) return 0;
		// Only the strongest faction pursues wormhole
		if (!_ctx.isStrongestFaction) return 0;
		// Need enough territory and units to justify endgame push
		if (_ctx.unitCount < 10) return 0;
		// High desirability — this is an endgame victory condition
		// Ramps up: turn 100 → 0.3, turn 200 → 0.6, turn 300+ → 0.9
		const turnRamp = Math.min(1, (_ctx.currentTurn - 100) / 200);
		return 0.3 + turnRamp * 0.6;
	}

	setGoal(agent: SyntheteriaAgent): void {
		// Move toward board center (wormhole stabilizer must be placed near center)
		agent.decidedAction = {
			type: "move",
			toX: _ctx.boardCenter.x,
			toZ: _ctx.boardCenter.z,
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
		"Interpose",
		"Wormhole",
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
