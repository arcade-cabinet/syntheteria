import { useTexture } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import React, { Suspense, useMemo } from "react";
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

type ScenarioTile = {
	terrainSetId: TerrainSetId;
	q: number;
	r: number;
};

type Scenario = {
	id: string;
	label: string;
	offsetX: number;
	offsetZ: number;
	tiles: ScenarioTile[];
};

const SCENARIOS: Scenario[] = [
	{
		id: "coastal_delta",
		label: "Coastal Delta",
		offsetX: 0,
		offsetZ: 0,
		tiles: [
			{ terrainSetId: "green_isle_in_the_sea", q: -1, r: 1 },
			{ terrainSetId: "green_isle_in_the_sea", q: 0, r: 1 },
			{ terrainSetId: "green_river_rundown", q: 1, r: 0 },
			{ terrainSetId: "green_river_rundown", q: 1, r: 1 },
			{ terrainSetId: "emerald_fields_and_forests", q: 0, r: 0 },
			{ terrainSetId: "emerald_fields_and_forests", q: -1, r: 0 },
			{ terrainSetId: "sandstone_canyonland", q: 2, r: 0 },
			{ terrainSetId: "sandstone_canyonland_2", q: 2, r: 1 },
		],
	},
	{
		id: "river_through_canyon",
		label: "River Through Canyon",
		offsetX: 9,
		offsetZ: 0,
		tiles: [
			{ terrainSetId: "sandstone_canyonland", q: -1, r: 0 },
			{ terrainSetId: "sandstone_canyonland_2", q: -1, r: 1 },
			{ terrainSetId: "sandstone_canyonland", q: 0, r: -1 },
			{ terrainSetId: "green_river_rundown", q: 0, r: 0 },
			{ terrainSetId: "green_river_rundown", q: 0, r: 1 },
			{ terrainSetId: "green_isle_in_the_sea", q: 1, r: 1 },
			{ terrainSetId: "dirt_hill_in_meadow", q: 1, r: 0 },
			{ terrainSetId: "dark_shrubland_grassland", q: 1, r: -1 },
		],
	},
	{
		id: "shrubland_ridge",
		label: "Shrubland Ridge",
		offsetX: 18,
		offsetZ: 0,
		tiles: [
			{ terrainSetId: "dark_shrubland_grassland", q: -1, r: 0 },
			{ terrainSetId: "dark_shrubland_grassland", q: 0, r: 0 },
			{ terrainSetId: "dirt_hill_in_meadow", q: 1, r: 0 },
			{ terrainSetId: "dirt_hill_in_meadow", q: 1, r: 1 },
			{ terrainSetId: "icy_mountain", q: 2, r: -1 },
			{ terrainSetId: "icy_mountain", q: 2, r: 0 },
			{ terrainSetId: "pacific_nw_rainforest", q: 0, r: 1 },
			{ terrainSetId: "emerald_fields_and_forests", q: -1, r: 1 },
		],
	},
	{
		id: "rainforest_edge",
		label: "Rainforest Edge",
		offsetX: 0,
		offsetZ: 8.5,
		tiles: [
			{ terrainSetId: "pacific_nw_rainforest", q: -1, r: 0 },
			{ terrainSetId: "pacific_nw_rainforest_2", q: 0, r: 0 },
			{ terrainSetId: "pacific_nw_rainforest", q: -1, r: 1 },
			{ terrainSetId: "pacific_nw_rainforest_2", q: 0, r: 1 },
			{ terrainSetId: "emerald_fields_and_forests", q: 1, r: 0 },
			{ terrainSetId: "emerald_fields_and_forests", q: 1, r: 1 },
			{ terrainSetId: "green_isle_in_the_sea", q: 2, r: 1 },
			{ terrainSetId: "green_river_rundown", q: 2, r: 0 },
		],
	},
	{
		id: "floodplain_frontier",
		label: "Floodplain Frontier",
		offsetX: 9,
		offsetZ: 8.5,
		tiles: [
			{ terrainSetId: "green_river_rundown", q: -1, r: 0 },
			{ terrainSetId: "green_river_rundown", q: 0, r: 0 },
			{ terrainSetId: "emerald_fields_and_forests", q: 1, r: 0 },
			{ terrainSetId: "dirt_hill_in_meadow", q: 1, r: 1 },
			{ terrainSetId: "dark_shrubland_grassland", q: 0, r: 1 },
			{ terrainSetId: "pacific_nw_rainforest_2", q: -1, r: 1 },
			{ terrainSetId: "sandstone_canyonland", q: 2, r: 1 },
			{ terrainSetId: "green_isle_in_the_sea", q: 2, r: 0 },
		],
	},
	{
		id: "alpine_treeline",
		label: "Alpine Treeline",
		offsetX: 18,
		offsetZ: 8.5,
		tiles: [
			{ terrainSetId: "icy_mountain", q: 0, r: -1 },
			{ terrainSetId: "icy_mountain", q: 1, r: -1 },
			{ terrainSetId: "icy_mountain", q: 0, r: 0 },
			{ terrainSetId: "pacific_nw_rainforest", q: 1, r: 0 },
			{ terrainSetId: "pacific_nw_rainforest_2", q: 1, r: 1 },
			{ terrainSetId: "dark_shrubland_grassland", q: -1, r: 1 },
			{ terrainSetId: "dirt_hill_in_meadow", q: 0, r: 1 },
			{ terrainSetId: "emerald_fields_and_forests", q: -1, r: 0 },
		],
	},
];

