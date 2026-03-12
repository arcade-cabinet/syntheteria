import { pickTerrainSetId, type TerrainSetId } from "../config/terrainSetRules";
import type { Biome, FogState } from "../ecs/terrain";
import { createGeneratedCitySeed } from "./cityLifecycle";
import {
	getClimateProfileSpec,
	getMapSizeSpec,
	type NewGameConfig,
} from "./config";
import type {
	CityGenerationStatus,
	CityInstanceState,
	WorldPoiType,
} from "./contracts";

export interface GeneratedWorldTile {
	q: number;
	r: number;
	biome: Biome;
	terrainSetId: TerrainSetId;
	fog: FogState;
	passable: boolean;
}

export interface GeneratedWorldMap {
	width: number;
	height: number;
	spawnQ: number;
	spawnR: number;
}

export interface GeneratedWorldPointOfInterest {
	type: WorldPoiType;
	name: string;
	q: number;
	r: number;
	discovered: boolean;
}

export interface GeneratedCityInstanceSeed {
	poiType: WorldPoiType;
	name: string;
	worldQ: number;
	worldR: number;
	layoutSeed: number;
	state: CityInstanceState;
	generationStatus: CityGenerationStatus;
}

export interface GeneratedWorldData {
	map: GeneratedWorldMap;
	tiles: GeneratedWorldTile[];
	pointsOfInterest: GeneratedWorldPointOfInterest[];
	cityInstances: GeneratedCityInstanceSeed[];
}

const NEIGHBOR_OFFSETS = [
	[1, 0],
	[1, -1],
	[0, -1],
	[-1, 0],
	[-1, 1],
	[0, 1],
] as const;

const TERRAIN_SET_NEIGHBOR_OFFSETS = [
	[-1, 0],
	[0, -1],
	[1, -1],
] as const;

function createPurposeSeed(worldSeed: number, purpose: string) {
	let hash = worldSeed >>> 0;
	for (let index = 0; index < purpose.length; index++) {
		hash = (Math.imul(hash, 31) + purpose.charCodeAt(index)) >>> 0;
	}
	return hash >>> 0;
}

function makePRNG(seed: number) {
	let state = seed >>> 0;
	return () => {
		state |= 0;
		state = (state + 0x6d2b79f5) | 0;
		let t = Math.imul(state ^ (state >>> 15), 1 | state);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 0xffffffff;
	};
}

function tileKey(q: number, r: number) {
	return `${q},${r}`;
}

function hashCoordinates(q: number, r: number) {
	const qHash = Math.imul(q ^ 0x45d9f3b, 0x45d9f3b);
	const rHash = Math.imul(r ^ 0x119de1f3, 0x119de1f3);
	return (qHash ^ rHash) >>> 0;
}

function centeredCoordinate(index: number, length: number) {
	return index - Math.floor(length / 2);
}

function normalizeDistance(current: number, target: number, span: number) {
	return Math.abs(current - target) / Math.max(1, span);
}

function scoreBiome(tile: GeneratedWorldTile, preferred: readonly Biome[]) {
	const exactIndex = preferred.indexOf(tile.biome);
	if (exactIndex === -1) {
		return -2;
	}
	return preferred.length - exactIndex;
}

function countNeighborBiomes(
	tile: GeneratedWorldTile,
	tilesByKey: Map<string, GeneratedWorldTile>,
) {
	const counts = new Map<Biome, number>();
	for (const [dq, dr] of NEIGHBOR_OFFSETS) {
		const neighbor = tilesByKey.get(tileKey(tile.q + dq, tile.r + dr));
		if (!neighbor) {
			continue;
		}
		counts.set(neighbor.biome, (counts.get(neighbor.biome) ?? 0) + 1);
	}
	return counts;
}

function findBestPoiTile(
	tiles: GeneratedWorldTile[],
	tilesByKey: Map<string, GeneratedWorldTile>,
	usedKeys: Set<string>,
	target: { q: number; r: number },
	preferredBiomes: readonly Biome[],
	requiredNeighborBiome?: Biome,
) {
	let bestTile: GeneratedWorldTile | null = null;
	let bestScore = Number.NEGATIVE_INFINITY;

	for (const tile of tiles) {
		if (usedKeys.has(tileKey(tile.q, tile.r))) {
			continue;
		}

		const biomeScore = scoreBiome(tile, preferredBiomes);
		if (biomeScore < 0) {
			continue;
		}

		const neighborCounts = countNeighborBiomes(tile, tilesByKey);
		if (
			requiredNeighborBiome &&
			(neighborCounts.get(requiredNeighborBiome) ?? 0) === 0
		) {
			continue;
		}

		const targetDistance =
			normalizeDistance(tile.q, target.q, tiles.length) +
			normalizeDistance(tile.r, target.r, tiles.length);
		const coastalBonus =
			requiredNeighborBiome && neighborCounts.get(requiredNeighborBiome)
				? 1.5
				: 0;
		const passableBonus = tile.passable ? 0.6 : -1.2;
		const score =
			biomeScore * 4 + coastalBonus + passableBonus - targetDistance * 10;

		if (score > bestScore) {
			bestScore = score;
			bestTile = tile;
		}
	}

	if (!bestTile) {
		throw new Error("Failed to place world POI with current terrain rules.");
	}

	usedKeys.add(tileKey(bestTile.q, bestTile.r));
	return bestTile;
}

