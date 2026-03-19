import type { World } from "koota";
import { CultMutation } from "../traits/cult";
import { UnitFaction, UnitPos, UnitStats, UnitVisual } from "../traits/unit";

// ---------------------------------------------------------------------------
// Unit type ID — used for tier-based spawning in cultistSystem
// ---------------------------------------------------------------------------

export type CultMechType =
	| "cultist_drone"
	| "cultist_zealot"
	| "cultist_shaman"
	| "cultist_herald"
	| "cultist_archon";

// ---------------------------------------------------------------------------
// Tier 0: Cultist Drone (was "infantry") — basic armored trooper
// ---------------------------------------------------------------------------

/** Cult Infantry — armored trooper mech. MechaTrooper.glb */
export const CULT_INFANTRY_DEFAULTS = {
	stats: { hp: 12, maxHp: 12, ap: 2, maxAp: 2, mp: 2, maxMp: 2, scanRange: 3, attack: 4, defense: 2, attackRange: 1 },
	visual: { modelId: "cult_infantry", scale: 1.0, facingAngle: 0 },
} as const;

export function spawnCultInfantry(
	world: World,
	tileX: number,
	tileZ: number,
	factionId: string,
) {
	const e = world.spawn(
		UnitPos({ tileX, tileZ }),
		UnitStats({ ...CULT_INFANTRY_DEFAULTS.stats }),
		UnitVisual({ ...CULT_INFANTRY_DEFAULTS.visual }),
		UnitFaction({ factionId }),
		CultMutation({ turnsAlive: 0, mutationTier: 0, mutationSeed: 0, specialAbility: "" }),
	);
	e.set(CultMutation, { turnsAlive: 0, mutationTier: 0, mutationSeed: e.id(), specialAbility: "" });
	return e;
}

// ---------------------------------------------------------------------------
// Tier 1: Cultist Zealot (was "ranged") — fast ranged attacker
// ---------------------------------------------------------------------------

/** Cult Ranged — industrial golem, ranged fire. MechaGolem.glb */
export const CULT_RANGED_DEFAULTS = {
	stats: { hp: 10, maxHp: 10, ap: 2, maxAp: 2, mp: 2, maxMp: 2, scanRange: 5, attack: 5, defense: 1, attackRange: 2 },
	visual: { modelId: "cult_ranged", scale: 1.0, facingAngle: 0 },
} as const;

export function spawnCultRanged(
	world: World,
	tileX: number,
	tileZ: number,
	factionId: string,
) {
	const e = world.spawn(
		UnitPos({ tileX, tileZ }),
		UnitStats({ ...CULT_RANGED_DEFAULTS.stats }),
		UnitVisual({ ...CULT_RANGED_DEFAULTS.visual }),
		UnitFaction({ factionId }),
		CultMutation({ turnsAlive: 0, mutationTier: 0, mutationSeed: 0, specialAbility: "" }),
	);
	e.set(CultMutation, { turnsAlive: 0, mutationTier: 0, mutationSeed: e.id(), specialAbility: "" });
	return e;
}

// ---------------------------------------------------------------------------
// Tier 2: Cultist Shaman — support unit with signal amplification
// ---------------------------------------------------------------------------

export const CULT_SHAMAN_DEFAULTS = {
	stats: { hp: 8, maxHp: 8, ap: 2, maxAp: 2, mp: 2, maxMp: 2, scanRange: 6, attack: 3, defense: 1, attackRange: 2 },
	visual: { modelId: "cult_shaman", scale: 1.0, facingAngle: 0 },
} as const;

export function spawnCultShaman(
	world: World,
	tileX: number,
	tileZ: number,
	factionId: string,
) {
	const e = world.spawn(
		UnitPos({ tileX, tileZ }),
		UnitStats({ ...CULT_SHAMAN_DEFAULTS.stats }),
		UnitVisual({ ...CULT_SHAMAN_DEFAULTS.visual }),
		UnitFaction({ factionId }),
		CultMutation({ turnsAlive: 0, mutationTier: 0, mutationSeed: 0, specialAbility: "" }),
	);
	e.set(CultMutation, { turnsAlive: 0, mutationTier: 0, mutationSeed: e.id(), specialAbility: "" });
	return e;
}

// ---------------------------------------------------------------------------
// Tier 3: Cultist Herald (was "cavalry") — fast strike bipedal mech
// ---------------------------------------------------------------------------

