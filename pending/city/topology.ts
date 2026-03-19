import type { CityAssemblyContract, CityCell } from "./assemblyContract";

export const EDGE_DIRECTIONS = ["north", "east", "south", "west"] as const;
export type CityEdgeDirection = (typeof EDGE_DIRECTIONS)[number];

export const EDGE_DELTAS: Record<
	CityEdgeDirection,
	{ dx: number; dy: number }
> = {
	north: { dx: 0, dy: -1 },
	east: { dx: 1, dy: 0 },
	south: { dx: 0, dy: 1 },
	west: { dx: -1, dy: 0 },
};

export function cityCellKey(x: number, y: number) {
	return `${x},${y}`;
}

export function getCityCell(
	contract: CityAssemblyContract,
	x: number,
	y: number,
) {
	return contract.cells.find((cell) => cell.x === x && cell.y === y) ?? null;
}

export function getCityNeighbor(
	cell: CityCell,
	contract: CityAssemblyContract,
	edge: CityEdgeDirection,
) {
	const delta = EDGE_DELTAS[edge];
	return getCityCell(contract, cell.x + delta.dx, cell.y + delta.dy);
}
