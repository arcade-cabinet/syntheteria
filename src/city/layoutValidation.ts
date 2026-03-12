import type { CityAssemblyContract, CityCell } from "./assemblyContract";
import { getCityModelById } from "./catalog/cityCatalog";
import type { CityLayoutIssueDefinition } from "./config/types";
import { type CityLayoutPlan, getPlacementsForCell } from "./layoutPlan";
import {
	cityCellKey,
	EDGE_DIRECTIONS,
	getCityCell,
	getCityNeighbor,
} from "./topology";

export interface CityLayoutIssue extends CityLayoutIssueDefinition {}

function bfsReachablePassableCells(contract: CityAssemblyContract) {
	const entry = getCityCell(
		contract,
		contract.entryCell.x,
		contract.entryCell.y,
	);
	if (!entry?.passable) {
		return new Set<string>();
	}
	const visited = new Set<string>();
	const queue = [entry];

	while (queue.length > 0) {
		const current = queue.shift()!;
		const key = cityCellKey(current.x, current.y);
		if (visited.has(key)) {
			continue;
		}
		visited.add(key);
		for (const edge of EDGE_DIRECTIONS) {
			const neighbor = getCityNeighbor(current, contract, edge);
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
	const entry = getCityCell(
		plan.contract,
		plan.contract.entryCell.x,
		plan.contract.entryCell.y,
	);
	if (!entry?.passable) {
		issues.push({
			code: "entry_not_passable",
			message: "The city entry cell must remain passable.",
			cellX: plan.contract.entryCell.x,
			cellY: plan.contract.entryCell.y,
		});
	}

	const reachable = bfsReachablePassableCells(plan.contract);
	for (const cell of plan.contract.cells) {
		if (getPlacementsForCell(plan, cell.x, cell.y, "floor").length === 0) {
			issues.push({
				code: "missing_floor",
				message: "Every city cell requires a floor placement.",
				cellX: cell.x,
				cellY: cell.y,
			});
		}
		if (
			cell.passable &&
			getPlacementsForCell(plan, cell.x, cell.y, "prop").length > 0
		) {
			issues.push({
				code: "prop_on_corridor",
				message:
					"Passable circulation cells should not contain blocking props.",
				cellX: cell.x,
				cellY: cell.y,
			});
		}
		if (
			cell.passable &&
			getPlacementsForCell(plan, cell.x, cell.y, "roof").length > 0
		) {
			issues.push({
				code: "roof_on_passable_cell",
				message: "Open circulation cells should not receive roof closures.",
				cellX: cell.x,
				cellY: cell.y,
			});
		}
		if (cell.passable && !reachable.has(`${cell.x},${cell.y}`)) {
			issues.push({
				code: "disconnected_passable_cell",
				message: "All passable cells must remain connected to the entry path.",
				cellX: cell.x,
				cellY: cell.y,
			});
		}

		let hasDoor = false;
		for (const edge of EDGE_DIRECTIONS) {
			const structure = getPlacementsForCell(
				plan,
				cell.x,
				cell.y,
				"structure",
			).find((placement) => placement.edge === edge);
			const neighbor = getCityNeighbor(cell, plan.contract, edge);
			if (!neighbor && !structure) {
				issues.push({
					code: "missing_perimeter_structure",
					message: "Exterior edges must be sealed with a wall or door asset.",
					cellX: cell.x,
					cellY: cell.y,
				});
			}
			const structureModel = structure
				? getCityModelById(structure.assetId)
				: null;
			if (structureModel?.family === "door") {
				hasDoor = true;
				if (!neighbor?.passable) {
					issues.push({
						code: "invalid_door_transition",
						message:
							"Doors must connect enclosed cells to passable circulation.",
						cellX: cell.x,
						cellY: cell.y,
					});
				}
			}
		}

		if (!cell.passable) {
			const touchesPassable = EDGE_DIRECTIONS.some(
				(edge) => getCityNeighbor(cell, plan.contract, edge)?.passable,
			);
			if (touchesPassable && !hasDoor) {
				issues.push({
					code: "room_missing_access",
					message: "Enclosed rooms touching circulation must have a door.",
					cellX: cell.x,
					cellY: cell.y,
				});
			}
		}
	}
	return issues;
}
