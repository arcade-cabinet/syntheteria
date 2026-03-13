/**
 * Harvest System — The core Exploit mechanic.
 *
 * Fabricator bots harvest ecumenopolis structures for materials.
 * Each structure contains a resource pool based on its model family.
 * Harvesting takes time, yields materials, and consumes the structure.
 *
 * Flow:
 *   1. Player selects Fabricator → Radial "Harvest" → clicks target structure
 *   2. Fabricator walks to structure (movement system)
 *   3. harvestSystem() ticks down the harvest timer each frame
 *   4. On completion: materials deposited, structure removed from session
 *
 * This is the economic engine of the game — the ecumenopolis IS the
 * resource base. Every wall, column, pipe, and computer is material.
 */

import { Identity, Unit, WorldPosition } from "../ecs/traits";
import { units } from "../ecs/world";
import {
	getResourcePoolForModel,
	type HarvestResource,
	isHarvestable,
	rollHarvestYield,
} from "./resourcePools";
import { expireHarvestEvents, pushHarvestYield } from "./harvestEvents";
import { addResource, type ResourcePool } from "./resources";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ActiveHarvest {
	/** Entity ID of the harvesting bot */
	harvesterId: string;
	/** Structure snapshot ID being harvested */
	structureId: number;
	/** Model ID for resource pool lookup */
	modelId: string;
	/** Model family for resource pool lookup */
	modelFamily: string;
	/** Ticks remaining */
	ticksRemaining: number;
	/** Total ticks for this harvest */
	totalTicks: number;
	/** World position of the structure */
	targetX: number;
	targetZ: number;
}

// ─── State ───────────────────────────────────────────────────────────────────

const activeHarvests: ActiveHarvest[] = [];
const consumedStructureIds = new Set<number>();

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
 * Reset harvest state — call on new game/load.
 */
export function resetHarvestSystem() {
	activeHarvests.length = 0;
	consumedStructureIds.clear();
}

/**
 * Rehydrate harvest state from a save — restores consumed IDs and active harvests.
 */
export function rehydrateHarvestState(
	consumedIds: number[],
	harvests: ActiveHarvest[],
) {
	consumedStructureIds.clear();
	for (const id of consumedIds) {
		consumedStructureIds.add(id);
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
			const pool = getResourcePoolForModel(
				harvest.modelFamily,
				harvest.modelId,
			);
			const seed =
				harvest.structureId * 31 +
				harvest.modelId.length * 17 +
				harvest.totalTicks;
			const yields = rollHarvestYield(pool, seed);

			for (const [resource, amount] of yields) {
				const poolKey = HARVEST_TO_POOL_KEY[resource];
				if (poolKey) {
					addResource(poolKey, amount);
				}
			}

			// Push a yield event for UI notification
			pushHarvestYield(
				harvest.targetX,
				harvest.targetZ,
				yields,
				currentTick,
			);

			// Mark structure as consumed
			consumedStructureIds.add(harvest.structureId);
			activeHarvests.splice(i, 1);
		}
	}
}
