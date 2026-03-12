/**
 * Ecumenopolis Asset Atlas
 *
 * Single source of truth for the world generator's asset vocabulary.
 * Every model, texture, HDRI, and procedural element is cataloged here
 * with placement rules, adjacency contracts, visual weight, and
 * composition strategies that allow deterministic seed-based generation.
 *
 * Generated from Blender MCP visual assessment (2026-03-12).
 */

// ---------------------------------------------------------------------------
// Grid system constants
// ---------------------------------------------------------------------------

/** City kit uses a strict 2m grid. All structural modules snap to this. */
export const GRID_UNIT = 2;

/** Wall modules span 2 grid units (4m) wide and 2.2 grid units (4.4m) tall. */
export const WALL_WIDTH = 4;
export const WALL_HEIGHT = 4.4;

/** Columns bridge floor to ceiling at 4.5m. */
export const COLUMN_HEIGHT = 4.5;

/** Roof tiles sit at column height above the floor plane. */
export const ROOF_PLACEMENT_Z = COLUMN_HEIGHT;

/** Standard room height is column height (one storey). */
export const STOREY_HEIGHT = COLUMN_HEIGHT;

/** Robot GLBs are natively ~23x18x57 units. This factor brings them to ~2m. */
export const ROBOT_SCALE_FACTOR = 0.035;

// ---------------------------------------------------------------------------
// Material palette (the 8 flat colors baked into the city kit GLBs)
// ---------------------------------------------------------------------------

export const KIT_PALETTE = {
	main: { r: 0.402, g: 0.402, b: 0.402, role: "structural_shell" },
	darkGrey: { r: 0.24, g: 0.24, b: 0.24, role: "secondary_surface" },
	accent: { r: 1.0, g: 0.525, b: 0.113, role: "power_data_accent" },
	darkAccent: { r: 0.227, g: 0.123, b: 0.03, role: "dark_amber_trim" },
	black: { r: 0.042, g: 0.042, b: 0.042, role: "recess_shadow" },
	light: { r: 0.8, g: 0.8, b: 0.8, role: "metallic_light_panel" },
	glass: { r: 1.0, g: 1.0, b: 1.0, role: "window" },
	pipes: { r: 0.019, g: 0.019, b: 0.019, role: "utility_line" },
} as const;

// ---------------------------------------------------------------------------
// Model family definitions with Blender-verified geometry data
// ---------------------------------------------------------------------------

export type ModelFamily =
	| "column"
	| "door"
	| "floor"
	| "roof"
	| "wall"
	| "wall_door"
	| "wall_window"
	| "prop"
	| "utility"
	| "detail_signage"
	| "detail_panel"
	| "detail_pipework"
	| "stair";

export type ZoneType =
	| "core"
	| "power"
	| "fabrication"
	| "storage"
	| "habitation"
	| "corridor"
	| "breach"
	| "cult_ruin";

export type PlacementType =
	| "cell"
	| "edge"
	| "corner"
	| "vertical"
	| "surface"
	| "freeform";

export type PassabilityEffect =
	| "walkable"
	| "blocking"
	| "cover"
	| "portal"
	| "guidance"
	| "vertical_connector";

export interface ModelEntry {
	/** snake_case identifier used in code */
	id: string;
	/** Human-readable label */
	label: string;
	/** Relative path from assets/models/ */
	assetPath: string;
	/** Family classification */
	family: ModelFamily;
	/** Blender-measured bounding box in meters */
	bbox: { w: number; d: number; h: number };
	/** Triangle count from Blender assessment */
	tris: number;
	/** Number of material slots */
	materialSlots: number;
	/** Grid snap: how many 2m units this occupies */
	gridFootprint: [number, number];
	/** Where this model attaches in the grid */
	placement: PlacementType;
	/** How this affects pathfinding */
	passability: PassabilityEffect;
	/** Rotation symmetry: 1=unique, 2=mirrored, 4=quarter-turn identical */
	rotSymmetry: 1 | 2 | 4;
	/** Which zones prefer this model */
	zoneAffinity: ZoneType[];
	/** What this model likes to be adjacent to (semantic tags) */
	adjacencyBias: string[];
	/** Which composite structures can include this */
	compositeRoles: string[];
	/** Visual weight at game camera distance (0=invisible, 1=dominant) */
	visualWeight: { close: number; mid: number; far: number };
	/** Optimal viewing angle from game camera (degrees from horizontal) */
	bestViewAngle: number;
	/** LOD tier: 0=always show, 1=hide at far zoom, 2=detail only at close */
	lodTier: 0 | 1 | 2;
	/** Tags for search and filtering */
	tags: string[];
}

// ---------------------------------------------------------------------------
// Column family (4 models)
// ---------------------------------------------------------------------------

const columns: ModelEntry[] = [
	{
		id: "column_1",
		label: "Standard Column",
		assetPath: "city/Column_1.glb",
		family: "column",
		bbox: { w: 0.7, d: 0.7, h: 4.5 },
		tris: 60,
		materialSlots: 2,
		gridFootprint: [1, 1],
		placement: "corner",
		passability: "blocking",
		rotSymmetry: 4,
		zoneAffinity: ["core", "corridor", "habitation", "fabrication", "power", "storage"],
		adjacencyBias: ["wall_edge", "room_corner", "gate_frame"],
		compositeRoles: ["substation_core", "defensive_gate", "tower_stack"],
		visualWeight: { close: 0.7, mid: 0.5, far: 0.2 },
		bestViewAngle: 55,
		lodTier: 0,
		tags: ["structural", "column", "minimal"],
	},
	{
		id: "column_2",
		label: "Ribbed Column",
		assetPath: "city/Column_2.glb",
		family: "column",
		bbox: { w: 0.7, d: 0.7, h: 4.5 },
		tris: 188,
		materialSlots: 2,
		gridFootprint: [1, 1],
		placement: "corner",
		passability: "blocking",
		rotSymmetry: 4,
		zoneAffinity: ["core", "corridor", "habitation", "fabrication", "power", "storage"],
		adjacencyBias: ["wall_edge", "room_corner", "gate_frame"],
		compositeRoles: ["substation_core", "defensive_gate", "tower_stack"],
		visualWeight: { close: 0.7, mid: 0.5, far: 0.2 },
		bestViewAngle: 55,
		lodTier: 0,
		tags: ["structural", "column", "ribbed"],
	},
	{
		id: "column_3",
		label: "Accent Column",
		assetPath: "city/Column_3.glb",
		family: "column",
		bbox: { w: 1.4, d: 1.4, h: 4.5 },
		tris: 758,
		materialSlots: 3,
		gridFootprint: [1, 1],
		placement: "corner",
		passability: "blocking",
		rotSymmetry: 4,
		zoneAffinity: ["core", "power", "fabrication"],
		adjacencyBias: ["wall_edge", "power_cluster", "tower_core"],
		compositeRoles: ["substation_core", "archive_cluster", "cult_incursion"],
		visualWeight: { close: 0.9, mid: 0.6, far: 0.3 },
		bestViewAngle: 55,
		lodTier: 0,
		tags: ["structural", "column", "accent", "landmark"],
	},
	{
		id: "column_slim",
		label: "Slim Utility Column",
		assetPath: "city/Column_Slim.glb",
		family: "column",
		bbox: { w: 0.6, d: 0.7, h: 4.5 },
		tris: 396,
		materialSlots: 3,
		gridFootprint: [1, 1],
		placement: "corner",
		passability: "cover",
		rotSymmetry: 4,
		zoneAffinity: ["corridor", "fabrication", "power", "storage"],
		adjacencyBias: ["utility_run", "corridor_edge", "transit_node"],
		compositeRoles: ["relay_spine", "service_block", "power_sink_array"],
		visualWeight: { close: 0.6, mid: 0.3, far: 0.1 },
		bestViewAngle: 55,
		lodTier: 0,
		tags: ["utility", "column", "pipe_support"],
	},
];

// ---------------------------------------------------------------------------
// Door family (2 standalone + 6 wall-mounted)
// ---------------------------------------------------------------------------

const doors: ModelEntry[] = [
	{
		id: "door_double",
		label: "Double Door",
		assetPath: "city/Door_Double.glb",
		family: "door",
		bbox: { w: 2.7, d: 0.5, h: 2.8 },
		tris: 1992,
		materialSlots: 5,
		gridFootprint: [2, 1],
		placement: "edge",
		passability: "portal",
		rotSymmetry: 2,
		zoneAffinity: ["corridor", "core", "fabrication", "storage", "habitation"],
		adjacencyBias: ["wall_edge", "transit_lane", "substation_core"],
		compositeRoles: ["relay_spine", "transit_node", "defensive_gate"],
		visualWeight: { close: 0.8, mid: 0.5, far: 0.1 },
		bestViewAngle: 45,
		lodTier: 1,
		tags: ["portal", "wide_door", "animated_candidate"],
	},
	{
		id: "door_single",
		label: "Single Door",
		assetPath: "city/Door_Single.glb",
		family: "door",
		bbox: { w: 1.7, d: 0.5, h: 2.8 },
		tris: 1400,
		materialSlots: 5,
		gridFootprint: [1, 1],
		placement: "edge",
		passability: "portal",
		rotSymmetry: 2,
		zoneAffinity: ["corridor", "habitation", "core", "storage"],
		adjacencyBias: ["wall_edge", "room_threshold"],
		compositeRoles: ["substation_core", "archive_cluster", "tower_stack"],
		visualWeight: { close: 0.7, mid: 0.4, far: 0.1 },
		bestViewAngle: 45,
		lodTier: 1,
		tags: ["portal", "single_door", "animated_candidate"],
	},
];

// ---------------------------------------------------------------------------
// Floor tile family (7 models) — accent tiles that overlay procedural floors
// ---------------------------------------------------------------------------

