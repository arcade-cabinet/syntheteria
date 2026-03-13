/**
 * Faction Spawning — Places rival faction units at game start.
 *
 * Each rival faction (Reclaimers, Volt Collective, Iron Creed) starts in a
 * different quadrant of the map, separated from the player's spawn point.
 *
 * Starting units per rival:
 *   - 2 scouts (mecha_scout)
 *   - 1 fabricator (fabrication_unit as mobile unit)
 *   - 1 guardian (mecha_golem)
 *
 * Units are spawned as real ECS entities with proper faction Identity,
 * so the existing UnitRenderer will render them with faction-colored beacons.
 */

import { createBotUnitState, getBotDefinition, type BotUnitType } from "../bots";
import {
	AIController,
	Identity,
	MapFragment,
	Navigation,
	Unit,
	WorldPosition,
} from "../ecs/traits";
import { world } from "../ecs/world";
import { gameplayRandom } from "../ecs/seed";
import {
	getWorldDimensions,
	gridToWorld,
	SECTOR_LATTICE_SIZE,
} from "../world/sectorCoordinates";
import {
	getSectorCell,
	requirePrimaryStructuralFragment,
	getSurfaceHeightAtWorldPosition,
} from "../world/structuralSpace";
import { RIVAL_FACTIONS } from "../ai/governor/factionGovernors";
import { seedFactionResources, type EconomyFactionId } from "./factionEconomy";
import { addUnitsToTurnState } from "./turnSystem";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface FactionSpawnConfig {
	/** Economy faction ID */
	economyId: EconomyFactionId;
	/** Turn system faction name */
	factionName: string;
	/** Display label */
	label: string;
	/** Starting units */
	startingUnits: Array<{ type: BotUnitType; count: number }>;
}

