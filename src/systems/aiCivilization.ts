/**
 * AI Civilization system — manages AI faction state and world-visible actions.
 *
 * Each AI faction has:
 * - Territory cells (hex positions they control)
 * - Buildings (spawned via the same factory as player buildings)
 * - Scout units that appear in discovered cells
 * - Harvest actions that produce visible effects
 *
 * Governor decisions flow through here to produce renderer-visible events.
 */

import factionsConfig from "../config/factions.json";
import { gameplayRandom } from "../ecs/seed";
import {
	AIController,
	Building,
	Identity,
	MapFragment,
	Navigation,
	Unit,
	WorldPosition,
} from "../ecs/traits";
import { units, world } from "../ecs/world";
import { gridToWorld, worldToGrid } from "../world/sectorCoordinates";
import {
	getSurfaceHeightAtWorldPosition,
	isPassableAtWorldPosition,
} from "../world/structuralSpace";
import { recordFactionActivity } from "./factionActivityFeed";

// --- Types ---

export type AIFactionId = keyof typeof factionsConfig;

export interface AIFactionState {
	id: AIFactionId;
	territoryCells: Set<string>; // "q,r" keys
	buildingCount: number;
	scoutCount: number;
	resources: number;
	lastBuildTick: number;
	lastExpandTick: number;
	lastHarvestTick: number;
	lastScoutTick: number;
}

export interface ConstructionEvent {
	faction: string;
	position: { x: number; z: number };
	buildingType: string;
	tick: number;
}

export interface TerritoryChangeEvent {
	faction: string;
	cells: Array<{ q: number; r: number }>;
	tick: number;
}

export interface HarvestEvent {
	faction: string;
	position: { x: number; z: number };
	tick: number;
}

// --- Module state ---

const factions = new Map<AIFactionId, AIFactionState>();
let constructionEvents: ConstructionEvent[] = [];
let territoryChangeEvents: TerritoryChangeEvent[] = [];
let harvestEvents: HarvestEvent[] = [];

const FACTION_IDS: AIFactionId[] = Object.keys(factionsConfig) as AIFactionId[];

// Cooldowns (in ticks)
const BUILD_COOLDOWN = 120;
const EXPAND_COOLDOWN = 90;
const HARVEST_COOLDOWN = 60;
const SCOUT_COOLDOWN = 150;

// Starting positions for each faction (spread across the map)
const FACTION_SPAWN_POSITIONS: Record<AIFactionId, { x: number; z: number }> = {
	reclaimers: { x: -18, z: -12 },
	volt_collective: { x: 38, z: -12 },
	signal_choir: { x: 38, z: 38 },
	iron_creed: { x: -18, z: 38 },
};

// --- Initialization ---

export function initializeAIFactions(): void {
	factions.clear();
	constructionEvents = [];
	territoryChangeEvents = [];
	harvestEvents = [];

	for (const factionId of FACTION_IDS) {
		const spawn = FACTION_SPAWN_POSITIONS[factionId];
		const hex = worldToGrid(spawn.x, spawn.z);
		const initialCells = new Set<string>();

		// Claim a small starting territory (3x3 hex area)
		for (let dq = -1; dq <= 1; dq++) {
			for (let dr = -1; dr <= 1; dr++) {
				initialCells.add(`${hex.q + dq},${hex.r + dr}`);
			}
		}

		factions.set(factionId, {
			id: factionId,
			territoryCells: initialCells,
			buildingCount: 0,
			scoutCount: 0,
			resources: 10,
			lastBuildTick: 0,
			lastExpandTick: 0,
			lastHarvestTick: 0,
			lastScoutTick: 0,
		});
	}
}

// --- Getters ---

export function getAIFactionState(
	factionId: AIFactionId,
): AIFactionState | undefined {
	return factions.get(factionId);
}

export function getAllAIFactions(): ReadonlyMap<AIFactionId, AIFactionState> {
	return factions;
}

export function getConstructionEvents(): readonly ConstructionEvent[] {
	return constructionEvents;
}

export function getTerritoryChangeEvents(): readonly TerritoryChangeEvent[] {
	return territoryChangeEvents;
}

export function getHarvestEvents(): readonly HarvestEvent[] {
	return harvestEvents;
}

export function getFactionTerritoryCells(
	factionId: AIFactionId,
): ReadonlySet<string> {
	return factions.get(factionId)?.territoryCells ?? new Set();
}

// --- Actions ---

/**
 * AI faction places a building. Produces a ConstructionEvent for renderers.
 */
export function aiFactionBuild(
	factionId: AIFactionId,
	position: { x: number; z: number },
	buildingType: string,
	tick: number,
): boolean {
	const state = factions.get(factionId);
	if (!state) return false;

	const config = factionsConfig[factionId];
	if (state.buildingCount >= config.maxBuildings) return false;
	if (tick - state.lastBuildTick < BUILD_COOLDOWN) return false;
	if (!isPassableAtWorldPosition(position.x, position.z)) return false;

	// Spawn the building entity with the faction identity
	const y = getSurfaceHeightAtWorldPosition(position.x, position.z);
	const entity = world.spawn(Identity, WorldPosition, MapFragment, Building);
	entity.set(Identity, {
		id: `ai_bldg_${factionId}_${state.buildingCount}`,
		faction: "rogue" as const, // AI factions use "rogue" faction type in ECS
	});
	entity.set(WorldPosition, { x: position.x, y, z: position.z });
	entity.set(MapFragment, { fragmentId: "world_primary" });
	entity.set(Building, {
		type: buildingType,
		powered: true,
		operational: true,
		selected: false,
		components: [],
	});

	state.buildingCount++;
	state.lastBuildTick = tick;

	const event: ConstructionEvent = {
		faction: factionId,
		position: { x: position.x, z: position.z },
		buildingType,
		tick,
	};
	constructionEvents.push(event);

	recordFactionActivity({
		turn: tick,
		faction: factionId,
		action: "build",
		position: { x: position.x, z: position.z },
		detail: buildingType,
	});

	return true;
}

