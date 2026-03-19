/**
 * Combat GoalEvaluators — Attack, ChaseEnemy, Evade.
 *
 * These evaluators handle direct combat engagement and threat evasion.
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
import {
	getTurnContext,
	logistic,
	manhattan,
	momentumBonus,
	quadraticDecay,
} from "./turnContext";

// ---------------------------------------------------------------------------
// Attack Evaluator
// ---------------------------------------------------------------------------

export class AttackEvaluator extends GoalEvaluator<SyntheteriaAgent> {
	calculateDesirability(agent: SyntheteriaAgent): number {
		if (agent.attackRange === 0 || agent.attack === 0) return 0;

		const _ctx = getTurnContext();
		let best = 0;
		for (const enemy of _ctx.enemies) {
			const dist = manhattan(agent.tileX, agent.tileZ, enemy.x, enemy.z);
			if (dist <= agent.attackRange) {
				// Smooth quadratic decay: closer = higher score
				// Adjacent (dist<=1) → 0.95, at max range → ~0.85
				const score =
					0.85 + 0.1 * quadraticDecay(dist, Math.max(agent.attackRange, 1));
				best = Math.max(best, score);
			}
		}

		// Time escalation: aggression rises after turn 30 even without adjacent enemies
		// Only applies when enemies exist on the map (drives units to seek combat)
		const timeAggression =
			_ctx.enemies.length > 0 ? logistic(_ctx.currentTurn, 30, 0.15) * 0.2 : 0;
		if (best === 0) return Math.min(1, timeAggression);

		// Adjacent attacks (score >= 0.93) bypass aggressionMult — always fight back
		if (best >= 0.93) return Math.min(1, best + momentumBonus(agent, "attack"));
		return Math.min(
			1,
			best * _ctx.aggressionMult +
				timeAggression +
				momentumBonus(agent, "attack"),
		);
	}

	setGoal(agent: SyntheteriaAgent): void {
		const _ctx = getTurnContext();
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

		const _ctx = getTurnContext();
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
		const chaseTimeBoost =
			best > 0 ? logistic(_ctx.currentTurn, 20, 0.2) * 0.15 : 0;
		return Math.min(
			1,
			best * _ctx.aggressionMult +
				chaseTimeBoost +
				momentumBonus(agent, "move"),
		);
	}

	setGoal(agent: SyntheteriaAgent): void {
		const _ctx = getTurnContext();
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
// Evade Evaluator — flee when outnumbered by cult
// ---------------------------------------------------------------------------

export class EvadeEvaluator extends GoalEvaluator<SyntheteriaAgent> {
	calculateDesirability(agent: SyntheteriaAgent): number {
		const _ctx = getTurnContext();
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
		const _ctx = getTurnContext();
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
