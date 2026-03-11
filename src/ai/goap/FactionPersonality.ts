/**
 * FactionPersonality — maps civilization config data to GOAP goal weights.
 *
 * Each faction in config/civilizations.json has a `governorBias` object with
 * weights for broad categories (economy, mining, military, defense, research,
 * expansion). This module translates those into per-CivGoal weights and
 * applies dynamic modifiers based on current game state.
 *
 * The personality weights are the primary input to the governor's goal
 * scoring: base weight * situational modifier = final priority.
 */

import { CivGoal } from "./GoalTypes.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Governor bias weights as defined in config/civilizations.json */
export interface GovernorBias {
	economy: number;
	mining: number;
	military: number;
	defense: number;
	research: number;
	expansion: number;
	/** Optional religion bias — drives PURSUE_ENLIGHTENMENT goal weight. Defaults to 0. */
	religion?: number;
}

/** Full faction config entry from civilizations.json */
export interface FactionConfig {
	name: string;
	description: string;
	color: string;
	governorBias: GovernorBias;
}

/** Map of faction IDs to their configs */
export type CivilizationsConfig = Record<string, FactionConfig>;

/** Per-goal weight map produced by the personality system */
export type GoalWeights = Record<CivGoal, number>;

/**
 * Snapshot of a faction's situation, used to apply dynamic modifiers.
 * All fields are optional; missing fields are treated as "neutral" (no modifier).
 */
export interface FactionSituation {
	/** Fraction of total resources currently held (0..1) */
	resourceLevel?: number;
	/** Fraction of map explored (0..1) */
	explorationLevel?: number;
	/** Number of units currently idle */
	idleUnits?: number;
	/** Total units controlled */
	totalUnits?: number;
	/** Whether the faction is currently under attack */
	underAttack?: boolean;
	/** Number of outposts / forward bases */
	outpostCount?: number;
	/** Current tech tier index (0-based) */
	techTier?: number;
	/** Maximum tech tier available */
	maxTechTier?: number;
	/**
	 * Total estimated economic value of visible enemy cube stockpiles.
	 * Used by aggressive factions (e.g., Volt Collective) to evaluate raid urgency.
	 */
	enemyStockpileValue?: number;
	/**
	 * True if any enemy faction has a hackable building within signal range.
	 * Used by Signal Choir to boost attack via hacking rather than combat.
	 */
	hackableTargetsNearby?: boolean;
	/**
	 * Number of walls and defensive structures owned by this faction.
	 * Used by Iron Creed to decide when it is adequately fortified.
	 */
	ownWallCount?: number;
}

// ---------------------------------------------------------------------------
// Bias-to-goal mapping
// ---------------------------------------------------------------------------

/**
 * Maps each CivGoal to the governorBias keys that influence it,
 * with relative contribution weights. A goal can be influenced by
 * multiple bias categories.
 */
const GOAL_BIAS_MAP: Record<
	CivGoal,
	Partial<Record<keyof GovernorBias, number>>
> = {
	[CivGoal.EXPAND_TERRITORY]: { expansion: 0.7, military: 0.3 },
	[CivGoal.GATHER_RESOURCES]: { economy: 0.5, mining: 0.5 },
	[CivGoal.BUILD_DEFENSES]: { defense: 0.8, military: 0.2 },
	[CivGoal.RESEARCH_TECH]: { research: 0.9, economy: 0.1 },
	[CivGoal.ATTACK_ENEMY]: { military: 0.8, expansion: 0.2 },
	[CivGoal.SCOUT_MAP]: { expansion: 0.6, military: 0.4 },
	[CivGoal.TRADE]: { economy: 0.7, research: 0.3 },
	[CivGoal.HOARD_CUBES]: { economy: 0.6, mining: 0.4 },
	// Religion bias drives the enlightenment path; falls back to 0 if faction has no religion key
	[CivGoal.PURSUE_ENLIGHTENMENT]: { religion: 1.0 },
};

// ---------------------------------------------------------------------------
// Core functions
// ---------------------------------------------------------------------------

/**
 * Compute base goal weights from a faction's governorBias config.
 *
 * Each goal's weight is the weighted sum of the relevant bias values,
 * normalized to the 0..1 range. This gives each faction a unique
 * personality that persists throughout the game.
 *
 * @param bias - The faction's governorBias from civilizations.json
 * @returns Normalized weight for each CivGoal
 */
