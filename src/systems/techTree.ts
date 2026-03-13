/**
 * @module techTree
 *
 * Research progression DAG for all factions. Each faction researches one tech at a
 * time over multiple turns. Completed techs grant typed effects (harvest bonuses,
 * mark unlocks). Prerequisites form a directed acyclic graph loaded from config JSON.
 *
 * @exports TechDefinition / TechEffect / FactionResearchState - Core types
 * @exports getAllTechs / getTechById - Config access
 * @exports canResearch / startResearch / cancelResearch / advanceResearch - Research lifecycle
 * @exports getTechStatus / getResearchProgress - Status queries for UI
 * @exports hasTech / hasEffect / getEffectValue - Effect accumulation queries
 * @exports getFactionResearchState / subscribeTechTree - State observation
 * @exports resetTechTree - Reset for new game
 *
 * @dependencies config/techTree.json, factionEconomy (canFactionAfford, spendFactionResource),
 *   resources (ResourcePool type)
 * @consumers TechTreeModal, turnPhaseHandlers, wormhole
 */

import techTreeConfig from "../config/techTree.json";
import type { EconomyFactionId } from "./factionEconomy";
import { canFactionAfford, spendFactionResource } from "./factionEconomy";
import type { ResourcePool } from "./resources";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TechEffect {
	type: string;
	value: number;
}

export interface TechDefinition {
	id: string;
	name: string;
	description: string;
	tier: number;
	cost: Record<string, number>;
	turnsToResearch: number;
	prerequisites: string[];
	effects: TechEffect[];
}

export interface FactionResearchState {
	/** Currently researching tech id, or null */
	activeResearch: string | null;
	/** Turns of research completed on the active tech */
	turnsCompleted: number;
	/** Set of completed tech ids */
	completedTechs: Set<string>;
}

// ─── State ───────────────────────────────────────────────────────────────────

const factionResearch = new Map<EconomyFactionId, FactionResearchState>();
const listeners = new Set<() => void>();

function notify() {
	for (const listener of listeners) {
		listener();
	}
}

function ensureState(factionId: EconomyFactionId): FactionResearchState {
	let state = factionResearch.get(factionId);
	if (!state) {
		state = {
			activeResearch: null,
			turnsCompleted: 0,
			completedTechs: new Set(),
		};
		factionResearch.set(factionId, state);
	}
	return state;
}

// ─── Config Access ───────────────────────────────────────────────────────────

const techMap = new Map<string, TechDefinition>();
for (const tech of (techTreeConfig.techs as unknown as TechDefinition[])) {
	techMap.set(tech.id, tech);
}

export function getAllTechs(): TechDefinition[] {
	return (techTreeConfig.techs as unknown as TechDefinition[]);
}

