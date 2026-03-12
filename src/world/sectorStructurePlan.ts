import { getCityComposites, CITY_MODELS } from "../city/catalog/cityCatalog";
import type {
	CityCompositeDefinition,
	CityFamily,
	CityPlacementLayer,
	CityZone,
} from "../city/config/types";
import type { CityEdgeDirection } from "../city/topology";
import {
	ECUMENOPOLIS_MODEL_ATLAS,
	type ZoneType,
} from "../config/ecumenopolisAtlas";
import type { WorldPoiType } from "./contracts";
import {
	type AdjacencyContext,
	getDetailCandidates,
	getDetailCount,
	getWallCandidatesForContext,
	selectModelByAdjacency,
	selectWallVariant,
} from "./adjacencyValidation";
import { getAvailableSlots } from "./constructionSystem";
import { getDistrictStructures } from "./districtStructures";
import type {
	GeneratedSectorCell,
	GeneratedSectorPointOfInterest,
} from "./generation";

export interface GeneratedSectorStructure {
	districtStructureId: string;
	anchorKey: string;
	q: number;
	r: number;
	modelId: string;
	placementLayer: CityPlacementLayer;
	edge: CityEdgeDirection | null;
	rotationQuarterTurns: 0 | 1 | 2 | 3;
	offsetX: number;
	offsetY: number;
	offsetZ: number;
	targetSpan: number;
	sectorArchetype: string;
	source: "seeded_district" | "boundary" | "landmark" | "constructed";
	controllerFaction: string | null;
}

const EDGE_RULES: readonly { edge: CityEdgeDirection; dq: number; dr: number }[] = [
	{ edge: "north", dq: 0, dr: -1 },
	{ edge: "east", dq: 1, dr: 0 },
	{ edge: "south", dq: 0, dr: 1 },
	{ edge: "west", dq: -1, dr: 0 },
] as const;

function cellKey(q: number, r: number) {
	return `${q},${r}`;
}

function hash(seed: number, ...values: number[]) {
	let state = seed >>> 0;
	for (const value of values) {
		state = Math.imul(state ^ (value + 0x9e3779b9), 0x85ebca6b) >>> 0;
		state ^= state >>> 13;
	}
	return state >>> 0;
}

function pickDeterministic<T>(items: T[], seed: number) {
	if (items.length === 0) {
		return null;
	}
	return items[seed % items.length] ?? null;
}

function getZoneCandidates(zone: CityZone, families: CityFamily[]) {
	return CITY_MODELS.filter(
		(model) =>
			families.includes(model.family) && model.zoneAffinity.includes(zone),
	).sort((a, b) => a.id.localeCompare(b.id));
}

function getAnyFamilyCandidates(families: CityFamily[]) {
	return CITY_MODELS.filter((model) => families.includes(model.family)).sort((a, b) =>
		a.id.localeCompare(b.id),
	);
}

function getBoundaryFamilies(cell: GeneratedSectorCell) {
	if (!cell.passable || cell.structuralZone === "breach") {
		return ["wall", "column"] as CityFamily[];
	}
	if (cell.structuralZone === "transit") {
		return ["door", "wall"] as CityFamily[];
	}
	return ["wall", "door"] as CityFamily[];
}

function parseAnchorKey(anchorKey: string) {
	const [q, r] = anchorKey.split(",").map((value) => Number.parseInt(value, 10));
	return { q, r };
}

function getAnchorCells(
	sectorCells: GeneratedSectorCell[],
) {
	const anchors = new Map<string, GeneratedSectorCell[]>();
	for (const cell of sectorCells) {
		const group = anchors.get(cell.anchorKey);
		if (group) {
			group.push(cell);
			continue;
		}
		anchors.set(cell.anchorKey, [cell]);
	}
	return anchors;
}

function getDominantZone(cells: GeneratedSectorCell[]) {
	const counts = new Map<string, number>();
	for (const cell of cells) {
		counts.set(cell.structuralZone, (counts.get(cell.structuralZone) ?? 0) + 1);
	}
	return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "transit";
}

function getCompositeIdForZone(zone: string) {
	switch (zone) {
		case "command":
			return "substation_core";
		case "fabrication":
			return "fabrication_hub";
		case "storage":
			return "storage_block";
		case "habitation":
			return "tower_stack";
		case "power":
			return "power_sink_array";
		case "breach":
			return "cult_incursion_structure";
		case "transit":
		default:
			return "relay_spine";
	}
}