const floors: ModelEntry[] = [
	{
		id: "floortile_basic",
		label: "Basic Floor Tile",
		assetPath: "city/FloorTile_Basic.glb",
		family: "floor",
		bbox: { w: 2.0, d: 2.0, h: 0.1 },
		tris: 388,
		materialSlots: 2,
		gridFootprint: [1, 1],
		placement: "cell",
		passability: "walkable",
		rotSymmetry: 4,
		zoneAffinity: ["core", "corridor", "habitation", "fabrication", "power", "storage"],
		adjacencyBias: ["procedural_floor", "accent_floor"],
		compositeRoles: [],
		visualWeight: { close: 0.4, mid: 0.2, far: 0.05 },
		bestViewAngle: 65,
		lodTier: 2,
		tags: ["floor_accent", "optional", "grid_snap"],
	},
	{
		id: "floortile_basic2",
		label: "Detailed Floor Tile",
		assetPath: "city/FloorTile_Basic2.glb",
		family: "floor",
		bbox: { w: 2.0, d: 2.0, h: 0.1 },
		tris: 570,
		materialSlots: 4,
		gridFootprint: [1, 1],
		placement: "cell",
		passability: "walkable",
		rotSymmetry: 4,
		zoneAffinity: ["core", "corridor", "habitation", "fabrication", "power", "storage"],
		adjacencyBias: ["procedural_floor", "accent_floor"],
		compositeRoles: [],
		visualWeight: { close: 0.5, mid: 0.3, far: 0.05 },
		bestViewAngle: 65,
		lodTier: 2,
		tags: ["floor_accent", "detailed", "grid_snap"],
	},
	{
		id: "floortile_corner",
		label: "Corner Floor Tile",
		assetPath: "city/FloorTile_Corner.glb",
		family: "floor",
		bbox: { w: 2.0, d: 2.0, h: 0.1 },
		tris: 360,
		materialSlots: 5,
		gridFootprint: [1, 1],
		placement: "cell",
		passability: "walkable",
		rotSymmetry: 1,
		zoneAffinity: ["core", "corridor", "habitation", "fabrication", "power", "storage"],
		adjacencyBias: ["wall_corner", "room_corner"],
		compositeRoles: [],
		visualWeight: { close: 0.4, mid: 0.2, far: 0.05 },
		bestViewAngle: 65,
		lodTier: 2,
		tags: ["floor_accent", "directional", "corner"],
	},
	{
		id: "floortile_double_hallway",
		label: "Double Hallway Floor Tile",
		assetPath: "city/FloorTile_Double_Hallway.glb",
		family: "floor",
		bbox: { w: 4.0, d: 2.0, h: 0.1 },
		tris: 476,
		materialSlots: 5,
		gridFootprint: [2, 1],
		placement: "cell",
		passability: "walkable",
		rotSymmetry: 2,
		zoneAffinity: ["corridor", "core"],
		adjacencyBias: ["corridor_run", "transit_lane"],
		compositeRoles: ["relay_spine", "transit_node"],
		visualWeight: { close: 0.5, mid: 0.3, far: 0.05 },
		bestViewAngle: 65,
		lodTier: 2,
		tags: ["floor_accent", "corridor", "wide"],
	},
	{
		id: "floortile_empty",
		label: "Empty Floor Tile",
		assetPath: "city/FloorTile_Empty.glb",
		family: "floor",
		bbox: { w: 2.0, d: 2.0, h: 0.1 },
		tris: 68,
		materialSlots: 2,
		gridFootprint: [1, 1],
		placement: "cell",
		passability: "walkable",
		rotSymmetry: 4,
		zoneAffinity: ["core", "corridor", "habitation", "fabrication", "power", "storage"],
		adjacencyBias: ["procedural_floor", "filler"],
		compositeRoles: [],
		visualWeight: { close: 0.1, mid: 0.05, far: 0.0 },
		bestViewAngle: 65,
		lodTier: 2,
		tags: ["floor_filler", "minimal"],
	},
	{
		id: "floortile_innercorner",
		label: "Inner Corner Floor Tile",
		assetPath: "city/FloorTile_InnerCorner.glb",
		family: "floor",
		bbox: { w: 2.0, d: 2.0, h: 0.1 },
		tris: 217,
		materialSlots: 5,
		gridFootprint: [1, 1],
		placement: "cell",
		passability: "walkable",
		rotSymmetry: 1,
		zoneAffinity: ["core", "corridor", "habitation", "fabrication", "power", "storage"],
		adjacencyBias: ["wall_inner_corner", "room_threshold"],
		compositeRoles: [],
		visualWeight: { close: 0.4, mid: 0.2, far: 0.05 },
		bestViewAngle: 65,
		lodTier: 2,
		tags: ["floor_accent", "directional", "inner_corner"],
	},
	{
		id: "floortile_side",
		label: "Side Floor Tile",
		assetPath: "city/FloorTile_Side.glb",
		family: "floor",
		bbox: { w: 2.0, d: 2.0, h: 0.1 },
		tris: 238,
		materialSlots: 5,
		gridFootprint: [1, 1],
		placement: "cell",
		passability: "walkable",
		rotSymmetry: 1,
		zoneAffinity: ["core", "corridor", "habitation", "fabrication", "power", "storage"],
		adjacencyBias: ["wall_edge", "room_perimeter"],
		compositeRoles: [],
		visualWeight: { close: 0.4, mid: 0.2, far: 0.05 },
		bestViewAngle: 65,
		lodTier: 2,
		tags: ["floor_accent", "directional", "wall_adjacent"],
	},
];

// ---------------------------------------------------------------------------
// Prop family (18 models)
// ---------------------------------------------------------------------------

const props: ModelEntry[] = [
	{ id: "props_base", label: "Equipment Base", assetPath: "city/Props_Base.glb", family: "prop", bbox: { w: 2.4, d: 2.4, h: 0.3 }, tris: 556, materialSlots: 3, gridFootprint: [1, 1], placement: "cell", passability: "cover", rotSymmetry: 4, zoneAffinity: ["fabrication", "power", "storage"], adjacencyBias: ["equipment_mount", "machine_cluster"], compositeRoles: ["fabrication_hub", "power_sink_array"], visualWeight: { close: 0.5, mid: 0.3, far: 0.05 }, bestViewAngle: 65, lodTier: 1, tags: ["equipment", "base", "industrial"] },
	{ id: "props_capsule", label: "Stasis Capsule", assetPath: "city/Props_Capsule.glb", family: "prop", bbox: { w: 0.9, d: 0.9, h: 1.6 }, tris: 1260, materialSlots: 5, gridFootprint: [1, 1], placement: "freeform", passability: "cover", rotSymmetry: 2, zoneAffinity: ["habitation", "core"], adjacencyBias: ["archive_cluster", "cult_incursion"], compositeRoles: ["archive_cluster", "cult_incursion"], visualWeight: { close: 0.7, mid: 0.4, far: 0.1 }, bestViewAngle: 45, lodTier: 1, tags: ["capsule", "ritual_pod", "narrative"] },
	{ id: "props_chest", label: "Storage Chest", assetPath: "city/Props_Chest.glb", family: "prop", bbox: { w: 1.3, d: 0.8, h: 0.9 }, tris: 5024, materialSlots: 5, gridFootprint: [1, 1], placement: "freeform", passability: "cover", rotSymmetry: 2, zoneAffinity: ["storage", "fabrication"], adjacencyBias: ["storage_block", "service_block"], compositeRoles: ["storage_block", "motor_pool"], visualWeight: { close: 0.6, mid: 0.3, far: 0.05 }, bestViewAngle: 45, lodTier: 1, tags: ["cargo", "storage", "detailed"] },
	{ id: "props_computer", label: "Computer Console", assetPath: "city/Props_Computer.glb", family: "prop", bbox: { w: 0.6, d: 0.6, h: 2.1 }, tris: 624, materialSlots: 5, gridFootprint: [1, 1], placement: "freeform", passability: "cover", rotSymmetry: 4, zoneAffinity: ["core", "fabrication", "habitation"], adjacencyBias: ["substation_core", "archive_cluster"], compositeRoles: ["substation_core", "archive_cluster", "fabrication_hub"], visualWeight: { close: 0.7, mid: 0.4, far: 0.1 }, bestViewAngle: 45, lodTier: 1, tags: ["console", "operator", "interactive_candidate"] },
	{ id: "props_computersmall", label: "Small Terminal", assetPath: "city/Props_ComputerSmall.glb", family: "prop", bbox: { w: 0.8, d: 0.5, h: 1.5 }, tris: 624, materialSlots: 5, gridFootprint: [1, 1], placement: "freeform", passability: "cover", rotSymmetry: 4, zoneAffinity: ["core", "corridor", "habitation"], adjacencyBias: ["substation_core", "wall_adjacent"], compositeRoles: ["substation_core", "archive_cluster"], visualWeight: { close: 0.5, mid: 0.3, far: 0.05 }, bestViewAngle: 45, lodTier: 1, tags: ["terminal", "compact", "interactive_candidate"] },
	{ id: "props_containerfull", label: "Full Container", assetPath: "city/Props_ContainerFull.glb", family: "prop", bbox: { w: 1.2, d: 0.8, h: 0.6 }, tris: 4930, materialSlots: 5, gridFootprint: [1, 1], placement: "freeform", passability: "cover", rotSymmetry: 2, zoneAffinity: ["storage", "fabrication", "corridor"], adjacencyBias: ["storage_block", "transit_node"], compositeRoles: ["storage_block", "motor_pool"], visualWeight: { close: 0.6, mid: 0.3, far: 0.05 }, bestViewAngle: 55, lodTier: 1, tags: ["cargo", "storage", "stackable"] },
	{ id: "props_crate", label: "Crate", assetPath: "city/Props_Crate.glb", family: "prop", bbox: { w: 0.8, d: 0.8, h: 0.8 }, tris: 2688, materialSlots: 5, gridFootprint: [1, 1], placement: "freeform", passability: "cover", rotSymmetry: 2, zoneAffinity: ["storage", "fabrication", "corridor"], adjacencyBias: ["storage_block", "loading_area"], compositeRoles: ["storage_block", "motor_pool", "transit_node"], visualWeight: { close: 0.5, mid: 0.2, far: 0.05 }, bestViewAngle: 45, lodTier: 1, tags: ["cargo", "storage", "stackable", "ubiquitous"] },
	{ id: "props_cratelong", label: "Long Crate", assetPath: "city/Props_CrateLong.glb", family: "prop", bbox: { w: 1.2, d: 0.8, h: 0.8 }, tris: 3120, materialSlots: 5, gridFootprint: [1, 1], placement: "freeform", passability: "cover", rotSymmetry: 2, zoneAffinity: ["storage", "fabrication", "corridor"], adjacencyBias: ["storage_block", "loading_area"], compositeRoles: ["storage_block", "motor_pool"], visualWeight: { close: 0.5, mid: 0.2, far: 0.05 }, bestViewAngle: 45, lodTier: 1, tags: ["cargo", "storage", "stackable"] },
	{ id: "props_laser", label: "Laser Turret", assetPath: "city/Props_Laser.glb", family: "prop", bbox: { w: 3.8, d: 1.5, h: 1.3 }, tris: 1568, materialSlots: 3, gridFootprint: [2, 1], placement: "freeform", passability: "cover", rotSymmetry: 4, zoneAffinity: ["power", "corridor", "core"], adjacencyBias: ["defensive_gate", "power_sink_array"], compositeRoles: ["defensive_gate"], visualWeight: { close: 0.8, mid: 0.5, far: 0.2 }, bestViewAngle: 45, lodTier: 0, tags: ["weapon", "defense", "landmark"] },
	{ id: "props_pod", label: "Fabrication Pod", assetPath: "city/Props_Pod.glb", family: "prop", bbox: { w: 1.8, d: 1.8, h: 3.6 }, tris: 2246, materialSlots: 5, gridFootprint: [1, 1], placement: "freeform", passability: "cover", rotSymmetry: 4, zoneAffinity: ["fabrication", "power", "core"], adjacencyBias: ["fabrication_hub", "power_cluster"], compositeRoles: ["fabrication_hub", "power_sink_array"], visualWeight: { close: 0.9, mid: 0.6, far: 0.2 }, bestViewAngle: 45, lodTier: 0, tags: ["fabrication", "pod", "landmark", "tall"] },
	{ id: "props_shelf", label: "Shelf Unit", assetPath: "city/Props_Shelf.glb", family: "prop", bbox: { w: 1.8, d: 0.8, h: 2.5 }, tris: 368, materialSlots: 3, gridFootprint: [1, 1], placement: "freeform", passability: "cover", rotSymmetry: 2, zoneAffinity: ["storage", "fabrication"], adjacencyBias: ["wall_adjacent", "storage_block"], compositeRoles: ["storage_block", "service_block"], visualWeight: { close: 0.6, mid: 0.3, far: 0.05 }, bestViewAngle: 45, lodTier: 1, tags: ["storage", "shelf", "wall_placed"] },
	{ id: "props_shelf_tall", label: "Tall Shelf Unit", assetPath: "city/Props_Shelf_Tall.glb", family: "prop", bbox: { w: 2.1, d: 0.8, h: 3.1 }, tris: 536, materialSlots: 3, gridFootprint: [1, 1], placement: "freeform", passability: "blocking", rotSymmetry: 2, zoneAffinity: ["storage", "fabrication"], adjacencyBias: ["wall_adjacent", "storage_block"], compositeRoles: ["storage_block", "archive_cluster"], visualWeight: { close: 0.7, mid: 0.4, far: 0.1 }, bestViewAngle: 45, lodTier: 1, tags: ["storage", "shelf", "tall", "room_divider"] },
	{ id: "props_statue", label: "Machine Statue", assetPath: "city/Props_Statue.glb", family: "prop", bbox: { w: 1.2, d: 1.5, h: 2.6 }, tris: 1128, materialSlots: 3, gridFootprint: [1, 1], placement: "freeform", passability: "cover", rotSymmetry: 4, zoneAffinity: ["core", "habitation"], adjacencyBias: ["substation_core", "archive_cluster"], compositeRoles: ["substation_core", "archive_cluster", "cult_incursion"], visualWeight: { close: 0.9, mid: 0.6, far: 0.2 }, bestViewAngle: 45, lodTier: 0, tags: ["decoration", "landmark", "narrative", "machine_idol"] },
	{ id: "props_teleporter_1", label: "Teleporter Pad", assetPath: "city/Props_Teleporter_1.glb", family: "utility", bbox: { w: 1.2, d: 1.2, h: 0.9 }, tris: 688, materialSlots: 3, gridFootprint: [1, 1], placement: "cell", passability: "portal", rotSymmetry: 4, zoneAffinity: ["core", "power", "corridor"], adjacencyBias: ["relay_spine", "transit_node"], compositeRoles: ["relay_spine", "transit_node", "power_sink_array"], visualWeight: { close: 0.7, mid: 0.4, far: 0.1 }, bestViewAngle: 55, lodTier: 0, tags: ["teleport", "transit", "relay", "interactive"] },
	{ id: "props_teleporter_2", label: "Teleporter Column", assetPath: "city/Props_Teleporter_2.glb", family: "utility", bbox: { w: 1.2, d: 1.2, h: 1.3 }, tris: 960, materialSlots: 3, gridFootprint: [1, 1], placement: "cell", passability: "portal", rotSymmetry: 4, zoneAffinity: ["core", "power", "fabrication"], adjacencyBias: ["relay_spine", "transit_node", "power_cluster"], compositeRoles: ["relay_spine", "transit_node", "substation_core"], visualWeight: { close: 0.8, mid: 0.5, far: 0.15 }, bestViewAngle: 45, lodTier: 0, tags: ["teleport", "transit", "relay", "tall"] },
	{ id: "props_vessel", label: "Small Vessel", assetPath: "city/Props_Vessel.glb", family: "prop", bbox: { w: 0.3, d: 0.3, h: 0.8 }, tris: 332, materialSlots: 3, gridFootprint: [1, 1], placement: "freeform", passability: "walkable", rotSymmetry: 4, zoneAffinity: ["habitation", "core", "fabrication"], adjacencyBias: ["table_surface", "shelf_contents"], compositeRoles: [], visualWeight: { close: 0.2, mid: 0.05, far: 0.0 }, bestViewAngle: 45, lodTier: 2, tags: ["vessel", "dressing", "tiny"] },
	{ id: "props_vessel_short", label: "Short Vessel", assetPath: "city/Props_Vessel_Short.glb", family: "prop", bbox: { w: 0.3, d: 0.3, h: 0.5 }, tris: 252, materialSlots: 3, gridFootprint: [1, 1], placement: "freeform", passability: "walkable", rotSymmetry: 4, zoneAffinity: ["habitation", "core"], adjacencyBias: ["table_surface", "shelf_contents"], compositeRoles: [], visualWeight: { close: 0.15, mid: 0.03, far: 0.0 }, bestViewAngle: 45, lodTier: 2, tags: ["vessel", "dressing", "tiny"] },
	{ id: "props_vessel_tall", label: "Tall Vessel", assetPath: "city/Props_Vessel_Tall.glb", family: "prop", bbox: { w: 0.3, d: 0.3, h: 1.0 }, tris: 316, materialSlots: 3, gridFootprint: [1, 1], placement: "freeform", passability: "walkable", rotSymmetry: 4, zoneAffinity: ["habitation", "core", "fabrication"], adjacencyBias: ["table_surface", "shelf_contents"], compositeRoles: [], visualWeight: { close: 0.25, mid: 0.05, far: 0.0 }, bestViewAngle: 45, lodTier: 2, tags: ["vessel", "dressing", "tiny"] },
];

