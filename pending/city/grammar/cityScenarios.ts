import { selectZoneModel } from "../catalog/cityCatalog";
import type { CityLayoutScenario } from "../config/types";

function requireModelId(id: string | null | undefined, description: string) {
	if (!id) {
		throw new Error(
			`Missing city model for scenario requirement: ${description}`,
		);
	}
	return id;
}

export function buildCityLayoutScenarios(): CityLayoutScenario[] {
	const corridorFloor = requireModelId(
		selectZoneModel("corridor", "floor", ["hallway"])?.id ??
			selectZoneModel("corridor", "floor")?.id,
		"corridor floor",
	);
	const roomFloor = requireModelId(
		selectZoneModel("storage", "floor")?.id,
		"room floor",
	);
	const wall = requireModelId(selectZoneModel("core", "wall")?.id, "wall");
	const door = requireModelId(
		selectZoneModel("fabrication", "door")?.id,
		"door",
	);
	const roof = requireModelId(selectZoneModel("power", "roof")?.id, "roof");
	const prop = requireModelId(
		selectZoneModel("fabrication", "prop")?.id,
		"prop",
	);
	const detail = requireModelId(
		selectZoneModel("corridor", "detail")?.id,
		"detail",
	);

	return [
		{
			id: "minimal_base",
			label: "Minimal Base",
			description: "Single-room operational shell with a corridor entry.",
			gridWidth: 3,
			gridHeight: 3,
			cellSize: 2,
			placements: [
				{
					modelId: corridorFloor,
					cellX: 1,
					cellY: 2,
					layer: "floor",
					rotationQuarterTurns: 0,
				},
				{
					modelId: roomFloor,
					cellX: 1,
					cellY: 1,
					layer: "floor",
					rotationQuarterTurns: 0,
				},
				{
					modelId: wall,
					cellX: 1,
					cellY: 1,
					layer: "structure",
					edge: "north",
					rotationQuarterTurns: 0,
				},
				{
					modelId: wall,
					cellX: 1,
					cellY: 1,
					layer: "structure",
					edge: "east",
					rotationQuarterTurns: 1,
				},
				{
					modelId: wall,
					cellX: 1,
					cellY: 1,
					layer: "structure",
					edge: "west",
					rotationQuarterTurns: 3,
				},
				{
					modelId: door,
					cellX: 1,
					cellY: 1,
					layer: "structure",
					edge: "south",
					rotationQuarterTurns: 2,
				},
				{
					modelId: roof,
					cellX: 1,
					cellY: 1,
					layer: "roof",
					rotationQuarterTurns: 0,
				},
				{
					modelId: prop,
					cellX: 1,
					cellY: 1,
					layer: "prop",
					rotationQuarterTurns: 0,
				},
			],
		},
		{
			id: "corridor_facility",
			label: "Corridor Facility",
			description: "Longer circulation spine with utility detail accents.",
			gridWidth: 5,
			gridHeight: 3,
			cellSize: 2,
			placements: [
				...Array.from({ length: 5 }, (_, index) => ({
					modelId: corridorFloor,
					cellX: index,
					cellY: 1,
					layer: "floor" as const,
					rotationQuarterTurns: 0 as const,
				})),
				{
					modelId: detail,
					cellX: 1,
					cellY: 1,
					layer: "detail",
					rotationQuarterTurns: 0,
				},
				{
					modelId: detail,
					cellX: 3,
					cellY: 1,
					layer: "detail",
					rotationQuarterTurns: 2,
				},
				{
					modelId: roomFloor,
					cellX: 2,
					cellY: 0,
					layer: "floor",
					rotationQuarterTurns: 0,
				},
				{
					modelId: door,
					cellX: 2,
					cellY: 0,
					layer: "structure",
					edge: "south",
					rotationQuarterTurns: 2,
				},
				{
					modelId: wall,
					cellX: 2,
					cellY: 0,
					layer: "structure",
					edge: "north",
					rotationQuarterTurns: 0,
				},
				{
					modelId: roof,
					cellX: 2,
					cellY: 0,
					layer: "roof",
					rotationQuarterTurns: 0,
				},
			],
		},
		{
			id: "storage_block",
			label: "Storage Block",
			description: "Compact storage room using cargo door logic.",
			gridWidth: 3,
			gridHeight: 3,
			cellSize: 2,
			placements: [
				{
					modelId: roomFloor,
					cellX: 1,
					cellY: 1,
					layer: "floor",
					rotationQuarterTurns: 0,
				},
				{
					modelId: wall,
					cellX: 1,
					cellY: 1,
					layer: "structure",
					edge: "north",
					rotationQuarterTurns: 0,
				},
				{
					modelId: wall,
					cellX: 1,
					cellY: 1,
					layer: "structure",
					edge: "east",
					rotationQuarterTurns: 1,
				},
				{
					modelId: wall,
					cellX: 1,
					cellY: 1,
					layer: "structure",
					edge: "west",
					rotationQuarterTurns: 3,
				},
				{
					modelId: door,
					cellX: 1,
					cellY: 1,
					layer: "structure",
					edge: "south",
					rotationQuarterTurns: 2,
				},
				{
					modelId: prop,
					cellX: 1,
					cellY: 1,
					layer: "prop",
					rotationQuarterTurns: 1,
				},
				{
					modelId: roof,
					cellX: 1,
					cellY: 1,
					layer: "roof",
					rotationQuarterTurns: 0,
				},
			],
		},
	];
}

export const CITY_LAYOUT_SCENARIOS = buildCityLayoutScenarios();