function getSupportFamiliesForZone(zone: string) {
	switch (zone) {
		case "fabrication":
		case "storage":
			return ["utility", "prop"] as CityFamily[];
		case "power":
			return ["utility", "detail"] as CityFamily[];
		case "habitation":
			return ["prop", "detail"] as CityFamily[];
		case "breach":
			return ["detail", "column"] as CityFamily[];
		case "command":
			return ["column", "utility"] as CityFamily[];
		case "transit":
		default:
			return ["utility", "detail"] as CityFamily[];
	}
}

function buildAdjacencyContext(
	cell: GeneratedSectorCell,
	cellsByKey: Map<string, GeneratedSectorCell>,
	existingCompositeRoles: string[] = [],
): AdjacencyContext {
	const zone = normalizeZone(cell.structuralZone) as ZoneType;
	const getNeighborZone = (dq: number, dr: number): ZoneType | null => {
		const n = cellsByKey.get(cellKey(cell.q + dq, cell.r + dr));
		return n ? (normalizeZone(n.structuralZone) as ZoneType) : null;
	};
	const neighbors = {
		north: getNeighborZone(0, -1),
		east: getNeighborZone(1, 0),
		south: getNeighborZone(0, 1),
		west: getNeighborZone(-1, 0),
	};
	const isZoneBoundary = Object.values(neighbors).some(
		(nz) => nz !== null && nz !== zone,
	);
	const hasPortalAccess = cell.passable && isZoneBoundary;
	const neighborTags: string[] = [];
	for (const nz of Object.values(neighbors)) {
		if (nz) {
			neighborTags.push(`${nz}_zone`);
		}
	}
	return {
		zone,
		neighbors,
		existingCompositeRoles,
		neighborTags,
		isZoneBoundary,
		hasPortalAccess,
	};
}

function chooseSupportModel(zone: string, seed: number, context?: AdjacencyContext) {
	const families = getSupportFamiliesForZone(zone);
	const normalizedZone = normalizeZone(zone);

	// Use atlas-based adjacency scoring when context is available
	if (context) {
		const atlasFamily = families.flatMap((f) =>
			f === "detail" ? ["detail_signage", "detail_panel", "detail_pipework"] : [f],
		);
		const atlasCandidates = ECUMENOPOLIS_MODEL_ATLAS.filter(
			(m) =>
				atlasFamily.includes(m.family) &&
				m.zoneAffinity.includes(normalizedZone as ZoneType),
		);
		if (atlasCandidates.length > 0) {
			const selected = selectModelByAdjacency(atlasCandidates, context, seed);
			if (selected) {
				// Return cityCatalog model if available, otherwise construct minimal result
				const catalogModel = CITY_MODELS.find((c) => c.id === selected.id);
				return catalogModel ?? null;
			}
		}
	}

	const zoneCandidates = getZoneCandidates(normalizedZone, families);
	return (
		pickDeterministic(zoneCandidates, seed) ??
		pickDeterministic(getAnyFamilyCandidates(families), seed)
	);
}

function chooseBoundaryModel(
	cell: GeneratedSectorCell,
	_edge: CityEdgeDirection,
	seed: number,
	context?: AdjacencyContext,
) {
	if (context) {
		const wallCandidates = getWallCandidatesForContext(context);
		if (wallCandidates.length > 0) {
			const selected = selectModelByAdjacency(wallCandidates, context, seed);
			if (selected) {
				// Return in cityCatalog-compatible shape
				const catalogModel = CITY_MODELS.find((m) => m.id === selected.id);
				return catalogModel ?? null;
			}
		}
	}
	const families = getBoundaryFamilies(cell);
	const zone = normalizeZone(cell.structuralZone);
	const zoneCandidates = getZoneCandidates(zone, families);
	return (
		pickDeterministic(zoneCandidates, seed) ??
		pickDeterministic(getAnyFamilyCandidates(families), seed)
	);
}

function normalizeZone(zone: string): CityZone {
	switch (zone) {
		case "command":
			return "core";
		case "transit":
			return "corridor";
		case "fabrication":
			return "fabrication";
		case "storage":
			return "storage";
		case "habitation":
			return "habitation";
		case "power":
		case "breach":
		default:
			return "power";
	}
}

