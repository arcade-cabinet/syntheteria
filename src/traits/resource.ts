/**
 * Resource traits — natural → processed → synthetic material taxonomy.
 *
 * Material tiers:
 *   Natural    — stone, timber, iron_ore, coal, food, fiber, sand, clay
 *   Processed  — steel, concrete, glass, circuits, fuel
 *   Synthetic  — alloy, nanomaterial, fusion_cell, quantum_crystal
 */

import { trait } from "koota";
import type { ResourceMaterial } from "../terrain/types";

/** Surface deposit — a vein or pile of harvestable material on a tile. */
export const ResourceDeposit = trait({
	tileX: 0,
	tileZ: 0,
	material: "stone" as ResourceMaterial,
	amount: 0,
	depleted: false,
});

/**
 * Faction resource pool — accumulated stockpile per faction.
 * One entity per faction, queried alongside Faction trait.
 */
export const ResourcePool = trait({
	// Natural tier
	stone: 0,
	timber: 0,
	iron_ore: 0,
	coal: 0,
	food: 0,
	fiber: 0,
	sand: 0,
	clay: 0,
	// Processed tier
	steel: 0,
	concrete: 0,
	glass: 0,
	circuits: 0,
	fuel: 0,
	// Synthetic tier
	alloy: 0,
	nanomaterial: 0,
	fusion_cell: 0,
	quantum_crystal: 0,
});
