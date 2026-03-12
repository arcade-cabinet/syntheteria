import {
	TERRAIN_HEX_RENDER_HEIGHT,
	TERRAIN_HEX_RENDER_WIDTH,
	TERRAIN_TILE_PIXEL_HEIGHT,
	TERRAIN_TILE_PIXEL_WIDTH,
} from "../rendering/terrainHexLayout";
import {
	type TerrainTilesetManifest,
	type TerrainTilesetManifestTileset,
	terrainTilesetManifest,
} from "./generated/terrainTilesetManifest";

export interface TerrainAtlasIssue {
	code:
		| "duplicate_tileset_id"
		| "duplicate_tile_id"
		| "invalid_grid_size"
		| "image_not_divisible"
		| "tile_index_mismatch"
		| "tile_coordinate_out_of_bounds"
		| "tile_count_mismatch"
		| "unexpected_tile_pixel_size";
	message: string;
	tilesetId: string;
}

export interface TerrainHexMetrics {
	pixelAspectRatio: number;
	renderAspectRatio: number;
	pixelToRenderWidthScale: number;
	pixelToRenderHeightScale: number;
	tilePixelWidth: number;
	tilePixelHeight: number;
}

export function getTerrainHexMetrics(): TerrainHexMetrics {
	return {
		tilePixelWidth: TERRAIN_TILE_PIXEL_WIDTH,
		tilePixelHeight: TERRAIN_TILE_PIXEL_HEIGHT,
		pixelAspectRatio: TERRAIN_TILE_PIXEL_WIDTH / TERRAIN_TILE_PIXEL_HEIGHT,
		renderAspectRatio: TERRAIN_HEX_RENDER_WIDTH / TERRAIN_HEX_RENDER_HEIGHT,
		pixelToRenderWidthScale:
			TERRAIN_HEX_RENDER_WIDTH / TERRAIN_TILE_PIXEL_WIDTH,
		pixelToRenderHeightScale:
			TERRAIN_HEX_RENDER_HEIGHT / TERRAIN_TILE_PIXEL_HEIGHT,
	};
}

function validateSingleTileset(
	tileset: TerrainTilesetManifestTileset,
): TerrainAtlasIssue[] {
	const issues: TerrainAtlasIssue[] = [];
	const expectedTileCount = tileset.gridSize.columns * tileset.gridSize.rows;
	const uniqueTileIds = new Set<string>();

	if (tileset.gridSize.columns <= 0 || tileset.gridSize.rows <= 0) {
		issues.push({
			code: "invalid_grid_size",
			message: `Tileset ${tileset.id} has invalid grid dimensions.`,
			tilesetId: tileset.id,
		});
	}

	if (
		tileset.tilePixelSize.width !== TERRAIN_TILE_PIXEL_WIDTH ||
		tileset.tilePixelSize.height !== TERRAIN_TILE_PIXEL_HEIGHT
	) {
		issues.push({
			code: "unexpected_tile_pixel_size",
			message: `Tileset ${tileset.id} does not match the canonical terrain tile pixel size.`,
			tilesetId: tileset.id,
		});
	}

	if (
		tileset.imagePixelSize.width % tileset.tilePixelSize.width !== 0 ||
		tileset.imagePixelSize.height % tileset.tilePixelSize.height !== 0
	) {
		issues.push({
			code: "image_not_divisible",
			message: `Tileset ${tileset.id} image dimensions are not divisible by tile size.`,
			tilesetId: tileset.id,
		});
	}

	if (tileset.tiles.length !== expectedTileCount) {
		issues.push({
			code: "tile_count_mismatch",
			message: `Tileset ${tileset.id} tile count does not match grid size.`,
			tilesetId: tileset.id,
		});
	}

	for (const tile of tileset.tiles) {
		if (uniqueTileIds.has(tile.id)) {
			issues.push({
				code: "duplicate_tile_id",
				message: `Tileset ${tileset.id} repeats tile id ${tile.id}.`,
				tilesetId: tileset.id,
			});
			continue;
		}
		uniqueTileIds.add(tile.id);

		if (tile.index !== tile.row * tileset.gridSize.columns + tile.column) {
			issues.push({
				code: "tile_index_mismatch",
				message: `Tileset ${tileset.id} tile ${tile.id} has inconsistent row/column/index mapping.`,
				tilesetId: tileset.id,
			});
		}

		if (
			tile.row < 0 ||
			tile.row >= tileset.gridSize.rows ||
			tile.column < 0 ||
			tile.column >= tileset.gridSize.columns
		) {
			issues.push({
				code: "tile_coordinate_out_of_bounds",
				message: `Tileset ${tileset.id} tile ${tile.id} is outside the declared grid.`,
				tilesetId: tileset.id,
			});
		}
	}

	return issues;
}

export function validateTerrainTilesetManifest(
	manifest: TerrainTilesetManifest = terrainTilesetManifest,
) {
	const issues: TerrainAtlasIssue[] = [];
	const seenTilesetIds = new Set<string>();

	for (const tileset of manifest.tilesets) {
		if (seenTilesetIds.has(tileset.id)) {
			issues.push({
				code: "duplicate_tileset_id",
				message: `Tileset id ${tileset.id} is duplicated in the manifest.`,
				tilesetId: tileset.id,
			});
			continue;
		}
		seenTilesetIds.add(tileset.id);
		issues.push(...validateSingleTileset(tileset));
	}

	return issues;
}

export function summarizeTerrainAtlasManifest(
	manifest: TerrainTilesetManifest = terrainTilesetManifest,
) {
	const metrics = getTerrainHexMetrics();
	return {
		tilesetCount: manifest.tilesets.length,
		totalTileCount: manifest.tilesets.reduce(
			(sum, tileset) => sum + tileset.tiles.length,
			0,
		),
		gridShapes: Array.from(
			new Set(
				manifest.tilesets.map(
					(tileset) => `${tileset.gridSize.columns}x${tileset.gridSize.rows}`,
				),
			),
		).sort(),
		metrics,
	};
}
