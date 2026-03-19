/**
 * Resource traits — full 13-material ecumenopolis salvage taxonomy.
 *
 * Replaces the old 3-type "ore | crystal | scrap" system.
 * Ported and expanded from pending/systems/resources.ts.
 *
 * Material tiers:
 *   Foundation — ferrous_scrap, alloy_stock, polymer_salvage, conductor_wire
 *   Advanced   — electrolyte, silicon_wafer, storm_charge, el_crystal
 *   Common     — scrap_metal, e_waste, intact_components
 *   Abyssal    — thermal_fluid, depth_salvage
 */

import { trait } from "koota";
import type { ResourceMaterial } from "../terrain/types";

/** Surface deposit — a vein or pile of salvageable material on a tile. */
export const ResourceDeposit = trait({
	tileX: 0,
	tileZ: 0,
	material: "scrap_metal" as ResourceMaterial,
	amount: 0,
	depleted: false,
});

/**
 * Faction resource pool — accumulated stockpile per faction.
 * One entity per faction, queried alongside Faction trait.
 */
export const ResourcePool = trait({
	// Foundation tier
	ferrous_scrap: 0,
	alloy_stock: 0,
	polymer_salvage: 0,
	conductor_wire: 0,
	// Advanced tier
	electrolyte: 0,
	silicon_wafer: 0,
	storm_charge: 0,
	el_crystal: 0,
	// Common tier
	scrap_metal: 0,
	e_waste: 0,
	intact_components: 0,
	// Abyssal tier
	thermal_fluid: 0,
	depth_salvage: 0,
});
