import {
	buildBlankCityAssembly,
	type CityAssemblyContract,
	type CityCell,
	type CityModuleType,
} from "./assemblyContract";
import { type EdgeDirection, getCityAssetsForZone } from "./moduleCatalog";

export type CityPlacementLayer =
	| "floor"
	| "structure"
	| "roof"
	| "prop"
	| "detail";

export interface CityModulePlacement {
	assetId: string;
	cellX: number;
	cellY: number;
	layer: CityPlacementLayer;
	edge?: EdgeDirection;
	rotationQuarterTurns: 0 | 1 | 2 | 3;
}

export interface CityLayoutPlan {
	contract: CityAssemblyContract;
	placements: CityModulePlacement[];
}

const EDGE_DELTAS: Record<EdgeDirection, { dx: number; dy: number }> = {
	north: { dx: 0, dy: -1 },
	east: { dx: 1, dy: 0 },
	south: { dx: 0, dy: 1 },
	west: { dx: -1, dy: 0 },
};

function cellKey(x: number, y: number) {
	return `${x},${y}`;
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
	const index =
		hashSeed(seed, cell.x, cell.y, family.length + 17) % candidates.length;
	return candidates[index]?.id ?? null;
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

function getPreferredDoorEdge(
	contract: CityAssemblyContract,
	cell: CityCell,
	seed: number,
) {
	const candidates = (Object.keys(EDGE_DELTAS) as EdgeDirection[]).filter(
		(edge) => {
			const neighbor = getNeighbor(contract, cell.x, cell.y, edge);
			return Boolean(neighbor?.passable);
		},
	);

	if (candidates.length === 0) {
		return null;
	}

	const index = hashSeed(seed, cell.x, cell.y, 97) % candidates.length;
	return candidates[index] ?? null;
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
	const doorEdgeByCell = new Map<string, EdgeDirection>();

	for (const cell of contract.cells) {
		const floorAssetId =
			chooseAssetId(seed, cell, "floor") ??
			getCityAssetsForZone("core", "floor")[0]?.id;
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

			const propAssetId = chooseAssetId(seed, cell, "prop");
			if (propAssetId) {
				placements.push({
					assetId: propAssetId,
					cellX: cell.x,
					cellY: cell.y,
					layer: "prop",
					rotationQuarterTurns: (hashSeed(seed, cell.x, cell.y, 53) % 4) as
						| 0
						| 1
						| 2
						| 3,
				});
			}
		} else {
			const detailAssetId = chooseAssetId(seed, cell, "detail");
			if (detailAssetId && hashSeed(seed, cell.x, cell.y, 29) % 3 === 0) {
				placements.push({
					assetId: detailAssetId,
					cellX: cell.x,
					cellY: cell.y,
					layer: "detail",
					rotationQuarterTurns: (hashSeed(seed, cell.x, cell.y, 71) % 4) as
						| 0
						| 1
						| 2
						| 3,
				});
			}
		}

		if (!cell.passable) {
			const doorEdge = getPreferredDoorEdge(contract, cell, seed);
			if (doorEdge) {
				doorEdgeByCell.set(cellKey(cell.x, cell.y), doorEdge);
			}
		}
	}

	for (const cell of contract.cells) {
		for (const edge of Object.keys(EDGE_DELTAS) as EdgeDirection[]) {
			const neighbor = getNeighbor(contract, cell.x, cell.y, edge);
			const isBoundary = !neighbor;
			const requiresStructure =
				isBoundary || Boolean(neighbor && neighbor.passable !== cell.passable);

			if (!requiresStructure) {
				continue;
			}

			if (cell.passable && neighbor && !neighbor.passable) {
				continue;
			}

			const useDoor =
				doorEdgeByCell.get(cellKey(cell.x, cell.y)) === edge &&
				!cell.passable &&
				Boolean(neighbor?.passable);
			const assetId = useDoor
				? chooseAssetId(seed, cell, "door")
				: chooseAssetId(seed, cell, "wall");
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

	return {
		contract,
		placements,
	};
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
