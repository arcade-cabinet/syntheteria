/**
 * Human encounter event definitions for the temperature system.
 *
 * Each event has a delta (positive = warmer/friendlier, negative = colder/hostile).
 * Events are triggered by gameplay actions and feed into the
 * humanTemperature system to shift disposition.
 */

export type HumanEventType =
	| "cult_room_cleared"
	| "build_near_humans"
	| "unit_lost"
	| "shrine_destroyed"
	| "friendly_fire";

export interface HumanEncounterDef {
	/** Event type identifier */
	type: HumanEventType;
	/** Display label for UI log */
	label: string;
	/** Temperature delta (positive = warmer, negative = colder) */
	delta: number;
}

export const HUMAN_ENCOUNTER_DEFS: Record<HumanEventType, HumanEncounterDef> = {
	cult_room_cleared: {
		type: "cult_room_cleared",
		label: "Cult room cleared",
		delta: 5,
	},
	build_near_humans: {
		type: "build_near_humans",
		label: "Built near humans",
		delta: 3,
	},
	unit_lost: {
		type: "unit_lost",
		label: "Unit lost in combat",
		delta: -2,
	},
	shrine_destroyed: {
		type: "shrine_destroyed",
		label: "Cult shrine destroyed",
		delta: 8,
	},
	friendly_fire: {
		type: "friendly_fire",
		label: "Friendly fire",
		delta: -10,
	},
};

/**
 * 5-tier disposition system.
 * Tier boundaries are inclusive lower bounds.
 */
export type TemperatureTier = "frozen" | "cool" | "warm" | "hot" | "burning";

export interface TemperatureTierDef {
	tier: TemperatureTier;
	/** Minimum temperature value for this tier (inclusive) */
	minValue: number;
	/** Display name for UI */
	displayName: string;
	/** Color for UI gauge */
	color: string;
	/** Brief description of gameplay effects */
	effect: string;
}

export const TEMPERATURE_TIERS: TemperatureTierDef[] = [
	{
		tier: "frozen",
		minValue: 0,
		displayName: "Frozen",
		color: "#4488ff",
		effect: "Humans hide. No interaction possible.",
	},
	{
		tier: "cool",
		minValue: 21,
		displayName: "Cool",
		color: "#44ccff",
		effect: "Humans appear. Cautious observation.",
	},
	{
		tier: "warm",
		minValue: 41,
		displayName: "Warm",
		color: "#ffcc44",
		effect: "Humans reveal shrine locations.",
	},
	{
		tier: "hot",
		minValue: 61,
		displayName: "Hot",
		color: "#ff8844",
		effect: "Human scouts join your force.",
	},
	{
		tier: "burning",
		minValue: 81,
		displayName: "Burning",
		color: "#ff4444",
		effect: "Human militia spawns to fight the cult.",
	},
];

/**
 * Get the current tier definition for a temperature value.
 */
export function getTemperatureTier(value: number): TemperatureTierDef {
	let current = TEMPERATURE_TIERS[0];
	for (const tier of TEMPERATURE_TIERS) {
		if (value >= tier.minValue) {
			current = tier;
		}
	}
	return current;
}
