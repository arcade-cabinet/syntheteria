/**
 * Unit upgrade system.
 *
 * Allows player units to upgrade from Mark I → II → III
 * when at a powered fabrication unit with sufficient materials.
 * Consumes resources and applies new stats from robotDefs.
 */

import type { Entity } from "koota";
import { playSfx } from "../audio";
import { getMarkTier, getUpgradeCost, MAX_MARK } from "../config/robotDefs";
import { BuildingTrait, Position, Unit } from "../ecs/traits";
import { world } from "../ecs/world";
import { getResources, spendResource } from "./resources";

/** Range within which a unit must be to a fabrication unit to upgrade */
const UPGRADE_RANGE = 3.0;

/**
 * Check if a unit can upgrade.
 * Returns the cost array if upgrade is possible, null otherwise.
 */
export function canUpgrade(
	entity: Entity,
): { type: string; amount: number }[] | null {
	const unit = entity.get(Unit);
	if (!unit) return null;
	if (unit.mark >= MAX_MARK) return null;

	// Must be near a powered fabrication unit
	const pos = entity.get(Position);
	if (!pos) return null;

	let nearFab = false;
	for (const building of world.query(BuildingTrait, Position)) {
		const bldg = building.get(BuildingTrait)!;
		if (bldg.buildingType !== "fabrication_unit") continue;
		if (!bldg.powered || !bldg.operational) continue;

		const bPos = building.get(Position)!;
		const dx = bPos.x - pos.x;
		const dz = bPos.z - pos.z;
		if (Math.sqrt(dx * dx + dz * dz) <= UPGRADE_RANGE) {
			nearFab = true;
			break;
		}
	}
	if (!nearFab) return null;

	// Check material costs
	const costs = getUpgradeCost(unit.unitType, unit.mark);
	if (!costs || costs.length === 0) return null;

	const pool = getResources();
	for (const cost of costs) {
		if (pool[cost.type] < cost.amount) return null;
	}

	return costs;
}

/**
 * Attempt to upgrade a unit to the next mark level.
 * Returns true if the upgrade succeeded.
 */
export function performUpgrade(entity: Entity): boolean {
	const costs = canUpgrade(entity);
	if (!costs) return false;

	const unit = entity.get(Unit)!;
	const nextMark = unit.mark + 1;

	// Spend resources
	for (const cost of costs) {
		if (
			!spendResource(
				cost.type as keyof ReturnType<typeof getResources>,
				cost.amount,
			)
		) {
			return false;
		}
	}

	// Apply new mark level and stats
	const nextTier = getMarkTier(unit.unitType, nextMark);
	if (!nextTier) return false;

	entity.set(Unit, {
		mark: nextMark,
		speed: nextTier.stats.speed,
	});

	playSfx("build_complete");
	return true;
}