// ---------------------------------------------------------------------------
// Stair + Pipes (standalone utility)
// ---------------------------------------------------------------------------

const utility: ModelEntry[] = [
	{ id: "staircase", label: "Staircase", assetPath: "city/Staircase.glb", family: "stair", bbox: { w: 3.8, d: 3.1, h: 1.5 }, tris: 312, materialSlots: 3, gridFootprint: [2, 2], placement: "cell", passability: "vertical_connector", rotSymmetry: 4, zoneAffinity: ["core", "habitation", "power", "corridor"], adjacencyBias: ["tower_core", "archive_cluster"], compositeRoles: ["tower_stack", "archive_cluster"], visualWeight: { close: 0.7, mid: 0.4, far: 0.1 }, bestViewAngle: 55, lodTier: 0, tags: ["stairs", "vertical", "circulation"] },
	{ id: "pipes", label: "Pipe Run", assetPath: "city/Pipes.glb", family: "utility", bbox: { w: 3.5, d: 0.1, h: 0.4 }, tris: 356, materialSlots: 1, gridFootprint: [2, 1], placement: "surface", passability: "cover", rotSymmetry: 2, zoneAffinity: ["power", "fabrication", "corridor"], adjacencyBias: ["power_sink_array", "fabrication_hub", "relay_spine"], compositeRoles: ["power_sink_array", "fabrication_hub"], visualWeight: { close: 0.4, mid: 0.2, far: 0.05 }, bestViewAngle: 55, lodTier: 1, tags: ["pipework", "utility", "linear"] },
];

// ---------------------------------------------------------------------------
// Roof tile family (12 models)
// ---------------------------------------------------------------------------

const roofs: ModelEntry[] = [
	{ id: "rooftile_empty", label: "Empty Roof", assetPath: "city/RoofTile_Empty.glb", family: "roof", bbox: { w: 2, d: 2, h: 0.1 }, tris: 68, materialSlots: 2, gridFootprint: [1, 1], placement: "cell", passability: "blocking", rotSymmetry: 4, zoneAffinity: ["core", "corridor", "habitation", "fabrication", "power", "storage"], adjacencyBias: ["roofline", "filler"], compositeRoles: ["substation_core", "tower_stack", "relay_spine", "service_block"], visualWeight: { close: 0.1, mid: 0.1, far: 0.1 }, bestViewAngle: 75, lodTier: 0, tags: ["roof", "minimal"] },
	{ id: "rooftile_plate", label: "Plated Roof", assetPath: "city/RoofTile_Plate.glb", family: "roof", bbox: { w: 2, d: 2, h: 0.1 }, tris: 424, materialSlots: 3, gridFootprint: [1, 1], placement: "cell", passability: "blocking", rotSymmetry: 4, zoneAffinity: ["core", "corridor", "habitation", "fabrication", "power", "storage"], adjacencyBias: ["roofline", "sealed_room"], compositeRoles: ["substation_core", "tower_stack", "relay_spine", "service_block"], visualWeight: { close: 0.3, mid: 0.2, far: 0.15 }, bestViewAngle: 75, lodTier: 0, tags: ["roof", "plated"] },
	{ id: "rooftile_plate2", label: "Plated Roof Variant", assetPath: "city/RoofTile_Plate2.glb", family: "roof", bbox: { w: 2, d: 2, h: 0.1 }, tris: 436, materialSlots: 3, gridFootprint: [1, 1], placement: "cell", passability: "blocking", rotSymmetry: 4, zoneAffinity: ["core", "corridor", "habitation", "fabrication", "power", "storage"], adjacencyBias: ["roofline", "sealed_room"], compositeRoles: ["substation_core", "tower_stack", "relay_spine"], visualWeight: { close: 0.3, mid: 0.2, far: 0.15 }, bestViewAngle: 75, lodTier: 0, tags: ["roof", "plated", "variant"] },
	{ id: "rooftile_pipes1", label: "Piped Roof A", assetPath: "city/RoofTile_Pipes1.glb", family: "roof", bbox: { w: 2, d: 2, h: 0.1 }, tris: 388, materialSlots: 4, gridFootprint: [1, 1], placement: "cell", passability: "blocking", rotSymmetry: 4, zoneAffinity: ["power", "fabrication", "corridor"], adjacencyBias: ["utility_spine", "power_cluster"], compositeRoles: ["power_sink_array", "fabrication_hub"], visualWeight: { close: 0.5, mid: 0.3, far: 0.2 }, bestViewAngle: 75, lodTier: 0, tags: ["roof", "pipes", "industrial"] },
	{ id: "rooftile_pipes2", label: "Heavy Piped Roof", assetPath: "city/RoofTile_Pipes2.glb", family: "roof", bbox: { w: 2, d: 2, h: 0.1 }, tris: 900, materialSlots: 4, gridFootprint: [1, 1], placement: "cell", passability: "blocking", rotSymmetry: 4, zoneAffinity: ["power", "fabrication"], adjacencyBias: ["power_cluster", "fabrication_hub"], compositeRoles: ["power_sink_array", "fabrication_hub"], visualWeight: { close: 0.7, mid: 0.4, far: 0.25 }, bestViewAngle: 75, lodTier: 0, tags: ["roof", "pipes", "heavy", "industrial"] },
	{ id: "rooftile_vents", label: "Ventilated Roof", assetPath: "city/RoofTile_Vents.glb", family: "roof", bbox: { w: 2, d: 2, h: 0.1 }, tris: 1622, materialSlots: 4, gridFootprint: [1, 1], placement: "cell", passability: "blocking", rotSymmetry: 4, zoneAffinity: ["fabrication", "storage", "habitation"], adjacencyBias: ["ventilation_cluster", "exhaust_stack"], compositeRoles: ["fabrication_hub", "service_block"], visualWeight: { close: 0.8, mid: 0.5, far: 0.3 }, bestViewAngle: 75, lodTier: 0, tags: ["roof", "vents", "heavy", "highest_detail"] },
	{ id: "rooftile_smallvents", label: "Small Vent Roof", assetPath: "city/RoofTile_SmallVents.glb", family: "roof", bbox: { w: 2, d: 2, h: 0.1 }, tris: 340, materialSlots: 5, gridFootprint: [1, 1], placement: "cell", passability: "blocking", rotSymmetry: 4, zoneAffinity: ["corridor", "habitation", "storage"], adjacencyBias: ["ventilation_cluster"], compositeRoles: ["service_block", "storage_block"], visualWeight: { close: 0.4, mid: 0.2, far: 0.15 }, bestViewAngle: 75, lodTier: 0, tags: ["roof", "vents", "subtle"] },
	{ id: "rooftile_orangevent", label: "Orange Vent Roof", assetPath: "city/RoofTile_OrangeVent.glb", family: "roof", bbox: { w: 2, d: 2, h: 0.1 }, tris: 232, materialSlots: 5, gridFootprint: [1, 1], placement: "cell", passability: "blocking", rotSymmetry: 4, zoneAffinity: ["power", "core"], adjacencyBias: ["power_cluster", "accent_zone"], compositeRoles: ["power_sink_array", "substation_core"], visualWeight: { close: 0.6, mid: 0.4, far: 0.25 }, bestViewAngle: 75, lodTier: 0, tags: ["roof", "accent", "orange", "power_indicator"] },
	{ id: "rooftile_details", label: "Detailed Roof", assetPath: "city/RoofTile_Details.glb", family: "roof", bbox: { w: 2, d: 2, h: 0.1 }, tris: 848, materialSlots: 4, gridFootprint: [1, 1], placement: "cell", passability: "blocking", rotSymmetry: 4, zoneAffinity: ["core", "fabrication", "power"], adjacencyBias: ["roofline", "technical_zone"], compositeRoles: ["substation_core", "fabrication_hub", "archive_cluster"], visualWeight: { close: 0.6, mid: 0.4, far: 0.2 }, bestViewAngle: 75, lodTier: 0, tags: ["roof", "detailed", "accent"] },
	{ id: "rooftile_corner_pipes", label: "Corner Pipe Roof", assetPath: "city/RoofTile_Corner_Pipes.glb", family: "roof", bbox: { w: 2, d: 2, h: 0.1 }, tris: 490, materialSlots: 4, gridFootprint: [1, 1], placement: "cell", passability: "blocking", rotSymmetry: 1, zoneAffinity: ["power", "fabrication", "corridor"], adjacencyBias: ["corner_junction", "pipe_routing"], compositeRoles: ["power_sink_array", "relay_spine"], visualWeight: { close: 0.5, mid: 0.3, far: 0.2 }, bestViewAngle: 75, lodTier: 0, tags: ["roof", "corner", "directional", "pipes"] },
	{ id: "rooftile_innercorner_pipes", label: "Inner Corner Pipe Roof", assetPath: "city/RoofTile_InnerCorner_Pipes.glb", family: "roof", bbox: { w: 2, d: 2, h: 0.1 }, tris: 490, materialSlots: 4, gridFootprint: [1, 1], placement: "cell", passability: "blocking", rotSymmetry: 1, zoneAffinity: ["power", "fabrication", "corridor"], adjacencyBias: ["inner_corner_junction", "pipe_routing"], compositeRoles: ["power_sink_array", "relay_spine"], visualWeight: { close: 0.5, mid: 0.3, far: 0.2 }, bestViewAngle: 75, lodTier: 0, tags: ["roof", "inner_corner", "directional", "pipes"] },
	{ id: "rooftile_sides_pipes", label: "Side Pipe Roof", assetPath: "city/RoofTile_Sides_Pipes.glb", family: "roof", bbox: { w: 2, d: 2, h: 0.1 }, tris: 308, materialSlots: 4, gridFootprint: [1, 1], placement: "cell", passability: "blocking", rotSymmetry: 1, zoneAffinity: ["power", "fabrication", "corridor"], adjacencyBias: ["wall_edge", "pipe_routing"], compositeRoles: ["relay_spine", "power_sink_array"], visualWeight: { close: 0.4, mid: 0.2, far: 0.15 }, bestViewAngle: 75, lodTier: 0, tags: ["roof", "side", "directional", "pipes"] },
];