/**
 * AI faction expands territory. Produces TerritoryChangeEvent for renderers.
 */
export function aiFactionExpand(factionId: AIFactionId, tick: number): boolean {
	const state = factions.get(factionId);
	if (!state) return false;

	const config = factionsConfig[factionId];
	if (state.territoryCells.size >= config.maxTerritoryCells) return false;
	if (tick - state.lastExpandTick < EXPAND_COOLDOWN) return false;

	// Find border cells and expand outward
	const newCells: Array<{ q: number; r: number }> = [];
	const existingCells = Array.from(state.territoryCells);

	for (const cellKey of existingCells) {
		const [q, r] = cellKey.split(",").map(Number);
		// Hex neighbors (axial coordinates)
		const neighbors = [
			{ q: q + 1, r },
			{ q: q - 1, r },
			{ q, r: r + 1 },
			{ q, r: r - 1 },
			{ q: q + 1, r: r - 1 },
			{ q: q - 1, r: r + 1 },
		];

		for (const n of neighbors) {
			const key = `${n.q},${n.r}`;
			if (
				!state.territoryCells.has(key) &&
				state.territoryCells.size + newCells.length < config.maxTerritoryCells
			) {
				if (gameplayRandom() < config.expandBias) {
					state.territoryCells.add(key);
					newCells.push({ q: n.q, r: n.r });
				}
			}
		}

		if (newCells.length >= 3) break; // max 3 cells per expansion tick
	}

	if (newCells.length === 0) return false;

	state.lastExpandTick = tick;

	const event: TerritoryChangeEvent = {
		faction: factionId,
		cells: newCells,
		tick,
	};
	territoryChangeEvents.push(event);

	// Find center of newly expanded cells for activity log position
	const cx = newCells.reduce((sum, c) => sum + c.q, 0) / newCells.length;
	const cz = newCells.reduce((sum, c) => sum + c.r, 0) / newCells.length;

	recordFactionActivity({
		turn: tick,
		faction: factionId,
		action: "expand",
		position: { x: cx, z: cz },
		detail: `+${newCells.length} cells`,
	});

	return true;
}

/**
 * AI faction harvests resources. Produces HarvestEvent for renderers.
 */
export function aiFactionHarvest(
	factionId: AIFactionId,
	position: { x: number; z: number },
	tick: number,
): boolean {
	const state = factions.get(factionId);
	if (!state) return false;
	if (tick - state.lastHarvestTick < HARVEST_COOLDOWN) return false;

	state.resources += 2 + Math.floor(gameplayRandom() * 3);
	state.lastHarvestTick = tick;

	const event: HarvestEvent = {
		faction: factionId,
		position: { x: position.x, z: position.z },
		tick,
	};
	harvestEvents.push(event);

	recordFactionActivity({
		turn: tick,
		faction: factionId,
		action: "harvest",
		position: { x: position.x, z: position.z },
	});

	return true;
}

/**
 * AI faction deploys a scout unit. Scouts appear at fog edges for player visibility.
 */
export function aiFactionDeployScout(
	factionId: AIFactionId,
	position: { x: number; z: number },
	tick: number,
): boolean {
	const state = factions.get(factionId);
	if (!state) return false;

	const config = factionsConfig[factionId];
	if (state.scoutCount >= config.startingUnits + 2) return false;
	if (tick - state.lastScoutTick < SCOUT_COOLDOWN) return false;
	if (!isPassableAtWorldPosition(position.x, position.z)) return false;

	const y = getSurfaceHeightAtWorldPosition(position.x, position.z);

	const entity = world.spawn(
		AIController,
		Identity,
		WorldPosition,
		MapFragment,
		Unit,
		Navigation,
	);
	entity.set(Identity, {
		id: `ai_scout_${factionId}_${state.scoutCount}`,
		faction: "rogue" as const,
	});
	entity.set(AIController, {
		role: "hostile_machine",
		enabled: true,
		stateJson: null,
	});
	entity.set(WorldPosition, { x: position.x, y, z: position.z });
	entity.set(MapFragment, { fragmentId: "world_primary" });
	entity.set(Unit, {
		type: "maintenance_bot",
		archetypeId: "field_technician",
		markLevel: 1,
		speechProfile: "mentor",
		displayName: `${factionsConfig[factionId].displayName} Scout`,
		speed: 3,
		selected: false,
		components: [
			{ name: "camera", functional: true, material: "electronic" },
			{ name: "legs", functional: true, material: "metal" },
		],
	});
	entity.set(Navigation, { path: [], pathIndex: 0, moving: false });

	state.scoutCount++;
	state.lastScoutTick = tick;

	recordFactionActivity({
		turn: tick,
		faction: factionId,
		action: "scout",
		position: { x: position.x, z: position.z },
	});

	return true;
}

// --- Reset ---

export function resetAICivilization(): void {
	factions.clear();
	constructionEvents = [];
	territoryChangeEvents = [];
	harvestEvents = [];
}
