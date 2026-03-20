/**
 * Score calculation for the turn-cap victory condition.
 *
 * Score = territory × 2 + network coverage × 3 + roboform tiles × 2 +
 *         active units × 1 + buildings × 2 + building tier sum × 5 +
 *         cult POIs destroyed × 10
 */

import type { World } from "koota";
import {
	TERRITORY_BUILDING_RADIUS,
	TERRITORY_UNIT_RADIUS,
} from "../config/gameDefaults";
import { Building, Powered, SignalNode, UnitFaction, UnitPos } from "../traits";

// ─── Per-faction destroyed cult structure tracking ──────────────────────────

const destroyedCultStructures = new Map<string, number>();

/** Record a cult structure destruction for scoring. */
export function recordCultStructureDestroyed(factionId: string): void {
	destroyedCultStructures.set(
		factionId,
		(destroyedCultStructures.get(factionId) ?? 0) + 1,
	);
}

/** Get count of cult structures destroyed by a faction. */
export function getCultStructuresDestroyed(factionId: string): number {
	return destroyedCultStructures.get(factionId) ?? 0;
}

/** Reset — for tests. */
export function _resetScoreSystem(): void {
	destroyedCultStructures.clear();
}

// ─── Weights ────────────────────────────────────────────────────────────────

const WEIGHT_TERRITORY = 2;
const WEIGHT_NETWORK = 3;
const WEIGHT_ROBOFORM = 2;
const WEIGHT_UNITS = 1;
const WEIGHT_BUILDINGS = 2;
const WEIGHT_BUILDING_TIERS = 5;
const WEIGHT_CULT_DESTROYED = 10;

// ─── Score Calculation ──────────────────────────────────────────────────────

/**
 * Calculate the weighted faction score for turn-cap victory.
 *
 * Score components: territory (×2), signal coverage (×3), roboform tiles (×2),
 * active units (×1), buildings (×2), building tier sum (×5), cult POIs destroyed (×10).
 *
 * @param world - ECS world.
 * @param factionId - Faction to score.
 * @returns Total weighted score.
 */
export function calculateFactionScore(world: World, factionId: string): number {
	const territory = countTerritoryTiles(world, factionId);
	const units = countActiveUnits(world, factionId);
	const buildings = countActiveBuildings(world, factionId);
	const buildingTierSum = countBuildingTierSum(world, factionId);
	const roboform = countRoboformedTiles(world, factionId);
	const cultDestroyed = getCultStructuresDestroyed(factionId);

	// Network coverage: count tiles covered by this faction's signal nodes
	const networkCoverage = countSignalCoveredTiles(world, factionId);

	return (
		territory * WEIGHT_TERRITORY +
		networkCoverage * WEIGHT_NETWORK +
		roboform * WEIGHT_ROBOFORM +
		units * WEIGHT_UNITS +
		buildings * WEIGHT_BUILDINGS +
		buildingTierSum * WEIGHT_BUILDING_TIERS +
		cultDestroyed * WEIGHT_CULT_DESTROYED
	);
}

// ─── Component Counters ─────────────────────────────────────────────────────

function countTerritoryTiles(world: World, factionId: string): number {
	const claimed = new Set<string>();

	for (const e of world.query(UnitPos, UnitFaction)) {
		const pos = e.get(UnitPos);
		const fac = e.get(UnitFaction);
		if (!pos || !fac || fac.factionId !== factionId) continue;
		addClaimTiles(claimed, pos.tileX, pos.tileZ, TERRITORY_UNIT_RADIUS);
	}
	for (const e of world.query(Building)) {
		const b = e.get(Building);
		if (!b || b.factionId !== factionId || b.hp <= 0) continue;
		addClaimTiles(claimed, b.tileX, b.tileZ, TERRITORY_BUILDING_RADIUS);
	}
	return claimed.size;
}

function addClaimTiles(
	set: Set<string>,
	cx: number,
	cz: number,
	radius: number,
): void {
	for (let dz = -radius; dz <= radius; dz++) {
		for (let dx = -radius; dx <= radius; dx++) {
			if (Math.abs(dx) + Math.abs(dz) > radius) continue;
			set.add(`${cx + dx},${cz + dz}`);
		}
	}
}

function countActiveUnits(world: World, factionId: string): number {
	let count = 0;
	for (const e of world.query(UnitFaction)) {
		const f = e.get(UnitFaction);
		if (f?.factionId === factionId) count++;
	}
	return count;
}

function countActiveBuildings(world: World, factionId: string): number {
	let count = 0;
	for (const e of world.query(Building)) {
		const b = e.get(Building);
		if (b?.factionId === factionId && b.hp > 0) count++;
	}
	return count;
}

function countBuildingTierSum(world: World, factionId: string): number {
	let sum = 0;
	for (const e of world.query(Building)) {
		const b = e.get(Building);
		if (b?.factionId === factionId && b.hp > 0) {
			sum += b.buildingTier ?? 1;
		}
	}
	return sum;
}

function countRoboformedTiles(world: World, factionId: string): number {
	let count = 0;
	for (const e of world.query(Building)) {
		const b = e.get(Building);
		if (b?.factionId === factionId && b.hp > 0 && b.buildingTier >= 3) {
			count++;
		}
	}
	return count;
}

function countSignalCoveredTiles(world: World, factionId: string): number {
	const covered = new Set<string>();
	for (const e of world.query(Building, SignalNode, Powered)) {
		const b = e.get(Building);
		const sn = e.get(SignalNode);
		if (!b || !sn || sn.range <= 0 || b.factionId !== factionId) continue;
		for (let x = b.tileX - sn.range; x <= b.tileX + sn.range; x++) {
			const remainingZ = sn.range - Math.abs(x - b.tileX);
			for (let z = b.tileZ - remainingZ; z <= b.tileZ + remainingZ; z++) {
				covered.add(`${x},${z}`);
			}
		}
	}
	return covered.size;
}
