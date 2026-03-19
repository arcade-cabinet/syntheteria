/**
 * Building blueprint definitions — stats, components, capabilities.
 *
 * Converted from pending/config/buildings.json to TypeScript const objects.
 *
 * Each building type has a blueprint that defines its power demand,
 * special capabilities (rod capacity, signal range, attack stats),
 * and default components. The building placement system reads these
 * to configure the ECS traits when a building is placed.
 *
 * Note: BuildingType is defined in src/ecs/traits/building.ts.
 * This file provides the DATA for each type, not the trait definitions.
 */

import type { BuildingType } from "../ecs/traits/building";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface BuildingComponent {
	readonly name: string;
	readonly functional: boolean;
	readonly material: "metal" | "electronic";
}

export interface BuildingBlueprint {
	readonly displayName: string;
	readonly powerDemand: number;
	/** Lightning rod capacity (lightning_rod only). */
	readonly rodCapacity?: number;
	/** Default power output (lightning_rod only). */
	readonly currentOutput?: number;
	/** Storm protection radius in tiles (lightning_rod only). */
	readonly protectionRadius?: number;
	/** Number of fabrication slots (motor_pool only). */
	readonly fabricationSlots?: number;
	/** Signal range in tiles (relay_tower only). */
	readonly signalRange?: number;
	/** Signal strength 0-1 (relay_tower only). */
	readonly signalStrength?: number;
	/** Attack range in tiles (defense_turret only). */
	readonly attackRange?: number;
	/** Attack damage per shot (defense_turret only). */
	readonly attackDamage?: number;
	/** Turns between attacks (defense_turret only). */
	readonly attackCooldown?: number;
	/** Power output (power_sink only). */
	readonly powerOutput?: number;
	/** Storage capacity in units (storage_hub, power_sink only). */
	readonly storageCapacity?: number;
	/** Number of bots this module houses (habitat_module only). */
	readonly botCapacity?: number;
	/** HP repair rate per turn (habitat_module only). */
	readonly repairRate?: number;
	/** Default components when building is placed. */
	readonly defaultComponents?: readonly BuildingComponent[];
}

// ─── Data ───────────────────────────────────────────────────────────────────

export const BUILDING_BLUEPRINTS: Partial<Record<BuildingType, BuildingBlueprint>> = {
	storm_transmitter: {
		displayName: "Lightning Rod",
		powerDemand: 0,
		rodCapacity: 10,
		currentOutput: 7,
		protectionRadius: 12,
	},
	synthesizer: {
		displayName: "Fabrication Unit",
		powerDemand: 3,
		defaultComponents: [
			{ name: "power_supply", functional: false, material: "electronic" },
			{ name: "fabrication_arm", functional: true, material: "metal" },
			{ name: "material_hopper", functional: true, material: "metal" },
		],
	},
	motor_pool: {
		displayName: "Motor Pool",
		powerDemand: 4,
		fabricationSlots: 1,
		defaultComponents: [
			{ name: "assembly_arm", functional: true, material: "metal" },
			{ name: "chassis_bay", functional: true, material: "metal" },
			{ name: "power_supply", functional: false, material: "electronic" },
		],
	},
	relay_tower: {
		displayName: "Relay Tower",
		powerDemand: 1,
		signalRange: 20,
		signalStrength: 1.0,
	},
	defense_turret: {
		displayName: "Defense Turret",
		powerDemand: 2,
		attackRange: 8,
		attackDamage: 3,
		attackCooldown: 2,
	},
	power_box: {
		displayName: "Power Sink",
		powerDemand: 0,
		powerOutput: 5,
		storageCapacity: 20,
	},
	storage_hub: {
		displayName: "Storage Hub",
		powerDemand: 1,
		storageCapacity: 50,
	},
	maintenance_bay: {
		displayName: "Habitat Module",
		powerDemand: 2,
		botCapacity: 4,
		repairRate: 0.1,
	},
} as const;

/** Get the display name for a building type, falling back to the type ID. */
export function getBuildingDisplayName(type: BuildingType): string {
	return BUILDING_BLUEPRINTS[type]?.displayName ?? type;
}