// ---------------------------------------------------------------------------
// Wall family — door walls (6), window walls (8), solid walls (6)
// ---------------------------------------------------------------------------

const walls: ModelEntry[] = [
	// --- Wall-door combos: full wall module with integrated door cutout ---
	{ id: "walls_doordoublelong_wall_sidea", label: "Double Door Long Wall (Ext)", assetPath: "city/Walls/DoorDoubleLong_Wall_SideA.glb", family: "wall_door", bbox: { w: 4.0, d: 2.25, h: 4.44 }, tris: 326, materialSlots: 4, gridFootprint: [2, 1], placement: "edge", passability: "portal", rotSymmetry: 2, zoneAffinity: ["corridor", "core", "fabrication", "storage"], adjacencyBias: ["transit_lane", "loading_area", "corridor_run"], compositeRoles: ["relay_spine", "transit_node", "defensive_gate"], visualWeight: { close: 0.8, mid: 0.6, far: 0.3 }, bestViewAngle: 45, lodTier: 0, tags: ["wall_door", "double", "long", "exterior_face", "structural"] },
	{ id: "walls_doordouble_wall_sidea", label: "Double Door Wall (Ext)", assetPath: "city/Walls/DoorDouble_Wall_SideA.glb", family: "wall_door", bbox: { w: 4.0, d: 1.25, h: 4.44 }, tris: 326, materialSlots: 4, gridFootprint: [2, 1], placement: "edge", passability: "portal", rotSymmetry: 2, zoneAffinity: ["corridor", "core", "fabrication", "storage", "habitation"], adjacencyBias: ["wall_edge", "transit_lane", "door_frame"], compositeRoles: ["relay_spine", "transit_node", "service_block", "defensive_gate"], visualWeight: { close: 0.8, mid: 0.6, far: 0.3 }, bestViewAngle: 45, lodTier: 0, tags: ["wall_door", "double", "exterior_face", "structural"] },
	{ id: "walls_doordouble_wall_sideb", label: "Double Door Wall (Int)", assetPath: "city/Walls/DoorDouble_Wall_SideB.glb", family: "wall_door", bbox: { w: 4.0, d: 0.53, h: 4.43 }, tris: 196, materialSlots: 4, gridFootprint: [2, 1], placement: "edge", passability: "portal", rotSymmetry: 2, zoneAffinity: ["corridor", "core", "fabrication", "storage", "habitation"], adjacencyBias: ["wall_edge", "room_interior", "door_frame"], compositeRoles: ["substation_core", "archive_cluster", "service_block"], visualWeight: { close: 0.6, mid: 0.4, far: 0.2 }, bestViewAngle: 45, lodTier: 0, tags: ["wall_door", "double", "interior_face", "thin"] },
	{ id: "walls_doorsinglelong_wall_sidea", label: "Single Door Long Wall (Ext)", assetPath: "city/Walls/DoorSingleLong_Wall_SideA.glb", family: "wall_door", bbox: { w: 4.0, d: 2.25, h: 4.44 }, tris: 332, materialSlots: 4, gridFootprint: [2, 1], placement: "edge", passability: "portal", rotSymmetry: 2, zoneAffinity: ["corridor", "habitation", "core", "storage"], adjacencyBias: ["corridor_run", "room_threshold", "service_block"], compositeRoles: ["archive_cluster", "tower_stack", "service_block"], visualWeight: { close: 0.7, mid: 0.5, far: 0.3 }, bestViewAngle: 45, lodTier: 0, tags: ["wall_door", "single", "long", "exterior_face", "structural"] },
	{ id: "walls_doorsingle_wall_sidea", label: "Single Door Wall (Ext)", assetPath: "city/Walls/DoorSingle_Wall_SideA.glb", family: "wall_door", bbox: { w: 4.0, d: 1.25, h: 4.44 }, tris: 332, materialSlots: 4, gridFootprint: [2, 1], placement: "edge", passability: "portal", rotSymmetry: 2, zoneAffinity: ["corridor", "habitation", "core", "storage"], adjacencyBias: ["wall_edge", "room_threshold"], compositeRoles: ["substation_core", "archive_cluster", "tower_stack", "service_block"], visualWeight: { close: 0.7, mid: 0.5, far: 0.3 }, bestViewAngle: 45, lodTier: 0, tags: ["wall_door", "single", "exterior_face", "structural"] },
	{ id: "walls_doorsingle_wall_sideb", label: "Single Door Wall (Int)", assetPath: "city/Walls/DoorSingle_Wall_SideB.glb", family: "wall_door", bbox: { w: 4.0, d: 0.53, h: 4.43 }, tris: 202, materialSlots: 4, gridFootprint: [2, 1], placement: "edge", passability: "portal", rotSymmetry: 2, zoneAffinity: ["corridor", "habitation", "core", "storage"], adjacencyBias: ["wall_edge", "room_interior", "door_frame"], compositeRoles: ["substation_core", "archive_cluster", "service_block"], visualWeight: { close: 0.5, mid: 0.3, far: 0.15 }, bestViewAngle: 45, lodTier: 0, tags: ["wall_door", "single", "interior_face", "thin"] },

	// --- Window walls: Side A = exterior (thick mullions), Side B = interior (thin) ---
	{ id: "walls_longwindow_wall_sidea", label: "Long Window Wall (Ext)", assetPath: "city/Walls/LongWindow_Wall_SideA.glb", family: "wall_window", bbox: { w: 4.0, d: 1.06, h: 4.43 }, tris: 332, materialSlots: 5, gridFootprint: [2, 1], placement: "edge", passability: "blocking", rotSymmetry: 2, zoneAffinity: ["core", "habitation", "power", "corridor"], adjacencyBias: ["window_run", "room_perimeter", "observation_post"], compositeRoles: ["substation_core", "tower_stack", "archive_cluster"], visualWeight: { close: 0.8, mid: 0.6, far: 0.3 }, bestViewAngle: 45, lodTier: 0, tags: ["wall", "window", "long_window", "exterior_face", "glass"] },
	{ id: "walls_longwindow_wall_sideb", label: "Long Window Wall (Int)", assetPath: "city/Walls/LongWindow_Wall_SideB.glb", family: "wall_window", bbox: { w: 4.0, d: 0.54, h: 4.43 }, tris: 316, materialSlots: 5, gridFootprint: [2, 1], placement: "edge", passability: "blocking", rotSymmetry: 2, zoneAffinity: ["core", "habitation", "power", "corridor"], adjacencyBias: ["window_run", "room_interior"], compositeRoles: ["substation_core", "archive_cluster"], visualWeight: { close: 0.6, mid: 0.4, far: 0.2 }, bestViewAngle: 45, lodTier: 0, tags: ["wall", "window", "long_window", "interior_face", "thin"] },
	{ id: "walls_smallwindows_wall_sidea", label: "Small Windows Wall (Ext)", assetPath: "city/Walls/SmallWindows_Wall_SideA.glb", family: "wall_window", bbox: { w: 4.0, d: 1.06, h: 4.43 }, tris: 794, materialSlots: 5, gridFootprint: [2, 1], placement: "edge", passability: "blocking", rotSymmetry: 2, zoneAffinity: ["habitation", "core", "corridor"], adjacencyBias: ["window_run", "room_perimeter"], compositeRoles: ["archive_cluster", "service_block"], visualWeight: { close: 0.9, mid: 0.6, far: 0.3 }, bestViewAngle: 45, lodTier: 0, tags: ["wall", "window", "small_windows", "exterior_face", "glass", "detailed"] },
	{ id: "walls_smallwindows_wall_sideb", label: "Small Windows Wall (Int)", assetPath: "city/Walls/SmallWindows_Wall_SideB.glb", family: "wall_window", bbox: { w: 4.0, d: 0.53, h: 4.43 }, tris: 742, materialSlots: 5, gridFootprint: [2, 1], placement: "edge", passability: "blocking", rotSymmetry: 2, zoneAffinity: ["habitation", "core", "corridor"], adjacencyBias: ["window_run", "room_interior"], compositeRoles: ["archive_cluster", "service_block"], visualWeight: { close: 0.7, mid: 0.4, far: 0.2 }, bestViewAngle: 45, lodTier: 0, tags: ["wall", "window", "small_windows", "interior_face", "thin"] },
	{ id: "walls_threewindows_wall_sidea", label: "Three Windows Wall (Ext)", assetPath: "city/Walls/ThreeWindows_Wall_SideA.glb", family: "wall_window", bbox: { w: 4.0, d: 1.06, h: 4.43 }, tris: 794, materialSlots: 5, gridFootprint: [2, 1], placement: "edge", passability: "blocking", rotSymmetry: 2, zoneAffinity: ["core", "habitation", "power"], adjacencyBias: ["window_run", "room_perimeter", "observation_post"], compositeRoles: ["substation_core", "tower_stack"], visualWeight: { close: 0.9, mid: 0.6, far: 0.3 }, bestViewAngle: 45, lodTier: 0, tags: ["wall", "window", "three_windows", "exterior_face", "glass", "detailed"] },
	{ id: "walls_threewindows_wall_sideb", label: "Three Windows Wall (Int)", assetPath: "city/Walls/ThreeWindows_Wall_SideB.glb", family: "wall_window", bbox: { w: 4.0, d: 0.53, h: 4.43 }, tris: 742, materialSlots: 5, gridFootprint: [2, 1], placement: "edge", passability: "blocking", rotSymmetry: 2, zoneAffinity: ["core", "habitation", "power"], adjacencyBias: ["window_run", "room_interior"], compositeRoles: ["substation_core", "tower_stack"], visualWeight: { close: 0.7, mid: 0.4, far: 0.2 }, bestViewAngle: 45, lodTier: 0, tags: ["wall", "window", "three_windows", "interior_face", "thin"] },
	{ id: "walls_window_wall_sidea", label: "Single Window Wall (Ext)", assetPath: "city/Walls/Window_Wall_SideA.glb", family: "wall_window", bbox: { w: 4.0, d: 1.06, h: 4.43 }, tris: 332, materialSlots: 5, gridFootprint: [2, 1], placement: "edge", passability: "blocking", rotSymmetry: 2, zoneAffinity: ["core", "habitation", "corridor", "power"], adjacencyBias: ["window_run", "room_perimeter"], compositeRoles: ["substation_core", "archive_cluster", "service_block"], visualWeight: { close: 0.8, mid: 0.5, far: 0.25 }, bestViewAngle: 45, lodTier: 0, tags: ["wall", "window", "single_window", "exterior_face", "glass"] },
	{ id: "walls_window_wall_sideb", label: "Single Window Wall (Int)", assetPath: "city/Walls/Window_Wall_SideB.glb", family: "wall_window", bbox: { w: 4.0, d: 0.54, h: 4.43 }, tris: 316, materialSlots: 5, gridFootprint: [2, 1], placement: "edge", passability: "blocking", rotSymmetry: 2, zoneAffinity: ["core", "habitation", "corridor", "power"], adjacencyBias: ["window_run", "room_interior"], compositeRoles: ["substation_core", "archive_cluster", "service_block"], visualWeight: { close: 0.6, mid: 0.3, far: 0.15 }, bestViewAngle: 45, lodTier: 0, tags: ["wall", "window", "single_window", "interior_face", "thin"] },

	// --- Solid walls: increasing detail density (Wall_1=simplest, Wall_5=most detailed) ---
	{ id: "walls_wall_1", label: "Solid Wall - Simple", assetPath: "city/Walls/Wall_1.glb", family: "wall", bbox: { w: 4.0, d: 0.55, h: 4.43 }, tris: 1088, materialSlots: 4, gridFootprint: [2, 1], placement: "edge", passability: "blocking", rotSymmetry: 2, zoneAffinity: ["core", "corridor", "habitation", "fabrication", "power", "storage"], adjacencyBias: ["wall_edge", "sealed_room", "corridor_run"], compositeRoles: ["substation_core", "tower_stack", "relay_spine", "service_block", "storage_block", "fabrication_hub", "defensive_gate", "transit_node", "archive_cluster"], visualWeight: { close: 0.7, mid: 0.5, far: 0.3 }, bestViewAngle: 45, lodTier: 0, tags: ["wall", "solid", "structural_shell", "workhorse"] },
	{ id: "walls_wall_2", label: "Solid Wall - Detailed", assetPath: "city/Walls/Wall_2.glb", family: "wall", bbox: { w: 4.0, d: 0.53, h: 4.43 }, tris: 2106, materialSlots: 6, gridFootprint: [2, 1], placement: "edge", passability: "blocking", rotSymmetry: 2, zoneAffinity: ["core", "fabrication", "power"], adjacencyBias: ["wall_edge", "sealed_room", "technical_zone"], compositeRoles: ["substation_core", "fabrication_hub", "power_sink_array", "archive_cluster"], visualWeight: { close: 0.9, mid: 0.7, far: 0.4 }, bestViewAngle: 45, lodTier: 0, tags: ["wall", "solid", "detailed", "highest_tri_wall"] },
	{ id: "walls_wall_3", label: "Solid Wall - Accent", assetPath: "city/Walls/Wall_3.glb", family: "wall", bbox: { w: 4.0, d: 0.52, h: 4.43 }, tris: 1148, materialSlots: 6, gridFootprint: [2, 1], placement: "edge", passability: "blocking", rotSymmetry: 2, zoneAffinity: ["core", "corridor", "habitation", "power"], adjacencyBias: ["wall_edge", "accent_zone", "room_perimeter"], compositeRoles: ["substation_core", "tower_stack", "archive_cluster"], visualWeight: { close: 0.8, mid: 0.6, far: 0.35 }, bestViewAngle: 45, lodTier: 0, tags: ["wall", "solid", "accent", "6_material"] },
	{ id: "walls_wall_4", label: "Solid Wall - Industrial", assetPath: "city/Walls/Wall_4.glb", family: "wall", bbox: { w: 4.0, d: 0.57, h: 4.43 }, tris: 1356, materialSlots: 4, gridFootprint: [2, 1], placement: "edge", passability: "blocking", rotSymmetry: 2, zoneAffinity: ["fabrication", "storage", "power", "corridor"], adjacencyBias: ["wall_edge", "utility_spine", "fabrication_hub"], compositeRoles: ["fabrication_hub", "storage_block", "power_sink_array", "defensive_gate"], visualWeight: { close: 0.8, mid: 0.6, far: 0.35 }, bestViewAngle: 45, lodTier: 0, tags: ["wall", "solid", "industrial", "thick"] },
	{ id: "walls_wall_5", label: "Solid Wall - Heavy", assetPath: "city/Walls/Wall_5.glb", family: "wall", bbox: { w: 4.0, d: 0.53, h: 4.43 }, tris: 1414, materialSlots: 6, gridFootprint: [2, 1], placement: "edge", passability: "blocking", rotSymmetry: 2, zoneAffinity: ["core", "power", "fabrication"], adjacencyBias: ["wall_edge", "power_cluster", "technical_zone"], compositeRoles: ["substation_core", "power_sink_array", "fabrication_hub"], visualWeight: { close: 0.9, mid: 0.7, far: 0.4 }, bestViewAngle: 45, lodTier: 0, tags: ["wall", "solid", "heavy", "6_material", "landmark_wall"] },
	{ id: "walls_wall_empty", label: "Solid Wall - Empty", assetPath: "city/Walls/Wall_Empty.glb", family: "wall", bbox: { w: 4.0, d: 0.5, h: 4.43 }, tris: 314, materialSlots: 4, gridFootprint: [2, 1], placement: "edge", passability: "blocking", rotSymmetry: 2, zoneAffinity: ["core", "corridor", "habitation", "fabrication", "power", "storage", "breach", "cult_ruin"], adjacencyBias: ["wall_edge", "filler", "sealed_room"], compositeRoles: ["substation_core", "tower_stack", "relay_spine", "service_block", "storage_block", "fabrication_hub", "defensive_gate", "transit_node", "archive_cluster", "cult_incursion"], visualWeight: { close: 0.3, mid: 0.2, far: 0.15 }, bestViewAngle: 45, lodTier: 0, tags: ["wall", "solid", "minimal", "filler", "cheapest_wall"] },
];

