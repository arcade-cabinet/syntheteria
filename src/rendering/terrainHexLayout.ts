import { HEX_SIZE } from "../ecs/terrain";

export const TERRAIN_TILE_PIXEL_WIDTH = 96;
export const TERRAIN_TILE_PIXEL_HEIGHT = 83;

export const TERRAIN_HEX_RENDER_WIDTH = HEX_SIZE * 2;
export const TERRAIN_HEX_RENDER_HEIGHT = HEX_SIZE * Math.sqrt(3);

export function getTerrainHexGeometrySize() {
	return {
		width: TERRAIN_HEX_RENDER_WIDTH,
		height: TERRAIN_HEX_RENDER_HEIGHT,
	};
}
