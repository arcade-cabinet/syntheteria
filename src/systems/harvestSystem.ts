/**
 * @module harvestSystem
 *
 * Core Exploit mechanic: Fabricator bots harvest ecumenopolis structures for materials.
 * Manages the full harvest lifecycle from start through tick-down to yield deposit and
 * structure consumption. The ecumenopolis itself is the resource base.
 *
 * @exports ActiveHarvest - In-progress harvest state
 * @exports startHarvest / cancelHarvest - Harvest lifecycle control
 * @exports getActiveHarvests - Active harvest list for UI progress bars
 * @exports isStructureConsumed / getConsumedStructureIds - Consumed structure tracking for renderers
 * @exports harvestSystem - Per-tick harvest timer and completion logic
 * @exports resetHarvestSystem / rehydrateHarvestState - Reset and save/load support
 *
 * @dependencies ecs/traits, ecs/world, narrative (queueThought), resourcePools,
 *   harvestEvents, resources (addResource)
 * @consumers gameState (harvestSystem tick), radialProviders, PlayerGovernor,
 *   HarvestVisualRenderer, HarvestProgressOverlay, CityRenderer, audioHooks,
 *   saveAllState, persistenceSystem, initialization
 */

import { getDatabaseSync } from "../db/runtime";
import { Identity, Unit, WorldPosition } from "../ecs/traits";
import { units } from "../ecs/world";
import { writeTileDelta } from "../world/gen/persist";
import { CHUNK_SIZE, tileKey3D } from "../world/gen/types";
import { invalidateChunk } from "../world/gen/worldGrid";
import { getActiveWorldSession } from "../world/session";
import { expireHarvestEvents, pushHarvestYield } from "./harvestEvents";
import { queueThought } from "./narrative";
import {
	getResourcePoolForFloorMaterial,
	getResourcePoolForModel,
	type HarvestResource,
	isFloorHarvestable,
	isHarvestable,
	rollHarvestYield,
} from "./resourcePools";
import { addResource, type ResourcePool } from "./resources";
import { getTurnState } from "./turnSystem";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ActiveHarvest {
	/** Entity ID of the harvesting bot */
	harvesterId: string;
	/** Structure snapshot ID (omit for floor harvest) */
	structureId?: number;
	/** Model ID for resource pool lookup (omit for floor harvest) */
	modelId?: string;
	/** Model family for resource pool lookup (omit for floor harvest) */
	modelFamily?: string;
	/** True when harvesting a floor tile (strip-mining) */
	isFloorHarvest?: boolean;
	/** Floor material ID (for floor harvest) */
	floorMaterial?: string;
	/** Elevation level (for floor harvest) */
	level?: number;
	/** Ticks remaining */
	ticksRemaining: number;
	/** Total ticks for this harvest */
	totalTicks: number;
	/** World position of the target */
	targetX: number;
	targetZ: number;
}

// ─── State ───────────────────────────────────────────────────────────────────

const activeHarvests: ActiveHarvest[] = [];
const consumedStructureIds = new Set<number>();
const consumedFloorTiles = new Set<string>();

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Start a harvest operation. Called from the radial menu action.
 */
export function startHarvest(
	harvesterId: string,
	structureId: number,
	modelId: string,
	modelFamily: string,
	targetX: number,
	targetZ: number,
): boolean {
	// Don't double-harvest
	if (consumedStructureIds.has(structureId)) return false;
	if (activeHarvests.some((h) => h.structureId === structureId)) return false;

	// Check the harvester isn't already busy
	if (activeHarvests.some((h) => h.harvesterId === harvesterId)) return false;

	if (!isHarvestable(modelFamily)) return false;

	const pool = getResourcePoolForModel(modelFamily, modelId);
	const totalTicks = pool.harvestDuration;

	activeHarvests.push({
		harvesterId,
		structureId,
		modelId,
		modelFamily,
		ticksRemaining: totalTicks,
		totalTicks,
		targetX,
		targetZ,
	});

	queueThought("harvest_instinct");
	return true;
}

/**
 * Start a floor harvest (strip-mining). Fabricator harvests floor tile → pit.
 */
export function startFloorHarvest(
	harvesterId: string,
	tileX: number,
	tileZ: number,
	level: number,
	floorMaterial: string,
): boolean {
	const key = tileKey3D(tileX, tileZ, level);
	if (consumedFloorTiles.has(key)) return false;
	if (
		activeHarvests.some(
			(h) =>
				h.isFloorHarvest &&
				h.targetX === tileX &&
				h.targetZ === tileZ &&
				h.level === level,
		)
	)
		return false;
	if (activeHarvests.some((h) => h.harvesterId === harvesterId)) return false;

	if (!isFloorHarvestable(floorMaterial)) return false;

	const pool = getResourcePoolForFloorMaterial(floorMaterial);
	const totalTicks = pool.harvestDuration;

	activeHarvests.push({
		harvesterId,
		isFloorHarvest: true,
		floorMaterial,
		level,
		ticksRemaining: totalTicks,
		totalTicks,
		targetX: tileX,
		targetZ: tileZ,
	});

	queueThought("harvest_instinct");
	return true;
}

/**
 * Cancel a harvest in progress.
 */
export function cancelHarvest(harvesterId: string) {
	const index = activeHarvests.findIndex((h) => h.harvesterId === harvesterId);
	if (index >= 0) {
		activeHarvests.splice(index, 1);
	}
}

/**
 * Get all active harvests (for UI display).
 */
