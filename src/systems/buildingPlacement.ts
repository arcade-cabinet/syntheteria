import { isInsideBuilding } from "../ecs/cityLayout";
import {
	spawnFabricationUnit,
	spawnLightningRod,
	spawnBuilding,
} from "../ecs/factory";
import { startBuildingConstruction } from "./constructionVisualization";
import {
	Building,
	Identity,
	MapFragment,
	Unit,
	WorldPosition,
} from "../ecs/traits";
import { buildings, lightningRods, units } from "../ecs/world";
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
 * - Only Fabricator-role bots (mecha_golem) can place buildings
 *
 * Adjacency bonuses:
 * - Complementary buildings placed within ADJACENCY_RADIUS grant bonuses
 * - Bonuses are computed at placement time and stored on the building
 */

export type PlaceableType =
	| "lightning_rod"
	| "fabrication_unit"
	| "motor_pool"
	| "relay_tower"
	| "defense_turret"
	| "power_sink"
	| "storage_hub"
	| "habitat_module"
	| null;

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
	motor_pool: [
		{ type: "ferrousScrap", amount: 15 },
		{ type: "alloyStock", amount: 8 },
		{ type: "siliconWafer", amount: 4 },
	],
	relay_tower: [
		{ type: "conductorWire", amount: 6 },
		{ type: "alloyStock", amount: 4 },
	],
	defense_turret: [
		{ type: "ferrousScrap", amount: 10 },
		{ type: "conductorWire", amount: 4 },
	],
	power_sink: [
		{ type: "ferrousScrap", amount: 8 },
		{ type: "electrolyte", amount: 6 },
	],
	storage_hub: [
		{ type: "alloyStock", amount: 8 },
		{ type: "polymerSalvage", amount: 4 },
	],
	habitat_module: [
		{ type: "ferrousScrap", amount: 12 },
		{ type: "polymerSalvage", amount: 6 },
		{ type: "alloyStock", amount: 4 },
	],
};

/** Minimum distance between lightning rods */
const MIN_ROD_SPACING = 10;

/** Minimum distance between any two buildings */
const MIN_BUILDING_SPACING = 3;

// ---------------------------------------------------------------------------
// Adjacency bonus system
// ---------------------------------------------------------------------------

/** Radius within which adjacent buildings provide bonuses */
export const ADJACENCY_RADIUS = 8;

export interface AdjacencyBonus {
	/** The building type providing the bonus */
	sourceType: string;
	/** Label shown to the player */
	label: string;
	/** Multiplicative bonus factor (e.g. 0.15 = +15%) */
	factor: number;
}

/**
 * Adjacency rules: which building types benefit from which neighbors.
 * Key = placed building type, value = map of neighbor type -> bonus.
 */
export const ADJACENCY_RULES: Record<string, Record<string, AdjacencyBonus>> = {
	motor_pool: {
		fabrication_unit: {
			sourceType: "fabrication_unit",
			label: "Fabrication Support",
			factor: 0.2,
		},
		power_sink: {
			sourceType: "power_sink",
			label: "Power Feed",
			factor: 0.15,
		},
		storage_hub: {
			sourceType: "storage_hub",
			label: "Material Access",
			factor: 0.1,
		},
	},
	fabrication_unit: {
		power_sink: {
			sourceType: "power_sink",
			label: "Power Feed",
			factor: 0.2,
		},
		storage_hub: {
			sourceType: "storage_hub",
			label: "Material Access",
			factor: 0.15,
		},
	},
	defense_turret: {
		relay_tower: {
			sourceType: "relay_tower",
			label: "Target Relay",
			factor: 0.2,
		},
		power_sink: {
			sourceType: "power_sink",
			label: "Power Feed",
			factor: 0.15,
		},
	},
	relay_tower: {
		power_sink: {
			sourceType: "power_sink",
			label: "Power Feed",
			factor: 0.15,
		},
		relay_tower: {
			sourceType: "relay_tower",
			label: "Signal Chain",
			factor: 0.25,
		},
	},
	power_sink: {
		lightning_rod: {
			sourceType: "lightning_rod",
			label: "Storm Capture",
			factor: 0.3,
		},
	},
	storage_hub: {
		fabrication_unit: {
			sourceType: "fabrication_unit",
			label: "Production Link",
			factor: 0.15,
		},
		motor_pool: {
			sourceType: "motor_pool",
			label: "Assembly Link",
			factor: 0.1,
		},
	},
	habitat_module: {
		power_sink: {
			sourceType: "power_sink",
			label: "Power Feed",
			factor: 0.15,
		},
		storage_hub: {
			sourceType: "storage_hub",
			label: "Supply Access",
			factor: 0.1,
		},
	},
};

