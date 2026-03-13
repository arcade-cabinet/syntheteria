import type { CityCompositeDefinition } from "../config/types";

export const CITY_COMPOSITES: CityCompositeDefinition[] = [
	{
		id: "substation_core",
		label: "Substation Core",
		tags: ["core", "relay", "power", "service"],
		gameplayRole:
			"Primary command and relay shell for reclaiming a district into an operational substation.",
		parts: [
			{ modelId: "floortile_basic", offset: { x: 0, y: 0, z: 0 } },
			{ modelId: "column_3", offset: { x: -1, y: 0, z: -1 } },
			{ modelId: "column_3", offset: { x: 1, y: 0, z: -1 } },
			{ modelId: "column_3", offset: { x: -1, y: 0, z: 1 } },
			{ modelId: "column_3", offset: { x: 1, y: 0, z: 1 } },
			{ modelId: "walls_wall_4", offset: { x: 0, y: 0, z: -1 } },
			{
				modelId: "walls_window_wall_sidea",
				offset: { x: 1, y: 0, z: 0 },
				rotationQuarterTurns: 1,
			},
			{
				modelId: "walls_window_wall_sideb",
				offset: { x: -1, y: 0, z: 0 },
				rotationQuarterTurns: 3,
			},
			{
				modelId: "walls_doordouble_wall_sidea",
				offset: { x: 0, y: 0, z: 1 },
				rotationQuarterTurns: 2,
			},
			{ modelId: "props_computer", offset: { x: -0.5, y: 0, z: -0.15 } },
			{ modelId: "props_teleporter_1", offset: { x: 0.45, y: 0, z: 0.15 } },
			{ modelId: "rooftile_details", offset: { x: 0, y: 1.95, z: 0 } },
		],
	},
	{
		id: "tower_stack",
		label: "Mixed-Use Tower Stack",
		tags: ["tower", "vertical", "core"],
		gameplayRole:
			"Habitation and command tower shell for multi-level city cores.",
		parts: [
			{ modelId: "floortile_basic", offset: { x: 0, y: 0, z: 0 } },
			{ modelId: "column_3", offset: { x: -1, y: 0, z: -1 } },
			{ modelId: "column_3", offset: { x: 1, y: 0, z: -1 } },
			{ modelId: "column_3", offset: { x: -1, y: 0, z: 1 } },
			{ modelId: "column_3", offset: { x: 1, y: 0, z: 1 } },
			{ modelId: "walls_wall_5", offset: { x: 0, y: 0, z: -1 } },
			{
				modelId: "walls_window_wall_sidea",
				offset: { x: 1, y: 0, z: 0 },
				rotationQuarterTurns: 1,
			},
			{
				modelId: "walls_window_wall_sideb",
				offset: { x: -1, y: 0, z: 0 },
				rotationQuarterTurns: 3,
			},
			{
				modelId: "walls_doorsingle_wall_sidea",
				offset: { x: 0, y: 0, z: 1 },
				rotationQuarterTurns: 2,
			},
			{ modelId: "rooftile_plate2", offset: { x: 0, y: 2.2, z: 0 } },
			{
				modelId: "staircase",
				offset: { x: 0.55, y: 0, z: 0.55 },
				rotationQuarterTurns: 1,
			},
		],
	},
	{
		id: "relay_spine",
		label: "Relay Spine",
		tags: ["service", "relay", "transit"],
		gameplayRole:
			"Linear relay corridor that links command coverage, routing, and transit staging.",
		parts: [
			{ modelId: "floortile_basic", offset: { x: 0, y: 0, z: 0 } },
			{ modelId: "walls_wall_empty", offset: { x: -1, y: 0, z: -1 } },
			{ modelId: "walls_wall_empty", offset: { x: 1, y: 0, z: 1 } },
			{ modelId: "walls_doordouble_wall_sidea", offset: { x: 0, y: 0, z: -1 } },
			{
				modelId: "walls_doordouble_wall_sideb",
				offset: { x: 0, y: 0, z: 1 },
				rotationQuarterTurns: 2,
			},
			{ modelId: "props_teleporter_2", offset: { x: 0, y: 0, z: 0.45 } },
			{
				modelId: "details_details_pipes_long",
				offset: { x: 0, y: 1.35, z: 0 },
			},
			{ modelId: "rooftile_pipes2", offset: { x: 0, y: 1.9, z: 0 } },
		],
	},
	{
		id: "service_block",
		label: "Service Block",
		tags: ["service", "fabrication", "storage"],
		gameplayRole:
			"Utility-heavy room shell for storage, fabrication, or power jobs.",
		parts: [
			{ modelId: "floortile_basic", offset: { x: 0, y: 0, z: 0 } },
			{
				modelId: "walls_doordouble_wall_sidea",
				offset: { x: 0, y: 0, z: -1 },
			},
			{
				modelId: "walls_wall_empty",
				offset: { x: 1, y: 0, z: 0 },
				rotationQuarterTurns: 1,
			},
			{
				modelId: "walls_wall_empty",
				offset: { x: -1, y: 0, z: 0 },
				rotationQuarterTurns: 3,
			},
			{
				modelId: "walls_wall_2",
				offset: { x: 0, y: 0, z: 1 },
				rotationQuarterTurns: 2,
			},
			{ modelId: "props_containerfull", offset: { x: -0.45, y: 0, z: 0.15 } },
			{ modelId: "props_shelf_tall", offset: { x: 0.45, y: 0, z: 0.15 } },
			{ modelId: "rooftile_pipes1", offset: { x: 0, y: 1.9, z: 0 } },
		],
	},
	{
		id: "storage_block",
		label: "Storage Block",
		tags: ["service", "storage"],
		gameplayRole:
			"Cargo-heavy storage room used for salvage staging and logistics throughput.",
		parts: [
			{ modelId: "floortile_basic", offset: { x: 0, y: 0, z: 0 } },
			{ modelId: "walls_doordouble_wall_sidea", offset: { x: 0, y: 0, z: -1 } },
			{
				modelId: "walls_wall_2",
				offset: { x: 0, y: 0, z: 1 },
				rotationQuarterTurns: 2,
			},
			{
				modelId: "walls_wall_empty",
				offset: { x: -1, y: 0, z: 0 },
				rotationQuarterTurns: 3,
			},
			{
				modelId: "walls_wall_empty",
				offset: { x: 1, y: 0, z: 0 },
				rotationQuarterTurns: 1,
			},
			{ modelId: "props_containerfull", offset: { x: -0.45, y: 0, z: 0.1 } },
			{ modelId: "props_cratelong", offset: { x: 0.35, y: 0, z: 0.18 } },
			{
				modelId: "details_details_plate_long",
				offset: { x: -0.95, y: 0.5, z: 0 },
			},
			{
				modelId: "details_details_plate_small",
				offset: { x: 0.95, y: 0.5, z: 0 },
			},
			{ modelId: "rooftile_plate", offset: { x: 0, y: 1.9, z: 0 } },
		],
	},
	{
		id: "fabrication_hub",
		label: "Fabrication Hub",
		tags: ["fabrication", "power", "workshop"],
		gameplayRole: "Workshop cluster with compute, teleport, and utility props.",
		parts: [
			{ modelId: "floortile_basic", offset: { x: 0, y: 0, z: 0 } },
			{
				modelId: "walls_wall_empty",
				offset: { x: -1, y: 0, z: -1 },
				rotationQuarterTurns: 3,
			},
			{
				modelId: "walls_wall_empty",
				offset: { x: 1, y: 0, z: -1 },
				rotationQuarterTurns: 1,
			},
			{ modelId: "props_computer", offset: { x: -1, y: 0, z: -0.15 } },
			{ modelId: "props_computersmall", offset: { x: 1, y: 0, z: -0.15 } },
			{ modelId: "props_teleporter_1", offset: { x: 0, y: 0, z: 0.75 } },
			{
				modelId: "details_details_pipes_long",
				offset: { x: 0, y: 1.4, z: -0.8 },
			},
			{
				modelId: "details_details_vent_1",
				offset: { x: -0.95, y: 0.6, z: -0.1 },
			},
			{
				modelId: "details_details_output",
				offset: { x: 0.95, y: 1.0, z: -0.1 },
			},
			{ modelId: "rooftile_details", offset: { x: 0, y: 1.95, z: 0 } },
		],
	},
	{
		id: "defensive_gate",
		label: "Defensive Gate",
		tags: ["defense", "service"],
		gameplayRole:
			"Hardened gate shell for district defense and secured access control.",
		parts: [
			{ modelId: "floortile_basic", offset: { x: 0, y: 0, z: 0 } },
			{ modelId: "walls_doordouble_wall_sideb", offset: { x: 0, y: 0, z: 0 } },
			{ modelId: "walls_wall_5", offset: { x: 0, y: 0, z: -1 } },
			{
				modelId: "walls_wall_5",
				offset: { x: 0, y: 0, z: 1 },
				rotationQuarterTurns: 2,
			},
			{ modelId: "column_3", offset: { x: -1.55, y: 0, z: 0 } },
			{ modelId: "column_3", offset: { x: 1.55, y: 0, z: 0 } },
			{
				modelId: "details_details_triangles",
				offset: { x: -0.5, y: 1.5, z: -0.95 },
			},
			{
				modelId: "details_details_triangles",
				offset: { x: 0.5, y: 1.5, z: -0.95 },
			},
			{ modelId: "details_details_x", offset: { x: 0, y: 1.5, z: 0.95 } },
			{ modelId: "rooftile_orangevent", offset: { x: 0, y: 2.1, z: 0 } },
		],
	},
	{
		id: "power_sink_array",
		label: "Power Sink Array",
		tags: ["power", "service"],
		gameplayRole:
			"Storm-grounding utility cluster for lightning capture and relay stabilization.",
		parts: [
			{ modelId: "floortile_basic", offset: { x: 0, y: 0, z: 0 } },
			{ modelId: "column_2", offset: { x: -1.25, y: 0, z: -0.25 } },
			{ modelId: "column_2", offset: { x: 1.25, y: 0, z: -0.25 } },
			{ modelId: "props_teleporter_1", offset: { x: -0.55, y: 0, z: 0 } },
			{ modelId: "props_teleporter_2", offset: { x: 0.55, y: 0, z: 0 } },
			{
				modelId: "details_details_pipes_medium",
				offset: { x: 0, y: 1.1, z: -0.5 },
			},
			{
				modelId: "details_details_triangles",
				offset: { x: -1.2, y: 1.0, z: -0.2 },
			},
			{
				modelId: "details_details_plate_details",
				offset: { x: 1.2, y: 0.8, z: -0.2 },
			},
			{ modelId: "rooftile_pipes1", offset: { x: 0, y: 1.85, z: 0 } },
		],
	},
	{
		id: "transit_node",
		label: "Transit Node",
		tags: ["transit", "service"],
		gameplayRole:
			"Compact transit junction for cargo routing and rapid intra-sector movement.",
		parts: [
			{ modelId: "floortile_basic", offset: { x: 0, y: 0, z: 0 } },
			{ modelId: "walls_doordouble_wall_sidea", offset: { x: 0, y: 0, z: -1 } },
			{
				modelId: "walls_doordouble_wall_sideb",
				offset: { x: 0, y: 0, z: 1 },
				rotationQuarterTurns: 2,
			},
			{ modelId: "props_base", offset: { x: -0.48, y: 0, z: 0.1 } },
			{ modelId: "props_vessel_tall", offset: { x: 0.52, y: 0, z: 0.15 } },
			{
				modelId: "details_details_arrow",
				offset: { x: -0.2, y: 1.5, z: -0.95 },
			},
			{
				modelId: "details_details_arrow_2",
				offset: { x: 0.2, y: 1.5, z: 0.95 },
				rotationQuarterTurns: 2,
			},
			{ modelId: "rooftile_sides_pipes", offset: { x: 0, y: 1.9, z: 0 } },
		],
	},
	{
		id: "archive_cluster",
		label: "Archive Cluster",
		tags: ["archive", "research", "tower"],
		gameplayRole:
			"Vertical archive and instrumentation stack for memory recovery and research.",
		parts: [
			{ modelId: "floortile_basic", offset: { x: 0, y: 0, z: 0 } },
			{
				modelId: "walls_longwindow_wall_sidea",
				offset: { x: 1, y: 0, z: 0 },
				rotationQuarterTurns: 1,
			},
			{
				modelId: "walls_longwindow_wall_sideb",
				offset: { x: -1, y: 0, z: 0 },
				rotationQuarterTurns: 3,
			},
			{ modelId: "walls_wall_4", offset: { x: 0, y: 0, z: -1 } },
			{
				modelId: "walls_doorsingle_wall_sidea",
				offset: { x: 0, y: 0, z: 1 },
				rotationQuarterTurns: 2,
			},
			{ modelId: "props_computer", offset: { x: -0.35, y: 0, z: -0.1 } },
			{ modelId: "props_statue", offset: { x: 0.4, y: 0, z: 0.15 } },
			{
				modelId: "staircase",
				offset: { x: 0.5, y: 0, z: 0.45 },
				rotationQuarterTurns: 1,
			},
			{ modelId: "rooftile_plate2", offset: { x: 0, y: 2.15, z: 0 } },
		],
	},
	{
		id: "cult_incursion_structure",
		label: "Cult Incursion Structure",
		tags: ["hostile", "fortress", "service"],
		gameplayRole:
			"Hostile ritual shell representing cult pressure and captured storm hardware.",
		parts: [
			{ modelId: "floortile_basic", offset: { x: 0, y: 0, z: 0 } },
			{ modelId: "walls_wall_5", offset: { x: 0, y: 0, z: -1 } },
			{
				modelId: "walls_wall_5",
				offset: { x: 0, y: 0, z: 1 },
				rotationQuarterTurns: 2,
			},
			{ modelId: "column_3", offset: { x: -1.2, y: 0, z: 0 } },
			{ modelId: "column_3", offset: { x: 1.2, y: 0, z: 0 } },
			{ modelId: "props_capsule", offset: { x: 0, y: 0, z: 0.1 } },
			{ modelId: "details_details_x", offset: { x: -1.2, y: 1.5, z: -0.95 } },
			{ modelId: "details_details_x", offset: { x: 1.2, y: 1.5, z: -0.95 } },
			{
				modelId: "details_details_pipes_medium",
				offset: { x: 0, y: 1.3, z: 0.95 },
			},
			{
				modelId: "details_details_vent_4",
				offset: { x: -0.6, y: 0.8, z: -0.95 },
			},
			{ modelId: "rooftile_orangevent", offset: { x: 0, y: 2.15, z: 0 } },
		],
	},
	{
		id: "motor_pool",
		label: "Motor Pool",
		tags: ["logistics", "transit", "storage"],
		gameplayRole:
			"Open vehicle bay for bot servicing, cargo staging, and transit logistics.",
		parts: [
			{ modelId: "floortile_basic", offset: { x: 0, y: 0, z: 0 } },
			{
				modelId: "walls_doordoublelong_wall_sidea",
				offset: { x: 0, y: 0, z: -1 },
			},
			{
				modelId: "walls_doordouble_wall_sideb",
				offset: { x: 0, y: 0, z: 1 },
				rotationQuarterTurns: 2,
			},
			{
				modelId: "walls_wall_4",
				offset: { x: -1, y: 0, z: 0 },
				rotationQuarterTurns: 3,
			},
			{
				modelId: "walls_wall_4",
				offset: { x: 1, y: 0, z: 0 },
				rotationQuarterTurns: 1,
			},
			{ modelId: "props_base", offset: { x: -0.5, y: 0, z: 0 } },
			{ modelId: "props_containerfull", offset: { x: 0.5, y: 0, z: 0.35 } },
			{ modelId: "props_cratelong", offset: { x: 0.5, y: 0, z: -0.35 } },
			{
				modelId: "details_details_arrow",
				offset: { x: -0.95, y: 1.5, z: -0.5 },
			},
			{ modelId: "details_details_vent_3", offset: { x: 0, y: 1.8, z: -0.95 } },
			{ modelId: "rooftile_vents", offset: { x: 0, y: 1.95, z: 0 } },
		],
	},
	{
		id: "storm_collector_array",
		label: "Storm Collector Array",
		tags: ["power", "storm", "capture"],
		gameplayRole:
			"Open-frame lightning capture rig for grounding storm energy into the power grid.",
		parts: [
			{ modelId: "floortile_basic", offset: { x: 0, y: 0, z: 0 } },
			{ modelId: "column_2", offset: { x: -1.25, y: 0, z: -1.25 } },
			{ modelId: "column_2", offset: { x: 1.25, y: 0, z: -1.25 } },
			{ modelId: "column_2", offset: { x: -1.25, y: 0, z: 1.25 } },
			{ modelId: "column_2", offset: { x: 1.25, y: 0, z: 1.25 } },
			{ modelId: "props_teleporter_1", offset: { x: 0, y: 0, z: -0.5 } },
			{ modelId: "props_teleporter_2", offset: { x: 0, y: 0, z: 0.5 } },
			{ modelId: "pipes", offset: { x: 0, y: 1.4, z: 0 } },
			{
				modelId: "details_details_pipes_long",
				offset: { x: -1.2, y: 0.6, z: 0 },
			},
			{ modelId: "details_details_vent_5", offset: { x: 1.2, y: 0.8, z: 0 } },
			{
				modelId: "details_details_triangles",
				offset: { x: 0, y: 1.0, z: -1.2 },
			},
			{ modelId: "rooftile_orangevent", offset: { x: 0, y: 2.1, z: 0 } },
		],
	},
	{
		id: "transport_spine",
		label: "Transport Spine",
		tags: ["transit", "logistics", "corridor"],
		gameplayRole:
			"Heavy-duty transit corridor for cargo routing between districts with loading ramp.",
		parts: [
			{ modelId: "floortile_basic", offset: { x: 0, y: 0, z: 0 } },
			{
				modelId: "walls_doordoublelong_wall_sidea",
				offset: { x: 0, y: 0, z: -1 },
			},
			{
				modelId: "walls_doordoublelong_wall_sidea",
				offset: { x: 0, y: 0, z: 1 },
				rotationQuarterTurns: 2,
			},
			{
				modelId: "walls_wall_1",
				offset: { x: -1, y: 0, z: 0 },
				rotationQuarterTurns: 3,
			},
			{
				modelId: "walls_wall_1",
				offset: { x: 1, y: 0, z: 0 },
				rotationQuarterTurns: 1,
			},
			{ modelId: "props_base", offset: { x: -0.5, y: 0, z: 0.45 } },
			{ modelId: "props_crate", offset: { x: 0.5, y: 0, z: 0.2 } },
			{ modelId: "props_containerfull", offset: { x: 0.5, y: 0, z: -0.3 } },
			{
				modelId: "details_details_arrow_2",
				offset: { x: -0.95, y: 1.5, z: -0.3 },
			},
			{
				modelId: "details_details_arrow_2",
				offset: { x: 0.95, y: 1.5, z: 0.3 },
				rotationQuarterTurns: 2,
			},
			{ modelId: "details_details_dots", offset: { x: -0.95, y: 0.5, z: 0.3 } },
			{ modelId: "rooftile_sides_pipes", offset: { x: 0, y: 1.95, z: 0 } },
		],
	},
	// -----------------------------------------------------------------------
	// Overworld composites — 4X strategic map structures
	// -----------------------------------------------------------------------
	{
		id: "power_relay_station",
		label: "Power Relay Station",
		tags: ["power", "relay", "overworld"],
		gameplayRole:
			"Power distribution and signal relay hub for overworld sector energy routing.",
		parts: [
			{ modelId: "machine_generator", offset: { x: 0, y: 0, z: 0 } },
			{ modelId: "cable_long", offset: { x: 1.2, y: 0.6, z: 0 } },
			{ modelId: "antenna_1", offset: { x: -1.0, y: 0, z: -0.8 } },
			{
				modelId: "satellite_dish",
				offset: { x: 0.8, y: 0, z: -1.0 },
				rotationQuarterTurns: 1,
			},
		],
	},
	{
		id: "pipe_junction",
		label: "Pipe Junction",
		tags: ["industrial", "infrastructure", "overworld"],
		gameplayRole:
			"Resource pipeline crossover for material flow between industrial districts.",
		parts: [
			{ modelId: "pipe_cross", offset: { x: 0, y: 0, z: 0 } },
			{ modelId: "pipe_support_high", offset: { x: 1.0, y: 0, z: 0 } },
			{ modelId: "machine_barrel", offset: { x: -0.8, y: 0, z: 0.6 } },
		],
	},
	{
		id: "defensive_outpost",
		label: "Defensive Outpost",
		tags: ["defense", "overworld", "fortification"],
		gameplayRole:
			"Fortified perimeter outpost for sector defense and hostile containment.",
		parts: [
			{ modelId: "turret_cannon", offset: { x: 0, y: 0, z: 0 } },
			{
				modelId: "barricade_doorway_a",
				offset: { x: 1.2, y: 0, z: 0 },
				rotationQuarterTurns: 1,
			},
			{
				modelId: "gate_complex",
				offset: { x: -1.2, y: 0, z: 0 },
				rotationQuarterTurns: 3,
			},
			{
				modelId: "fence",
				offset: { x: 0, y: 0, z: 1.2 },
				rotationQuarterTurns: 2,
			},
		],
	},
	{
		id: "transit_depot",
		label: "Transit Depot",
		tags: ["transit", "logistics", "overworld"],
		gameplayRole:
			"Monorail staging and cargo transfer point for inter-sector transit routing.",
		parts: [
			{ modelId: "monorail_track_straight", offset: { x: 0, y: 0, z: 0 } },
			{ modelId: "platform_large", offset: { x: 1.5, y: 0, z: 0 } },
			{ modelId: "craft_cargo_a", offset: { x: -1.0, y: 0, z: 1.0 } },
		],
	},
	{
		id: "salvage_cache",
		label: "Salvage Cache",
		tags: ["salvage", "exploration", "overworld"],
		gameplayRole:
			"Recoverable material deposit marking prior mission wreckage and scrap yield.",
		parts: [
			{ modelId: "lootbox", offset: { x: 0, y: 0, z: 0 } },
			{ modelId: "rocks_small_a", offset: { x: 0.8, y: 0, z: 0.5 } },
			{ modelId: "crater", offset: { x: -0.6, y: 0, z: -0.4 } },
			{ modelId: "bones", offset: { x: 0.3, y: 0, z: -0.8 } },
		],
	},
	{
		id: "resource_node",
		label: "Resource Node",
		tags: ["resource", "industrial", "overworld"],
		gameplayRole:
			"Raw material extraction point with crystal deposits and processing equipment.",
		parts: [
			{ modelId: "rock_crystals", offset: { x: 0, y: 0, z: 0 } },
			{ modelId: "machine_generator", offset: { x: 1.0, y: 0, z: 0.5 } },
			{ modelId: "pipe_ring", offset: { x: -0.5, y: 0.4, z: -0.5 } },
		],
	},
	{
		id: "abandoned_hangar",
		label: "Abandoned Hangar",
		tags: ["exploration", "landmark", "overworld"],
		gameplayRole:
			"Derelict hangar structure from prior colonial mission, potential salvage and intel source.",
		parts: [
			{ modelId: "hangar_large_a", offset: { x: 0, y: 0, z: 0 } },
			{ modelId: "barrel", offset: { x: 1.5, y: 0, z: 1.0 } },
			{ modelId: "structure_detailed", offset: { x: -1.2, y: 0, z: 0.8 } },
		],
	},
	{
		id: "cult_breach_point",
		label: "Cult Breach Point",
		tags: ["hostile", "cult", "overworld"],
		gameplayRole:
			"Active cult incursion site with barricaded positions and hazard signage.",
		parts: [
			{ modelId: "barricade_window_a", offset: { x: 0, y: 0, z: 0 } },
			{ modelId: "sign_corner_hazard", offset: { x: 0.8, y: 0, z: -0.6 } },
			{ modelId: "meteor_half", offset: { x: -0.6, y: 0, z: 0.8 } },
		],
	},
];
