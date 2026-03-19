/**
 * Cult structure traits — remnants of failed human colony missions.
 *
 * Cults are the only entities with human traces on Syntheteria.
 * Their structures spawn at breach zones and corrupt nearby tiles.
 * NOT buildable by player/AI factions.
 */

import { trait } from "koota";

export type CultStructureType =
	| "breach_altar"
	| "signal_corruptor"
	| "human_shelter"
	| "corruption_node"
	| "cult_stronghold";

/**
 * Mutation state for a cult mech unit.
 * turnsAlive increments each turn; mutationTier is derived from it.
 * mutationSeed is set at spawn for deterministic buff selection.
 */
export const CultMutation = trait({
	turnsAlive: 0,
	/** 0 = base, 1 = one buff, 2 = two buffs + ability, 3 = aberrant */
	mutationTier: 0 as 0 | 1 | 2 | 3,
	/** Seed for deterministic mutation selection (entity ID at spawn time). */
	mutationSeed: 0,
	/** Tier 2 special ability. Empty until tier 2. */
	specialAbility: "" as "" | "regen" | "area_attack" | "fear_aura",
});

/** A cult-placed structure at a breach zone. */
export const CultStructure = trait({
	tileX: 0,
	tileZ: 0,
	structureType: "breach_altar" as CultStructureType,
	modelId: "",
	hp: 40,
	maxHp: 40,
	/** Radius of tile corruption effect. */
	corruptionRadius: 3,
	/** Does this structure spawn cultist units? */
	spawnsUnits: false,
	/** Turns between unit spawns (if spawnsUnits). */
	spawnInterval: 0,
});