/**
 * Compute adjacency bonuses for a building at (x, z).
 * Checks all existing buildings within ADJACENCY_RADIUS.
 */
export function computeAdjacencyBonuses(
	buildingType: string,
	x: number,
	z: number,
): AdjacencyBonus[] {
	const rules = ADJACENCY_RULES[buildingType];
	if (!rules) return [];

	const bonuses: AdjacencyBonus[] = [];
	const seen = new Set<string>();

	for (const building of buildings) {
		const bComp = building.get(Building);
		const pos = building.get(WorldPosition);
		if (!bComp || !pos) continue;

		const rule = rules[bComp.type];
		if (!rule) continue;
		if (seen.has(bComp.type)) continue;

		const dx = pos.x - x;
		const dz = pos.z - z;
		if (Math.sqrt(dx * dx + dz * dz) <= ADJACENCY_RADIUS) {
			bonuses.push(rule);
			seen.add(bComp.type);
		}
	}

	return bonuses;
}

/**
 * Compute total adjacency multiplier (1.0 = no bonus).
 */
export function computeAdjacencyMultiplier(
	buildingType: string,
	x: number,
	z: number,
): number {
	const bonuses = computeAdjacencyBonuses(buildingType, x, z);
	return 1 + bonuses.reduce((sum, b) => sum + b.factor, 0);
}

// ---------------------------------------------------------------------------
// Fabricator role check
// ---------------------------------------------------------------------------

/** Bot types allowed to place buildings */
const FABRICATOR_UNIT_TYPES = new Set([
	"mecha_golem",
	"fabrication_unit",
]);

/**
 * Check if the selected unit (by entity ID) is allowed to place buildings.
 * Returns true if the unit is a Fabricator-role bot, or if no unit is
 * specified (e.g. building from empty sector context).
 */
export function canUnitBuild(unitEntityId: string | null): boolean {
	if (!unitEntityId) return false;
	for (const unit of units) {
		if (unit.get(Identity)?.id === unitEntityId) {
			const unitComp = unit.get(Unit);
			if (!unitComp) return false;
			return FABRICATOR_UNIT_TYPES.has(unitComp.type);
		}
	}
	return false;
}

// ---------------------------------------------------------------------------
// Placement state machine
// ---------------------------------------------------------------------------

let activePlacement: PlaceableType = null;
let ghostPosition: { x: number; z: number } | null = null;
let ghostValid = false;
let builderEntityId: string | null = null;

export function getActivePlacement(): PlaceableType {
	return activePlacement;
}

export function setActivePlacement(type: PlaceableType, unitId?: string) {
	activePlacement = type;
	ghostPosition = null;
	ghostValid = false;
	builderEntityId = unitId ?? null;
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

	// Lightning rods need spacing from other rods
	if (type === "lightning_rod") {
		for (const rod of lightningRods) {
			const rodPos = rod.get(WorldPosition);
			if (!rodPos) continue;
			const dx = rodPos.x - x;
			const dz = rodPos.z - z;
			if (Math.sqrt(dx * dx + dz * dz) < MIN_ROD_SPACING) return false;
		}
	}

	// All buildings need minimum spacing from other buildings
	for (const building of buildings) {
		const pos = building.get(WorldPosition);
		if (!pos) continue;
		const dx = pos.x - x;
		const dz = pos.z - z;
		if (Math.sqrt(dx * dx + dz * dz) < MIN_BUILDING_SPACING) return false;
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
	let placedEntity;
	if (activePlacement === "lightning_rod") {
		placedEntity = spawnLightningRod({ x: ghostPosition.x, z: ghostPosition.z, fragmentId });
	} else if (activePlacement === "fabrication_unit") {
		placedEntity = spawnFabricationUnit({
			x: ghostPosition.x,
			z: ghostPosition.z,
			fragmentId,
			powered: false,
		});
	} else {
		placedEntity = spawnBuilding({
			x: ghostPosition.x,
			z: ghostPosition.z,
			fragmentId,
			type: activePlacement,
			powered: false,
		});
	}

	// Start staged construction visualization (instant buildings skip automatically)
	const placedId = placedEntity.get(Identity)?.id;
	if (placedId) {
		startBuildingConstruction(placedId, activePlacement);
	}

	// Reset placement mode
	activePlacement = null;
	ghostPosition = null;
	ghostValid = false;
	builderEntityId = null;

	return true;
}

export function cancelPlacement() {
	activePlacement = null;
	ghostPosition = null;
	ghostValid = false;
	builderEntityId = null;
}

export function getBuilderEntityId(): string | null {
	return builderEntityId;
}

export function _reset() {
	activePlacement = null;
	ghostPosition = null;
	ghostValid = false;
	builderEntityId = null;
}
