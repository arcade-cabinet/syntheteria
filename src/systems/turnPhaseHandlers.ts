/**
 * Turn Phase Handlers — registers AI faction turn and environment phase
 * callbacks with the turn system.
 *
 * This module is imported once at startup (side-effect registration).
 * Weather/lightning/rendering continue ticking at 60fps regardless —
 * these handlers run discrete per-turn gameplay events only.
 *
 * The AI faction handler delegates to faction governors, which use
 * PlayerGovernor instances to make decisions for rival units.
 */

import {
	getGovernorForFaction,
	registerFactionTurnHandler,
} from "../ai/governor/factionGovernors";
import { getPowerSnapshot } from "./power";
import { logTurnEvent } from "./turnEventLog";
import {
	registerAIFactionTurnHandler,
	registerEnvironmentPhaseHandler,
} from "./turnSystem";

// ─── Faction Governor Registration ──────────────────────────────────────────

// Register the faction governors' turn handler so each rival faction's
// PlayerGovernor.executeTurn() runs during the ai_faction phase.
registerFactionTurnHandler();

// ─── AI Faction Turn Handler (logging) ──────────────────────────────────────

registerAIFactionTurnHandler((factionId, turnNumber) => {
	const governor = getGovernorForFaction(factionId);
	const decisionCount = governor ? "governor_active" : "no_governor";

	logTurnEvent("ai_faction_turn", null, factionId, {
		turnNumber,
		decisionCount,
	});
});

// ─── Environment Phase Handler ──────────────────────────────────────────────

registerEnvironmentPhaseHandler((turnNumber) => {
	const stormIntensity = getPowerSnapshot().stormIntensity;

	logTurnEvent("environment", null, "environment", {
		turnNumber,
		stormIntensity,
	});
});
