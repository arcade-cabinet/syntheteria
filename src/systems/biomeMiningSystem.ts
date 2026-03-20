/**
 * Biome Mining System — strip-mine tiles for basic resources.
 *
 * This is the BACKSTOP economy: when salvage props are consumed,
 * units can mine the floor itself for foundation-tier materials.
 * Each BiomeType yields a specific material at a rate determined
 * by hardness (turns to complete) and resourceAmount (yield range).
 *
 * Flow:
 *   1. Player/AI selects "mine" on a worker adjacent to a mineable tile
 *   2. UnitMine trait is added with ticksRemaining = BiomeDef.hardness
 *   3. Each turn, biomeMiningSystem decrements ticksRemaining
 *   4. On completion: yield resources, mark tile as mined (mineable → false)
 */

import type { World } from "koota";
import { playSfx } from "../audio/sfx";
import type { RobotClass } from "../robots/types";
import { TileBiome } from "../terrain/traits";
import type { BiomeType, ResourceMaterial } from "../terrain/types";
import { BIOME_DEFS } from "../terrain/types";
import {
	Building,
	Tile,
	UnitFaction,
	UnitMine,
	UnitPos,
	UnitStats,
	UnitVisual,
	UnitXP,
} from "../traits";
import { pushTurnEvent } from "../ui/game/turnEvents";
import { awardXP, recordHarvest } from "./experienceSystem";
import { trackIncome } from "./resourceDeltaSystem";
import { addResources } from "./resourceSystem";
import { triggerHarvestSpeech } from "./speechTriggers";

/** Process one tick of all active biome mining operations. */
export function biomeMiningSystem(world: World): void {
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

		const tileBiome = findTileBiome(world, mine.targetX, mine.targetZ);
		if (!tileBiome) {
			unit.remove(UnitMine);
			continue;
		}

		const { entity: tileEntity, biome } = tileBiome;

		if (!biome.mineable || !biome.resourceMaterial) {
			unit.remove(UnitMine);
			continue;
		}

		const def = BIOME_DEFS[biome.biomeType as BiomeType];
		const [minYield, maxYield] = def.resourceAmount;
		let yieldAmount =
			minYield + Math.floor(Math.random() * (maxYield - minYield + 1));

		// Deep mining bonus: +50% yield if faction has a Motor Pool at Tier 3+
		if (factionHasBuildingAtTier(world, faction.factionId, "motor_pool", 3)) {
			yieldAmount = Math.floor(yieldAmount * 1.5);
		}

		addResources(
			world,
			faction.factionId,
			biome.resourceMaterial as ResourceMaterial,
			yieldAmount,
		);
		trackIncome(biome.resourceMaterial as ResourceMaterial, yieldAmount);

		const materialLabel = biome.resourceMaterial.replace(/_/g, " ");
		pushTurnEvent(
			`Biome mining complete: +${yieldAmount} ${materialLabel} from ${def.label}`,
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
		tileEntity.set(TileBiome, {
			...biome,
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

/** Start a biome mining operation. Returns true on success. */
export function startBiomeMining(
	world: World,
	unitEntityId: number,
	targetX: number,
	targetZ: number,
): boolean {
	let unitEntity = null;
	for (const e of world.query(UnitStats, UnitFaction, UnitPos)) {
		if (e.id() === unitEntityId) {
			unitEntity = e;
			break;
		}
	}
	if (!unitEntity) return false;

	const stats = unitEntity.get(UnitStats);
	if (!stats || stats.ap < 1) return false;

	if (unitEntity.has(UnitMine)) return false;

	const pos = unitEntity.get(UnitPos);
	if (!pos) return false;
	const dist = Math.abs(pos.tileX - targetX) + Math.abs(pos.tileZ - targetZ);
	if (dist > 1) return false;

	const tileBiome = findTileBiome(world, targetX, targetZ);
	if (!tileBiome) return false;

	const { biome } = tileBiome;
	if (!biome.mineable || !biome.resourceMaterial) return false;

	unitEntity.set(UnitStats, { ...stats, ap: stats.ap - 1 });

	unitEntity.add(
		UnitMine({
			targetX,
			targetZ,
			ticksRemaining: biome.hardness,
			totalTicks: biome.hardness,
		}),
	);

	return true;
}

interface TileBiomeData {
	biomeType: BiomeType;
	mineable: boolean;
	hardness: number;
	resourceMaterial: ResourceMaterial | null;
	resourceAmount: number;
	mined: boolean;
}

/** Find a tile entity with TileBiome at given coordinates. */
function findTileBiome(
	world: World,
	x: number,
	z: number,
): { entity: ReturnType<World["query"]>[number]; biome: TileBiomeData } | null {
	for (const e of world.query(Tile, TileBiome)) {
		const tile = e.get(Tile);
		if (tile && tile.x === x && tile.z === z) {
			const biome = e.get(TileBiome);
			if (biome) return { entity: e, biome: biome as TileBiomeData };
		}
	}
	return null;
}

function factionHasBuildingAtTier(
	world: World,
	factionId: string,
	buildingType: string,
	minTier: number,
): boolean {
	for (const e of world.query(Building)) {
		const b = e.get(Building);
		if (!b || b.factionId !== factionId) continue;
		if (b.buildingType === buildingType && (b.buildingTier ?? 1) >= minTier)
			return true;
	}
	return false;
}
