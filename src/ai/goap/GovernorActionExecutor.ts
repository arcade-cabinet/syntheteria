/**
 * GovernorActionExecutor — translates GOAP actions into system calls.
 *
 * When the CivilizationGovernor decides to execute a GOAP action, it calls
 * this executor with the action descriptor and an execution context. The
 * executor dispatches to the appropriate game system:
 *
 *   LaunchRaid  → findRaidTargets + assessRaidViability + planRaid
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
} from "../../systems/raidTargeting";
import { planRaid } from "../../systems/raidSystem";
import {
	getAvailableTechs,
	getResearchProgress,
	startResearch,
} from "../../systems/techResearch";
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
	 *   2. Assess whether our force is strong enough for the best target.
	 *   3. If viable, create a raid plan via planRaid() which issues movement orders.
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

		const best = targets[0];

		// Step 2: check force ratio
		const viability = assessRaidViability(faction, best);
		if (!viability.viable) {
			return null;
		}

		// Step 3: create the raid — issues approach orders to all unitIds
		const raidId = planRaid(faction, best.position, unitIds, homePosition, tick);
		return raidId;
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