// ---------------------------------------------------------------------------
// Detail family — signage (8), panels (8), pipework/vents (10)
// ---------------------------------------------------------------------------

const details: ModelEntry[] = [
	// --- Signage: flat directional/status decals for wall surfaces ---
	{ id: "details_details_arrow", label: "Arrow Sign", assetPath: "city/Details/Details_Arrow.glb", family: "detail_signage", bbox: { w: 0.36, d: 0.05, h: 0.34 }, tris: 56, materialSlots: 1, gridFootprint: [1, 1], placement: "surface", passability: "guidance", rotSymmetry: 1, zoneAffinity: ["corridor", "core", "power"], adjacencyBias: ["door_threshold", "transit_node", "corridor_run"], compositeRoles: ["relay_spine", "transit_node"], visualWeight: { close: 0.3, mid: 0.05, far: 0.0 }, bestViewAngle: 35, lodTier: 2, tags: ["signage", "directional", "arrow", "wayfinding"] },
	{ id: "details_details_arrow_2", label: "Arrow Sign Variant", assetPath: "city/Details/Details_Arrow_2.glb", family: "detail_signage", bbox: { w: 0.37, d: 0.07, h: 0.25 }, tris: 54, materialSlots: 1, gridFootprint: [1, 1], placement: "surface", passability: "guidance", rotSymmetry: 1, zoneAffinity: ["corridor", "core", "fabrication"], adjacencyBias: ["door_threshold", "transit_node", "corridor_run"], compositeRoles: ["relay_spine", "transit_node"], visualWeight: { close: 0.3, mid: 0.05, far: 0.0 }, bestViewAngle: 35, lodTier: 2, tags: ["signage", "directional", "arrow", "wayfinding"] },
	{ id: "details_details_output", label: "Output Indicator", assetPath: "city/Details/Details_Output.glb", family: "detail_signage", bbox: { w: 0.3, d: 0.06, h: 0.3 }, tris: 316, materialSlots: 2, gridFootprint: [1, 1], placement: "surface", passability: "guidance", rotSymmetry: 4, zoneAffinity: ["fabrication", "power", "core"], adjacencyBias: ["machine_cluster", "fabrication_hub", "power_sink_array"], compositeRoles: ["fabrication_hub", "power_sink_array"], visualWeight: { close: 0.3, mid: 0.05, far: 0.0 }, bestViewAngle: 35, lodTier: 2, tags: ["signage", "status", "output_indicator"] },
	{ id: "details_details_output_small", label: "Small Output Indicator", assetPath: "city/Details/Details_Output_Small.glb", family: "detail_signage", bbox: { w: 0.16, d: 0.05, h: 0.16 }, tris: 158, materialSlots: 1, gridFootprint: [1, 1], placement: "surface", passability: "guidance", rotSymmetry: 4, zoneAffinity: ["fabrication", "power", "corridor"], adjacencyBias: ["machine_cluster", "utility_spine"], compositeRoles: ["fabrication_hub"], visualWeight: { close: 0.15, mid: 0.02, far: 0.0 }, bestViewAngle: 35, lodTier: 2, tags: ["signage", "status", "tiny"] },
	{ id: "details_details_x", label: "X Marker", assetPath: "city/Details/Details_X.glb", family: "detail_signage", bbox: { w: 0.32, d: 0.02, h: 0.32 }, tris: 44, materialSlots: 1, gridFootprint: [1, 1], placement: "surface", passability: "guidance", rotSymmetry: 4, zoneAffinity: ["breach", "cult_ruin", "power", "corridor"], adjacencyBias: ["hazard_zone", "sealed_area", "door_threshold"], compositeRoles: ["defensive_gate", "cult_incursion"], visualWeight: { close: 0.25, mid: 0.03, far: 0.0 }, bestViewAngle: 35, lodTier: 2, tags: ["signage", "warning", "hazard_marker"] },
	{ id: "details_details_dots", label: "Dot Pattern", assetPath: "city/Details/Details_Dots.glb", family: "detail_signage", bbox: { w: 0.55, d: 0.06, h: 0.22 }, tris: 378, materialSlots: 1, gridFootprint: [1, 1], placement: "surface", passability: "guidance", rotSymmetry: 2, zoneAffinity: ["corridor", "habitation", "core"], adjacencyBias: ["procedural_floor", "wall_base", "transit_node"], compositeRoles: ["relay_spine", "service_block"], visualWeight: { close: 0.2, mid: 0.03, far: 0.0 }, bestViewAngle: 35, lodTier: 2, tags: ["signage", "pattern", "decorative"] },
	{ id: "details_details_hexagon", label: "Hexagon Marker", assetPath: "city/Details/Details_Hexagon.glb", family: "detail_signage", bbox: { w: 0.34, d: 0.08, h: 0.39 }, tris: 56, materialSlots: 1, gridFootprint: [1, 1], placement: "surface", passability: "guidance", rotSymmetry: 4, zoneAffinity: ["core", "power"], adjacencyBias: ["substation_core", "power_cluster", "archive_cluster"], compositeRoles: ["substation_core", "power_sink_array"], visualWeight: { close: 0.25, mid: 0.03, far: 0.0 }, bestViewAngle: 35, lodTier: 2, tags: ["signage", "symbol", "hex_marker"] },
	{ id: "details_details_triangles", label: "Triangle Warning", assetPath: "city/Details/Details_Triangles.glb", family: "detail_signage", bbox: { w: 0.48, d: 0.03, h: 0.16 }, tris: 24, materialSlots: 1, gridFootprint: [1, 1], placement: "surface", passability: "guidance", rotSymmetry: 2, zoneAffinity: ["power", "fabrication", "breach"], adjacencyBias: ["hazard_zone", "power_sink_array", "machine_cluster"], compositeRoles: ["power_sink_array", "defensive_gate"], visualWeight: { close: 0.2, mid: 0.02, far: 0.0 }, bestViewAngle: 35, lodTier: 2, tags: ["signage", "warning", "hazard_marker", "tiniest_detail"] },

	// --- Panels: mechanical wall-mounted plates adding texture relief ---
	{ id: "details_details_basic_1", label: "Basic Panel Small", assetPath: "city/Details/Details_Basic_1.glb", family: "detail_panel", bbox: { w: 0.27, d: 0.05, h: 0.27 }, tris: 130, materialSlots: 2, gridFootprint: [1, 1], placement: "surface", passability: "guidance", rotSymmetry: 4, zoneAffinity: ["core", "fabrication", "storage", "corridor"], adjacencyBias: ["wall_base", "service_block", "sealed_room"], compositeRoles: ["service_block", "fabrication_hub", "storage_block"], visualWeight: { close: 0.3, mid: 0.05, far: 0.0 }, bestViewAngle: 35, lodTier: 2, tags: ["panel", "trim", "small", "mechanical"] },
	{ id: "details_details_basic_2", label: "Basic Panel Tall", assetPath: "city/Details/Details_Basic_2.glb", family: "detail_panel", bbox: { w: 0.27, d: 0.05, h: 0.53 }, tris: 212, materialSlots: 2, gridFootprint: [1, 1], placement: "surface", passability: "guidance", rotSymmetry: 2, zoneAffinity: ["core", "fabrication", "storage", "corridor"], adjacencyBias: ["wall_base", "service_block", "utility_spine"], compositeRoles: ["service_block", "fabrication_hub"], visualWeight: { close: 0.35, mid: 0.06, far: 0.0 }, bestViewAngle: 35, lodTier: 2, tags: ["panel", "trim", "tall", "mechanical"] },
	{ id: "details_details_basic_3", label: "Basic Panel Square", assetPath: "city/Details/Details_Basic_3.glb", family: "detail_panel", bbox: { w: 0.31, d: 0.04, h: 0.31 }, tris: 56, materialSlots: 1, gridFootprint: [1, 1], placement: "surface", passability: "guidance", rotSymmetry: 4, zoneAffinity: ["core", "corridor", "habitation"], adjacencyBias: ["wall_base", "procedural_floor"], compositeRoles: ["service_block"], visualWeight: { close: 0.2, mid: 0.03, far: 0.0 }, bestViewAngle: 35, lodTier: 2, tags: ["panel", "trim", "minimal"] },
	{ id: "details_details_basic_4", label: "Basic Panel Wide", assetPath: "city/Details/Details_Basic_4.glb", family: "detail_panel", bbox: { w: 0.68, d: 0.07, h: 0.46 }, tris: 140, materialSlots: 2, gridFootprint: [1, 1], placement: "surface", passability: "guidance", rotSymmetry: 2, zoneAffinity: ["fabrication", "storage", "power", "corridor"], adjacencyBias: ["wall_base", "machine_cluster", "service_block"], compositeRoles: ["fabrication_hub", "service_block", "storage_block"], visualWeight: { close: 0.35, mid: 0.06, far: 0.0 }, bestViewAngle: 35, lodTier: 2, tags: ["panel", "trim", "wide", "mechanical"] },
	{ id: "details_details_plate_details", label: "Detailed Plate", assetPath: "city/Details/Details_Plate_Details.glb", family: "detail_panel", bbox: { w: 0.62, d: 0.03, h: 0.62 }, tris: 368, materialSlots: 3, gridFootprint: [1, 1], placement: "surface", passability: "guidance", rotSymmetry: 4, zoneAffinity: ["core", "fabrication", "power"], adjacencyBias: ["wall_base", "technical_zone", "substation_core"], compositeRoles: ["substation_core", "fabrication_hub"], visualWeight: { close: 0.4, mid: 0.08, far: 0.0 }, bestViewAngle: 35, lodTier: 2, tags: ["panel", "plate", "detailed", "technical"] },
	{ id: "details_details_plate_large", label: "Large Plate", assetPath: "city/Details/Details_Plate_Large.glb", family: "detail_panel", bbox: { w: 1.05, d: 0.03, h: 1.08 }, tris: 356, materialSlots: 2, gridFootprint: [1, 1], placement: "surface", passability: "guidance", rotSymmetry: 4, zoneAffinity: ["core", "fabrication", "storage", "corridor"], adjacencyBias: ["wall_base", "sealed_room", "service_block"], compositeRoles: ["service_block", "fabrication_hub", "archive_cluster"], visualWeight: { close: 0.5, mid: 0.1, far: 0.0 }, bestViewAngle: 35, lodTier: 2, tags: ["panel", "plate", "large", "wall_cover"] },
	{ id: "details_details_plate_long", label: "Long Plate", assetPath: "city/Details/Details_Plate_Long.glb", family: "detail_panel", bbox: { w: 1.05, d: 0.03, h: 0.35 }, tris: 356, materialSlots: 2, gridFootprint: [1, 1], placement: "surface", passability: "guidance", rotSymmetry: 2, zoneAffinity: ["corridor", "fabrication", "power"], adjacencyBias: ["wall_base", "corridor_run", "utility_spine"], compositeRoles: ["relay_spine", "service_block"], visualWeight: { close: 0.35, mid: 0.06, far: 0.0 }, bestViewAngle: 35, lodTier: 2, tags: ["panel", "plate", "long", "baseboard"] },
	{ id: "details_details_plate_small", label: "Small Plate", assetPath: "city/Details/Details_Plate_Small.glb", family: "detail_panel", bbox: { w: 0.4, d: 0.03, h: 0.35 }, tris: 300, materialSlots: 2, gridFootprint: [1, 1], placement: "surface", passability: "guidance", rotSymmetry: 2, zoneAffinity: ["core", "storage", "corridor"], adjacencyBias: ["wall_base", "sealed_room"], compositeRoles: ["service_block", "storage_block"], visualWeight: { close: 0.2, mid: 0.03, far: 0.0 }, bestViewAngle: 35, lodTier: 2, tags: ["panel", "plate", "small"] },

	// --- Pipework and vents: 3D detail pieces that protrude from surfaces ---
	{ id: "details_details_cylinder", label: "Cylinder Fixture", assetPath: "city/Details/Details_Cylinder.glb", family: "detail_pipework", bbox: { w: 0.43, d: 0.19, h: 0.38 }, tris: 374, materialSlots: 2, gridFootprint: [1, 1], placement: "surface", passability: "cover", rotSymmetry: 4, zoneAffinity: ["power", "fabrication", "storage", "corridor"], adjacencyBias: ["utility_spine", "power_sink_array", "machine_cluster"], compositeRoles: ["power_sink_array", "fabrication_hub", "service_block"], visualWeight: { close: 0.4, mid: 0.08, far: 0.0 }, bestViewAngle: 45, lodTier: 2, tags: ["pipework", "cylinder", "wall_mounted"] },
	{ id: "details_details_cylinder_long", label: "Long Cylinder Fixture", assetPath: "city/Details/Details_Cylinder_Long.glb", family: "detail_pipework", bbox: { w: 0.79, d: 0.19, h: 0.38 }, tris: 374, materialSlots: 2, gridFootprint: [1, 1], placement: "surface", passability: "cover", rotSymmetry: 2, zoneAffinity: ["power", "fabrication", "corridor"], adjacencyBias: ["utility_spine", "power_sink_array", "corridor_run"], compositeRoles: ["power_sink_array", "relay_spine", "fabrication_hub"], visualWeight: { close: 0.45, mid: 0.1, far: 0.0 }, bestViewAngle: 45, lodTier: 2, tags: ["pipework", "cylinder", "long", "wall_mounted"] },
	{ id: "details_details_pipes_long", label: "Long Pipe Run", assetPath: "city/Details/Details_Pipes_Long.glb", family: "detail_pipework", bbox: { w: 0.51, d: 0.09, h: 1.59 }, tris: 498, materialSlots: 4, gridFootprint: [1, 1], placement: "surface", passability: "cover", rotSymmetry: 2, zoneAffinity: ["power", "fabrication", "corridor"], adjacencyBias: ["utility_spine", "power_sink_array", "wall_edge"], compositeRoles: ["power_sink_array", "relay_spine", "fabrication_hub"], visualWeight: { close: 0.6, mid: 0.15, far: 0.0 }, bestViewAngle: 45, lodTier: 2, tags: ["pipework", "pipes", "long", "vertical", "wall_mounted"] },
	{ id: "details_details_pipes_medium", label: "Medium Pipe Run", assetPath: "city/Details/Details_Pipes_Medium.glb", family: "detail_pipework", bbox: { w: 0.51, d: 0.09, h: 0.77 }, tris: 498, materialSlots: 4, gridFootprint: [1, 1], placement: "surface", passability: "cover", rotSymmetry: 2, zoneAffinity: ["power", "fabrication", "storage", "corridor"], adjacencyBias: ["utility_spine", "power_sink_array", "wall_edge"], compositeRoles: ["power_sink_array", "fabrication_hub"], visualWeight: { close: 0.5, mid: 0.1, far: 0.0 }, bestViewAngle: 45, lodTier: 2, tags: ["pipework", "pipes", "medium", "vertical", "wall_mounted"] },
	{ id: "details_details_pipes_small", label: "Small Pipe Cluster", assetPath: "city/Details/Details_Pipes_Small.glb", family: "detail_pipework", bbox: { w: 0.35, d: 0.11, h: 0.25 }, tris: 498, materialSlots: 4, gridFootprint: [1, 1], placement: "surface", passability: "cover", rotSymmetry: 4, zoneAffinity: ["power", "fabrication", "storage", "corridor"], adjacencyBias: ["utility_spine", "machine_cluster"], compositeRoles: ["fabrication_hub", "service_block"], visualWeight: { close: 0.35, mid: 0.06, far: 0.0 }, bestViewAngle: 45, lodTier: 2, tags: ["pipework", "pipes", "small", "wall_mounted"] },
	{ id: "details_details_vent_1", label: "Rectangular Vent", assetPath: "city/Details/Details_Vent_1.glb", family: "detail_pipework", bbox: { w: 0.53, d: 0.04, h: 0.31 }, tris: 164, materialSlots: 3, gridFootprint: [1, 1], placement: "surface", passability: "cover", rotSymmetry: 2, zoneAffinity: ["fabrication", "storage", "habitation", "corridor"], adjacencyBias: ["ventilation_cluster", "wall_base", "sealed_room"], compositeRoles: ["service_block", "fabrication_hub"], visualWeight: { close: 0.3, mid: 0.05, far: 0.0 }, bestViewAngle: 35, lodTier: 2, tags: ["vent", "rectangular", "wall_mounted", "hvac"] },
	{ id: "details_details_vent_2", label: "Square Vent", assetPath: "city/Details/Details_Vent_2.glb", family: "detail_pipework", bbox: { w: 0.31, d: 0.04, h: 0.31 }, tris: 136, materialSlots: 3, gridFootprint: [1, 1], placement: "surface", passability: "cover", rotSymmetry: 4, zoneAffinity: ["habitation", "corridor", "storage"], adjacencyBias: ["ventilation_cluster", "wall_base"], compositeRoles: ["service_block"], visualWeight: { close: 0.25, mid: 0.04, far: 0.0 }, bestViewAngle: 35, lodTier: 2, tags: ["vent", "square", "wall_mounted", "hvac"] },
	{ id: "details_details_vent_3", label: "Wide Vent Grille", assetPath: "city/Details/Details_Vent_3.glb", family: "detail_pipework", bbox: { w: 1.05, d: 0.03, h: 0.22 }, tris: 540, materialSlots: 2, gridFootprint: [1, 1], placement: "surface", passability: "cover", rotSymmetry: 2, zoneAffinity: ["power", "fabrication", "corridor"], adjacencyBias: ["ventilation_cluster", "utility_spine", "corridor_run"], compositeRoles: ["relay_spine", "fabrication_hub", "power_sink_array"], visualWeight: { close: 0.4, mid: 0.08, far: 0.0 }, bestViewAngle: 35, lodTier: 2, tags: ["vent", "wide", "grille", "wall_mounted", "hvac"] },
	{ id: "details_details_vent_4", label: "Deep Vent Box", assetPath: "city/Details/Details_Vent_4.glb", family: "detail_pipework", bbox: { w: 0.24, d: 0.09, h: 0.38 }, tris: 630, materialSlots: 3, gridFootprint: [1, 1], placement: "surface", passability: "cover", rotSymmetry: 4, zoneAffinity: ["power", "fabrication", "storage"], adjacencyBias: ["ventilation_cluster", "machine_cluster"], compositeRoles: ["power_sink_array", "fabrication_hub"], visualWeight: { close: 0.35, mid: 0.06, far: 0.0 }, bestViewAngle: 45, lodTier: 2, tags: ["vent", "deep", "protruding", "hvac"] },
	{ id: "details_details_vent_5", label: "Wide Vent Box", assetPath: "city/Details/Details_Vent_5.glb", family: "detail_pipework", bbox: { w: 0.69, d: 0.09, h: 0.38 }, tris: 630, materialSlots: 3, gridFootprint: [1, 1], placement: "surface", passability: "cover", rotSymmetry: 2, zoneAffinity: ["power", "fabrication", "corridor"], adjacencyBias: ["ventilation_cluster", "utility_spine", "machine_cluster"], compositeRoles: ["power_sink_array", "relay_spine", "fabrication_hub"], visualWeight: { close: 0.45, mid: 0.08, far: 0.0 }, bestViewAngle: 45, lodTier: 2, tags: ["vent", "wide", "protruding", "hvac"] },
];