function getPoiCompositeTags(poiType: WorldPoiType) {
	switch (poiType) {
		case "home_base":
			return ["core", "service"];
		case "coast_mines":
			return ["service", "transit", "power"];
		case "science_campus":
			return ["archive", "research", "tower"];
		case "northern_cult_site":
			return ["hostile", "fortress"];
		case "deep_sea_gateway":
			return ["transit", "power"];
	}
}

function getPoiComposites(poiType: WorldPoiType) {
	const tags = getPoiCompositeTags(poiType);
	const composites = getCityComposites().filter((composite) =>
		tags.some((tag) => composite.tags.includes(tag)),
	);
	return composites.length > 0 ? composites : getCityComposites();
}

function expandComposite(
	composite: CityCompositeDefinition,
	anchor: { q: number; r: number },
	sectorArchetype: string,
	seed: number,
	offset = { x: 0, z: 0 },
): GeneratedSectorStructure[] {
	return composite.parts.map((part, index) => ({
		districtStructureId: composite.id,
		anchorKey: `${anchor.q},${anchor.r}`,
		q: anchor.q,
		r: anchor.r,
		modelId: part.modelId,
		placementLayer: "structure",
		edge: null,
		rotationQuarterTurns:
			part.rotationQuarterTurns ?? ((hash(seed, index) % 4) as 0 | 1 | 2 | 3),
		offsetX: part.offset.x + offset.x,
		offsetY: part.offset.y,
		offsetZ: part.offset.z + offset.z,
		targetSpan: 2,
		sectorArchetype,
		source: "landmark",
		controllerFaction: null,
	}));
}

function getDistrictCompositePlacements(poiType: WorldPoiType) {
	const structures = getDistrictStructures({
		poiType,
		state: poiType === "home_base" || poiType === "coast_mines" ? "founded" : "surveyed",
	});
	// Use construction system slots for positioning instead of hardcoded offsets
	const slots = getAvailableSlots(poiType, []);
	return structures
		.map((structure, index) => ({
			compositeId: structure.compositeId,
			offset: slots[index]?.offset ?? { x: 0, z: 0 },
		}))
		.slice(0, slots.length);
}

