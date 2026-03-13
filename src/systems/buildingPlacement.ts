import { isInsideBuilding } from "../ecs/cityLayout";
import { spawnFabricationUnit, spawnLightningRod } from "../ecs/factory";
import { Identity, MapFragment, WorldPosition } from "../ecs/traits";
import { lightningRods, units } from "../ecs/world";
import { isPassableAtWorldPosition } from "../world/structuralSpace";
import { getResources, type ResourcePool, spendResource } from "./resources";
/**
 * Building placement state machine.
 *
 * Player selects a building type from the toolbar, then taps/clicks
 * on the ground to place it. Ghost preview shows valid/invalid position.
 *
 * Placement rules:
 * - Must be on passable structural ground (not breach void, not inside existing buildings)
 * - Must have enough resources
 * - Lightning rods need minimum spacing from other rods
 */

export type PlaceableType = "lightning_rod" | "fabrication_unit" | null;

export interface PlacementCost {
	type: keyof ResourcePool;
	amount: number;
}

export const BUILDING_COSTS: Record<string, PlacementCost[]> = {
	lightning_rod: [
		{ type: "scrapMetal", amount: 8 },
		{ type: "eWaste", amount: 4 },
	],
	fabrication_unit: [
		{ type: "scrapMetal", amount: 12 },
		{ type: "eWaste", amount: 6 },
		{ type: "intactComponents", amount: 2 },
	],
};

/** Minimum distance between lightning rods */
const MIN_ROD_SPACING = 10;

let activePlacement: PlaceableType = null;
let ghostPosition: { x: number; z: number } | null = null;
let ghostValid = false;

export function getActivePlacement(): PlaceableType {
	return activePlacement;
}

export function setActivePlacement(type: PlaceableType) {
	activePlacement = type;
	ghostPosition = null;
	ghostValid = false;
}

export function getGhostPosition(): {
	x: number;
	z: number;
	valid: boolean;
} | null {
	if (!ghostPosition || !activePlacement) return null;
	return { ...ghostPosition, valid: ghostValid };
}

export function updateGhostPosition(x: number, z: number) {
	ghostPosition = { x, z };
	ghostValid = isValidPlacement(x, z, activePlacement!);
}

function isValidPlacement(x: number, z: number, type: PlaceableType): boolean {
	if (!type) return false;
	if (!isPassableAtWorldPosition(x, z)) return false;
	if (isInsideBuilding(x, z)) return false;

	// Lightning rods need spacing
	if (type === "lightning_rod") {
		for (const rod of lightningRods) {
			if (!rod.get(WorldPosition)!) continue;
			const dx = rod.get(WorldPosition)!.x - x;
			const dz = rod.get(WorldPosition)!.z - z;
			if (Math.sqrt(dx * dx + dz * dz) < MIN_ROD_SPACING) return false;
		}
	}

	return true;
}

/**
 * Attempt to place the active building at the ghost position.
 * Returns true if placement succeeded.
 */
export function confirmPlacement(): boolean {
	if (!activePlacement || !ghostPosition || !ghostValid) return false;

	const costs = BUILDING_COSTS[activePlacement];
	if (!costs) return false;

	// Check all costs can be paid before spending
	const pool = getResources();
	for (const cost of costs) {
		if ((pool[cost.type] ?? 0) < cost.amount) return false;
	}

	// Spend resources
	for (const cost of costs) {
		if (!spendResource(cost.type, cost.amount)) return false;
	}

	// Find a fragment to attach to (use first player unit's fragment)
	let fragmentId: string | null = null;
	for (const unit of units) {
		if (unit.get(Identity)?.faction === "player") {
			fragmentId = unit.get(MapFragment)!.fragmentId;
			break;
		}
	}
	if (!fragmentId) return false;

	// Place the building
	if (activePlacement === "lightning_rod") {
		spawnLightningRod({ x: ghostPosition.x, z: ghostPosition.z, fragmentId });
	} else if (activePlacement === "fabrication_unit") {
		spawnFabricationUnit({
			x: ghostPosition.x,
			z: ghostPosition.z,
			fragmentId,
			powered: false,
		});
	}

	// Reset placement mode
	activePlacement = null;
	ghostPosition = null;
	ghostValid = false;

	return true;
}

export function cancelPlacement() {
	activePlacement = null;
	ghostPosition = null;
	ghostValid = false;
}
