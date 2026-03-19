/**
 * Strategy GoalEvaluators — Expand, Scout, Research, Interpose, Wormhole, Idle.
 *
 * These evaluators handle territory expansion, exploration, tech research,
 * defensive support positioning, endgame victory conditions, and fallback idle.
 */

import { GoalEvaluator } from "yuka";
import type { SyntheteriaAgent } from "../agents/SyntheteriaAgent";
import {
	computeInterposeDesirability,
	findInterposeTarget,
	computeInterposePoint,
} from "../steering/interposeSteering";
import {
	getTurnContext,
	manhattan,
	quadraticDecay,
	logistic,
	momentumBonus,
} from "./turnContext";

// ---------------------------------------------------------------------------
// Expand Evaluator
// ---------------------------------------------------------------------------

export class ExpandEvaluator extends GoalEvaluator<SyntheteriaAgent> {
	calculateDesirability(agent: SyntheteriaAgent): number {
		const _ctx = getTurnContext();
		// Logistic time ramp: smooth curve from 0.5 early to 0.9 late
		// Centered at turn 10, steepness 0.3 — gradual, not a cliff
		const timeScore = 0.5 + 0.4 * logistic(_ctx.currentTurn, 10, 0.3);

		// If faction hasn't expanded recently (no buildings growing), escalate
		const stagnationBonus = _ctx.factionBuildingCount < 4 && _ctx.currentTurn > 15
			? 0.1 : 0;

		return Math.min(1, timeScore + stagnationBonus + momentumBonus(agent, "move"));
	}

	setGoal(agent: SyntheteriaAgent): void {
		const _ctx = getTurnContext();
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
// Scout Evaluator — explore outward to discover new deposits
// ---------------------------------------------------------------------------

export class ScoutEvaluator extends GoalEvaluator<SyntheteriaAgent> {
	calculateDesirability(agent: SyntheteriaAgent): number {
		const _ctx = getTurnContext();
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
		const _ctx = getTurnContext();
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
// Research Evaluator — queue tech research when a lab exists and idle
// ---------------------------------------------------------------------------

export class ResearchEvaluator extends GoalEvaluator<SyntheteriaAgent> {
	calculateDesirability(_agent: SyntheteriaAgent): number {
		const _ctx = getTurnContext();
		// No lab -> can't research
		if (!_ctx.hasResearchLab) return 0;
		// Already researching -> no action needed
		if (_ctx.isResearching) return 0;
		// Lab exists, no active research -> high priority
		// Smooth decay: urgency decreases as more techs are researched
		// 0 techs -> 0.95, 3 techs -> ~0.75, 10 techs -> ~0.5
		return Math.max(0.4, 0.95 * quadraticDecay(_ctx.researchedTechCount, 15));
	}

	setGoal(agent: SyntheteriaAgent): void {
		// Signal to the turn system that this faction needs to pick a tech
		agent.decidedAction = { type: "idle" };
	}
}

// ---------------------------------------------------------------------------
// Interpose Evaluator — support units shield threatened allies
// ---------------------------------------------------------------------------

export class InterposeEvaluator extends GoalEvaluator<SyntheteriaAgent> {
	calculateDesirability(agent: SyntheteriaAgent): number {
		const _ctx = getTurnContext();
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
		const _ctx = getTurnContext();
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
		const _ctx = getTurnContext();
		// Only active after turn 100
		if (_ctx.currentTurn < 100) return 0;
		// Only the strongest faction pursues wormhole
		if (!_ctx.isStrongestFaction) return 0;
		// Need enough territory and units to justify endgame push
		if (_ctx.unitCount < 10) return 0;
		// High desirability — this is an endgame victory condition
		// Ramps up: turn 100 -> 0.3, turn 200 -> 0.6, turn 300+ -> 0.9
		const turnRamp = Math.min(1, (_ctx.currentTurn - 100) / 200);
		return 0.3 + turnRamp * 0.6;
	}

	setGoal(agent: SyntheteriaAgent): void {
		const _ctx = getTurnContext();
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
