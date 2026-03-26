/**
 * GameCanvas — BabylonJS game scene via Reactylon.
 *
 * Renders the chunk-based labyrinth world with PBR materials, fog,
 * RTS camera (top-down, pan+zoom), and declarative lights.
 *
 * Chunk lifecycle is managed imperatively via ChunkManager.
 */

import type { ArcRotateCamera, Scene as BScene } from "@babylonjs/core";
import { Animation } from "@babylonjs/core/Animations/animation";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Tools } from "@babylonjs/core/Misc/tools";
import { HavokPlugin } from "@babylonjs/core/Physics/v2/Plugins/havokPlugin";
// Side-effect imports — Vite tree-shakes these without explicit import
import "@babylonjs/core/Helpers/sceneHelpers";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { PointLight } from "@babylonjs/core/Lights/pointLight";
import { useEffect, useRef } from "react";
import { Scene, useScene } from "reactylon";
import { Engine } from "reactylon/web";
import { getEpochVisual } from "../config/epochVisualDefs";
import { getGameSpeed, simulationTick } from "../ecs/gameState";
import { Position, Unit } from "../ecs/traits";
import { world } from "../ecs/world";
import { GameError, logError } from "../errors";
import { movementSystem } from "../systems/movement";
import {
	type ChunkManagerState,
	disposeAllChunks,
	initChunks,
	updateChunks,
} from "./ChunkManager";
import { registerChunkState, unregisterChunkState } from "./chunkRegistry";
import {
	disposeEntityRenderer,
	type EntityRendererState,
	initEntityRenderer,
	syncEntities,
} from "./EntityRenderer";
import { updateFogVisibility } from "./FogOfWar";
import { initInput } from "./InputHandler";

// ─── Epoch-driven atmosphere — Epoch 1 defaults ──────────────────────────────

const epoch1 = getEpochVisual(1);
const FOG_R = epoch1.fogColor[0];
const FOG_G = epoch1.fogColor[1];
const FOG_B = epoch1.fogColor[2];

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
	scene.fogDensity = epoch1.fogDensity;
	scene.fogColor.set(FOG_R, FOG_G, FOG_B);
	scene.clearColor.set(
		epoch1.backgroundColor[0],
		epoch1.backgroundColor[1],
		epoch1.backgroundColor[2],
		1,
	);
	scene.ambientColor = new Color3(...epoch1.ambientColor);

	// Environment texture for PBR reflections — just the IBL probe, no skybox/ground.
	// Uses BabylonJS's default environment texture from CDN.
	import("@babylonjs/core/Materials/Textures/cubeTexture").then(
		({ CubeTexture }) => {
			scene.environmentTexture =
				CubeTexture.CreateFromPrefilteredData(
					"https://assets.babylonjs.com/environments/environmentSpecular.env",
					scene,
				);
		},
	);
}

// ─── Inner scene content (needs useScene) ────────────────────────────────────

interface SceneContentProps {
	startPos: { x: number; z: number };
	seed: string;
}

/** Smoothly pan the camera target to (x, z) over ~20 frames. */
function panCameraTo(scene: BScene, x: number, z: number): void {
	const cam = scene.activeCamera as ArcRotateCamera;
	if (!cam) return;

	const FPS = 30;
	const PAN_FRAMES = 20;

	const panAnim = new Animation(
		"panTarget",
		"target",
		FPS,
		Animation.ANIMATIONTYPE_VECTOR3,
		Animation.ANIMATIONLOOPMODE_CONSTANT,
	);
	panAnim.setKeys([
		{ frame: 0, value: cam.target.clone() },
		{ frame: PAN_FRAMES, value: new Vector3(x, 0, z) },
	]);

	cam.animations = [panAnim];
	scene.beginAnimation(cam, 0, PAN_FRAMES, false);
}

