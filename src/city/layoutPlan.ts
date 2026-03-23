import {
	buildBlankCityAssembly,
	type CityAssemblyContract,
	type CityCell,
	type CityModuleType,
} from "./assemblyContract";
import type { CityModulePlacement, CityPlacementLayer } from "./config/types";
import { type EdgeDirection, getCityAssetsForZone } from "./moduleCatalog";
import { EDGE_DELTAS, EDGE_DIRECTIONS } from "./topology";

export interface CityLayoutPlan {
	contract: CityAssemblyContract;
	placements: CityModulePlacement[];
}

function hashSeed(seed: number, x: number, y: number, salt: number) {
	return Math.abs(Math.imul(seed ^ (x * 73856093) ^ (y * 19349663), salt));
}

function chooseAssetId(
	seed: number,
	cell: CityCell,
	family: "floor" | "wall" | "door" | "roof" | "prop" | "detail",
) {
	const candidates = getCityAssetsForZone(cell.module, family);
	if (candidates.length === 0) {
		return null;
	}
	return candidates[
		hashSeed(seed, cell.x, cell.y, family.length + 17) % candidates.length
	]?.id;
}

function getNeighbor(
	contract: CityAssemblyContract,
	x: number,
	y: number,
	edge: EdgeDirection,
) {
	const delta = EDGE_DELTAS[edge];
	return contract.cells.find(
		(cell) => cell.x === x + delta.dx && cell.y === y + delta.dy,
	);
}

function preferredDoorEdge(
	contract: CityAssemblyContract,
	cell: CityCell,
	seed: number,
) {
	const candidates = EDGE_DIRECTIONS.filter((edge) =>
		Boolean(getNeighbor(contract, cell.x, cell.y, edge)?.passable),
	);
	if (candidates.length === 0) {
		return null;
	}
	return (
		candidates[hashSeed(seed, cell.x, cell.y, 97) % candidates.length] ?? null
	);
}

function rotationForEdge(edge: EdgeDirection): 0 | 1 | 2 | 3 {
	switch (edge) {
		case "north":
			return 0;
		case "east":
			return 1;
		case "south":
			return 2;
		case "west":
			return 3;
	}
}

export function buildCityLayoutPlan(
	seed: number,
	contract: CityAssemblyContract = buildBlankCityAssembly(seed),
): CityLayoutPlan {
	const placements: CityModulePlacement[] = [];

	for (const cell of contract.cells) {
		const floorAssetId =
			chooseAssetId(seed, cell, "floor") ??
			getCityAssetsForZone("core" as CityModuleType, "floor")[0]?.id;
		if (floorAssetId) {
			placements.push({
				assetId: floorAssetId,
				cellX: cell.x,
				cellY: cell.y,
				layer: "floor",
				rotationQuarterTurns: 0,
			});
		}

		if (!cell.passable) {
			const roofAssetId = chooseAssetId(seed, cell, "roof");
			if (roofAssetId) {
				placements.push({
					assetId: roofAssetId,
					cellX: cell.x,
					cellY: cell.y,
					layer: "roof",
					rotationQuarterTurns: 0,
				});
			}
		}

		const roomAccentFamily = cell.passable ? "detail" : "prop";
		const roomAccentAsset = chooseAssetId(seed, cell, roomAccentFamily);
		if (roomAccentAsset && hashSeed(seed, cell.x, cell.y, 53) % 2 === 0) {
			placements.push({
				assetId: roomAccentAsset,
				cellX: cell.x,
				cellY: cell.y,
				layer: cell.passable ? "detail" : "prop",
				rotationQuarterTurns: (hashSeed(seed, cell.x, cell.y, 71) % 4) as
					| 0
					| 1
					| 2
					| 3,
			});
		}
	}

	for (const cell of contract.cells) {
		const doorEdge = !cell.passable
			? preferredDoorEdge(contract, cell, seed)
			: null;
		for (const edge of EDGE_DIRECTIONS) {
			const neighbor = getNeighbor(contract, cell.x, cell.y, edge);
			const needsStructure =
				!neighbor || Boolean(neighbor.passable !== cell.passable);
			if (!needsStructure) {
				continue;
			}
			if (cell.passable && neighbor && !neighbor.passable) {
				continue;
			}

			const family =
				doorEdge === edge && !cell.passable && neighbor?.passable
					? "door"
					: "wall";
			const assetId = chooseAssetId(seed, cell, family);
			if (!assetId) {
				continue;
			}
			placements.push({
				assetId,
				cellX: cell.x,
				cellY: cell.y,
				layer: "structure",
				edge,
				rotationQuarterTurns: rotationForEdge(edge),
			});
		}
	}

	return { contract, placements };
}

export function getPlacementsForCell(
	plan: CityLayoutPlan,
	x: number,
	y: number,
	layer?: CityPlacementLayer,
) {
	return plan.placements.filter(
		(placement) =>
			placement.cellX === x &&
			placement.cellY === y &&
			(layer ? placement.layer === layer : true),
	);
}
