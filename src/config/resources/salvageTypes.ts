/**
 * Salvage type definitions — harvestable ecumenopolis props.
 *
 * These are the PRIMARY resource source. Ancient dead-world debris
 * that players break down for materials. Buildings and props on the
 * surface contain the good stuff; floor mining is the backstop.
 *
 * Yield patterns ported from pending/config/modelDefinitions.json
 * harvest data, mapped to our 13-material ResourceMaterial taxonomy.
 */

import type { ResourceMaterial } from "../../terrain";
import type { SalvageType } from "../../traits";

export interface YieldRange {
	readonly min: number;
	readonly max: number;
}

export interface SalvageDef {
	readonly displayName: string;
	/** Ticks to harvest. */
	readonly harvestDuration: number;
	readonly hp: number;
	readonly yields: Partial<Record<ResourceMaterial, YieldRange>>;
	/** GLB model IDs from public/assets/models/ that represent this type. */
	readonly models: readonly string[];
}

export const SALVAGE_DEFS: Record<SalvageType, SalvageDef> = {
	container: {
		displayName: "Storage Container",
		harvestDuration: 4,
		hp: 20,
		yields: {
			polymer_salvage: { min: 1, max: 2 },
			scrap_metal: { min: 2, max: 4 },
		},
		models: [
			"props_chest",
			"props_container_full",
			"props_crate",
			"props_crate_long",
		],
	},
	terminal: {
		displayName: "Data Terminal",
		harvestDuration: 8,
		hp: 25,
		yields: {
			silicon_wafer: { min: 1, max: 3 },
			conductor_wire: { min: 1, max: 2 },
		},
		models: ["computer", "computer_large"],
	},
	vessel: {
		displayName: "Industrial Vessel",
		harvestDuration: 5,
		hp: 20,
		yields: {
			electrolyte: { min: 1, max: 3 },
			scrap_metal: { min: 1, max: 2 },
		},
		models: ["barrel", "barrels", "barrels_rail"],
	},
	machinery: {
		displayName: "Heavy Machinery",
		harvestDuration: 8,
		hp: 40,
		yields: {
			ferrous_scrap: { min: 2, max: 5 },
			alloy_stock: { min: 1, max: 2 },
			silicon_wafer: { min: 0, max: 1 },
		},
		models: ["machine_generator", "robot_arm_a", "robot_arm_b"],
	},
	debris: {
		displayName: "Structural Debris",
		harvestDuration: 3,
		hp: 15,
		yields: {
			scrap_metal: { min: 2, max: 4 },
			ferrous_scrap: { min: 0, max: 1 },
		},
		models: ["props_base", "props_capsule"],
	},
	cargo_crate: {
		displayName: "Cargo Crate",
		harvestDuration: 3,
		hp: 15,
		yields: {
			scrap_metal: { min: 1, max: 3 },
			polymer_salvage: { min: 1, max: 2 },
		},
		models: [
			"cargo_a",
			"cargo_a_packed",
			"cargo_b",
			"containers_a",
			"containers_b",
		],
	},
	storage_rack: {
		displayName: "Storage Rack",
		harvestDuration: 5,
		hp: 20,
		yields: {
			ferrous_scrap: { min: 1, max: 3 },
			intact_components: { min: 0, max: 1 },
		},
		models: ["props_shelf", "props_shelf_tall"],
	},
	power_cell: {
		displayName: "Power Cell",
		harvestDuration: 6,
		hp: 25,
		yields: {
			electrolyte: { min: 2, max: 4 },
			storm_charge: { min: 0, max: 2 },
		},
		models: ["props_vessel", "props_vessel_short", "props_vessel_tall"],
	},
	landing_wreck: {
		displayName: "Landing Wreck",
		harvestDuration: 10,
		hp: 35,
		yields: {
			alloy_stock: { min: 2, max: 4 },
			silicon_wafer: { min: 1, max: 3 },
			conductor_wire: { min: 1, max: 2 },
		},
		models: ["lander_a"],
	},
	abyssal_relic: {
		displayName: "Abyssal Relic",
		harvestDuration: 8,
		hp: 30,
		yields: {
			depth_salvage: { min: 2, max: 5 },
			thermal_fluid: { min: 1, max: 3 },
			el_crystal: { min: 0, max: 1 },
		},
		models: ["props_pod"],
	},
} as const;

/** Get all GLB model IDs across all salvage types. */
export function getAllSalvageModelIds(): string[] {
	return Object.values(SALVAGE_DEFS).flatMap((def) => [...def.models]);
}

/** Lookup salvage type by model ID. */
export function getSalvageTypeForModel(modelId: string): SalvageType | null {
	for (const [type, def] of Object.entries(SALVAGE_DEFS)) {
		if (def.models.includes(modelId)) return type as SalvageType;
	}
	return null;
}
