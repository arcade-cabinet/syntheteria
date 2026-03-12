export type CityModuleType =
	| "core"
	| "power"
	| "fabrication"
	| "storage"
	| "habitation"
	| "corridor";

export interface CityCell {
	x: number;
	y: number;
	module: CityModuleType;
	passable: boolean;
}

export interface CityAssemblyContract {
	cellSize: number;
	gridWidth: number;
	gridHeight: number;
	entryCell: { x: number; y: number };
	cells: CityCell[];
}

export const CITY_CELL_SIZE = 2;

export function buildBlankCityAssembly(seed: number): CityAssemblyContract {
	const gridWidth = 14;
	const gridHeight = 14;
	const cells: CityCell[] = [];
	const centerX = Math.floor(gridWidth / 2);
	const centerY = Math.floor(gridHeight / 2);

	for (let y = 0; y < gridHeight; y++) {
		for (let x = 0; x < gridWidth; x++) {
			const edge =
				x === 0 || y === 0 || x === gridWidth - 1 || y === gridHeight - 1;
			const isCross = x === centerX || y === centerY;
			const ring =
				(x === centerX - 2 || x === centerX + 2) &&
				y >= centerY - 2 &&
				y <= centerY + 2;
			const mirrored = (seed + x * 17 + y * 31) % 5;
			const module: CityModuleType = edge
				? "storage"
				: isCross
					? "corridor"
					: ring
						? "power"
						: mirrored === 0
							? "fabrication"
							: mirrored === 1
								? "storage"
								: mirrored === 2
									? "habitation"
									: "core";

			cells.push({
				x,
				y,
				module,
				passable:
					module === "corridor" ||
					(module === "core" &&
						Math.abs(x - centerX) <= 1 &&
						Math.abs(y - centerY) <= 1),
			});
		}
	}

	return {
		cellSize: CITY_CELL_SIZE,
		gridWidth,
		gridHeight,
		entryCell: { x: centerX, y: gridHeight - 2 },
		cells,
	};
}
