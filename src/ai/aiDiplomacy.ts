/**
 * AI diplomacy subsystem -- alliance/war decisions per faction.
 *
 * Uses faction FSM state and aggression personality to decide
 * whether to propose alliances or declare war.
 */

import type { World } from "koota";
import type { AgentSnapshot } from "./agents/SyntheteriaAgent";
import { isCultFactionId, countFactionTerritory } from "./aiHelpers";
import { getFactionFSM } from "./fsm/FactionFSM";
import {
	decideDiplomacy,
	executeDiplomacy,
	type DiplomaticContext,
} from "./planning/diplomaticAi";

// ---------------------------------------------------------------------------
// Faction aggression
// ---------------------------------------------------------------------------

/** Personality aggression values (mirrored from AIRuntime FACTION_PERSONALITY, 1-5 scale). */
const FACTION_AGGRESSION: Record<string, number> = {
	reclaimers: 2,
	volt_collective: 1,
	signal_choir: 4,
	iron_creed: 5,
};

// ---------------------------------------------------------------------------
// Diplomacy execution
// ---------------------------------------------------------------------------

/**
 * Run diplomatic AI for each AI faction.
 * Decides whether to propose alliances or declare war based on FSM state.
 */
export function runAiDiplomacy(
	world: World,
	factionIds: string[],
	agentsByFaction: Map<string, AgentSnapshot[]>,
	currentTurn: number,
): void {
	// Build unit/building counts for all factions
	const factionUnitCounts = new Map<string, number>();
	const factionBuildingCounts = new Map<string, number>();
	for (const fId of factionIds) {
		factionUnitCounts.set(fId, agentsByFaction.get(fId)?.length ?? 0);
		factionBuildingCounts.set(fId, countFactionTerritory(world, fId));
	}

	const aiFactionIds = factionIds.filter(
		(f) => f !== "player" && !isCultFactionId(f),
	);

	for (const factionId of aiFactionIds) {
		const fsm = getFactionFSM(factionId);
		const ctx: DiplomaticContext = {
			factionId,
			currentTurn,
			fsmState: fsm.currentStateId,
			factionUnitCounts,
			factionBuildingCounts,
			otherFactionIds: aiFactionIds,
			aggression: FACTION_AGGRESSION[factionId] ?? 2,
		};

		const decision = decideDiplomacy(world, ctx);
		executeDiplomacy(world, decision, factionId, currentTurn);
	}
}
