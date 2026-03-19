/**
 * Diplomatic AI decisions — AI factions make alliance/war choices
 * based on game state and faction personality.
 *
 * In EXPAND/ATTACK FSM states:
 *   - Propose alliance with weaker neighbors (buffer against cults)
 *   - Declare war on the strongest rival
 *
 * Wired into diplomacySystem.ts via proposeAlliance/declareWar.
 * Called once per faction per turn from yukaAiTurnSystem.
 */

import type { World } from "koota";
import type { FactionStateId } from "../fsm/FactionFSM";
import {
	proposeAlliance,
	declareWar,
	getStandingLevel,
	getDiplomacyPersonality,
} from "../../systems";
import { getRelation } from "../../factions";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DiplomaticContext {
	factionId: string;
	currentTurn: number;
	fsmState: FactionStateId;
	/** Unit counts per faction (factionId → count). */
	factionUnitCounts: Map<string, number>;
	/** Building counts per faction. */
	factionBuildingCounts: Map<string, number>;
	/** All non-player, non-cult faction IDs. */
	otherFactionIds: string[];
	/** Faction personality aggression (1-3). */
	aggression: number;
}

export interface DiplomaticDecision {
	type: "propose_alliance" | "declare_war" | "none";
	targetFaction: string;
	reason: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Minimum turn before diplomatic actions start. */
const MIN_DIPLOMACY_TURN = 15;

/** Minimum strength ratio to declare war (my units / their units). */
const WAR_STRENGTH_RATIO = 1.3;

/** Maximum strength ratio for alliance target (they must be weaker). */
const ALLIANCE_WEAKNESS_RATIO = 1.5;

/** Cooldown turns between diplomatic actions per faction. */
const DIPLOMACY_COOLDOWN = 5;

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

const _lastActionTurn = new Map<string, number>();

/** Reset diplomatic AI state (e.g., on new game). */
export function resetDiplomaticAi(): void {
	_lastActionTurn.clear();
}

// ---------------------------------------------------------------------------
// Decision logic
// ---------------------------------------------------------------------------

/**
 * Make a diplomatic decision for an AI faction based on FSM state and game state.
 */
export function decideDiplomacy(
	world: World,
	ctx: DiplomaticContext,
): DiplomaticDecision {
	const noAction: DiplomaticDecision = {
		type: "none",
		targetFaction: "",
		reason: "no action needed",
	};

	// Too early for diplomacy
	if (ctx.currentTurn < MIN_DIPLOMACY_TURN) return noAction;

	// Cooldown check
	const lastAction = _lastActionTurn.get(ctx.factionId) ?? 0;
	if (ctx.currentTurn - lastAction < DIPLOMACY_COOLDOWN) return noAction;

	// Check faction's diplomatic personality
	const personality = getDiplomacyPersonality(ctx.factionId);
	if (!personality) return noAction;

	const myUnits = ctx.factionUnitCounts.get(ctx.factionId) ?? 0;

	// In ATTACK state — consider declaring war on strongest rival
	if (ctx.fsmState === "ATTACK") {
		const warTarget = findWarTarget(world, ctx, myUnits);
		if (warTarget) {
			_lastActionTurn.set(ctx.factionId, ctx.currentTurn);
			return warTarget;
		}
	}

	// In EXPAND or ATTACK state — consider alliance with weaker neighbor
	if (ctx.fsmState === "EXPAND" || ctx.fsmState === "ATTACK") {
		if (personality.acceptsAlliance) {
			const allyTarget = findAllianceTarget(world, ctx, myUnits);
			if (allyTarget) {
				_lastActionTurn.set(ctx.factionId, ctx.currentTurn);
				return allyTarget;
			}
		}
	}

	return noAction;
}

/**
 * Execute a diplomatic decision — apply it to the world.
 */
export function executeDiplomacy(
	world: World,
	decision: DiplomaticDecision,
	factionId: string,
	currentTurn: number,
): void {
	if (decision.type === "none") return;

	if (decision.type === "propose_alliance") {
		proposeAlliance(world, factionId, decision.targetFaction, currentTurn);
	} else if (decision.type === "declare_war") {
		declareWar(world, factionId, decision.targetFaction, currentTurn);
	}
}

// ---------------------------------------------------------------------------
// Target selection
// ---------------------------------------------------------------------------

/**
 * Find a faction to declare war on.
 * Target: the strongest non-allied faction, but only if we're strong enough.
 */
function findWarTarget(
	world: World,
	ctx: DiplomaticContext,
	myUnits: number,
): DiplomaticDecision | null {
	let strongest: { factionId: string; units: number } | null = null;

	for (const otherId of ctx.otherFactionIds) {
		if (otherId === ctx.factionId) continue;

		const relation = getRelation(world, ctx.factionId, otherId);
		// Don't declare war on allies (alliance break uses separate logic)
		if (relation === "ally") continue;
		// Already at war
		if (relation === "hostile") continue;

		const theirUnits = ctx.factionUnitCounts.get(otherId) ?? 0;
		if (!strongest || theirUnits > strongest.units) {
			strongest = { factionId: otherId, units: theirUnits };
		}
	}

	if (!strongest) return null;

	// Only declare war if we have strength advantage
	const ratio = strongest.units > 0 ? myUnits / strongest.units : Infinity;
	if (ratio < WAR_STRENGTH_RATIO) return null;

	// Aggression personality check — less aggressive factions need bigger advantage
	const requiredRatio = WAR_STRENGTH_RATIO + (3 - ctx.aggression) * 0.3;
	if (ratio < requiredRatio) return null;

	return {
		type: "declare_war",
		targetFaction: strongest.factionId,
		reason: `strength ratio ${ratio.toFixed(1)} > ${requiredRatio.toFixed(1)}`,
	};
}

/**
 * Find a faction to propose alliance with.
 * Target: weaker neighbor who isn't hostile — buffer against cults.
 */
function findAllianceTarget(
	world: World,
	ctx: DiplomaticContext,
	myUnits: number,
): DiplomaticDecision | null {
	let weakest: { factionId: string; units: number } | null = null;

	for (const otherId of ctx.otherFactionIds) {
		if (otherId === ctx.factionId) continue;

		const relation = getRelation(world, ctx.factionId, otherId);
		if (relation === "hostile") continue; // Can't ally while hostile
		if (relation === "ally") continue; // Already allied

		// Check if the other faction accepts alliances
		const otherPersonality = getDiplomacyPersonality(otherId);
		if (!otherPersonality?.acceptsAlliance) continue;

		const standingLevel = getStandingLevel(world, ctx.factionId, otherId);
		// Don't propose if unfriendly or hostile standing
		if (standingLevel === "hostile" || standingLevel === "unfriendly")
			continue;

		const theirUnits = ctx.factionUnitCounts.get(otherId) ?? 0;

		// Only ally with weaker factions (buffer zone logic)
		const ratio = theirUnits > 0 ? myUnits / theirUnits : Infinity;
		if (ratio < 1.0) continue; // They're stronger — no alliance
		if (ratio > ALLIANCE_WEAKNESS_RATIO) continue; // Too weak to be useful

		if (!weakest || theirUnits < weakest.units) {
			weakest = { factionId: otherId, units: theirUnits };
		}
	}

	if (!weakest) return null;

	return {
		type: "propose_alliance",
		targetFaction: weakest.factionId,
		reason: `weaker neighbor (${weakest.units} units) as cult buffer`,
	};
}