// ---------------------------------------------------------------------------
// Export the complete atlas
// ---------------------------------------------------------------------------

export const ECUMENOPOLIS_MODEL_ATLAS: ModelEntry[] = [
	...columns,
	...doors,
	...floors,
	...props,
	...utility,
	...roofs,
	...walls,
	...details,
];

/** Quick lookup by ID */
export const MODEL_BY_ID = Object.fromEntries(
	ECUMENOPOLIS_MODEL_ATLAS.map((m) => [m.id, m]),
) as Record<string, ModelEntry>;

/** Get models suitable for a zone, sorted by visual weight at mid distance */
export function getModelsForZone(zone: ZoneType): ModelEntry[] {
	return ECUMENOPOLIS_MODEL_ATLAS.filter((m) =>
		m.zoneAffinity.includes(zone),
	).sort((a, b) => b.visualWeight.mid - a.visualWeight.mid);
}

/** Get models by family */
export function getModelsByFamily(family: ModelFamily): ModelEntry[] {
	return ECUMENOPOLIS_MODEL_ATLAS.filter((m) => m.family === family);
}

/** Get LOD-appropriate models for a zoom tier (0=close, 1=mid, 2=far) */
export function getModelsForLOD(lodMax: 0 | 1 | 2): ModelEntry[] {
	return ECUMENOPOLIS_MODEL_ATLAS.filter((m) => m.lodTier <= lodMax);
}

