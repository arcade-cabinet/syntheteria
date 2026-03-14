/**
 * Resource Pools — The Exploit pillar of the 4X.
 *
 * Every harvestable structure and prop in the ecumenopolis contains a
 * defined resource pool. When a player unit harvests a structure, it
 * yields these resources. This transforms the dead machine-world into
 * a landscape of exploitable deposits.
 *
 * Resource types go beyond the simple scrapMetal/eWaste/intactComponents
 * model. The ecumenopolis is an industrial civilization's corpse — its
 * bones are heavy metals, its nerves are microchips, its blood is oil.
 */

// ─── Resource Types ──────────────────────────────────────────────────────────

export type HarvestResource =
	| "heavy_metals"
	| "light_metals"
	| "uranics"
	| "plastics"
	| "oil"
	| "microchips"
	| "scrap"
	| "rare_components";

export const HARVEST_RESOURCE_LABELS: Record<HarvestResource, string> = {
	heavy_metals: "Heavy Metals",
	light_metals: "Light Metals",
	uranics: "Uranics",
	plastics: "Plastics",
	oil: "Oil",
	microchips: "Microchips",
	scrap: "Scrap",
	rare_components: "Rare Components",
};

export const HARVEST_RESOURCE_COLORS: Record<HarvestResource, string> = {
	heavy_metals: "#8e9baa",
	light_metals: "#b0c4d8",
	uranics: "#88a7ff",
	plastics: "#e8c86a",
	oil: "#8a6e3a",
	microchips: "#6ff3c8",
	scrap: "#7a7a7a",
	rare_components: "#d4a0ff",
};

/** How a resource is primarily used in the game economy */
export const HARVEST_RESOURCE_USES: Record<HarvestResource, string> = {
	heavy_metals: "Armor, chassis, defensive structures",
	light_metals: "Electronics, sensors, light components",
	uranics: "Energy systems, power cells",
	plastics: "Wiring, seals, basic components",
	oil: "Lubricants, fuel cells, fabrication",
	microchips: "AI cores, processors, upgrades",
	scrap: "Universal low-quality material",
	rare_components: "Advanced fabrication, Mark upgrades",
};

// ─── Resource Pool ───────────────────────────────────────────────────────────

export interface ResourcePoolEntry {
	resource: HarvestResource;
	/** Minimum yield when harvested */
	min: number;
	/** Maximum yield when harvested */
	max: number;
}

export interface ResourcePool {
	/** Human-readable label for the harvestable category */
	label: string;
	/** Time in game ticks to harvest this structure */
	harvestDuration: number;
	/** Whether the structure is destroyed after harvesting */
	consumedOnHarvest: boolean;
	/** Resources yielded */
	yields: ResourcePoolEntry[];
}

// ─── Family → Resource Pool Mapping ──────────────────────────────────────────

/**
 * Maps city model families (and subcategories where relevant) to their
 * resource pools. This is the core economic data of the Exploit pillar.
 *
 * Families come from the city catalog: wall, column, prop, utility,
 * detail, stair, door, roof, floor.
 */

const WALL_POOL: ResourcePool = {
	label: "Structural Wall Section",
	harvestDuration: 120,
	consumedOnHarvest: true,
	yields: [
		{ resource: "heavy_metals", min: 3, max: 5 },
		{ resource: "scrap", min: 1, max: 2 },
	],
};

const COLUMN_POOL: ResourcePool = {
	label: "Support Column",
	harvestDuration: 100,
	consumedOnHarvest: true,
	yields: [
		{ resource: "heavy_metals", min: 2, max: 4 },
		{ resource: "light_metals", min: 0, max: 1 },
	],
};

const PROP_CONTAINER_POOL: ResourcePool = {
	label: "Storage Container",
	harvestDuration: 60,
	consumedOnHarvest: true,
	yields: [
		{ resource: "light_metals", min: 1, max: 2 },
		{ resource: "plastics", min: 1, max: 2 },
		{ resource: "scrap", min: 0, max: 1 },
	],
};

const PROP_COMPUTER_POOL: ResourcePool = {
	label: "Terminal Equipment",
	harvestDuration: 80,
	consumedOnHarvest: true,
	yields: [
		{ resource: "microchips", min: 1, max: 3 },
		{ resource: "light_metals", min: 1, max: 1 },
	],
};

