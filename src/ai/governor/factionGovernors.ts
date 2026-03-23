/**
 * Faction Governors — Wires rival AI factions into the turn system.
 *
 * Each rival machine consciousness faction (Reclaimers, Volt Collective,
 * Iron Creed) gets a PlayerGovernor instance that makes decisions during
 * the ai_faction turn phase.
 *
 * The player faction can also be assigned an AI governor for auto-play mode.
 *
 * Faction mapping to EconomyFactionId:
 *   - "reclaimers"     → "rogue"    (expansion-focused)
 *   - "volt_collective" → "feral"    (tech/hacking-focused)
 *   - "iron_creed"     → "cultist"  (military-focused)
 *
 * Note: these faction IDs are the turn system faction names that cycle
 * during the ai_faction phase. They map to EconomyFactionId for economy
 * and territory tracking.
 */

import type { EconomyFactionId } from "../../systems/factionEconomy";
import {
	initializeTurnForUnits,
	registerAIFactionTurnHandler,
} from "../../systems/turnSystem";
import { type GovernorTurnResult, PlayerGovernor } from "./PlayerGovernor";

// ─── Faction Mapping ─────────────────────────────────────────────────────────

/** Maps turn system faction IDs to economy/territory faction IDs */
const FACTION_MAP: Record<string, EconomyFactionId> = {
	reclaimers: "rogue",
	volt_collective: "feral",
	iron_creed: "cultist",
	signal_choir: "cultist", // signal_choir shares cultist economy slot
};

export interface FactionPersonality {
	/** Turn system faction name */
	factionName: string;
	/** Economy faction ID */
	economyId: EconomyFactionId;
	/** Display label */
	label: string;
	/** Brief description */
	description: string;
}

export const RIVAL_FACTIONS: FactionPersonality[] = [
	{
		factionName: "reclaimers",
		economyId: "rogue",
		label: "Reclaimers",
		description: "Expansion-focused. Prioritize territory and exploration.",
	},
	{
		factionName: "volt_collective",
		economyId: "feral",
		label: "Volt Collective",
		description: "Tech-focused. Prefer hacking and resource accumulation.",
	},
	{
		factionName: "iron_creed",
		economyId: "cultist",
		label: "Iron Creed",
		description: "Military-focused. Aggressive expansion and combat.",
	},
];

// ─── Governor Registry ───────────────────────────────────────────────────────

const governorInstances = new Map<string, PlayerGovernor>();
const turnResults: GovernorTurnResult[] = [];

/** Auto-play mode: when true, the player faction is AI-controlled */
let autoPlayEnabled = false;
let playerGovernor: PlayerGovernor | null = null;

// ─── Initialization ──────────────────────────────────────────────────────────

/**
 * Create governor instances for all rival factions.
 * Call this once at game start after entities are spawned.
 */
export function initializeFactionGovernors() {
	governorInstances.clear();
	turnResults.length = 0;

	for (const faction of RIVAL_FACTIONS) {
		const governor = new PlayerGovernor(faction.economyId);
		governorInstances.set(faction.factionName, governor);
	}
}

/**
 * Register the faction turn handler with the turn system.
 * This wires the governors into the endPlayerTurn() cycle.
 * Call once at module load or game initialization.
 */
export function registerFactionTurnHandler() {
	registerAIFactionTurnHandler((factionId: string, turnNumber: number) => {
		const governor = governorInstances.get(factionId);
		if (!governor) return;

		// Initialize turn state for this faction's units
		// (the turn system manages player units; rival units need their own init)
		const result = governor.executeTurn(turnNumber);
		turnResults.push(result);
	});
}

// ─── Auto-Play Mode ──────────────────────────────────────────────────────────

/**
 * Enable or disable AI auto-play mode.
 * When enabled, the player faction is controlled by an AI governor.
 */
export function setAutoPlayMode(enabled: boolean) {
	autoPlayEnabled = enabled;
	if (enabled && !playerGovernor) {
		playerGovernor = new PlayerGovernor("player");
	}
	if (!enabled) {
		playerGovernor = null;
	}
}

/**
 * Check if auto-play mode is active.
 */
export function isAutoPlayMode(): boolean {
	return autoPlayEnabled;
}

/**
 * Execute the player governor's turn (for auto-play mode).
 * Returns the turn result, or null if auto-play is disabled.
 */
export function executePlayerAutoTurn(
	turnNumber: number,
): GovernorTurnResult | null {
	if (!autoPlayEnabled || !playerGovernor) return null;
	const result = playerGovernor.executeTurn(turnNumber);
	turnResults.push(result);
	return result;
}

// ─── Query API ───────────────────────────────────────────────────────────────

/**
 * Get all turn results from the current game session (for replay/debug).
 */
export function getTurnResults(): readonly GovernorTurnResult[] {
	return turnResults;
}

/**
 * Get the most recent turn result for a specific faction.
 */
export function getLastTurnResult(
	factionName: string,
): GovernorTurnResult | null {
	for (let i = turnResults.length - 1; i >= 0; i--) {
		const result = turnResults[i];
		const economyId = FACTION_MAP[factionName];
		if (result.factionId === economyId || result.factionId === factionName) {
			return result;
		}
	}
	return null;
}

/**
 * Get the governor for a specific faction (for testing/debugging).
 */
export function getGovernorForFaction(
	factionName: string,
): PlayerGovernor | null {
	return governorInstances.get(factionName) ?? null;
}

/**
 * Get the player governor (only available in auto-play mode).
 */
export function getPlayerGovernor(): PlayerGovernor | null {
	return playerGovernor;
}

// ─── Reset ───────────────────────────────────────────────────────────────────

/**
 * Reset all faction governors — call on new game.
 */
export function resetFactionGovernors() {
	governorInstances.clear();
	turnResults.length = 0;
	autoPlayEnabled = false;
	playerGovernor = null;
}
