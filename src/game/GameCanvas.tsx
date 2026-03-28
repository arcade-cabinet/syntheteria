/**
 * GameCanvas — BabylonJS game scene via Reactylon.
 *
 * Renders the chunk-based labyrinth world with PBR materials,
 * exploration-driven fog of war (FogOfWar.ts), RTS camera
 * (top-down, pan+zoom), and declarative lights.
 *
 * Fog of war is handled per-mesh by FogOfWar.ts — scene.fogMode is
 * disabled to avoid uniform distance-based fog that fights with the
 * exploration state. Unexplored tiles are hidden (setEnabled(false)),
 * shroud tiles get visibility=0.35, and visible tiles get full brightness.
 *
 * Chunk lifecycle is managed imperatively via ChunkManager.
 */

import type { ArcRotateCamera, Scene as BScene } from "@babylonjs/core";
import { Animation } from "@babylonjs/core/Animations/animation";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Tools } from "@babylonjs/core/Misc/tools";
// Side-effect imports — Vite tree-shakes these without explicit import
import "@babylonjs/core/Helpers/sceneHelpers";
import { GlowLayer } from "@babylonjs/core/Layers/glowLayer";
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
import {
	disposeLightning,
	initLightning,
	type LightningState,
	updateLightning,
} from "./GameplayLightning";
import { initInput } from "./InputHandler";

// ─── Void color — the dark background of the ecumenopolis ────────────────────
// Exact #03070b in linear 0-1 space. Used for clearColor, ground plane, and CSS.

const VOID_R = 0x03 / 255; // 0.01176
const VOID_G = 0x07 / 255; // 0.02745
const VOID_B = 0x0b / 255; // 0.04314

// ─── Epoch-driven atmosphere — Epoch 1 defaults ──────────────────────────────

const epoch1 = getEpochVisual(1);

// ─── Props ───────────────────────────────────────────────────────────────────

export interface GameCanvasProps {
	/** Player start position in world coordinates (already scaled by TILE_SIZE_M). */
	startPos: { x: number; z: number };
	/** World generation seed. */
	seed: string;
}

// ─── Scene setup (runs once on scene creation) ──────────────────────────────

