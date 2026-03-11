/**
 * Technology research system.
 *
 * Tracks per-faction research state against the branching tech tree
 * defined in config/technology.json. Each faction independently
 * researches techs by spending compute points (from signal relays).
 *
 * Faction-specific research speed multipliers come from
 * config/technology.json → factionResearchBonuses.
 *
 * Exports a tick function (techResearchSystem) and query helpers.
 */

import { config } from "../../config";
import { notifyNewlyUnlockedRecipes } from "./furnaceProcessing";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TechDefinition {
	id: string;
	name: string;
	description?: string;
	tier: number;
	researchCost: number;
	prerequisites: string[];
	effects: {
		unlocks: string[];
		bonuses: Record<string, number>;
	};
	/** Race/faction affinity for this tech (null = universal). */
	race: string | null;
}

export interface ActiveResearch {
	techId: string;
	progress: number;
	cost: number;
}

export interface FactionResearchState {
	researched: Set<string>;
	active: ActiveResearch | null;
}

// ---------------------------------------------------------------------------
// Config references
// ---------------------------------------------------------------------------

const techDefs: TechDefinition[] = config.technology
	.techTree as unknown as TechDefinition[];

const factionBonuses: Record<string, number> = config.technology
	.factionResearchBonuses as Record<string, number>;

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

let factionStates = new Map<string, FactionResearchState>();

function getOrCreate(faction: string): FactionResearchState {
	let state = factionStates.get(faction);
	if (!state) {
		state = { researched: new Set(), active: null };
		factionStates.set(faction, state);
	}
	return state;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function findTech(techId: string): TechDefinition | undefined {
	return techDefs.find((t) => t.id === techId);
}

function getSpeedMultiplier(faction: string): number {
	return factionBonuses[faction] ?? 1.0;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Check whether a faction has completed research on a tech.
 */
export function isResearched(faction: string, techId: string): boolean {
	return getOrCreate(faction).researched.has(techId);
}

/**
 * Return all techs whose prerequisites are met and that have not been
 * researched yet by the given faction.
 */
export function getAvailableTechs(faction: string): TechDefinition[] {
	const state = getOrCreate(faction);
	return techDefs.filter((tech) => {
		if (state.researched.has(tech.id)) return false;
		return tech.prerequisites.every((pre) => state.researched.has(pre));
	});
}

/**
 * Begin researching a tech for a faction.
 *
 * Validation:
 *   - Tech must exist in the config
 *   - Tech must not already be researched
 *   - All prerequisites must be met
 *   - No other research may be in progress
 *
 * Returns true if research was started.
 */
export function startResearch(faction: string, techId: string): boolean {
	const state = getOrCreate(faction);
	const tech = findTech(techId);

	if (!tech) return false;
	if (state.researched.has(techId)) return false;
	if (state.active !== null) return false;
	if (!tech.prerequisites.every((pre) => state.researched.has(pre)))
		return false;

	state.active = {
		techId,
		progress: 0,
		cost: tech.researchCost,
	};
	return true;
}

/**
 * Return the current research state for a faction, or null if idle.
 */
export function getResearchProgress(
	faction: string,
): { techId: string; progress: number; cost: number } | null {
	const state = getOrCreate(faction);
	if (!state.active) return null;
	return { ...state.active };
}

/**
 * Tick-level system entry point.
 *
 * Advances research progress for every faction that has active research.
 * `computeByFaction` maps faction ID to available compute points this tick.
 *
 * Returns an array of { faction, techId } for any techs completed this tick.
 */
export function techResearchSystem(
	computeByFaction: Record<string, number>,
	tick = 0,
): { faction: string; techId: string }[] {
	const completed: { faction: string; techId: string }[] = [];

	for (const [faction, state] of factionStates.entries()) {
		if (!state.active) continue;

		const compute = computeByFaction[faction] ?? 0;
		if (compute <= 0) continue;

		const tech = findTech(state.active.techId);
		if (!tech) continue;

		// Apply faction-wide research speed multiplier
		let effectiveCompute = compute * getSpeedMultiplier(faction);

		// Apply per-tech faction affinity bonus (+50% if this tech favors the faction)
		if (tech.race === faction) {
			effectiveCompute *= 1.5;
		}

		state.active.progress += effectiveCompute;

		if (state.active.progress >= state.active.cost) {
			// Capture the set of researched techs BEFORE adding the new one
			// so notifyNewlyUnlockedRecipes can diff prev vs next.
			const prevResearched = new Set(state.researched);

			state.researched.add(state.active.techId);
			const completedId = state.active.techId;
			state.active = null;
			completed.push({ faction, techId: completedId });

			// Emit recipe_unlocked events for any furnace tiers now newly accessible.
			notifyNewlyUnlockedRecipes(prevResearched, state.researched, tick);
		}
	}

	return completed;
}

/**
 * Return the full tech tree (all definitions from config).
 */
export function getTechTree(): TechDefinition[] {
	return [...techDefs];
}

/**
 * Return the tech definition with the given id, or undefined.
 */
export function getTechNode(techId: string): TechDefinition | undefined {
	return findTech(techId);
}

/**
 * Return all researched tech IDs for a faction.
 */
export function getResearchedTechs(faction: string): string[] {
	return [...getOrCreate(faction).researched];
}

/**
 * Cancel current research for a faction. Returns the cancelled tech ID or null.
 */
export function cancelResearch(faction: string): string | null {
	const state = getOrCreate(faction);
	if (!state.active) return null;
	const cancelledId = state.active.techId;
	state.active = null;
	return cancelledId;
}

/**
 * Reset all research state. Used for tests and new-game initialization.
 */
export function resetTechResearch(): void {
	factionStates = new Map();
}
