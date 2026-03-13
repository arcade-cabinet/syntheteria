import {
	generateBreachZones,
	type BreachZone,
} from "../systems/breachZones";
import { createGeneratedCitySeed } from "./cityLifecycle";
import {
	getClimateProfileSpec,
	getSectorScaleSpec,
	type NewGameConfig,
} from "./config";
import type {
	CityGenerationStatus,
	CityInstanceState,
	WorldPoiType,
} from "./contracts";
import {
	generateSectorStructurePlan,
	type GeneratedSectorStructure,
} from "./sectorStructurePlan";

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

export interface GeneratedEcumenopolis {
	width: number;
	height: number;
	spawnSectorId: string;
	spawnAnchorKey: string;
}

export interface GeneratedSectorPointOfInterest {
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

export interface GeneratedEcumenopolisData {
	ecumenopolis: GeneratedEcumenopolis;
	sectorCells: GeneratedSectorCell[];
	pointsOfInterest: GeneratedSectorPointOfInterest[];
	cityInstances: GeneratedCityInstanceSeed[];
	sectorStructures: GeneratedSectorStructure[];
	breachZones: BreachZone[];
}

type StructuralZoneDefinition = Pick<
	GeneratedSectorCell,
	"structuralZone" | "floorPresetId" | "passable"
>;

const NEIGHBOR_OFFSETS = [
	[1, 0],
	[0, -1],
	[-1, 0],
	[0, 1],
	[1, 1],
	[1, -1],
	[-1, 1],
	[-1, -1],
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

function euclideanDistance(
	first: { q: number; r: number },
	second: { q: number; r: number },
) {
	const dq = first.q - second.q;
	const dr = first.r - second.r;
	return Math.sqrt(dq * dq + dr * dr);
}

function classifySectorSurface(
	elevation: number,
	moisture: number,
	climate: ReturnType<typeof getClimateProfileSpec>,
) {
	if (elevation < climate.waterLevel) {
		return {
			structuralZone: "breach",
			floorPresetId: "breach_exposed",
			passable: false,
		};
	}
	if (elevation < climate.sandLevel) {
		return {
			structuralZone: "transit",
			floorPresetId: "corridor_transit",
			passable: true,
		};
	}
	if (elevation > climate.mountainLevel) {
		return {
			structuralZone: "power",
			floorPresetId: "power",
			passable: false,
		};
	}
	if (moisture > climate.grassMoistureLevel) {
		return {
			structuralZone: "command",
			floorPresetId: "command_core",
			passable: true,
		};
	}
	return {
		structuralZone: "fabrication",
		floorPresetId: "fabrication",
		passable: true,
	};
}

function getStructuralMetadata(surface: StructuralZoneDefinition) {
	switch (surface.structuralZone) {
		case "breach":
			return {
				sectorArchetype: "breach_zone",
				stormExposure: "exposed" as const,
				impassableClass: "breach" as const,
			};
		case "power":
			return {
				sectorArchetype: "power_sink",
				stormExposure: "stressed" as const,
				impassableClass: "sealed_power" as const,
			};
		case "transit":
			return {
				sectorArchetype: "transit_corridor",
				stormExposure: "shielded" as const,
				impassableClass: "none" as const,
			};
		case "command":
			return {
				sectorArchetype: "command_plate",
				stormExposure: "shielded" as const,
				impassableClass: "none" as const,
			};
		case "fabrication":
			return {
				sectorArchetype: "fabrication_plate",
				stormExposure: "stressed" as const,
				impassableClass: "none" as const,
			};
		case "storage":
			return {
				sectorArchetype: "storage_plate",
				stormExposure: "shielded" as const,
				impassableClass: "none" as const,
			};
		case "habitation":
			return {
				sectorArchetype: "habitation_plate",
				stormExposure: "shielded" as const,
				impassableClass: "none" as const,
			};
		default:
			return {
				sectorArchetype: "service_plate",
				stormExposure: "stressed" as const,
				impassableClass: surface.passable ? ("none" as const) : ("structural_void" as const),
			};
	}
}

function scoreZone(tile: GeneratedSectorCell, preferred: readonly string[]) {
	const exactIndex = preferred.indexOf(tile.structuralZone);
	if (exactIndex === -1) {
		return -2;
	}
	return preferred.length - exactIndex;
}

function countNeighborZones(
	tile: GeneratedSectorCell,
	tilesByKey: Map<string, GeneratedSectorCell>,
) {
	const counts = new Map<string, number>();
	for (const [dq, dr] of NEIGHBOR_OFFSETS) {
		const neighbor = tilesByKey.get(tileKey(tile.q + dq, tile.r + dr));
		if (!neighbor) {
			continue;
		}
		counts.set(
			neighbor.structuralZone,
			(counts.get(neighbor.structuralZone) ?? 0) + 1,
		);
	}
	return counts;
}

function findBestPoiTile(
	sectorCells: GeneratedSectorCell[],
	tilesByKey: Map<string, GeneratedSectorCell>,
	usedKeys: Set<string>,
	target: { q: number; r: number },
	preferredZones: readonly string[],
	requiredNeighborZone?: string,
	maxDistanceFromTarget?: number,
) {
	let bestTile: GeneratedSectorCell | null = null;
	let bestScore = Number.NEGATIVE_INFINITY;

	for (const tile of sectorCells) {
		if (usedKeys.has(tileKey(tile.q, tile.r))) {
			continue;
		}

		const zoneScore = scoreZone(tile, preferredZones);
		if (zoneScore < 0) {
			continue;
		}
		if (
			typeof maxDistanceFromTarget === "number" &&
			euclideanDistance(tile, target) > maxDistanceFromTarget
		) {
			continue;
		}

		const neighborCounts = countNeighborZones(tile, tilesByKey);
		if (
			requiredNeighborZone &&
			(neighborCounts.get(requiredNeighborZone) ?? 0) === 0
		) {
			continue;
		}

		const targetDistance =
			normalizeDistance(tile.q, target.q, sectorCells.length) +
			normalizeDistance(tile.r, target.r, sectorCells.length);
		const adjacencyBonus =
			requiredNeighborZone && neighborCounts.get(requiredNeighborZone)
				? 1.5
				: 0;
		const passableBonus = tile.passable ? 0.6 : -1.2;
		const score =
			zoneScore * 4 + adjacencyBonus + passableBonus - targetDistance * 10;

		if (score > bestScore) {
			bestScore = score;
			bestTile = tile;
		}
	}

	if (!bestTile) {
		throw new Error(
			"Failed to place ecumenopolis POI with current sector rules.",
		);
	}

	usedKeys.add(tileKey(bestTile.q, bestTile.r));
	return bestTile;
}

function offsetTarget(
	base: { q: number; r: number },
	offset: { q: number; r: number },
) {
	return {
		q: base.q + offset.q,
		r: base.r + offset.r,
	};
}

function applyStructuralSurface(
	cell: GeneratedSectorCell,
	surface: StructuralZoneDefinition,
	discoveryState?: number,
) {
	cell.structuralZone = surface.structuralZone;
	cell.floorPresetId = surface.floorPresetId;
	cell.passable = surface.passable;
	const metadata = getStructuralMetadata(surface);
	cell.sectorArchetype = metadata.sectorArchetype;
	cell.stormExposure = metadata.stormExposure;
	cell.impassableClass = metadata.impassableClass;
	if (typeof discoveryState === "number") {
		cell.discoveryState = Math.max(cell.discoveryState, discoveryState);
	}
}

function getDistrictSurface(
	poiType: WorldPoiType,
	distance: number,
	seed: number,
): StructuralZoneDefinition {
	const variant = Math.floor((Math.abs(Math.sin(seed * 0.13)) * 1000) % 3);

	switch (poiType) {
		case "home_base":
			if (distance <= 1.1) {
				return {
					structuralZone: "command",
					floorPresetId: "command_core",
					passable: true,
				};
			}
			if (distance <= 2.2) {
				return variant === 0
					? {
							structuralZone: "fabrication",
							floorPresetId: "fabrication",
							passable: true,
						}
					: {
							structuralZone: "transit",
							floorPresetId: "corridor_transit",
							passable: true,
						};
			}
			return variant === 0
				? {
						structuralZone: "storage",
						floorPresetId: "storage",
						passable: true,
					}
				: {
						structuralZone: "habitation",
						floorPresetId: "habitation",
						passable: true,
					};
		case "coast_mines":
			if (distance <= 1.1) {
				return {
					structuralZone: "fabrication",
					floorPresetId: "fabrication",
					passable: true,
				};
			}
			if (distance <= 2.2) {
				return variant === 0
					? {
							structuralZone: "storage",
							floorPresetId: "storage",
							passable: true,
						}
					: {
							structuralZone: "transit",
							floorPresetId: "corridor_transit",
							passable: true,
						};
			}
			return {
				structuralZone: "power",
				floorPresetId: "power",
				passable: false,
			};
		case "science_campus":
			if (distance <= 1.1) {
				return {
					structuralZone: "command",
					floorPresetId: "command_core",
					passable: true,
				};
			}
			if (distance <= 2.2) {
				return variant === 0
					? {
							structuralZone: "habitation",
							floorPresetId: "habitation",
							passable: true,
						}
					: {
							structuralZone: "transit",
							floorPresetId: "corridor_transit",
							passable: true,
						};
			}
			return {
				structuralZone: "storage",
				floorPresetId: "storage",
				passable: true,
			};
		case "northern_cult_site":
			if (distance <= 1.1) {
				return {
					structuralZone: "power",
					floorPresetId: "power",
					passable: false,
				};
			}
			if (distance <= 2.2) {
				return variant === 0
					? {
							structuralZone: "breach",
							floorPresetId: "breach_exposed",
							passable: false,
						}
					: {
							structuralZone: "transit",
							floorPresetId: "corridor_transit",
							passable: true,
						};
			}
			return {
				structuralZone: "fabrication",
				floorPresetId: "fabrication",
				passable: true,
			};
		case "deep_sea_gateway":
			if (distance <= 1.1) {
				return {
					structuralZone: "breach",
					floorPresetId: "breach_exposed",
					passable: false,
				};
			}
			if (distance <= 2.2) {
				return variant === 0
					? {
							structuralZone: "power",
							floorPresetId: "power",
							passable: false,
						}
					: {
							structuralZone: "transit",
							floorPresetId: "corridor_transit",
							passable: true,
						};
			}
			return {
				structuralZone: "command",
				floorPresetId: "command_core",
				passable: true,
			};
	}
}

function paintDistrictArchetypes(
	sectorCells: GeneratedSectorCell[],
	pointsOfInterest: GeneratedSectorPointOfInterest[],
) {
	for (const cell of sectorCells) {
		let nearestPoi: GeneratedSectorPointOfInterest | null = null;
		let nearestDistance = Number.POSITIVE_INFINITY;

		for (const poi of pointsOfInterest) {
			const distance = euclideanDistance(cell, poi);
			if (distance < nearestDistance) {
				nearestDistance = distance;
				nearestPoi = poi;
			}
		}

		if (!nearestPoi || nearestDistance > 3.4) {
			continue;
		}

		const seed = hashCoordinates(cell.q + nearestPoi.q, cell.r + nearestPoi.r);
		applyStructuralSurface(
			cell,
			getDistrictSurface(nearestPoi.type, nearestDistance, seed),
			nearestPoi.type === "home_base"
				? nearestDistance <= 2.3
					? 2
					: 1
				: nearestDistance <= 1.4 && nearestPoi.discovered
					? 1
					: undefined,
		);
	}
}

function snapAnchorCoordinate(value: number, stride: number) {
	return Math.round(value / stride) * stride;
}

function assignDistrictAnchors(
	sectorCells: GeneratedSectorCell[],
	pointsOfInterest: GeneratedSectorPointOfInterest[],
) {
	const anchorStride = 3;

	for (const cell of sectorCells) {
		let nearestPoi: GeneratedSectorPointOfInterest | null = null;
		let nearestDistance = Number.POSITIVE_INFINITY;

		for (const poi of pointsOfInterest) {
			const distance = euclideanDistance(cell, poi);
			if (distance < nearestDistance) {
				nearestDistance = distance;
				nearestPoi = poi;
			}
		}

		if (nearestPoi && nearestDistance <= 4.2) {
			const localQ = snapAnchorCoordinate(cell.q - nearestPoi.q, anchorStride);
			const localR = snapAnchorCoordinate(cell.r - nearestPoi.r, anchorStride);
			cell.anchorKey = tileKey(nearestPoi.q + localQ, nearestPoi.r + localR);
			continue;
		}

		cell.anchorKey = tileKey(
			snapAnchorCoordinate(cell.q, anchorStride),
			snapAnchorCoordinate(cell.r, anchorStride),
		);
	}
}

export function generateWorldData(
	config: NewGameConfig,
): GeneratedEcumenopolisData {
	const size = getSectorScaleSpec(config.sectorScale);
	const climate = getClimateProfileSpec(config.climateProfile);
	const baseRng = makePRNG(createPurposeSeed(config.worldSeed, "ecumenopolis"));
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

	const sectorCells = coordinates.map<GeneratedSectorCell>(({ q, r }) => {
		const sample = noise.get(tileKey(q, r));
		if (!sample) {
			throw new Error(`Missing noise sample for (${q}, ${r}).`);
		}

		const semantic = classifySectorSurface(
			sample.elevation,
			sample.moisture,
			climate,
		);
		return {
			q,
			r,
			structuralZone: semantic.structuralZone,
			floorPresetId: semantic.floorPresetId,
			discoveryState: 0,
			passable: semantic.passable,
			...getStructuralMetadata(semantic),
			anchorKey: tileKey(q, r),
		};
	});

	const tilesByKey = new Map<string, GeneratedSectorCell>();
	for (const tile of sectorCells) {
		tilesByKey.set(tileKey(tile.q, tile.r), tile);
	}

	const usedPoiKeys = new Set<string>();
	const centerTarget = { q: 0, r: 0 };
	const homeBaseTile = findBestPoiTile(
		sectorCells,
		tilesByKey,
		usedPoiKeys,
		centerTarget,
		["command", "fabrication", "transit"],
	);

	const coastMinesTile = findBestPoiTile(
		sectorCells,
		tilesByKey,
		usedPoiKeys,
		offsetTarget(homeBaseTile, { q: 3, r: -2 }),
		["transit", "fabrication", "command"],
		undefined,
		5,
	);

	const scienceCampusTile = findBestPoiTile(
		sectorCells,
		tilesByKey,
		usedPoiKeys,
		offsetTarget(homeBaseTile, { q: -4, r: 2 }),
		["command", "fabrication"],
		undefined,
		5,
	);

	const northernCultTile = findBestPoiTile(
		sectorCells,
		tilesByKey,
		usedPoiKeys,
		{ q: 0, r: -Math.floor(height / 3) },
		["power", "fabrication", "command"],
	);

	const deepSeaGatewayTile = findBestPoiTile(
		sectorCells,
		tilesByKey,
		usedPoiKeys,
		{ q: Math.floor(width / 3), r: Math.floor(height / 3) },
		["breach", "transit", "power"],
	);

	const pointsOfInterest: GeneratedSectorPointOfInterest[] = [
		{
			type: "home_base",
			name: "Command Arcology",
			q: homeBaseTile.q,
			r: homeBaseTile.r,
			discovered: true,
		},
		{
			type: "coast_mines",
			name: "Abyssal Extraction Ward",
			q: coastMinesTile.q,
			r: coastMinesTile.r,
			discovered: false,
		},
		{
			type: "science_campus",
			name: "Archive Campus",
			q: scienceCampusTile.q,
			r: scienceCampusTile.r,
			discovered: false,
		},
		{
			type: "northern_cult_site",
			name: "Cult Wards",
			q: northernCultTile.q,
			r: northernCultTile.r,
			discovered: false,
		},
		{
			type: "deep_sea_gateway",
			name: "Gateway Spine",
			q: deepSeaGatewayTile.q,
			r: deepSeaGatewayTile.r,
			discovered: false,
		},
	];

	paintDistrictArchetypes(sectorCells, pointsOfInterest);
	assignDistrictAnchors(sectorCells, pointsOfInterest);

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

	const sectorStructures = generateSectorStructurePlan({
		worldSeed: config.worldSeed,
		sectorCells,
		pointsOfInterest,
	});

	// Build the partial result so breach zone generation can reference it
	const partialResult: GeneratedEcumenopolisData = {
		ecumenopolis: {
			width,
			height,
			spawnSectorId: "command_arcology",
			spawnAnchorKey: tileKey(homeBaseTile.q, homeBaseTile.r),
		},
		sectorCells,
		pointsOfInterest,
		cityInstances,
		sectorStructures,
		breachZones: [],
	};

	const breachZones = generateBreachZones(partialResult);

	return {
		...partialResult,
		breachZones,
	};
}
