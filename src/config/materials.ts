/**
 * Resource material definitions for Syntheteria.
 *
 * Four core materials scavenged from ruins, used in fabrication and building.
 * Each material has a rarity that affects spawn frequency at scavenge sites.
 */

export interface MaterialDef {
	/** Unique identifier used in ResourcePool and inventory keys */
	id: string;
	/** Display name shown in UI */
	displayName: string;
	/** Where this material is typically found */
	source: string;
	/** Relative spawn weight (higher = more common) */
	spawnWeight: number;
	/** Base amount yielded per scavenge action */
	baseYield: number;
	/** Base number of scavenge actions at a site */
	baseDurability: number;
}

export const MATERIALS: Record<string, MaterialDef> = {
	scrapMetal: {
		id: "scrapMetal",
		displayName: "Scrap Metal",
		source: "Ruins and corridors",
		spawnWeight: 50,
		baseYield: 3,
		baseDurability: 4,
	},
	circuitry: {
		id: "circuitry",
		displayName: "Circuitry",
		source: "Tech rooms and labs",
		spawnWeight: 30,
		baseYield: 2,
		baseDurability: 3,
	},
	powerCells: {
		id: "powerCells",
		displayName: "Power Cells",
		source: "Cult structures and generators",
		spawnWeight: 12,
		baseYield: 1,
		baseDurability: 2,
	},
	durasteel: {
		id: "durasteel",
		displayName: "Durasteel",
		source: "Deep ruins and vaults",
		spawnWeight: 8,
		baseYield: 1,
		baseDurability: 2,
	},
};

/** All material IDs as a typed union */
export type MaterialId = keyof typeof MATERIALS;

/** Material IDs ordered by rarity (common → rare) */
export const MATERIAL_IDS: MaterialId[] = [
	"scrapMetal",
	"circuitry",
	"powerCells",
	"durasteel",
];

/**
 * Pick a random material type based on spawn weights.
 * Uses the provided RNG function (0-1 range) for deterministic seeding.
 */
export function pickMaterialByWeight(rng: () => number): MaterialId {
	const totalWeight = MATERIAL_IDS.reduce(
		(sum, id) => sum + MATERIALS[id].spawnWeight,
		0,
	);
	let roll = rng() * totalWeight;
	for (const id of MATERIAL_IDS) {
		roll -= MATERIALS[id].spawnWeight;
		if (roll <= 0) return id;
	}
	return "scrapMetal"; // fallback
}