function SceneContent({ startPos, seed }: SceneContentProps) {
	const scene = useScene();
	const chunkStateRef = useRef<ChunkManagerState | null>(null);
	const entityStateRef = useRef<EntityRendererState | null>(null);
	const simAccumulatorRef = useRef(0);

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

		// Final gameplay values
		const FINAL_ALPHA = Tools.ToRadians(-90);
		const FINAL_BETA = Tools.ToRadians(25); // 2.5D RTS perspective with depth
		const FINAL_RADIUS = 60;

		// Start zoomed out and more tilted for a dramatic intro
		cam.target = new Vector3(startWX, 0, startWZ);
		cam.alpha = FINAL_ALPHA;
		cam.beta = Tools.ToRadians(45); // start tilted for dramatic reveal
		cam.radius = 120; // start zoomed out

		// Temporarily widen limits so animation can run freely
		cam.lowerBetaLimit = 0;
		cam.upperBetaLimit = Math.PI;
		cam.lowerRadiusLimit = 10;
		cam.upperRadiusLimit = 200;

		// Smooth intro animation (~1.5 seconds at 30fps = 45 frames)
		const FPS = 30;
		const INTRO_FRAMES = 45;

		const radiusAnim = new Animation(
			"introRadius",
			"radius",
			FPS,
			Animation.ANIMATIONTYPE_FLOAT,
			Animation.ANIMATIONLOOPMODE_CONSTANT,
		);
		radiusAnim.setKeys([
			{ frame: 0, value: 120 },
			{ frame: INTRO_FRAMES, value: FINAL_RADIUS },
		]);

		const betaAnim = new Animation(
			"introBeta",
			"beta",
			FPS,
			Animation.ANIMATIONTYPE_FLOAT,
			Animation.ANIMATIONLOOPMODE_CONSTANT,
		);
		betaAnim.setKeys([
			{ frame: 0, value: Tools.ToRadians(45) },
			{ frame: INTRO_FRAMES, value: FINAL_BETA },
		]);

		cam.animations = [radiusAnim, betaAnim];
		scene.beginAnimation(cam, 0, INTRO_FRAMES, false, 1.0, () => {
			// Animation complete — lock camera to gameplay constraints
			cam.alpha = FINAL_ALPHA;
			cam.lowerAlphaLimit = FINAL_ALPHA;
			cam.upperAlphaLimit = FINAL_ALPHA;
			cam.lowerBetaLimit = Tools.ToRadians(20);
			cam.upperBetaLimit = Tools.ToRadians(35);
			cam.lowerRadiusLimit = 20;
			cam.upperRadiusLimit = 100;
		});

		// Pan settings
		cam.panningSensibility = 30;
		cam.panningAxis = new Vector3(1, 0, 1);

		// Scroll/pinch zoom
		cam.wheelPrecision = 15;
		cam.pinchPrecision = 80;

		// Zero inertia for precise RTS feel
		cam.inertia = 0;
		cam.panningInertia = 0;

		// Create lights imperatively (Reactylon JSX inventory issues with Vite tree-shaking)
		const sun = new DirectionalLight("sun", new Vector3(-0.3, -1, 0.3), scene);
		sun.intensity = epoch1.sunIntensity;
		sun.diffuse = new Color3(...epoch1.sunColor);

		const ambient = new HemisphericLight("ambient", new Vector3(0, 1, 0), scene);
		ambient.intensity = 0.5;
		ambient.groundColor = new Color3(0.02, 0.06, 0.08);
		ambient.diffuse = new Color3(0.12, 0.15, 0.2);

		const accent = new PointLight("accent", new Vector3(startWX, 8, startWZ), scene);
		accent.intensity = 2;
		accent.diffuse = new Color3(0, 1, 1);

		// Hub marker — cyan pyramid at player start
		const hubMesh = MeshBuilder.CreateCylinder("hub-nexus", {
			diameterTop: 0, diameterBottom: 3, height: 3, tessellation: 4,
		}, scene);
		hubMesh.position = new Vector3(startWX, 1.5, startWZ);
		const hubMat = new StandardMaterial("hub-mat", scene);
		hubMat.diffuseColor = new Color3(0, 1, 1);
		hubMat.emissiveColor = new Color3(0, 0.4, 0.4);
		hubMat.specularColor = Color3.Black();
		hubMesh.material = hubMat;

		// Initialize chunks around the start position
		const chunkState = initChunks(scene, startWX, startWZ, seed);
		chunkStateRef.current = chunkState;
		registerChunkState(chunkState);

		// ── Game loop: movement (per-frame) + simulation tick (fixed interval) ──
		const SIM_INTERVAL = 1.0; // seconds of game time between ticks
		const gameLoopCallback = () => {
			const speed = getGameSpeed();
			if (speed <= 0) return; // paused

			const delta = scene.getEngine().getDeltaTime() / 1000; // ms → seconds

			// Smooth per-frame unit movement
			movementSystem(delta, speed);

			// Accumulate scaled time and fire simulation ticks at fixed intervals
			simAccumulatorRef.current += delta * speed;
			while (simAccumulatorRef.current >= SIM_INTERVAL) {
				simAccumulatorRef.current -= SIM_INTERVAL;
				simulationTick();
			}

			// Update visual fog-of-war after simulation (reads fog grid, sets mesh visibility)
			if (chunkStateRef.current) {
				updateFogVisibility(chunkStateRef.current);
			}
		};
		scene.registerBeforeRender(gameLoopCallback);

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

		initEntityRenderer(scene)
			.then((entityState) => {
				entityStateRef.current = entityState;

				// Sync entity meshes every frame
				entityRenderCallback = () => {
					if (entityStateRef.current) {
						syncEntities(entityStateRef.current, scene);
					}
				};
				scene.registerBeforeRender(entityRenderCallback);
			})
			.catch((err) => {
				logError(
					new GameError("Entity renderer initialization failed", "GameCanvas", {
						cause: err,
					}),
				);
			});

		// Camera tracking — when a unit is selected, pan to it
		let lastTrackedEntityId: string | null = null;
		const cameraTrackCallback = () => {
			for (const entity of world.query(Unit, Position)) {
				const unit = entity.get(Unit)!;
				if (!unit.selected) continue;
				const pos = entity.get(Position)!;
				// Only pan once per new selection (avoid continuous re-panning)
				const entityKey = `${pos.x.toFixed(1)}_${pos.z.toFixed(1)}`;
				if (lastTrackedEntityId !== entityKey) {
					lastTrackedEntityId = entityKey;
					panCameraTo(scene, pos.x, pos.z);
				}
				return;
			}
			// Nothing selected — reset tracker
			lastTrackedEntityId = null;
		};
		scene.registerBeforeRender(cameraTrackCallback);

		// Input handler — click-to-select, click-to-move, box selection
		const disposeInput = initInput(scene, () => entityStateRef.current);

		return () => {
			disposeInput();
			scene.unregisterBeforeRender(cameraTrackCallback);
			scene.unregisterBeforeRender(gameLoopCallback);
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
				unregisterChunkState();
			}
		};
	}, [scene, startWX, startWZ, seed]);

	// Lights and hub marker are created imperatively (not Reactylon JSX)
	// because Vite's tree-shaking + babel-plugin-reactylon doesn't always
	// register BabylonJS classes in Reactylon's inventory correctly.
	return null;
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