// ---------------------------------------------------------------------------
// Photorealistic texture curation for the ecumenopolis
// ---------------------------------------------------------------------------

export interface TextureCuration {
	id: string;
	label: string;
	sourceLibraryDir: string;
	category: "metal" | "concrete" | "walkway" | "plate" | "rust" | "grate" | "painted" | "tile" | "pipe" | "steel";
	purpose: string;
	zoneAffinity: ZoneType[];
	surfaceType: "floor" | "wall" | "ceiling" | "detail" | "overlay" | "environment";
	visualMood: "clean" | "worn" | "industrial" | "rusted" | "sterile" | "heavy";
	tilingQuality: "seamless" | "good" | "directional";
}

export const CURATED_TEXTURES: TextureCuration[] = [
	// --- METALS (structural shell, walls, ceilings) ---
	{ id: "metal_brushed_dark", label: "Dark Brushed Metal", sourceLibraryDir: "Metal001", category: "metal", purpose: "Wall panels, structural shell", zoneAffinity: ["core", "corridor", "power"], surfaceType: "wall", visualMood: "industrial", tilingQuality: "seamless" },
	{ id: "metal_scratched", label: "Scratched Metal", sourceLibraryDir: "Metal005", category: "metal", purpose: "Worn structural surfaces", zoneAffinity: ["fabrication", "storage", "breach"], surfaceType: "wall", visualMood: "worn", tilingQuality: "seamless" },
	{ id: "metal_polished", label: "Polished Metal", sourceLibraryDir: "Metal010", category: "metal", purpose: "Core command surfaces", zoneAffinity: ["core"], surfaceType: "wall", visualMood: "clean", tilingQuality: "seamless" },
	{ id: "metal_aged", label: "Aged Metal", sourceLibraryDir: "Metal015", category: "metal", purpose: "Ancient arcology surfaces", zoneAffinity: ["cult_ruin", "breach"], surfaceType: "wall", visualMood: "worn", tilingQuality: "seamless" },
	{ id: "metal_heavy", label: "Heavy Industrial Metal", sourceLibraryDir: "Metal020", category: "metal", purpose: "Power plant walls, foundry cladding", zoneAffinity: ["power", "fabrication"], surfaceType: "wall", visualMood: "heavy", tilingQuality: "seamless" },

	// --- METAL PLATES (wall panels, modular surfaces) ---
	{ id: "plates_riveted", label: "Riveted Plate", sourceLibraryDir: "MetalPlates001", category: "plate", purpose: "Wall panel overlay, bulkhead cladding", zoneAffinity: ["corridor", "power", "fabrication"], surfaceType: "wall", visualMood: "industrial", tilingQuality: "seamless" },
	{ id: "plates_heavy", label: "Heavy Plate", sourceLibraryDir: "MetalPlates005", category: "plate", purpose: "Blast doors, reinforced walls", zoneAffinity: ["power", "core"], surfaceType: "wall", visualMood: "heavy", tilingQuality: "seamless" },
	{ id: "plates_scored", label: "Scored Plate", sourceLibraryDir: "MetalPlates010", category: "plate", purpose: "Battle-worn walls, damaged sectors", zoneAffinity: ["breach", "cult_ruin"], surfaceType: "wall", visualMood: "worn", tilingQuality: "seamless" },

	// --- METAL WALKWAYS (corridor floors, catwalks) ---
	{ id: "walkway_standard", label: "Standard Walkway", sourceLibraryDir: "MetalWalkway001", category: "walkway", purpose: "Primary corridor floor", zoneAffinity: ["corridor", "fabrication"], surfaceType: "floor", visualMood: "industrial", tilingQuality: "seamless" },
	{ id: "walkway_heavy", label: "Heavy Walkway", sourceLibraryDir: "MetalWalkway005", category: "walkway", purpose: "Load-bearing floors, vehicle decks", zoneAffinity: ["fabrication", "storage"], surfaceType: "floor", visualMood: "heavy", tilingQuality: "seamless" },
	{ id: "walkway_fine", label: "Fine Grid Walkway", sourceLibraryDir: "MetalWalkway010", category: "walkway", purpose: "Service catwalks, maintenance decks", zoneAffinity: ["power", "corridor"], surfaceType: "floor", visualMood: "industrial", tilingQuality: "seamless" },

	// --- DIAMOND PLATE (industrial floors) ---
	{ id: "diamond_standard", label: "Diamond Plate", sourceLibraryDir: "DiamondPlate001", category: "plate", purpose: "Standard industrial floor", zoneAffinity: ["fabrication", "storage", "power"], surfaceType: "floor", visualMood: "industrial", tilingQuality: "seamless" },
	{ id: "diamond_worn", label: "Worn Diamond Plate", sourceLibraryDir: "DiamondPlate003", category: "plate", purpose: "High-traffic industrial floor", zoneAffinity: ["fabrication", "corridor"], surfaceType: "floor", visualMood: "worn", tilingQuality: "seamless" },

	// --- CORRUGATED STEEL (roofs, exterior cladding) ---
	{ id: "corrugated_clean", label: "Clean Corrugated", sourceLibraryDir: "CorrugatedSteel001", category: "steel", purpose: "Roof cladding, exterior shell", zoneAffinity: ["storage", "corridor"], surfaceType: "ceiling", visualMood: "industrial", tilingQuality: "directional" },
	{ id: "corrugated_rusted", label: "Rusted Corrugated", sourceLibraryDir: "CorrugatedSteel004", category: "steel", purpose: "Exposed/damaged roof sections", zoneAffinity: ["breach", "cult_ruin"], surfaceType: "ceiling", visualMood: "rusted", tilingQuality: "directional" },

	// --- CONCRETE (foundations, heavy structural) ---
	{ id: "concrete_smooth", label: "Smooth Concrete", sourceLibraryDir: "Concrete001", category: "concrete", purpose: "Foundation floors, core walls", zoneAffinity: ["core", "habitation"], surfaceType: "floor", visualMood: "sterile", tilingQuality: "seamless" },
	{ id: "concrete_stained", label: "Stained Concrete", sourceLibraryDir: "Concrete010", category: "concrete", purpose: "Aged foundation, water damage", zoneAffinity: ["habitation", "corridor"], surfaceType: "floor", visualMood: "worn", tilingQuality: "seamless" },
	{ id: "concrete_cracked", label: "Cracked Concrete", sourceLibraryDir: "Concrete020", category: "concrete", purpose: "Damaged sectors, ruins", zoneAffinity: ["breach", "cult_ruin"], surfaceType: "floor", visualMood: "worn", tilingQuality: "seamless" },
	{ id: "concrete_bunker", label: "Bunker Concrete", sourceLibraryDir: "Concrete030", category: "concrete", purpose: "Fortified walls, blast protection", zoneAffinity: ["power", "core"], surfaceType: "wall", visualMood: "heavy", tilingQuality: "seamless" },

	// --- RUST (weathering overlays) ---
	{ id: "rust_light", label: "Light Rust", sourceLibraryDir: "Rust001", category: "rust", purpose: "Surface weathering overlay", zoneAffinity: ["breach", "storage", "cult_ruin"], surfaceType: "overlay", visualMood: "rusted", tilingQuality: "seamless" },
	{ id: "rust_heavy", label: "Heavy Rust", sourceLibraryDir: "Rust005", category: "rust", purpose: "Deep corrosion, abandoned sectors", zoneAffinity: ["breach", "cult_ruin"], surfaceType: "overlay", visualMood: "rusted", tilingQuality: "seamless" },

	// --- GRATES (ventilation, drainage) ---
	{ id: "grate_standard", label: "Standard Grate", sourceLibraryDir: "Grate001", category: "grate", purpose: "Floor grates, ventilation covers", zoneAffinity: ["power", "fabrication", "corridor"], surfaceType: "detail", visualMood: "industrial", tilingQuality: "seamless" },
	{ id: "grate_fine", label: "Fine Grate", sourceLibraryDir: "Grate002", category: "grate", purpose: "Service access panels, drainage", zoneAffinity: ["corridor", "storage"], surfaceType: "detail", visualMood: "industrial", tilingQuality: "seamless" },

	// --- PAINTED METAL (faction-colored, civic zones) ---
	{ id: "painted_grey", label: "Painted Grey", sourceLibraryDir: "PaintedMetal001", category: "painted", purpose: "Civic interior walls", zoneAffinity: ["habitation", "core"], surfaceType: "wall", visualMood: "sterile", tilingQuality: "seamless" },
	{ id: "painted_green", label: "Painted Green", sourceLibraryDir: "PaintedMetal005", category: "painted", purpose: "Medical/utility zone walls", zoneAffinity: ["habitation"], surfaceType: "wall", visualMood: "sterile", tilingQuality: "seamless" },
	{ id: "painted_blue", label: "Painted Blue", sourceLibraryDir: "PaintedMetal010", category: "painted", purpose: "Signal/data zone walls", zoneAffinity: ["core", "corridor"], surfaceType: "wall", visualMood: "sterile", tilingQuality: "seamless" },

	// --- TILES (refined floors for habitation/core) ---
	{ id: "tiles_industrial", label: "Industrial Tile", sourceLibraryDir: "Tiles001", category: "tile", purpose: "Clean industrial floor", zoneAffinity: ["core", "habitation"], surfaceType: "floor", visualMood: "sterile", tilingQuality: "seamless" },
	{ id: "tiles_dark", label: "Dark Tile", sourceLibraryDir: "Tiles010", category: "tile", purpose: "Command center floors", zoneAffinity: ["core"], surfaceType: "floor", visualMood: "clean", tilingQuality: "seamless" },
	{ id: "tiles_worn", label: "Worn Tile", sourceLibraryDir: "Tiles020", category: "tile", purpose: "Old habitation floors", zoneAffinity: ["habitation", "cult_ruin"], surfaceType: "floor", visualMood: "worn", tilingQuality: "seamless" },
];

