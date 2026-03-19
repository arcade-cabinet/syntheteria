/**
 * Upgrade definitions — mark level costs, motor pool tiers.
 *
 * Converted from pending/config/upgrades.json to TypeScript const objects.
 *
 * Mark levels 2–5 define increasing resource costs and upgrade durations.
 * Motor pool tiers gate the maximum mark level a bay can produce.
 * Adjacency range determines how close a unit must be to a bay.
 */

import type { ResourceMaterial } from "../ecs/terrain/types";

// ─── Mark Level Costs ───────────────────────────────────────────────────────

export interface MarkLevelCost {
	readonly scrap_metal: number;
	readonly e_waste: number;
	readonly intact_components: number;
}

/** Maximum mark level in the game. */
export const MAX_MARK_LEVEL = 5;

/**
 * Resource cost to upgrade to each mark level.
 * Mark 1 is free (starting level). Marks 2–5 have escalating costs.
 */
export const MARK_LEVEL_COSTS: Record<
	2 | 3 | 4 | 5,
	Readonly<Partial<Record<ResourceMaterial, number>>>
> = {
	2: { scrap_metal: 6, e_waste: 3, intact_components: 1 },
	3: { scrap_metal: 12, e_waste: 6, intact_components: 2 },
	4: { scrap_metal: 20, e_waste: 10, intact_components: 4 },
	5: { scrap_metal: 30, e_waste: 15, intact_components: 6 },
} as const;

/**
 * Tick duration for each mark upgrade level.
 * Higher marks take longer to apply.
 */
export const MARK_UPGRADE_TICKS: Record<2 | 3 | 4 | 5, number> = {
	2: 60,
	3: 120,
	4: 180,
	5: 300,
} as const;

// ─── Motor Pool Tiers ───────────────────────────────────────────────────────

export type MotorPoolTier = "basic" | "advanced" | "elite";

export interface MotorPoolTierDef {
	readonly displayName: string;
	/** Maximum mark level this motor pool tier can produce. */
	readonly maxMark: number;
}

export const MOTOR_POOL_TIERS: Record<MotorPoolTier, MotorPoolTierDef> = {
	basic: { displayName: "Motor Pool (Basic)", maxMark: 2 },
	advanced: { displayName: "Motor Pool (Advanced)", maxMark: 3 },
	elite: { displayName: "Motor Pool (Elite)", maxMark: 5 },
} as const;

// ─── Adjacency ──────────────────────────────────────────────────────────────

/** Manhattan tile distance required between unit and upgrade bay. */
export const UPGRADE_ADJACENCY_RANGE = 3.0;
