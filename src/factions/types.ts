export interface FactionDef {
	id: string;
	displayName: string;
	color: number;
	persona: "otter" | "fox" | "raven" | "lynx" | "bear";
	isPlayer: boolean;
	startZone: "center" | "corner_nw" | "corner_ne" | "corner_se" | "corner_sw";
	/** Preferred terrain type — faction spawns near clusters of this floor type. */
	terrainAffinity: string;
	aggression: number;
	description: string;
}

/**
 * Cult of EL — human survivors who worship the EL as gods.
 *
 * Cults are NOT a machine faction. They are the PRIMARY antagonist:
 * elevated scripted-encounter barbarians who pressure the player throughout
 * the campaign. They are independent of machine consciousnesses and cannot
 * be allied with or hacked — humans are unhackable.
 *
 * Three sects formed in different sectors of Syntheteria (future Earth),
 * each developing distinct character from their local environment.
 */
export interface CultDef {
	id: string;
	displayName: string;
	color: number;
	/**
	 * The ecumenopolis sector archetype where this sect congregates.
	 * Determines map spawn locations — no relation to machine factions.
	 */
	sector: "crater" | "derelict_building" | "wasteland";
	aggressionLevel: 1 | 2 | 3;
	spawnCount: number;
}
