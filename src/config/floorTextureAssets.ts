/**
 * Floor texture assets — static imports driven by floorTextures.json config.
 *
 * Metro requires static import statements (not dynamic require()) to bundle
 * image assets. This file provides the bridge: JSON config defines the zone
 * structure, and this module provides the actual bundled asset references.
 *
 * When adding a new floor zone:
 * 1. Add the zone entry to floorTextures.json
 * 2. Add corresponding static imports and mapping here
 * 3. Place texture files in assets/materials/floors/<zone>/
 */

import CommandAO from "../../assets/materials/floors/command_core/ao.jpg";
import CommandColor from "../../assets/materials/floors/command_core/color.jpg";
import CommandHeight from "../../assets/materials/floors/command_core/height.jpg";
import CommandNormal from "../../assets/materials/floors/command_core/normal.jpg";
import CommandRoughness from "../../assets/materials/floors/command_core/roughness.jpg";
import CorridorColor from "../../assets/materials/floors/corridor_transit/color.jpg";
import CorridorHeight from "../../assets/materials/floors/corridor_transit/height.jpg";
import CorridorNormal from "../../assets/materials/floors/corridor_transit/normal.jpg";
import CorridorRoughness from "../../assets/materials/floors/corridor_transit/roughness.jpg";
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
import floorTexturesConfig from "./floorTextures.json";

export interface FloorTextureSet {
	color: AssetModule;
	normal: AssetModule;
	roughness: AssetModule;
	ao?: AssetModule;
	height?: AssetModule;
}

export type FloorZoneId = keyof typeof floorTexturesConfig.zones;

/**
 * All zone IDs defined in floorTextures.json.
 * Use this to iterate over available floor zones.
 */
export const floorZoneIds = Object.keys(
	floorTexturesConfig.zones,
) as FloorZoneId[];

/**
 * Static asset references keyed by zone ID.
 * Each entry maps to the bundled texture imports for that zone.
 */
export const floorTextureAssets: Record<FloorZoneId, FloorTextureSet> = {
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

/**
 * Get the floor texture set for a zone. Throws if zone is not configured.
 */
export function getFloorTextureSet(zoneId: string): FloorTextureSet {
	const textureSet = floorTextureAssets[zoneId as FloorZoneId];
	if (!textureSet) {
		throw new Error(
			`No floor texture set configured for zone "${zoneId}". ` +
				`Available zones: ${floorZoneIds.join(", ")}`,
		);
	}
	return textureSet;
}

/**
 * Get the label for a floor zone from JSON config.
 */
export function getFloorZoneLabel(zoneId: FloorZoneId): string {
	const zone = floorTexturesConfig.zones[zoneId];
	if (!zone) {
		throw new Error(
			`No floor zone label for "${zoneId}" in floorTextures.json`,
		);
	}
	return zone.label;
}