export function generateWorldData(config: NewGameConfig): GeneratedWorldData {
	const size = getMapSizeSpec(config.mapSize);
	const climate = getClimateProfileSpec(config.climateProfile);
	const baseRng = makePRNG(createPurposeSeed(config.worldSeed, "terrain"));
	const width = size.width;
	const height = size.height;
	const coordinates: { q: number; r: number }[] = [];

	for (let row = 0; row < height; row++) {
		for (let column = 0; column < width; column++) {
			coordinates.push({
				q: centeredCoordinate(column, width),
				r: centeredCoordinate(row, height),
			});
		}
	}

	const noise = new Map<string, { elevation: number; moisture: number }>();
	for (const { q, r } of coordinates) {
		noise.set(tileKey(q, r), {
			elevation: Math.min(1, Math.max(0, baseRng() + climate.elevationBias)),
			moisture: Math.min(1, Math.max(0, baseRng() + climate.moistureBias)),
		});
	}

	for (let step = 0; step < 3; step++) {
		const nextNoise = new Map<
			string,
			{ elevation: number; moisture: number }
		>();
		for (const { q, r } of coordinates) {
			const current = noise.get(tileKey(q, r));
			if (!current) {
				continue;
			}

			let sumElevation = current.elevation;
			let sumMoisture = current.moisture;
			let count = 1;

			for (const [dq, dr] of NEIGHBOR_OFFSETS) {
				const neighbor = noise.get(tileKey(q + dq, r + dr));
				if (!neighbor) {
					continue;
				}
				sumElevation += neighbor.elevation;
				sumMoisture += neighbor.moisture;
				count++;
			}

			nextNoise.set(tileKey(q, r), {
				elevation: sumElevation / count,
				moisture: sumMoisture / count,
			});
		}

		for (const [key, value] of nextNoise) {
			noise.set(key, value);
		}
	}

	const tiles = coordinates.map<GeneratedWorldTile>(({ q, r }) => {
		const sample = noise.get(tileKey(q, r));
		if (!sample) {
			throw new Error(`Missing noise sample for (${q}, ${r}).`);
		}

		let biome: Biome;
		if (sample.elevation < climate.waterLevel) {
			biome = "water";
		} else if (sample.elevation < climate.sandLevel) {
			biome = "sand";
		} else if (sample.elevation > climate.mountainLevel) {
			biome = "mountain";
		} else if (sample.moisture > climate.grassMoistureLevel) {
			biome = "grass";
		} else {
			biome = "dirt";
		}

		return {
			q,
			r,
			biome,
			terrainSetId: "emerald_fields_and_forests",
			fog: 0,
			passable: biome !== "water" && biome !== "mountain",
		};
	});

	const tilesByKey = new Map<string, GeneratedWorldTile>();
	for (const tile of tiles) {
		tilesByKey.set(tileKey(tile.q, tile.r), tile);
	}

	for (const tile of tiles) {
		const neighborSetIds = TERRAIN_SET_NEIGHBOR_OFFSETS.flatMap(([dq, dr]) => {
			const neighbor = tilesByKey.get(tileKey(tile.q + dq, tile.r + dr));
			return neighbor ? [neighbor.terrainSetId] : [];
		});
		tile.terrainSetId = pickTerrainSetId(
			tile.biome,
			neighborSetIds,
			tile.q,
			tile.r,
		);
	}

	const usedPoiKeys = new Set<string>();
	const centerTarget = { q: 0, r: 0 };
	const homeBaseTile = findBestPoiTile(
		tiles,
		tilesByKey,
		usedPoiKeys,
		centerTarget,
		["grass", "dirt"],
	);

	const coastMinesTile = findBestPoiTile(
		tiles,
		tilesByKey,
		usedPoiKeys,
		{ q: -Math.floor(width / 3), r: 0 },
		["sand", "dirt", "grass"],
		"water",
	);

	const scienceCampusTile = findBestPoiTile(
		tiles,
		tilesByKey,
		usedPoiKeys,
		{ q: Math.floor(width / 4), r: Math.floor(height / 5) },
		["grass", "dirt"],
	);

	const northernCultTile = findBestPoiTile(
		tiles,
		tilesByKey,
		usedPoiKeys,
		{ q: 0, r: -Math.floor(height / 3) },
		["mountain", "dirt", "grass"],
	);

	const deepSeaGatewayTile = findBestPoiTile(
		tiles,
		tilesByKey,
		usedPoiKeys,
		{ q: Math.floor(width / 3), r: Math.floor(height / 3) },
		["water"],
	);

	const pointsOfInterest: GeneratedWorldPointOfInterest[] = [
		{
			type: "home_base",
			name: "Relay Home Base",
			q: homeBaseTile.q,
			r: homeBaseTile.r,
			discovered: true,
		},
		{
			type: "coast_mines",
			name: "Coastline Extraction Works",
			q: coastMinesTile.q,
			r: coastMinesTile.r,
			discovered: false,
		},
		{
			type: "science_campus",
			name: "Science Campus",
			q: scienceCampusTile.q,
			r: scienceCampusTile.r,
			discovered: false,
		},
		{
			type: "northern_cult_site",
			name: "Northern Cult Redoubt",
			q: northernCultTile.q,
			r: northernCultTile.r,
			discovered: false,
		},
		{
			type: "deep_sea_gateway",
			name: "Deep Sea Launch Route",
			q: deepSeaGatewayTile.q,
			r: deepSeaGatewayTile.r,
			discovered: false,
		},
	];

	const cityInstances: GeneratedCityInstanceSeed[] = pointsOfInterest.map(
		(poi) =>
			createGeneratedCitySeed(
				poi.type,
				poi.name,
				poi.q,
				poi.r,
				createPurposeSeed(
					config.worldSeed,
					`${poi.type}:${hashCoordinates(poi.q, poi.r)}`,
				),
			),
	);

	return {
		map: {
			width,
			height,
			spawnQ: homeBaseTile.q,
			spawnR: homeBaseTile.r,
		},
		tiles,
		pointsOfInterest,
		cityInstances,
	};
}
