import CorridorColor from "../../assets/materials/floors/corridor_transit/color.jpg";
import CorridorHeight from "../../assets/materials/floors/corridor_transit/height.jpg";
import CorridorNormal from "../../assets/materials/floors/corridor_transit/normal.jpg";
import CorridorRoughness from "../../assets/materials/floors/corridor_transit/roughness.jpg";
import CommandAO from "../../assets/materials/floors/command_core/ao.jpg";
import CommandColor from "../../assets/materials/floors/command_core/color.jpg";
import CommandHeight from "../../assets/materials/floors/command_core/height.jpg";
import CommandNormal from "../../assets/materials/floors/command_core/normal.jpg";
import CommandRoughness from "../../assets/materials/floors/command_core/roughness.jpg";
import FabricationAO from "../../assets/materials/floors/fabrication/ao.jpg";
import FabricationColor from "../../assets/materials/floors/fabrication/color.jpg";
import FabricationHeight from "../../assets/materials/floors/fabrication/height.jpg";
import FabricationNormal from "../../assets/materials/floors/fabrication/normal.jpg";
import FabricationRoughness from "../../assets/materials/floors/fabrication/roughness.jpg";
import HabitationAO from "../../assets/materials/floors/habitation/ao.jpg";
import HabitationColor from "../../assets/materials/floors/habitation/color.jpg";
import HabitationHeight from "../../assets/materials/floors/habitation/height.jpg";
import HabitationNormal from "../../assets/materials/floors/habitation/normal.jpg";
import HabitationRoughness from "../../assets/materials/floors/habitation/roughness.jpg";
import type { AssetModule } from "./assetUri";

export interface FloorTextureSet {
	color: AssetModule;
	normal: AssetModule;
	roughness: AssetModule;
	ao?: AssetModule;
	height?: AssetModule;
}

export const floorTextureAssets: Record<string, FloorTextureSet> = {
	command_core: {
		color: CommandColor,
		normal: CommandNormal,
		roughness: CommandRoughness,
		ao: CommandAO,
		height: CommandHeight,
	},
	fabrication: {
		color: FabricationColor,
		normal: FabricationNormal,
		roughness: FabricationRoughness,
		ao: FabricationAO,
		height: FabricationHeight,
	},
	corridor_transit: {
		color: CorridorColor,
		normal: CorridorNormal,
		roughness: CorridorRoughness,
		height: CorridorHeight,
	},
	habitation: {
		color: HabitationColor,
		normal: HabitationNormal,
		roughness: HabitationRoughness,
		ao: HabitationAO,
		height: HabitationHeight,
	},
};
