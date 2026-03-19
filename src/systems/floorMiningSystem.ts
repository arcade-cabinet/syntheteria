/**
 * Floor Mining System — strip-mine tiles for basic resources.
 *
 * This is the BACKSTOP economy: when salvage props are consumed,
 * units can mine the floor itself for foundation-tier materials.
 * Each FloorType yields a specific material at a rate determined
 * by hardness (turns to complete) and resourceAmount (yield range).
 *
 * Flow:
 *   1. Player/AI selects "mine" on a worker adjacent to a mineable tile
 *   2. UnitMine trait is added with ticksRemaining = FloorDef.hardness
 *   3. Each turn, floorMiningSystem decrements ticksRemaining
 *   4. On completion: yield resources, mark tile as mined (mineable → false)
 */

import type { World } from "koota";
import { playSfx } from "../audio/sfx";
import { pushTurnEvent } from "../ui/game/turnEvents";
import type { RobotClass } from "../robots/types";
import { TileFloor } from "../terrain/traits";
import type { ResourceMaterial } from "../terrain/types";
import { FLOOR_DEFS } from "../terrain/types";
import {
	Tile,
	UnitFaction,
	UnitMine,
	UnitPos,
	UnitStats,
	UnitVisual,
	UnitXP,
} from "../traits";
import { awardXP, recordHarvest } from "./experienceSystem";
import { isTechResearched } from "./researchSystem";
import { trackIncome } from "./resourceDeltaSystem";
import { addResources } from "./resourceSystem";
import { triggerHarvestSpeech } from "./speechTriggers";

/** Process one tick of all active floor mining operations. */
export function floorMiningSystem(world: World): void {
	for (const unit of world.query(UnitMine, UnitFaction)) {
		const mine = unit.get(UnitMine);
		if (!mine) continue;

		const remaining = mine.ticksRemaining - 1;

		if (remaining > 0) {
			unit.set(UnitMine, { ...mine, ticksRemaining: remaining });
			continue;
		}

		// Mining complete
		playSfx("harvest_complete");
		const faction = unit.get(UnitFaction);
		if (!faction) {
			unit.remove(UnitMine);
			continue;
		}

		// Find the tile entity at target coordinates
		const tileFloor = findTileFloor(world, mine.targetX, mine.targetZ);
		if (!tileFloor) {
			unit.remove(UnitMine);
			continue;
		}

		const { entity: tileEntity, floor } = tileFloor;

		if (!floor.mineable || !floor.resourceMaterial) {
			unit.remove(UnitMine);
			continue;
		}

		// Yield resources based on FloorDef range
		const def =
			FLOOR_DEFS[floor.floorType as import("../terrain/types").FloorType];
		const [minYield, maxYield] = def.resourceAmount;
		let yieldAmount =
			minYield + Math.floor(Math.random() * (maxYield - minYield + 1));

		// Deep mining tech bonus: +50% yield
		if (isTechResearched(world, faction.factionId, "deep_mining")) {
			yieldAmount = Math.floor(yieldAmount * 1.5);
		}

		addResources(
			world,
			faction.factionId,
			floor.resourceMaterial as ResourceMaterial,
			yieldAmount,
		);
		trackIncome(floor.resourceMaterial as ResourceMaterial, yieldAmount);

		const materialLabel = floor.resourceMaterial.replace(/_/g, " ");
		pushTurnEvent(
			`Floor mining complete: +${yieldAmount} ${materialLabel} from ${def.label}`,
		);

		// Trigger speech and XP
		triggerHarvestSpeech(world, unit.id(), faction.factionId);
		if (unit.has(UnitXP)) {
			recordHarvest(world, unit.id());
			const unitVisual = unit.get(UnitVisual);
			if (unitVisual?.modelId) {
				awardXP(world, unit.id(), unitVisual.modelId as RobotClass, "harvest");
			}
		}

		// Mark tile as mined — can't mine again
		tileEntity.set(TileFloor, {
			...floor,
			mineable: false,
			resourceAmount: 0,
			mined: true,
		});

		// Lower tile elevation to create visible pit (-1 = pit depth)
		const tileData = tileEntity.get(Tile);
		if (tileData && tileData.elevation >= 0) {
			tileEntity.set(Tile, {
				...tileData,
				elevation: -1 as import("../traits/tile").Elevation,
			});
		}

		unit.remove(UnitMine);
	}
}

/** Start a floor mining operation. Returns true on success. */
export function startFloorMining(
	world: World,
	unitEntityId: number,
	targetX: number,
	targetZ: number,
): boolean {
	// Find the unit
	let unitEntity = null;
	for (const e of world.query(UnitStats, UnitFaction, UnitPos)) {
		if (e.id() === unitEntityId) {
			unitEntity = e;
			break;
		}
	}
	if (!unitEntity) return false;

	// Check unit has AP
	const stats = unitEntity.get(UnitStats);
	if (!stats || stats.ap < 1) return false;

	// Check unit not already mining or harvesting
	if (unitEntity.has(UnitMine)) return false;

	// Check adjacency (Manhattan distance <= 1)
	const pos = unitEntity.get(UnitPos);
	if (!pos) return false;
	const dist = Math.abs(pos.tileX - targetX) + Math.abs(pos.tileZ - targetZ);
	if (dist > 1) return false;

	// Find the tile and check it's mineable
	const tileFloor = findTileFloor(world, targetX, targetZ);
	if (!tileFloor) return false;

	const { floor } = tileFloor;
	if (!floor.mineable || !floor.resourceMaterial) return false;

	// Deduct AP
	unitEntity.set(UnitStats, { ...stats, ap: stats.ap - 1 });

	// Add UnitMine trait
	unitEntity.add(
		UnitMine({
			targetX,
			targetZ,
			ticksRemaining: floor.hardness,
			totalTicks: floor.hardness,
		}),
	);

	return true;
}

interface TileFloorData {
	floorType: import("../terrain/types").FloorType;
	mineable: boolean;
	hardness: number;
	resourceMaterial: import("../terrain/types").ResourceMaterial | null;
	resourceAmount: number;
	mined: boolean;
}

/** Find a tile entity with TileFloor at given coordinates. */
function findTileFloor(
	world: World,
	x: number,
	z: number,
): { entity: ReturnType<World["query"]>[number]; floor: TileFloorData } | null {
	for (const e of world.query(Tile, TileFloor)) {
		const tile = e.get(Tile);
		if (tile && tile.x === x && tile.z === z) {
			const floor = e.get(TileFloor);
			if (floor) return { entity: e, floor: floor as TileFloorData };
		}
	}
	return null;
}
