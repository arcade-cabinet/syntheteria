import type { AssetModule } from "./assetUri";
import {
	type TerrainTilesetManifestTileset,
	terrainTilesetManifest,
} from "./generated/terrainTilesetManifest";
import type { TerrainSetId } from "./terrainSetRules";

export interface TerrainAtlasTile {
	key: string;
	imageAsset: AssetModule;
	row: number;
	column: number;
	columns: number;
	rows: number;
}

const manifestTilesets =
	terrainTilesetManifest.tilesets as TerrainTilesetManifestTileset[];

const tilesetLookup = new Map<TerrainSetId, TerrainTilesetManifestTileset>(
	manifestTilesets.map((tileset) => [tileset.id as TerrainSetId, tileset]),
);

function hashCoordinates(q: number, r: number) {
	const qHash = Math.imul(q ^ 0x45d9f3b, 0x45d9f3b);
	const rHash = Math.imul(r ^ 0x119de1f3, 0x119de1f3);
	return (qHash ^ rHash) >>> 0;
}

export function getTerrainTextureAssets() {
	return manifestTilesets.map((tileset) => tileset.imageAsset);
}

export function getTerrainAtlasTile(
	terrainSetId: TerrainSetId,
	q: number,
	r: number,
) {
	const tileset = tilesetLookup.get(terrainSetId);

	if (!tileset) {
		throw new Error(`Missing tileset manifest entry for "${terrainSetId}".`);
	}

	const tile = tileset.tiles[hashCoordinates(q, r) % tileset.tiles.length];
	return {
		key: tile.id,
		imageAsset: tileset.imageAsset,
		row: tile.row,
		column: tile.column,
		columns: tileset.gridSize.columns,
		rows: tileset.gridSize.rows,
	} satisfies TerrainAtlasTile;
}
