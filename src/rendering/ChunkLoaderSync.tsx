/**
 * Syncs the chunk loader with the live camera position so chunks load/unload
 * as the camera moves. Must be mounted inside the R3F Canvas.
 */
import { useFrame, useThree } from "@react-three/fiber";
import { updateChunkLoader } from "../world/chunkLoader";

export function ChunkLoaderSync() {
	const { camera } = useThree();

	useFrame(() => {
		updateChunkLoader(camera.position.x, camera.position.z);
	});

	return null;
}
