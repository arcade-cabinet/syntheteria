/**
 * Tech effects system.
 *
 * Maps researched techs to concrete gameplay bonuses and unlock gates.
 * Each tech can grant one or more effects: unlocking recipes/buildings/components,
 * or providing numerical bonuses (harvest speed, cube durability, vision range).
 *
 * Effects are recalculated whenever a new tech is researched.
 */

import { getResearchedTechs, getTechNode } from "./techTree.ts";

// ---------------------------------------------------------------------------
// Effect types
// ---------------------------------------------------------------------------

export type TechEffectType =
	| "unlock_recipe"
	| "unlock_building"
	| "unlock_component"
	| "bonus_harvest_speed"
	| "bonus_cube_durability"
	| "bonus_vision_range";

export interface TechEffect {
	type: TechEffectType;
	/** For unlock effects: the id of what is unlocked. For bonus effects: unused. */
	target: string;
	/** For bonus effects: the additive modifier value. For unlock effects: 0. */
	value: number;
}

// ---------------------------------------------------------------------------
// Static mapping: tech unlock id -> effects
// ---------------------------------------------------------------------------

const TECH_EFFECT_MAP: Record<string, TechEffect[]> = {
	// Tier 0 — Scrap
	basic_belt: [
		{ type: "unlock_building", target: "basic_belt", value: 0 },
		{ type: "unlock_recipe", target: "basic_belt", value: 0 },
	],
	basic_furnace: [
		{ type: "unlock_building", target: "basic_furnace", value: 0 },
		{ type: "unlock_recipe", target: "basic_furnace", value: 0 },
	],
	lightning_rod: [
		{ type: "unlock_building", target: "lightning_rod", value: 0 },
	],

	// Tier 1 — Refined
	fast_belt: [
		{ type: "unlock_building", target: "fast_belt", value: 0 },
		{ type: "unlock_recipe", target: "fast_belt", value: 0 },
		{ type: "bonus_harvest_speed", target: "", value: 0.15 },
	],
	smelter: [
		{ type: "unlock_building", target: "smelter", value: 0 },
		{ type: "unlock_recipe", target: "smelter", value: 0 },
	],
	walls: [
		{ type: "unlock_building", target: "walls", value: 0 },
		{ type: "bonus_cube_durability", target: "", value: 0.2 },
	],
	outpost: [
		{ type: "unlock_building", target: "outpost", value: 0 },
		{ type: "bonus_vision_range", target: "", value: 0.1 },
	],

	// Tier 2 — Precision
	express_belt: [
		{ type: "unlock_building", target: "express_belt", value: 0 },
		{ type: "unlock_recipe", target: "express_belt", value: 0 },
		{ type: "bonus_harvest_speed", target: "", value: 0.25 },
	],
	refiner: [
		{ type: "unlock_building", target: "refiner", value: 0 },
		{ type: "unlock_recipe", target: "refiner", value: 0 },
	],
	separator: [
		{ type: "unlock_building", target: "separator", value: 0 },
		{ type: "unlock_recipe", target: "separator", value: 0 },
	],
	turret: [
		{ type: "unlock_building", target: "turret", value: 0 },
		{ type: "unlock_component", target: "turret_weapon", value: 0 },
	],

	// Tier 3 — Advanced
	signal_relay: [
		{ type: "unlock_building", target: "signal_relay", value: 0 },
		{ type: "unlock_component", target: "signal_relay", value: 0 },
		{ type: "bonus_vision_range", target: "", value: 0.25 },
	],
	hacking_module: [
		{ type: "unlock_component", target: "hacking_module", value: 0 },
		{ type: "unlock_recipe", target: "hacking_module", value: 0 },
	],
	formation_controller: [
		{ type: "unlock_component", target: "formation_controller", value: 0 },
		{ type: "bonus_harvest_speed", target: "", value: 0.15 },
		{ type: "bonus_cube_durability", target: "", value: 0.15 },
	],
};

// ---------------------------------------------------------------------------
// Per-faction computed bonuses (cached)
// ---------------------------------------------------------------------------

interface FactionBonuses {
	unlocked: Set<string>; // set of "type:target" keys for unlock checks
	bonuses: Map<string, number>; // bonus type -> aggregate value
}

const factionBonusCache = new Map<string, FactionBonuses>();

/**
 * Recalculates all bonuses from researched techs for a faction.
 * Call this after a tech completes research to update the cache.
 */
export function applyTechEffects(factionId: string): void {
	const researched = getResearchedTechs(factionId);
	const unlocked = new Set<string>();
	const bonuses = new Map<string, number>();

	for (const techId of researched) {
		const node = getTechNode(techId);
		if (!node) continue;

		for (const unlockId of node.unlocks) {
			const effects = TECH_EFFECT_MAP[unlockId];
			if (!effects) continue;

			for (const effect of effects) {
				if (
					effect.type === "unlock_recipe" ||
					effect.type === "unlock_building" ||
					effect.type === "unlock_component"
				) {
					unlocked.add(`${effect.type}:${effect.target}`);
				} else {
					const current = bonuses.get(effect.type) ?? 0;
					bonuses.set(effect.type, current + effect.value);
				}
			}
		}
	}

	factionBonusCache.set(factionId, { unlocked, bonuses });
}

/**
 * Returns the aggregate bonus value for a faction and bonus type.
 * Bonus types: "bonus_harvest_speed", "bonus_cube_durability", "bonus_vision_range"
 *
 * Returns the additive modifier (e.g., 0.25 means +25%).
 * Returns 0 if no bonus is active.
 */
export function getTechBonus(factionId: string, bonusType: string): number {
	const cached = factionBonusCache.get(factionId);
	if (!cached) return 0;
	return cached.bonuses.get(bonusType) ?? 0;
}

/**
 * Returns true if a specific item is unlocked for a faction.
 *
 * `unlockable` should be in the format "type:target", e.g.:
 *   - "unlock_recipe:smelter"
 *   - "unlock_building:turret"
 *   - "unlock_component:hacking_module"
 *
 * For convenience, if no colon is present, checks all unlock types
 * for the given target name.
 */
export function isUnlocked(factionId: string, unlockable: string): boolean {
	const cached = factionBonusCache.get(factionId);
	if (!cached) return false;

	if (unlockable.includes(":")) {
		return cached.unlocked.has(unlockable);
	}

	// Check all unlock types for this target
	return (
		cached.unlocked.has(`unlock_recipe:${unlockable}`) ||
		cached.unlocked.has(`unlock_building:${unlockable}`) ||
		cached.unlocked.has(`unlock_component:${unlockable}`)
	);
}

/**
 * Returns all effects granted by a specific tech's unlocks.
 */
export function getEffectsForTech(techId: string): TechEffect[] {
	const node = getTechNode(techId);
	if (!node) return [];

	const effects: TechEffect[] = [];
	for (const unlockId of node.unlocks) {
		const mapped = TECH_EFFECT_MAP[unlockId];
		if (mapped) {
			effects.push(...mapped);
		}
	}
	return effects;
}

/**
 * Reset the bonus cache. Used for testing and new-game initialization.
 */
export function resetTechEffects(): void {
	factionBonusCache.clear();
}
