/**
 * Faction AI behavior definitions — biases, limits, starting units.
 *
 * Converted from pending/config/factions.json to TypeScript const objects.
 *
 * These define HOW each AI faction behaves: their strategic biases
 * (build vs expand vs harvest vs scout), starting unit count, and
 * expansion limits. Visual identity (color, persona) lives in
 * src/factions/definitions.ts — this file is purely AI behavior.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface FactionAiBias {
	readonly displayName: string;
	readonly color: string;
	/** Preference for constructing buildings (0-1). */
	readonly buildBias: number;
	/** Preference for expanding territory (0-1). */
	readonly expandBias: number;
	/** Preference for harvesting resources (0-1). */
	readonly harvestBias: number;
	/** Preference for scouting and exploration (0-1). */
	readonly scoutBias: number;
	/** Number of units at game start. */
	readonly startingUnits: number;
	/** Maximum number of buildings this faction will construct. */
	readonly maxBuildings: number;
	/** Maximum territory cells this faction will try to control. */
	readonly maxTerritoryCells: number;
}

// ─── Data ───────────────────────────────────────────────────────────────────

export const FACTION_AI_BIASES: Record<string, FactionAiBias> = {
	reclaimers: {
		displayName: "Reclaimers",
		color: "#33aa55",
		buildBias: 0.6,
		expandBias: 0.3,
		harvestBias: 0.8,
		scoutBias: 0.5,
		startingUnits: 2,
		maxBuildings: 8,
		maxTerritoryCells: 30,
	},
	volt_collective: {
		displayName: "Volt Collective",
		color: "#5577ff",
		buildBias: 0.8,
		expandBias: 0.5,
		harvestBias: 0.4,
		scoutBias: 0.3,
		startingUnits: 2,
		maxBuildings: 10,
		maxTerritoryCells: 25,
	},
	signal_choir: {
		displayName: "Signal Choir",
		color: "#dd44aa",
		buildBias: 0.4,
		expandBias: 0.7,
		harvestBias: 0.5,
		scoutBias: 0.8,
		startingUnits: 3,
		maxBuildings: 6,
		maxTerritoryCells: 40,
	},
	iron_creed: {
		displayName: "Iron Creed",
		color: "#cc6622",
		buildBias: 0.7,
		expandBias: 0.6,
		harvestBias: 0.6,
		scoutBias: 0.4,
		startingUnits: 2,
		maxBuildings: 12,
		maxTerritoryCells: 35,
	},
} as const;

/** All faction IDs with AI bias definitions. */
export const FACTION_AI_IDS = Object.keys(
	FACTION_AI_BIASES,
) as readonly string[];

/**
 * Get the dominant behavior for a faction (highest bias value).
 */
export function getDominantBias(
	factionId: string,
): "build" | "expand" | "harvest" | "scout" | null {
	const bias = FACTION_AI_BIASES[factionId];
	if (!bias) return null;

	const entries: [string, number][] = [
		["build", bias.buildBias],
		["expand", bias.expandBias],
		["harvest", bias.harvestBias],
		["scout", bias.scoutBias],
	];
	entries.sort((a, b) => b[1] - a[1]);
	return entries[0][0] as "build" | "expand" | "harvest" | "scout";
}
