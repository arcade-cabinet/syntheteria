import { getCityModelById } from "../catalog/cityCatalog";
import type { CityLayoutScenario } from "../config/types";

export interface ResolvedCityPlacement {
	cellX: number;
	cellY: number;
	elevation: number;
	layer: CityLayoutScenario["placements"][number]["layer"];
	modelId: string;
	position: {
		x: number;
		y: number;
		z: number;
	};
	rotationY: number;
	targetSpan: number;
}

function edgeOffset(
	cellSize: number,
	edge: CityLayoutScenario["placements"][number]["edge"],
) {
	switch (edge) {
		case "north":
			return { x: 0, z: -cellSize * 0.48 };
		case "east":
			return { x: cellSize * 0.48, z: 0 };
		case "south":
			return { x: 0, z: cellSize * 0.48 };
		case "west":
			return { x: -cellSize * 0.48, z: 0 };
		default:
			return { x: 0, z: 0 };
	}
}

function getTargetSpan(
	scenario: CityLayoutScenario,
	layer: CityLayoutScenario["placements"][number]["layer"],
) {
	if (layer === "structure") {
		return scenario.cellSize * 0.82;
	}
	if (layer === "detail") {
		return scenario.cellSize * 0.45;
	}
	return scenario.cellSize * 0.88;
}

function getElevation(
	layer: CityLayoutScenario["placements"][number]["layer"],
) {
	if (layer === "roof") {
		return 1.8;
	}
	if (layer === "detail") {
		return 0.7;
	}
	if (layer === "prop") {
		return 0.3;
	}
	return 0;
}

export function resolveCityPlacement(
	scenario: CityLayoutScenario,
	placement: CityLayoutScenario["placements"][number],
): ResolvedCityPlacement | null {
	const model = getCityModelById(placement.modelId);
	if (!model) {
		return null;
	}

	const centerX =
		(placement.cellX - scenario.gridWidth / 2) * scenario.cellSize +
		scenario.cellSize / 2;
	const centerZ =
		(placement.cellY - scenario.gridHeight / 2) * scenario.cellSize +
		scenario.cellSize / 2;
	const offset = edgeOffset(scenario.cellSize, placement.edge);
	const elevation = getElevation(placement.layer);

	return {
		modelId: placement.modelId,
		layer: placement.layer,
		cellX: placement.cellX,
		cellY: placement.cellY,
		elevation,
		position: {
			x: centerX + offset.x,
			y: elevation,
			z: centerZ + offset.z,
		},
		rotationY: (Math.PI / 2) * placement.rotationQuarterTurns,
		targetSpan: getTargetSpan(scenario, placement.layer),
	};
}

export function resolveCityScenarioPlacements(scenario: CityLayoutScenario) {
	return scenario.placements
		.map((placement) => resolveCityPlacement(scenario, placement))
		.filter(
			(placement): placement is ResolvedCityPlacement => placement !== null,
		);
}