export function computeBaseWeights(bias: GovernorBias): GoalWeights {
	const weights = {} as GoalWeights;

	for (const goal of Object.values(CivGoal)) {
		const mapping = GOAL_BIAS_MAP[goal];
		let weightedSum = 0;
		let totalContribution = 0;

		for (const [biasKey, contribution] of Object.entries(mapping)) {
			const biasValue = bias[biasKey as keyof GovernorBias] ?? 0;
			weightedSum += biasValue * contribution;
			totalContribution += contribution;
		}

		// Normalize: bias values range ~0.7-1.5, so divide by max possible
		// (1.5 * totalContribution) to get a 0..1 range
		weights[goal] =
			totalContribution > 0
				? Math.min(1, weightedSum / (1.5 * totalContribution))
				: 0.5;
	}

	return weights;
}

/**
 * Apply situational modifiers to base weights.
 *
 * These dynamic adjustments ensure AI factions react to changing conditions:
 * - Low resources -> stronger GATHER/HOARD urge
 * - Under attack -> stronger DEFEND urge, weaker EXPAND
 * - Unexplored map -> stronger SCOUT urge
 * - Many idle units -> stronger EXPAND/ATTACK urge
 * - Behind on tech -> stronger RESEARCH urge
 *
 * When `factionId` is provided, faction-specific strategy overrides are also
 * applied on top of the universal modifiers:
 * - reclaimers: boost HOARD_CUBES when resources are plentiful
 * - volt_collective: boost ATTACK_ENEMY when enemy stockpiles are large
 * - signal_choir: boost RESEARCH_TECH always + ATTACK when hackable targets are nearby
 * - iron_creed: suppress ATTACK_ENEMY while wall count is low; boost BUILD_DEFENSES
 *
 * @param baseWeights - Personality-based weights from computeBaseWeights
 * @param situation - Current game state snapshot for this faction
 * @param factionId - Optional faction identifier for faction-specific overrides
 * @returns Modified weights with situational adjustments applied
 */
export function applySituationalModifiers(
	baseWeights: GoalWeights,
	situation: FactionSituation,
	factionId?: string,
): GoalWeights {
	const modified = { ...baseWeights };

	// Low resources: boost gathering and hoarding
	if (situation.resourceLevel !== undefined && situation.resourceLevel < 0.3) {
		const urgency = 1 + (0.3 - situation.resourceLevel) * 2; // up to 1.6x
		modified[CivGoal.GATHER_RESOURCES] = Math.min(
			1,
			modified[CivGoal.GATHER_RESOURCES] * urgency,
		);
		modified[CivGoal.HOARD_CUBES] = Math.min(
			1,
			modified[CivGoal.HOARD_CUBES] * urgency,
		);
	}

	// Under attack: boost defense, reduce expansion and trade
	if (situation.underAttack) {
		modified[CivGoal.BUILD_DEFENSES] = Math.min(
			1,
			modified[CivGoal.BUILD_DEFENSES] * 1.5,
		);
		modified[CivGoal.EXPAND_TERRITORY] *= 0.5;
		modified[CivGoal.TRADE] *= 0.3;
	}

	// Low exploration: boost scouting
	if (
		situation.explorationLevel !== undefined &&
		situation.explorationLevel < 0.4
	) {
		const urgency = 1 + (0.4 - situation.explorationLevel) * 1.5; // up to 1.6x
		modified[CivGoal.SCOUT_MAP] = Math.min(
			1,
			modified[CivGoal.SCOUT_MAP] * urgency,
		);
	}

	// Many idle units: boost expansion and attack
	if (
		situation.idleUnits !== undefined &&
		situation.totalUnits !== undefined &&
		situation.totalUnits > 0
	) {
		const idleRatio = situation.idleUnits / situation.totalUnits;
		if (idleRatio > 0.5) {
			const boost = 1 + (idleRatio - 0.5) * 1.5; // up to 1.75x
			modified[CivGoal.EXPAND_TERRITORY] = Math.min(
				1,
				modified[CivGoal.EXPAND_TERRITORY] * boost,
			);
			modified[CivGoal.ATTACK_ENEMY] = Math.min(
				1,
				modified[CivGoal.ATTACK_ENEMY] * boost,
			);
		}
	}

	// Behind on tech: boost research
	if (
		situation.techTier !== undefined &&
		situation.maxTechTier !== undefined &&
		situation.maxTechTier > 0
	) {
		const techProgress = situation.techTier / situation.maxTechTier;
		if (techProgress < 0.5) {
			const boost = 1 + (0.5 - techProgress) * 1.5; // up to 1.75x
			modified[CivGoal.RESEARCH_TECH] = Math.min(
				1,
				modified[CivGoal.RESEARCH_TECH] * boost,
			);
		}
	}

	// No outposts: boost expansion urgency
	if (situation.outpostCount !== undefined && situation.outpostCount === 0) {
		modified[CivGoal.EXPAND_TERRITORY] = Math.min(
			1,
			modified[CivGoal.EXPAND_TERRITORY] * 1.4,
		);
	}

	// Faction-specific strategy overrides
	if (factionId) {
		applyFactionStrategy(modified, situation, factionId);
	}

	return modified;
}

