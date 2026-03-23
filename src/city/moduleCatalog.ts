import type { CityModuleType } from "./assemblyContract";

export type CityAssetFamily =
	| "floor"
	| "wall"
	| "door"
	| "roof"
	| "prop"
	| "detail"
	| "column"
	| "stair";

export type EdgeDirection = "north" | "east" | "south" | "west";

export interface CityModuleAsset {
	id: string;
	family: CityAssetFamily;
	sourceAsset: string;
	validZones: CityModuleType[];
	passable: boolean;
	placement: "cell" | "edge";
	tags: string[];
}

const ANY_ZONE: CityModuleType[] = [
	"core",
	"power",
	"fabrication",
	"storage",
	"habitation",
	"corridor",
];

export const CITY_MODULE_ASSETS: readonly CityModuleAsset[] = [
	{
		id: "floor_corridor_basic",
		family: "floor",
		sourceAsset: "FloorTile_Basic.glb",
		validZones: ["corridor", "core"],
		passable: true,
		placement: "cell",
		tags: ["walkable", "interior"],
	},
	{
		id: "floor_corridor_hallway",
		family: "floor",
		sourceAsset: "FloorTile_Double_Hallway.glb",
		validZones: ["corridor"],
		passable: true,
		placement: "cell",
		tags: ["walkable", "hallway"],
	},
	{
		id: "floor_room_basic",
		family: "floor",
		sourceAsset: "FloorTile_Basic2.glb",
		validZones: ["fabrication", "storage", "habitation", "power"],
		passable: false,
		placement: "cell",
		tags: ["room", "support"],
	},
	{
		id: "floor_room_empty",
		family: "floor",
		sourceAsset: "FloorTile_Empty.glb",
		validZones: ["storage", "habitation"],
		passable: false,
		placement: "cell",
		tags: ["room", "sparse"],
	},
	{
		id: "wall_solid",
		family: "wall",
		sourceAsset: "Walls/Wall_Empty.glb",
		validZones: ANY_ZONE,
		passable: false,
		placement: "edge",
		tags: ["barrier", "structural"],
	},
	{
		id: "wall_window",
		family: "wall",
		sourceAsset: "Walls/Window_Wall_SideA.glb",
		validZones: ["core", "habitation", "fabrication"],
		passable: false,
		placement: "edge",
		tags: ["barrier", "window"],
	},
	{
		id: "wall_long_window",
		family: "wall",
		sourceAsset: "Walls/LongWindow_Wall_SideA.glb",
		validZones: ["habitation", "core"],
		passable: false,
		placement: "edge",
		tags: ["barrier", "window"],
	},
	{
		id: "door_single",
		family: "door",
		sourceAsset: "Walls/DoorSingle_Wall_SideA.glb",
		validZones: ["core", "power", "fabrication", "storage", "habitation"],
		passable: true,
		placement: "edge",
		tags: ["access", "transition"],
	},
	{
		id: "door_double",
		family: "door",
		sourceAsset: "Walls/DoorDouble_Wall_SideA.glb",
		validZones: ["fabrication", "storage", "power"],
		passable: true,
		placement: "edge",
		tags: ["access", "cargo"],
	},
	{
		id: "roof_plain",
		family: "roof",
		sourceAsset: "RoofTile_Empty.glb",
		validZones: ["core", "power", "fabrication", "storage", "habitation"],
		passable: false,
		placement: "cell",
		tags: ["cover"],
	},
	{
		id: "roof_pipes",
		family: "roof",
		sourceAsset: "RoofTile_Pipes1.glb",
		validZones: ["power", "fabrication"],
		passable: false,
		placement: "cell",
		tags: ["cover", "utility"],
	},
	{
		id: "roof_vents",
		family: "roof",
		sourceAsset: "RoofTile_Vents.glb",
		validZones: ["habitation", "storage", "core"],
		passable: false,
		placement: "cell",
		tags: ["cover", "vent"],
	},
	{
		id: "prop_computer",
		family: "prop",
		sourceAsset: "Props_Computer.glb",
		validZones: ["core", "fabrication"],
		passable: false,
		placement: "cell",
		tags: ["interior", "control"],
	},
	{
		id: "prop_container",
		family: "prop",
		sourceAsset: "Props_ContainerFull.glb",
		validZones: ["storage", "fabrication"],
		passable: false,
		placement: "cell",
		tags: ["storage", "cargo"],
	},
	{
		id: "prop_shelf",
		family: "prop",
		sourceAsset: "Props_Shelf_Tall.glb",
		validZones: ["storage", "habitation"],
		passable: false,
		placement: "cell",
		tags: ["storage", "interior"],
	},
	{
		id: "prop_pod",
		family: "prop",
		sourceAsset: "Props_Pod.glb",
		validZones: ["habitation", "power"],
		passable: false,
		placement: "cell",
		tags: ["interior", "utility"],
	},
	{
		id: "column_standard",
		family: "column",
		sourceAsset: "Column_1.glb",
		validZones: ["core", "fabrication", "storage", "habitation"],
		passable: false,
		placement: "cell",
		tags: ["structural"],
	},
	{
		id: "detail_vent",
		family: "detail",
		sourceAsset: "Details/Details_Vent_1.glb",
		validZones: ["power", "fabrication", "corridor"],
		passable: false,
		placement: "cell",
		tags: ["accent"],
	},
	{
		id: "staircase_standard",
		family: "stair",
		sourceAsset: "Staircase.glb",
		validZones: ["core", "fabrication"],
		passable: true,
		placement: "cell",
		tags: ["vertical"],
	},
] as const;

export function getCityAssetsForZone(
	zone: CityModuleType,
	family: CityAssetFamily,
) {
	return CITY_MODULE_ASSETS.filter(
		(asset) => asset.family === family && asset.validZones.includes(zone),
	);
}

export function getCityAssetById(id: string) {
	return CITY_MODULE_ASSETS.find((asset) => asset.id === id) ?? null;
}
