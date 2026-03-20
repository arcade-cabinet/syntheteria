/**
 * AI building subsystem — automatic infrastructure construction.
 *
 * Handles both evaluator-driven build actions (computeBuildOptions) and
 * the unconditional post-GOAP infrastructure pass (runAiBuilding).
 */

import type { World } from "koota";
import { playSfx } from "../audio";
import type { GeneratedBoard } from "../board";
import { BUILDING_DEFS } from "../config/buildings";
import { canAfford, spendResources } from "../systems";
import type { ResourceMaterial } from "../terrain";
import {
	Board,
	BotFabricator,
	Building,
	type BuildingType,
	PowerGrid,
	StorageCapacity,
} from "../traits";
import type { AgentSnapshot } from "./agents/SyntheteriaAgent";
import { getFactionBuildings, isCultFactionId } from "./aiHelpers";
import type { BuildOption } from "./goals/evaluators";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Building types the AI is allowed to construct (excludes wormhole_stabilizer). */
export const AI_BUILDABLE: BuildingType[] = [
	"storm_transmitter",
	"motor_pool",
	"synthesizer",
	"analysis_node",
	"outpost",
	"storage_hub",
	"defense_turret",
	"relay_tower",
	"power_box",
	"resource_refinery",
];

/** Max allowed per building type -- prevents duplicate spam. */
const MAX_PER_TYPE: Record<string, number> = {
	storm_transmitter: 2,
	motor_pool: 3,
	synthesizer: 2,
	analysis_node: 1,
	outpost: 5,
	storage_hub: 2,
	defense_turret: 4,
	relay_tower: 2,
	power_box: 3,
	resource_refinery: 2,
};

// ---------------------------------------------------------------------------
// Build option computation (for evaluator-driven build decisions)
// ---------------------------------------------------------------------------

/**
 * Compute which buildings the AI can afford and where to place them.
 * Searches near existing faction buildings first (infrastructure cluster),
 * then falls back to near units.
 */
export function computeBuildOptions(
	world: World,
	factionId: string,
	units: AgentSnapshot[],
	board: GeneratedBoard,
	occupiedTiles: Set<string>,
	wrapX = false,
): BuildOption[] {
	const options: BuildOption[] = [];

	// Count existing buildings per type for this faction
	const existingCounts: Record<string, number> = {};
	for (const e of world.query(Building)) {
		const b = e.get(Building);
		if (b && b.factionId === factionId) {
			existingCounts[b.buildingType] =
				(existingCounts[b.buildingType] || 0) + 1;
		}
	}

	// Collect faction building positions for placement search
	const factionBuildingPositions: Array<{ x: number; z: number }> = [];
	for (const e of world.query(Building)) {
		const b = e.get(Building);
		if (b && b.factionId === factionId) {
			factionBuildingPositions.push({ x: b.tileX, z: b.tileZ });
		}
	}

	for (const type of AI_BUILDABLE) {
		const def = BUILDING_DEFS[type];
		// Skip if already at max count for this type
		const current = existingCounts[type] || 0;
		const max = MAX_PER_TYPE[type] ?? 3;
		if (current >= max) continue;
		if (!canAfford(world, factionId, def.buildCost)) continue;

		// Search near existing buildings first, then near units
		const tile =
			findBuildTileNear(
				factionBuildingPositions,
				board,
				occupiedTiles,
				wrapX,
			) ??
			findBuildTileNear(
				units.map((u) => ({ x: u.tileX, z: u.tileZ })),
				board,
				occupiedTiles,
				wrapX,
			);
		if (tile) {
			options.push({
				buildingType: type,
				tileX: tile.x,
				tileZ: tile.z,
			});
		}
	}

	return options;
}

// ---------------------------------------------------------------------------
// Tile search
// ---------------------------------------------------------------------------

/** Find a passable, unoccupied tile near any of the given anchor positions. */
export function findBuildTileNear(
	anchors: Array<{ x: number; z: number }>,
	board: GeneratedBoard,
	occupied: Set<string>,
	wrapX = false,
): { x: number; z: number } | null {
	const { width, height } = board.config;

	for (const anchor of anchors) {
		// Search in expanding radius -- up to 12 tiles out (matches transmitter
		// powerRadius) to handle tight labyrinth corridors where nearby tiles
		// are occupied by starter buildings/units
		for (let r = 1; r <= 12; r++) {
			for (let dx = -r; dx <= r; dx++) {
				for (let dz = -r; dz <= r; dz++) {
					let x = anchor.x + dx;
					const z = anchor.z + dz;
					if (wrapX) x = ((x % width) + width) % width;
					if (x < 0 || z < 0 || x >= width || z >= height) continue;
					const key = `${x},${z}`;
					if (occupied.has(key)) continue;
					const tile = board.tiles[z]?.[x];
					if (tile?.passable) return { x, z };
				}
			}
		}
	}
	return null;
}

// ---------------------------------------------------------------------------
// Execute a build action
// ---------------------------------------------------------------------------