function onSceneReady(scene: BScene) {
	scene.createDefaultCameraOrLight(true, undefined, true);

	// Canvas CSS background matches void color — handles WebGPU alpha transparency
	const canvas = scene.getEngine().getRenderingCanvas();
	if (canvas) {
		canvas.style.background = "#03070b";
	}

	// No scene-level fog — fog of war is handled per-mesh by FogOfWar.ts
	// which uses mesh.visibility and mesh.setEnabled() based on exploration state.
	// Scene fog (FOGMODE_EXP2) applies uniform distance-based fog from the camera
	// which obscures explored areas and ignores the exploration grid entirely.
	scene.fogMode = 0; // FOGMODE_NONE

	// Explicit void color #03070b — matches the labyrinth void between chunks
	scene.clearColor = new Color4(VOID_R, VOID_G, VOID_B, 1);
	scene.ambientColor = new Color3(...epoch1.ambientColor);

	// Environment texture for PBR reflections — just the IBL probe, no skybox.
	import("@babylonjs/core/Materials/Textures/cubeTexture").then(
		({ CubeTexture }) => {
			scene.environmentTexture = CubeTexture.CreateFromPrefilteredData(
				"https://assets.babylonjs.com/environments/environmentSpecular.env",
				scene,
			);
			// Re-force void clearColor after env texture loads (it can override)
			scene.clearColor = new Color4(VOID_R, VOID_G, VOID_B, 1);
			scene.autoClear = true;
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
	const lightningStateRef = useRef<LightningState | null>(null);
	const simAccumulatorRef = useRef(0);

	// startPos is already in world coordinates (tile * TILE_SIZE_M)
	const startWX = startPos.x;
	const startWZ = startPos.z;

	useEffect(() => {
		// Ground plane — catches viewport gaps so we never see black void.
		// Uses exact void color #03070b so it blends seamlessly with clearColor.
		const ground = MeshBuilder.CreateGround(
			"void-ground",
			{ width: 2000, height: 2000 },
			scene,
		);
		ground.position = new Vector3(startWX, -0.5, startWZ);
		const groundMat = new StandardMaterial("void-ground-mat", scene);
		groundMat.diffuseColor = new Color3(VOID_R, VOID_G, VOID_B);
		groundMat.emissiveColor = new Color3(VOID_R, VOID_G, VOID_B);
		groundMat.specularColor = Color3.Black();
		groundMat.disableLighting = true;
		groundMat.freeze();
		ground.material = groundMat;
		ground.isPickable = false;

		// Configure ArcRotateCamera for 2.5D RTS top-down
		const cam = scene.activeCamera as ArcRotateCamera;
		if (!cam) return;

		// Final gameplay values
		const FINAL_ALPHA = Tools.ToRadians(-90);
		const FINAL_BETA = Tools.ToRadians(30); // 2.5D RTS perspective with depth
		const FINAL_RADIUS = 25; // closer to the action — robots clearly visible

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
			cam.lowerRadiusLimit = 12;
			cam.upperRadiusLimit = 60;
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

		// ── Three-layer lighting system ──────────────────────────────────
		// 1. Flood light (directional) — broad soft fill for environment readability
		const sun = new DirectionalLight("sun", new Vector3(-0.3, -1, 0.3), scene);
		sun.intensity = epoch1.sunIntensity;
		sun.diffuse = new Color3(...epoch1.sunColor);

		// 2. Ambient fill — hemispheric provides base visibility everywhere
		const ambient = new HemisphericLight(
			"ambient",
			new Vector3(0, 1, 0),
			scene,
		);
		ambient.intensity = 1.2;
		ambient.groundColor = new Color3(0.06, 0.1, 0.16);
		ambient.diffuse = new Color3(0.25, 0.3, 0.4);

		// 3. Point light near camera — soft omnidirectional glow, no projected cone
		const cameraLight = new PointLight(
			"camera-light",
			new Vector3(startWX, 18, startWZ),
			scene,
		);
		cameraLight.intensity = 5;
		cameraLight.diffuse = new Color3(0.55, 0.7, 0.9);
		cameraLight.range = 80;

		// Follow camera target
		const cameraLightCallback = () => {
			const cam = scene.activeCamera as ArcRotateCamera;
			if (cam) {
				cameraLight.position.x = cam.target.x;
				cameraLight.position.z = cam.target.z;
			}
		};
		scene.registerBeforeRender(cameraLightCallback);

		// Glow layer — bloom effect on emissive surfaces (salvage nodes, alloy walls, selection rings)
		const glow = new GlowLayer("glow", scene, {
			mainTextureFixedSize: 512,
			blurKernelSize: 32,
		});
		glow.intensity = 0.6;

		// Hub marker — cyan pyramid at player start
		const hubMesh = MeshBuilder.CreateCylinder(
			"hub-nexus",
			{
				diameterTop: 0,
				diameterBottom: 5,
				height: 6,
				tessellation: 4,
			},
			scene,
		);
		hubMesh.position = new Vector3(startWX, 3, startWZ);
		const hubMat = new StandardMaterial("hub-mat", scene);
		hubMat.diffuseColor = new Color3(0, 0.8, 1);
		hubMat.emissiveColor = new Color3(0, 0.5, 0.6);
		hubMat.specularColor = Color3.Black();
		hubMat.alpha = 0.7;
		hubMesh.material = hubMat;

		// Initialize chunks around the start position
		const chunkState = initChunks(scene, startWX, startWZ, seed);
		chunkStateRef.current = chunkState;
		registerChunkState(chunkState);

		// Initialize gameplay lightning (bolts + GlowLayer)
		const lightningState = initLightning(scene, () => {
			const c = scene.activeCamera as ArcRotateCamera | null;
			return c ? { x: c.target.x, z: c.target.z } : null;
		});
		lightningStateRef.current = lightningState;

		// ── Game loop: movement (per-frame) + simulation tick (fixed interval) ──
		const SIM_INTERVAL = 1.0; // seconds of game time between ticks
		const gameLoopCallback = () => {
			// Update visual fog-of-war every frame (even when paused)
			// so fog refreshes immediately after camera pan or selection changes.
			if (chunkStateRef.current) {
				updateFogVisibility(chunkStateRef.current);
			}

			const speed = getGameSpeed();
			if (speed <= 0) return; // paused

			const delta = scene.getEngine().getDeltaTime() / 1000; // ms -> seconds

			// Smooth per-frame unit movement
			movementSystem(delta, speed);

			// Accumulate scaled time and fire simulation ticks at fixed intervals
			simAccumulatorRef.current += delta * speed;
			while (simAccumulatorRef.current >= SIM_INTERVAL) {
				simAccumulatorRef.current -= SIM_INTERVAL;
				simulationTick();
			}

			// Update gameplay lightning (creates/removes bolts)
			if (lightningStateRef.current) {
				updateLightning(lightningStateRef.current, 1); // epoch 1 for now
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
		let sceneDisposed = false;

		// Expose scene for diagnostics (dev only)
		(window as unknown as Record<string, unknown>).__babylonScene = scene;

		initEntityRenderer(scene)
			.then((entityState) => {
				// Guard: scene may have been disposed while GLBs were loading
				if (sceneDisposed) {
					disposeEntityRenderer(entityState);
					return;
				}
				entityStateRef.current = entityState;
				(window as unknown as Record<string, unknown>).__entityState =
					entityState;

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

		// Handle window/canvas resize
		const engine = scene.getEngine();
		const handleResize = () => {
			engine.resize();
		};
		window.addEventListener("resize", handleResize);
		let resizeObserver: ResizeObserver | null = null;
		const resizeCanvas = engine.getRenderingCanvas();
		if (resizeCanvas?.parentElement) {
			resizeObserver = new ResizeObserver(handleResize);
			resizeObserver.observe(resizeCanvas.parentElement);
		}

		return () => {
			sceneDisposed = true;
			window.removeEventListener("resize", handleResize);
			resizeObserver?.disconnect();
			disposeInput();
			scene.unregisterBeforeRender(cameraLightCallback);
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
			if (lightningStateRef.current) {
				disposeLightning(lightningStateRef.current);
				lightningStateRef.current = null;
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

export function GameCanvas({ startPos, seed }: GameCanvasProps) {
	return (
		<Engine
			forceWebGL
			engineOptions={{ premultipliedAlpha: false, alpha: false }}
		>
			<Scene onSceneReady={onSceneReady}>
				<SceneContent startPos={startPos} seed={seed} />
			</Scene>
		</Engine>
	);
}
