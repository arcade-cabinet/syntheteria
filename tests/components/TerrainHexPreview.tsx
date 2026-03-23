import { useTexture } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import React, { Suspense, useEffect, useMemo } from "react";
import * as THREE from "three";
import { resolveAssetUri } from "../../src/config/assetUri";
import type { TerrainSetId } from "../../src/config/terrainSetRules";
import {
	getTerrainAtlasTile,
	getTerrainTextureAssets,
} from "../../src/config/terrainTilesetTheme";
import { hexToWorld } from "../../src/ecs/terrain";
import { createTerrainAtlasMaterials } from "../../src/rendering/terrainAtlas";
import { getTerrainHexGeometrySize } from "../../src/rendering/terrainHexLayout";

const BACKDROP = "rgb(255, 0, 255)";
const PREVIEW_WIDTH = 520;
const PREVIEW_HEIGHT = 420;
const PREVIEW_COORDS: Array<{
	terrainSetId: TerrainSetId;
	q: number;
	r: number;
}> = [
	{ terrainSetId: "emerald_fields_and_forests", q: 0, r: 0 },
	{ terrainSetId: "pacific_nw_rainforest", q: 1, r: 0 },
	{ terrainSetId: "pacific_nw_rainforest_2", q: 0, r: 1 },
	{ terrainSetId: "green_river_rundown", q: -1, r: 1 },
	{ terrainSetId: "sandstone_canyonland", q: 1, r: 1 },
	{ terrainSetId: "icy_mountain", q: 2, r: 0 },
];

function CameraRig() {
	useEffect(() => {
		// The camera instance is configured by Canvas props. Nothing dynamic needed here.
	}, []);

	return null;
}

function PreviewTiles() {
	const textureUrls = useMemo(
		() => getTerrainTextureAssets().map(resolveAssetUri),
		[],
	);
	const textures = useTexture(textureUrls);

	const materials = useMemo(() => {
		const texturesByUri = new Map<string, THREE.Texture>();
		textures.forEach((texture, index) => {
			texturesByUri.set(textureUrls[index], texture);
		});

		return createTerrainAtlasMaterials(
			PREVIEW_COORDS.map((tile) =>
				getTerrainAtlasTile(tile.terrainSetId, tile.q, tile.r),
			),
			texturesByUri,
		);
	}, [textures, textureUrls]);

	const geometry = useMemo(() => {
		const { width, height } = getTerrainHexGeometrySize();
		return new THREE.PlaneGeometry(width, height);
	}, []);

	return (
		<group position={[-1.5, 0, -2.6]}>
			{PREVIEW_COORDS.map((tile) => {
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

export function TerrainHexPreview() {
	return (
		<div
			data-testid="hex-preview"
			style={{
				width: PREVIEW_WIDTH,
				height: PREVIEW_HEIGHT,
				background: BACKDROP,
				overflow: "hidden",
				position: "relative",
			}}
		>
			<Canvas
				gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }}
				camera={{ position: [2.5, 10, 8.5], fov: 28 }}
				onCreated={({ camera, gl }) => {
					camera.lookAt(2.5, 0, 2.5);
					gl.setClearColor(0x000000, 0);
				}}
				style={{ width: "100%", height: "100%" }}
			>
				<CameraRig />
				<ambientLight intensity={1} />
				<Suspense
					fallback={
						<mesh position={[2.5, 0.1, 2.5]} rotation={[-Math.PI / 2, 0, 0]}>
							<planeGeometry args={[3, 3]} />
							<meshBasicMaterial color="#22c55e" side={THREE.DoubleSide} />
						</mesh>
					}
				>
					<PreviewTiles />
				</Suspense>
			</Canvas>
		</div>
	);
}
