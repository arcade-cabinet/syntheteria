/**
 * Cult of EL mech definitions.
 *
 * Three archetypes that escalate over real-time game duration.
 * Uses component-based damage (not HP) — each mech has a loadout
 * of functional components that break individually.
 *
 * GLB models: Mecha01.glb, MechaGolem.glb, MechaTrooper.glb
 */

import type { UnitComponent } from "../ecs/types";

// ---------------------------------------------------------------------------
// Cult mech type IDs
// ---------------------------------------------------------------------------

export type CultMechType = "wanderer" | "brute" | "assault";

// ---------------------------------------------------------------------------
// Mech archetype definitions
// ---------------------------------------------------------------------------

export interface CultMechDef {
	/** Display name shown in UI */
	displayName: string;
	/** Unit type identifier */
	unitType: CultMechType;
	/** GLB model path (relative to public/) */
	modelPath: string;
	/** Movement speed (units per second) */
	speed: number;
	/** Detection range — how far the mech can spot player units */
	aggroRange: number;
	/** Attack range — how close to target before attacking */
	attackRange: number;
	/** Components this mech spawns with */
	components: UnitComponent[];
}

/**
 * Wanderer (Mecha01) — weak scout, patrols alone.
 * Low aggro range, slow, minimal components.
 * Available from game start (tier 1).
 */
export const CULT_WANDERER: CultMechDef = {
	displayName: "Cult Wanderer",
	unitType: "wanderer",
	modelPath: "assets/models/robots/cult/Mecha01.glb",
	speed: 2,
	aggroRange: 5,
	attackRange: 2.5,
	components: [
		{ name: "camera", functional: true, material: "electronic" },
		{ name: "legs", functional: true, material: "metal" },
		{ name: "power_cell", functional: true, material: "electronic" },
	],
};

/**
 * Brute (MechaGolem) — heavy melee, slow, tough.
 * High component count = takes more hits to destroy.
 * Appears in war parties (tier 2, 10+ min).
 */
export const CULT_BRUTE: CultMechDef = {
	displayName: "Cult Brute",
	unitType: "brute",
	modelPath: "assets/models/robots/cult/MechaGolem.glb",
	speed: 1.5,
	aggroRange: 4,
	attackRange: 2,
	components: [
		{ name: "camera", functional: true, material: "electronic" },
		{ name: "arms", functional: true, material: "metal" },
		{ name: "arms", functional: true, material: "metal" },
		{ name: "legs", functional: true, material: "metal" },
		{ name: "power_cell", functional: true, material: "electronic" },
		{ name: "power_cell", functional: true, material: "electronic" },
	],
};

/**
 * Assault (MechaTrooper) — fast, ranged, dangerous.
 * Longer attack range, faster movement. Glass cannon — fewer components.
 * Appears in assault waves (tier 3, 25+ min).
 */
export const CULT_ASSAULT: CultMechDef = {
	displayName: "Cult Assault",
	unitType: "assault",
	modelPath: "assets/models/robots/cult/MechaTrooper.glb",
	speed: 3.5,
	aggroRange: 8,
	attackRange: 4,
	components: [
		{ name: "camera", functional: true, material: "electronic" },
		{ name: "arms", functional: true, material: "metal" },
		{ name: "legs", functional: true, material: "metal" },
		{ name: "power_cell", functional: true, material: "electronic" },
	],
};

/** All cult mech definitions indexed by type */
export const CULT_MECH_DEFS: Record<CultMechType, CultMechDef> = {
	wanderer: CULT_WANDERER,
	brute: CULT_BRUTE,
	assault: CULT_ASSAULT,
};

// ---------------------------------------------------------------------------
// Escalation tier configuration
// ---------------------------------------------------------------------------

export interface EscalationTier {
	/** Tier number (1-3) */
	level: number;
	/** Game time in seconds before this tier activates */
	timeThresholdSec: number;
	/** Max cult units alive at this tier */
	maxEnemies: number;
	/** Seconds between spawn attempts */
	spawnIntervalSec: number;
	/** Which mech types can spawn at this tier */
	availableTypes: CultMechType[];
	/** Group size for spawns (1 = solo, 2-3 = war party, 3-5 = assault wave) */
	groupSize: [min: number, max: number];
}

export const ESCALATION_TIERS: EscalationTier[] = [
	{
		level: 1,
		timeThresholdSec: 0,
		maxEnemies: 4,
		spawnIntervalSec: 45,
		availableTypes: ["wanderer"],
		groupSize: [1, 1],
	},
	{
		level: 2,
		timeThresholdSec: 600, // 10 minutes
		maxEnemies: 8,
		spawnIntervalSec: 30,
		availableTypes: ["wanderer", "brute"],
		groupSize: [2, 3],
	},
	{
		level: 3,
		timeThresholdSec: 1500, // 25 minutes
		maxEnemies: 14,
		spawnIntervalSec: 20,
		availableTypes: ["wanderer", "brute", "assault"],
		groupSize: [3, 5],
	},
];

/**
 * Determine the current escalation tier based on elapsed game seconds.
 */
export function getEscalationTier(elapsedSec: number): EscalationTier {
	let tier = ESCALATION_TIERS[0];
	for (const t of ESCALATION_TIERS) {
		if (elapsedSec >= t.timeThresholdSec) {
			tier = t;
		}
	}
	return tier;
}

/**
 * Pick a random mech type from the available types at the given tier.
 */
export function pickCultMechType(tier: EscalationTier): CultMechType {
	const types = tier.availableTypes;
	return types[Math.floor(Math.random() * types.length)];
}

/**
 * Pick a random group size within the tier's range.
 */
export function pickGroupSize(tier: EscalationTier): number {
	const [min, max] = tier.groupSize;
	return min + Math.floor(Math.random() * (max - min + 1));
}
