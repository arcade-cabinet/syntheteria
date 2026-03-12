import { useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useSyncExternalStore } from "react";
import * as THREE from "three";
import { resolveAssetUri } from "../config/assetUri";
import {
	getTerrainAtlasTile,
	getTerrainTextureAssets,
} from "../config/terrainTilesetTheme";
import { getSnapshot, subscribe } from "../ecs/gameState";
import { getFragment, hexToWorld } from "../ecs/terrain";
import { createTerrainAtlasMaterials } from "./terrainAtlas";
import { getTerrainHexGeometrySize } from "./terrainHexLayout";

function FragmentTerrain({ fragmentId }: { fragmentId: string }) {
	const groupRef = useRef<THREE.Group>(null);
	const fragment = getFragment(fragmentId);
	const textureUrls = useMemo(
		() => getTerrainTextureAssets().map(resolveAssetUri),
		[],
	);
	const textures = useTexture(textureUrls);

	const materials = useMemo(() => {
		const texturesByUri = new Map<string, THREE.Texture>();
		textures.forEach((tex, index) => {
			texturesByUri.set(textureUrls[index], tex);
		});

		return createTerrainAtlasMaterials(
			Array.from(
				new Map(
					Array.from(fragment?.grid ?? []).map((tile) => {
						const atlasTile = getTerrainAtlasTile(
							tile.terrainSetId,
							tile.q,
							tile.r,
						);
						return [atlasTile.key, atlasTile] as const;
					}),
				).values(),
			),
			texturesByUri,
		);
	}, [fragment, textures, textureUrls]);

	const geometry = useMemo(() => {
		const { width, height } = getTerrainHexGeometrySize();
		return new THREE.PlaneGeometry(width, height);
	}, []);

	useFrame(() => {
		const fragment = getFragment(fragmentId);
		if (!fragment) return;

		if (groupRef.current) {
			groupRef.current.position.set(
				fragment.displayOffset.x,
				0,
				fragment.displayOffset.z,
			);
		}
	});

	if (!fragment) return null;

	return (
		<group ref={groupRef}>
			{Array.from(fragment.grid).map((tile) => {
				const pos = hexToWorld(tile.q, tile.r);
				return (
					<mesh
						key={`${tile.q},${tile.r}`}
						position={[pos.x, pos.y, pos.z]}
						rotation={[-Math.PI / 2, 0, 0]}
						geometry={geometry}
						material={materials.get(
							getTerrainAtlasTile(tile.terrainSetId, tile.q, tile.r).key,
						)}
					/>
				);
			})}
		</group>
	);
}

export function TerrainRenderer() {
	const snap = useSyncExternalStore(subscribe, getSnapshot);

	return (
		<>
			{snap.fragments.map((fragment) => (
				<FragmentTerrain key={fragment.id} fragmentId={fragment.id} />
			))}
		</>
	);
}