function TerrainPermutationScene() {
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
			SCENARIOS.flatMap((scenario) =>
				scenario.tiles.map((tile) =>
					getTerrainAtlasTile(tile.terrainSetId, tile.q, tile.r),
				),
			),
			texturesByUri,
		);
	}, [textures, textureUrls]);

	const geometry = useMemo(() => {
		const { width, height } = getTerrainHexGeometrySize();
		return new THREE.PlaneGeometry(width, height);
	}, []);

	return (
		<>
			{SCENARIOS.map((scenario) => (
				<group
					key={scenario.id}
					position={[scenario.offsetX, 0, scenario.offsetZ]}
				>
					{scenario.tiles.map((tile) => {
						const pos = hexToWorld(tile.q, tile.r);
						return (
							<mesh
								key={`${scenario.id}:${tile.terrainSetId}:${tile.q}:${tile.r}`}
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
			))}
		</>
	);
}

export function TerrainAdjacencyPermutationPreview() {
	return (
		<div
			data-testid="adjacency-preview"
			style={{
				width: 1120,
				background: "#050505",
				padding: 24,
			}}
		>
			<div
				style={{
					color: "#86efac",
					fontFamily: "monospace",
					fontSize: 12,
					letterSpacing: "0.18em",
					marginBottom: 12,
					textTransform: "uppercase",
				}}
			>
				Terrain Adjacency Permutations
			</div>
			<div
				style={{
					display: "grid",
					gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
					gap: 8,
					marginBottom: 12,
				}}
			>
				{SCENARIOS.map((scenario) => (
					<div
						key={scenario.id}
						style={{
							color: "#bbf7d0",
							fontFamily: "monospace",
							fontSize: 11,
							letterSpacing: "0.12em",
							textTransform: "uppercase",
						}}
					>
						{scenario.label}
					</div>
				))}
			</div>
			<div
				style={{
					height: 720,
					background: BACKDROP,
					overflow: "hidden",
				}}
			>
				<Canvas
					gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }}
					camera={{ position: [10.5, 24, 18], fov: 34 }}
					onCreated={({ camera, gl }) => {
						camera.lookAt(10.5, 0, 5.5);
						gl.setClearColor(0x000000, 0);
					}}
					style={{ width: "100%", height: "100%" }}
				>
					<ambientLight intensity={1} />
					<Suspense
						fallback={
							<mesh position={[10.5, 0.1, 5.5]} rotation={[-Math.PI / 2, 0, 0]}>
								<planeGeometry args={[10, 10]} />
								<meshBasicMaterial color="#22c55e" side={THREE.DoubleSide} />
							</mesh>
						}
					>
						<TerrainPermutationScene />
					</Suspense>
				</Canvas>
			</div>
		</div>
	);
}
