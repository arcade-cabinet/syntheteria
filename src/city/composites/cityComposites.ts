import type { CityCompositeDefinition } from "../config/types";

export const CITY_COMPOSITES: CityCompositeDefinition[] = [
	{
		id: "tower_stack",
		label: "Mixed-Use Tower Stack",
		tags: ["tower", "vertical", "core"],
		gameplayRole:
			"Habitation and command tower shell for multi-level city cores.",
		parts: [
			{ modelId: "floortile_basic2", offset: { x: 0, y: 0, z: 0 } },
			{ modelId: "column_3", offset: { x: -0.8, y: 0, z: -0.8 } },
			{ modelId: "column_3", offset: { x: 0.8, y: 0, z: -0.8 } },
			{ modelId: "column_3", offset: { x: -0.8, y: 0, z: 0.8 } },
			{ modelId: "column_3", offset: { x: 0.8, y: 0, z: 0.8 } },
			{ modelId: "walls_wall_5", offset: { x: 0, y: 0, z: -0.98 } },
			{
				modelId: "walls_window_wall_sidea",
				offset: { x: 0.98, y: 0, z: 0 },
				rotationQuarterTurns: 1,
			},
			{
				modelId: "walls_window_wall_sideb",
				offset: { x: -0.98, y: 0, z: 0 },
				rotationQuarterTurns: 3,
			},
			{
				modelId: "walls_doorsingle_wall_sidea",
				offset: { x: 0, y: 0, z: 0.98 },
				rotationQuarterTurns: 2,
			},
			{ modelId: "rooftile_plate2", offset: { x: 0, y: 2.2, z: 0 } },
			{
				modelId: "staircase",
				offset: { x: 0.45, y: 0, z: 0.45 },
				rotationQuarterTurns: 1,
			},
		],
	},
	{
		id: "service_block",
		label: "Service Block",
		tags: ["service", "fabrication", "storage"],
		gameplayRole:
			"Utility-heavy room shell for storage, fabrication, or power jobs.",
		parts: [
			{ modelId: "floortile_empty", offset: { x: 0, y: 0, z: 0 } },
			{
				modelId: "walls_doordouble_wall_sidea",
				offset: { x: 0, y: 0, z: -0.98 },
			},
			{
				modelId: "walls_wall_empty",
				offset: { x: 0.98, y: 0, z: 0 },
				rotationQuarterTurns: 1,
			},
			{
				modelId: "walls_wall_empty",
				offset: { x: -0.98, y: 0, z: 0 },
				rotationQuarterTurns: 3,
			},
			{
				modelId: "walls_wall_2",
				offset: { x: 0, y: 0, z: 0.98 },
				rotationQuarterTurns: 2,
			},
			{ modelId: "props_containerfull", offset: { x: -0.45, y: 0, z: 0.15 } },
			{ modelId: "props_shelf_tall", offset: { x: 0.45, y: 0, z: 0.15 } },
			{ modelId: "rooftile_pipes1", offset: { x: 0, y: 1.9, z: 0 } },
		],
	},
	{
		id: "fabrication_hub",
		label: "Fabrication Hub",
		tags: ["fabrication", "power", "workshop"],
		gameplayRole: "Workshop cluster with compute, teleport, and utility props.",
		parts: [
			{ modelId: "floortile_basic", offset: { x: -1, y: 0, z: 0 } },
			{ modelId: "floortile_basic2", offset: { x: 1, y: 0, z: 0 } },
			{ modelId: "props_computer", offset: { x: -1, y: 0, z: -0.15 } },
			{ modelId: "props_computersmall", offset: { x: 1, y: 0, z: -0.15 } },
			{ modelId: "props_teleporter_1", offset: { x: 0, y: 0, z: 0.75 } },
			{
				modelId: "details_details_pipes_long",
				offset: { x: 0, y: 1.4, z: -0.8 },
			},
			{ modelId: "rooftile_details", offset: { x: 0, y: 1.95, z: 0 } },
		],
	},
];