/**
 * Apply faction-specific strategic overrides on top of universal situational modifiers.
 *
 * Each faction has a distinct playstyle defined by its GDD archetype:
 *
 * - **Reclaimers** (scavenger): hoard cubes aggressively when resources flow well;
 *   prefer HOARD_CUBES over combat.
 *
 * - **Volt Collective** (aggressor): attack early and often when enemy stockpiles
 *   are visible — wealth attracts their raids; penalize trade heavily.
 *
 * - **Signal Choir** (hacker): always prioritize RESEARCH_TECH for tech progression;
 *   when hackable targets are nearby boost ATTACK_ENEMY to represent hacking offensives
 *   rather than raw combat.
 *
 * - **Iron Creed** (fortress): suppress ATTACK_ENEMY until sufficiently walled;
 *   boost BUILD_DEFENSES whenever wall count is below their comfort threshold.
 *
 * Modifies `weights` in place (called after the universal pass in applySituationalModifiers).
 */
function applyFactionStrategy(
	weights: GoalWeights,
	situation: FactionSituation,
	factionId: string,
): void {
	switch (factionId) {
		case "reclaimers": {
			// Reclaimers hoard: if resources are comfortable, strongly prefer hoarding
			if (
				situation.resourceLevel !== undefined &&
				situation.resourceLevel >= 0.4
			) {
				// Plentiful resources → push HOARD_CUBES toward max
				weights[CivGoal.HOARD_CUBES] = Math.min(
					1,
					weights[CivGoal.HOARD_CUBES] * 1.4,
				);
				// Reduce attack urge — Reclaimers prefer scavenging to fighting
				weights[CivGoal.ATTACK_ENEMY] *= 0.6;
			}
			break;
		}

		case "volt_collective": {
			// Volt Collective attacks early: enemy stockpile wealth triggers raids
			if (
				situation.enemyStockpileValue !== undefined &&
				situation.enemyStockpileValue > 0
			) {
				// Scale attack boost by how rich the enemy is (cap at 2x)
				const wealthBoost = Math.min(
					2,
					1 + situation.enemyStockpileValue / 500,
				);
				weights[CivGoal.ATTACK_ENEMY] = Math.min(
					1,
					weights[CivGoal.ATTACK_ENEMY] * wealthBoost,
				);
			}
			// Volt always prefers combat over trade
			weights[CivGoal.TRADE] *= 0.4;
			break;
		}

		case "signal_choir": {
			// Signal Choir always prioritizes research (technology is their weapon)
			weights[CivGoal.RESEARCH_TECH] = Math.min(
				1,
				weights[CivGoal.RESEARCH_TECH] * 1.5,
			);
			// Reduce raw military attacks — Signal Choir hacks, not brawls
			weights[CivGoal.ATTACK_ENEMY] *= 0.5;
			// When hackable targets exist, re-enable attack as "hacking offensive"
			if (situation.hackableTargetsNearby) {
				weights[CivGoal.ATTACK_ENEMY] = Math.min(
					1,
					weights[CivGoal.ATTACK_ENEMY] * 2.5,
				);
			}
			break;
		}

		case "iron_creed": {
			// Iron Creed turtles: suppress attack until adequately fortified
			const WALL_COMFORT_THRESHOLD = 4;
			const wallCount = situation.ownWallCount ?? 0;
			if (wallCount < WALL_COMFORT_THRESHOLD) {
				// Under-fortified: focus on building defenses, suppress attack
				weights[CivGoal.BUILD_DEFENSES] = Math.min(
					1,
					weights[CivGoal.BUILD_DEFENSES] * 1.6,
				);
				weights[CivGoal.ATTACK_ENEMY] *= 0.3;
				weights[CivGoal.EXPAND_TERRITORY] *= 0.5;
			}
			// Iron Creed never prioritizes trade or risky expansion
			weights[CivGoal.TRADE] *= 0.6;
			break;
		}

		default:
			// Unknown faction — no overrides applied
			break;
	}
}

/**
 * Load a FactionPersonality from the civilizations config for a specific faction.
 *
 * @param config - Full civilizations config (all factions)
 * @param factionId - Key of the faction to load (e.g., "reclaimers")
 * @returns Base goal weights, or null if the faction ID is not found
 */
export function loadFactionWeights(
	config: CivilizationsConfig,
	factionId: string,
): GoalWeights | null {
	const faction = config[factionId];
	if (!faction) {
		return null;
	}
	return computeBaseWeights(faction.governorBias);
}
