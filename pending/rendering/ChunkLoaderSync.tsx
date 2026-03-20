/**
 * Syncs the WorldGrid chunk cache with the live camera position and surfaces
 * loaded tile data to ECS FloorCell entities so StructuralFloorRenderer can
 * draw a contiguous map.
 *
 * Each frame:
 *  1. updateFocus(x, z)  — WorldGrid loads tile data for nearby chunks
 *  2. When camera crosses a chunk boundary, newly loaded chunks are converted
 *     to FloorCell ECS entities (discoveryState=1) so the renderer shows them
 *  3. updateChunkLoader — keeps the load/unload tracker in sync (legacy path)
 */
import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import { getLoadedChunks, updateFocus } from "../world/gen/worldGrid";
import { updateChunkLoader } from "../world/chunkLoader";
import { spawnFloorCells } from "../world/structuralSpace";

export function ChunkLoaderSync() {
	const { camera } = useThree();
	const spawnedChunkKeys = useRef(new Set<string>());

	useFrame(() => {
		const x = camera.position.x;
		const z = camera.position.z;

		// Drive WorldGrid to load tile data for chunks near the camera
		updateFocus(x, z);

		// Legacy chunk-loader tracker (callbacks unused but keeps state correct)
		const cameraMoved = updateChunkLoader(x, z);
		if (!cameraMoved) return;

		// On each chunk boundary crossing, surface newly loaded chunks to ECS
		const chunks = getLoadedChunks();
		const newCells: Parameters<typeof spawnFloorCells>[0] = [];

		for (const chunk of chunks) {
			const key = `${chunk.cx},${chunk.cz}`;
			if (spawnedChunkKeys.current.has(key)) continue;
			spawnedChunkKeys.current.add(key);

			for (const tile of chunk.tiles) {
				newCells.push({
					q: tile.x,
					r: tile.z,
					fragmentId: "world_primary",
					structuralZone: tile.floorMaterial,
					floorPresetId: tile.floorMaterial,
					discoveryState: 1,
					passable: tile.passable,
				});
			}
		}

		if (newCells.length > 0) {
			spawnFloorCells(newCells);
		}
	});

	return null;
}
