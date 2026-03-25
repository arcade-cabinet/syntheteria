/**
 * GameCanvas — BabylonJS game scene via Reactylon.
 *
 * Renders the chunk-based labyrinth world with PBR materials, fog,
 * RTS camera (top-down, pan+zoom), and declarative lights.
 *
 * Chunk lifecycle is managed imperatively via ChunkManager.
 */

import { useEffect, useRef } from "react";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Tools } from "@babylonjs/core/Misc/tools";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { HavokPlugin } from "@babylonjs/core/Physics/v2/Plugins/havokPlugin";
import type { ArcRotateCamera } from "@babylonjs/core";
import type { Scene as BScene } from "@babylonjs/core";
import { Engine } from "reactylon/web";
import { Scene, useScene } from "reactylon";
import {
	initChunks,
	updateChunks,
	disposeAllChunks,
	type ChunkManagerState,
} from "./ChunkManager";
import {
	initEntityRenderer,
	syncEntities,
	disposeEntityRenderer,
	type EntityRendererState,
} from "./EntityRenderer";

// ─── Fog color — dark ecumenopolis void (#03070b) ────────────────────────────

const FOG_R = 0.012;
const FOG_G = 0.027;
const FOG_B = 0.043;

// ─── Props ───────────────────────────────────────────────────────────────────

export interface GameCanvasProps {
	/** Havok physics WASM instance. */
	havok: unknown;
	/** Player start position in world coordinates (already scaled by TILE_SIZE_M). */
	startPos: { x: number; z: number };
	/** World generation seed. */
	seed: string;
}

// ─── Scene setup (runs once on scene creation) ──────────────────────────────

function onSceneReady(scene: BScene) {
	scene.createDefaultCameraOrLight(true, undefined, true);

	// Exponential fog matching the void ground color
	scene.fogMode = 2; // FOGMODE_EXP2
	scene.fogDensity = 0.015;
	scene.fogColor.set(FOG_R, FOG_G, FOG_B);
	scene.clearColor.set(FOG_R, FOG_G, FOG_B, 1);
}

// ─── Inner scene content (needs useScene) ────────────────────────────────────

interface SceneContentProps {
	startPos: { x: number; z: number };
	seed: string;
}

function SceneContent({ startPos, seed }: SceneContentProps) {
	const scene = useScene();
	const chunkStateRef = useRef<ChunkManagerState | null>(null);
	const entityStateRef = useRef<EntityRendererState | null>(null);

	// startPos is already in world coordinates (tile * TILE_SIZE_M)
	const startWX = startPos.x;
	const startWZ = startPos.z;

	useEffect(() => {
		// Ground plane — catches viewport gaps so we never see black void.
		const ground = MeshBuilder.CreateGround(
			"void-ground",
			{ width: 2000, height: 2000 },
			scene,
		);
		ground.position = new Vector3(startWX, -0.5, startWZ);
		const groundMat = new StandardMaterial("void-ground-mat", scene);
		groundMat.diffuseColor = new Color3(FOG_R, FOG_G, FOG_B);
		groundMat.emissiveColor = new Color3(FOG_R, FOG_G, FOG_B);
		groundMat.specularColor = Color3.Black();
		groundMat.freeze();
		ground.material = groundMat;
		ground.isPickable = false;

		// Configure ArcRotateCamera for 2.5D RTS top-down
		const cam = scene.activeCamera as ArcRotateCamera;
		if (!cam) return;

		cam.target = new Vector3(startWX, 0, startWZ);
		cam.alpha = Tools.ToRadians(-90);
		cam.beta = Tools.ToRadians(1); // near-vertical top-down
		cam.radius = 60;

		// Lock rotation — pan and zoom only
		cam.lowerAlphaLimit = cam.alpha;
		cam.upperAlphaLimit = cam.alpha;
		cam.lowerBetaLimit = Tools.ToRadians(0.1);
		cam.upperBetaLimit = Tools.ToRadians(1);

		// Zoom limits
		cam.lowerRadiusLimit = 20;
		cam.upperRadiusLimit = 100;

		// Pan settings
		cam.panningSensibility = 30;
		cam.panningAxis = new Vector3(1, 0, 1);

		// Scroll/pinch zoom
		cam.wheelPrecision = 15;
		cam.pinchPrecision = 80;

		// Zero inertia for precise RTS feel
		cam.inertia = 0;
		cam.panningInertia = 0;

		// Initialize chunks around the start position
		const chunkState = initChunks(scene, startWX, startWZ, seed);
		chunkStateRef.current = chunkState;

		// Update chunks when camera pans to a new chunk
		function onCameraMove() {
			const t = cam.target;
			if (chunkStateRef.current) {
				updateChunks(t.x, t.z, scene, chunkStateRef.current);
			}
		}
		const observer = cam.onViewMatrixChangedObservable.add(onCameraMove);

		// Entity renderer — load GLBs and sync ECS entities to meshes each frame
		let entityRenderCallback: (() => void) | null = null;

		initEntityRenderer(scene).then((entityState) => {
			entityStateRef.current = entityState;

			// Sync entity meshes every frame
			entityRenderCallback = () => {
				if (entityStateRef.current) {
					syncEntities(entityStateRef.current, scene);
				}
			};
			scene.registerBeforeRender(entityRenderCallback);
		}).catch((err) => {
			console.warn("[GameCanvas] Entity renderer init failed:", err);
		});

		return () => {
			cam.onViewMatrixChangedObservable.remove(observer);
			if (entityRenderCallback) {
				scene.unregisterBeforeRender(entityRenderCallback);
			}
			if (entityStateRef.current) {
				disposeEntityRenderer(entityStateRef.current);
				entityStateRef.current = null;
			}
			if (chunkStateRef.current) {
				disposeAllChunks(chunkStateRef.current);
				chunkStateRef.current = null;
			}
		};
	}, [scene, startWX, startWZ, seed]);

	return (
		<>
			{/* Sun — cool directional light from upper-left */}
			<directionalLight
				name="sun"
				direction={new Vector3(-0.3, -1, 0.3)}
				intensity={Math.PI * 0.8}
				diffuse={new Color3(0.67, 0.8, 1.0)}
			/>

			{/* Ambient fill — dark ground bounce */}
			<hemisphericLight
				name="ambient"
				direction={new Vector3(0, 1, 0)}
				intensity={0.5}
				groundColor={new Color3(0.02, 0.06, 0.08)}
				diffuse={new Color3(0.12, 0.15, 0.2)}
			/>

			{/* Accent light at player start — cyan glow */}
			<pointLight
				name="accent"
				position={new Vector3(startWX, 8, startWZ)}
				intensity={2}
				diffuse={new Color3(0, 1, 1)}
			/>

			{/* Hub marker — cyan pyramid at player start */}
			<cylinder
				name="hub-nexus"
				options={{
					diameterTop: 0,
					diameterBottom: 3,
					height: 3,
					tessellation: 4,
				}}
				position={new Vector3(startWX, 1.5, startWZ)}
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

// ─── Main component ──────────────────────────────────────────────────────────

export function GameCanvas({ havok, startPos, seed }: GameCanvasProps) {
	return (
		<Engine>
			<Scene
				onSceneReady={onSceneReady}
				physicsOptions={{ plugin: new HavokPlugin(true, havok) }}
			>
				<SceneContent startPos={startPos} seed={seed} />
			</Scene>
		</Engine>
	);
}