const PROP_VESSEL_POOL: ResourcePool = {
	label: "Industrial Vessel",
	harvestDuration: 70,
	consumedOnHarvest: true,
	yields: [
		{ resource: "plastics", min: 2, max: 3 },
		{ resource: "oil", min: 1, max: 2 },
	],
};

const PROP_GENERIC_POOL: ResourcePool = {
	label: "Salvageable Equipment",
	harvestDuration: 50,
	consumedOnHarvest: true,
	yields: [
		{ resource: "scrap", min: 1, max: 3 },
		{ resource: "light_metals", min: 0, max: 1 },
	],
};

const UTILITY_POOL: ResourcePool = {
	label: "Utility Infrastructure",
	harvestDuration: 90,
	consumedOnHarvest: true,
	yields: [
		{ resource: "plastics", min: 1, max: 3 },
		{ resource: "oil", min: 1, max: 1 },
		{ resource: "light_metals", min: 0, max: 1 },
	],
};

const DETAIL_POOL: ResourcePool = {
	label: "Surface Detail",
	harvestDuration: 30,
	consumedOnHarvest: true,
	yields: [
		{ resource: "light_metals", min: 0, max: 1 },
		{ resource: "plastics", min: 0, max: 1 },
	],
};

const STAIR_POOL: ResourcePool = {
	label: "Structural Stairway",
	harvestDuration: 110,
	consumedOnHarvest: true,
	yields: [
		{ resource: "heavy_metals", min: 2, max: 3 },
		{ resource: "light_metals", min: 1, max: 1 },
	],
};

const DOOR_POOL: ResourcePool = {
	label: "Bulkhead Door",
	harvestDuration: 80,
	consumedOnHarvest: true,
	yields: [
		{ resource: "heavy_metals", min: 1, max: 2 },
		{ resource: "light_metals", min: 1, max: 1 },
		{ resource: "microchips", min: 0, max: 1 },
	],
};

const ROOF_POOL: ResourcePool = {
	label: "Roof Panel",
	harvestDuration: 100,
	consumedOnHarvest: true,
	yields: [
		{ resource: "heavy_metals", min: 2, max: 3 },
		{ resource: "plastics", min: 1, max: 1 },
	],
};

const POWER_INFRASTRUCTURE_POOL: ResourcePool = {
	label: "Power Infrastructure",
	harvestDuration: 150,
	consumedOnHarvest: true,
	yields: [
		{ resource: "uranics", min: 1, max: 3 },
		{ resource: "heavy_metals", min: 2, max: 2 },
		{ resource: "microchips", min: 0, max: 1 },
	],
};

const RESEARCH_EQUIPMENT_POOL: ResourcePool = {
	label: "Research Equipment",
	harvestDuration: 120,
	consumedOnHarvest: true,
	yields: [
		{ resource: "microchips", min: 2, max: 4 },
		{ resource: "rare_components", min: 0, max: 2 },
		{ resource: "light_metals", min: 1, max: 1 },
	],
};

// ─── Floor Material Pools (FLOOR_*) ───────────────────────────────────────────

/** Floor material IDs from world gen (src/world/gen/types.ts FLOOR_MATERIALS) */
export type FloorMaterialId =
	| "metal_panel"
	| "concrete_slab"
	| "industrial_grating"
	| "rusty_plating"
	| "corroded_steel";

const FLOOR_METAL_PANEL_POOL: ResourcePool = {
	label: "Metal Panel Floor",
	harvestDuration: 80,
	consumedOnHarvest: true,
	yields: [
		{ resource: "heavy_metals", min: 2, max: 4 },
		{ resource: "scrap", min: 1, max: 2 },
	],
};

const FLOOR_CONCRETE_SLAB_POOL: ResourcePool = {
	label: "Concrete Slab Floor",
	harvestDuration: 90,
	consumedOnHarvest: true,
	yields: [
		{ resource: "heavy_metals", min: 1, max: 2 },
		{ resource: "scrap", min: 2, max: 3 },
	],
};

const FLOOR_INDUSTRIAL_GRATING_POOL: ResourcePool = {
	label: "Industrial Grating Floor",
	harvestDuration: 70,
	consumedOnHarvest: true,
	yields: [
		{ resource: "light_metals", min: 2, max: 3 },
		{ resource: "scrap", min: 1, max: 2 },
	],
};

const FLOOR_RUSTY_PLATING_POOL: ResourcePool = {
	label: "Rusty Plating Floor",
	harvestDuration: 60,
	consumedOnHarvest: true,
	yields: [
		{ resource: "heavy_metals", min: 1, max: 2 },
		{ resource: "scrap", min: 2, max: 4 },
	],
};

