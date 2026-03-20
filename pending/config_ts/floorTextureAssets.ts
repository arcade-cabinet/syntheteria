/**
 * Floor texture assets — static paths driven by floorTextures.json config.
 *
 * Public-dir assets are served at the root path. Use string constants instead
 * of ?url imports — Vite returns /public/assets/... for those, causing 404s.
 *
 * When adding a new floor zone:
 * 1. Add the zone entry to floorTextures.json
 * 2. Add corresponding constants and mapping here
 * 3. Place texture files in assets/materials/floors/<zone>/
 */

import type { AssetModule } from "./assetUri";
import floorTexturesConfigJson from "./floorTextures.json";
import type { FloorTexturesConfig } from "./floorTextures.types";

const floorTexturesConfig = floorTexturesConfigJson as FloorTexturesConfig;

// command_core
const CommandAO: AssetModule = "/assets/materials/floors/command_core/ao.jpg";
const CommandColor: AssetModule =
	"/assets/materials/floors/command_core/color.jpg";
const CommandHeight: AssetModule =
	"/assets/materials/floors/command_core/height.jpg";
const CommandNormal: AssetModule =
	"/assets/materials/floors/command_core/normal.jpg";
const CommandRoughness: AssetModule =
	"/assets/materials/floors/command_core/roughness.jpg";

// corridor_transit
const CorridorColor: AssetModule =
	"/assets/materials/floors/corridor_transit/color.jpg";
const CorridorHeight: AssetModule =
	"/assets/materials/floors/corridor_transit/height.jpg";
const CorridorNormal: AssetModule =
	"/assets/materials/floors/corridor_transit/normal.jpg";
const CorridorRoughness: AssetModule =
	"/assets/materials/floors/corridor_transit/roughness.jpg";

// fabrication
const FabricationAO: AssetModule =
	"/assets/materials/floors/fabrication/ao.jpg";
const FabricationColor: AssetModule =
	"/assets/materials/floors/fabrication/color.jpg";
const FabricationHeight: AssetModule =
	"/assets/materials/floors/fabrication/height.jpg";
const FabricationNormal: AssetModule =
	"/assets/materials/floors/fabrication/normal.jpg";
const FabricationRoughness: AssetModule =
	"/assets/materials/floors/fabrication/roughness.jpg";

// habitation
const HabitationAO: AssetModule = "/assets/materials/floors/habitation/ao.jpg";
const HabitationColor: AssetModule =
	"/assets/materials/floors/habitation/color.jpg";
const HabitationHeight: AssetModule =
	"/assets/materials/floors/habitation/height.jpg";
const HabitationNormal: AssetModule =
	"/assets/materials/floors/habitation/normal.jpg";
const HabitationRoughness: AssetModule =
	"/assets/materials/floors/habitation/roughness.jpg";

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
 * Each entry maps to the bundled texture paths for that zone.
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
