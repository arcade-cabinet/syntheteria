/**
 * Economy GoalEvaluators — Harvest, Build, FloorMine.
 *
 * These evaluators drive resource gathering and infrastructure construction.
 */

import { GoalEvaluator } from "yuka";
import type { SyntheteriaAgent } from "../agents/SyntheteriaAgent";
import {
	type BuildOption,
	getTurnContext,
	manhattan,
	quadraticDecay,
	logistic,
	momentumBonus,
} from "./turnContext";

// ---------------------------------------------------------------------------
// Harvest Evaluator
// ---------------------------------------------------------------------------

export class HarvestEvaluator extends GoalEvaluator<SyntheteriaAgent> {
	calculateDesirability(agent: SyntheteriaAgent): number {
		const _ctx = getTurnContext();
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
		const _ctx = getTurnContext();
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
// Build Evaluator — place buildings when resources allow
// ---------------------------------------------------------------------------

/**
 * Dynamic build priority — what the faction is MISSING matters more than
 * a static checklist. The economy chain is:
 *   power (transmitter) -> raw materials (harvest) -> refined (synthesizer)
 *   -> buildings/research_lab -> tech -> specialized units
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
		const _ctx = getTurnContext();
		const hasBuildOptions = _ctx.buildOptions.length > 0;

		// Smooth saturation curve: fewer buildings -> higher desire
		const buildingBonus = quadraticDecay(_ctx.factionBuildingCount, 30);
		// Logistic motor pool urgency: 0 pools -> 0.5 bonus, 1 -> 0.25, 2+ -> ~0
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
		const _ctx = getTurnContext();
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
// Floor Mine Evaluator — backstop economy when salvage is scarce
// ---------------------------------------------------------------------------

export class FloorMineEvaluator extends GoalEvaluator<SyntheteriaAgent> {
	calculateDesirability(agent: SyntheteriaAgent): number {
		const _ctx = getTurnContext();
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
		// Smooth curve: deposit at dist 0 -> 0.1 score, deposit far -> full mining score
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
		const _ctx = getTurnContext();
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
