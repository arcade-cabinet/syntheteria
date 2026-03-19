/**
 * Cult structure definitions.
 *
 * Cults are remnants of failed human colony missions — they're the only
 * entities on Syntheteria with human traces. Their structures reflect
 * this: crude shelters, ritual altars, signal corruption nodes.
 *
 * Cult structures spawn at breach zones and spread as cults escalate.
 * They are NOT buildable by player/AI factions.
 */

export interface CultStructureDef {
	readonly displayName: string;
	/** GLB model ID (TBD — need to source cult-themed models). */
	readonly modelId: string;
	readonly hp: number;
	/** Does this structure corrupt nearby tiles? */
	readonly corruptionRadius: number;
	/** Does this structure spawn cultist units? */
	readonly spawnsUnits: boolean;
	readonly spawnInterval: number;
}

/**
 * Cult structure types — placed at breach zones by the cultist system.
 *
 * Models TBD — need to search asset library for:
 * - Human shelter/pod models (props_pod is a candidate)
 * - Altar/shrine-like structures
 * - Antenna/signal corruption devices
 * - Organic/rusted debris clusters
 */
export const CULT_STRUCTURE_DEFS = {
	breach_altar: {
		displayName: "Breach Altar",
		modelId: "drone_control_center", // imposing command structure
		hp: 60,
		corruptionRadius: 5,
		spawnsUnits: true,
		spawnInterval: 3,
	},
	signal_corruptor: {
		displayName: "Signal Corruptor",
		modelId: "drone_charging_station", // tech corruption
		hp: 30,
		corruptionRadius: 8,
		spawnsUnits: false,
		spawnInterval: 0,
	},
	human_shelter: {
		displayName: "Human Shelter",
		modelId: "main_house", // human habitation
		hp: 20,
		corruptionRadius: 2,
		spawnsUnits: false,
		spawnInterval: 0,
	},
	corruption_node: {
		displayName: "Corruption Node",
		modelId: "decontamination_section", // spreading contamination
		hp: 40,
		corruptionRadius: 3,
		spawnsUnits: false,
		spawnInterval: 0,
	},
	cult_stronghold: {
		displayName: "Cult Stronghold",
		modelId: "main_house_3lv",
		hp: 100,
		corruptionRadius: 8,
		spawnsUnits: true,
		spawnInterval: 2,
	},
	bio_farm: {
		displayName: "Bio Farm",
		modelId: "farm",
		hp: 25,
		corruptionRadius: 2,
		spawnsUnits: false,
		spawnInterval: 0,
	},
} as const;

export type CultStructureType = keyof typeof CULT_STRUCTURE_DEFS;