/** Execute an AI build action -- spawn building, deduct resources. */
export function executeAiBuild(
	world: World,
	factionId: string,
	buildingType: BuildingType,
	tileX: number,
	tileZ: number,
): void {
	const def = BUILDING_DEFS[buildingType];

	// Double-check affordability (resources may have changed)
	if (!canAfford(world, factionId, def.buildCost)) return;

	// Deduct resources
	for (const [mat, amount] of Object.entries(def.buildCost)) {
		if (amount && amount > 0) {
			spendResources(world, factionId, mat as ResourceMaterial, amount);
		}
	}

	// Spawn building entity
	const entity = world.spawn(
		Building({
			tileX,
			tileZ,
			buildingType,
			modelId: def.modelId,
			factionId,
			hp: def.hp,
			maxHp: def.hp,
		}),
	);

	// Attach power grid if relevant
	if (
		def.powerDelta !== 0 ||
		def.powerRadius > 0 ||
		buildingType === "power_box"
	) {
		entity.add(
			PowerGrid({
				powerDelta: def.powerDelta,
				storageCapacity: def.storageCapacity,
				currentCharge: 0,
				powerRadius: def.powerRadius,
			}),
		);
	}

	// Attach storage if relevant
	if (def.storageCapacity > 0 && def.powerDelta === 0) {
		entity.add(StorageCapacity({ capacity: def.storageCapacity }));
	}

	// Attach fabricator if relevant
	if (def.fabricationSlots > 0) {
		entity.add(
			BotFabricator({
				fabricationSlots: def.fabricationSlots,
				queueSize: 0,
			}),
		);
	}

	playSfx("build_complete");
}

// ---------------------------------------------------------------------------
// Automatic infrastructure pass (runs after GOAP each turn)
// ---------------------------------------------------------------------------

/** Track last build turn per faction to space out construction. */
export const _lastBuildTurn = new Map<string, number>();

/**
 * Infrastructure priority for automatic building.
 * Unlike the evaluator-driven Build (which competes with harvest/scout/etc),
 * this runs unconditionally after GOAP -- one building per faction per turn
 * if affordable and below cap.
 *
 * Priority is dynamic: missing critical buildings come first.
 */
export function runAiBuilding(
	world: World,
	factionIds: string[],
	board: GeneratedBoard,
): void {
	// Read current turn
	let currentTurn = 1;
	for (const e of world.query(Board)) {
		const b = e.get(Board);
		if (b) {
			currentTurn = b.turn;
			break;
		}
	}

	for (const factionId of factionIds) {
		if (factionId === "player") continue;
		if (isCultFactionId(factionId)) continue;

		// Space out building: one building every 2 turns to balance growth with income
		const lastTurn = _lastBuildTurn.get(factionId) ?? 0;
		if (currentTurn - lastTurn < 2 && currentTurn > 1) continue;

		// Count existing buildings per type
		const existing: Record<string, number> = {};
		const buildingPositions: Array<{ x: number; z: number }> = [];
		for (const e of world.query(Building)) {
			const b = e.get(Building);
			if (b && b.factionId === factionId) {
				existing[b.buildingType] = (existing[b.buildingType] ?? 0) + 1;
				buildingPositions.push({ x: b.tileX, z: b.tileZ });
			}
		}

		// Build the occupied set
		const occupiedTiles = new Set<string>();
		for (const e of world.query(Building)) {
			const b = e.get(Building);
			if (b) occupiedTiles.add(`${b.tileX},${b.tileZ}`);
		}

		// Dynamic priority: missing critical buildings first
		const priority = dynamicAiBuildOrder(existing);

		for (const type of priority) {
			const def = BUILDING_DEFS[type as BuildingType];
			if (!def) continue;

			const current = existing[type] ?? 0;
			const max = MAX_PER_TYPE[type] ?? 3;
			if (current >= max) continue;
			if (!canAfford(world, factionId, def.buildCost)) continue;

			// Find placement tile near existing buildings
			const tile = findBuildTileNear(
				buildingPositions,
				board,
				occupiedTiles,
				false,
			);
			if (!tile) continue;

			executeAiBuild(world, factionId, type as BuildingType, tile.x, tile.z);
			_lastBuildTurn.set(factionId, currentTurn);
			break; // One building per faction per turn
		}
	}
}

/**
 * Dynamic build order based on what the faction is missing.
 * Critical gaps jump to the front; then growth buildings cycle.
 */
export function dynamicAiBuildOrder(
	existing: Record<string, number>,
): string[] {
	const order: string[] = [];

	// Critical infrastructure gaps -- these unlock the economy chain
	if ((existing["synthesizer"] ?? 0) === 0) order.push("synthesizer");
	if ((existing["motor_pool"] ?? 0) === 0) order.push("motor_pool");
	if ((existing["storm_transmitter"] ?? 0) === 0)
		order.push("storm_transmitter");

	// Power box early — needed for buildings outside transmitter radius
	if ((existing["power_box"] ?? 0) === 0) order.push("power_box");

	if ((existing["analysis_node"] ?? 0) === 0) order.push("analysis_node");

	// Second motor pool for throughput
	if ((existing["motor_pool"] ?? 0) < 2) order.push("motor_pool");

	// Resource refinery = renewable iron_ore income (+2/turn)
	if ((existing["resource_refinery"] ?? 0) === 0)
		order.push("resource_refinery");

	// Growth cycle
	order.push(
		"outpost",
		"defense_turret",
		"power_box",
		"motor_pool",
		"synthesizer",
		"outpost",
		"storage_hub",
		"storm_transmitter",
		"relay_tower",
		"resource_refinery",
		"outpost",
		"defense_turret",
	);

	return order;
}
