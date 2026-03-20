/**
 * Multi-layer stacking for DepthMappedLayer.
 *
 * Multiple DepthMappedLayer instances stack vertically:
 *   - Layer 0 (ground): baseY=0
 *   - Layer 1 (bridge/platform): baseY=1
 *   - Layer 2 (upper structure): baseY=2
 *
 * boardToDepthLayers converts a GeneratedBoard into the stack.
 */

import type { GeneratedBoard } from "../board";
import { FLOOR_INDEX_MAP } from "../terrain";
import {
	createDepthMappedLayer,
	type DepthMappedLayer,
	GRATING_ATLAS_INDEX,
} from "./depthMappedLayer";

// ---------------------------------------------------------------------------
// DepthLayerStack
// ---------------------------------------------------------------------------

export interface DepthLayerStack {
	readonly width: number;
	readonly height: number;
	readonly layerCount: number;
	addLayer(layer: DepthMappedLayer): void;
	getLayer(index: number): DepthMappedLayer;
	/** Returns all cells on the given layer index that are "active" platform cells. */
	getPlatformCells(
		layerIndex: number,
	): Array<{ x: number; z: number; depth: number }>;
}

export function createDepthLayerStack(
	width: number,
	height: number,
): DepthLayerStack {
	const layers: DepthMappedLayer[] = [];

	return {
		width,
		height,

		get layerCount() {
			return layers.length;
		},

		addLayer(layer: DepthMappedLayer): void {
			layers.push(layer);
			// Sort by baseY ascending
			layers.sort((a, b) => a.baseY - b.baseY);
		},

		getLayer(index: number): DepthMappedLayer {
			return layers[index];
		},

		getPlatformCells(
			layerIndex: number,
		): Array<{ x: number; z: number; depth: number }> {
			const layer = layers[layerIndex];
			if (!layer) return [];

			const cells: Array<{ x: number; z: number; depth: number }> = [];
			for (let z = 0; z < layer.height; z++) {
				for (let x = 0; x < layer.width; x++) {
					if (layer.isActive(x, z)) {
						cells.push({ x, z, depth: layer.getDepth(x, z) });
					}
				}
			}
			return cells;
		},
	};
}

// ---------------------------------------------------------------------------
// Board → DepthLayerStack converter
// ---------------------------------------------------------------------------

export function boardToDepthLayers(board: GeneratedBoard): DepthLayerStack {
	const { width, height } = board.config;
	const stack = createDepthLayerStack(width, height);

	// Layer 0: ground level (baseY = 0)
	const layer0 = createDepthMappedLayer(width, height, 0);

	// Collect elevated tiles by elevation level for upper layers
	const elevatedTiles = new Map<
		number,
		Array<{ x: number; z: number; floorType: string }>
	>();

	for (let z = 0; z < height; z++) {
		for (let x = 0; x < width; x++) {
			const tile = board.tiles[z][x];
			const floorType = tile.floorType;
			const atlasIndex =
				FLOOR_INDEX_MAP[floorType as keyof typeof FLOOR_INDEX_MAP] ?? 8;

			if (tile.elevation <= 0) {
				// Ground or below — goes into layer 0
				layer0.setBiome(x, z, atlasIndex);

				if (tile.elevation < 0) {
					// Abyssal / void — negative depth
					layer0.setDepth(x, z, tile.elevation);
				}
			} else {
				// Elevated tile — goes into upper layer
				// Also set layer0 biome for the ground underneath
				layer0.setBiome(x, z, atlasIndex);

				const elev = tile.elevation;
				if (!elevatedTiles.has(elev)) {
					elevatedTiles.set(elev, []);
				}
				elevatedTiles.get(elev)!.push({ x, z, floorType });
			}
		}
	}

	stack.addLayer(layer0);

	// Create upper layers for each elevation level
	for (const [elevation, tiles] of elevatedTiles) {
		const upperLayer = createDepthMappedLayer(width, height, elevation);

		// Set the biome for each elevated tile
		for (const { x, z, floorType } of tiles) {
			const atlasIndex =
				FLOOR_INDEX_MAP[floorType as keyof typeof FLOOR_INDEX_MAP] ?? 8;
			upperLayer.setBiome(x, z, atlasIndex);
			upperLayer.setDepth(x, z, 0); // surface level on this layer
		}

		// Determine bridge endpoints: elevated tiles adjacent to non-elevated tiles
		// get depth -1 ramps at their ends for connectivity
		for (const { x, z } of tiles) {
			// Check if this tile is at the boundary of the elevated region
			const cardinals = [
				{ dx: -1, dz: 0 },
				{ dx: 1, dz: 0 },
				{ dx: 0, dz: -1 },
				{ dx: 0, dz: 1 },
			];

			let hasNonElevatedNeighbor = false;
			for (const { dx, dz } of cardinals) {
				const nx = x + dx;
				const nz = z + dz;
				if (nx < 0 || nx >= width || nz < 0 || nz >= height) continue;

				const neighborTile = board.tiles[nz][nx];
				if (neighborTile.elevation < elevation) {
					hasNonElevatedNeighbor = true;
					break;
				}
			}

			// If this tile borders a lower-elevation tile, it's an endpoint
			if (hasNonElevatedNeighbor) {
				upperLayer.setDepth(x, z, -1);
			}
		}

		stack.addLayer(upperLayer);
	}

	return stack;
}
