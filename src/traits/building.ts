/**
 * Faction building traits — structures built by player and AI factions.
 *
 * Power model: the perpetual storm IS the power grid.
 * Storm transmitters tap it, power boxes store the charge,
 * everything else draws from nearby power boxes.
 */

import { trait } from "koota";

// ─── Types ───────────────────────────────────────────────────────────────────

export type BuildingType =
	| "storm_transmitter"
	| "power_box"
	| "synthesizer"
	| "motor_pool"
	| "relay_tower"
	| "defense_turret"
	| "storage_hub"
	| "maintenance_bay"
	| "power_plant"
	| "analysis_node"
	| "resource_refinery"
	| "solar_array"
	| "geothermal_tap"
	| "outpost"
	| "wormhole_stabilizer";

/** @deprecated Use "analysis_node" instead. Backward-compat alias. */
export const RESEARCH_LAB_ALIAS: BuildingType = "analysis_node";

// ─── Traits ──────────────────────────────────────────────────────────────────

/** A faction-placed structure on the board. */
export const Building = trait({
	tileX: 0,
	tileZ: 0,
	buildingType: "storage_hub" as BuildingType,
	modelId: "",
	factionId: "",
	hp: 50,
	maxHp: 50,
	buildingTier: 1 as 1 | 2 | 3,
});

/** Power grid participation. Positive = generates/transmits, negative = draws. */
export const PowerGrid = trait({
	powerDelta: 0,
	storageCapacity: 0,
	currentCharge: 0,
	powerRadius: 0,
});

/** Whether a building currently has power. Added/removed by runPowerGrid. */
export const Powered = trait();

/** Signal network participation (relay towers, antennas). */
export const SignalNode = trait({
	range: 0,
	strength: 1.0,
});

/** Defense capability (turrets). */
export const TurretStats = trait({
	attackDamage: 3,
	attackRange: 8,
	cooldownTurns: 2,
	currentCooldown: 0,
});

/** Bot production capability (motor pools). */
export const BotFabricator = trait({
	fabricationSlots: 1,
	queueSize: 0,
});

/** Storage capacity (storage hubs, hangars). */
export const StorageCapacity = trait({
	capacity: 50,
});
