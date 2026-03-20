/**
 * @module cultPOI
 *
 * Cult POI (Point of Interest) initialization.
 * Places cult structures and initial guards on abandoned terrain at game start.
 */

import type { World } from "koota";
import { tileNeighbors } from "../board/adjacency";
import type { GeneratedBoard } from "../board/types";
import { CULT_STRUCTURE_DEFS } from "../config/buildings";
import {
	spawnCultCavalry,
	spawnCultInfantry,
	spawnCultRanged,
} from "../robots/CultMechs";
import { CultStructure } from "../traits";
import {
	addPOIPosition,
	altarZones,
	CULT_FACTIONS,
	CULT_TERRAIN,
	INITIAL_POI_COUNT_MAX,
	INITIAL_POI_COUNT_MIN,
	poiPositions,
	poisInitialized,
	setPoisInitialized,
} from "./cultConstants";

// ---------------------------------------------------------------------------
// POI initialization — place cult structures on abandoned terrain at game start
// ---------------------------------------------------------------------------

/**
 * Place 3-6 cult POIs on hills / desert tiles during mapgen.
 * Each POI gets a breach_altar + 1 cult mech guard.
 * Called once at game start from initWorldFromBoard or similar.
 */
export function initCultPOIs(
	world: World,
	board: GeneratedBoard,
	seed: number,
): void {
	if (poisInitialized) return;
	setPoisInitialized(true);

	const { width, height } = board.config;

	// Collect candidate tiles (abandoned terrain, away from edges and center)
	const candidates: Array<{ x: number; z: number }> = [];
	const margin = Math.max(3, Math.floor(width / 8));
	const centerX = Math.floor(width / 2);
	const centerZ = Math.floor(height / 2);
	const centerExclusion = Math.floor(Math.min(width, height) / 4);

	for (let z = margin; z < height - margin; z++) {
		for (let x = margin; x < width - margin; x++) {
			const tile = board.tiles[z]?.[x];
			if (!tile || !tile.passable) continue;
			if (!CULT_TERRAIN.has(tile.biomeType)) continue;
			// Exclude center area (player starts near center)
			const distToCenter = Math.abs(x - centerX) + Math.abs(z - centerZ);
			if (distToCenter < centerExclusion) continue;
			candidates.push({ x, z });
		}
	}

	if (candidates.length === 0) return;

	// Deterministic selection using seed
	const count =
		INITIAL_POI_COUNT_MIN +
		((seed >>> 0) % (INITIAL_POI_COUNT_MAX - INITIAL_POI_COUNT_MIN + 1));
	const poiCount = Math.min(count, candidates.length);

	// Spread POIs apart — pick candidates with minimum spacing
	const MIN_POI_SPACING = Math.max(6, Math.floor(width / 8));
	const selected: Array<{ x: number; z: number }> = [];

	// Simple greedy selection with spacing constraint
	let rng = seed >>> 0;
	for (
		let attempt = 0;
		attempt < candidates.length * 2 && selected.length < poiCount;
		attempt++
	) {
		// LCG pseudo-random
		rng = (rng * 1664525 + 1013904223) >>> 0;
		const idx = rng % candidates.length;
		const c = candidates[idx];

		// Check spacing from already-selected POIs
		const tooClose = selected.some(
			(s) => Math.abs(s.x - c.x) + Math.abs(s.z - c.z) < MIN_POI_SPACING,
		);
		if (tooClose) continue;

		selected.push(c);
	}

	// Spawn POI structures and initial cult mech guards
	for (let i = 0; i < selected.length; i++) {
		const pos = selected[i];
		addPOIPosition(pos);

		const cultFaction = CULT_FACTIONS[i % CULT_FACTIONS.length];
		const zoneKey = `${pos.x},${pos.z}`;
		altarZones.add(zoneKey);

		// Place breach altar
		const altarDef = CULT_STRUCTURE_DEFS.breach_altar;
		world.spawn(
			CultStructure({
				tileX: pos.x,
				tileZ: pos.z,
				structureType: "breach_altar",
				modelId: altarDef.modelId,
				hp: altarDef.hp,
				maxHp: altarDef.hp,
				corruptionRadius: altarDef.corruptionRadius,
				spawnsUnits: altarDef.spawnsUnits,
				spawnInterval: altarDef.spawnInterval,
			}),
		);

		// Spawn initial cult mech guard at adjacent tile
		const neighbors = tileNeighbors(pos.x, pos.z, board);
		if (neighbors.length > 0) {
			const guardTile = neighbors[i % neighbors.length];
			// Rotate mech types: infantry, ranged, cavalry
			const mechType = i % 3;
			if (mechType === 0) {
				spawnCultInfantry(world, guardTile.x, guardTile.z, cultFaction);
			} else if (mechType === 1) {
				spawnCultRanged(world, guardTile.x, guardTile.z, cultFaction);
			} else {
				spawnCultCavalry(world, guardTile.x, guardTile.z, cultFaction);
			}
		}

		// Place human shelter adjacent
		if (neighbors.length > 1) {
			const shelterTile = neighbors[(i + 1) % neighbors.length];
			const shelterDef = CULT_STRUCTURE_DEFS.human_shelter;
			world.spawn(
				CultStructure({
					tileX: shelterTile.x,
					tileZ: shelterTile.z,
					structureType: "human_shelter",
					modelId: shelterDef.modelId,
					hp: shelterDef.hp,
					maxHp: shelterDef.hp,
					corruptionRadius: shelterDef.corruptionRadius,
					spawnsUnits: shelterDef.spawnsUnits,
					spawnInterval: shelterDef.spawnInterval,
				}),
			);
		}
	}
}

export function getPOIPositions(): ReadonlyArray<{ x: number; z: number }> {
	return poiPositions;
}