export interface SpawnRegion {
	/** Center grid coordinates */
	centerQ: number;
	centerR: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

/** Default starting units for each rival faction */
const DEFAULT_STARTING_UNITS: Array<{ type: BotUnitType; count: number }> = [
	{ type: "mecha_scout", count: 2 },
	{ type: "fabrication_unit", count: 1 },
	{ type: "mecha_golem", count: 1 },
];

/** Starting resources for rival factions */
const RIVAL_STARTING_RESOURCES = {
	scrapMetal: 30,
	eWaste: 15,
	intactComponents: 5,
	energy: 50,
};

/** Minimum distance (grid cells) between faction spawn centers */
const MIN_FACTION_DISTANCE = 8;

/** Spread radius for unit placement around spawn center */
const SPAWN_SPREAD_RADIUS = 3;

// ─── State ───────────────────────────────────────────────────────────────────

let nextRivalEntityId = 1000;
const spawnedFactionUnits = new Map<string, string[]>();

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Compute spawn regions for rival factions, placing them in different
 * quadrants relative to the world center. The player typically spawns
 * near center, so rivals go to corners/edges.
 */
export function computeSpawnRegions(
	worldWidth: number,
	worldHeight: number,
): SpawnRegion[] {
	const halfW = Math.floor(worldWidth / 2);
	const halfH = Math.floor(worldHeight / 2);
	const margin = Math.max(3, Math.floor(Math.min(worldWidth, worldHeight) * 0.15));

	// Place three rivals in NE, SW, NW quadrants (player is near center/SE)
	return [
		{ centerQ: halfW - margin, centerR: -(halfH - margin) }, // NE quadrant
		{ centerQ: -(halfW - margin), centerR: halfH - margin }, // SW quadrant
		{ centerQ: -(halfW - margin), centerR: -(halfH - margin) }, // NW quadrant
	];
}

/**
 * Find a passable cell near the target grid position.
 * Spirals outward from center to find a valid placement.
 */
export function findPassableCell(
	targetQ: number,
	targetR: number,
	maxRadius: number,
): { q: number; r: number } | null {
	// Try center first
	const centerCell = getSectorCell(targetQ, targetR);
	if (centerCell?.passable) {
		return { q: targetQ, r: targetR };
	}

	// Spiral outward
	for (let radius = 1; radius <= maxRadius; radius++) {
		for (let dq = -radius; dq <= radius; dq++) {
			for (let dr = -radius; dr <= radius; dr++) {
				if (Math.abs(dq) + Math.abs(dr) > radius) continue;
				const q = targetQ + dq;
				const r = targetR + dr;
				const cell = getSectorCell(q, r);
				if (cell?.passable) {
					return { q, r };
				}
			}
		}
	}

	return null;
}

/**
 * Spawn a single rival unit at a world position.
 */
function spawnRivalUnit(
	unitType: BotUnitType,
	faction: EconomyFactionId,
	worldX: number,
	worldZ: number,
	fragmentId: string,
): string {
	const config = getBotDefinition(unitType);
	const y = getSurfaceHeightAtWorldPosition(worldX, worldZ);
	const entityId = `rival_${faction}_${nextRivalEntityId++}`;

	const defaultComponents = [
		{ name: "camera", functional: true, material: "electronic" as const },
		{ name: "arms", functional: true, material: "metal" as const },
		{ name: "locomotion", functional: true, material: "metal" as const },
	];

	const entity = world.spawn(
		AIController,
		Identity,
		WorldPosition,
		MapFragment,
		Unit,
		Navigation,
	);
	entity.set(Identity, { id: entityId, faction });
	entity.set(AIController, {
		role: config.defaultAiRole,
		enabled: true,
		stateJson: null,
	});
	entity.set(WorldPosition, { x: worldX, y, z: worldZ });
	entity.set(MapFragment, { fragmentId });
	entity.set(
		Unit,
		createBotUnitState({
			unitType,
			displayName: `${config.label}`,
			speed: config.baseSpeed,
			components: defaultComponents,
		}),
	);
	entity.set(Navigation, { path: [], pathIndex: 0, moving: false });

	return entityId;
}

/**
 * Spawn all starting units for all rival factions.
 * Call this after world generation and player entity hydration.
 */
export function spawnRivalFactions(): Map<string, string[]> {
	const dimensions = getWorldDimensions();
	const regions = computeSpawnRegions(dimensions.width, dimensions.height);
	const fragment = requirePrimaryStructuralFragment();
	const allSpawnedIds: string[] = [];
	const markLevels = new Map<string, number>();

	spawnedFactionUnits.clear();

	for (let i = 0; i < RIVAL_FACTIONS.length && i < regions.length; i++) {
		const faction = RIVAL_FACTIONS[i];
		const region = regions[i];
		const unitIds: string[] = [];

		for (const unitSpec of DEFAULT_STARTING_UNITS) {
			for (let j = 0; j < unitSpec.count; j++) {
				// Find a passable cell near spawn center with jitter
				const jitterQ = Math.floor(
					(gameplayRandom() - 0.5) * SPAWN_SPREAD_RADIUS * 2,
				);
				const jitterR = Math.floor(
					(gameplayRandom() - 0.5) * SPAWN_SPREAD_RADIUS * 2,
				);
				const targetQ = region.centerQ + jitterQ;
				const targetR = region.centerR + jitterR;

				const cell = findPassableCell(targetQ, targetR, SPAWN_SPREAD_RADIUS + 3);
				if (!cell) continue;

				const worldPos = gridToWorld(cell.q, cell.r);
				const entityId = spawnRivalUnit(
					unitSpec.type,
					faction.economyId,
					worldPos.x,
					worldPos.z,
					fragment.id,
				);
				unitIds.push(entityId);
				allSpawnedIds.push(entityId);
				markLevels.set(entityId, 1);
			}
		}

		spawnedFactionUnits.set(faction.factionName, unitIds);

		// Seed starting resources for this faction
		seedFactionResources(faction.economyId, RIVAL_STARTING_RESOURCES);
	}

	// Register all spawned rival units in the turn system
	if (allSpawnedIds.length > 0) {
		addUnitsToTurnState(allSpawnedIds, markLevels);
	}

	return spawnedFactionUnits;
}

/**
 * Get the entity IDs for a specific rival faction's units.
 */
export function getFactionUnitIds(factionName: string): readonly string[] {
	return spawnedFactionUnits.get(factionName) ?? [];
}

/**
 * Get all spawned rival faction data (for debugging/replay).
 */
export function getAllFactionSpawns(): ReadonlyMap<string, string[]> {
	return spawnedFactionUnits;
}

/**
 * Reset spawn state — call on new game.
 */
export function resetFactionSpawning() {
	spawnedFactionUnits.clear();
	nextRivalEntityId = 1000;
}
