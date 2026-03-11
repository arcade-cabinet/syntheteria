/**
 * GovernorActionExecutor — translates GOAP actions into system calls.
 *
 * When the CivilizationGovernor decides to execute a GOAP action, it calls
 * this executor with the action descriptor and an execution context. The
 * executor dispatches to the appropriate game system:
 *
 *   LaunchRaid  → cubePileTracker scoring + findRaidTargets + assessRaidViability + planRaid
 *   ResearchTech → getAvailableTechs + startResearch
 *   (other actions) → no-op (handled by unit-level BotBrain, not systems)
 *
 * The executor is injected into the governor via `setActionExecutor()` so the
 * governor stays decoupled from concrete system imports (useful for testing).
 *
 * Usage:
 * ```ts
 * import { GovernorActionExecutor } from './GovernorActionExecutor';
 *
 * const executor = new GovernorActionExecutor();
 * governor.setActionExecutor(executor);
 *
 * // Each tick the governor calls executor.execute(action, context) internally
 * ```
 */

import type { GOAPAction } from "./ActionTypes.ts";
import {
	findRaidTargets,
	assessRaidViability,
	type RaidTarget,
} from "../../systems/raidTargeting";
import { planRaid } from "../../systems/raidSystem";
import {
	getAvailableTechs,
	getResearchProgress,
	startResearch,
} from "../../systems/techResearch";
import { getPiles } from "../../systems/cubePileTracker";
import type { FactionId, Vec3 } from "../../ecs/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Runtime context passed to the executor on each action dispatch.
 * Captures the faction's current game-world state needed to perform the action.
 */
export interface ExecutionContext {
	/** Attacking/acting faction identifier. */
	faction: FactionId;
	/**
	 * Unit IDs available for assignment to this action.
	 * For raid actions these units will be given move orders.
	 */
	unitIds: string[];
	/**
	 * World-space position the faction's units retreat to after a raid,
	 * or where newly-built structures cluster.
	 */
	homePosition: Vec3;
	/** Current simulation tick. Used for raid timestamps. */
	tick: number;
}

/**
 * Interface satisfied by GovernorActionExecutor, used by CivilizationGovernor
 * to stay decoupled from the concrete executor implementation.
 */
export interface IActionExecutor {
	execute(action: GOAPAction, context: ExecutionContext): string | null;
}

// ---------------------------------------------------------------------------
// Executor
// ---------------------------------------------------------------------------

/**
 * Dispatches GOAP actions from the CivilizationGovernor to the appropriate
 * game systems (raid, research, etc.).
 *
 * Actions not handled here (harvest, build walls, scout, etc.) are resolved
 * at the unit brain level — the governor's action is used as a directive
 * that individual bots act on autonomously. The executor only needs to bridge
 * the strategic-layer decisions that require direct system calls.
 */
export class GovernorActionExecutor implements IActionExecutor {
	/**
	 * Execute a GOAP action in the context of the acting faction.
	 *
	 * @param action - The GOAP action decided by the governor's planner.
	 * @param context - Runtime context: faction, available units, home position, tick.
	 * @returns
	 *   - For LaunchRaid: the raid ID string on success, null otherwise.
	 *   - For ResearchTech: the started tech ID on success, null otherwise.
	 *   - For all other actions: null (handled by unit brains).
	 */
	execute(action: GOAPAction, context: ExecutionContext): string | null {
		switch (action.name) {
			case "launch_raid":
				return this.executeLaunchRaid(context);
			case "research_tech":
				return this.executeResearchTech(context);
			default:
				// All other actions (harvest, build, scout, etc.) are handled by
				// the unit brain layer — no system call needed here.
				return null;
		}
	}

	// -------------------------------------------------------------------------
	// LaunchRaid
	// -------------------------------------------------------------------------

