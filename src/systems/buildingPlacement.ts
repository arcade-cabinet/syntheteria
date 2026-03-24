/**
 * Building placement state machine.
 *
 * Player selects a building type from the toolbar, then taps/clicks
 * on the ground to place it. Ghost preview shows valid/invalid position.
 *
 * Placement rules:
 * - Must be on walkable terrain (not water, not inside existing buildings)
 * - Must have enough resources
 * - Some buildings require minimum spacing from others of the same type
 */

import { playSfx } from "../audio";
import {
	BUILDING_DEFS,
	BUILDING_TYPES,
	type BuildingType,
} from "../config/buildingDefs";
import { isInsideBuilding } from "../ecs/cityLayout";
import { spawnBuilding } from "../ecs/factory";
import { isWalkable } from "../ecs/terrain";
import {
	BuildingTrait,
	Faction,
	Fragment,
	Position,
	Unit,
} from "../ecs/traits";
import { world } from "../ecs/world";
import { buildNavGraph } from "./navmesh";
import { getResources, spendResource } from "./resources";

export type PlaceableType = BuildingType | null;

/** Re-export for convenience — costs live in BUILDING_DEFS now */
export function getBuildingCost(type: string) {
	return BUILDING_DEFS[type]?.costs ?? [];
}

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

export function getPlaceableTypes(): BuildingType[] {
	return BUILDING_TYPES;
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
	ghostValid = activePlacement
		? isValidPlacement(x, z, activePlacement)
		: false;
}

function isValidPlacement(x: number, z: number, type: BuildingType): boolean {
	if (!isWalkable(x, z)) return false;
	if (isInsideBuilding(x, z)) return false;

	const def = BUILDING_DEFS[type];
	if (!def) return false;

	// Enforce minimum spacing from same building type
	if (def.minSpacing > 0) {
		for (const building of world.query(BuildingTrait, Position)) {
			if (building.get(BuildingTrait)?.buildingType !== type) continue;
			const bPos = building.get(Position)!;
			const dx = bPos.x - x;
			const dz = bPos.z - z;
			if (Math.sqrt(dx * dx + dz * dz) < def.minSpacing) return false;
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

	const def = BUILDING_DEFS[activePlacement];
	if (!def) return false;

	// Check all costs can be paid before spending
	const pool = getResources();
	for (const cost of def.costs) {
		if (pool[cost.type] < cost.amount) return false;
	}

	// Spend resources
	for (const cost of def.costs) {
		if (!spendResource(cost.type, cost.amount)) return false;
	}

	// Find a fragment to attach to (use first player unit's fragment)
	let fragmentId: string | null = null;
	for (const entity of world.query(Unit, Faction, Fragment)) {
		if (entity.get(Faction)?.value === "player") {
			fragmentId = entity.get(Fragment)?.fragmentId ?? null;
			break;
		}
	}
	if (!fragmentId) return false;

	// Place the building using the generic spawn function
	spawnBuilding({
		x: ghostPosition.x,
		z: ghostPosition.z,
		fragmentId,
		buildingType: activePlacement,
		powered: def.startsPowered,
	});

	// Rebuild navmesh to account for new building
	buildNavGraph();
	playSfx("build_complete");

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
