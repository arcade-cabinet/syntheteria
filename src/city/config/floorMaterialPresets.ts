import type { AssetModule } from "../../config/assetUri";
import { floorTextureAssets } from "../../config/floorTextureAssets";
import type { CityZone } from "./types";

export interface FloorMaterialPreset {
	id: string;
	label: string;
	sourceLibraryPath: string;
	baseFamily: "concrete" | "diamond_plate" | "metal_walkway" | "painted_metal";
	surfaceStyle:
		| "industrial_plain"
		| "maintenance_grid"
		| "reinforced_plate"
		| "painted_service";
	zoneAffinity: CityZone[];
	useCases: string[];
	textureSet: {
		color: AssetModule;
		normal: AssetModule;
		roughness: AssetModule;
		ao?: AssetModule;
		height?: AssetModule;
	};
	textureRepeat: [number, number];
}

export const FLOOR_MATERIAL_PRESETS: FloorMaterialPreset[] = [
	{
		id: "command_concrete",
		label: "Command Concrete",
		sourceLibraryPath:
			"/Volumes/home/assets/2DPhotorealistic/MATERIAL/1K-JPG/Concrete041B",
		baseFamily: "concrete",
		surfaceStyle: "industrial_plain",
		zoneAffinity: ["core", "corridor", "habitation"],
		useCases: ["default traversal floor", "sealed shell sectors"],
		textureSet: floorTextureAssets.command_core,
		textureRepeat: [1.5, 1.5],
	},
	{
		id: "fabrication_plate",
		label: "Fabrication Plate",
		sourceLibraryPath:
			"/Volumes/home/assets/2DPhotorealistic/MATERIAL/1K-JPG/DiamondPlate006B",
		baseFamily: "diamond_plate",
		surfaceStyle: "reinforced_plate",
		zoneAffinity: ["fabrication", "power", "storage"],
		useCases: ["heavy machinery floor", "load-bearing assembly zones"],
		textureSet: floorTextureAssets.fabrication,
		textureRepeat: [1.25, 1.25],
	},
	{
		id: "service_walkway",
		label: "Service Walkway",
		sourceLibraryPath:
			"/Volumes/home/assets/2DPhotorealistic/MATERIAL/1K-JPG/MetalWalkway008",
		baseFamily: "metal_walkway",
		surfaceStyle: "maintenance_grid",
		zoneAffinity: ["corridor", "power", "fabrication"],
		useCases: ["catwalks", "maintenance spines", "transit decks"],
		textureSet: floorTextureAssets.corridor_transit,
		textureRepeat: [1.1, 1.1],
	},
	{
		id: "painted_habitation",
		label: "Painted Habitation Deck",
		sourceLibraryPath:
			"/Volumes/home/assets/2DPhotorealistic/MATERIAL/1K-JPG/PaintedMetal006",
		baseFamily: "painted_metal",
		surfaceStyle: "painted_service",
		zoneAffinity: ["habitation", "core"],
		useCases: ["cleaner interior rooms", "reclaimed civic zones"],
		textureSet: floorTextureAssets.habitation,
		textureRepeat: [1.35, 1.35],
	},
];

export function getFloorMaterialsForZone(zone: CityZone) {
	return FLOOR_MATERIAL_PRESETS.filter((preset) =>
		preset.zoneAffinity.includes(zone),
	);
}

export function getDefaultFloorMaterialForZone(zone: CityZone) {
	const materials = getFloorMaterialsForZone(zone);
	if (materials.length === 0) {
		throw new Error(
			`No floor material preset configured for zone "${zone}". ` +
				`Add a preset with zoneAffinity including "${zone}" to FLOOR_MATERIAL_PRESETS.`,
		);
	}
	return materials[0];
}
