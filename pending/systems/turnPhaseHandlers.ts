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
import { initAIActionVisualization } from "./aiActionVisualization";
import { advanceConstructionTurn } from "./constructionVisualization";
import { cultistIncursionSystem } from "./cultistIncursion";
import { markUpgradeTurnTick } from "./markUpgrade";
import { motorPoolTurnTick } from "./motorPool";
import { triggerHologram } from "./otterHologram";
import { getPowerSnapshot } from "./power";
import { advanceResearch } from "./techTree";
import { forceRecalculate } from "./territorySystem";
import { logTurnEvent } from "./turnEventLog";
import { detectPhaseTransition } from "./turnPhaseEvents";
import {
	getTurnState,
	registerAIFactionTurnHandler,
	registerEnvironmentPhaseHandler,
	subscribeTurnState,
} from "./turnSystem";
import { checkVictoryConditions } from "./victoryConditions";
import { advanceWormholeStage, getWormholeState } from "./wormhole";

// ─── Turn Phase Event Detection ──────────────────────────────────────────────

// Subscribe to turn state changes and emit phase transition events
// for UI components (turn counter animation, phase labels, etc.)
subscribeTurnState(() => {
	const state = getTurnState();
	detectPhaseTransition(state.phase, state.turnNumber, state.activeFaction);
});

// ─── AI Action Visualization ─────────────────────────────────────────────────

// Wire the AI action visualization to turn events so the camera pans to
// visible AI actions and indicators appear during the AI phase.
initAIActionVisualization();

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

	// Cultist incursion — spawn waves and run cultist AI behavior
	const { spawnEvents, attackEvents } = cultistIncursionSystem();
	if (spawnEvents.length > 0) {
		logTurnEvent("cultist_spawn", null, "cultist", {
			turnNumber,
			count: spawnEvents.length,
		});
	}
	if (attackEvents.length > 0) {
		logTurnEvent("cultist_attack", null, "cultist", {
			turnNumber,
			count: attackEvents.length,
		});
	}

	// Motor Pool fabrication — advance build queues, spawn completed bots
	motorPoolTurnTick();

	// Construction visualization — advance staged building progress
	advanceConstructionTurn();

	// Mark upgrades — advance progression for units with enough XP
	markUpgradeTurnTick();

	// Tech tree — advance research for all factions each turn
	const playerResearch = advanceResearch("player");
	if (playerResearch) {
		logTurnEvent("research_complete", null, "player", {
			turnNumber,
			techId: playerResearch,
		});
	}
	// AI factions also research (using economy faction IDs)
	for (const economyFaction of ["rogue", "cultist", "feral"] as const) {
		const aiResearch = advanceResearch(economyFaction);
		if (aiResearch) {
			logTurnEvent("research_complete", null, economyFaction, {
				turnNumber,
				techId: aiResearch,
			});
		}
	}

	// Wormhole construction — advance build stage if active
	const wormholeState = getWormholeState();
	if (wormholeState && !wormholeState.complete) {
		const advanced = advanceWormholeStage();
		if (advanced) {
			logTurnEvent("wormhole_stage", null, wormholeState.builder ?? "player", {
				turnNumber,
				stage: wormholeState.stage,
			});
		}
	}

	// Otter hologram — trigger narrative events at key moments
	if (turnNumber === 1) {
		triggerHologram("first_turn");
	}

	// Territory recalculation — update ownership before victory check
	forceRecalculate();

	// Victory condition check — runs after all actions and territory updates
	const victory = checkVictoryConditions();
	if (victory) {
		logTurnEvent("victory", null, victory.winner, {
			turnNumber,
			victoryType: victory.type,
			detail: victory.detail,
		});
	}

	logTurnEvent("environment", null, "environment", {
		turnNumber,
		stormIntensity,
	});
});
