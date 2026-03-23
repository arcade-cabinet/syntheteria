/**
 * Type definitions for floorTextures.json schema.
 * Zone-to-texture mapping: each zone has a label and relative paths to PBR textures.
 */

export interface FloorZoneTexturePaths {
	color: string;
	normal: string;
	roughness: string;
	ao?: string;
	height?: string;
}

export interface FloorZoneEntry {
	label: string;
	textures: FloorZoneTexturePaths;
}

export interface FloorTexturesConfig {
	$schema?: string;
	zones: Record<string, FloorZoneEntry>;
}
