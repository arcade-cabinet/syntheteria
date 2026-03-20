/**
 * AI building subsystem — automatic infrastructure construction.
 *
 * Handles both evaluator-driven build actions (computeBuildOptions) and
 * the unconditional post-GOAP infrastructure pass (runAiBuilding).
 *
 * Territory-aware placement: buildings expand toward the FRONTIER (edge of
 * controlled territory), defense turrets face enemy factions, and resource
 * buildings build toward hills/mountains.
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
	UnitFaction,
	UnitPos,
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
 *
 * Territory-aware placement strategy:
 * - Frontier tiles (edge of controlled area) for outposts and expansion
 * - Defense turrets face the nearest enemy faction
 * - Resource buildings (refineries, synthesizers) expand toward hills/mountains
 * - Core infrastructure clusters near existing buildings
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

	const existingCounts: Record<string, number> = {};
	const factionBuildingPositions: Array<{ x: number; z: number }> = [];
	for (const e of world.query(Building)) {
		const b = e.get(Building);
		if (b && b.factionId === factionId) {
			existingCounts[b.buildingType] =
				(existingCounts[b.buildingType] || 0) + 1;
			factionBuildingPositions.push({ x: b.tileX, z: b.tileZ });
		}
	}

	// Collect enemy building/unit positions for turret orientation
	const enemyPositions = collectEnemyPositions(world, factionId);

	// Compute faction centroid for frontier detection
	const allPositions = [
		...factionBuildingPositions,
		...units.map((u) => ({ x: u.tileX, z: u.tileZ })),
	];
	const factionCenter = computeCentroid(allPositions);

	// Identify frontier anchors: positions furthest from faction center
	const frontierAnchors = computeFrontierAnchors(
		factionBuildingPositions,
		units.map((u) => ({ x: u.tileX, z: u.tileZ })),
		factionCenter,
	);

	// Resource tile positions for resource-building placement
	const resourceTiles = findResourceTilesOnBoard(board);

	for (const type of AI_BUILDABLE) {
		const def = BUILDING_DEFS[type];
		const current = existingCounts[type] || 0;
		const max = MAX_PER_TYPE[type] ?? 3;
		if (current >= max) continue;
		if (!canAfford(world, factionId, def.buildCost)) continue;

		let tile: { x: number; z: number } | null = null;

		if (type === "defense_turret" && enemyPositions.length > 0) {
			// Place turrets on border facing enemy factions
			tile = findTurretPlacement(
				factionBuildingPositions,
				enemyPositions,
				board,
				occupiedTiles,
				wrapX,
			);
		} else if (
			type === "outpost" ||
			type === "relay_tower" ||
			type === "power_box"
		) {
			// Expansion buildings go to the frontier first
			tile =
				findBuildTileNear(frontierAnchors, board, occupiedTiles, wrapX) ??
				findBuildTileNear(
					factionBuildingPositions,
					board,
					occupiedTiles,
					wrapX,
				);
		} else if (type === "resource_refinery") {
			// Resource buildings expand toward hills/mountains
			tile =
				findBuildTileNear(
					resourceTiles.slice(0, 5),
					board,
					occupiedTiles,
					wrapX,
				) ??
				findBuildTileNear(
					factionBuildingPositions,
					board,
					occupiedTiles,
					wrapX,
				);
		} else {
			// Core infrastructure near existing buildings, then frontier, then units
			tile =
				findBuildTileNear(
					factionBuildingPositions,
					board,
					occupiedTiles,
					wrapX,
				) ??
				findBuildTileNear(frontierAnchors, board, occupiedTiles, wrapX) ??
				findBuildTileNear(
					units.map((u) => ({ x: u.tileX, z: u.tileZ })),
					board,
					occupiedTiles,
					wrapX,
				);
		}

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

/** Collect enemy faction building and unit positions. */
function collectEnemyPositions(
	world: World,
	myFactionId: string,
): Array<{ x: number; z: number }> {
	const positions: Array<{ x: number; z: number }> = [];
	for (const e of world.query(Building)) {
		const b = e.get(Building);
		if (b && b.factionId !== myFactionId && !isCultFactionId(b.factionId)) {
			positions.push({ x: b.tileX, z: b.tileZ });
		}
	}
	for (const e of world.query(UnitPos, UnitFaction)) {
		const f = e.get(UnitFaction);
		const p = e.get(UnitPos);
		if (
			f &&
			p &&
			f.factionId !== myFactionId &&
			!isCultFactionId(f.factionId)
		) {
			positions.push({ x: p.tileX, z: p.tileZ });
		}
	}
	return positions;
}

function computeCentroid(
	positions: Array<{ x: number; z: number }>,
): { x: number; z: number } {
	if (positions.length === 0) return { x: 0, z: 0 };
	let sx = 0;
	let sz = 0;
	for (const p of positions) {
		sx += p.x;
		sz += p.z;
	}
	return {
		x: Math.round(sx / positions.length),
		z: Math.round(sz / positions.length),
	};
}

/**
 * Frontier anchors: positions at the outer edge of controlled territory.
 * Sorted by distance from center (furthest first) for outward expansion.
 */
