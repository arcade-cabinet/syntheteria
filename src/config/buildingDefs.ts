/**
 * Building type definitions for Syntheteria.
 *
 * Six placeable building types, each with resource costs,
 * placement constraints, and default component loadouts.
 */

import type { ResourcePool } from "../systems/resources";
import type { UnitComponent } from "../ecs/types";

export interface BuildingDef {
	/** Internal key — matches BuildingTrait.buildingType */
	type: string;
	/** Display name shown in UI */
	displayName: string;
	/** Resource costs to place */
	costs: { type: keyof ResourcePool; amount: number }[];
	/** Default components for this building */
	defaultComponents: UnitComponent[];
	/** Whether this building starts powered (lightning rods self-power) */
	startsPowered: boolean;
	/** Minimum spacing from other buildings of the same type (0 = no constraint) */
	minSpacing: number;
	/** Whether this building is also a Unit (selectable, has inventory) */
	isUnit: boolean;
}

export const BUILDING_DEFS: Record<string, BuildingDef> = {
	lightning_rod: {
		type: "lightning_rod",
		displayName: "Lightning Rod",
		costs: [
			{ type: "scrapMetal", amount: 5 },
			{ type: "circuitry", amount: 2 },
		],
		defaultComponents: [],
		startsPowered: true,
		minSpacing: 10,
		isUnit: false,
	},
	power_conduit: {
		type: "power_conduit",
		displayName: "Power Conduit",
		costs: [
			{ type: "scrapMetal", amount: 3 },
			{ type: "circuitry", amount: 1 },
		],
		defaultComponents: [
			{ name: "power_relay", functional: true, material: "electronic" },
		],
		startsPowered: false,
		minSpacing: 0,
		isUnit: false,
	},
	fabrication_unit: {
		type: "fabrication_unit",
		displayName: "Fabrication Unit",
		costs: [
			{ type: "scrapMetal", amount: 8 },
			{ type: "circuitry", amount: 3 },
			{ type: "durasteel", amount: 1 },
		],
		defaultComponents: [
			{ name: "power_supply", functional: false, material: "electronic" },
			{ name: "fabrication_arm", functional: true, material: "metal" },
			{ name: "material_hopper", functional: true, material: "metal" },
		],
		startsPowered: false,
		minSpacing: 0,
		isUnit: true,
	},
	server_rack: {
		type: "server_rack",
		displayName: "Server Rack",
		costs: [
			{ type: "circuitry", amount: 5 },
			{ type: "powerCells", amount: 2 },
		],
		defaultComponents: [
			{ name: "compute_module", functional: true, material: "electronic" },
			{ name: "cooling_fan", functional: true, material: "metal" },
		],
		startsPowered: false,
		minSpacing: 0,
		isUnit: false,
	},
	relay_station: {
		type: "relay_station",
		displayName: "Relay Station",
		costs: [
			{ type: "scrapMetal", amount: 4 },
			{ type: "circuitry", amount: 3 },
		],
		defaultComponents: [
			{ name: "antenna", functional: true, material: "metal" },
			{ name: "signal_processor", functional: true, material: "electronic" },
		],
		startsPowered: false,
		minSpacing: 0,
		isUnit: false,
	},
	defense_turret: {
		type: "defense_turret",
		displayName: "Defense Turret",
		costs: [
			{ type: "scrapMetal", amount: 6 },
			{ type: "durasteel", amount: 2 },
			{ type: "circuitry", amount: 2 },
		],
		defaultComponents: [
			{ name: "targeting_sensor", functional: true, material: "electronic" },
			{ name: "weapon_mount", functional: true, material: "metal" },
			{ name: "ammo_feed", functional: true, material: "metal" },
		],
		startsPowered: false,
		minSpacing: 6,
		isUnit: false,
	},
};

export type BuildingType = keyof typeof BUILDING_DEFS;

export const BUILDING_TYPES = Object.keys(BUILDING_DEFS) as BuildingType[];
