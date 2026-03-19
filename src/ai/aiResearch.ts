/**
 * AI research subsystem -- picks and queues tech research per faction personality.
 *
 * Each faction has a preferred tech order; falls back to lowest-tier available.
 */

import type { World } from "koota";
import {
	getAvailableTechs,
	getResearchState,
	queueResearch,
} from "../systems";
import { isCultFactionId } from "./aiHelpers";

// ---------------------------------------------------------------------------
// Faction tech priorities
// ---------------------------------------------------------------------------

/**
 * Faction-specific tech priority lists. AI picks the first available tech
 * from its faction's preferred order, falling back to any available tech.
 */
const FACTION_TECH_PRIORITY: Record<string, readonly string[]> = {
	reclaimers: [
		"advanced_harvesting",
		"efficient_fabrication",
		"mark_ii_components",
		"deep_mining",
		"reinforced_chassis",
		"mark_iii_components",
		"signal_amplification",
	],
	volt_collective: [
		"signal_amplification",
		"network_encryption",
		"reinforced_chassis",
		"mark_ii_components",
		"advanced_harvesting",
		"efficient_fabrication",
		"quantum_processors",
	],
	signal_choir: [
		"signal_amplification",
		"reinforced_chassis",
		"mark_ii_components",
		"advanced_harvesting",
		"storm_shielding",
		"mark_iii_components",
		"network_encryption",
	],
	iron_creed: [
		"reinforced_chassis",
		"storm_shielding",
		"mark_ii_components",
		"advanced_harvesting",
		"efficient_fabrication",
		"mark_iii_components",
		"adaptive_armor",
	],
};

// ---------------------------------------------------------------------------
// Research execution
// ---------------------------------------------------------------------------

/**
 * For each AI faction with a research lab but no active research,
 * pick a tech from the faction's preference list and start researching.
 */
export function runAiResearch(world: World, factionIds: string[]): void {
	for (const factionId of factionIds) {
		if (factionId === "player") continue;
		if (isCultFactionId(factionId)) continue;

		const state = getResearchState(world, factionId);
		if (!state) continue;
		// Already researching -- nothing to do
		if (state.currentTechId) continue;
		// No research lab -- can't research
		if (state.labCount === 0) continue;

		const available = getAvailableTechs(world, factionId);
		if (available.length === 0) continue;

		const availableIds = new Set(available.map((t) => t.id));

		// Try faction-specific priority first
		const priorities = FACTION_TECH_PRIORITY[factionId];
		if (priorities) {
			for (const techId of priorities) {
				if (availableIds.has(techId)) {
					queueResearch(world, factionId, techId);
					break;
				}
			}
		}

		// Check if we queued something -- re-read state
		const afterState = getResearchState(world, factionId);
		if (afterState?.currentTechId) continue;

		// Fallback: pick the first available tech (lowest tier first)
		const sorted = [...available].sort((a, b) => a.tier - b.tier);
		queueResearch(world, factionId, sorted[0].id);
	}
}