export function getActiveHarvests(): readonly ActiveHarvest[] {
	return activeHarvests;
}

/**
 * Check if a structure has been consumed by harvesting.
 */
export function isStructureConsumed(structureId: number): boolean {
	return consumedStructureIds.has(structureId);
}

/**
 * Get the set of consumed structure IDs (for renderer filtering).
 */
export function getConsumedStructureIds(): ReadonlySet<number> {
	return consumedStructureIds;
}

/**
 * Check if a floor tile has been consumed by strip-mining.
 */
export function isFloorTileConsumed(
	tileX: number,
	tileZ: number,
	level: number,
): boolean {
	return consumedFloorTiles.has(tileKey3D(tileX, tileZ, level));
}

/**
 * Get the set of consumed floor tile keys (for renderer/persistence).
 */
export function getConsumedFloorTiles(): ReadonlySet<string> {
	return consumedFloorTiles;
}

/**
 * Reset harvest state — call on new game/load.
 */
export function resetHarvestSystem() {
	activeHarvests.length = 0;
	consumedStructureIds.clear();
	consumedFloorTiles.clear();
}

/**
 * Rehydrate harvest state from a save — restores consumed IDs and active harvests.
 */
export function rehydrateHarvestState(
	consumedIds: number[],
	harvests: ActiveHarvest[],
	consumedFloorKeys: string[] = [],
) {
	consumedStructureIds.clear();
	for (const id of consumedIds) {
		consumedStructureIds.add(id);
	}
	consumedFloorTiles.clear();
	for (const key of consumedFloorKeys) {
		consumedFloorTiles.add(key);
	}
	activeHarvests.length = 0;
	for (const h of harvests) {
		activeHarvests.push(h);
	}
}

// ─── Harvest Resource → ResourcePool Key Mapping ─────────────────────────────

const HARVEST_TO_POOL_KEY: Record<HarvestResource, keyof ResourcePool> = {
	heavy_metals: "ferrousScrap",
	light_metals: "alloyStock",
	uranics: "electrolyte",
	plastics: "polymerSalvage",
	oil: "electrolyte",
	microchips: "siliconWafer",
	scrap: "scrapMetal",
	rare_components: "elCrystal",
};

// ─── Tick System ─────────────────────────────────────────────────────────────

/**
 * Harvest tick — called once per simulation frame.
 * Advances all active harvests, completes when timer reaches 0.
 * @param tick - Current simulation tick (used for harvest yield event timestamps)
 */
export function harvestSystem(tick?: number) {
	const currentTick = tick ?? 0;

	// Expire old yield notifications
	expireHarvestEvents(currentTick);

	for (let i = activeHarvests.length - 1; i >= 0; i--) {
		const harvest = activeHarvests[i];

		// Check harvester is still alive and in range
		const harvester = Array.from(units).find(
			(u) => u.get(Identity)?.id === harvest.harvesterId,
		);
		if (!harvester) {
			activeHarvests.splice(i, 1);
			continue;
		}

		const pos = harvester.get(WorldPosition);
		if (pos) {
			const dx = pos.x - harvest.targetX;
			const dz = pos.z - harvest.targetZ;
			const dist = Math.sqrt(dx * dx + dz * dz);
			// Must be within 3 units to harvest
			if (dist > 3.0) continue; // Paused — too far away
		}

		harvest.ticksRemaining--;

		if (harvest.ticksRemaining <= 0) {
			// Harvest complete — roll yield and deposit resources
			const pool = harvest.isFloorHarvest
				? getResourcePoolForFloorMaterial(harvest.floorMaterial!)
				: getResourcePoolForModel(harvest.modelFamily!, harvest.modelId!);
			const seed = harvest.isFloorHarvest
				? harvest.targetX * 31 +
					harvest.targetZ * 17 +
					(harvest.level ?? 0) * 7 +
					harvest.totalTicks
				: harvest.structureId! * 31 +
					harvest.modelId!.length * 17 +
					harvest.totalTicks;
			const yields = rollHarvestYield(pool, seed);

			for (const [resource, amount] of yields) {
				const poolKey = HARVEST_TO_POOL_KEY[resource];
				if (poolKey) {
					addResource(poolKey, amount);
				}
			}

			// Push a yield event for UI notification
			pushHarvestYield(harvest.targetX, harvest.targetZ, yields, currentTick);

			// Mark as consumed
			if (harvest.isFloorHarvest) {
				consumedFloorTiles.add(
					tileKey3D(harvest.targetX, harvest.targetZ, harvest.level ?? 0),
				);
				// Persist pit state to SQLite
				const session = getActiveWorldSession();
				if (session) {
					try {
						const db = getDatabaseSync();
						const turnNumber = getTurnState().turnNumber;
						writeTileDelta(db, session.saveGame.id, {
							tileX: harvest.targetX,
							tileZ: harvest.targetZ,
							level: harvest.level ?? 0,
							changeType: "harvested",
							newModelId: null,
							newPassable: true,
							controllerFaction: null,
							resourceRemaining: null,
							turnNumber,
						});
						const cx = Math.floor(harvest.targetX / CHUNK_SIZE);
						const cz = Math.floor(harvest.targetZ / CHUNK_SIZE);
						invalidateChunk(cx, cz);
					} catch {
						// DB may be unavailable (tests, headless)
					}
				}
			} else {
				consumedStructureIds.add(harvest.structureId!);
			}
			activeHarvests.splice(i, 1);
		}
	}
}