function computeFrontierAnchors(
	buildings: Array<{ x: number; z: number }>,
	unitPositions: Array<{ x: number; z: number }>,
	center: { x: number; z: number },
): Array<{ x: number; z: number }> {
	const all = [...buildings, ...unitPositions];
	if (all.length === 0) return [];

	const withDist = all.map((p) => ({
		...p,
		dist: Math.abs(p.x - center.x) + Math.abs(p.z - center.z),
	}));
	withDist.sort((a, b) => b.dist - a.dist);

	// Top 30% are "frontier" — at minimum 2 anchors
	const frontierCount = Math.max(2, Math.ceil(withDist.length * 0.3));
	return withDist.slice(0, frontierCount);
}

/** Find turret placement between faction buildings and enemy positions. */
function findTurretPlacement(
	factionPositions: Array<{ x: number; z: number }>,
	enemyPositions: Array<{ x: number; z: number }>,
	board: GeneratedBoard,
	occupied: Set<string>,
	wrapX: boolean,
): { x: number; z: number } | null {
	if (factionPositions.length === 0 || enemyPositions.length === 0) return null;

	const fCenter = computeCentroid(factionPositions);
	const eCenter = computeCentroid(enemyPositions);

	// Place turret in the direction of enemies, 2-4 tiles from faction border
	const dx = eCenter.x - fCenter.x;
	const dz = eCenter.z - fCenter.z;
	const len = Math.sqrt(dx * dx + dz * dz) || 1;
	const ndx = dx / len;
	const ndz = dz / len;

	// Try a few distances to find a valid tile
	for (let dist = 3; dist <= 8; dist++) {
		const tx = Math.round(fCenter.x + ndx * dist);
		const tz = Math.round(fCenter.z + ndz * dist);
		const tile = findBuildTileNear([{ x: tx, z: tz }], board, occupied, wrapX);
		if (tile) return tile;
	}

	return findBuildTileNear(factionPositions, board, occupied, wrapX);
}

/** Find resource-rich tiles (hills, mountains adj) on the board. */
function findResourceTilesOnBoard(
	board: GeneratedBoard,
): Array<{ x: number; z: number }> {
	const results: Array<{ x: number; z: number }> = [];
	const { width, height } = board.config;
	for (let z = 0; z < height; z++) {
		for (let x = 0; x < width; x++) {
			const tile = board.tiles[z]?.[x];
			if (!tile || !tile.passable) continue;
			if (tile.biomeType === "hills" || tile.biomeType === "forest") {
				results.push({ x, z });
			}
		}
	}
	return results;
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
 * Placement is territory-aware: expands toward the frontier.
 */
export function runAiBuilding(
	world: World,
	factionIds: string[],
	board: GeneratedBoard,
): void {
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

		const lastTurn = _lastBuildTurn.get(factionId) ?? 0;
		if (currentTurn - lastTurn < 2 && currentTurn > 1) continue;

		const existing: Record<string, number> = {};
		const buildingPositions: Array<{ x: number; z: number }> = [];
		for (const e of world.query(Building)) {
			const b = e.get(Building);
			if (b && b.factionId === factionId) {
				existing[b.buildingType] = (existing[b.buildingType] ?? 0) + 1;
				buildingPositions.push({ x: b.tileX, z: b.tileZ });
			}
		}

		// Collect unit positions for frontier computation
		const unitPositions: Array<{ x: number; z: number }> = [];
		for (const e of world.query(UnitPos, UnitFaction)) {
			const f = e.get(UnitFaction);
			const p = e.get(UnitPos);
			if (f && p && f.factionId === factionId) {
				unitPositions.push({ x: p.tileX, z: p.tileZ });
			}
		}

		const occupiedTiles = new Set<string>();
		for (const e of world.query(Building)) {
			const b = e.get(Building);
			if (b) occupiedTiles.add(`${b.tileX},${b.tileZ}`);
		}

		const allPositions = [...buildingPositions, ...unitPositions];
		const center = computeCentroid(allPositions);
		const frontierAnchors = computeFrontierAnchors(
			buildingPositions,
			unitPositions,
			center,
		);
		const enemyPositions = collectEnemyPositions(world, factionId);

		const priority = dynamicAiBuildOrder(existing);

		for (const type of priority) {
			const def = BUILDING_DEFS[type as BuildingType];
			if (!def) continue;

			const current = existing[type] ?? 0;
			const max = MAX_PER_TYPE[type] ?? 3;
			if (current >= max) continue;
			if (!canAfford(world, factionId, def.buildCost)) continue;

			let tile: { x: number; z: number } | null = null;

			if (type === "defense_turret" && enemyPositions.length > 0) {
				tile = findTurretPlacement(
					buildingPositions,
					enemyPositions,
					board,
					occupiedTiles,
					false,
				);
			} else if (type === "outpost" || type === "relay_tower") {
				tile =
					findBuildTileNear(frontierAnchors, board, occupiedTiles, false) ??
					findBuildTileNear(buildingPositions, board, occupiedTiles, false);
			} else {
				tile = findBuildTileNear(
					buildingPositions,
					board,
					occupiedTiles,
					false,
				);
			}

			if (!tile) continue;

			executeAiBuild(world, factionId, type as BuildingType, tile.x, tile.z);
			_lastBuildTurn.set(factionId, currentTurn);
			break;
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