const FLOOR_CORRODED_STEEL_POOL: ResourcePool = {
	label: "Corroded Steel Floor",
	harvestDuration: 50,
	consumedOnHarvest: true,
	yields: [
		{ resource: "scrap", min: 2, max: 4 },
		{ resource: "heavy_metals", min: 0, max: 1 },
	],
};

const FLOOR_POOLS: Record<FloorMaterialId, ResourcePool> = {
	metal_panel: FLOOR_METAL_PANEL_POOL,
	concrete_slab: FLOOR_CONCRETE_SLAB_POOL,
	industrial_grating: FLOOR_INDUSTRIAL_GRATING_POOL,
	rusty_plating: FLOOR_RUSTY_PLATING_POOL,
	corroded_steel: FLOOR_CORRODED_STEEL_POOL,
};

// ─── Lookup Functions ────────────────────────────────────────────────────────

/**
 * Get the resource pool for a structure based on its model family and ID.
 *
 * Model IDs from the city catalog contain semantic hints:
 * - Props_Computer*, Props_ComputerSmall → computer pool
 * - Props_Container*, Props_Crate*, Props_Chest* → container pool
 * - Props_Vessel*, Props_Capsule*, Props_Pod → vessel pool
 * - Pipes* → utility pool
 * - Power* → power infrastructure pool
 */
export function getResourcePoolForModel(
	family: string,
	modelId: string,
): ResourcePool {
	const id = modelId.toLowerCase();

	// Special subcategory matching within prop family
	if (family === "prop") {
		if (
			id.includes("computer") ||
			id.includes("laser") ||
			id.includes("teleporter")
		) {
			return PROP_COMPUTER_POOL;
		}
		if (
			id.includes("container") ||
			id.includes("crate") ||
			id.includes("chest") ||
			id.includes("shelf")
		) {
			return PROP_CONTAINER_POOL;
		}
		if (id.includes("vessel") || id.includes("capsule") || id.includes("pod")) {
			return PROP_VESSEL_POOL;
		}
		return PROP_GENERIC_POOL;
	}

	// Zone-based overrides
	if (id.includes("power") || id.includes("sink") || id.includes("reactor")) {
		return POWER_INFRASTRUCTURE_POOL;
	}
	if (
		id.includes("archive") ||
		id.includes("research") ||
		id.includes("observatory")
	) {
		return RESEARCH_EQUIPMENT_POOL;
	}

	// Family-based pools
	switch (family) {
		case "wall":
			return WALL_POOL;
		case "column":
			return COLUMN_POOL;
		case "utility":
			return UTILITY_POOL;
		case "detail":
			return DETAIL_POOL;
		case "stair":
			return STAIR_POOL;
		case "door":
			return DOOR_POOL;
		case "roof":
			return ROOF_POOL;
		default:
			return PROP_GENERIC_POOL;
	}
}

/**
 * Roll the actual yield from a resource pool using a deterministic seed.
 */
export function rollHarvestYield(
	pool: ResourcePool,
	seed: number,
): Map<HarvestResource, number> {
	const yields = new Map<HarvestResource, number>();
	let state = seed >>> 0;

	for (const entry of pool.yields) {
		state = (Math.imul(state ^ 0x45d9f3b, 0x45d9f3b) + 1) >>> 0;
		const range = entry.max - entry.min;
		const amount = range > 0 ? entry.min + (state % (range + 1)) : entry.min;
		if (amount > 0) {
			yields.set(entry.resource, (yields.get(entry.resource) ?? 0) + amount);
		}
	}

	return yields;
}

/**
 * Check if a structure family is harvestable.
 * Structure families (wall, prop, etc.) are harvestable; floor is handled via floor harvest.
 */
export function isHarvestable(family: string): boolean {
	return family !== "floor";
}

/**
 * Check if a floor material is harvestable (strip-mining).
 */
export function isFloorHarvestable(floorMaterial: string): boolean {
	return floorMaterial in FLOOR_POOLS;
}

/**
 * Get the resource pool for a floor material (strip-mining).
 * Returns the default metal panel pool for unknown materials.
 */
export function getResourcePoolForFloorMaterial(
	floorMaterial: string,
): ResourcePool {
	const pool = FLOOR_POOLS[floorMaterial as FloorMaterialId];
	return pool ?? FLOOR_METAL_PANEL_POOL;
}
