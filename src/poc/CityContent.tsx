/**
 * Main POC scene content — camera, lights, chunk-based map.
 *
 * Uses the board package's imperative scene.ts API to create meshes
 * directly in BabylonJS, NOT declarative JSX per tile (which would be
 * ~15k React elements and kill the reconciler).
 *
 * Camera: 2.5D RTS top-down. Locked angle, pan + zoom only.
 */

import { useEffect, useRef } from "react";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Tools } from "@babylonjs/core/Misc/tools";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import type { ArcRotateCamera } from "@babylonjs/core";
import { useScene } from "reactylon";
import {
	CHUNK_SIZE,
	generateChunk,
	type ChunkKey,
	chunkKey,
	type ChunkMeshes,
	populateChunkScene,
	disposeChunkMeshes,
} from "../board";
import { TILE_SIZE_M } from "../board/grid";

const WORLD_SEED = "ecumenopolis-poc";
const VIEW_RADIUS = 3;
const START_CX = 3;
const START_CZ = 3;
const START_WX = (START_CX + 0.5) * CHUNK_SIZE * TILE_SIZE_M;
const START_WZ = (START_CZ + 0.5) * CHUNK_SIZE * TILE_SIZE_M;

export function CityContent() {
	const scene = useScene();
	const loadedRef = useRef<Map<ChunkKey, ChunkMeshes>>(new Map());
	const lastChunkRef = useRef<string>("");

	useEffect(() => {
		// Ground plane — catches any viewport gap so we never see black void.
		// Sits below all geometry, colored to match fog.
		const ground = MeshBuilder.CreateGround("void-ground", { width: 2000, height: 2000 }, scene);
		ground.position = new Vector3(START_WX, -0.5, START_WZ);
		const groundMat = new StandardMaterial("void-ground-mat", scene);
		groundMat.diffuseColor = new Color3(0.012, 0.027, 0.043);
		groundMat.emissiveColor = new Color3(0.012, 0.027, 0.043);
		groundMat.specularColor = Color3.Black();
		groundMat.freeze();
		ground.material = groundMat;
		ground.isPickable = false;

		const cam = scene.activeCamera as ArcRotateCamera;
		if (!cam) return;

		cam.target = new Vector3(START_WX, 0, START_WZ);
		cam.alpha = Tools.ToRadians(-90);
		cam.beta = Tools.ToRadians(1); // near-vertical top-down
		cam.radius = 60;
		cam.lowerAlphaLimit = cam.alpha;
		cam.upperAlphaLimit = cam.alpha;
		cam.lowerBetaLimit = Tools.ToRadians(0.1);
		cam.upperBetaLimit = Tools.ToRadians(1);
		cam.lowerRadiusLimit = 20;
		cam.upperRadiusLimit = 100;
		cam.panningSensibility = 30;
		cam.panningAxis = new Vector3(1, 0, 1);
		cam.wheelPrecision = 15;
		cam.pinchPrecision = 80;
		cam.inertia = 0;
		cam.panningInertia = 0;

		// Load initial chunks
		loadChunksAround(START_CX, START_CZ, scene, loadedRef.current);

		// Update chunks when camera pans
		function onCameraMove() {
			const t = cam.target;
			const cx = Math.floor(t.x / (CHUNK_SIZE * TILE_SIZE_M));
			const cz = Math.floor(t.z / (CHUNK_SIZE * TILE_SIZE_M));
			const key = `${cx},${cz}`;
			if (key !== lastChunkRef.current) {
				lastChunkRef.current = key;
				loadChunksAround(cx, cz, scene, loadedRef.current);
			}
		}
		cam.onViewMatrixChangedObservable.add(onCameraMove);

		return () => {
			cam.onViewMatrixChangedObservable.clear();
			for (const cm of loadedRef.current.values()) {
				disposeChunkMeshes(cm);
			}
			loadedRef.current.clear();
		};
	}, [scene]);

	return (
		<>
			<directionalLight
				name="sun"
				direction={new Vector3(-0.3, -1, 0.3)}
				intensity={Math.PI * 0.8}
				diffuse={new Color3(0.67, 0.8, 1.0)}
			/>
			<hemisphericLight
				name="ambient"
				direction={new Vector3(0, 1, 0)}
				intensity={0.5}
				groundColor={new Color3(0.02, 0.06, 0.08)}
				diffuse={new Color3(0.12, 0.15, 0.2)}
			/>
			<pointLight
				name="accent"
				position={new Vector3(START_WX, 8, START_WZ)}
				intensity={2}
				diffuse={new Color3(0, 1, 1)}
			/>
			{/* Hub marker */}
			<cylinder
				name="hub-nexus"
				options={{ diameterTop: 0, diameterBottom: 3, height: 3, tessellation: 4 }}
				position={new Vector3(START_WX, 1.5, START_WZ)}
			>
				<standardMaterial
					name="hub-mat"
					diffuseColor={new Color3(0, 1, 1)}
					emissiveColor={new Color3(0, 0.4, 0.4)}
					specularColor={Color3.Black()}
				/>
			</cylinder>
		</>
	);
}

/** Generate + render chunks around (cx, cz), unload distant ones. */
function loadChunksAround(
	cx: number,
	cz: number,
	scene: import("@babylonjs/core").Scene,
	loaded: Map<ChunkKey, ChunkMeshes>,
): void {
	const needed = new Set<ChunkKey>();

	for (let dz = -VIEW_RADIUS; dz <= VIEW_RADIUS; dz++) {
		for (let dx = -VIEW_RADIUS; dx <= VIEW_RADIUS; dx++) {
			const key = chunkKey(cx + dx, cz + dz);
			needed.add(key);

			if (!loaded.has(key)) {
				const chunk = generateChunk(WORLD_SEED, cx + dx, cz + dz);
				const meshes = populateChunkScene(chunk, scene);
				loaded.set(key, meshes);
			}
		}
	}

	// Unload chunks no longer visible
	for (const [key, cm] of loaded) {
		if (!needed.has(key)) {
			disposeChunkMeshes(cm);
			loaded.delete(key);
		}
	}
}
