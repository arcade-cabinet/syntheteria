/**
 * Governor system — high-level AI decision-making for each faction.
 *
 * Each tick, evaluates what each AI faction should do based on:
 * - Faction biases (from config/factions.json)
 * - Current state (territory size, building count, resources)
 * - Cooldown timers
 *
 * Decisions wire through aiCivilization.ts to produce renderer-visible events.
 * Governor decisions produce real world changes — buildings, territory, scouts —
 * not just ECS state mutations.
 */

import factionsConfig from "../config/factions.json";
import { gameplayRandom } from "../ecs/seed";
import { gridToWorld } from "../world/sectorCoordinates";
import { isPassableAtWorldPosition } from "../world/structuralSpace";
import {
	type AIFactionId,
	aiFactionBuild,
	aiFactionDeployScout,
	aiFactionExpand,
	aiFactionHarvest,
	getAllAIFactions,
	initializeAIFactions,
} from "./aiCivilization";

// Governor tick rate: evaluate decisions every N simulation ticks
const GOVERNOR_TICK_INTERVAL = 30;

let initialized = false;

/**
 * Initialize the governor system. Must be called once before first tick.
 */
export function initializeGovernor(): void {
	initializeAIFactions();
	initialized = true;
}

/**
 * Governor tick — called every simulation tick, but only evaluates decisions
 * at GOVERNOR_TICK_INTERVAL intervals.
 */
export function governorSystem(tick: number): void {
	if (!initialized) return;
	if (tick % GOVERNOR_TICK_INTERVAL !== 0) return;

	const allFactions = getAllAIFactions();

	for (const [factionId] of allFactions) {
		const config = factionsConfig[factionId];
		evaluateFactionDecision(factionId, config, tick);
	}
}

function evaluateFactionDecision(
	factionId: AIFactionId,
	config: (typeof factionsConfig)[AIFactionId],
	tick: number,
): void {
	const state = getAllAIFactions().get(factionId);
	if (!state) return;

	// Score each possible action
	const buildScore =
		config.buildBias * (1 - state.buildingCount / config.maxBuildings);
	const expandScore =
		config.expandBias *
		(1 - state.territoryCells.size / config.maxTerritoryCells);
	const harvestScore = config.harvestBias * (state.resources < 15 ? 1.5 : 0.5);
	const scoutScore = config.scoutBias * (state.scoutCount < 3 ? 1.2 : 0.3);

	// Add randomness
	const scores = [
		{ action: "build" as const, score: buildScore * (0.5 + gameplayRandom()) },
		{
			action: "expand" as const,
			score: expandScore * (0.5 + gameplayRandom()),
		},
		{
			action: "harvest" as const,
			score: harvestScore * (0.5 + gameplayRandom()),
		},
		{ action: "scout" as const, score: scoutScore * (0.5 + gameplayRandom()) },
	];

	// Sort by score descending, try each until one succeeds
	scores.sort((a, b) => b.score - a.score);

	for (const { action } of scores) {
		const succeeded = executeAction(factionId, action, tick);
		if (succeeded) break;
	}
}

function executeAction(
	factionId: AIFactionId,
	action: "build" | "expand" | "harvest" | "scout",
	tick: number,
): boolean {
	const state = getAllAIFactions().get(factionId);
	if (!state) return false;

	switch (action) {
		case "build": {
			const pos = findBuildPosition(factionId);
			if (!pos) return false;
			return aiFactionBuild(factionId, pos, "fabrication_unit", tick);
		}
		case "expand": {
			return aiFactionExpand(factionId, tick);
		}
		case "harvest": {
			const pos = findHarvestPosition(factionId);
			if (!pos) return false;
			return aiFactionHarvest(factionId, pos, tick);
		}
		case "scout": {
			const pos = findScoutPosition(factionId);
			if (!pos) return false;
			return aiFactionDeployScout(factionId, pos, tick);
		}
	}
}

/**
 * Find a valid build position within the faction's territory.
 */
function findBuildPosition(
	factionId: AIFactionId,
): { x: number; z: number } | null {
	const state = getAllAIFactions().get(factionId);
	if (!state) return null;

	const cells = Array.from(state.territoryCells);
	// Try random cells from territory
	for (let attempt = 0; attempt < 5; attempt++) {
		const cellKey = cells[Math.floor(gameplayRandom() * cells.length)];
		const [q, r] = cellKey.split(",").map(Number);
		const worldPos = gridToWorld(q, r);

		if (isPassableAtWorldPosition(worldPos.x, worldPos.z)) {
			return { x: worldPos.x, z: worldPos.z };
		}
	}

	return null;
}

/**
 * Find a harvest position within the faction's territory.
 */
function findHarvestPosition(
	factionId: AIFactionId,
): { x: number; z: number } | null {
	const state = getAllAIFactions().get(factionId);
	if (!state) return null;

	const cells = Array.from(state.territoryCells);
	if (cells.length === 0) return null;

	const cellKey = cells[Math.floor(gameplayRandom() * cells.length)];
	const [q, r] = cellKey.split(",").map(Number);
	const worldPos = gridToWorld(q, r);

	return { x: worldPos.x, z: worldPos.z };
}

/**
 * Find a scout deployment position at the edge of territory.
 */
function findScoutPosition(
	factionId: AIFactionId,
): { x: number; z: number } | null {
	const state = getAllAIFactions().get(factionId);
	if (!state) return null;

	const cells = Array.from(state.territoryCells);
	if (cells.length === 0) return null;

	// Find border cells (cells with at least one neighbor not in territory)
	const borderCells: string[] = [];
	for (const cellKey of cells) {
		const [q, r] = cellKey.split(",").map(Number);
		const neighbors = [
			`${q + 1},${r}`,
			`${q - 1},${r}`,
			`${q},${r + 1}`,
			`${q},${r - 1}`,
			`${q + 1},${r - 1}`,
			`${q - 1},${r + 1}`,
		];

		const isBorder = neighbors.some((n) => !state.territoryCells.has(n));
		if (isBorder) {
			borderCells.push(cellKey);
		}
	}

	if (borderCells.length === 0) return null;

	const cellKey =
		borderCells[Math.floor(gameplayRandom() * borderCells.length)];
	const [q, r] = cellKey.split(",").map(Number);
	const worldPos = gridToWorld(q, r);

	if (!isPassableAtWorldPosition(worldPos.x, worldPos.z)) return null;

	return { x: worldPos.x, z: worldPos.z };
}

/**
 * Reset the governor system.
 */
export function resetGovernorSystem(): void {
	initialized = false;
}