export function getTechById(id: string): TechDefinition | undefined {
	return techMap.get(id);
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function subscribeTechTree(listener: () => void): () => void {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

export function getFactionResearchState(
	factionId: EconomyFactionId,
): FactionResearchState {
	return ensureState(factionId);
}

/**
 * Check if a faction has completed a tech.
 */
export function hasTech(
	factionId: EconomyFactionId,
	techId: string,
): boolean {
	return ensureState(factionId).completedTechs.has(techId);
}

/**
 * Check if a faction can research a tech (prerequisites met, not already
 * completed, not already researching something else).
 */
export function canResearch(
	factionId: EconomyFactionId,
	techId: string,
): boolean {
	const state = ensureState(factionId);
	const tech = techMap.get(techId);
	if (!tech) return false;

	// Already completed
	if (state.completedTechs.has(techId)) return false;

	// Already researching something
	if (state.activeResearch !== null) return false;

	// Prerequisites not met
	for (const prereq of tech.prerequisites) {
		if (!state.completedTechs.has(prereq)) return false;
	}

	// Check resource cost
	const costs = Object.entries(tech.cost).map(([type, amount]) => ({
		type: type as keyof ResourcePool,
		amount,
	}));
	return canFactionAfford(factionId, costs);
}

/**
 * Get the status of a tech for a faction.
 */
export type TechStatus =
	| "completed"
	| "researching"
	| "available"
	| "locked"
	| "unavailable";

export function getTechStatus(
	factionId: EconomyFactionId,
	techId: string,
): TechStatus {
	const state = ensureState(factionId);
	const tech = techMap.get(techId);
	if (!tech) return "unavailable";

	if (state.completedTechs.has(techId)) return "completed";
	if (state.activeResearch === techId) return "researching";

	// Check prerequisites
	for (const prereq of tech.prerequisites) {
		if (!state.completedTechs.has(prereq)) return "locked";
	}

	return "available";
}

/**
 * Start researching a tech. Spends resources immediately.
 * Returns false if the faction can't research it.
 */
export function startResearch(
	factionId: EconomyFactionId,
	techId: string,
): boolean {
	if (!canResearch(factionId, techId)) return false;

	const tech = techMap.get(techId)!;

	// Spend resources
	for (const [type, amount] of Object.entries(tech.cost)) {
		if (!spendFactionResource(factionId, type as keyof ResourcePool, amount)) {
			return false;
		}
	}

	const state = ensureState(factionId);
	state.activeResearch = techId;
	state.turnsCompleted = 0;
	notify();
	return true;
}

/**
 * Cancel active research. Does NOT refund resources.
 */
export function cancelResearch(factionId: EconomyFactionId) {
	const state = ensureState(factionId);
	state.activeResearch = null;
	state.turnsCompleted = 0;
	notify();
}

/**
 * Advance research by one turn. Called at end of each turn.
 * Returns the completed tech id if research finishes, or null.
 */
export function advanceResearch(
	factionId: EconomyFactionId,
): string | null {
	const state = ensureState(factionId);
	if (!state.activeResearch) return null;

	const tech = techMap.get(state.activeResearch);
	if (!tech) {
		state.activeResearch = null;
		return null;
	}

	state.turnsCompleted++;

	if (state.turnsCompleted >= tech.turnsToResearch) {
		const completedId = state.activeResearch;
		state.completedTechs.add(completedId);
		state.activeResearch = null;
		state.turnsCompleted = 0;
		notify();
		return completedId;
	}

	notify();
	return null;
}

/**
 * Get research progress as a fraction 0..1.
 */
export function getResearchProgress(factionId: EconomyFactionId): number {
	const state = ensureState(factionId);
	if (!state.activeResearch) return 0;

	const tech = techMap.get(state.activeResearch);
	if (!tech) return 0;

	return state.turnsCompleted / tech.turnsToResearch;
}

/**
 * Get all effects a faction has accumulated from completed techs.
 */
export function getAccumulatedEffects(
	factionId: EconomyFactionId,
): TechEffect[] {
	const state = ensureState(factionId);
	const effects: TechEffect[] = [];

	for (const techId of state.completedTechs) {
		const tech = techMap.get(techId);
		if (tech) {
			effects.push(...tech.effects);
		}
	}

	return effects;
}

/**
 * Check if a faction has a specific effect type from completed research.
 */
export function hasEffect(
	factionId: EconomyFactionId,
	effectType: string,
): boolean {
	return getAccumulatedEffects(factionId).some((e) => e.type === effectType);
}

/**
 * Get the total value of a specific effect type from all completed techs.
 */
export function getEffectValue(
	factionId: EconomyFactionId,
	effectType: string,
): number {
	return getAccumulatedEffects(factionId)
		.filter((e) => e.type === effectType)
		.reduce((sum, e) => sum + e.value, 0);
}

/**
 * Get the active effect value for a given effect type and faction.
 * Scans all researched techs and returns the cumulative effect.
 *
 * For multipliers (_multiplier suffix), returns the product of all matching effects.
 * For additive bonuses (_bonus suffix), returns defaultValue + sum of bonuses.
 * For reductions (_reduction suffix), returns 1 - sum of reductions (clamped to 0).
 *
 * Returns the effective value or the default if no tech provides it.
 */
export function getActiveEffect(
	factionId: EconomyFactionId,
	effectType: string,
	defaultValue: number,
): number {
	const state = ensureState(factionId);
	let result = defaultValue;
	let found = false;

	for (const techId of state.completedTechs) {
		const tech = techMap.get(techId);
		if (!tech) continue;

		for (const effect of tech.effects) {
			if (effect.type !== effectType) continue;

			if (effectType.endsWith("_multiplier")) {
				// Multiplicative: chain multipliers
				if (!found) {
					result = effect.value;
					found = true;
				} else {
					result *= effect.value;
				}
			} else if (effectType.endsWith("_bonus")) {
				// Additive: sum bonuses
				if (!found) {
					result = defaultValue + effect.value;
					found = true;
				} else {
					result += effect.value;
				}
			} else if (effectType.endsWith("_reduction")) {
				// Reduction: 1 - sum of reductions (clamped to 0)
				if (!found) {
					result = Math.max(0, 1 - effect.value);
					found = true;
				} else {
					result = Math.max(0, result - effect.value);
				}
			}
		}
	}

	return result;
}

/**
 * Get the total number of techs available.
 */
export function getTotalTechCount(): number {
	return techMap.size;
}

/**
 * Check if all techs have been researched by a faction.
 */
export function allTechsResearched(factionId: EconomyFactionId): boolean {
	return ensureState(factionId).completedTechs.size >= getTotalTechCount();
}

/**
 * Reset tech tree state — call on new game.
 */
export function resetTechTree() {
	factionResearch.clear();
	notify();
}
