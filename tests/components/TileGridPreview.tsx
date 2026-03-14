/**
 * Preview component for TileGridRenderer visual test.
 *
 * Uses gen types ONLY: tileToWorld, TILE_SIZE, CHUNK_SIZE, FLOOR_MATERIALS.
 * Renders a chunk-sized grid to prove square grid locked together.
 * Avoids generateChunk to prevent pulling modelDefinitions/expo-asset into CT.
 */
import {
	TILE_SIZE,
	CHUNK_SIZE,
	FLOOR_MATERIALS,
	type MapTile,
} from "../../src/world/gen/types";

/** Inline tileToWorld to avoid pulling chunkGen via worldGrid/persist */
function tileToWorld(x: number, z: number) {
	return {
		worldX: x * TILE_SIZE + TILE_SIZE / 2,
		worldZ: z * TILE_SIZE + TILE_SIZE / 2,
	};
}
import { TestCanvasWrapper } from "./testCanvasWrapper";

/** Color per floor material (gen FLOOR_MATERIALS) */
const FLOOR_COLORS: Record<string, number> = {
	metal_panel: 0x5e7385,
	concrete_slab: 0x71879b,
	industrial_grating: 0x7a634a,
	rusty_plating: 0x75614f,
	corroded_steel: 0x62658a,
};

function FloorTile({ tile }: { tile: MapTile }) {
	const { worldX, worldZ } = tileToWorld(tile.x, tile.z);
	const color = FLOOR_COLORS[tile.floorMaterial] ?? FLOOR_COLORS.metal_panel;
	const y = tile.level * 2.5;

	return (
		<group position={[worldX, y, worldZ]}>
			<mesh position={[0, -0.005, 0]} receiveShadow>
				<boxGeometry args={[TILE_SIZE, 0.02, TILE_SIZE]} />
				<meshStandardMaterial
					color={color}
					roughness={0.72}
					metalness={0.08}
					emissive={0x111111}
					emissiveIntensity={0.2}
				/>
			</mesh>
		</group>
	);
}

export function TileGridPreview() {
	// Build minimal chunk-sized grid using gen coords (TILE_SIZE, CHUNK_SIZE, tileToWorld)
	const tiles: MapTile[] = [];
	for (let z = 0; z < CHUNK_SIZE; z++) {
		for (let x = 0; x < CHUNK_SIZE; x++) {
			const mat = FLOOR_MATERIALS[(x + z) % FLOOR_MATERIALS.length];
			tiles.push({
				x,
				z,
				level: 0,
				elevationY: 0,
				clearanceAbove: 100,
				floorMaterial: mat,
				modelId: null,
				modelLayer: null,
				rotation: 0,
				passable: true,
				isBridge: false,
				isRamp: false,
			});
		}
	}

	// Center camera over chunk
	const centerX = (CHUNK_SIZE * TILE_SIZE) / 2;
	const centerZ = (CHUNK_SIZE * TILE_SIZE) / 2;
	const extentX = (CHUNK_SIZE * TILE_SIZE) / 2;

	return (
		<TestCanvasWrapper
			width={800}
			height={600}
			cameraPosition={[centerX, 20, centerZ]}
			cameraLookAt={[centerX, 0, centerZ]}
			cameraZoom={800 / (extentX * 2.4)}
		>
			{tiles.map((tile) => (
				<FloorTile key={`${tile.x},${tile.z}`} tile={tile} />
			))}
		</TestCanvasWrapper>
	);
}
