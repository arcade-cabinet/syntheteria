/**
 * Building upgrade system — handles tier progression for buildings.
 * Replaces the centralized tech tree with per-building upgrades.
 */
import type { World } from "koota";
import {
	BUILDING_UNLOCK_CHAINS,
	computeEpoch,
	getBuildingMilestone,
} from "../config";
import type { ResourceMaterial } from "../terrain";
import { Building } from "../traits";
import { canAfford, spendResources } from "./resourceSystem";
import { pushToast } from "./toastNotifications";
import { fireTutorialTooltip } from "./tutorialTooltips";

export interface BuildingUpgradeJob {
	entityId: number;
	targetTier: 2 | 3;
	turnsRemaining: number;
}

const upgradeJobs: BuildingUpgradeJob[] = [];

/** Check if a building upgrade is affordable and eligible (without deducting). */
export function canUpgradeBuilding(
	world: World,
	entityId: number,
	highestBuildingTier: number,
	currentTurn: number,
): { canUpgrade: boolean; reason?: string } {
	for (const entity of world.query(Building)) {
		if (entity.id() !== entityId) continue;
		const b = entity.get(Building);
		if (!b) return { canUpgrade: false, reason: "not_found" };

		if (b.buildingTier >= 3) return { canUpgrade: false, reason: "max_tier" };

		if (upgradeJobs.some((j) => j.entityId === entityId))
			return { canUpgrade: false, reason: "already_upgrading" };

		const targetTier = (b.buildingTier + 1) as 2 | 3;
		const chainDef =
			BUILDING_UNLOCK_CHAINS[
				b.buildingType as keyof typeof BUILDING_UNLOCK_CHAINS
			];
		if (!chainDef) return { canUpgrade: false, reason: "no_upgrades" };

		const tierDef = chainDef.tiers[targetTier];
		if (!tierDef) return { canUpgrade: false, reason: "no_tier_def" };

		const epoch = computeEpoch(highestBuildingTier, currentTurn);
		if (epoch.number < tierDef.minEpoch)
			return { canUpgrade: false, reason: "epoch_locked" };

		if (!canAfford(world, b.factionId, tierDef.cost))
			return { canUpgrade: false, reason: "cannot_afford" };

		return { canUpgrade: true };
	}
	return { canUpgrade: false, reason: "not_found" };
}

/**
 * Start upgrading a building to the next tier. Deducts resources.
 *
 * Validates epoch requirement and cost, deducts resources from the owning
 * faction's pool, and enqueues a BuildingUpgradeJob. Fails gracefully
 * with a reason string if any precondition is not met.
 *
 * @param world - ECS world.
 * @param entityId - Entity ID of the building to upgrade.
 * @param highestBuildingTier - Current highest building tier (for epoch calculation).
 * @param currentTurn - Current turn number (for epoch calculation).
 * @returns Success flag and optional failure reason.
 */
export function startBuildingUpgrade(
	world: World,
	entityId: number,
	highestBuildingTier = 1,
	currentTurn = 1,
): { success: boolean; reason?: string } {
	for (const entity of world.query(Building)) {
		if (entity.id() !== entityId) continue;
		const b = entity.get(Building);
		if (!b) return { success: false, reason: "not_found" };

		const currentBuildingTier = b.buildingTier;
		if (currentBuildingTier >= 3) return { success: false, reason: "max_tier" };

		if (upgradeJobs.some((j) => j.entityId === entityId))
			return { success: false, reason: "already_upgrading" };

		const targetTier = (currentBuildingTier + 1) as 2 | 3;
		const chainDef =
			BUILDING_UNLOCK_CHAINS[
				b.buildingType as keyof typeof BUILDING_UNLOCK_CHAINS
			];
		if (!chainDef) return { success: false, reason: "no_upgrades" };

		const tierDef = chainDef.tiers[targetTier];
		if (!tierDef) return { success: false, reason: "no_tier_def" };

		const epoch = computeEpoch(highestBuildingTier, currentTurn);
		if (epoch.number < tierDef.minEpoch)
			return { success: false, reason: "epoch_locked" };

		if (!canAfford(world, b.factionId, tierDef.cost))
			return { success: false, reason: "cannot_afford" };

		for (const [mat, amount] of Object.entries(tierDef.cost)) {
			if (amount && amount > 0) {
				spendResources(world, b.factionId, mat as ResourceMaterial, amount);
			}
		}

		upgradeJobs.push({
			entityId,
			targetTier,
			turnsRemaining: tierDef.upgradeTurns,
		});

		return { success: true };
	}
	return { success: false, reason: "not_found" };
}

/**
 * Tick all active upgrade jobs. Called each turn in the environment phase.
 *
 * Decrements turnsRemaining on each job. When a job completes, sets the
 * building's tier and fires a milestone toast notification if applicable.
 *
 * @param world - ECS world.
 */
export function runBuildingUpgrades(world: World): void {
	const completed: number[] = [];

	for (let i = upgradeJobs.length - 1; i >= 0; i--) {
		const job = upgradeJobs[i]!;
		job.turnsRemaining--;

		if (job.turnsRemaining <= 0) {
			for (const entity of world.query(Building)) {
				if (entity.id() === job.entityId) {
					const b = entity.get(Building);
					entity.set(Building, { buildingTier: job.targetTier });
					completed.push(i);

					if (b) {
						const milestone = getBuildingMilestone(
							b.buildingType,
							job.targetTier,
						);
						if (milestone) {
							pushToast(
								"construction",
								milestone.title,
								milestone.toastMessage,
								6000,
							);
						}
						fireTutorialTooltip("first_building_upgraded");
					}
					break;
				}
			}
		}
	}

	for (const idx of completed.reverse()) {
		upgradeJobs.splice(idx, 1);
	}
}

/**
 * Get the current upgrade job for a building, if any.
 *
 * @param entityId - Entity ID of the building to query.
 * @returns The active BuildingUpgradeJob or null.
 */
export function getBuildingUpgradeJob(
	entityId: number,
): BuildingUpgradeJob | null {
	return upgradeJobs.find((j) => j.entityId === entityId) ?? null;
}

/** Clear all upgrade jobs (for game restart). */
export function clearBuildingUpgradeJobs(): void {
	upgradeJobs.length = 0;
}
