/**
 * World terrain generation — converts chunk-based terrain into sector cells.
 *
 * This module ONLY handles terrain. POIs, factions, and player state
 * are separate systems that query the generated terrain.
 */

import { getDatabaseSync } from "../db/runtime";
import { type BreachZone, generateBreachZones } from "../systems/breachZones";
import {
	type GeneratedCityInstanceSeed,
	seedCityInstances,
} from "./citySeeding";
import type { NewGameConfig } from "./config";
import { SECTOR_SCALE_SPECS } from "./config";
import { generateChunk } from "./gen/chunkGen";
import { CHUNK_SIZE, type MapTile } from "./gen/types";
import {
	type GeneratedSectorPointOfInterest,
	placeInitialPOIs,
} from "./poiPlacement";

// ─── Types ──────────────────────────────────────────────────────────────────

export type { GeneratedCityInstanceSeed } from "./citySeeding";
export type { GeneratedSectorPointOfInterest } from "./poiPlacement";

export interface GeneratedEcumenopolisData {
	ecumenopolis: {
		width: number;
		height: number;
		spawnSectorId: string;
		spawnAnchorKey: string;
	};
	sectorCells: GeneratedSectorCell[];
	sectorStructures: GeneratedSectorStructure[];
	pointsOfInterest: GeneratedSectorPointOfInterest[];
	cityInstances: GeneratedCityInstanceSeed[];
	breachZones: BreachZone[];
}

export interface GeneratedSectorCell {
	q: number;
	r: number;
	structuralZone: string;
	floorPresetId: string;
	discoveryState: number;
	passable: boolean;
	sectorArchetype: string;
	stormExposure: "shielded" | "stressed" | "exposed";
	impassableClass: "none" | "breach" | "sealed_power" | "structural_void";
	anchorKey: string;
}

export interface GeneratedSectorStructure {
	districtStructureId: string;
	anchorKey: string;
	q: number;
	r: number;
	modelId: string;
	placementLayer: string;
	edge: string | null;
	rotationQuarterTurns: number;
	offsetX: number;
	offsetY: number;
	offsetZ: number;
	targetSpan: number;
	sectorArchetype: string;
	source: "seeded_district" | "boundary" | "landmark" | "constructed";
	controllerFaction: string | null;
}

// ─── Zone Classification ────────────────────────────────────────────────────

function classifyZone(tile: MapTile): string {
	if (!tile.passable && tile.modelLayer === "structure") return "fabrication";
	if (tile.modelLayer === "resource") return "storage";
	if (tile.modelLayer === "prop") return "habitation";
	if (tile.isBridge || tile.isRamp) return "transit";
	return "corridor_transit";
}

function classifyArchetype(tile: MapTile): string {
	if (tile.modelLayer === "resource") return "resource_zone";
	if (tile.modelLayer === "structure" || tile.modelLayer === "support")
		return "industrial";
	return "service_plate";
}

// ─── Terrain Generation ─────────────────────────────────────────────────────

/**
 * Generate terrain cells from chunks. ONLY terrain — no POIs, no factions.
 */
function generateTerrain(
	worldSeed: number,
	gridWidth: number,
	gridHeight: number,
): { cells: GeneratedSectorCell[]; structures: GeneratedSectorStructure[] } {
	const chunksX = Math.ceil(gridWidth / CHUNK_SIZE);
	const chunksZ = Math.ceil(gridHeight / CHUNK_SIZE);
	const cells: GeneratedSectorCell[] = [];
	const structures: GeneratedSectorStructure[] = [];
	let structId = 0;

	for (let cz = 0; cz < chunksZ; cz++) {
		for (let cx = 0; cx < chunksX; cx++) {
			const chunk = generateChunk(worldSeed, cx, cz, getDatabaseSync());
			for (const tile of chunk.tiles) {
				if (
					tile.x < 0 ||
					tile.z < 0 ||
					tile.x >= gridWidth ||
					tile.z >= gridHeight
				)
					continue;

				cells.push({
					q: tile.x,
					r: tile.z,
					structuralZone: classifyZone(tile),
					floorPresetId: tile.floorMaterial,
					discoveryState: 0,
					passable: tile.passable,
					sectorArchetype: classifyArchetype(tile),
					stormExposure: "shielded",
					impassableClass: tile.passable ? "none" : "structural_void",
					anchorKey: `${tile.x},${tile.z}`,
				});

				if (tile.modelId && tile.modelLayer) {
					structures.push({
						districtStructureId: `struct_${structId++}`,
						anchorKey: `${tile.x},${tile.z}`,
						q: tile.x,
						r: tile.z,
						modelId: tile.modelId,
						placementLayer: tile.modelLayer,
						edge: null,
						rotationQuarterTurns: tile.rotation,
						offsetX: 0,
						offsetY: 0,
						offsetZ: 0,
						targetSpan: 1,
						sectorArchetype: classifyArchetype(tile),
						source: "seeded_district",
						controllerFaction: null,
					});
				}
			}
		}
	}

	return { cells, structures };
}

// ─── Orchestrator ───────────────────────────────────────────────────────────

/**
 * Generate world data. Orchestrates separate systems:
 * 1. Terrain generation (chunks → sector cells)
 * 2. POI placement (finds usable space on terrain, reads from config)
 * 3. City seeding (creates city instances from POIs)
 * 4. Discovery (reveals area around spawn)
 * 5. Breach zones (structural fractures for hostile spawns)
 */
export function generateWorldData(
	config: NewGameConfig,
): GeneratedEcumenopolisData {
	const scale = SECTOR_SCALE_SPECS[config.sectorScale];
	const { width, height } = scale;

	// 1. Terrain
	const terrain = generateTerrain(config.worldSeed, width, height);

	// 2. POIs — separate system, queries terrain for usable space
	const pois = placeInitialPOIs(terrain.cells, width, height, config.worldSeed);

	// 3. Cities — seeded from POIs
	const cities = seedCityInstances(pois, config.worldSeed);

	// 4. Discovery around spawn
	const spawnQ = Math.floor(width / 2);
	const spawnR = Math.floor(height / 2);
	for (const cell of terrain.cells) {
		const dist = Math.max(Math.abs(cell.q - spawnQ), Math.abs(cell.r - spawnR));
		if (dist <= 5) cell.discoveryState = 2;
		else if (dist <= 7) cell.discoveryState = 1;
	}

	// 5. Breach zones — separate system, queries terrain + POIs for fracture points
	const partialWorld = {
		sectorCells: terrain.cells,
		sectorStructures: terrain.structures,
		pointsOfInterest: pois,
		cityInstances: cities,
		breachZones: [] as BreachZone[],
		ecumenopolis: {
			width,
			height,
			spawnSectorId: `${spawnQ},${spawnR}`,
			spawnAnchorKey: `${spawnQ},${spawnR}`,
		},
	};
	const breachZones = generateBreachZones(partialWorld);

	return {
		ecumenopolis: partialWorld.ecumenopolis,
		sectorCells: terrain.cells,
		sectorStructures: terrain.structures,
		pointsOfInterest: pois,
		cityInstances: cities,
		breachZones,
	};
}
