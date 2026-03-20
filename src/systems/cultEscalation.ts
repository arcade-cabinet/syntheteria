/**
 * @module cultEscalation
 *
 * Escalation stage logic and per-sect behavior bias profiles.
 * Determines how cult units behave based on game progression.
 */

// ---------------------------------------------------------------------------
// Escalation stages — behavior changes with escalation tier
// ---------------------------------------------------------------------------

/**
 * Escalation stages determine cult unit behavior:
 *   - "wanderer"  (tier 0-1): random wander, flee from faction units
 *   - "war_party" (tier 2-3): coordinated groups, target faction territory edges
 *   - "assault"   (tier 4+):  direct attacks on faction buildings and units
 */
export type EscalationStage = "wanderer" | "war_party" | "assault";

export function getEscalationStage(tier: number): EscalationStage {
	if (tier <= 1) return "wanderer";
	if (tier <= 3) return "war_party";
	return "assault";
}

// ---------------------------------------------------------------------------
// Per-sect behavior profiles
// ---------------------------------------------------------------------------

/**
 * Bias profile that modifies cult unit behavior per sect:
 *   - Static Remnants: territorial, defend POIs, swarm tactics
 *   - Null Monks: stealth/ambush, target isolated units, spread corruption
 *   - Lost Signal: aggressive chargers, berserker behavior
 */
export interface SectBias {
	/** Extra patrol radius multiplier (>1 = wider patrol, <1 = tighter defense). */
	patrolRadiusMult: number;
	/** If true, prioritize isolated enemies (furthest from other enemies). */
	targetIsolated: boolean;
	/** If true, prefer attacking buildings over units in assault stage. */
	preferBuildings: boolean;
	/** Attack damage bonus (added to base 2). */
	attackBonus: number;
	/** If true, flee threshold is lower (engages more aggressively even in wanderer stage). */
	aggressive: boolean;
	/** If true, prioritize spreading corruption (stay near corruption nodes). */
	spreadCorruption: boolean;
}

export const SECT_BIASES: Record<string, SectBias> = {
	static_remnants: {
		patrolRadiusMult: 0.75, // Tight patrol — defend POIs
		targetIsolated: false,
		preferBuildings: false,
		attackBonus: 0,
		aggressive: false,
		spreadCorruption: false,
	},
	null_monks: {
		patrolRadiusMult: 1.5, // Wide patrol — ambush range
		targetIsolated: true, // Target isolated units
		preferBuildings: false,
		attackBonus: 0,
		aggressive: false,
		spreadCorruption: true, // Prioritize corruption spread
	},
	lost_signal: {
		patrolRadiusMult: 1.0,
		targetIsolated: false,
		preferBuildings: true, // Charge buildings in assault
		attackBonus: 1, // Berserker damage bonus
		aggressive: true, // Engages even in wanderer stage
		spreadCorruption: false,
	},
};

export function getSectBias(factionId: string): SectBias {
	return SECT_BIASES[factionId] ?? SECT_BIASES.static_remnants;
}