	/**
	 * Translate a LaunchRaid GOAP decision into an actual raid.
	 *
	 * Steps:
	 *   1. Find viable enemy stockpile targets (sorted best-first by raidTargeting).
	 *   2. Re-rank targets using cubePileTracker wealth data — proximity to
	 *      the highest-value enemy pile boosts a target's score so the AI
	 *      gravitates toward the richest stockpiles it has observed.
	 *   3. Assess whether our force is strong enough for the top-ranked target.
	 *   4. If viable, create a raid plan via planRaid() which issues movement orders.
	 *
	 * Returns the raid ID on success, or null if no viable target exists.
	 */
	private executeLaunchRaid(context: ExecutionContext): string | null {
		const { faction, unitIds, homePosition, tick } = context;

		// Step 1: find targets (sorted by value/threat composite score, best first)
		const targets = findRaidTargets(faction);
		if (targets.length === 0) {
			return null;
		}

		// Step 2: re-rank targets using cubePileTracker wealth scores.
		// Enemy piles with high totalEconomicValue pull nearby raid targets up
		// in priority, making the AI prefer the richest visible stockpiles.
		const ranked = this.rankTargetsByPileWealth(targets, faction);

		const best = ranked[0];

		// Step 3: check force ratio
		const viability = assessRaidViability(faction, best);
		if (!viability.viable) {
			return null;
		}

		// Step 4: create the raid — issues approach orders to all unitIds
		const raidId = planRaid(faction, best.position, unitIds, homePosition, tick);
		return raidId;
	}

	/**
	 * Re-rank raid targets using cubePileTracker wealth data.
	 *
	 * For each raid target, find the nearest enemy pile (not owned by `faction`)
	 * and boost the target's composite score by the pile's totalEconomicValue.
	 * This means the AI will prefer to raid wherever the enemy has accumulated
	 * the most wealth, not just wherever it can find loose cubes right now.
	 *
	 * Falls back to the original order when no pile data exists.
	 *
	 * @param targets - Raid targets sorted by raidTargeting composite score.
	 * @param faction - The attacking faction (its own piles are excluded).
	 * @returns Targets re-sorted by pile-wealth-boosted score, best first.
	 */
	private rankTargetsByPileWealth(
		targets: RaidTarget[],
		faction: FactionId,
	): RaidTarget[] {
		// Get all enemy piles (piles not belonging to the attacking faction)
		const enemyPiles = getPiles().filter((p) => p.ownerFaction !== faction);

		if (enemyPiles.length === 0) {
			// No pile data yet — return original raidTargeting order
			return targets;
		}

		// Score each target by its own composite score plus wealth from nearby piles
		const PILE_BOOST_RADIUS = 20; // world units — pile must be within this range

		const scored = targets.map((t) => {
			const baseScore = t.estimatedValue / (1 + t.threatLevel);

			// Find the nearest enemy pile within boost radius
			let pileBoost = 0;
			for (const pile of enemyPiles) {
				const dx = pile.center.x - t.position.x;
				const dz = pile.center.z - t.position.z;
				const dist = Math.sqrt(dx * dx + dz * dz);
				if (dist <= PILE_BOOST_RADIUS) {
					// Normalise pile value: cap at 10× base score boost
					const boost = Math.min(pile.totalEconomicValue * 0.01, baseScore * 10);
					if (boost > pileBoost) {
						pileBoost = boost;
					}
				}
			}

			return { target: t, score: baseScore + pileBoost };
		});

		scored.sort((a, b) => b.score - a.score);
		return scored.map((s) => s.target);
	}

	// -------------------------------------------------------------------------
	// ResearchTech
	// -------------------------------------------------------------------------

	/**
	 * Translate a ResearchTech GOAP decision into a research start call.
	 *
	 * Steps:
	 *   1. Check whether research is already in progress (no-op if so).
	 *   2. Get available techs for the faction (prerequisites met, not yet researched).
	 *   3. Start the first available tech (tech tree order implies priority).
	 *
	 * Returns the started tech ID on success, or null if nothing was started.
	 */
	private executeResearchTech(context: ExecutionContext): string | null {
		const { faction } = context;

		// Step 1: don't interrupt in-progress research
		const inProgress = getResearchProgress(faction);
		if (inProgress !== null) {
			return null;
		}

		// Step 2: find unlockable techs
		const available = getAvailableTechs(faction);
		if (available.length === 0) {
			return null;
		}

		// Step 3: start the first available tech
		const tech = available[0];
		const started = startResearch(faction, tech.id);
		return started ? tech.id : null;
	}
}