/** Cult Cavalry — fast strike bipedal mech. Mecha01.glb */
export const CULT_CAVALRY_DEFAULTS = {
	stats: { hp: 8, maxHp: 8, ap: 2, maxAp: 2, mp: 4, maxMp: 4, scanRange: 4, attack: 3, defense: 1, attackRange: 1 },
	visual: { modelId: "cult_cavalry", scale: 1.0, facingAngle: 0 },
} as const;

export function spawnCultCavalry(
	world: World,
	tileX: number,
	tileZ: number,
	factionId: string,
) {
	const e = world.spawn(
		UnitPos({ tileX, tileZ }),
		UnitStats({ ...CULT_CAVALRY_DEFAULTS.stats }),
		UnitVisual({ ...CULT_CAVALRY_DEFAULTS.visual }),
		UnitFaction({ factionId }),
		CultMutation({ turnsAlive: 0, mutationTier: 0, mutationSeed: 0, specialAbility: "" }),
	);
	e.set(CultMutation, { turnsAlive: 0, mutationTier: 0, mutationSeed: e.id(), specialAbility: "" });
	return e;
}

// ---------------------------------------------------------------------------
// Tier 4: Cultist Archon — elite boss unit
// ---------------------------------------------------------------------------

export const CULT_ARCHON_DEFAULTS = {
	stats: { hp: 20, maxHp: 20, ap: 3, maxAp: 3, mp: 3, maxMp: 3, scanRange: 7, attack: 6, defense: 3, attackRange: 2 },
	visual: { modelId: "cult_archon", scale: 1.2, facingAngle: 0 },
} as const;

export function spawnCultArchon(
	world: World,
	tileX: number,
	tileZ: number,
	factionId: string,
) {
	const e = world.spawn(
		UnitPos({ tileX, tileZ }),
		UnitStats({ ...CULT_ARCHON_DEFAULTS.stats }),
		UnitVisual({ ...CULT_ARCHON_DEFAULTS.visual }),
		UnitFaction({ factionId }),
		CultMutation({ turnsAlive: 0, mutationTier: 0, mutationSeed: 0, specialAbility: "" }),
	);
	e.set(CultMutation, { turnsAlive: 0, mutationTier: 0, mutationSeed: e.id(), specialAbility: "" });
	return e;
}

// ---------------------------------------------------------------------------
// Escalation tiers — which unit types are available at each tier
// ---------------------------------------------------------------------------

/**
 * Territory milestones that trigger tier advancement.
 * When the player controls >= N tiles, the cult advances to the next tier.
 * Ported from pending/config/cultists.json.
 */
export const CULT_TERRITORY_MILESTONES = [10, 25, 50, 100] as const;

/**
 * Unit types available at each escalation tier (0-4).
 * Higher tiers unlock more dangerous unit types.
 */
export const CULT_TIER_UNIT_TYPES: readonly (readonly CultMechType[])[] = [
	["cultist_drone"],
	["cultist_drone", "cultist_zealot"],
	["cultist_drone", "cultist_zealot", "cultist_shaman"],
	["cultist_drone", "cultist_zealot", "cultist_shaman", "cultist_herald"],
	["cultist_drone", "cultist_zealot", "cultist_shaman", "cultist_herald", "cultist_archon"],
] as const;

/** Max enemies allowed per escalation tier. */
export const CULT_MAX_ENEMIES_PER_TIER = [4, 6, 9, 14, 20] as const;

/**
 * Determine escalation tier based on player territory size.
 */
export function getEscalationTier(playerTerritory: number): number {
	let tier = 0;
	for (const milestone of CULT_TERRITORY_MILESTONES) {
		if (playerTerritory >= milestone) tier++;
	}
	return tier;
}

/**
 * Spawn a cult mech by type ID at the given position.
 */
export function spawnCultMechByType(
	world: World,
	mechType: CultMechType,
	tileX: number,
	tileZ: number,
	factionId: string,
) {
	switch (mechType) {
		case "cultist_drone":
			return spawnCultInfantry(world, tileX, tileZ, factionId);
		case "cultist_zealot":
			return spawnCultRanged(world, tileX, tileZ, factionId);
		case "cultist_shaman":
			return spawnCultShaman(world, tileX, tileZ, factionId);
		case "cultist_herald":
			return spawnCultCavalry(world, tileX, tileZ, factionId);
		case "cultist_archon":
			return spawnCultArchon(world, tileX, tileZ, factionId);
	}
}
