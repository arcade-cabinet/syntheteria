/**
 * Tech tree progression system.
 *
 * Each faction progresses through a tiered tech tree, researching nodes
 * that unlock recipes, buildings, components, and stat bonuses.
 * Tech definitions are loaded from config/technology.json.
 *
 * Faction-specific research speed is influenced by the "research" bias
 * in config/civilizations.json.
 */

import civilizationsData from "../../../config/civilizations.json";
import technologyData from "../../../config/technology.json";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TechNode {
	id: string;
	name: string;
	description: string;
	tier: number;
	prerequisites: string[];
	cost: { cubes: number; time: number };
	unlocks: string[];
}

export interface FactionTechState {
	factionId: string;
	researched: Set<string>;
	currentResearch: {
		techId: string;
		progress: number;
		totalTime: number;
	} | null;
}

// ---------------------------------------------------------------------------
// Build the full tech tree from config
// ---------------------------------------------------------------------------

function buildTechTree(): TechNode[] {
	const nodes: TechNode[] = [];

	for (
		let tierIndex = 0;
		tierIndex < technologyData.tiers.length;
		tierIndex++
	) {
		const tier = technologyData.tiers[tierIndex];

		for (const unlockId of tier.unlocks) {
			// Generate a human-friendly name from the id
			const name = unlockId
				.split("_")
				.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
				.join(" ");

			// Prerequisites: all unlocks from the previous tier (must complete prior tier)
			const prerequisites: string[] = [];
			if (tierIndex > 0) {
				const prevTier = technologyData.tiers[tierIndex - 1];
				// Require at least one tech from the previous tier
				// We use the first unlock of the previous tier as a representative prerequisite
				prerequisites.push(`tech_${prevTier.unlocks[0]}`);
			}

			const node: TechNode = {
				id: `tech_${unlockId}`,
				name,
				description: `Unlocks ${name} (${tier.name} tier)`,
				tier: tierIndex,
				prerequisites,
				cost: {
					cubes: tier.cost,
					time: Math.max(1, tier.cost * 2), // research time scales with cube cost
				},
				unlocks: [unlockId],
			};

			nodes.push(node);
		}
	}

	return nodes;
}

const techTree: TechNode[] = buildTechTree();

// ---------------------------------------------------------------------------
// Per-faction state
// ---------------------------------------------------------------------------

const factionStates = new Map<string, FactionTechState>();

function getOrCreateState(factionId: string): FactionTechState {
	let state = factionStates.get(factionId);
	if (!state) {
		state = {
			factionId,
			researched: new Set<string>(),
			currentResearch: null,
		};
		// Tier-0 techs (cost 0) are auto-researched for all factions
		for (const node of techTree) {
			if (node.cost.cubes === 0) {
				state.researched.add(node.id);
			}
		}
		factionStates.set(factionId, state);
	}
	return state;
}

// ---------------------------------------------------------------------------
// Research speed multiplier from civilization bias
// ---------------------------------------------------------------------------

function getResearchSpeedMultiplier(factionId: string): number {
	const civ = (
		civilizationsData as Record<
			string,
			{ governorBias?: { research?: number } }
		>
	)[factionId];
	return civ?.governorBias?.research ?? 1.0;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns the full tech tree (all nodes across all tiers).
 */
export function getTechTree(): TechNode[] {
	return [...techTree];
}

/**
 * Returns the tech node with the given id, or undefined.
 */
export function getTechNode(techId: string): TechNode | undefined {
	return techTree.find((n) => n.id === techId);
}

/**
 * Returns true if the given faction has researched the given tech.
 */
export function isResearched(factionId: string, techId: string): boolean {
	const state = getOrCreateState(factionId);
	return state.researched.has(techId);
}

/**
 * Returns all techs whose prerequisites are met and are not yet researched.
 */
export function getAvailableTechs(factionId: string): TechNode[] {
	const state = getOrCreateState(factionId);
	return techTree.filter((node) => {
		if (state.researched.has(node.id)) return false;
		return node.prerequisites.every((prereq) => state.researched.has(prereq));
	});
}

/**
 * Start researching a tech for a faction.
 * Returns true if research was started successfully.
 *
 * Validation:
 *   - Tech exists
 *   - Not already researched
 *   - All prerequisites met
 *   - No other research in progress
 *   - Cube cost > 0 (tier-0 techs are auto-researched)
 *
 * Note: cube cost deduction is validated but not enforced here — the caller
 * is responsible for checking/deducting from the resource pool. This function
 * only manages the research queue and state.
 */
export function startResearch(factionId: string, techId: string): boolean {
	const state = getOrCreateState(factionId);
	const node = techTree.find((n) => n.id === techId);

	if (!node) return false;
	if (state.researched.has(techId)) return false;
	if (state.currentResearch !== null) return false;

	// Check prerequisites
	for (const prereq of node.prerequisites) {
		if (!state.researched.has(prereq)) return false;
	}

	const speedMultiplier = getResearchSpeedMultiplier(factionId);
	const adjustedTime = Math.max(
		1,
		Math.round(node.cost.time / speedMultiplier),
	);

	state.currentResearch = {
		techId,
		progress: 0,
		totalTime: adjustedTime,
	};

	return true;
}

/**
 * Advance research for a faction by `delta` ticks.
 * Returns the completed tech ID if research finishes this tick, otherwise null.
 */
export function updateResearch(
	factionId: string,
	delta: number,
): string | null {
	const state = getOrCreateState(factionId);
	if (!state.currentResearch) return null;

	state.currentResearch.progress += delta;

	if (state.currentResearch.progress >= state.currentResearch.totalTime) {
		const completedId = state.currentResearch.techId;
		state.researched.add(completedId);
		state.currentResearch = null;
		return completedId;
	}

	return null;
}

/**
 * Returns the current research progress for a faction, or null if idle.
 */
export function getResearchProgress(
	factionId: string,
): { techId: string; progress: number; totalTime: number } | null {
	const state = getOrCreateState(factionId);
	if (!state.currentResearch) return null;
	return { ...state.currentResearch };
}

/**
 * Returns all researched tech IDs for a faction.
 */
export function getResearchedTechs(factionId: string): string[] {
	const state = getOrCreateState(factionId);
	return [...state.researched];
}

/**
 * Cancel current research for a faction. Returns the cancelled tech ID or null.
 */
export function cancelResearch(factionId: string): string | null {
	const state = getOrCreateState(factionId);
	if (!state.currentResearch) return null;
	const cancelledId = state.currentResearch.techId;
	state.currentResearch = null;
	return cancelledId;
}

/**
 * Reset all faction tech states. Used for testing and new-game initialization.
 */
export function resetTechTree(): void {
	factionStates.clear();
}
