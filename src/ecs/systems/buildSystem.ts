/**
 * Building placement system — enter placement mode from radial menu,
 * then confirm or cancel on next tile click.
 *
 * Flow:
 *   1. Player selects BUILD category in radial menu
 *   2. Player picks a building type from the outer ring
 *   3. onExecute calls startBuildPlacement(world, buildingType)
 *   4. BoardInput detects placement mode, shows yellow highlight on hover
 *   5. Player clicks a tile → confirmBuildPlacement(world, tileX, tileZ)
 *   6. Building entity spawned, resources deducted, mode exits
 */

import type { World } from "koota";
import { playSfx } from "../../audio/sfx";
import { BUILDING_DEFS } from "../buildings/definitions";
import type { ResourceMaterial } from "../terrain/types";
import type { BuildingType } from "../traits/building";
import {
	BotFabricator,
	Building,
	PowerGrid,
	SignalNode,
	StorageCapacity,
	TurretStats,
} from "../traits/building";
import { canAfford, spendResources } from "./resourceSystem";
import {
	canStartWormholeProject,
	isValidWormholePlacement,
	onWormholeStabilizerPlaced,
} from "./wormholeProject";

// ─── Module state ────────────────────────────────────────────────────────────

let pendingBuildType: BuildingType | null = null;

// ─── Public API ──────────────────────────────────────────────────────────────

/** Enter placement mode for a building type. */
export function startBuildPlacement(
	_world: World,
	buildingType: BuildingType,
): void {
	pendingBuildType = buildingType;
}

/** Get the current pending build type (null = not in placement mode). */
export function getPendingBuildType(): BuildingType | null {
	return pendingBuildType;
}

/** True when the player is choosing where to place a building. */
export function isInBuildPlacementMode(): boolean {
	return pendingBuildType !== null;
}

/** Exit placement mode without placing anything. */
export function cancelBuildPlacement(): void {
	pendingBuildType = null;
}

/**
 * Attempt to place the pending building at (tileX, tileZ).
 *
 * Returns true if the building was placed, false if blocked
 * (impassable tile, occupied, can't afford).
 */
export function confirmBuildPlacement(
	world: World,
	tileX: number,
	tileZ: number,
	board: { tiles: Array<Array<{ passable: boolean }>> },
): boolean {
	if (pendingBuildType === null) return false;

	const def = BUILDING_DEFS[pendingBuildType];

	// Check tile passability
	const tile = board.tiles[tileZ]?.[tileX];
	if (!tile || !tile.passable) {
		return false;
	}

	// Check not occupied by another building
	for (const e of world.query(Building)) {
		const b = e.get(Building);
		if (b && b.tileX === tileX && b.tileZ === tileZ) {
			return false;
		}
	}

	// Wormhole stabilizer: center-only placement + tech prerequisites
	if (pendingBuildType === "wormhole_stabilizer") {
		if (!canStartWormholeProject(world, "player")) return false;
		if (!isValidWormholePlacement(world, tileX, tileZ)) return false;
	}

	// Check affordability
	if (!canAfford(world, "player", def.buildCost)) {
		return false;
	}

	// Deduct resources
	for (const [mat, amount] of Object.entries(def.buildCost)) {
		if (amount && amount > 0) {
			spendResources(world, "player", mat as ResourceMaterial, amount);
		}
	}

	// Spawn building entity
	const entity = world.spawn(
		Building({
			tileX,
			tileZ,
			buildingType: pendingBuildType,
			modelId: def.modelId,
			factionId: "player",
			hp: def.hp,
			maxHp: def.hp,
		}),
	);

	// Attach sub-traits based on definition values
	if (def.powerDelta !== 0 || def.powerRadius > 0) {
		entity.add(
			PowerGrid({
				powerDelta: def.powerDelta,
				storageCapacity: def.storageCapacity,
				currentCharge: 0,
				powerRadius: def.powerRadius,
			}),
		);
	}

	if (def.storageCapacity > 0 && def.powerDelta === 0) {
		entity.add(
			StorageCapacity({
				capacity: def.storageCapacity,
			}),
		);
	}

	if (def.signalRange > 0) {
		entity.add(
			SignalNode({
				range: def.signalRange,
				strength: def.signalStrength,
			}),
		);
	}

	if (def.turretDamage > 0) {
		entity.add(
			TurretStats({
				attackDamage: def.turretDamage,
				attackRange: def.turretRange,
				cooldownTurns: def.turretCooldown,
				currentCooldown: 0,
			}),
		);
	}

	if (def.fabricationSlots > 0) {
		entity.add(
			BotFabricator({
				fabricationSlots: def.fabricationSlots,
				queueSize: 0,
			}),
		);
	}

	// Start wormhole project if applicable
	if (pendingBuildType === "wormhole_stabilizer") {
		onWormholeStabilizerPlaced(world, entity.id(), "player");
	}

	// Exit placement mode
	pendingBuildType = null;

	playSfx("build_complete");

	return true;
}

/** Reset all state. For test cleanup. */
export function _resetBuildSystem(): void {
	pendingBuildType = null;
}
