import type { CityAssemblyContract, CityCell } from "./assemblyContract";
import { type CityLayoutPlan, getPlacementsForCell } from "./layoutPlan";
import { type EdgeDirection, getCityAssetById } from "./moduleCatalog";

export interface CityLayoutIssue {
	code:
		| "entry_not_passable"
		| "disconnected_passable_cell"
		| "missing_floor"
		| "missing_perimeter_structure"
		| "room_missing_access"
		| "prop_on_corridor"
		| "roof_on_passable_cell";
	message: string;
	cellX?: number;
	cellY?: number;
}

const EDGE_DELTAS: Record<EdgeDirection, { dx: number; dy: number }> = {
	north: { dx: 0, dy: -1 },
	east: { dx: 1, dy: 0 },
	south: { dx: 0, dy: 1 },
	west: { dx: -1, dy: 0 },
};

function getCell(contract: CityAssemblyContract, x: number, y: number) {
	return contract.cells.find((cell) => cell.x === x && cell.y === y) ?? null;
}

function getNeighbor(
	cell: CityCell,
	contract: CityAssemblyContract,
	edge: EdgeDirection,
) {
	const delta = EDGE_DELTAS[edge];
	return getCell(contract, cell.x + delta.dx, cell.y + delta.dy);
}

function bfsReachablePassableCells(contract: CityAssemblyContract) {
	const entry = getCell(contract, contract.entryCell.x, contract.entryCell.y);
	if (!entry?.passable) {
		return new Set<string>();
	}

	const visited = new Set<string>();
	const queue = [entry];

	while (queue.length > 0) {
		const current = queue.shift()!;
		const key = `${current.x},${current.y}`;
		if (visited.has(key)) {
			continue;
		}
		visited.add(key);
		for (const edge of Object.keys(EDGE_DELTAS) as EdgeDirection[]) {
			const neighbor = getNeighbor(current, contract, edge);
			if (neighbor?.passable) {
				queue.push(neighbor);
			}
		}
	}

	return visited;
}

export function validateCityLayoutPlan(
	plan: CityLayoutPlan,
): CityLayoutIssue[] {
	const issues: CityLayoutIssue[] = [];
	const { contract } = plan;
	const entry = getCell(contract, contract.entryCell.x, contract.entryCell.y);

	if (!entry?.passable) {
		issues.push({
			code: "entry_not_passable",
			message: "The city entry cell must remain passable.",
			cellX: contract.entryCell.x,
			cellY: contract.entryCell.y,
		});
	}

	const reachable = bfsReachablePassableCells(contract);

	for (const cell of contract.cells) {
		const floorPlacements = getPlacementsForCell(plan, cell.x, cell.y, "floor");
		if (floorPlacements.length === 0) {
			issues.push({
				code: "missing_floor",
				message: "Every city cell must have a floor placement.",
				cellX: cell.x,
				cellY: cell.y,
			});
		}

		const props = getPlacementsForCell(plan, cell.x, cell.y, "prop");
		if (cell.passable && props.length > 0) {
			issues.push({
				code: "prop_on_corridor",
				message: "Passable cells should not be obstructed by room props.",
				cellX: cell.x,
				cellY: cell.y,
			});
		}

		const roofs = getPlacementsForCell(plan, cell.x, cell.y, "roof");
		if (cell.passable && roofs.length > 0) {
			issues.push({
				code: "roof_on_passable_cell",
				message: "Corridor and entry cells should not receive roof closures.",
				cellX: cell.x,
				cellY: cell.y,
			});
		}

		if (cell.passable && !reachable.has(`${cell.x},${cell.y}`)) {
			issues.push({
				code: "disconnected_passable_cell",
				message: "Passable cells must remain connected to the entry path.",
				cellX: cell.x,
				cellY: cell.y,
			});
		}

		let hasAccessDoor = false;
		for (const edge of Object.keys(EDGE_DELTAS) as EdgeDirection[]) {
			const structure = getPlacementsForCell(plan, cell.x, cell.y).find(
				(placement) =>
					placement.layer === "structure" && placement.edge === edge,
			);
			const neighbor = getNeighbor(cell, contract, edge);
			if (!neighbor && !structure) {
				issues.push({
					code: "missing_perimeter_structure",
					message: "Exterior edges must be sealed with a structure placement.",
					cellX: cell.x,
					cellY: cell.y,
				});
			}
			if (
				structure &&
				getCityAssetById(structure.assetId)?.family === "door" &&
				neighbor?.passable
			) {
				hasAccessDoor = true;
			}
		}

		if (!cell.passable) {
			const touchesPassable = (
				Object.keys(EDGE_DELTAS) as EdgeDirection[]
			).some((edge) => getNeighbor(cell, contract, edge)?.passable);
			if (touchesPassable && !hasAccessDoor) {
				issues.push({
					code: "room_missing_access",
					message: "Every enclosed room touching circulation must have a door.",
					cellX: cell.x,
					cellY: cell.y,
				});
			}
		}
	}

	return issues;
}
