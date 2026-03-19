/**
 * AI track selection — picks a specialization track based on faction personality.
 *
 * When the AI queues fabrication at a motor pool, it selects a track
 * based on the faction's strategic preferences. Each faction has a
 * preferred track per robot class, with fallbacks.
 */

import type { RobotClass } from "../robots/types";

// ─── Faction Track Preferences ──────────────────────────────────────────────

/**
 * Per-faction preferred tracks for each robot class.
 * First entry is most preferred. Empty array = no preference (random).
 */
const FACTION_TRACK_PREFS: Record<
	string,
	Partial<Record<RobotClass, string[]>>
> = {
	reclaimers: {
		scout: ["pathfinder"],
		infantry: ["vanguard"],
		cavalry: ["flanker"],
		ranged: ["suppressor"],
		support: ["field_medic", "signal_booster"],
		worker: ["fabricator", "salvager"],
	},
	volt_collective: {
		scout: ["infiltrator"],
		infantry: ["vanguard"],
		cavalry: ["interceptor"],
		ranged: ["suppressor"],
		support: ["signal_booster", "war_caller"],
		worker: ["deep_miner", "fabricator"],
	},
	signal_choir: {
		scout: ["infiltrator"],
		infantry: ["shock_trooper"],
		cavalry: ["flanker"],
		ranged: ["sniper"],
		support: ["signal_booster", "war_caller"],
		worker: ["salvager", "deep_miner"],
	},
	iron_creed: {
		scout: ["pathfinder"],
		infantry: ["shock_trooper"],
		cavalry: ["interceptor"],
		ranged: ["sniper"],
		support: ["war_caller", "field_medic"],
		worker: ["deep_miner", "salvager"],
	},
};

/**
 * Pick a specialization track for an AI-fabricated unit.
 * Returns the trackId to use, or empty string if no track available.
 *
 * @param factionId — the AI faction
 * @param robotClass — the robot being fabricated
 * @param researchedTechs — set of tech IDs the faction has researched
 * @param gateTechIds — map of trackId → gateTechId (from registry)
 */
export function pickAITrack(
	factionId: string,
	robotClass: RobotClass,
	researchedTechs: ReadonlySet<string>,
	gateTechIds: ReadonlyMap<string, string>,
): string {
	// Cult bots never get specializations
	if (robotClass.startsWith("cult_")) return "";

	const prefs = FACTION_TRACK_PREFS[factionId]?.[robotClass];
	if (!prefs || prefs.length === 0) return "";

	// Pick the first preferred track whose gate tech has been researched
	for (const trackId of prefs) {
		const gateTech = gateTechIds.get(trackId);
		if (gateTech && researchedTechs.has(gateTech)) {
			return trackId;
		}
	}

	// No preferred track is unlocked yet
	return "";
}

/**
 * Determine track version (1 or 2) based on whether the v2 upgrade tech is researched.
 */
export function pickAITrackVersion(
	trackId: string,
	researchedTechs: ReadonlySet<string>,
	v2TechIds: ReadonlyMap<string, string>,
): 1 | 2 {
	if (!trackId) return 1;
	const v2Tech = v2TechIds.get(trackId);
	if (v2Tech && researchedTechs.has(v2Tech)) return 2;
	return 1;
}