export function generateSectorStructurePlan(args: {
	worldSeed: number;
	sectorCells: GeneratedSectorCell[];
	pointsOfInterest: GeneratedSectorPointOfInterest[];
}) {
	const { worldSeed, sectorCells, pointsOfInterest } = args;
	const cellsByKey = new Map(sectorCells.map((cell) => [cellKey(cell.q, cell.r), cell]));
	const placements: GeneratedSectorStructure[] = [];
	const anchorCells = getAnchorCells(sectorCells);
	const poiByAnchor = new Map(
		pointsOfInterest.map((poi) => [cellKey(poi.q, poi.r), poi] as const),
	);

	for (const [anchorKey, cells] of anchorCells) {
		const anchor = parseAnchorKey(anchorKey);
		const anchorSeed = hash(worldSeed, anchor.q, anchor.r);
		const poi = poiByAnchor.get(anchorKey);
		const dominantZone = getDominantZone(cells);
		const sectorArchetype = cells[0]?.sectorArchetype ?? "service_plate";

		if (poi) {
			const compositeCandidates = getPoiComposites(poi.type);
			const byId = new Map(compositeCandidates.map((composite) => [composite.id, composite]));
			for (const entry of getDistrictCompositePlacements(poi.type)) {
				const composite =
					byId.get(entry.compositeId) ??
					pickDeterministic(
						compositeCandidates,
						hash(worldSeed, poi.q, poi.r, compositeCandidates.length),
					);
				if (!composite) {
					continue;
				}
				placements.push(
					...expandComposite(
						composite,
						{ q: poi.q, r: poi.r },
						poi.type,
						hash(worldSeed, poi.q, poi.r, entry.offset.x, entry.offset.z, 777),
						entry.offset,
					),
				);
			}
			continue;
		}

		const genericComposite = getCityComposites().find(
			(composite) => composite.id === getCompositeIdForZone(dominantZone),
		);
		if (genericComposite) {
			placements.push(
				...expandComposite(
					genericComposite,
					anchor,
					sectorArchetype,
					hash(anchorSeed, 301),
				),
			);
		}

		// Build adjacency context for the primary cell in this anchor group
		const primaryCell = cells[0];
		const anchorContext = primaryCell
			? buildAdjacencyContext(primaryCell, cellsByKey)
			: undefined;

		const supportModel = chooseSupportModel(dominantZone, hash(anchorSeed, 611), anchorContext);
		if (supportModel) {
			placements.push({
				districtStructureId:
					supportModel.compositeEligibility[0] ?? getCompositeIdForZone(dominantZone),
				anchorKey,
				q: anchor.q,
				r: anchor.r,
				modelId: supportModel.id,
				placementLayer:
					supportModel.family === "detail"
						? "detail"
						: supportModel.family === "roof"
							? "roof"
							: "prop",
				edge: null,
				rotationQuarterTurns: (hash(anchorSeed, 901) % 4) as 0 | 1 | 2 | 3,
				offsetX: 0,
				offsetY: supportModel.family === "roof" ? 1.85 : supportModel.family === "detail" ? 0.18 : 0,
				offsetZ: 0,
				targetSpan:
					supportModel.family === "detail"
						? 0.8
						: supportModel.family === "utility"
							? 1.2
							: 1.0,
				sectorArchetype,
				source: "seeded_district",
				controllerFaction: null,
			});
		}

		// Place adjacency-aware detail elements on zone boundary cells
		if (anchorContext && anchorContext.isZoneBoundary) {
			const detailZone = normalizeZone(dominantZone) as ZoneType;
			const detailCount = getDetailCount(
				detailZone,
				true,
				hash(anchorSeed, 421),
			);
			const detailCandidates = getDetailCandidates(detailZone, anchorContext);
			for (let d = 0; d < detailCount && detailCandidates.length > 0; d++) {
				const detailModel = selectModelByAdjacency(
					detailCandidates,
					anchorContext,
					hash(anchorSeed, 500 + d),
				);
				if (!detailModel) break;
				placements.push({
					districtStructureId: getCompositeIdForZone(dominantZone),
					anchorKey,
					q: anchor.q,
					r: anchor.r,
					modelId: detailModel.id,
					placementLayer: "detail",
					edge: null,
					rotationQuarterTurns: (hash(anchorSeed, 550 + d) % 4) as 0 | 1 | 2 | 3,
					offsetX: ((hash(anchorSeed, 600 + d) % 5) - 2) * 0.3,
					offsetY: 0.15 + (hash(anchorSeed, 650 + d) % 3) * 0.4,
					offsetZ: ((hash(anchorSeed, 700 + d) % 5) - 2) * 0.3,
					targetSpan: 0.6,
					sectorArchetype,
					source: "seeded_district",
					controllerFaction: null,
				});
			}
		}
	}

	for (const cell of sectorCells) {
		const baseSeed = hash(worldSeed, cell.q, cell.r);
		const anchorKey = cell.anchorKey;
		for (const rule of EDGE_RULES) {
			const neighbor = cellsByKey.get(cellKey(cell.q + rule.dq, cell.r + rule.dr));
			const boundary =
				!neighbor ||
				neighbor.passable !== cell.passable ||
				neighbor.structuralZone !== cell.structuralZone;

			if (!boundary) {
				continue;
			}

			const boundaryContext = buildAdjacencyContext(cell, cellsByKey);
			const boundaryModel = chooseBoundaryModel(cell, rule.edge, hash(baseSeed, rule.dq, rule.dr), boundaryContext);
			if (!boundaryModel) {
				continue;
			}

			placements.push({
				districtStructureId:
					boundaryModel.family === "door" ? "transit_node" : "defensive_gate",
				anchorKey,
				q: cell.q,
				r: cell.r,
				modelId: boundaryModel.id,
				placementLayer: "structure",
				edge: rule.edge,
				rotationQuarterTurns:
					rule.edge === "north"
						? 0
						: rule.edge === "east"
							? 1
							: rule.edge === "south"
								? 2
								: 3,
				offsetX: 0,
				offsetY: 0,
				offsetZ: 0,
				targetSpan:
					boundaryModel.family === "door"
						? 1.45
						: boundaryModel.family === "column"
							? 0.7
							: 1.95,
				sectorArchetype: cell.sectorArchetype,
				source: "boundary",
				controllerFaction: null,
			});
		}
	}

	return placements;
}
