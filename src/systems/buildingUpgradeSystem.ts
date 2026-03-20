/**
 * Building upgrade system — handles tier progression for buildings.
 * Replaces the centralized tech tree with per-building upgrades.
 */
import type { World } from "koota";
import { BUILDING_UNLOCK_CHAINS } from "../config";
import { Building } from "../traits";

export interface BuildingUpgradeJob {
	entityId: number;
	targetTier: 2 | 3;
	turnsRemaining: number;
}

const upgradeJobs: BuildingUpgradeJob[] = [];

/** Start upgrading a building to the next tier. */
export function startBuildingUpgrade(
	world: World,
	entityId: number,
): { success: boolean; reason?: string } {
	for (const entity of world.query(Building)) {
		if (entity.id() !== entityId) continue;
		const b = entity.get(Building);
		if (!b) return { success: false, reason: "not_found" };

		const currentTier = b.buildingTier;
		if (currentTier >= 3) return { success: false, reason: "max_tier" };

		const targetTier = (currentTier + 1) as 2 | 3;
		const chainDef =
			BUILDING_UNLOCK_CHAINS[
				b.buildingType as keyof typeof BUILDING_UNLOCK_CHAINS
			];
		if (!chainDef) return { success: false, reason: "no_upgrades" };

		const tierDef = chainDef.tiers[targetTier];
		if (!tierDef) return { success: false, reason: "no_tier_def" };

		// TODO: Check epoch requirement, check resources, deduct resources

		upgradeJobs.push({
			entityId,
			targetTier,
			turnsRemaining: tierDef.upgradeTurns,
		});

		return { success: true };
	}
	return { success: false, reason: "not_found" };
}

/** Tick all upgrade jobs. Called each turn in the environment phase. */
export function runBuildingUpgrades(world: World): void {
	const completed: number[] = [];

	for (let i = upgradeJobs.length - 1; i >= 0; i--) {
		const job = upgradeJobs[i]!;
		job.turnsRemaining--;

		if (job.turnsRemaining <= 0) {
			for (const entity of world.query(Building)) {
				if (entity.id() === job.entityId) {
					entity.set(Building, { buildingTier: job.targetTier });
					completed.push(i);
					break;
				}
			}
		}
	}

	for (const idx of completed.reverse()) {
		upgradeJobs.splice(idx, 1);
	}
}

/** Get the current upgrade job for a building, if any. */
export function getBuildingUpgradeJob(
	entityId: number,
): BuildingUpgradeJob | null {
	return upgradeJobs.find((j) => j.entityId === entityId) ?? null;
}

/** Clear all upgrade jobs (for game restart). */
export function clearBuildingUpgradeJobs(): void {
	upgradeJobs.length = 0;
}
