/**
 * Diplomacy configuration — standings, standing changes, trade parameters.
 *
 * Converted from pending/config/diplomacy.json to TypeScript const objects.
 * Enriches the relations system (src/ecs/factions/relations.ts) with
 * numeric standings that determine ally/neutral/hostile thresholds.
 *
 * Standing score ranges from -100 (blood enemies) to +100 (best allies).
 * Actions like trading, attacking, or hacking shift standings.
 */

// ─── Standing Tiers ──────────────────────────────────────────────────────────

export interface StandingTier {
	readonly min: number;
	readonly max: number;
	readonly label: string;
	readonly color: string;
}

export const STANDING_TIERS = {
	hostile: { min: -100, max: -50, label: "Hostile", color: "#cc4444" },
	unfriendly: { min: -50, max: -10, label: "Unfriendly", color: "#ff8f8f" },
	neutral: { min: -10, max: 10, label: "Neutral", color: "#888888" },
	cordial: { min: 10, max: 50, label: "Cordial", color: "#f6c56a" },
	allied: { min: 50, max: 100, label: "Allied", color: "#7ee7cb" },
} as const satisfies Record<string, StandingTier>;

export type StandingTierName = keyof typeof STANDING_TIERS;

/** Determine the standing tier for a numeric score. */
export function getStandingTier(score: number): StandingTierName {
	if (score <= -50) return "hostile";
	if (score <= -10) return "unfriendly";
	if (score <= 10) return "neutral";
	if (score <= 50) return "cordial";
	return "allied";
}

// ─── Standing Changes ────────────────────────────────────────────────────────

/**
 * How much each action shifts the standing score.
 * Positive = improves relation, negative = worsens.
 */
export const STANDING_CHANGES = {
	trade_completed: 5,
	trade_rejected: -3,
	territory_encroachment: -8,
	unit_attacked: -20,
	building_destroyed: -15,
	alliance_proposed: 3,
	shared_enemy: 10,
	hacking_detected: -12,
} as const;

export type StandingAction = keyof typeof STANDING_CHANGES;

// ─── Trade & Alliance Parameters ─────────────────────────────────────────────

/** Percentage of trade income shared with trading partner. */
export const TRADE_INCOME_SHARE_PERCENT = 15;

/** Whether allies share fog of war data. */
export const ALLIANCE_FOG_SHARING = true;

/** Manhattan tile radius for border contestation during war. */
export const WAR_BORDER_CONTEST_RADIUS = 3;

/** Standing penalty for breaking a trade agreement. */
export const BREAK_TRADE_PENALTY = -20;

/** Standing penalty for breaking an alliance. */
export const BREAK_ALLIANCE_PENALTY = -40;

/** Per-turn standing decay toward neutral (1 point toward 0 per turn). */
export const STANDING_DECAY_PER_TURN = 1;
