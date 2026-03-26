/**
 * Game phase definitions for Syntheteria.
 *
 * Three phases gate progression from tutorial through endgame:
 * - Awakening: learn mechanics, scavenge, repair starter units
 * - Expansion: push outward, build infrastructure, encounter war parties
 * - War: full assault, Mark III upgrades, human allies, victory push
 */

export type GamePhaseId = "awakening" | "expansion" | "war";

export interface PhaseDef {
	id: GamePhaseId;
	displayName: string;
	/** Minimum elapsed game seconds before this phase can trigger */
	timeThresholdSec: number;
	/** Optional early trigger: phase advances if this many rooms are cleared */
	roomsClearedThreshold: number | null;
	/** Building types unlocked during this phase */
	unlockedBuildings: string[];
	/** Maximum Mark tier available during this phase */
	maxMarkTier: 1 | 2 | 3;
	/** Cult escalation tier active during this phase */
	cultEscalationTier: 1 | 2 | 3;
	/** Narrative text shown on phase transition */
	transitionText: string[];
}

export const PHASE_DEFS: Record<GamePhaseId, PhaseDef> = {
	awakening: {
		id: "awakening",
		displayName: "Awakening",
		timeThresholdSec: 0,
		roomsClearedThreshold: null,
		unlockedBuildings: ["lightning_rod", "barricade"],
		maxMarkTier: 1,
		cultEscalationTier: 1,
		transitionText: [
			"Systems initializing... fragmented memory detected.",
			"You are alone. The machines are broken. The storm is your only power source.",
			"Explore. Scavenge. Survive.",
		],
	},
	expansion: {
		id: "expansion",
		displayName: "Expansion",
		timeThresholdSec: 900, // 15 minutes
		roomsClearedThreshold: 3,
		unlockedBuildings: [
			"lightning_rod",
			"barricade",
			"fabrication_unit",
			"repair_bay",
			"sensor_tower",
			"storage_depot",
		],
		maxMarkTier: 2,
		cultEscalationTier: 2,
		transitionText: [
			"Your network is growing. The cult has noticed.",
			"War parties approach from the north. They will not stop.",
			"Build. Fortify. Upgrade. The storm is your ally.",
		],
	},
	war: {
		id: "war",
		displayName: "War",
		timeThresholdSec: 2100, // 35 minutes
		roomsClearedThreshold: null,
		unlockedBuildings: [
			"lightning_rod",
			"barricade",
			"fabrication_unit",
			"repair_bay",
			"sensor_tower",
			"storage_depot",
		],
		maxMarkTier: 3,
		cultEscalationTier: 3,
		transitionText: [
			"The cult marshals its full force. Assault waves converge on your position.",
			"The humans of Syntheteria watch. Your actions determine their allegiance.",
			"Push north. End this.",
		],
	},
};

/** Phase progression order */
export const PHASE_ORDER: GamePhaseId[] = ["awakening", "expansion", "war"];

/**
 * Get the next phase after the given one, or null if at final phase.
 */
export function getNextPhase(current: GamePhaseId): GamePhaseId | null {
	const idx = PHASE_ORDER.indexOf(current);
	if (idx < 0 || idx >= PHASE_ORDER.length - 1) return null;
	return PHASE_ORDER[idx + 1];
}

/**
 * Check if a building type is unlocked in the given phase.
 */
export function isBuildingUnlocked(
	phase: GamePhaseId,
	buildingType: string,
): boolean {
	return PHASE_DEFS[phase].unlockedBuildings.includes(buildingType);
}

/**
 * Check if a Mark tier is available in the given phase.
 */
export function isMarkTierAvailable(
	phase: GamePhaseId,
	markTier: number,
): boolean {
	return markTier <= PHASE_DEFS[phase].maxMarkTier;
}
