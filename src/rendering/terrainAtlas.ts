import * as THREE from "three";
import { resolveAssetUri } from "../config/assetUri";
import type { TerrainAtlasTile } from "../config/terrainTilesetTheme";

export function createTerrainAtlasMaterials(
	tiles: TerrainAtlasTile[],
	texturesByUri: Map<string, THREE.Texture>,
) {
	const materials = new Map<string, THREE.MeshBasicMaterial>();

	for (const tile of tiles) {
		const uri = resolveAssetUri(tile.imageAsset);
		const baseTexture = texturesByUri.get(uri);

		if (!baseTexture) {
			continue;
		}

		const texture = baseTexture.clone();
		texture.colorSpace = THREE.SRGBColorSpace;
		texture.wrapS = THREE.ClampToEdgeWrapping;
		texture.wrapT = THREE.ClampToEdgeWrapping;
		texture.repeat.set(1 / tile.columns, 1 / tile.rows);
		texture.offset.set(
			tile.column / tile.columns,
			1 - (tile.row + 1) / tile.rows,
		);
		texture.needsUpdate = true;

		materials.set(
			tile.key,
			new THREE.MeshBasicMaterial({
				map: texture,
				transparent: true,
				alphaTest: 0.1,
			}),
		);
	}

	return materials;
}