/** Get textures suitable for a zone and surface type */
export function getTexturesForZone(
	zone: ZoneType,
	surfaceType?: TextureCuration["surfaceType"],
): TextureCuration[] {
	return CURATED_TEXTURES.filter(
		(t) =>
			t.zoneAffinity.includes(zone) &&
			(surfaceType == null || t.surfaceType === surfaceType),
	);
}

// ---------------------------------------------------------------------------
// HDRI curation for storm-bound atmosphere
// ---------------------------------------------------------------------------

export interface HDRICuration {
	id: string;
	label: string;
	sourceDir: string;
	timeOfDay: "night" | "evening" | "overcast" | "storm" | "indoor";
	mood: string;
	stormIntensity: number; // 0-1, how well this matches storm weather
}

export const CURATED_HDRIS: HDRICuration[] = [
	// Night sky — default ecumenopolis atmosphere
	{ id: "night_01", label: "Dark Industrial Night", sourceDir: "NightEnvironmentHDRI001", timeOfDay: "night", mood: "cold, distant stars, industrial haze", stormIntensity: 0.2 },
	{ id: "night_05", label: "Overcast Night", sourceDir: "NightEnvironmentHDRI005", timeOfDay: "night", mood: "heavy cloud cover, no stars, oppressive", stormIntensity: 0.6 },
	{ id: "night_10", label: "Storm Night", sourceDir: "NightEnvironmentHDRI010", timeOfDay: "night", mood: "pre-storm darkness, electric tension", stormIntensity: 0.8 },
	// Night sky variants
	{ id: "nightsky_dark", label: "Dark Sky", sourceDir: "NightSkyHDRI001", timeOfDay: "night", mood: "minimal light pollution", stormIntensity: 0.1 },
	{ id: "nightsky_cloudy", label: "Cloudy Night Sky", sourceDir: "NightSkyHDRI005", timeOfDay: "night", mood: "thick cloud layer", stormIntensity: 0.5 },
	// Evening — transition states
	{ id: "evening_01", label: "Amber Dusk", sourceDir: "EveningEnvironmentHDRI001", timeOfDay: "evening", mood: "warm industrial sunset, amber light", stormIntensity: 0.1 },
	{ id: "evening_04", label: "Storm Dusk", sourceDir: "EveningEnvironmentHDRI004", timeOfDay: "evening", mood: "approaching storm, dark orange", stormIntensity: 0.7 },
	// Indoor — for enclosed sectors
	{ id: "indoor_01", label: "Industrial Interior", sourceDir: "IndoorEnvironmentHDRI001", timeOfDay: "indoor", mood: "artificial light, contained", stormIntensity: 0.0 },
	{ id: "indoor_10", label: "Dark Interior", sourceDir: "IndoorEnvironmentHDRI010", timeOfDay: "indoor", mood: "low power, emergency lighting", stormIntensity: 0.0 },
	{ id: "indoor_15", label: "Warm Interior", sourceDir: "IndoorEnvironmentHDRI015", timeOfDay: "indoor", mood: "habitation warmth", stormIntensity: 0.0 },
];

/** Select HDRI based on storm intensity (0-1) */
export function selectHDRI(stormIntensity: number): HDRICuration {
	const sorted = [...CURATED_HDRIS].sort(
		(a, b) =>
			Math.abs(a.stormIntensity - stormIntensity) -
			Math.abs(b.stormIntensity - stormIntensity),
	);
	return sorted[0]!;
}

// ---------------------------------------------------------------------------
// Decal curation for environmental storytelling
// ---------------------------------------------------------------------------

export interface DecalCuration {
	id: string;
	label: string;
	sourceDir: string;
	category: "leaking" | "damage" | "marking" | "cover";
	purpose: string;
	zoneAffinity: ZoneType[];
}

export const CURATED_DECALS: DecalCuration[] = [
	{ id: "leaking_01", label: "Pipe Leak Stain", sourceDir: "Leaking001", category: "leaking", purpose: "Water/coolant leaks on floors", zoneAffinity: ["power", "fabrication", "corridor"] },
	{ id: "leaking_05", label: "Heavy Leak", sourceDir: "Leaking005", category: "leaking", purpose: "Major pipe failure staining", zoneAffinity: ["breach", "cult_ruin"] },
	{ id: "leaking_09", label: "Oil Seep", sourceDir: "Leaking009", category: "leaking", purpose: "Machine oil on industrial floors", zoneAffinity: ["fabrication", "storage"] },
	{ id: "asphalt_damage", label: "Surface Damage", sourceDir: "AsphaltDamage001", category: "damage", purpose: "Impact/wear damage on floors", zoneAffinity: ["breach", "corridor"] },
	{ id: "manhole_01", label: "Access Cover", sourceDir: "ManholeCover001", category: "cover", purpose: "Floor access panels", zoneAffinity: ["corridor", "power", "fabrication"] },
	{ id: "manhole_05", label: "Heavy Access Cover", sourceDir: "ManholeCover005", category: "cover", purpose: "Large floor access panels", zoneAffinity: ["power", "fabrication"] },
	{ id: "road_lines_01", label: "Lane Markings", sourceDir: "RoadLines001", category: "marking", purpose: "Transit lane markings", zoneAffinity: ["corridor"] },
	{ id: "road_lines_05", label: "Service Markings", sourceDir: "RoadLines005", category: "marking", purpose: "Service zone boundary markers", zoneAffinity: ["fabrication", "storage"] },
];

// ---------------------------------------------------------------------------
// Procedural vs Model balance strategy
// ---------------------------------------------------------------------------

/**
 * Defines what should be procedural geometry vs authored GLB models.
 *
 * The ecumenopolis look-and-feel depends on a precise balance:
 * - Procedural elements provide scale, uniformity, and seed-driven variation
 * - Authored models provide visual identity, landmark recognition, and detail
 *
 * The game is 2.5D isometric with a top-down camera at ~55-65 degrees.
 * At this angle, FLOORS are the dominant visual element.
 * WALLS create the vertical context at screen edges.
 * ROOFS cap the composition from above.
 * PROPS provide human-scale reference and interactive affordances.
 */
export const PROCEDURAL_VS_MODEL_STRATEGY = {
	/** Always procedural — provides scale and seed-driven variation */
	procedural: {
		ground_plane: "Infinite structural floor using PBR textures from CURATED_TEXTURES. Zone determines texture. Seed determines wear pattern.",
		fog_atmosphere: "GroundFog system with storm-reactive density. Procedural noise displacement.",
		lighting: "Dynamic sun/ambient from HDRI curation. Storm state drives intensity/color shift.",
		skybox: "HDRI environment maps from CURATED_HDRIS. Storm intensity selects map.",
		zone_boundaries: "Procedural edge blending between zone textures. No model needed.",
		sector_grid: "Grid lines and sector boundaries are procedural overlays.",
		infrastructure_overlays: "Power/signal/transit networks rendered as subsurface glow lines.",
	},
	/** Always authored models — provides visual identity and detail */
	authored: {
		walls: "All wall modules from city kit. No procedural walls.",
		columns: "Structural columns at grid intersections.",
		doors: "Portal/transition points — must be authored for interaction.",
		rooftiles: "Roof caps for enclosed rooms — authored for variety.",
		props: "All interactive and decorative props.",
		robots: "All units — authored GLBs at ROBOT_SCALE_FACTOR.",
		stairs: "Vertical connectors — authored for gameplay clarity.",
	},
	/** Hybrid — procedural base with optional model overlay */
	hybrid: {
		floors: "Procedural PBR texture + optional authored FloorTile overlay for accent areas. ~20% of floor cells get model overlay.",
		details: "Procedural placement of detail models (pipes, vents, panels) on walls/roofs using seed + adjacency rules. ~30% surface coverage.",
		crates_storage: "Procedural cluster placement of cargo props in storage zones. Seed determines count/rotation.",
		damage_wear: "Procedural decal placement from CURATED_DECALS on floors/walls. Storm intensity increases density.",
	},
	/** Coverage ratios by zoom tier */
	coverage: {
		close: { procedural: 0.4, authored: 0.6, note: "At close zoom, props and details dominate" },
		mid: { procedural: 0.6, authored: 0.4, note: "At mid zoom, floor textures and walls dominate" },
		far: { procedural: 0.8, authored: 0.2, note: "At far zoom, only walls/columns/landmarks remain" },
	},
} as const;
